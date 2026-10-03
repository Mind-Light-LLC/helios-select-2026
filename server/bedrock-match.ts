import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import * as z from 'zod/v4';
import type { HeliosItem, MatchFit, MatchReason } from '../src/types';

const reasons = [
  'cause_fit', 'location_fit', 'remote_fit', 'schedule_mismatch',
  'schedule_unverified', 'date_mismatch', 'location_mismatch',
  'availability_unconfirmed', 'no_relevant_record',
] as const;

const matchSchema = z.object({
  fit: z.enum(['record_match', 'related_path', 'no_match']),
  record_ids: z.array(z.string()),
  reason_codes: z.array(z.enum(reasons)),
});

const outputSchema = JSON.stringify({
  type: 'object',
  properties: {
    fit: { type: 'string', enum: ['record_match', 'related_path', 'no_match'] },
    record_ids: { type: 'array', items: { type: 'string' } },
    reason_codes: { type: 'array', items: { type: 'string', enum: reasons } },
  },
  required: ['fit', 'record_ids', 'reason_codes'],
  additionalProperties: false,
});

export type BedrockMatch = {
  fit: MatchFit;
  item: HeliosItem | null;
  reason_codes: MatchReason[];
};

export async function classifyCandidates(query: string, candidates: HeliosItem[]): Promise<BedrockMatch | null> {
  const modelId = process.env.HELIOS_BEDROCK_MODEL_ID;
  if (!modelId || candidates.length === 0 || candidates.length > 25) return null;
  const records = candidates.map(({ id, title, summary, country, place_label, schedule_text, starts_at, availability_status }) =>
    ({ id, title, summary, country, place_label, schedule_text, starts_at, availability_status }));
  const system = [
    'Classify a request against supplied records only. Return at most one record ID.',
    'record_match means cause, place, and requested timing fit the record, never that a place is open.',
    'related_path means cause or place fits but timing differs or current availability is unverified.',
    'no_match means no useful record; return no IDs.',
    'A named city is a hard constraint. Use only place labels, not geographic guesses about proximity.',
    'If both place and date differ, return no_match. If a matching place has an incompatible schedule, return related_path and schedule_mismatch.',
    'Date ranges are inclusive. A request on a day inside the listed start and end dates is not a schedule_mismatch.',
    'Use schedule_mismatch only for an explicit recurring weekday or time conflict. Use date_mismatch for a one-time event date conflict.',
    'If no_match is caused by both a named city and a fixed event date differing from the relevant record, include both location_mismatch and date_mismatch.',
    'When timing is not explicitly contradicted, use schedule_unverified instead of a mismatch code.',
    'A directory does not prove that an assignment is active now. Never claim registration or admission.',
    'Output only the requested JSON fields. Do not write user-facing prose or URLs.',
  ].join(' ');
  const client = new BedrockRuntimeClient({
    region: process.env.HELIOS_BEDROCK_REGION ?? 'us-west-2',
    maxAttempts: 2,
    retryMode: 'adaptive',
  });
  const response = await client.send(new ConverseCommand({
    modelId,
    system: [{ text: system }],
    messages: [{ role: 'user', content: [{ text: `REQUEST: ${query}\nRECORDS: ${JSON.stringify(records)}` }] }],
    inferenceConfig: { maxTokens: 170, temperature: 0.1 },
    outputConfig: {
      textFormat: {
        type: 'json_schema',
        structure: { jsonSchema: { schema: outputSchema, name: 'helios_fit', description: 'Catalog fit classification' } },
      },
    },
  }), { abortSignal: AbortSignal.timeout(12_000) });
  const raw = response.output?.message?.content?.find((block) => typeof block.text === 'string')?.text;
  if (!raw) return null;
  const parsed = matchSchema.safeParse(JSON.parse(raw) as unknown);
  if (!parsed.success || parsed.data.record_ids.length > 1) return null;
  const item = candidates.find((candidate) => candidate.id === parsed.data.record_ids[0]) ?? null;
  if (parsed.data.record_ids.length === 1 && !item) return null;
  if ((parsed.data.fit === 'no_match' && item) || (parsed.data.fit !== 'no_match' && !item)) return null;
  const reasonCodes: MatchReason[] = [...parsed.data.reason_codes];
  if (item?.availability_status === 'not_confirmed' && !reasonCodes.includes('availability_unconfirmed')) {
    reasonCodes.push('availability_unconfirmed');
  }
  return { fit: parsed.data.fit, item, reason_codes: reasonCodes };
}
