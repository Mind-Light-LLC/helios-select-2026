import type { HeliosItem } from './types';

export type GlobeMarkerGroup = { items: HeliosItem[]; nearby: boolean };

const radians = Math.PI / 180;

function separation(a: HeliosItem, b: HeliosItem): number {
  const latitudeA = a.latitude * radians;
  const latitudeB = b.latitude * radians;
  const longitudeGap = (a.longitude - b.longitude) * radians;
  const cosine = Math.sin(latitudeA) * Math.sin(latitudeB)
    + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.cos(longitudeGap);
  return Math.acos(Math.max(-1, Math.min(1, cosine))) / radians;
}

export function globeMarkerGroups(items: HeliosItem[], worldView: boolean): GlobeMarkerGroup[] {
  const byPlace = new Map<string, HeliosItem[]>();
  for (const item of items) byPlace.set(item.place_label, [...(byPlace.get(item.place_label) ?? []), item]);
  const places = [...byPlace.values()];
  if (!worldView) return places.map((group) => ({ items: group, nearby: false }));

  const parent = places.map((_, index) => index);
  const root = (index: number): number => {
    let current = index;
    while (parent[current] !== current) current = parent[current];
    return current;
  };
  for (let left = 0; left < places.length; left += 1) {
    for (let right = left + 1; right < places.length; right += 1) {
      if (separation(places[left][0], places[right][0]) <= 6) parent[root(right)] = root(left);
    }
  }

  const clusters = new Map<number, { items: HeliosItem[]; places: number }>();
  places.forEach((group, index) => {
    const key = root(index);
    const cluster = clusters.get(key) ?? { items: [], places: 0 };
    cluster.items.push(...group);
    cluster.places += 1;
    clusters.set(key, cluster);
  });
  return [...clusters.values()].map((cluster) => ({ items: cluster.items, nearby: cluster.places > 1 }));
}
