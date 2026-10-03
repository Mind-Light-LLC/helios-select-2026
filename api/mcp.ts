import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { getCardDetails, listCatalog, searchItems } from '../server/data.js';
import { searchInput } from '../server/search-input.js';
import type { HeliosItem } from '../src/types';
import { assessOffer, sourcedNeeds } from '../src/needData.js';
import { listPartnerNeeds } from '../server/needs.js';
import { isCurrentReview } from '../src/sfSearch.js';

function agentRecord(item: HeliosItem, baseUrl: string) {
  return {
    id: item.id,
    kind: item.record_kind,
    title: item.title,
    summary: item.summary,
    organization: item.organization_name,
    country: item.country,
    view_url: `${baseUrl}/?item=${encodeURIComponent(item.id)}`,
    map: {
      latitude: item.latitude,
      longitude: item.longitude,
      place: item.place_label,
      meaning: item.pin_meaning,
    },
    schedule: item.schedule_text,
    weekly_days: item.weekly_days ?? [],
    cause_tags: item.cause_tags ?? [],
    publication_state: item.publication_state ?? 'published',
    source: { url: item.source_url, checked_at: item.source_checked_at,
      review_due_at: item.review_due_at ?? null, review_current: isCurrentReview(item) },
    availability: { status: item.availability_status, confirmed_by_provider: false },
    next_action: {
      type: item.action_kind,
      label: item.action_label,
      url: item.action_url,
      note: item.action_note,
      authority: 'external_provider',
      state: 'not_started',
      completion_requires: 'provider_confirmation',
    },
    donation_action: item.donation_url ? {
      type: 'official_donation_page', url: item.donation_url,
      minimum_usd: isCurrentReview(item) ? item.donation_minimum_usd ?? null : null,
      minimum_verified: isCurrentReview(item) && item.donation_minimum_usd !== undefined,
      authority: 'external_provider', state: 'not_started',
      completion_requires: 'provider_payment_receipt',
    } : null,
  };
}

function toolResult(value: Record<string, unknown>) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value) }], structuredContent: value };
}

