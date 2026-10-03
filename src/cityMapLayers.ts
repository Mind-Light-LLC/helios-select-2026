import type { LayerSpecification, VectorSourceSpecification } from 'maplibre-gl';

export const citySource: VectorSourceSpecification = {
  type: 'vector', url: 'https://tiles.openfreemap.org/planet',
  attribution: 'OpenFreeMap © OpenMapTiles · Data from OpenStreetMap',
};

export const cityLayers: LayerSpecification[] = [
  { id: 'city-base', type: 'background', minzoom: 7,
    paint: { 'background-color': '#0b2030', 'background-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0, 9, 0.88] } },
  { id: 'city-water', type: 'fill', source: 'city', 'source-layer': 'water', minzoom: 7,
    paint: { 'fill-color': '#123e51', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0, 9, 0.92] } },
  { id: 'city-parks', type: 'fill', source: 'city', 'source-layer': 'landuse', minzoom: 8,
    filter: ['==', ['get', 'class'], 'park'],
    paint: { 'fill-color': '#28513f', 'fill-opacity': 0.8 } },
  { id: 'city-roads', type: 'line', source: 'city', 'source-layer': 'transportation', minzoom: 8,
    filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor'], true, false],
    paint: { 'line-color': '#b4a68b', 'line-opacity': 0.74,
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 11, 2.2] } },
  { id: 'city-labels', type: 'symbol', source: 'city', 'source-layer': 'place', minzoom: 8,
    filter: ['match', ['get', 'class'], ['city', 'town', 'suburb', 'neighbourhood'], true, false],
    layout: { 'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
      'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11, 11, 14],
      'text-max-width': 9 },
    paint: { 'text-color': '#f1e8d8', 'text-halo-color': '#0b2030', 'text-halo-width': 1.5 } },
];
