// Typed fetch helpers for the organiser's own requests (SCRUM-105 screens,
// wired to the live API as a Sprint 1 loose end). Two existing endpoints are
// combined because neither returns everything these screens show:
//   GET /api/events?mine=1[&id=<uuid>]  - only the caller's own requests,
//     drafts included, with the full request fields (camelCase), but no event
//     code or status date, and lookup by uuid only.
//   GET /api/events?id=<uuid or code>   - the organisation-wide read (SCRUM-18),
//     which adds the event code, status history and comments (snake_case).
// Every request sends the session cookie (ADR-015).

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

export type RequestDetail = OwnRequest & {
  eventCode: string | null;
  statusChangedAt: string | null;
  statusHistory: StatusHistoryEntry[];
  comments: RequestComment[];
};

export type ListOwnRequestsResult = { ok: true; requests: OwnRequest[] } | { ok: false; message: string };
export type GetRequestDetailResult =
  | { ok: true; request: RequestDetail }
  | { ok: false; notFound: boolean; message: string };

const SIGN_IN_MESSAGE = 'Sign in as an Event Organiser to see your requests.';

async function getJson(url: string): Promise<{ status: number; body: any } | null> {
  try {
    const response = await fetch(url, { credentials: 'same-origin' });
    return { status: response.status, body: await response.json().catch(() => null) };
  } catch {
    return null;
  }
}

export async function listOwnRequests(): Promise<ListOwnRequestsResult> {
  const result = await getJson('/api/events?mine=1');
  if (!result) return { ok: false, message: 'Your requests could not be loaded. Please try again.' };
  if (result.status === 401 || result.status === 403) return { ok: false, message: SIGN_IN_MESSAGE };
  if (result.status < 200 || result.status >= 300) return { ok: false, message: 'Your requests could not be loaded. Please try again.' };
  return { ok: true, requests: Array.isArray(result.body?.events) ? result.body.events : [] };
}

// `identifier` is whatever is in the URL: a uuid from the request list, or an
// event code from an older link. The organisation read resolves either to a
// uuid, then the own-requests read supplies the request fields and confirms
// the request is the caller's (a colleague's event returns 404 there).
export async function getRequestDetail(identifier: string): Promise<GetRequestDetailResult> {
  const failed = { ok: false as const, notFound: false, message: 'This request could not be loaded. Please try again.' };
  const notFound = {
    ok: false as const, notFound: true,
    message: 'No request of yours matches this link. If you are signed in with a different role, sign in as an Event Organiser.',
  };

  const summary = await getJson(`/api/events?id=${encodeURIComponent(identifier)}`);
  if (!summary) return failed;
  if (summary.status === 401) return { ok: false, notFound: false, message: SIGN_IN_MESSAGE };
  // The organisation read answers unknown ids with the same 403 as a refusal,
  // so as not to reveal whether an event exists.
  if (summary.status === 403 || summary.status === 404) return notFound;
  if (summary.status < 200 || summary.status >= 300 || !summary.body?.event?.id) return failed;
  const event = summary.body.event;

  const own = await getJson(`/api/events?mine=1&id=${encodeURIComponent(event.id)}`);
  if (!own) return failed;
  if (own.status === 404) return notFound;
  if (own.status === 401 || own.status === 403) return { ok: false, notFound: false, message: SIGN_IN_MESSAGE };
  if (own.status < 200 || own.status >= 300 || !own.body?.event) return failed;

  return {
    ok: true,
    request: {
      ...(own.body.event as OwnRequest),
      eventCode: event.event_code ?? null,
      statusChangedAt: event.status_changed_at ?? null,
      statusHistory: Array.isArray(event.statusHistory) ? event.statusHistory : [],
      comments: Array.isArray(event.comments) ? event.comments : [],
    },
  };
}
