import type { MutableRefObject } from 'react';
import { OrganizationMark } from './OrganizationMark';
import { isCurrentReview } from './sfSearch';
import type { HeliosItem, MatchReason, SearchResponse } from './types';

type Props = {
  items: HeliosItem[];
  alternatives: NonNullable<SearchResponse['alternatives']>;
  nextStep: string | null;
  mode: SearchResponse['mode'] | null;
  fit: SearchResponse['fit'];
  reasons: MatchReason[];
  count: number;
  query: string;
  busy: boolean;
  error: string | null;
  mapNotice: string | null;
  selectedId: string | null;
  resultRefs: MutableRefObject<Map<string, HTMLButtonElement>>;
  onClose: () => void;
  onSelect: (id: string) => void;
};

function matchDetail(mode: Props['mode'], fit: Props['fit'], reasons: MatchReason[], count: number, query: string): string {
  if (reasons.includes('location_unknown')) return 'Place unknown. Name a city or country.';
  if (reasons.includes('location_mismatch') && count === 0) return 'No sourced record in that place.';
  if (reasons.includes('eligibility_unverified')) return 'Eligibility unknown from these sources.';
  if (reasons.includes('availability_unconfirmed') && count === 0) return 'No confirmed opening in this catalog.';
  if (reasons.includes('schedule_unverified') && count === 0) return 'No verified shift for that day.';
  if (reasons.includes('date_mismatch') && count === 0) return 'No sourced record on that date.';
  if (fit === 'no_match' || count === 0) return 'No exact match in this catalog';
  if (mode === null) return 'Browse the catalog';
  if (/\$\s*\d+|\bdonat\w*\b|\bdollars?\b/i.test(query)) return 'Official donation paths. Check the amount on each organization’s site.';
  if (reasons.includes('location_mismatch')) return 'Place differs from your request';
  if (reasons.includes('date_mismatch') || reasons.includes('schedule_mismatch')) return 'Timing differs from your request';
  if (fit === 'related_path') return 'Related path. Check the details.';
  if (reasons.includes('availability_unconfirmed')) return 'Sourced paths. Confirm openings with each organization.';
  if (mode === 'keyword') return 'Text match. Check place and timing.';
  return 'Sourced path to explore';
}

export function SearchResults({ items, alternatives, nextStep, mode, fit, reasons, count, query, busy, error,
  mapNotice, selectedId, resultRefs, onClose, onSelect }: Props) {
  const noExact = !busy && !error && items.length === 0;
  const donation = /\$\s*\d+|\bdonat\w*\b|\bdollars?\b/i.test(query);
  const displayed = items.length ? items.map((item) => ({ item, explanation: null })) : alternatives;
  return <aside className={`results-sheet ${error || (!alternatives.length && !busy && items.length < 4) ? 'is-compact' : ''}`} aria-label="Sourced opportunities">
    <div className="sheet-heading">
      <div><span className="sheet-kicker">{mode ? 'SEARCH RESULTS' : 'EXPLORE'}</span><h2>{noExact ? 'Next best paths' : mode ? 'Places to explore' : 'Sourced places'}</h2></div>
      <button type="button" onClick={onClose} aria-label="Close results">×</button>
    </div>
    <p className="sheet-status" role="status">{busy ? 'Searching sourced records…' : error ? 'Catalog unavailable' : matchDetail(mode, fit, reasons, items.length, query)} <span>{!busy && !error ? `${items.length} / ${count}` : ''}</span></p>
    {error && <p className="sheet-error" role="alert">{error}</p>}
    {!busy && mapNotice && <p className="sheet-empty" role="status">{mapNotice}</p>}
    {noExact && <p className="sheet-empty">{nextStep ?? 'Try another place, cause, or date. This catalog is still small.'}</p>}
    <div className="result-list">
      {!busy && !error && displayed.map(({ item, explanation }) => <button type="button"
        className={`result-row ${selectedId === item.id ? 'is-selected' : ''}`} key={item.id}
        ref={(node) => { if (node) resultRefs.current.set(item.id, node); else resultRefs.current.delete(item.id); }}
        onClick={() => onSelect(item.id)}>
        <OrganizationMark item={item} />
        <span className="result-main"><strong>{item.title}</strong>
          <small>{donation && !explanation ? `${item.organization_name} · ${item.donation_minimum_usd === 10 && isCurrentReview(item) ? '$10 minimum verified' : 'Check gift amount'}` : `${item.organization_name} · ${item.country}`}</small>
          {explanation && <small className="result-explanation">{explanation}</small>}</span>
        <span className="result-chevron" aria-hidden="true">›</span>
      </button>)}
    </div>
    {!error && displayed.length > 0 && <p className="sheet-foot">{noExact ? 'Alternatives are sourced paths, not matches or confirmed openings.' : donation ? 'Donate only on the organization’s official site.' : 'Confirm availability with the organization.'}</p>}
  </aside>;
}
