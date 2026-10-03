import { useEffect, useState } from 'react';
import { actionTrailEvent, readActionTrail, type ActionEntry } from './actionTrail';

function returnUrl(entry: ActionEntry): string {
  return entry.kind === 'item' ? `/?item=${encodeURIComponent(entry.id)}` : `/?need=${encodeURIComponent(entry.id)}`;
}

function recordedLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export function ActionTrail() {
  const [entries, setEntries] = useState<ActionEntry[]>(() => readActionTrail());

  useEffect(() => {
    const refresh = () => setEntries(readActionTrail());
    window.addEventListener(actionTrailEvent, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(actionTrailEvent, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return <section className="action-trail" aria-label="Your actions">
    <h3>On this device</h3>
    <p>Local saves and official links opened here. These do not sync to your account.</p>
    {entries.length === 0 ? <p className="action-trail-empty">Save a sourced action to return to it here.</p>
      : <ol>{entries.map((entry) => <li key={`${entry.kind}:${entry.id}`}>
        <a href={returnUrl(entry)}><strong>{entry.title}</strong><span>{entry.organization}</span></a>
        <small>{entry.state === 'saved' ? 'Saved' : 'Official link selected'} · {recordedLabel(entry.recorded_at)}<br />Provider acknowledgement unknown · Participation unknown</small>
      </li>)}</ol>}
  </section>;
}
