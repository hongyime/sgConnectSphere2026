import { apiCall, jsonRequest } from '../../shared';

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
  status_changed_at: string;
  starts_at: string;
  ends_at: string;
  expected_attendance: number;
  coordinator_name: string | null;
  organiser_name: string;
};

export type AssignableCoordinator = { id: string; full_name: string; active_events: number };
export type OversightEvent = {
  id: string;
  event_code: string | null;
  title: string;
  status: string;
  starts_at: string;
  ends_at: string;
  expected_attendance: number;
  coordinator_id: string | null;
  coordinator_name: string | null;
  organiser_name: string;
};

export const SAFETY_FACTORS = [
  'attendance_capacity', 'venue_layout', 'emergency_access', 'accessibility',
  'equipment_placement', 'crowd_movement', 'venue_restrictions',
] as const;
export type SafetyFactor = typeof SAFETY_FACTORS[number];
// E08-S06 Scenario 2's words, as the server's notices use them.
export const SAFETY_FACTOR_LABELS: Record<SafetyFactor, string> = {
  attendance_capacity: 'Expected attendance against capacity',
  venue_layout: 'Venue capacity and layout',
  emergency_access: 'Emergency access',
  accessibility: 'Accessibility requirements',
  equipment_placement: 'Equipment placement',
  crowd_movement: 'Crowd movement',
  venue_restrictions: 'Known venue restrictions',
};
export type SafetyDecision = 'approve' | 'request_changes' | 'reject';

// D117: arrangements carry their Session; the page groups them by session_id.
export type SafetyReview = {
  event: SafetyQueueEvent & { coordinator_id: string | null };
  sessions: Array<{
    id: string; title: string | null; starts_at: string; ends_at: string; expected_attendance: number;
    layout: string | null; accessibility_note: string | null; accessibility: string[];
  }>;
  venues: Array<{ id: string; session_id: string | null; name: string; capacity: number; restrictions: string[] }>;
  equipment: Array<{ id: string; session_id: string | null; name: string; requested: number; reserved: number; placement: string | null }>;
  support: Array<{ id: string; description: string; status: string }>;
};

// D109: set on the Coordinator's readiness and the Organiser's event reads
// while a safety decision has sent the Event back to Planning.
export type SafetyReturn = { decision: 'request_changes' | 'reject'; reason: string | null; decidedAt: string } | null;

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

export function listAssignableCoordinators(signal?: AbortSignal) {
  return apiCall<{ coordinators: AssignableCoordinator[] }>('/api/events?coordinators=1&workload=1', { signal }, 'Unable to load Event Coordinators.');
}

export function assignQueuedEvent(eventId: string, coordinatorId: string) {
  return apiCall<{ assignment: { eventId: string; coordinatorId: string } }>(
    `/api/events?assign=1&id=${encodeURIComponent(eventId)}`,
    jsonRequest('POST', { coordinator_id: coordinatorId }),
    'Unable to assign this event.',
  );
}

export function listSafetyQueue(signal?: AbortSignal) {
  return apiCall<{ events: SafetyQueueEvent[] }>('/api/events?safetyQueue=1', { signal }, 'Unable to load the safety review queue.');
}

export function getSafetyReview(eventId: string, signal?: AbortSignal) {
  return apiCall<{ review: SafetyReview }>(`/api/events?safetyReview=1&id=${encodeURIComponent(eventId)}`, { signal }, 'Unable to load this safety review.');
}

export function submitSafetyDecision(eventId: string, body: {
  decision: SafetyDecision; factors: Record<SafetyFactor, { satisfactory: boolean; comment: string }>; reason?: string;
}) {
  return apiCall<{ decision: { status: 'confirmed' | 'planning'; decision: SafetyDecision } }>(
    `/api/events?safetyDecision=1&id=${encodeURIComponent(eventId)}`,
    jsonRequest('POST', body), 'Unable to save the safety decision.',
  );
}

export function reassignAsLead(eventId: string, coordinatorId: string) {
  return apiCall<{ reassignment: { eventId: string; coordinatorId: string } }>(
    `/api/events?reassign=1&by_lead=1&id=${encodeURIComponent(eventId)}`,
    jsonRequest('POST', { coordinator_id: coordinatorId }),
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
    jsonRequest('POST', {}), 'Unable to decline this request.');
}

export function listLeadOversight(signal?: AbortSignal, status?: string, coordinator?: string) {
  const params = new URLSearchParams({ oversight: '1' });
  if (status) params.set('status', status);
  if (coordinator) params.set('coordinator', coordinator);
  return apiCall<{ events: OversightEvent[]; workloads: AssignableCoordinator[] }>(
    `/api/events?${params}`, { signal }, 'Unable to load the Lead oversight view.');
}
