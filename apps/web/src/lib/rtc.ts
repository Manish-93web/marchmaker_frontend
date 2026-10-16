import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiRequestError } from './api';

export type CallPhase = 'idle' | 'calling' | 'incoming' | 'connecting' | 'connected' | 'ended';

interface Ice {
  iceServers: RTCIceServer[];
}
interface Signal {
  callId: string;
  kind: 'invite' | 'offer' | 'answer' | 'candidate' | 'accept' | 'decline' | 'end';
  payload: Record<string, unknown> | null;
}

/**
 * One-to-one voice in the browser (WebRTC). The server only relays small signalling messages; the audio
 * itself goes directly between the two phones, or through our TURN relay when a network blocks that.
 * Nothing is recorded and neither phone number is involved.
 */
export function useVoiceCall(introId: string, enabled: boolean) {
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [muted, setMutedState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const pc = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const callId = useRef<string | null>(null);
  const ice = useRef<Ice | null>(null);
  const [offer, setOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const queued = useRef<RTCIceCandidateInit[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const send = useCallback(
    (kind: Signal['kind'], payload?: Record<string, unknown>) =>
      callId.current ? api(`/introductions/${introId}/rtc/signal`, { method: 'POST', body: { callId: callId.current, kind, payload } }).catch(() => undefined) : Promise.resolve(),
    [introId],
  );

  const cleanup = useCallback(() => {
    pc.current?.close();
    pc.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    callId.current = null;
    setOffer(null);
    queued.current = [];
    if (audio.current) audio.current.srcObject = null;
  }, []);

  const build = useCallback(async () => {
    const conn = new RTCPeerConnection({ iceServers: ice.current?.iceServers ?? [] });
    pc.current = conn;
    conn.onicecandidate = (e) => {
      if (e.candidate) void send('candidate', e.candidate.toJSON() as Record<string, unknown>);
    };
    conn.ontrack = (e) => {
      if (audio.current) {
        audio.current.srcObject = e.streams[0] ?? null;
        void audio.current.play().catch(() => undefined);
      }
    };
    conn.onconnectionstatechange = () => {
      if (conn.connectionState === 'connected') {
        setPhase('connected');
        setSeconds(0);
        timer.current ??= setInterval(() => setSeconds((s) => s + 1), 1000);
      }
      if (['failed', 'closed'].includes(conn.connectionState)) {
        setPhase('ended');
        cleanup();
      }
    };
    stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
    stream.current.getTracks().forEach((t) => conn.addTrack(t, stream.current!));
    return conn;
  }, [cleanup, send]);

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiRequestError) setError(e.code || e.message);
    else if (e instanceof DOMException && ['NotAllowedError', 'NotFoundError'].includes(e.name)) setError('MIC');
    else setError('GENERIC');
    setPhase('ended');
    cleanup();
  }, [cleanup]);

  // Listen for signals while the panel is open.
  useEffect(() => {
    if (!enabled || typeof EventSource === 'undefined') return;
    const es = new EventSource(`/api/v1/introductions/${introId}/rtc/stream`, { withCredentials: true });
    es.addEventListener('signal', (ev) => {
      void (async () => {
        const s = JSON.parse((ev as MessageEvent<string>).data) as Signal;
        try {
          if (s.kind === 'invite') {
            if (pc.current || callId.current) return;
            callId.current = s.callId;
            ice.current = await api<Ice>(`/introductions/${introId}/rtc/config`);
            setPhase('incoming');
          } else if (s.callId !== callId.current) {
            return;
          } else if (s.kind === 'offer') {
            setOffer(s.payload as unknown as RTCSessionDescriptionInit);
          } else if (s.kind === 'accept') {
            // The callee said yes: now send the offer.
            setPhase('connecting');
            const conn = pc.current!;
            const offer = await conn.createOffer();
            await conn.setLocalDescription(offer);
            await send('offer', { type: offer.type, sdp: offer.sdp });
          } else if (s.kind === 'answer') {
            await pc.current?.setRemoteDescription(s.payload as unknown as RTCSessionDescriptionInit);
            for (const c of queued.current.splice(0)) await pc.current?.addIceCandidate(c);
          } else if (s.kind === 'candidate') {
            const c = s.payload as unknown as RTCIceCandidateInit;
            if (pc.current?.remoteDescription) await pc.current.addIceCandidate(c);
            else queued.current.push(c);
          } else if (s.kind === 'decline' || s.kind === 'end') {
            setPhase('ended');
            cleanup();
          }
        } catch (e) {
          fail(e);
        }
      })();
    });
    return () => es.close();
  }, [enabled, introId, send, cleanup, fail]);

  // The callee's offer arrives after they accept; answer it when both the connection and the offer exist.
  useEffect(() => {
    if (phase !== 'connecting' || !pc.current || !offer) return;
    const conn = pc.current;
    setOffer(null);
    void (async () => {
      try {
        await conn.setRemoteDescription(offer);
        for (const c of queued.current.splice(0)) await conn.addIceCandidate(c);
        const answer = await conn.createAnswer();
        await conn.setLocalDescription(answer);
        await send('answer', { type: answer.type, sdp: answer.sdp });
      } catch (e) {
        fail(e);
      }
    })();
  }, [phase, offer, send, fail]);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const r = await api<{ callId: string } & Ice>(`/introductions/${introId}/rtc/call`, { method: 'POST' });
      callId.current = r.callId;
      ice.current = r;
      setPhase('calling');
      await build();
    } catch (e) {
      fail(e);
    }
  }, [build, fail, introId]);

  const accept = useCallback(async () => {
    setError(null);
    try {
      setPhase('connecting');
      await build();
      await send('accept');
    } catch (e) {
      fail(e);
    }
  }, [build, send, fail]);

  const decline = useCallback(async () => {
    await send('decline');
    setPhase('ended');
    cleanup();
  }, [send, cleanup]);

  const end = useCallback(async () => {
    await send('end');
    setPhase('ended');
    cleanup();
  }, [send, cleanup]);

  const setMuted = useCallback((m: boolean) => {
    stream.current?.getAudioTracks().forEach((t) => (t.enabled = !m));
    setMutedState(m);
  }, []);

  const attachAudio = useCallback((el: HTMLAudioElement | null) => {
    audio.current = el;
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setError(null);
  }, []);

  return { phase, muted, setMuted, error, seconds, start, accept, decline, end, attachAudio, reset };
}
