import type { HeliosItem } from './types';

const logoPaths: Record<string, string> = {
  '826-valencia-tutoring': '/organization-logos/826-valencia.png',
  'acao-cidadania-digital-volunteer': '/organization-logos/acao-cidadania.png',
  'bamx-mexico-volunteer': '/organization-logos/bamx.png',
  'banco-alimentos-buenos-aires-volunteer': '/organization-logos/banco-alimentos-buenos-aires.png',
  'daily-bread-toronto-volunteer': '/organization-logos/daily-bread.png',
  'dcck-klein-center-volunteer': '/organization-logos/dc-central-kitchen.png',
  'family-house-sf': '/organization-logos/family-house.png',
  'food-for-all-africa-volunteer': '/organization-logos/food-for-all-africa.png',
  'food-bank-singapore-warehouse': '/organization-logos/food-bank-singapore.png',
  'foodbank-indonesia-volunteer': '/organization-logos/foodbank-indonesia.png',
  'glide-meals-sf': '/organization-logos/glide.png',
  'lagos-food-bank-volunteer': '/organization-logos/lagos-food-bank.png',
  'meals-on-wheels-sf': '/organization-logos/meals-on-wheels-sf.png',
  'ozharvest-melbourne-volunteer': '/organization-logos/ozharvest.png',
  'parks-conservancy-presidio': '/organization-logos/parks-conservancy.png',
  'restos-paris-volunteer': '/organization-logos/restos-paris.png',
  'robin-hood-army-delhi': '/organization-logos/robin-hood-army.png',
  'sf-aids-foundation-volunteer': '/organization-logos/sf-aids-foundation.png',
  'sf-spca-volunteer': '/organization-logos/sf-spca.png',
  'sfm-food-bank-warehouse': '/organization-logos/sf-marin-food-bank.png',
  'st-anthony-dining-room-sf': '/organization-logos/st-anthony.png',
  'foodforward-sa-cape-town': '/organization-logos/foodforward-sa.png',
};

const monograms: Record<string, string> = {
  'red-cross-lakewood-alarms-2026': 'ARC',
  'british-red-cross-volunteer': 'BRC',
  'australian-red-cross-volunteer': 'AURC',
  'new-zealand-red-cross-volunteer': 'NZRC',
  'techo-chile-colecta-2026': 'TC',
  'techo-guatemala-quetzaltenango': 'TG',
  'unv-online-volunteering': 'UNV',
};

export function organizationLogoPath(id: string): string | null {
  return logoPaths[id] ?? null;
}

export function organizationLogoNeedsDarkBackground(id: string): boolean {
  return id === 'robin-hood-army-delhi';
}

export function organizationMonogram(item: Pick<HeliosItem, 'id' | 'organization_name'>): string {
  return monograms[item.id] ?? item.organization_name.split(/\s+/).slice(0, 2).map((word) => word[0] ?? '').join('').toUpperCase();
}
