import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULTS, type ProfileStep } from '@marchmaker/shared';
import { api, ApiRequestError } from './api';
import type { ProfileDoc } from './profile';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'offline';
type Values = Record<string, unknown>;

interface Options {
  step: ProfileStep;
  initialVersion: number;
  onSaved?: (doc: ProfileDoc) => void;
  debounceMs?: number;
  /** Latest known profile version (from the shared query cache); wins over the local counter. */
  getVersion?: () => number | undefined;
}

/** Saves from every step share one queue, so a flush on leaving a step cannot race the next step. */
let globalQueue: Promise<void> = Promise.resolve();

/** The API treats null as "clear this field"; empty strings from inputs become null. */
const clean = (v: Values): Values => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x === '' ? null : x]));

/**
 * Debounced autosave with optimistic concurrency. Saves are serialised (one in flight),
 * flushed on blur, on unmount / step change and when the tab is hidden. A 409 pauses saving
 * and surfaces both copies so the member decides what to keep.
 */
export function useAutosave({ step, initialVersion, onSaved, getVersion, debounceMs = DEFAULTS.autosaveDebounceMs }: Options) {
  const [state, setState] = useState<SaveState>('idle');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const version = useRef(initialVersion);
  const pending = useRef<Values>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const paused = useRef(false);
  const forceVersion = useRef<number | undefined>(undefined);
  const conflictRetries = useRef(0);
  const stepRef = useRef(step);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const getVersionRef = useRef(getVersion);
  getVersionRef.current = getVersion;
  stepRef.current = step;

  const send = useCallback(async (): Promise<void> => {
    if (paused.current || Object.keys(pending.current).length === 0) return;
    const patch = pending.current;
    pending.current = {};
    setState('saving');
    try {
      const doc = await api<ProfileDoc>(`/profile/steps/${stepRef.current}`, {
        method: 'PATCH',
        body: clean(patch),
        ifMatch: forceVersion.current ?? Math.max(version.current, getVersionRef.current?.() ?? 0),
      });
      version.current = doc.version;
      forceVersion.current = undefined;
      conflictRetries.current = 0;
      setFieldErrors({});
      onSavedRef.current?.(doc);
      setState(Object.keys(pending.current).length ? 'saving' : 'saved');
    } catch (e) {
      pending.current = { ...patch, ...pending.current };
      if (e instanceof ApiRequestError && e.code === 'VERSION_CONFLICT') {
        // The saved copy moved on (another tab, a save that reached the server but whose answer was lost, or a reviewer).
        // The edits sent here are only the fields this person just changed, so the safe, quiet answer is to take the
        // server's current version and send them again: their latest edit wins, field by field, and nothing else is touched.
        const d = (e.details ?? {}) as { serverVersion?: number };
        if (typeof d.serverVersion === 'number' && conflictRetries.current < 3) {
          conflictRetries.current += 1;
          forceVersion.current = d.serverVersion;
          version.current = d.serverVersion;
          return send();
        }
        forceVersion.current = undefined;
        conflictRetries.current = 0;
        setState('error');
      } else if (e instanceof ApiRequestError && e.status === 0) {
        setState('offline');
      } else if (e instanceof ApiRequestError && e.status >= 400 && e.status < 500) {
        // A validation or lock error will not fix itself by retrying: drop the bad patch.
        pending.current = {};
        if (e.code === 'VALIDATION_ERROR' && Array.isArray(e.details)) {
          const next: Record<string, string> = {};
          for (const d of e.details as { path: string; message: string }[]) if (d.path) next[d.path] = d.message;
          setFieldErrors(next);
        }
        setState('error');
      } else {
        setState('error');
      }
    }
  }, []);

  /** Runs saves one after another so version numbers always stay in order. */
  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    const next = globalQueue.then(send, send);
    globalQueue = next.catch(() => undefined);
    await next;
  }, [send]);

  const queue = useCallback(
    (patch: Values) => {
      pending.current = { ...pending.current, ...patch };
      if (paused.current) return;
      setState('saving');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), debounceMs);
    },
    [debounceMs, flush],
  );

  // Flush when leaving the step or hiding the tab, and retry when the network returns.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onOnline = () => void flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('online', onOnline);
    window.addEventListener('beforeunload', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('beforeunload', onOnline);
      void flush();
    };
  }, [flush]);

  /** Called when the page reloads fresh server data (for example when the page refetches the profile). */
  const syncVersion = useCallback((v: number) => {
    version.current = v;
  }, []);

  return { state, queue, flush, syncVersion, fieldErrors };
}
