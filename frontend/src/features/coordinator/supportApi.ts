// E07-S06 (SCRUM-56) technical support requests, against the endpoint in
// backend/src/modules/equipmentSupport/supportHandler.ts (routed through
// api/venues/index.ts as ?task=support).
import { apiCall, jsonRequest, type ApiResult } from '../../shared';

export type SupportRequest = {
  id: string; description: string; startsAt: string; endsAt: string;
  status: 'open' | 'staffed'; requestedAt: string;
};
export type SupportOverview = {
  event: { id: string; eventCode: string | null; title: string; status: string };
  requests: SupportRequest[];
  noSupportRequired: boolean;
  canEdit: boolean;
};
export type SupportInput = { description: string; startsAt: string; endsAt: string };

// The server's rules and sentences (supportRequests.ts), repeated so the form
// can say what's wrong before sending.
export const MAX_SUPPORT_DESCRIPTION = 2000;
export const SUPPORT_MESSAGES = {
  description: 'Describe the technical support the event needs.',
  descriptionTooLong: `The description must be ${MAX_SUPPORT_DESCRIPTION} characters or fewer.`,
  startsAt: 'Enter when the support starts.',
  endsAt: 'Enter when the support ends.',
  endBeforeStart: 'Support must end after it starts.',
  notEditable: 'Technical support can only be arranged while an approved event is being planned.',
};

const url = (event?: string) => `/api/venues?task=support${event ? `&event=${encodeURIComponent(event)}` : ''}`;

const LOAD_FAILED = 'Technical support could not be loaded.';

// A reply without a requests list is treated as a failed load, so one card
// never takes the whole event page down with it.
export async function getSupport(event: string, signal?: AbortSignal): Promise<ApiResult<SupportOverview>> {
  const result = await apiCall<SupportOverview>(url(event), { signal }, LOAD_FAILED);
  if (result.ok && !Array.isArray(result.data?.requests)) return { ok: false, status: 502, message: LOAD_FAILED };
  return result;
}

export function requestSupport(event: string, input: SupportInput) {
  return apiCall<{ request: SupportRequest; notified: number }>(url(),
    jsonRequest('POST', { action: 'request', event, ...input }), 'The support request could not be sent.');
}

export function declareNoSupport(event: string) {
  return apiCall<{ noSupportRequired: true }>(url(),
    jsonRequest('POST', { action: 'none', event }), 'The event could not be marked as needing no support.');
}
