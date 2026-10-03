import type { HeliosItem, MatchReason, SearchOptions, SearchResponse } from './types.js';
import { placeCandidates } from './feasibleMatch.js';
import { requestedCalendarDate, searchCurated } from './sfSearch.js';

type NextBest = Pick<SearchResponse, 'alternatives' | 'next_step'>;

function relaxedQuery(query: string): string {
  return query
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
    .replace(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b/gi, ' ')
    .replace(/\b(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|today|tomorrow|confirmed|open now|open spots?)\b/gi, ' ')
    .trim();
}

function nextStep(reason: MatchReason): string {
  if (reason === 'location_unknown') return 'Name a city or country for local options, or explore online volunteering.';
  if (reason === 'location_mismatch') return 'No sourced local match yet. Try an online role or another place.';
  if (reason === 'date_mismatch') return 'No verified shift on that date. Check another day on the official calendar.';
  if (reason === 'schedule_unverified' || reason === 'schedule_mismatch') return 'No verified shift for that day. Check these related paths with the organization.';
  if (reason === 'availability_unconfirmed') return 'No open spot is confirmed here. Check the organization’s current calendar.';
  if (reason === 'eligibility_unverified') return 'Ask the organization to confirm eligibility before applying.';
  return 'Try a broader cause or place, or explore a sourced online role.';
}

export function searchAlternatives(catalog: HeliosItem[], query: string, reason: MatchReason,
  options: SearchOptions = {}): NextBest {
  const scoped = catalog.filter((item) => (!options.country || item.country.toLowerCase() === options.country.toLowerCase())
    && (!options.record_kind || item.record_kind === options.record_kind));
  const place = placeCandidates(scoped, catalog, query);
  const requestedDate = requestedCalendarDate(query).date;
  const weekday = requestedDate ? new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' })
    .format(new Date(`${requestedDate}T12:00:00Z`)) : null;
  const relatedQuery = relaxedQuery(query);
  const sameWeekday = weekday ? searchCurated(place.items, `${relatedQuery} ${weekday}`, 3) : [];
  const related = sameWeekday.length ? sameWeekday : searchCurated(place.items, relatedQuery, 3);
  const hasPlaceScope = place.items.length < scoped.length || Boolean(options.country);
  const local = related.length ? related : hasPlaceScope ? place.items.slice(0, 2) : [];
  const explanation = sameWeekday.length && weekday
    ? `Published recurring ${weekday} path; ${requestedDate} opening is unconfirmed.`
    : reason === 'eligibility_unverified'
    ? 'Related path; confirm eligibility with the organization.'
    : 'Related path; requested timing or availability is not verified.';
  const alternatives = local.map((item) => ({ item, explanation }));
  const remote = !options.country && (!options.record_kind || options.record_kind === 'volunteer')
    ? catalog.find((item) => item.id === 'unv-online-volunteering') : undefined;
  if (remote && alternatives.length < 3 && !alternatives.some(({ item }) => item.id === remote.id)) {
    alternatives.push({ item: remote, explanation: 'Online assignment directory; check current roles and eligibility.' });
  }
  return { alternatives: alternatives.slice(0, 3), next_step: nextStep(reason) };
}