function createHandler(baseUrl: string) {
  return createMcpHandler(() => {
  const server = new McpServer({ name: 'helios-opportunities', version: '0.1.0' });

  server.registerTool('search_opportunities', {
    description: 'Search a limited, non-exhaustive catalog of sourced organizations and volunteer paths. Some records also contain official donation paths. Returns no confirmed openings, registrations, or payments.',
    inputSchema: searchInput,
  }, async ({ query, country, record_kind, limit }) => {
    try {
      const result = await searchItems(query, { country, record_kind, limit });
      return toolResult({
        query,
        match_method: result.mode,
        fit: result.fit ?? null,
        reason_codes: result.reason_codes ?? [],
        coverage: { kind: result.coverage, exhaustive: false, catalog_count: result.catalog_count },
        applied_filters: result.applied_filters,
        match_count: result.items.length,
        no_match_meaning: result.items.length === 0
          ? 'No matching sourced Helios catalog record. This does not mean no opportunity exists elsewhere.' : null,
        records: result.items.map((item) => agentRecord(item, baseUrl)),
      });
    } catch (cause) {
      return { isError: true, content: [{ type: 'text', text: cause instanceof Error ? cause.message : 'Search unavailable.' }] };
    }
  });

  server.registerTool('describe_catalog', {
    description: 'Describe the countries and record kinds represented in the limited Helios catalog before searching.',
    inputSchema: z.object({}),
  }, async () => {
    try {
      const items = await listCatalog();
      return toolResult({
        coverage: { kind: 'curated_sample', exhaustive: false, catalog_count: items.length },
        countries: [...new Set(items.map((item) => item.country))].sort(),
        places: [...new Set(items.map((item) => item.place_label))].sort(),
        donation_path_count: items.filter((item) => item.donation_url).length,
        record_kinds: [...new Set(items.map((item) => item.record_kind))].sort(),
      });
    } catch (cause) {
      return { isError: true, content: [{ type: 'text', text: cause instanceof Error ? cause.message : 'Catalog unavailable.' }] };
    }
  });

  server.registerTool('get_opportunity', {
    description: 'Read one Helios catalog record, its source check and official next steps. Does not claim any provider action was completed.',
    inputSchema: z.object({ id: z.string().trim().min(1).max(200) }),
  }, async ({ id }) => {
    try {
      const item = (await listCatalog()).find((entry) => entry.id === id);
      if (!item) return { isError: true, content: [{ type: 'text', text: 'Catalog record not found.' }] };
      const details = await getCardDetails(id).catch(() => null);
      return toolResult({ record: agentRecord(item, baseUrl), details,
        details_status: details ? 'sourced_record' : 'catalog_record_only' });
    } catch (cause) {
      return { isError: true, content: [{ type: 'text', text: cause instanceof Error ? cause.message : 'Catalog unavailable.' }] };
    }
  });

  server.registerTool('list_sourced_needs', {
    description: 'List published partner-confirmed need cards and reviewed public need signals. Provider acceptance and delivery remain unverified.',
    inputSchema: z.object({}),
  }, async () => {
    try {
      const needs = [...await listPartnerNeeds(), ...sourcedNeeds];
      return toolResult({
        coverage: { kind: 'published_need_cards_and_public_signals', exhaustive: false, count: needs.length },
        records: needs.map((need) => ({
      id: need.id,
      title: need.title,
      organization: need.evidence_status === 'partner_confirmed' ? need.organization_name : need.organization,
      place: need.evidence_status === 'partner_confirmed' ? need.place_label : need.place,
      quantity_needed: need.quantity_needed,
      needed_by: need.evidence_status === 'partner_confirmed' ? need.needed_by : null,
      source_url: need.source_url,
      source_checked_at: need.source_checked_at,
      review_due_at: need.review_due_at,
      publication_state: need.publication_state,
      evidence_status: need.evidence_status,
      view_url: `${baseUrl}/?need=${encodeURIComponent(need.id)}`,
        })),
      });
    } catch (cause) {
      return { isError: true, content: [{ type: 'text', text: cause instanceof Error ? cause.message : 'Needs unavailable.' }] };
    }
  });

  server.registerTool('get_sourced_need', {
    description: 'Read one published partner need or reviewed public signal. Provider acceptance and delivery require separate evidence.',
    inputSchema: z.object({ id: z.string().trim().min(1).max(200) }),
  }, async ({ id }) => {
    try {
      const need = [...await listPartnerNeeds(), ...sourcedNeeds].find((entry) => entry.id === id);
      if (!need) return { isError: true, content: [{ type: 'text', text: 'Published need not found.' }] };
      return toolResult({ need, evidence_boundary: need.evidence_status === 'partner_confirmed'
        ? 'Partner-confirmed request; no provider acceptance or participation receipt.'
        : 'Public source only; no partner-confirmed quantity or recipient delivery.' });
    } catch (cause) {
      return { isError: true, content: [{ type: 'text', text: cause instanceof Error ? cause.message : 'Need unavailable.' }] };
    }
  });

  server.registerTool('check_offer', {
    description: 'Check a proposed offer against one sourced need. A possible fit is not provider acceptance or a completed donation.',
    inputSchema: z.object({
      need_id: z.string().trim().min(1).max(200),
      offer: z.string().trim().min(1).max(500),
    }),
  }, async ({ need_id, offer }) => {
    const need = sourcedNeeds.find((entry) => entry.id === need_id);
    if (!need) {
      try {
        const partner = (await listPartnerNeeds()).find((entry) => entry.id === need_id);
        if (partner) return toolResult({ need_id, offer,
          assessment: { fit: 'unknown', explanation: 'The organization must confirm this offer and eligibility.', route: null },
          evidence_boundary: 'A published request does not establish offer acceptance or delivery.' });
      } catch (cause) {
        return { isError: true, content: [{ type: 'text', text: cause instanceof Error ? cause.message : 'Need unavailable.' }] };
      }
      return { isError: true, content: [{ type: 'text', text: 'Published need not found.' }] };
    }
    return toolResult({
      need_id,
      offer,
      assessment: assessOffer(offer, need),
      evidence_boundary: 'Check the official path. This does not establish acceptance or delivery.',
    });
  });

    return server;
  }, { responseMode: 'json' });
}

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Origin not allowed.' }, { status: 403 });
  }
  return createHandler(new URL(request.url).origin).fetch(request);
}
