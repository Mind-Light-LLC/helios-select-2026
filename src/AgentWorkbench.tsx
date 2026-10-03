import { useEffect, useState } from 'react';
import { agentDetail, agentSearch, type AgentDetail, type AgentSearch } from '@api';

type Props = { selectedId: string | null; onFocus: (id: string) => void; onClose: () => void };

export function AgentWorkbench({ selectedId, onFocus, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rejected, setRejected] = useState<AgentSearch | null>(null);
  const [matched, setMatched] = useState<AgentSearch | null>(null);
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [copied, setCopied] = useState(false);
  const endpoint = `${window.location.origin}/api/mcp`;

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    agentDetail(selectedId, controller.signal).then(setDetail).catch(() => undefined);
    return () => controller.abort();
  }, [selectedId]);

  async function runDateCheck() {
    if (busy) return;
    setBusy(true);
    setError('');
    setRejected(null);
    setMatched(null);
    setDetail(null);
    try {
      const noMatch = await agentSearch('Lakewood Red Cross October 18');
      setRejected(noMatch);
      if (noMatch.match_count !== 0 || !noMatch.reason_codes.includes('date_mismatch')) {
        throw new Error('The date guard did not reject October 18.');
      }
      const match = await agentSearch('Lakewood Red Cross October 17');
      setMatched(match);
      const record = match.records.find((entry) => entry.id === 'red-cross-lakewood-alarms-2026');
      if (!record) throw new Error('The October 17 event was not returned by MCP.');
      setDetail(await agentDetail(record.id));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'MCP walkthrough failed.');
    } finally { setBusy(false); }
  }

  const record = detail?.record;

  return <aside className="agent-window" id="agent-window" aria-label="Agent access">
    <div className="agent-head"><span>AGENT ACCESS / MCP</span><button type="button" onClick={onClose} aria-label="Close agent access">×</button></div>
    <h2>One record, shared.</h2>
    <p>Watch a live MCP handoff: search rejects a wrong date, returns a record ID for the right date, then reads its evidence. The same ID opens on the globe.</p>
    <button className="agent-run" type="button" onClick={() => void runDateCheck()} disabled={busy}>
      {busy ? 'Calling MCP tools…' : 'Run the Lakewood date check'} <span aria-hidden="true">↗</span>
    </button>
    {error && <p className="agent-error" role="alert">{error}</p>}
    <ol className="agent-trace" aria-label="Live MCP tool trace">
      <li className={rejected ? 'is-complete' : ''}><small>01 / SEARCH TOOL · search_opportunities</small>
        <strong>October 18</strong><span>{rejected ? `${rejected.match_count} records · ${rejected.reason_codes.join(', ')}` : 'Waiting for tool call'}</span></li>
      <li className={matched ? 'is-complete' : ''}><small>02 / SEARCH TOOL · search_opportunities</small>
        <strong>October 17</strong><span>{matched ? `${matched.match_count} record · ${matched.records[0]?.id ?? 'none'}` : 'Waiting for tool call'}</span></li>
      <li className={record ? 'is-complete' : ''}><small>03 / RECORD TOOL · get_opportunity</small>
        <strong>{record?.organization ?? 'Read the same record'}</strong>
        <span>{record ? `Input ID: ${record.id}` : 'Waiting for tool call'}</span></li>
    </ol>
    {record && <div className="agent-evidence">
      <span>SHARED RECORD / {record.id}</span>
      <strong>{record.title}</strong>
      <p>Place: {record.map.place} · {record.map.meaning.replaceAll('_', ' ')}</p>
      <p>Source: <a href={record.source.url} target="_blank" rel="noopener noreferrer">official page ↗</a> · Checked {new Date(record.source.checked_at).toLocaleDateString()}</p>
      <p>Official next step: <a href={record.next_action.url ?? record.source.url} target="_blank" rel="noopener noreferrer">{record.next_action.label} ↗</a></p>
      <small>Availability: {record.availability.status.replaceAll('_', ' ')} · Action authority: {record.next_action.authority.replaceAll('_', ' ')}. No registration claimed.</small>
      <button type="button" onClick={() => onFocus(record.id)}>Fly to this record on the globe ↗</button>
    </div>}
    <div className="agent-endpoint"><label htmlFor="mcp-endpoint">Connect your MCP client</label>
      <div className="endpoint-row"><input id="mcp-endpoint" value={endpoint} readOnly onFocus={(event) => event.target.select()} />
        <button type="button" onClick={() => void navigator.clipboard.writeText(endpoint).then(() => setCopied(true)).catch(() => setCopied(false))}>{copied ? 'Copied' : 'Copy'}</button></div>
      <small>Read-only MCP over HTTP · Sourced catalog, including labeled previews · <a href="/api/agent" target="_blank" rel="noopener noreferrer">Tool contract ↗</a></small></div>
  </aside>;
}
