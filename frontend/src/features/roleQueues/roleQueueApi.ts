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
