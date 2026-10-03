import { useEffect, useRef, useState } from 'react';
import { requestVoiceToken, searchCatalog } from '@api';
import type { HeliosItem, SearchResponse } from './types';

type Props = {
  onSearch: (response: SearchResponse) => void;
  onFocus: (id: string) => void;
  results: HeliosItem[];
};

type FunctionCall = { type: 'function_call'; name: string; call_id: string; arguments: string };

function isFunctionCall(value: unknown): value is FunctionCall {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'function_call'
    && 'name' in value && typeof value.name === 'string'
    && 'call_id' in value && typeof value.call_id === 'string'
    && 'arguments' in value && typeof value.arguments === 'string';
}

function getStringField(raw: string, name: string): string {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('Voice request was invalid.'); }
  if (typeof value !== 'object' || value === null || !(name in value)) throw new Error('Voice request was incomplete.');
  const field: unknown = (value as Record<string, unknown>)[name];
  if (typeof field !== 'string' || !field.trim()) throw new Error('Voice request was incomplete.');
  return field.trim();
}

export function VoiceControl({ onSearch, onFocus, results }: Props) {
  const [state, setState] = useState<'idle' | 'connecting' | 'listening'>('idle');
  const [error, setError] = useState<string | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generationRef = useRef(0);
  const resultsRef = useRef(results);
  const callbacksRef = useRef({ onSearch, onFocus });
  useEffect(() => { resultsRef.current = results; callbacksRef.current = { onSearch, onFocus }; }, [results, onSearch, onFocus]);

  function stop() {
    generationRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    audioRef.current = null;
    setState('idle');
  }

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    peerRef.current?.close();
  }, []);

  async function handleCall(call: FunctionCall, channel: RTCDataChannel) {
    let output: Record<string, unknown>;
    try {
      if (call.name === 'search_catalog') {
        const query = getStringField(call.arguments, 'query');
        const response = await searchCatalog(query);
        callbacksRef.current.onSearch(response);
        resultsRef.current = response.items;
        output = {
          mode: response.mode,
          count: response.items.length,
          catalog_count: response.catalog_count,
          records: response.items.slice(0, 8).map((item) => ({
            id: item.id, title: item.title, kind: item.record_kind,
            organization: item.organization_name, country: item.country,
            place: item.place_label, pin_meaning: item.pin_meaning, schedule: item.schedule_text,
            summary: item.summary, source_url: item.source_url,
            action_url: item.action_url, source_checked_at: item.source_checked_at,
          })),
        };
      } else if (call.name === 'focus_result') {
        const id = getStringField(call.arguments, 'id');
        const result = resultsRef.current.find((item) => item.id === id);
        if (!result) throw new Error('That result is not in the current search.');
        callbacksRef.current.onFocus(id);
        output = { focused: true, title: result.title, country: result.country, source_url: result.source_url };
      } else {
        throw new Error('Unknown voice action.');
      }
    } catch (cause) {
      output = { error: cause instanceof Error ? cause.message : 'Voice action failed.' };
    }
    if (channel.readyState !== 'open') return;
    channel.send(JSON.stringify({
      type: 'conversation.item.create',
      item: { type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(output) },
    }));
    channel.send(JSON.stringify({ type: 'response.create' }));
  }

  async function start() {
    if (state !== 'idle') return;
    setState('connecting');
    setError(null);
    const generation = ++generationRef.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('A microphone is unavailable in this browser.');
      const token = await requestVoiceToken();
      if (generation !== generationRef.current) return;
      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;
      peer.ontrack = (event) => { audio.srcObject = event.streams[0] ?? null; };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      if (generation !== generationRef.current) return;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      const channel = peer.createDataChannel('oai-events');
      channel.addEventListener('open', () => { if (generation === generationRef.current) setState('listening'); });
      channel.addEventListener('message', (event: MessageEvent<string>) => {
        try {
          const payload: unknown = JSON.parse(event.data);
          if (typeof payload !== 'object' || payload === null || !('type' in payload)) return;
          if (payload.type === 'response.output_item.done' && 'item' in payload && isFunctionCall(payload.item)) {
            void handleCall(payload.item, channel);
          }
          if (payload.type === 'error' && 'error' in payload) setError('The voice session reported an error.');
        } catch { setError('The voice session sent an unreadable event.'); }
      });
      peer.addEventListener('connectionstatechange', () => {
        if (peer.connectionState === 'failed' && generation === generationRef.current) {
          setError('The voice connection failed.');
          stop();
        }
      });
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      if (!offer.sdp) throw new Error('Could not start the voice connection.');
      const response = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}`, 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      });
      if (!response.ok) throw new Error(`Voice connection failed (${response.status}).`);
      if (generation !== generationRef.current) return;
      await peer.setRemoteDescription({ type: 'answer', sdp: await response.text() });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Voice could not start.');
      stop();
    }
  }

  return <div className="voice-control">
    <button type="button" className={`voice-button ${state === 'listening' ? 'is-live' : ''}`} onClick={state === 'idle' ? start : stop}>
      {state === 'idle' ? 'Talk to Helios' : state === 'connecting' ? 'Connecting… Stop' : 'Listening · Stop'}
    </button>
    {error && <span className="voice-error" role="alert">{error}</span>}
  </div>;
}
