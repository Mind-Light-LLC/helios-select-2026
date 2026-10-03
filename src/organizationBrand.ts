import type { HeliosItem } from './types';

const logoPaths: Record<string, string> = {
  '826-valencia-tutoring': '/organization-logos/826-valencia.png',
  'acao-cidadania-digital-volunteer': '/organization-logos/acao-cidadania.png',
  'bamx-mexico-volunteer': '/organization-logos/bamx.png',
  'banco-alimentos-buenos-aires-volunteer': '/organization-logos/banco-alimentos-buenos-aires.png',
  'boroume-athens-volunteer': '/organization-logos/boroume.png',
  'daily-bread-toronto-volunteer': '/organization-logos/daily-bread.png',
  'dcck-klein-center-volunteer': '/organization-logos/dc-central-kitchen.png',
  'family-house-sf': '/organization-logos/family-house.png',
  'food-for-all-africa-volunteer': '/organization-logos/food-for-all-africa.png',
  'foodbank-indonesia-volunteer': '/organization-logos/foodbank-indonesia.png',
  'glide-meals-sf': '/organization-logos/glide.png',
  'habitat-greater-sf': '/organization-logos/habitat-gsf.png',
  'larkin-street-youth-sf': '/organization-logos/larkin-street-youth.png',
  'meals-on-wheels-sf': '/organization-logos/meals-on-wheels-sf.png',
  'ozharvest-melbourne-volunteer': '/organization-logos/ozharvest.png',
  'parks-conservancy-presidio': '/organization-logos/parks-conservancy.png',
  'restos-paris-volunteer': '/organization-logos/restos-paris.png',
  'robin-hood-army-delhi': '/organization-logos/robin-hood-army.png',
  'second-harvest-japan-volunteer': '/organization-logos/second-harvest-japan.svg',
  'sf-aids-foundation-volunteer': '/organization-logos/sf-aids-foundation.png',
  'sf-spca-volunteer': '/organization-logos/sf-spca.png',
  'sfm-food-bank-warehouse': '/organization-logos/sf-marin-food-bank.png',
  'st-anthony-dining-room-sf': '/organization-logos/st-anthony.png',
  'food-bank-singapore-warehouse': '/organization-logos/food-bank-singapore.png',
  'lagos-food-bank-volunteer': '/organization-logos/lagos-food-bank.png',
  'foodforward-sa-cape-town': '/organization-logos/foodforward-sa.png',
};

const monograms: Record<string, string> = {
  'new-zealand-red-cross-volunteer': 'NZRC',
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

export function organizationLogoNeedsDarkBackground(id: string): boolean {
  return id === 'robin-hood-army-delhi' || id === 'second-harvest-japan-volunteer';
}

export function organizationBadgeTone(id: string): number {
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0) % 8;
}

export function organizationMonogram(item: Pick<HeliosItem, 'id' | 'organization_name'>): string {
  return monograms[item.id] ?? item.organization_name.split(/\s+/).slice(0, 2).map((word) => word[0] ?? '').join('').toUpperCase();
}
