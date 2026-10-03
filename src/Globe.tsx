import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { HeliosItem } from './types';
import { organizationLogoPath, organizationMonogram } from './organizationBrand';
import { shadeTile, shadeTileTemplate } from './solarShade';

maplibregl.setWorkerUrl(workerUrl);
maplibregl.addProtocol('helios-shade', async (params) => ({ data: await shadeTile(params.url) }));

function globalZoom(width: number): number {
  return width < 650 ? 1.32 : width < 1100 ? 1.92 : 2.12;
}

function selectedCameraOffset(width: number, height: number): [number, number] {
  if (width <= 760) return [0, -Math.min(height * 0.32, 205)];
  const cardLeft = width - Math.min(448, width - 40) - Math.min(56, Math.max(20, width * 0.038));
  return [Math.min(0, cardLeft - 140 - width / 2), -35];
}

const earthStyle: maplibregl.StyleSpecification = {
  version: 8,
  projection: { type: 'globe' },
  sources: {
    earth: {
      type: 'raster',
      tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/2004-08-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'],
      tileSize: 256,
      maxzoom: 8,
      attribution: 'Earth imagery: NASA Earth Observatory / GIBS',
    },
    shade: {
      type: 'raster', tiles: [shadeTileTemplate(new Date())], tileSize: 256, maxzoom: 5,
    },
  },
  layers: [{
    id: 'earth', type: 'raster', source: 'earth',
    paint: {
      'raster-brightness-min': 0.11,
      'raster-brightness-max': 0.98,
      'raster-contrast': -0.04,
      'raster-saturation': 0.08,
    },
  },
    { id: 'shade', type: 'raster', source: 'shade', paint: { 'raster-opacity': 1, 'raster-fade-duration': 0 } }],
  sky: {
    'sky-color': '#020a16',
    'horizon-color': '#1d6287',
    'fog-color': '#4585aa',
    'sky-horizon-blend': 0.24,
    'horizon-fog-blend': 0.22,
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.4, 5, 0.4, 7, 0],
  },
};

type Props = {
  items: HeliosItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onExplore: (place?: string) => void;
};

