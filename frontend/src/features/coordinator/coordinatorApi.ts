// Client for the E03-S01 (SCRUM-32) Coordinator endpoints in api/events.ts.
// Every request sends the session cookie (credentials: 'same-origin').
// Errors come back as { error } with a message that is safe to show, so the
// screens display it as-is and use the status only to choose the layout
// (401 sign-in prompt, 403 refusal, anything else a retryable error).

export type EventStatus =
  | 'draft' | 'submitted' | 'under_review' | 'awaiting_clarification' | 'rejected'
  | 'approved' | 'planning' | 'confirmed' | 'cancelled' | 'completed';

// BDR T-52: only these statuses can be reassigned (ACTIVE_EVENT_STATUSES).
export const ACTIVE_STATUSES: readonly EventStatus[] = [
  'submitted', 'under_review', 'awaiting_clarification', 'approved', 'planning', 'confirmed',
];

export type AssignedEventSummary = {
  id: string;
  event_code: string | null;
  title: string;
  status: EventStatus;
  status_changed_at: string;
  starts_at: string;
  ends_at: string;
  expected_attendance: number;
  coordinator_assigned_at: string | null;
  organiser_name: string;
  reassignment_pending: boolean;
};

export type Reassignment = {
  id: string;
  eventId: string;
  eventCode: string | null;
  eventTitle: string;
  status: 'pending' | 'accepted' | 'declined';
  requestedAt: string;
  decidedAt: string | null;
  fromCoordinator: { id: string; name: string };
  toCoordinator: { id: string; name: string };
};

export type AssignedEventDetail = Omit<AssignedEventSummary, 'reassignment_pending'> & {
  description: string | null;
  purpose: string | null;
  venue_requirements: string | null;
  accessibility_note: string | null;
  equipment_requirements: string | null;
  layout_preference: string | null;
  registration_setup: string | null;
  coordinator_id: string;
  coordinator_name: string;
  organiser_email: string;
  pendingReassignment: Reassignment | null;
};

export type Colleague = { id: string; full_name: string; email: string; active_events: number };

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

async function call<T>(url: string, init: RequestInit | undefined, fallback: string): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, { credentials: 'same-origin', ...init });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    return { ok: false, status: 0, message: `${fallback} Check your connection and try again.` };
  }
  const body = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) return { ok: false, status: response.status, message: body.error ?? fallback };
  return { ok: true, data: body };
}

export async function listAssignedEvents(signal?: AbortSignal) {
  const result = await call<{ events: AssignedEventSummary[] }>('/api/events?assigned=1', { signal }, 'Unable to load your assigned events.');
  return result.ok ? { ok: true as const, data: result.data.events } : result;
}

export async function getAssignedEvent(identifier: string, signal?: AbortSignal) {
  const result = await call<{ event: AssignedEventDetail }>(
    `/api/events?assigned=1&id=${encodeURIComponent(identifier)}`, { signal }, 'Unable to load this event.');
  return result.ok ? { ok: true as const, data: result.data.event } : result;
}

export async function listColleagues(signal?: AbortSignal) {
  const result = await call<{ coordinators: Colleague[] }>('/api/events?coordinators=1', { signal }, 'Unable to load your colleagues.');
  return result.ok ? { ok: true as const, data: result.data.coordinators } : result;
}

export function listReassignments(signal?: AbortSignal) {
  return call<{ incoming: Reassignment[]; outgoing: Reassignment[] }>(
    '/api/events?reassignments=1', { signal }, 'Unable to load reassignment requests.');
}

export async function requestReassignment(eventId: string, toCoordinatorId: string) {
  const result = await call<{ reassignment: Reassignment }>(
    `/api/events?reassign=1&id=${encodeURIComponent(eventId)}`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ toCoordinatorId }) },
    'Unable to send the reassignment request.');
  return result.ok ? { ok: true as const, data: result.data.reassignment } : result;
}

export async function respondToReassignment(reassignmentId: string, decision: 'accept' | 'decline') {
  const result = await call<{ reassignment: Reassignment }>(
    `/api/events?reassignment=${encodeURIComponent(reassignmentId)}&decision=${decision}`,
    { method: 'POST' },
    'Unable to record your response.');
  return result.ok ? { ok: true as const, data: result.data.reassignment } : result;
}

// Plain-language labels shared by every Coordinator screen.
export function statusLabel(status: string) {
  const text = status.replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString('en-SG', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

export function eventRef(event: { event_code: string | null; id: string }) {
  return event.event_code ?? event.id;
}
