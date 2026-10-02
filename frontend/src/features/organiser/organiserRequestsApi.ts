// Typed fetch helpers for the organiser's own requests (SCRUM-105 screens,
// wired to the live API as a Sprint 1 loose end). Two existing endpoints are
// combined because neither returns everything these screens show:
//   GET /api/events?mine=1[&id=<uuid>]  - only the caller's own requests,
//     drafts included, with the full request fields (camelCase), but no event
//     code or status date, and lookup by uuid only.
//   GET /api/events?id=<uuid or code>   - the organisation-wide read (SCRUM-18),
//     which adds the event code, status history and comments (snake_case),
//     and the E03-S03 (SCRUM-34) decision with its reason and date.
// Requests go through the shared apiCall (session cookie, ADR-015).
import { apiCall, type ApiFailure, type ApiResult } from '../../shared';
import { readQuestions, type OutstandingQuestion } from '../events/clarificationApi';

export type EventStatus =
  | 'draft' | 'submitted' | 'under_review' | 'awaiting_clarification' | 'rejected'
  | 'approved' | 'planning' | 'confirmed' | 'cancelled' | 'completed';

export type OwnRequest = {
  id: string;
  title: string;
  description?: string | null;
  purpose?: string | null;
  status: EventStatus;
  startAt?: string;
  endAt?: string;
  expectedAttendance?: number | null;
  venueRequirements?: string | null;
  accessibilityNote?: string | null;
  equipmentRequirements?: string | null;
  layoutPreference?: string | null;
};

export type StatusHistoryEntry = { occurred_at: string; old_value: string | null; new_value: string | null };
export type RequestComment = { id: string; body: string; created_at: string; author_name: string };

// E03-S03 (SCRUM-34): the Coordinator's decision. `reason` is set only for a
// rejection, and seeded rejections can have none (D30).
export type RequestDecision = { outcome: 'approved' | 'rejected'; reason: string | null; decidedAt: string };

export type RequestDetail = OwnRequest & {
  eventCode: string | null;
  statusChangedAt: string | null;
  statusHistory: StatusHistoryEntry[];
  comments: RequestComment[];
  // E03-S02: unanswered clarification questions (empty unless awaiting clarification).
  outstandingQuestions: OutstandingQuestion[];
  decision: RequestDecision | null;
};

// E03-S02 (SCRUM-33) answer screen. `owner` is false for a colleague in the
// same organisation: they can read the request, but only the Organiser who
// submitted it may answer (TC_E03S02_10, decision D21).
export type ClarificationRequest = {
  id: string;
  eventCode: string | null;
  title: string;
  status: EventStatus;
  owner: boolean;
  outstandingQuestions: OutstandingQuestion[];
};

const LIST_FAILED = 'Your requests could not be loaded. Please try again.';
const DETAIL_FAILED = 'This request could not be loaded. Please try again.';
// The detail screen shows "Request not found" for a 404.
const NOT_FOUND: ApiFailure = {
  ok: false, status: 404,
  message: 'No request of yours matches this link. If you are signed in with a different role, sign in as an Event Organiser.',
};

const EVENT_STATUSES: readonly string[] = [
  'draft', 'submitted', 'under_review', 'awaiting_clarification', 'rejected',
  'approved', 'planning', 'confirmed', 'cancelled', 'completed',
];

// The fields every screen relies on; anything else is optional display data.
function isOwnRequest(value: unknown): value is OwnRequest {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string'
    && typeof candidate.title === 'string'
    && typeof candidate.status === 'string'
    && EVENT_STATUSES.includes(candidate.status);
}

// Keeps the decision only if it is well formed, so a partial read never breaks the screen.
function readDecision(value: unknown): RequestDecision | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.outcome !== 'approved' && candidate.outcome !== 'rejected') return null;
  if (typeof candidate.decidedAt !== 'string') return null;
  const reason = typeof candidate.reason === 'string' && candidate.reason.trim() ? candidate.reason : null;
  return { outcome: candidate.outcome, reason, decidedAt: candidate.decidedAt };
}

export async function listOwnRequests(signal?: AbortSignal): Promise<ApiResult<OwnRequest[]>> {
  const result = await apiCall<{ events?: unknown }>('/api/events?mine=1', { signal }, LIST_FAILED);
  if (!result.ok) return result;
  return { ok: true, data: Array.isArray(result.data.events) ? result.data.events as OwnRequest[] : [] };
}

// `identifier` is whatever is in the URL: a uuid from the request list, or an
// event code from an older link. The organisation read resolves either to a
// uuid, then the own-requests read supplies the request fields and confirms
// the request is the caller's (a colleague's event returns 404 there).
export async function getRequestDetail(identifier: string, signal?: AbortSignal): Promise<ApiResult<RequestDetail>> {
  const summary = await apiCall<{ event?: Record<string, any> }>(
    `/api/events?id=${encodeURIComponent(identifier)}`, { signal }, DETAIL_FAILED);
  // Intentional: the organisation read answers unknown ids with the same 403 as
  // a refusal, so as not to reveal whether an event exists. A 403 here can also
  // mean the caller is not an Organiser; the not-found message says to sign in
  // as one, and an expired session is a 401, which stays a 401.
  if (!summary.ok) return summary.status === 403 || summary.status === 404 ? NOT_FOUND : summary;
  // A success with no event cannot improve on retry; treat it as not found.
  const event = summary.data.event;
  if (!event?.id) return NOT_FOUND;

  const own = await apiCall<{ event?: unknown }>(
    `/api/events?mine=1&id=${encodeURIComponent(event.id)}`, { signal }, DETAIL_FAILED);
  if (!own.ok) return own.status === 404 ? NOT_FOUND : own;
  if (!own.data.event) return NOT_FOUND;
  if (!isOwnRequest(own.data.event)) return { ok: false, status: 0, message: DETAIL_FAILED };

  return {
    ok: true,
    data: {
      ...own.data.event,
      eventCode: event.event_code ?? null,
      statusChangedAt: event.status_changed_at ?? null,
      statusHistory: Array.isArray(event.statusHistory) ? event.statusHistory : [],
      comments: Array.isArray(event.comments) ? event.comments : [],
      outstandingQuestions: readQuestions(event.outstandingQuestions),
      decision: readDecision(event.decision),
    },
  };
}

// The organisation read carries the questions; the own-requests read only
// says whether the caller owns the request (it answers a colleague's with 404).
export async function getClarificationRequest(identifier: string, signal?: AbortSignal): Promise<ApiResult<ClarificationRequest>> {
  const summary = await apiCall<{ event?: Record<string, any> }>(
    `/api/events?id=${encodeURIComponent(identifier)}`, { signal }, DETAIL_FAILED);
  if (!summary.ok) return summary.status === 403 || summary.status === 404 ? NOT_FOUND : summary;
  const event = summary.data.event;
  if (!event?.id || !EVENT_STATUSES.includes(event.status)) return NOT_FOUND;

  const own = await apiCall<{ event?: unknown }>(
    `/api/events?mine=1&id=${encodeURIComponent(event.id)}`, { signal }, DETAIL_FAILED);
  if (!own.ok && own.status !== 404) return own;

  return {
    ok: true,
    data: {
      id: event.id,
      eventCode: event.event_code ?? null,
      title: typeof event.title === 'string' ? event.title : '',
      status: event.status,
      owner: own.ok && Boolean(own.data.event),
      outstandingQuestions: readQuestions(event.outstandingQuestions),
    },
  };
}
