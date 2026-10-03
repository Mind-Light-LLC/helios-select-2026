import { useCallback, useEffect, useRef, useState } from 'react';
import { lookupMapFocus } from '@api';
import { mapFocusForQuery, placeForQuery, type MapFocus } from './mapFocus';
import type { HeliosItem } from './types';

export function useMapFocus(catalog: HeliosItem[]) {
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const focusPlace = useCallback(async (place: string): Promise<boolean> => {
    requestRef.current?.abort();
    requestRef.current = null;
    setNotice(null);
    const known = mapFocusForQuery(place, catalog);
    setFocus(known);
    if (known) return true;
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const resolved = await lookupMapFocus(place, controller.signal);
      if (controller.signal.aborted) return false;
      if (resolved) setFocus(resolved);
      else setNotice('That place could not be located on the globe. Catalog pins remain visible.');
      return Boolean(resolved);
    } catch {
      if (!controller.signal.aborted) setNotice('Place lookup is unavailable. Catalog pins remain visible.');
      return false;
    }
  }, [catalog]);

  const focusQuery = useCallback((query: string) => {
    requestRef.current?.abort();
    requestRef.current = null;
    setNotice(null);
    const known = mapFocusForQuery(query, catalog);
    if (known) { setFocus(known); return; }
    const place = placeForQuery(query);
    if (place) void focusPlace(place);
  }, [catalog, focusPlace]);

  const focusWorld = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    setNotice(null);
    setFocus({ longitude: 5, latitude: 5, scale: 'world' });
  }, []);

  return { focus, notice, focusQuery, focusPlace, focusWorld };
}
