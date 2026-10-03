import { useEffect, useRef, useState } from 'react';
import { requestVoiceToken, searchCatalog, type NeedView } from '@api';
import type { HeliosItem, SearchResponse } from './types';
import { requestMicrophone } from './voiceMedia';
import { executeNeedVoiceTool } from './voiceNeedTools';
import { voiceSearchOutput } from './voiceSearchOutput';
import type { VoiceActivity } from './voiceActivity';

type Props = {
  available: boolean;
  onSearch: (response: SearchResponse, query: string) => void;
  onFocus: (id: string) => void;
  onNeed: (id: string, offer?: string) => void;
  results: HeliosItem[];
  startRequest: number;
  holdToTalk: boolean;
  onActivityChange: (activity: VoiceActivity) => void;
  onNotice: (notice: string | null) => void;
};

type VoiceState = 'idle' | 'requesting' | 'connecting' | 'ready' | 'listening' | 'searching' | 'responding' | 'speaking';
type FunctionCall = { type: 'function_call'; name: string; call_id: string; arguments: string };
type RealtimeEvent = Record<string, unknown> & { type: string };

function isFunctionCall(value: unknown): value is FunctionCall {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'function_call'
    && 'name' in value && typeof value.name === 'string'
    && 'call_id' in value && typeof value.call_id === 'string'
    && 'arguments' in value && typeof value.arguments === 'string';
}

function isRealtimeEvent(value: unknown): value is RealtimeEvent {
  return typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';
}

function toolArguments(raw: string): Record<string, unknown> {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('Voice request was invalid.'); }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Voice request was invalid.');
  return value as Record<string, unknown>;
}

function getStringField(args: Record<string, unknown>, name: string): string {
  const field = args[name];
  if (typeof field !== 'string' || !field.trim()) throw new Error('Voice request was incomplete.');
  return field.trim();
}

function optionalStringField(args: Record<string, unknown>, name: string): string | undefined {
  if (!(name in args)) return undefined;
  return getStringField(args, name);
}

