import type { ApiError } from '@marchmaker/shared';

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

const BASE = '/api/v1';

function readCsrf(): string | undefined {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith('mm_csrf='))
    ?.split('=')[1];
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  idempotencyKey?: string;
  ifMatch?: number;
  signal?: AbortSignal;
}

/**
 * A random id kept in this browser, sent only when creating an account. The server stores a keyed hash of it
 * to notice one person inviting themselves from several accounts; it is not used for tracking or advertising.
 */
export function deviceId(): string | undefined {
  try {
    let id = localStorage.getItem('mm_device');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('mm_device', id);
    }
    return id;
  } catch {
    return undefined;
  }
}

/** Thin typed fetch: cookies for auth, CSRF double-submit header, friendly errors. */
export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, idempotencyKey, ifMatch, signal } = opts;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') {
    const csrf = readCsrf();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  if (path === '/auth/register') {
    const d = deviceId();
    if (d) headers['X-Device-Id'] = d;
  }
  if (ifMatch !== undefined) headers['If-Match'] = String(ifMatch);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch {
    throw new ApiRequestError(0, 'NETWORK', 'You appear to be offline. Please check your connection and try again.');
  }

  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => undefined);
  if (!res.ok) {
    const err = (data as ApiError | undefined)?.error;
    throw new ApiRequestError(
      res.status,
      err?.code ?? 'UNKNOWN',
      err?.message ?? 'Something went wrong. Please try again.',
      err?.requestId,
      err?.details,
    );
  }
  return data as T;
}
