type ObjectValue = Record<string, unknown>;

function object(value: unknown, label: string): ObjectValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} was not an object.`);
  }
  return value as ObjectValue;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`${label} was missing.`);
  return value;
}

function parseResponse(body: string): ObjectValue {
  const event = body.split(/\r?\n/).filter((line) => line.startsWith('data: '))
    .map((line) => line.slice(6)).join('\n');
  const envelope = object(JSON.parse(event || body) as unknown, 'MCP response');
  if (envelope.error) throw new Error(text(object(envelope.error, 'MCP error').message, 'MCP error message'));
  return object(envelope.result, 'MCP result');
}

async function rpc(endpoint: string, method: string, params: ObjectValue): Promise<ObjectValue> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: crypto.randomUUID(), method, params }),
  });
  if (!response.ok) throw new Error(`${method} failed (${response.status}).`);
  return parseResponse(await response.text());
}

async function connect(endpoint: string, name: string): Promise<void> {
  await rpc(endpoint, 'initialize', {
    protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name, version: '0.1.0' },
  });
  const listed = await rpc(endpoint, 'tools/list', {});
  const tools = listed.tools;
  if (!Array.isArray(tools) || !tools.some((entry) => object(entry, 'MCP tool').name === 'search_opportunities')
    || !tools.some((entry) => object(entry, 'MCP tool').name === 'get_opportunity')) {
    throw new Error(`${name} did not receive the required tools.`);
  }
}

async function callTool(endpoint: string, name: string, args: ObjectValue): Promise<ObjectValue> {
  const response = await rpc(endpoint, 'tools/call', { name, arguments: args });
  if (response.isError === true) throw new Error(`${name} returned an MCP tool error.`);
  return object(response.structuredContent, `${name} structured result`);
}

async function main(): Promise<void> {
  const base = new URL(process.argv[2] ?? 'http://127.0.0.1:3000');
  const endpoint = new URL('/api/mcp', base).href;
  await connect(endpoint, 'helios-discovery-client');
  await connect(endpoint, 'helios-evidence-client');

  const rejected = await callTool(endpoint, 'search_opportunities', {
    query: 'Lakewood Red Cross October 18', limit: 5,
  });
  if (rejected.match_count !== 0 || !Array.isArray(rejected.reason_codes)
    || !rejected.reason_codes.includes('date_mismatch')) {
    throw new Error('The discovery client did not reject October 18.');
  }

  const matched = await callTool(endpoint, 'search_opportunities', {
    query: 'Lakewood Red Cross October 17', limit: 5,
  });
  if (!Array.isArray(matched.records)) throw new Error('Search returned no record list.');
  const found = matched.records.map((entry) => object(entry, 'Search record'))
    .find((entry) => entry.id === 'red-cross-lakewood-alarms-2026');
  if (!found) throw new Error('The October 17 search did not return the Lakewood record.');
  const id = text(found.id, 'Record ID');

  const detailed = await callTool(endpoint, 'get_opportunity', { id });
  const record = object(detailed.record, 'Evidence record');
  const source = object(record.source, 'Source');
  const map = object(record.map, 'Map place');
  const action = object(record.next_action, 'Official action');
  const availability = object(record.availability, 'Availability');

  const catalogResponse = await fetch(new URL('/api/catalog', base));
  if (!catalogResponse.ok) throw new Error(`Human catalog unavailable (${catalogResponse.status}).`);
  const catalog = object(await catalogResponse.json() as unknown, 'Human catalog');
  if (!Array.isArray(catalog.items)) throw new Error('Human catalog returned no records.');
  const human = catalog.items.map((entry) => object(entry, 'Catalog record'))
    .find((entry) => entry.id === id);
  if (!human || source.url !== human.source_url || map.place !== human.place_label
    || map.meaning !== human.pin_meaning || action.url !== human.action_url
    || availability.status !== human.availability_status || record.id !== id) {
    throw new Error('The evidence client and the globe catalog disagree.');
  }

  console.log(JSON.stringify({
    rejected: { query: rejected.query, matches: rejected.match_count, reasons: rejected.reason_codes },
    handoff: { id, search_result: 'October 17', evidence_tool: 'get_opportunity' },
    agreement: {
      source: source.url, source_checked_at: source.checked_at,
      place: map.place, place_meaning: map.meaning,
      official_action: action.url, action_authority: action.authority,
      availability: availability.status, view_url: record.view_url,
    },
  }, null, 2));
}

main().catch((cause: unknown) => {
  console.error(cause instanceof Error ? cause.message : 'MCP handoff failed.');
  process.exitCode = 1;
});
