import { apiCall } from '../../shared';

export type LeadQueueEvent = {
  id: string;
  event_code: string | null;
  title: string;
  status: 'submitted';
  created_at: string;
  starts_at: string;
  ends_at: string;
  expected_attendance: number;
  organisation_name: string;
};

export type SafetyQueueEvent = {
  id: string;
  event_code: string | null;
  title: string;
  status: 'safety_review';
  starts_at: string;
  ends_at: string;
  expected_attendance: number;
  coordinator_name: string | null;
  organiser_name: string;
};

export type AssignableCoordinator = { id: string; full_name: string; active_events: number };

export type LeadReassignmentRequest = {
  id: string;
  eventId: string;
  eventCode: string | null;
  eventTitle: string;
  requestedAt: string;
  coordinator: { id: string; name: string };
  reason: string;
};

export function listLeadQueue(signal?: AbortSignal) {
  return apiCall<{ events: LeadQueueEvent[] }>('/api/events?unassigned=1', { signal }, 'Unable to load the unassigned queue.');
}

export function listSafetyQueue(signal?: AbortSignal) {
  return apiCall<{ events: SafetyQueueEvent[] }>('/api/events?safetyQueue=1', { signal }, 'Unable to load the safety review queue.');
}

export function listAssignableCoordinators(signal?: AbortSignal) {
  return apiCall<{ coordinators: AssignableCoordinator[] }>('/api/events?coordinators=1&workload=1', { signal }, 'Unable to load Event Coordinators.');
}

export function assignQueuedEvent(eventId: string, coordinatorId: string) {
  return apiCall<{ assignment: { eventId: string; coordinatorId: string } }>(
    `/api/events?assign=1&id=${encodeURIComponent(eventId)}`,
    { method: 'POST', body: JSON.stringify({ coordinator_id: coordinatorId }) },
    'Unable to assign this event.',
  );
}

export function reassignAsLead(eventId: string, coordinatorId: string) {
  return apiCall<{ reassignment: { eventId: string; coordinatorId: string } }>(
    `/api/events?reassign=1&by_lead=1&id=${encodeURIComponent(eventId)}`,
    { method: 'POST', body: JSON.stringify({ coordinator_id: coordinatorId }) },
    'Unable to reassign this event.',
  );
}

export function listLeadReassignmentRequests(signal?: AbortSignal) {
  return apiCall<{ requests: LeadReassignmentRequest[] }>(
    '/api/events?leadReassignments=1', { signal }, 'Unable to load reassignment requests.');
}

export function declineLeadReassignment(requestId: string) {
  return apiCall<{ request: LeadReassignmentRequest }>(
    `/api/events?leadReassignment=1&requestId=${encodeURIComponent(requestId)}&decision=decline`,
    { method: 'POST', body: JSON.stringify({}) }, 'Unable to decline this request.');
}
