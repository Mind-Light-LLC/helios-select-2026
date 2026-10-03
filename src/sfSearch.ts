import type { HeliosItem } from './types.js';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december'];
const monthPattern = '(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)';
const ignored = new Set([
  'about', 'and', 'around', 'can', 'could', 'find', 'for', 'from', 'have', 'help', 'how',
  'like', 'looking', 'near', 'open', 'organization', 'organizations', 'please', 'pretty',
  'san', 'francisco', 'some', 'support', 'that', 'the', 'this', 'want', 'what', 'where',
  'which', 'with', 'would', 'volunteer', 'volunteering', 'donate', 'donation', 'dollars',
  'money', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
]);

const causes: { test: RegExp; tag: string }[] = [
  { test: /\b(food|meal|meals|hunger|grocery|groceries|food bank)\b/i, tag: 'food' },
  { test: /\b(animal|animals|pet|pets|dog|cat)\b/i, tag: 'animals' },
  { test: /\b(tree|trees|climate|environment|park|parks)\b/i, tag: 'environment' },
  { test: /\b(house|housing|homebuilding)\b/i, tag: 'housing' },
  { test: /\b(homeless|homelessness)\b/i, tag: 'homelessness' },
  { test: /\b(child|children|families)\b/i, tag: 'children' },
  { test: /\b(student|students|tutor|reading|writing|literacy|books)\b/i, tag: 'education' },
  { test: /\b(health|medical|hiv|aids)\b/i, tag: 'health' },
];

export function requestedDay(query: string): string | null {
  return days.find((day) => new RegExp(`\\b${day}\\b`, 'i').test(query)) ?? null;
}

export function requestedCalendarDate(query: string, now = Date.now()): { explicit: boolean; date: string | null } {
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(query);
  const monthFirst = new RegExp(`\\b${monthPattern}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'i').exec(query);
  const dayFirst = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${monthPattern}\\.?\\s*(\\d{4})?\\b`, 'i').exec(query);
  if (!iso && !monthFirst && !dayFirst) return { explicit: false, date: null };
  const monthName = monthFirst?.[1] ?? dayFirst?.[2];
  const month = iso ? Number(iso[2]) : months.findIndex((name) => name.startsWith(monthName?.toLowerCase().slice(0, 3) ?? '')) + 1;
  const day = Number(iso?.[3] ?? monthFirst?.[2] ?? dayFirst?.[1]);
  const statedYear = iso?.[1] ?? monthFirst?.[3] ?? dayFirst?.[3];
  const current = new Date(now);
  let year = statedYear ? Number(statedYear) : current.getUTCFullYear();
  if (!statedYear && (month < current.getUTCMonth() + 1
    || (month === current.getUTCMonth() + 1 && day < current.getUTCDate()))) year += 1;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  const valid = month >= 1 && month <= 12 && day >= 1 && day <= 31
    && candidate.getUTCFullYear() === year && candidate.getUTCMonth() + 1 === month
    && candidate.getUTCDate() === day;
  return { explicit: true, date: valid ? candidate.toISOString().slice(0, 10) : null };
}

export function donationAmount(query: string): number | null {
  const numeric = query.match(/\$\s*(\d+)|\b(\d+)\s+dollars?\b/i);
  if (numeric) return Number(numeric[1] ?? numeric[2]);
  return /\bten\s+dollars?\b/i.test(query) ? 10 : null;
}

export function hasStructuredIntent(query: string): boolean {
  return Boolean(requestedDay(query)) || donationAmount(query) !== null
    || /\b(san francisco|sf|near me|nearby|local|worldwide|global|anywhere)\b|around the world/i.test(query)
    || requestedCalendarDate(query).explicit;
}

export function isCurrentReview(item: HeliosItem, now = Date.now()): boolean {
  return !item.review_due_at || new Date(item.review_due_at).getTime() >= now;
}

export function searchCurated(items: HeliosItem[], query: string, limit = 20, now = Date.now()): HeliosItem[] {
  const day = requestedDay(query);
  const amount = donationAmount(query);
  const donation = amount !== null || /\b(donat\w*|give|contribut\w*)\b/i.test(query);
  const local = /\b(san francisco|sf)\b/i.test(query);
  const worldwide = /\b(worldwide|global|anywhere)\b|around the world/i.test(query);
  const tag = causes.find((cause) => cause.test.test(query))?.tag;
  let candidates = items.filter((item) => !local || item.place_label.toLowerCase().includes('san francisco'));
  if (day) candidates = candidates.filter((item) => isCurrentReview(item, now)
    && (item.weekly_days?.includes(day) || (item.starts_at
      && new Date(item.starts_at).getUTCDay() === days.indexOf(day))));
  if (donation) candidates = candidates.filter((item) => item.donation_url
    && (amount === null || !isCurrentReview(item, now) || item.donation_minimum_usd === undefined || item.donation_minimum_usd <= amount));
  if (tag) candidates = candidates.filter((item) => item.cause_tags?.includes(tag));

  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2
    && !ignored.has(word) && !/^\d+$/.test(word));
  const ranked = candidates.map((item) => {
    const title = item.title.toLowerCase();
    const org = item.organization_name.toLowerCase();
    const detail = `${item.summary} ${item.country} ${item.place_label} ${item.cause_tags?.join(' ') ?? ''}`.toLowerCase();
    const score = words.reduce((sum, word) => sum + (title.includes(word) ? 4 : 0)
      + (org.includes(word) ? 3 : 0) + (detail.includes(word) ? 1 : 0), 0)
      + (amount !== null && isCurrentReview(item, now) && item.donation_minimum_usd !== undefined ? 6 : 0);
    return { item, score };
  }).sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
  if (worldwide) {
    const seen = new Set<string>();
    const spread = ranked.filter(({ item }) => {
      const place = item.country === 'United States' ? item.place_label : item.country;
      if (seen.has(place)) return false;
      seen.add(place);
      return true;
    });
    return spread.slice(0, limit).map(({ item }) => item);
  }
  if (words.length === 0 || day || donation || local || tag) return ranked.slice(0, limit).map(({ item }) => item);
  return ranked.filter(({ score }) => score > 0).slice(0, limit).map(({ item }) => item);
}
