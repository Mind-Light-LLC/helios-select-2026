import type { HeliosItem } from './types.js';

export type MapFocus = { longitude: number; latitude: number; scale: 'city' | 'country' | 'world'; source?: 'open_meteo' };

function normalized(value: string): string {
  return ` ${value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
}

function center(items: HeliosItem[], scale: MapFocus['scale']): MapFocus {
  return {
    longitude: items.reduce((sum, item) => sum + item.longitude, 0) / items.length,
    latitude: items.reduce((sum, item) => sum + item.latitude, 0) / items.length,
    scale,
  };
}

export function mapFocusForQuery(query: string, catalog: HeliosItem[]): MapFocus | null {
  if (/\b(?:worldwide|global|anywhere)\b|around the world/i.test(query)) {
    return { longitude: 5, latitude: 5, scale: 'world' };
  }
  const text = normalized(query);
  const cities = [...new Set(catalog.map((item) => item.place_label.split(',')[0]))]
    .filter((city) => city.length > 2 && text.includes(normalized(city)))
    .sort((a, b) => b.length - a.length);
  if (/\bsf\b/i.test(query) && catalog.some((item) => item.place_label.startsWith('San Francisco'))) {
    cities.unshift('San Francisco');
  }
  if (cities.length) return center(catalog.filter((item) => item.place_label.split(',')[0] === cities[0]), 'city');
  const countries = [...new Set(catalog.map((item) => item.country))]
    .filter((country) => country !== 'Global' && text.includes(normalized(country)))
    .sort((a, b) => b.length - a.length);
  if (countries.length) return center(catalog.filter((item) => item.country === countries[0]), 'country');
  return null;
}

export function placeForQuery(query: string): string | null {
  if (/\b(?:worldwide|global|anywhere|near me|nearby)\b|around the world/i.test(query)) return null;
  const match = /\b(?:in|near|around)\s+(?:the\s+)?([\p{L}][\p{L}\s,'-]{1,65})/iu.exec(query);
  const raw = match?.[1] ?? (/^[\p{L}\s,'-]{2,65}$/u.test(query.trim()) ? query.trim() : '');
  const place = raw.split(/\b(?:on|at|for|by|with|this|next|today|tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i)[0]
    ?.trim().replace(/[,\s]+$/, '');
  return place && place.length >= 2 ? place : null;
}
