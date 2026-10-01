// Standard way to call the ConnectSphere API from a screen (ADR-017 skeleton).
//
// - Sends the session cookie (credentials: 'same-origin').
// - Returns { ok: true, data } or { ok: false, status, message } instead of
//   throwing, so screens handle every outcome explicitly.
// - Uses the server's `error` message when it sends one: the API writes those
//   to be safe to show. Otherwise uses your fallback message.
// - A network failure becomes status 0 with a "check your connection" message.
// - An aborted request (route changed) is re-thrown so useLoad can ignore it.
//
// Example:
//   const result = await apiCall<{ venues: Venue[] }>('/api/venues', { signal }, 'Unable to load venues.');
//   if (!result.ok) show(result.message); else use(result.data.venues);

export type ApiFailure = { ok: false; status: number; message: string };
export type ApiResult<T> = { ok: true; data: T } | ApiFailure;

export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export async function apiCall<T>(url: string, init: RequestInit | undefined, fallback: string): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, { credentials: 'same-origin', ...init });
  } catch (error) {
    if (isAbort(error)) throw error;
    return { ok: false, status: 0, message: `${fallback} Check your connection and try again.` };
  }
  const body = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) return { ok: false, status: response.status, message: body.error ?? fallback };
  return { ok: true, data: body };
}

// JSON request helper for POST, PATCH, PUT and DELETE.
export function jsonRequest(method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', body?: unknown, signal?: AbortSignal): RequestInit {
  return {
    method,
    signal,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}
