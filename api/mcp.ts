import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { listCatalog, searchItems } from '../server/data.js';
import type { HeliosItem } from '../src/types';

function agentRecord(item: HeliosItem) {
  return {
    id: item.id,
    kind: item.record_kind,
    title: item.title,
    summary: item.summary,
    organization: item.organization_name,
    country: item.country,
    map: {
      latitude: item.latitude,
      longitude: item.longitude,
      place: item.place_label,
      meaning: item.pin_meaning,
    },
    schedule: item.schedule_text,
    source: { url: item.source_url, checked_at: item.source_checked_at },
    next_action: {
      type: 'visit_official_page',
      url: item.action_url,
      authority: 'external_provider',
      state: 'not_started',
      completion_requires: 'provider_confirmation',
    },
  };
}

function toolResult(value: Record<string, unknown>) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value) }], structuredContent: value };
}

const handler = createMcpHandler(() => {
  const server = new McpServer({ name: 'helios-opportunities', version: '0.1.0' });

  server.registerTool('search_opportunities', {
    description: 'Search source-checked public benefit volunteer opportunities and events. Returns official next-action links, not registrations or admissions.',
    inputSchema: z.object({ query: z.string().trim().min(1).max(500) }),
  }, async ({ query }) => {
    try {
      const result = await searchItems(query);
      return toolResult({
        query,
        match_method: result.mode,
        catalog_count: result.catalog_count,
        records: result.items.map(agentRecord),
      });
    } catch (cause) {
      return { isError: true, content: [{ type: 'text', text: cause instanceof Error ? cause.message : 'Search unavailable.' }] };
    }
  });

  server.registerTool('get_opportunity', {
    description: 'Read one published Helios record, its source check and the official next step. Does not claim any provider action was completed.',
    inputSchema: z.object({ id: z.string().trim().min(1).max(200) }),
  }, async ({ id }) => {
    try {
      const item = (await listCatalog()).find((entry) => entry.id === id);
      if (!item) return { isError: true, content: [{ type: 'text', text: 'Published record not found.' }] };
      return toolResult({ record: agentRecord(item) });
    } catch (cause) {
      return { isError: true, content: [{ type: 'text', text: cause instanceof Error ? cause.message : 'Catalog unavailable.' }] };
    }
  });

  return server;
}, { responseMode: 'json' });

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Origin not allowed.' }, { status: 403 });
  }
  return handler.fetch(request);
}