export function VoiceControl({ available, onSearch, onFocus, onNeed, results, startRequest, holdToTalk, onActivityChange, onNotice }: Props) {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const holdRef = useRef(false);
  const holdModeRef = useRef(false);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchRef = useRef<AbortController | null>(null);
  const connectRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const resultsRef = useRef(results);
  const needsRef = useRef<NeedView[]>([]);
  const callbacksRef = useRef({ onSearch, onFocus, onNeed });
  useEffect(() => { resultsRef.current = results; callbacksRef.current = { onSearch, onFocus, onNeed }; }, [results, onSearch, onFocus, onNeed]);
  useEffect(() => {
    const activity: VoiceActivity = state === 'idle' ? 'idle' : state === 'listening' || state === 'speaking' ? state
      : state === 'requesting' || state === 'connecting' ? 'connecting' : holdModeRef.current ? 'hold-ready' : 'ready';
    onActivityChange(activity);
  }, [state, onActivityChange]);
  useEffect(() => onNotice(error), [error, onNotice]);
  useEffect(() => () => onActivityChange('idle'), [onActivityChange]);

  function releaseResources() {
    searchRef.current?.abort();
    searchRef.current = null;
    connectRef.current?.abort();
    connectRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.srcObject = null;
    audioRef.current = null;
  }

  function stop() {
    generationRef.current += 1;
    releaseResources();
    holdModeRef.current = false;
    setError(null);
    setState('idle');
  }

  useEffect(() => () => {
    generationRef.current += 1;
    releaseResources();
  }, []);

  async function handleCall(call: FunctionCall, channel: RTCDataChannel, generation: number) {
    let output: Record<string, unknown>;
    let activeController: AbortController | null = null;
    try {
      const args = toolArguments(call.arguments);
      if (call.name === 'search_catalog') {
        const query = getStringField(args, 'query');
        const country = optionalStringField(args, 'country');
        searchRef.current?.abort();
        const controller = new AbortController();
        activeController = controller;
        searchRef.current = controller;
        setState('searching');
        const response = await searchCatalog(query, country ? { country } : {}, controller.signal);
        if (generation !== generationRef.current || controller.signal.aborted) return;
        callbacksRef.current.onSearch(response, query);
        resultsRef.current = [...response.items, ...(response.alternatives ?? []).map(({ item }) => item)];
        output = voiceSearchOutput(response);
        if (searchRef.current === controller) searchRef.current = null;
      } else if (call.name === 'focus_result') {
        const id = getStringField(args, 'id');
        const result = resultsRef.current.find((item) => item.id === id);
        if (!result) throw new Error('That result is not in the current search.');
        callbacksRef.current.onFocus(id);
        output = { focused: true, title: result.title, summary: result.summary,
          schedule: result.schedule_text, availability_status: result.availability_status,
          action_url: result.action_url, donation_url: result.donation_url,
          country: result.country, source_url: result.source_url };
      } else if (['list_sourced_needs', 'check_offer', 'focus_need'].includes(call.name)) {
        const result = await executeNeedVoiceTool(call.name, args, needsRef.current, callbacksRef.current.onNeed);
        needsRef.current = result.needs;
        output = result.output;
      } else {
        throw new Error('Unknown voice action.');
      }
    } catch (cause: unknown) {
      if (generation !== generationRef.current) return;
      if (activeController?.signal.aborted) return;
      if (searchRef.current === activeController) searchRef.current = null;
      output = { error: cause instanceof Error ? cause.message : 'Voice action failed.' };
    }
    if (generation !== generationRef.current || channel.readyState !== 'open') return;
    try {
      channel.send(JSON.stringify({
        type: 'conversation.item.create',
        item: { type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(output) },
      }));
      channel.send(JSON.stringify({ type: 'response.create' }));
      setState('responding');
    } catch {
      setError('Voice response could not continue.');
    }
  }

  function handleEvent(event: RealtimeEvent, channel: RTCDataChannel, generation: number) {
    if (generation !== generationRef.current) return;
    if (event.type === 'input_audio_buffer.speech_started') {
      searchRef.current?.abort();
      searchRef.current = null;
      if (!holdModeRef.current || holdRef.current) setState('listening');
    } else if (event.type === 'input_audio_buffer.speech_stopped') {
      setState('responding');
    } else if (event.type === 'response.created') {
      setState('responding');
    } else if (event.type === 'response.output_item.done' && isFunctionCall(event.item)) {
      void handleCall(event.item, channel, generation);
    } else if (event.type === 'output_audio_buffer.started') {
      setState('speaking');
    } else if (event.type === 'output_audio_buffer.stopped') {
      setState('ready');
    } else if (event.type === 'error') {
      setState('ready');
      setError('The voice session reported an error.');
    }
  }

  async function start(mode: 'continuous' | 'hold' = 'continuous') {
    const generation = ++generationRef.current;
    holdModeRef.current = mode === 'hold';
    setState('requesting');
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('A microphone is unavailable in this browser.');
      const token = await requestVoiceToken();
      if (generation !== generationRef.current) return;
      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;
      peer.ontrack = (event) => {
        if (generation !== generationRef.current) return;
        audio.srcObject = event.streams[0] ?? null;
        if (audio.srcObject) void audio.play().catch(() => setError('Audio playback was blocked. Allow sound and try again.'));
      };
      const stream = await requestMicrophone(generation, () => generationRef.current);
      if (generation !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      stream.getAudioTracks().forEach((track) => { track.enabled = mode === 'continuous' || holdRef.current; });
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      const channel = peer.createDataChannel('oai-events');
      channel.addEventListener('open', () => {
        if (generation !== generationRef.current) return;
        setState(mode === 'hold' && holdRef.current ? 'listening' : 'ready');
        if (mode === 'continuous') channel.send(JSON.stringify({ type: 'response.create' }));
      });
      channel.addEventListener('message', (event: MessageEvent<string>) => {
        try {
          const payload: unknown = JSON.parse(event.data);
          if (isRealtimeEvent(payload)) handleEvent(payload, channel, generation);
        } catch { if (generation === generationRef.current) setError('The voice session sent an unreadable event.'); }
      });
      peer.addEventListener('connectionstatechange', () => {
        if (peer.connectionState === 'failed' && generation === generationRef.current) {
          stop();
          setError('The voice connection failed.');
        }
      });
      setState('connecting');
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      if (generation !== generationRef.current) return;
      if (!offer.sdp) throw new Error('Could not start the voice connection.');
      const controller = new AbortController();
      connectRef.current = controller;
      const response = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}`, 'Content-Type': 'application/sdp' },
        body: offer.sdp,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Voice connection failed (${response.status}).`);
      const answer = await response.text();
      if (generation !== generationRef.current) return;
      connectRef.current = null;
      await peer.setRemoteDescription({ type: 'answer', sdp: answer });
    } catch (cause: unknown) {
      if (generation !== generationRef.current) return;
      stop();
      setError(cause instanceof Error ? cause.message : 'Voice could not start.');
    }
  }

  useEffect(() => {
    if (startRequest > 0 && available && state === 'idle') void start();
  }, [startRequest]);

  useEffect(() => {
    holdRef.current = holdToTalk;
    if (holdToTalk && available && state === 'idle') { void start('hold'); return; }
    if (!holdModeRef.current) return;
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = holdToTalk;
    if (holdToTalk && track && state === 'ready') setState('listening');
    if (!holdToTalk && state === 'listening') setState('ready');
  }, [holdToTalk]);

  const active = state !== 'idle';
  return <div className="voice-control">
    <button type="button" className={`voice-button ${active ? 'is-live' : ''}`} onClick={active ? stop : () => void start()} disabled={!available} aria-label={active ? 'Stop voice' : available ? 'Start voice' : 'Voice unavailable'} aria-pressed={active} title={!available ? 'Voice is unavailable right now' : undefined}>
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8" /></svg>
    </button>
    <span className="sr-only" role="status" aria-live="polite">{active ? `Helios voice ${state}` : 'Helios voice off'}</span>
  </div>;
}
