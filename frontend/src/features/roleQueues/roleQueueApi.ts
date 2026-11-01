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

export function listLeadQueue(signal?: AbortSignal) {
  return apiCall<{ events: LeadQueueEvent[] }>('/api/events?unassigned=1', { signal }, 'Unable to load the unassigned queue.');
}

export function listSafetyQueue(signal?: AbortSignal) {
  return apiCall<{ events: SafetyQueueEvent[] }>('/api/events?safetyQueue=1', { signal }, 'Unable to load the safety review queue.');
}
