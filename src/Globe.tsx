import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { HeliosItem } from './types';

type Props = {
  items: HeliosItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function Globe({ items, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: 'https://demotiles.maplibre.org/globe.json',
        center: [5, 15],
        zoom: 1.35,
        minZoom: 1,
        maxZoom: 15,
        attributionControl: false,
      });
      map.on('style.load', () => map.setProjection({ type: 'globe' }));
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
      mapRef.current = map;
      return () => {
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
    markersRef.current = items.map((item) => {
      const markerElement = document.createElement('button');
      markerElement.type = 'button';
      markerElement.className = `globe-marker ${item.id === selectedId ? 'is-selected' : ''}`;
      markerElement.setAttribute('aria-label', `Show ${item.title}`);
      markerElement.title = item.title;
      markerElement.addEventListener('click', () => onSelect(item.id));
      return new maplibregl.Marker({ element: markerElement, anchor: 'center' })
        .setLngLat([item.longitude, item.latitude]).addTo(map);
    });
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [items, selectedId, onSelect]);

  useEffect(() => {
    const item = items.find((entry) => entry.id === selectedId);
    if (!item || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [item.longitude, item.latitude],
      zoom: 4.5,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1400,
      essential: true,
    });
  }, [items, selectedId]);

  return <div className="globe-frame">
    <div ref={containerRef} className="globe-canvas" aria-label="Global map of sourced results" />
    {error && <div className="globe-error" role="status">{error}</div>}
    <div className="globe-caption">Global view · {items.length} mapped records</div>
  </div>;
}
