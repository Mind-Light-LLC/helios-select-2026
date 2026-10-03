import type { MapFocus } from '../src/mapFocus.js';

type PlaceHit = { name: string; latitude: number; longitude: number; feature_code?: string };

function isPlaceHit(value: unknown): value is PlaceHit {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const hit = value as Record<string, unknown>;
  return typeof hit.name === 'string' && typeof hit.latitude === 'number' && Number.isFinite(hit.latitude)
    && Math.abs(hit.latitude) <= 90 && typeof hit.longitude === 'number' && Number.isFinite(hit.longitude)
    && Math.abs(hit.longitude) <= 180 && (hit.feature_code === undefined || typeof hit.feature_code === 'string');
}

function normalized(value: string): string {
  return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export function focusFromGeocoding(value: unknown, requested: string): MapFocus | null {
  if (typeof value !== 'object' || value === null || !('results' in value) || !Array.isArray(value.results)) return null;
  const name = normalized(requested.split(',')[0]);
  const hit = value.results.filter(isPlaceHit).find((entry) => normalized(entry.name) === name);
  if (!hit) return null;
  return { longitude: hit.longitude, latitude: hit.latitude,
    scale: hit.feature_code?.startsWith('PCL') ? 'country' : 'city', source: 'open_meteo' };
}

export async function GET(request: Request): Promise<Response> {
  const name = new URL(request.url).searchParams.get('name')?.trim() ?? '';
  if (name.length < 2 || name.length > 80 || !/^[\p{L}\p{M}\s,'-]+$/u.test(name)) {
    return Response.json({ error: 'Enter a city or country name.' }, { status: 400 });
  }
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({ name, count: '5', language: 'en', format: 'json' }).toString();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Geocoding returned ${response.status}.`);
    const value: unknown = await response.json();
    return Response.json({ focus: focusFromGeocoding(value, name) },
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } });
  } catch {
    return Response.json({ error: 'Location lookup is temporarily unavailable.' }, { status: 502 });
  }
}
