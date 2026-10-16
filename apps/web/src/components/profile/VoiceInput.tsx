import { Button } from '@marchmaker/ui';
import { useQuery } from '@tanstack/react-query';
import { Mic, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiRequestError } from '../../lib/api';

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function readCsrf(): string | undefined {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith('mm_csrf='))
    ?.split('=')[1];
}

export interface VoiceInputProps {
  /** Current text, so dictation appends to it. */
  value: string;
  onText: (text: string) => void;
  disabled?: boolean;
}

/**
 * Dictation for long answers. Uses the browser's Web Speech API (en-IN / hi-IN) and puts the
 * transcript straight into the field so it can be edited before it saves. When the browser has
 * no speech recognition, the mic is hidden unless the server transcription flag is on, in
 * which case audio is recorded, sent once, transcribed in memory and discarded.
 */
export function VoiceInput({ value, onText, disabled }: VoiceInputProps) {
  const { t } = useTranslation();
  const [lang, setLang] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const base = useRef('');
  const flags = useQuery({
    queryKey: ['flags'],
    queryFn: () => api<{ flags: Record<string, boolean> }>('/flags'),
    staleTime: 60_000,
    retry: 0,
  });

  const Native = typeof window !== 'undefined' ? getRecognition() : null;
  const serverFallback = !Native && flags.data?.flags.voice_transcription_server === true && typeof MediaRecorder !== 'undefined';

  useEffect(() => () => {
    rec.current?.stop();
    recorder.current?.stop();
  }, []);

  if (!Native && !serverFallback) return null;

  const append = (text: string) => {
    const joined = [base.current.trim(), text.trim()].filter(Boolean).join(' ');
    onText(joined);
  };

  const startNative = () => {
    if (!Native) return;
    const r = new Native();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    base.current = value;
    r.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i]?.[0].transcript ?? '';
      append(text);
    };
    r.onerror = (e) => {
      setMessage(e.error === 'not-allowed' ? t('p.voice.denied', 'Microphone access was blocked.') : null);
      setActive(false);
    };
    r.onend = () => setActive(false);
    rec.current = r;
    r.start();
    setActive(true);
  };

  const startServer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (ev) => chunks.push(ev.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setActive(false);
        setBusy(true);
        try {
          const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
          const csrf = readCsrf();
          const res = await fetch(`/api/v1/transcribe?lang=${lang === 'hi-IN' ? 'hi' : 'en'}`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': blob.type, ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
            body: blob,
          });
          if (!res.ok) throw new ApiRequestError(res.status, 'TRANSCRIBE', 'failed');
          const json = (await res.json()) as { text: string };
          base.current = value;
          append(json.text);
        } catch {
          setMessage(t('common.somethingWrong'));
        } finally {
          setBusy(false);
        }
      };
      recorder.current = mr;
      mr.start();
      setActive(true);
    } catch {
      setMessage(t('p.voice.denied', 'Microphone access was blocked.'));
    }
  };

  const toggle = () => {
    setMessage(null);
    if (active) {
      rec.current?.stop();
      recorder.current?.stop();
      return;
    }
    if (Native) startNative();
    else void startServer();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={active ? 'destructive' : 'outline'}
        size="sm"
        loading={busy}
        disabled={disabled}
        aria-pressed={active}
        onClick={toggle}
      >
        {active ? <Square className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
        {active ? t('p.voice.stop') : t('p.voice.start')}
      </Button>
      <label className="sr-only" htmlFor="voice-lang">
        {t('p.voice.lang')}
      </label>
      <select
        id="voice-lang"
        value={lang}
        disabled={active}
        onChange={(e) => setLang(e.target.value as 'en-IN' | 'hi-IN')}
        className="min-h-[36px] rounded-pill border border-border bg-surface px-3 text-sm"
      >
        <option value="en-IN">{t('p.voice.en')}</option>
        <option value="hi-IN">{t('p.voice.hi')}</option>
      </select>
      {active && (
        <span className="text-sm text-muted" role="status">
          {t('p.voice.listening')}
        </span>
      )}
      {message && (
        <span className="text-sm text-danger" role="alert">
          {message}
        </span>
      )}
    </div>
  );
}
