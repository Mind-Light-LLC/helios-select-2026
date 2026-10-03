import { useEffect, useRef, useState } from 'react';
import { connectAgentClient, type AgentDetail, type AgentSearch } from '@api';

type Props = { onFocus: (id: string) => void; onClose: () => void };

export function AgentWorkbench({ onFocus, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rejected, setRejected] = useState<AgentSearch | null>(null);
  const [matched, setMatched] = useState<AgentSearch | null>(null);
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const evidenceRef = useRef<HTMLDivElement>(null);
  const endpoint = `${window.location.origin}/api/mcp`;

  useEffect(() => {
    if (detail) evidenceRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [detail]);

  async function runDateCheck() {
    if (busy) return;
    setBusy(true);
    setError('');
    setRejected(null);
    setMatched(null);
    setDetail(null);
    setConnected(false);
    try {
      const [discovery, evidence] = await Promise.all([
        connectAgentClient('helios-discovery-client'),
        connectAgentClient('helios-evidence-client'),
      ]);
      setConnected(true);
      const noMatch = await discovery.search('Lakewood Red Cross October 18');
      setRejected(noMatch);
      if (noMatch.match_count !== 0 || !noMatch.reason_codes.includes('date_mismatch')) {
        throw new Error('The date guard did not reject October 18.');
      }
      const match = await discovery.search('Lakewood Red Cross October 17');
      setMatched(match);
      const record = match.records.find((entry) => entry.id === 'red-cross-lakewood-alarms-2026');
      if (!record) throw new Error('The October 17 event was not returned by MCP.');
      setDetail(await evidence.detail(record.id));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'MCP walkthrough failed.');
    } finally { setBusy(false); }
  }

  const record = detail?.record;

  return <aside className="agent-window" id="agent-window" aria-label="Agent access">
    <div className="agent-head"><span>AGENT ACCESS / MCP</span><button type="button" onClick={onClose} aria-label="Close agent access">×</button></div>
    <h2>One record, shared.</h2>
    <p>Two named MCP clients connect. Discovery checks the date and passes one record ID to Evidence, which reads the source and official next step. That ID opens on the globe.</p>
    <div className="agent-endpoint"><label htmlFor="mcp-endpoint">Connect your MCP client</label>
      <div className="endpoint-row"><input id="mcp-endpoint" value={endpoint} readOnly onFocus={(event) => event.target.select()} />
        <button type="button" onClick={() => void navigator.clipboard.writeText(endpoint).then(() => setCopied(true)).catch(() => setCopied(false))}>{copied ? 'Copied' : 'Copy'}</button></div>
      <small>Read-only · Protected previews require host access · <a href="/api/agent" target="_blank" rel="noopener noreferrer">Tool contract ↗</a></small></div>
    <button className="agent-run" type="button" onClick={() => void runDateCheck()} disabled={busy}>
      {busy ? 'Calling MCP tools…' : 'Run the Lakewood date check'} <span aria-hidden="true">↗</span>
    </button>
    {error && <p className="agent-error" role="alert">{error}</p>}
    {connected && <p role="status">Discovery and Evidence clients connected through MCP.</p>}
    <ol className="agent-trace" aria-label="Live MCP tool trace">
      <li className={rejected ? 'is-complete' : ''}><small>01 / DISCOVERY CLIENT · search_opportunities</small>
        <strong>October 18</strong><span>{rejected ? `${rejected.match_count} records · ${rejected.reason_codes.join(', ')}` : 'Waiting for tool call'}</span></li>
      <li className={matched ? 'is-complete' : ''}><small>02 / DISCOVERY CLIENT · search_opportunities</small>
        <strong>October 17</strong><span>{matched ? `${matched.match_count} record · ${matched.records[0]?.id ?? 'none'}` : 'Waiting for tool call'}</span></li>
      <li className={record ? 'is-complete' : ''}><small>03 / EVIDENCE CLIENT · get_opportunity</small>
        <strong>{record?.organization ?? 'Read the same record'}</strong>
        <span>{record ? `Input ID: ${record.id}` : 'Waiting for tool call'}</span></li>
    </ol>
    {record && <div ref={evidenceRef} className="agent-evidence">
      <span>SHARED RECORD / {record.id}</span>
      <strong>{record.title}</strong>
      <p>Place: {record.map.place} · {record.map.meaning.replaceAll('_', ' ')}</p>
      <p>Source: <a href={record.source.url} target="_blank" rel="noopener noreferrer">official page ↗</a> · Checked {new Date(record.source.checked_at).toLocaleDateString()}</p>
      <p>Official next step: <a href={record.next_action.url ?? record.source.url} target="_blank" rel="noopener noreferrer">{record.next_action.label} ↗</a></p>
      <small>Availability: {record.availability.status.replaceAll('_', ' ')} · Action authority: {record.next_action.authority.replaceAll('_', ' ')}. No registration claimed.</small>
      <button type="button" onClick={() => onFocus(record.id)}>Fly to this record on the globe ↗</button>
    </div>}
  </aside>;
}
