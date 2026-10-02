// Client for the E03-S01 (SCRUM-32) Coordinator endpoints in api/events.ts.
// Requests go through the shared apiCall (session cookie, safe error
// messages); the screens use the status only to choose the layout
// (401 sign-in prompt, 403 refusal, anything else a retryable error).
import { apiCall, jsonRequest } from '../../shared';

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

export async function listAssignedEvents(signal?: AbortSignal) {
  const result = await apiCall<{ events: AssignedEventSummary[] }>('/api/events?assigned=1', { signal }, 'Unable to load your assigned events.');
  return result.ok ? { ok: true as const, data: result.data.events } : result;
}

export async function getAssignedEvent(identifier: string, signal?: AbortSignal) {
  const result = await apiCall<{ event: AssignedEventDetail }>(
    `/api/events?assigned=1&id=${encodeURIComponent(identifier)}`, { signal }, 'Unable to load this event.');
  return result.ok ? { ok: true as const, data: result.data.event } : result;
}

export async function listColleagues(signal?: AbortSignal) {
  const result = await apiCall<{ coordinators: Colleague[] }>('/api/events?coordinators=1', { signal }, 'Unable to load your colleagues.');
  return result.ok ? { ok: true as const, data: result.data.coordinators } : result;
}

export function listReassignments(signal?: AbortSignal) {
  return apiCall<{ incoming: Reassignment[]; outgoing: Reassignment[] }>(
    '/api/events?reassignments=1', { signal }, 'Unable to load reassignment requests.');
}

export async function requestReassignment(eventId: string, toCoordinatorId: string) {
  const result = await apiCall<{ reassignment: Reassignment }>(
    `/api/events?reassign=1&id=${encodeURIComponent(eventId)}`,
    jsonRequest('POST', { toCoordinatorId }),
    'Unable to send the reassignment request.');
  return result.ok ? { ok: true as const, data: result.data.reassignment } : result;
}

export async function respondToReassignment(reassignmentId: string, decision: 'accept' | 'decline') {
  const result = await apiCall<{ reassignment: Reassignment }>(
    `/api/events?reassignment=${encodeURIComponent(reassignmentId)}&decision=${decision}`,
    jsonRequest('POST'),
    'Unable to record your response.');
  return result.ok ? { ok: true as const, data: result.data.reassignment } : result;
}

export function eventRef(event: { event_code: string | null; id: string }) {
  return event.event_code ?? event.id;
}