export function Globe({ items, selectedId, onSelect, onExplore }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: earthStyle,
        center: [5, 5],
        zoom: globalZoom(containerRef.current.clientWidth),
        minZoom: 0.8,
        maxZoom: 8,
        attributionControl: false,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      let lastHaloRadius = -1;
      const updateHalo = () => {
        const { clientWidth: width, clientHeight: height } = map.getContainer();
        const latitude = map.getCenter().lat * Math.PI / 180;
        const radius = 512 * 2 ** map.getZoom() / (2 * Math.PI * Math.cos(latitude));
        const focalLength = height / (2 * Math.tan(map.getVerticalFieldOfView() * Math.PI / 360));
        const screenRadius = Math.round(radius * Math.sqrt(focalLength / (focalLength + 2 * radius)) / 4) * 4;
        if (!frameRef.current) return;
        const visible = screenRadius <= Math.hypot(width, height) / 2 + 40;
        frameRef.current.dataset.haloReady = String(visible);
        if (!visible || screenRadius === lastHaloRadius) return;
        frameRef.current.style.setProperty('--globe-radius', `${screenRadius}px`);
        frameRef.current.style.setProperty('--globe-halo-size', `${screenRadius * 2 + 80}px`);
        lastHaloRadius = screenRadius;
      };
      map.on('move', updateHalo);
      map.on('resize', updateHalo);
      updateHalo();
      const solarRefresh = window.setInterval(() => {
        const source = map.getSource('shade') as maplibregl.RasterTileSource | undefined;
        source?.setTiles([shadeTileTemplate(new Date())]);
      }, 300000);
      mapRef.current = map;
      return () => {
        map.off('move', updateHalo);
        map.off('resize', updateHalo);
        window.clearInterval(solarRefresh);
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = [];
        map.remove();
        mapRef.current = null;
      };
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The globe could not start.');
    }
  }, []);

  useEffect(() => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    const map = mapRef.current;
    if (!map) return;
    const grouped = new Map<string, HeliosItem[]>();
    for (const item of items) grouped.set(item.place_label, [...(grouped.get(item.place_label) ?? []), item]);
    const markerGroups = selectedId ? items.filter((item) => item.id === selectedId).map((item) => [item]) : [...grouped.values()];
    markersRef.current = markerGroups.map((group) => {
      const clustered = group.length > 1;
      const item = clustered ? { ...group[0],
        longitude: group.reduce((sum, entry) => sum + entry.longitude, 0) / group.length,
        latitude: group.reduce((sum, entry) => sum + entry.latitude, 0) / group.length,
      } : group[0];
      const markerElement = document.createElement('button');
      markerElement.type = 'button';
      markerElement.className = `globe-marker ${item.record_kind === 'event' ? 'is-event' : ''} ${item.id === selectedId ? 'is-selected' : ''}`;
      markerElement.setAttribute('aria-label', clustered ? `Show ${group.length} ${item.place_label} opportunities` : `Show ${item.title}`);
      markerElement.title = clustered ? `${group.length} sourced paths around ${item.place_label}` : item.title;
      markerElement.addEventListener('click', () => clustered ? onExplore(item.place_label) : onSelect(item.id));
      const badge = document.createElement('span');
      badge.className = 'marker-badge';
      badge.setAttribute('aria-hidden', 'true');
      const logoPath = clustered ? null : organizationLogoPath(item.id);
      if (logoPath) {
        const logo = document.createElement('img');
        logo.src = logoPath;
        logo.alt = '';
        logo.decoding = 'async';
        badge.append(logo);
      } else {
        badge.textContent = clustered ? String(group.length) : organizationMonogram(item);
        badge.classList.add('marker-monogram');
      }
      const label = document.createElement('span');
      label.className = 'marker-label';
      label.textContent = clustered ? `${group.length} sourced paths in ${item.place_label}` : item.organization_name;
      label.setAttribute('aria-hidden', 'true');
      markerElement.append(badge, label);
      return new maplibregl.Marker({ element: markerElement, anchor: 'center', opacityWhenCovered: 0 })
        .setLngLat([item.longitude, item.latitude]).addTo(map);
    });
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [items, selectedId, onSelect, onExplore]);

  useEffect(() => {
    const item = items.find((entry) => entry.id === selectedId);
    const map = mapRef.current;
    if (!map) return;
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1400;
    if (!item) {
      const local = items.length > 0 && items.every((entry) => entry.place_label.startsWith('San Francisco'));
      if (local) {
        const longitude = items.reduce((sum, entry) => sum + entry.longitude, 0) / items.length;
        const latitude = items.reduce((sum, entry) => sum + entry.latitude, 0) / items.length;
        map.flyTo({ center: [longitude, latitude], zoom: 1.9, duration, essential: true });
      } else {
        map.flyTo({ center: [5, 5], zoom: globalZoom(map.getContainer().clientWidth), duration, essential: true });
      }
      return;
    }
    const frameSelected = (animationDuration: number) => {
      const { clientWidth: width, clientHeight: height } = map.getContainer();
      map.flyTo({
        center: [item.longitude, item.latitude],
        zoom: 2.6,
        offset: selectedCameraOffset(width, height),
        duration: animationDuration,
        essential: true,
      });
    };
    const onResize = () => frameSelected(0);
    map.on('resize', onResize);
    frameSelected(duration);
    return () => { map.off('resize', onResize); };
  }, [items, selectedId]);

  return <div ref={frameRef} className="globe-frame">
    <div ref={containerRef} className="globe-canvas" aria-label="Global map of sourced results" />
    <div className="globe-halo" aria-hidden="true" />
    {error && <div className="globe-error" role="status">{error}</div>}
    <a className="imagery-credit" href="https://www.earthdata.nasa.gov/data/tools/global-imagery-browse-services" target="_blank" rel="noopener noreferrer">Earth imagery: NASA GIBS · Blue Marble 2004</a>
  </div>;
}
