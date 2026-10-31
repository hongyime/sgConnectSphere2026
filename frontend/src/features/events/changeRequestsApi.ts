import { apiCall, jsonRequest } from '../../shared';

export const changeFields = [
  ['title', 'Event name', 'text'], ['description', 'Description', 'text'], ['purpose', 'Purpose', 'text'],
  ['expectedAttendance', 'Expected attendance', 'number'], ['venueRequirements', 'Venue requirements', 'text'],
  ['equipmentRequirements', 'Equipment requirements', 'text'], ['accessibilityNote', 'Accessibility needs', 'text'],
  ['layoutPreference', 'Layout preference', 'text'], ['registrationSetup', 'Registration setup', 'text'],
  ['startAt', 'Start date and time', 'date'], ['endAt', 'End date and time', 'date'],
  ['layoutId', 'Room layout', 'layout'], ['accessibilityFeatureIds', 'Accessibility features', 'accessibility'],
  ['registrationEnabled', 'Registration', 'switch'], ['waitlistEnabled', 'Waiting list', 'switch'],
  ['registrationDates', 'Registration window', 'window'], ['withdrawalDeadline', 'Withdrawal deadline', 'nullable-date'],
] as const;
export type ChangeField = typeof changeFields[number][0];
export type RegistrationDates = { opensAt: string | null; closesAt: string | null };
export type ChangeValues = Partial<Record<ChangeField, string | number | boolean | string[] | RegistrationDates | null>>;
export type ChangeRequestRecord = {
  id: string; description: string; status: 'pending' | 'approved' | 'applied' | 'declined' | 'obsolete';
  created_at: string; decision_reason: string | null;
  requested_changes: { fields?: ChangeValues; before?: ChangeValues };
};
export type ChangeRequestView = {
  event: { id: string; eventCode: string; status: string };
  permissions: { canSubmit: boolean; canDecide: boolean };
  references?: { layouts: { id: string; label: string }[]; accessibility: { id: string; label: string }[] };
  current: ChangeValues; requests: ChangeRequestRecord[];
};
const endpoint = (identifier: string) => `/api/events?changeRequests=1&id=${encodeURIComponent(identifier)}`;
export const getChangeRequests = (identifier: string, signal?: AbortSignal) =>
  apiCall<ChangeRequestView>(endpoint(identifier), { signal }, 'Unable to load change requests.');
export const submitChangeRequest = (identifier: string, description: string, changes: ChangeValues) =>
  apiCall<{ request: ChangeRequestRecord }>(endpoint(identifier), jsonRequest('POST', { description, changes }), 'Unable to send the change request.');
export type ChangePreview = { canApply: false; blockedFields: string[] } | {
  canApply: true; token: string; lateClose: boolean;
  impact: { affected: boolean; bookings: { id: string; venueName: string; reasons: string[] }[];
    reservations: { id: string; equipmentName: string; reasons: string[] }[] };
  overSubscription: { scope: string; registered: number; capacity: number }[];
};
export const previewChangeRequest = (identifier: string, requestId: string) =>
  apiCall<{ request: ChangeRequestRecord & { preview: ChangePreview } }>(`${endpoint(identifier)}&requestId=${encodeURIComponent(requestId)}`,
    jsonRequest('POST', { decision: 'preview' }), 'Unable to preview this request.');
export const decideChangeRequest = (identifier: string, requestId: string, decision: 'approve' | 'decline' | 'apply', reason: string,
  previewToken?: string, confirmLateClose = false) =>
  apiCall<{ request: ChangeRequestRecord }>(`${endpoint(identifier)}&requestId=${encodeURIComponent(requestId)}`,
    jsonRequest('POST', { decision, reason, ...(previewToken ? { previewToken, confirmLateClose } : {}) }), 'Unable to record the decision.');

export const waitingMessage = 'Approved — waiting for the arrangement check';
