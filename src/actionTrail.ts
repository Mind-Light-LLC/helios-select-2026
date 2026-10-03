export type ActionEntry = {
  kind: 'item' | 'need';
  id: string;
  title: string;
  organization: string;
  source_url: string;
  official_url: string;
  state: 'saved' | 'official_link_selected';
  recorded_at: string;
};

const storageKey = 'helios-action-trail-v1';
export const actionTrailEvent = 'helios-action-trail-changed';

function isEntry(value: unknown): value is ActionEntry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  return (entry.kind === 'item' || entry.kind === 'need')
    && typeof entry.id === 'string' && typeof entry.title === 'string'
    && typeof entry.organization === 'string' && typeof entry.source_url === 'string'
    && typeof entry.official_url === 'string'
    && (entry.state === 'saved' || entry.state === 'official_link_selected')
    && typeof entry.recorded_at === 'string';
}

export function readActionTrail(): ActionEntry[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(value) ? value.filter(isEntry).slice(0, 50) : [];
  } catch { return []; }
}

export function recordAction(entry: Omit<ActionEntry, 'recorded_at'>): boolean {
  try {
    const existing = readActionTrail();
    const previous = existing.filter((row) => !(row.kind === entry.kind && row.id === entry.id));
    const prior = existing.find((row) => row.kind === entry.kind && row.id === entry.id);
    const next: ActionEntry = { ...entry,
      state: prior?.state === 'official_link_selected' ? prior.state : entry.state,
      recorded_at: prior?.state === 'official_link_selected' && entry.state === 'saved'
        ? prior.recorded_at : new Date().toISOString() };
    window.localStorage.setItem(storageKey, JSON.stringify([next, ...previous].slice(0, 50)));
    window.dispatchEvent(new Event(actionTrailEvent));
    return true;
  } catch { return false; }
}
