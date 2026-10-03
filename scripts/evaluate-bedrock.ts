import { searchItems } from '../server/data';
import type { MatchFit, MatchReason } from '../src/types';

type Case = {
  name: string;
  query: string;
  id: string | null;
  fit?: MatchFit;
  required?: MatchReason[];
  forbidden?: MatchReason[];
};

const cases: Case[] = [
  { name: 'Singapore weekday', query: 'Food bank warehouse volunteering in Singapore on Monday 12 October', id: 'food-bank-singapore-warehouse', forbidden: ['schedule_mismatch'] },
  { name: 'Singapore Saturday', query: 'Food bank warehouse volunteering in Singapore on Saturday 10 October', id: 'food-bank-singapore-warehouse', fit: 'related_path', required: ['schedule_mismatch'] },
  { name: 'Seattle wrong place and date', query: 'Install smoke alarms near Seattle on 4 October, confirm a spot', id: null, fit: 'no_match', required: ['location_mismatch', 'date_mismatch'] },
  { name: 'Lakewood event date', query: 'Install smoke alarms in Lakewood California on 17 October 2026', id: 'red-cross-lakewood-alarms-2026', fit: 'record_match', forbidden: ['date_mismatch', 'schedule_mismatch'] },
  { name: 'Lakewood wrong date', query: 'Install smoke alarms in Lakewood California on 18 October 2026', id: 'red-cross-lakewood-alarms-2026', fit: 'related_path', required: ['date_mismatch'] },
  { name: 'Remote UN directory', query: 'Find remote UN volunteering assignments this month', id: 'unv-online-volunteering', required: ['availability_unconfirmed'] },
  { name: 'Remote food bank gap', query: 'I need to volunteer remotely from home for a food bank', id: null, fit: 'no_match' },
  { name: 'London Red Cross', query: 'Find a British Red Cross volunteering role in London', id: 'british-red-cross-volunteer' },
  { name: 'Sydney Red Cross', query: 'Volunteer with the Australian Red Cross in Sydney', id: 'australian-red-cross-volunteer' },
  { name: 'Lagos food relief', query: 'Help fight hunger at a food bank in Lagos', id: 'lagos-food-bank-volunteer' },
  { name: 'Cape Town team', query: 'Arrange a corporate team food bank session in Cape Town', id: 'foodforward-sa-cape-town' },
  { name: 'Chile inside date range', query: 'Help TECHO in Santiago Chile on 24 October 2026', id: 'techo-chile-colecta-2026', forbidden: ['schedule_mismatch', 'date_mismatch'] },
  { name: 'Quetzaltenango TECHO', query: 'Join TECHO in Quetzaltenango Guatemala', id: 'techo-guatemala-quetzaltenango' },
  { name: 'New York catalog gap', query: 'I want to work in a food bank in New York City today', id: null, fit: 'no_match' },
];

if (!process.env.HELIOS_BEDROCK_MODEL_ID) throw new Error('Set HELIOS_BEDROCK_MODEL_ID to evaluate Bedrock.');

let passed = 0;
for (const testCase of cases) {
  try {
    const result = await searchItems(testCase.query);
    const actualId = result.items[0]?.id ?? null;
    const reasons = result.reason_codes ?? [];
    const valid = result.mode === 'bedrock'
      && actualId === testCase.id
      && (!testCase.fit || result.fit === testCase.fit)
      && (testCase.required ?? []).every((reason) => reasons.includes(reason))
      && (testCase.forbidden ?? []).every((reason) => !reasons.includes(reason));
    if (valid) passed += 1;
    process.stdout.write(`${valid ? 'PASS' : 'FAIL'} ${testCase.name}: ${actualId ?? 'none'} / ${result.fit ?? result.mode} / ${reasons.join(',') || 'no reasons'}\n`);
  } catch (cause) {
    process.stdout.write(`FAIL ${testCase.name}: ${cause instanceof Error ? cause.name : 'unknown error'}\n`);
  }
}

process.stdout.write(`${passed}/${cases.length} Bedrock cases passed\n`);
if (passed !== cases.length) process.exitCode = 1;
