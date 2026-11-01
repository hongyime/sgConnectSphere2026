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
  starts_at: string;
  ends_at: string;
  expected_attendance: number;
  coordinator_name: string | null;
  organiser_name: string;
};

export const SAFETY_FACTORS = [
  'attendance_capacity', 'venue_layout', 'emergency_access', 'accessibility',
  'equipment_placement', 'crowd_movement', 'venue_restrictions',
] as const;
export type SafetyFactor = typeof SAFETY_FACTORS[number];
export type SafetyReview = {
  event: SafetyQueueEvent & { status_changed_at: string; accessibility_note: string | null; coordinator_id: string | null };
  venues: Array<{ id: string; name: string; capacity: number | null; layout: string | null; restrictions: string[] }>;
  equipment: Array<{ id: string; name: string; requested: number; reserved: number; placement: string | null }>;
  support: Array<{ id: string; description: string; status: string }>;
  factors: readonly SafetyFactor[];
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

export function listLeadQueue(signal?: AbortSignal) {
  return apiCall<{ events: LeadQueueEvent[] }>('/api/events?unassigned=1', { signal }, 'Unable to load the unassigned queue.');
}

export function listSafetyQueue(signal?: AbortSignal) {
  return apiCall<{ events: SafetyQueueEvent[] }>('/api/events?safetyQueue=1', { signal }, 'Unable to load the safety review queue.');
}

export function getSafetyReview(eventId: string, signal?: AbortSignal) {
  return apiCall<{ review: SafetyReview }>(`/api/events?safetyReview=1&id=${encodeURIComponent(eventId)}`, { signal }, 'Unable to load this safety review.');
}

export function submitSafetyDecision(eventId: string, body: unknown) {
  return apiCall<{ decision: { status: 'confirmed' | 'planning'; decision: string } }>(
    `/api/events?safetyDecision=1&id=${encodeURIComponent(eventId)}`,
    jsonRequest('POST', body), 'Unable to save the safety decision.',
  );
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

export function listLeadOversight(signal?: AbortSignal, status?: string, coordinator?: string) {
  const params = new URLSearchParams({ oversight: '1' });
  if (status) params.set('status', status);
  if (coordinator) params.set('coordinator', coordinator);
  return apiCall<{ events: OversightEvent[]; workloads: AssignableCoordinator[] }>(
    `/api/events?${params}`, { signal }, 'Unable to load the Lead oversight view.');
}
