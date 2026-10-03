import { isCurrentReview, requestedCalendarDate, requestedDay } from './sfSearch.js';
import type { HeliosItem, MatchReason } from './types.js';

type FeasibleSet = { items: HeliosItem[]; reason: MatchReason | null };

function normalized(value: string): string {
  return ` ${value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
}

function mentions(query: string, place: string): boolean {
  const term = normalized(place).trim();
  return term.length > 2 && query.includes(` ${term} `);
}

const countryNames = (() => {
  const names = new Set<string>();
  const display = new Intl.DisplayNames(['en'], { type: 'region' });
  for (let first = 65; first <= 90; first += 1) {
    for (let second = 65; second <= 90; second += 1) {
      const code = String.fromCharCode(first, second);
      const name = display.of(code);
      if (name && name !== code && !name.startsWith('Unknown Region')) names.add(name);
    }
  }
  return [...names];
})();

export function placeCandidates(items: HeliosItem[], catalog: HeliosItem[], query: string): FeasibleSet {
  const text = normalized(query);
  const cities = [...new Set(catalog.map((item) => item.place_label.split(',')[0]))];
  const country = countryNames.filter((name) => mentions(text, name));
  const city = cities.filter((name) => mentions(text, name));
  if (/\b(?:san francisco|sf)\b/i.test(query)) city.push('San Francisco');
  if (/\b(?:worldwide|global|anywhere)\b|around the world/i.test(query)) return { items, reason: null };
  if (country.length || city.length) {
    const filtered = items.filter((item) => (!country.length || country.some((name) => normalized(item.country) === normalized(name)))
      && (!city.length || city.some((name) => normalized(item.place_label.split(',')[0]) === normalized(name))));
    return { items: filtered, reason: filtered.length ? null : 'location_mismatch' };
  }
  if (/\b(?:near me|nearby|local)\b/i.test(query)) return { items: [], reason: 'location_unknown' };
  if (/\b(?:remote|online|virtual)\b/i.test(query)) {
    const filtered = items.filter((item) => item.country === 'Global');
    return { items: filtered, reason: filtered.length ? null : 'location_mismatch' };
  }
  const namedPlace = /\b(?:in|near|around)\s+(?:the\s+)?([\p{L}][\p{L}\s-]{2,35})/iu.exec(query)?.[1]
    ?.split(/\b(?:on|at|for|by|with|this|next|today|tomorrow)\b/i)[0]?.trim();
  if (namedPlace && !/^(?:need|person|public|general|advance|time)$/i.test(namedPlace)) {
    return { items: [], reason: 'location_mismatch' };
  }
  return { items, reason: null };
}

export function feasibleItems(items: HeliosItem[], catalog: HeliosItem[], query: string, now = Date.now()): FeasibleSet {
  const place = placeCandidates(items, catalog, query);
  if (!place.items.length) return place;
  let candidates = place.items;
  const requestedDate = requestedCalendarDate(query, now);
  if (requestedDate.explicit) {
    candidates = candidates.filter((item) => isCurrentReview(item, now)
      && requestedDate.date !== null && item.starts_at?.slice(0, 10) === requestedDate.date);
    if (!candidates.length) return { items: [], reason: 'date_mismatch' };
  } else if (/\b(?:today|tomorrow)\b/i.test(query)) {
    return { items: [], reason: 'schedule_unverified' };
  }
  const day = requestedDay(query);
  if (day) {
    candidates = candidates.filter((item) => isCurrentReview(item, now)
      && (item.weekly_days?.includes(day) || (item.starts_at
        && new Date(item.starts_at).getUTCDay() === ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(day))));
    if (!candidates.length) return { items: [], reason: 'schedule_unverified' };
  }
  if (/\b(?:open now|available now|confirmed (?:opening|spot)|open spots?)\b/i.test(query)) {
    candidates = candidates.filter((item) => isCurrentReview(item, now) && item.availability_status === 'open_confirmed');
    if (!candidates.length) return { items: [], reason: 'availability_unconfirmed' };
  }
  if (/\b(?:\d{1,2}\s*(?:year|years|yo)\s*old|age\s*\d{1,2}|teenager|minor|wheelchair accessible)\b/i.test(query)) {
    return { items: [], reason: 'eligibility_unverified' };
  }
  return { items: candidates, reason: null };
}
