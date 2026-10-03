export type AgentRecord = {
  id: string;
  title: string;
  organization: string;
  view_url: string;
  publication_state: string;
  map: { place: string; meaning: string; latitude: number; longitude: number };
  source: { url: string; checked_at: string; review_current: boolean };
  availability: { status: string; confirmed_by_provider: boolean };
  next_action: { label: string; url: string | null; note: string; authority: string; state: string };
};

export type AgentSearch = {
  query: string;
  fit: string | null;
  reason_codes: string[];
  match_count: number;
  records: AgentRecord[];
};

export type AgentDetail = { record: AgentRecord; details_status: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRecord(value: unknown): value is AgentRecord {
  if (!isObject(value) || !isObject(value.map) || !isObject(value.source)
    || !isObject(value.availability) || !isObject(value.next_action)) return false;
  return typeof value.id === 'string' && typeof value.title === 'string'
    && typeof value.organization === 'string' && typeof value.view_url === 'string'
    && typeof value.publication_state === 'string'
    && typeof value.map.place === 'string' && typeof value.map.meaning === 'string'
    && typeof value.map.latitude === 'number' && typeof value.map.longitude === 'number'
    && typeof value.source.url === 'string' && typeof value.source.checked_at === 'string'
    && typeof value.source.review_current === 'boolean'
    && typeof value.availability.status === 'string'
    && typeof value.availability.confirmed_by_provider === 'boolean'
    && typeof value.next_action.label === 'string'
    && (value.next_action.url === null || typeof value.next_action.url === 'string')
    && typeof value.next_action.note === 'string'
    && typeof value.next_action.authority === 'string'
    && typeof value.next_action.state === 'string';
}

function parseMcpResponse(body: string): unknown {
  const data = body.split(/\r?\n/).filter((line) => line.startsWith('data: '))
    .map((line) => line.slice(6)).join('\n');
  const envelope: unknown = JSON.parse(data || body);
  if (!isObject(envelope)) throw new Error('The MCP response was invalid.');
  if (isObject(envelope.error)) throw new Error(String(envelope.error.message ?? 'MCP request failed.'));
  const result = envelope.result;
  if (!isObject(result)) throw new Error('The MCP tool returned no result.');
  if (result.isError === true) {
    const content = Array.isArray(result.content) ? result.content[0] : null;
    throw new Error(isObject(content) ? String(content.text ?? 'MCP tool failed.') : 'MCP tool failed.');
  }
  if (!isObject(result.structuredContent)) throw new Error('The MCP tool returned no structured content.');
  return result.structuredContent;
}

async function callMcp(name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch('/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: crypto.randomUUID(), method: 'tools/call',
      params: { name, arguments: args } }),
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`MCP request failed (${response.status}).`);
  return parseMcpResponse(await response.text());
}

export async function agentSearch(query: string, signal?: AbortSignal): Promise<AgentSearch> {
  const value = await callMcp('search_opportunities', { query, limit: 5 }, signal);
  if (!isObject(value) || typeof value.query !== 'string' || !Array.isArray(value.records)
    || !value.records.every(isRecord) || !Array.isArray(value.reason_codes)
    || !value.reason_codes.every((reason) => typeof reason === 'string')
    || typeof value.match_count !== 'number' || value.match_count !== value.records.length
    || (value.fit !== null && typeof value.fit !== 'string')) throw new Error('Invalid search tool result.');
  return value as AgentSearch;
}

export async function agentDetail(id: string, signal?: AbortSignal): Promise<AgentDetail> {
  const value = await callMcp('get_opportunity', { id }, signal);
  if (!isObject(value) || !isRecord(value.record) || typeof value.details_status !== 'string'
    || value.record.id !== id) {
    throw new Error('Invalid detail tool result.');
  }
  return value as AgentDetail;
}
