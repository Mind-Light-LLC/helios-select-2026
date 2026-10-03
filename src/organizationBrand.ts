import type { HeliosItem } from './types';

const logoPaths: Record<string, string> = {
  'food-bank-singapore-warehouse': '/organization-logos/food-bank-singapore.png',
  'lagos-food-bank-volunteer': '/organization-logos/lagos-food-bank.png',
  'foodforward-sa-cape-town': '/organization-logos/foodforward-sa.png',
};

const monograms: Record<string, string> = {
  'friends-urban-forest-sf': 'FUF',
  'friends-sf-public-library': 'FPL',
  'foodbank-indonesia-volunteer': 'FOI',
  'sfm-food-bank-warehouse': 'SFM',
  'sf-spca-volunteer': 'SFS',
  'sf-aids-foundation-volunteer': 'SFA',
  '826-valencia-tutoring': '826',
  'red-cross-lakewood-alarms-2026': 'ARC',
  'british-red-cross-volunteer': 'BRC',
  'australian-red-cross-volunteer': 'AURC',
  'techo-chile-colecta-2026': 'TC',
  'techo-guatemala-quetzaltenango': 'TG',
  'unv-online-volunteering': 'UNV',
};

export function organizationLogoPath(id: string): string | null {
  return logoPaths[id] ?? null;
}

export function organizationBadgeTone(id: string): number {
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0) % 8;
}

export function organizationMonogram(item: Pick<HeliosItem, 'id' | 'organization_name'>): string {
  return monograms[item.id] ?? item.organization_name.split(/\s+/).slice(0, 2).map((word) => word[0] ?? '').join('').toUpperCase();
}
