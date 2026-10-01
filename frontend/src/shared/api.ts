// Standard way to call the ConnectSphere API from a screen (ADR-017 skeleton).
//
// - Sends the session cookie (credentials: 'same-origin').
// - Returns { ok: true, data } or { ok: false, status, message } instead of
//   throwing, so screens handle every outcome explicitly.
// - Uses the server's `error` message when it is a sentence: the API writes
//   those to be safe to show. A machine code such as `booking_conflict` goes
//   in `code` instead, and the message falls back to yours.
// - Keeps the rest of the error body: `fieldErrors` holds per-field messages
//   (`{ errors: { from: ['…'] } }`) for FormField, and `details` holds the
//   whole parsed body (e.g. `conflictingBookings`) for screens that need it.
// - A network failure becomes status 0 with a "check your connection" message.
// - An aborted request (route changed) is re-thrown so useLoad can ignore it.
//
// Example:
//   const result = await apiCall<{ venues: Venue[] }>('/api/venues', { signal }, 'Unable to load venues.');
//   if (!result.ok) show(result.message); else use(result.data.venues);
//   if (!result.ok && result.code === 'booking_conflict') listClashes(result.details?.conflictingBookings);

export type ApiFailure = {
  ok: false;
  status: number;
  message: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
  details?: Record<string, unknown>;
};
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
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) return failure(response.status, body, fallback);
  return { ok: true, data: body as T };
}

const MACHINE_CODE = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/;

function failure(status: number, body: unknown, fallback: string): ApiFailure {
  const details = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const error = typeof details.error === 'string' ? details.error.trim() : '';
  const isCode = MACHINE_CODE.test(error);
  const result: ApiFailure = { ok: false, status, message: error && !isCode ? error : fallback };
  if (isCode) result.code = error;
  const fieldErrors = readFieldErrors(details.errors);
  if (fieldErrors) result.fieldErrors = fieldErrors;
  if (Object.keys(details).some(key => key !== 'error')) result.details = details;
  return result;
}

// Accepts `{ field: 'message' }` or `{ field: ['message', …] }`.
function readFieldErrors(value: unknown): Record<string, string[]> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const fields: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(value)) {
    const list = (Array.isArray(messages) ? messages : [messages]).filter((m): m is string => typeof m === 'string');
    if (list.length) fields[field] = list;
  }
  return Object.keys(fields).length ? fields : undefined;
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
