import { useEffect, useState } from 'react';
import { listSavedActions, loadCatalog, savedActionsEvent, type SavedAction } from '@api';
import type { HeliosItem } from './types';

export function CloudSavedActions() {
  const [entries, setEntries] = useState<SavedAction[]>([]);
  const [catalog, setCatalog] = useState<HeliosItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const [saved, found] = await Promise.all([listSavedActions(), loadCatalog()]);
        if (!active) return;
        setEntries(saved);
        setCatalog(found.items);
        setError('');
      } catch (cause: unknown) {
        if (active) setError(cause instanceof Error ? cause.message : 'Saved actions unavailable.');
      } finally { if (active) setLoading(false); }
    }
    void refresh();
    window.addEventListener(savedActionsEvent, refresh);
    return () => { active = false; window.removeEventListener(savedActionsEvent, refresh); };
  }, []);

  return <section className="action-trail cloud-actions" aria-label="Account saved actions">
    <h3>Saved to your account</h3>
    <p>These links follow your Helios sign-in. A save is not a registration or confirmed place.</p>
    {loading && <p role="status">Loading saved actions…</p>}
    {error && <p className="auth-error" role="alert">{error}</p>}
    {!loading && !error && entries.length === 0 && <p>No account saves yet. Open an opportunity and choose Save.</p>}
    {!error && entries.length > 0 && <ol>{entries.map((entry) => {
      const item = catalog.find((row) => row.id === entry.catalog_item_id);
      return <li key={entry.catalog_item_id}>
        {item ? <a href={`/?item=${encodeURIComponent(item.id)}`}><strong>{item.title}</strong><span>{item.organization_name} · Open on globe ↗</span></a>
          : <strong>Record no longer in the public catalog</strong>}
        <small>Saved {new Date(entry.created_at).toLocaleDateString()} · Availability unconfirmed</small>
      </li>;
    })}</ol>}
  </section>;
}
