// E07-S07 (SCRUM-57) technician assignments, against the endpoint in
// backend/src/modules/equipmentSupport/staffingHandler.ts (routed through
// api/venues/index.ts as ?task=staffing).
import { apiCall, jsonRequest, type ApiResult } from '../../shared';

export type Assignee = { assignmentId: string; staffId: string; name: string };
export type StaffingRequest = {
  id: string; eventId: string; eventCode: string | null; eventTitle: string; eventStatus: string;
  description: string; startsAt: string; endsAt: string; status: 'open' | 'staffed'; assignees: Assignee[];
};
export type Conflict = { eventCode: string | null; title: string; startsAt: string; endsAt: string };
export type Candidate = { staffId: string; name: string; assigned: boolean; conflicts: Conflict[] };
export type RequestDetail = { request: StaffingRequest; candidates: Candidate[]; canAssign: boolean };
export type ScheduleItem = {
  id: string; requestId: string; eventCode: string | null; eventTitle: string; eventStatus: string;
  description: string; startsAt: string; endsAt: string;
};

const URL = '/api/venues?task=staffing';

// A reply without the expected list is a failed load, never a crashed page.
async function load<T>(url: string, signal: AbortSignal | undefined, fallback: string, valid: (data: T) => boolean): Promise<ApiResult<T>> {
  const result = await apiCall<T>(url, { signal }, fallback);
  if (result.ok && !valid(result.data)) return { ok: false, status: 502, message: fallback };
  return result;
}

export function listStaffingQueue(signal?: AbortSignal) {
  return load<{ requests: StaffingRequest[] }>(URL, signal, 'Support requests could not be loaded.', data => Array.isArray(data?.requests));
}

export function getStaffingRequest(id: string, signal?: AbortSignal) {
  return load<RequestDetail>(`${URL}&request=${encodeURIComponent(id)}`, signal, 'This support request could not be loaded.',
    data => Array.isArray(data?.candidates) && Array.isArray(data?.request?.assignees));
}

export function getMySchedule(signal?: AbortSignal) {
  return load<{ assignments: ScheduleItem[] }>(`${URL}&schedule=mine`, signal, 'Your schedule could not be loaded.', data => Array.isArray(data?.assignments));
}

export function assignTechnician(request: string, staff: string) {
  return apiCall<{ assignment: { id: string; staffId: string; name: string } }>(URL,
    jsonRequest('POST', { action: 'assign', request, staff }), 'The technician could not be assigned.');
}

export function removeAssignment(assignment: string) {
  return apiCall<{ removed: true; requestStatus: 'open' | 'staffed' }>(URL,
    jsonRequest('POST', { action: 'remove', assignment }), 'The assignment could not be removed.');
}
