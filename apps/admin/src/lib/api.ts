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
    .find((c) => c.startsWith('mm_staff_csrf='))
    ?.split('=')[1];
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  idempotencyKey?: string;
  ifMatch?: number;
  signal?: AbortSignal;
}

/** Thin typed fetch: cookies for auth, CSRF double-submit header, friendly errors. */
export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, idempotencyKey, ifMatch, signal } = opts;
  // The console has its own cookies, so signing in here never replaces a member's session on the same host.
  const headers: Record<string, string> = { Accept: 'application/json', 'X-App': 'admin' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') {
    const csrf = readCsrf();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
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
