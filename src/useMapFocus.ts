import { useCallback, useEffect, useRef, useState } from 'react';
import { lookupMapFocus } from '@api';
import { mapFocusForQuery, placeForQuery, type MapFocus } from './mapFocus';
import type { HeliosItem } from './types';

export function useMapFocus(catalog: HeliosItem[]) {
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const focusQuery = useCallback((query: string) => {
    requestRef.current?.abort();
    requestRef.current = null;
    setNotice(null);
    const known = mapFocusForQuery(query, catalog);
    setFocus(known);
    const place = known ? null : placeForQuery(query);
    if (!place) return;
    const controller = new AbortController();
    requestRef.current = controller;
    void lookupMapFocus(place, controller.signal).then((resolved) => {
      if (controller.signal.aborted) return;
      if (resolved) setFocus(resolved);
      else setNotice('That place could not be located on the globe. Catalog pins remain visible.');
    }).catch(() => {
      if (!controller.signal.aborted) setNotice('Place lookup is unavailable. Catalog pins remain visible.');
    });
  }, [catalog]);

  const focusWorld = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    setNotice(null);
    setFocus({ longitude: 5, latitude: 5, scale: 'world' });
  }, []);

  return { focus, notice, focusQuery, focusWorld };
}
