// In-memory stand-in for the E03-S03 (SCRUM-34) decision endpoint in
// api/events.ts, plus the reads both sides' screens make and the session and
// notification endpoints the shared header calls. It holds one request that a
// Coordinator and its Organiser take turns on: call signInAs() to switch who
// the browser is. Response shapes, rules and sentences follow
// backend/src/modules/eventLifecycle/decision.ts; the real rules are proven
// against PostgreSQL in backend/tests/decision.integration.test.ts.
//
// Decisions are dated 10 Sept 2026, 10:00 in Singapore, so TC_E03S03_05's
// "Rejected on 10 Sept 2026" can be checked (a real database records the real
// date, and #190 makes it unchangeable).
import type { Page, Route } from '@playwright/test';

type Person = { id: string; name: string; email: string; role: 'event_coordinator' | 'event_organiser' };
type Notice = { id: string; title: string; message: string; is_read: boolean; read_at: string | null; created_at: string; event_id: string };
type Status = 'under_review' | 'awaiting_clarification' | 'approved' | 'rejected';

export const coordinator: Person = { id: 'c-b', name: 'Coord B', email: 'coordinator_1@connectsphere.com', role: 'event_coordinator' };
export const organiser: Person = { id: 'o-a', name: 'Organiser A', email: 'organiser_a@clienta.com', role: 'event_organiser' };

const DECIDED_AT = '2026-09-10T02:00:00.000Z';
const MAX_REASON = 2000;

const sentences = {
  notUnderReview: 'A decision can only be made while the request is Under Review.',
  incomplete: "This request can't be approved until its required information is complete.",
  reasonRequired: 'Add a reason for rejecting this request.',
  reasonTooLong: `The reason must be ${MAX_REASON} characters or fewer.`,
  rejectedReadOnly: 'This request is rejected, so it can no longer be changed.',
};

export async function fakeDecisionBackend(page: Page, options: {
  title: string;
  code: string;
  status?: Status;
  // Required items the stored request lacks; approval lists them (Scenario 2).
  missingFields?: string[];
  // A rejection already on record when the test starts.
  reason?: string;
  user?: Person;
}) {
  const event = { id: `evt-${options.code.toLowerCase()}`, code: options.code, title: options.title };
  const state = {
    user: options.user ?? coordinator,
    status: options.status ?? 'under_review' as Status,
    reason: options.reason ?? null as string | null,
    decidedAt: options.status === 'approved' || options.status === 'rejected' ? DECIDED_AT : null as string | null,
    notices: new Map<string, Notice[]>(),
    decisions: 0,
  };
  const missing = options.missingFields ?? [];

  function notify(to: Person, title: string, message: string) {
    const list = state.notices.get(to.id) ?? [];
    list.unshift({ id: `n-${list.length + 1}-${to.id}`, title, message, is_read: false, read_at: null, created_at: DECIDED_AT, event_id: event.id });
    state.notices.set(to.id, list);
  }

  const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, json: body });
  const fields = {
    description: 'An evening of talks and networking', purpose: 'Bring the community together',
    venue_requirements: missing.includes('Venue requirements') ? null : 'Auditorium with a stage',
    accessibility_note: 'Step-free access to the stage', equipment_requirements: 'None required',
    layout_preference: 'Theatre', registration_setup: 'Free registration',
  };
  const summary = () => ({
    id: event.id, event_code: event.code, title: event.title, status: state.status,
    status_changed_at: state.decidedAt ?? '2026-09-07T01:00:00.000Z',
    starts_at: '2026-12-01T01:00:00.000Z', ends_at: '2026-12-01T04:00:00.000Z', expected_attendance: 120,
    coordinator_assigned_at: '2026-09-07T01:00:00.000Z', organiser_name: organiser.name,
  });
  const decision = () => (state.decidedAt && (state.status === 'approved' || state.status === 'rejected')
    ? { outcome: state.status, reason: state.status === 'rejected' ? state.reason : null, decidedAt: state.decidedAt }
    : null);

  await page.route('**/api/auth/session', route => json(route, 200, {
    user: { id: state.user.id, email: state.user.email, role: state.user.role, clientOrgId: state.user.role === 'event_organiser' ? 'client-a' : null },
  }));
  await page.route('**/api/notifications', route => {
    const list = state.notices.get(state.user.id) ?? [];
    if (route.request().method() === 'POST') {
      const { id } = route.request().postDataJSON() as { id: string };
      const notice = list.find(item => item.id === id)!;
      Object.assign(notice, { is_read: true, read_at: DECIDED_AT });
      return json(route, 200, { notification: notice });
    }
    return json(route, 200, { notifications: list });
  });

  await page.route('**/api/events?*', route => {
    try { return handleEvents(route); } catch (error) {
      // Fail the request visibly rather than leaving the page waiting.
      return json(route, 500, { error: `Test backend error: ${(error as Error).message}` });
    }
  });

  function handleEvents(route: Route) {
    const request = route.request();
    const params = new URL(request.url()).searchParams;
    const id = params.get('id');
    const ours = id === event.id || id === event.code;

    if (request.method() === 'GET' && params.get('assigned') === '1' && !id) {
      return json(route, 200, { events: [{ ...summary(), reassignment_pending: false }] });
    }
    if (request.method() === 'GET' && params.get('assigned') === '1' && ours) {
      return json(route, 200, { event: {
        ...summary(), ...fields, coordinator_id: coordinator.id, coordinator_name: coordinator.name,
        organiser_email: organiser.email, pendingReassignment: null, outstandingQuestions: [],
      } });
    }
    if (request.method() === 'GET' && params.get('mine') === '1' && ours) {
      return json(route, 200, { event: {
        id: event.id, title: event.title, purpose: fields.purpose, status: state.status,
        startAt: '2026-12-01T01:00:00.000Z', endAt: '2026-12-01T04:00:00.000Z', expectedAttendance: 120,
      } });
    }
    if (request.method() === 'GET' && ours) {
      const rejected = state.status === 'rejected';
      return json(route, 200, { event: {
        ...summary(), ...fields, organiser_id: organiser.id, creator_name: organiser.name, coordinator_id: coordinator.id,
        coordinator_name: coordinator.name, statusHistory: [], activityLog: [], comments: [], outstandingQuestions: [],
        decision: decision(), canEdit: !rejected,
        editableFields: rejected ? [] : ['title', 'description', 'purpose', 'startAt', 'endAt', 'expectedAttendance',
          'venueRequirements', 'accessibilityNote', 'equipmentRequirements', 'layoutPreference', 'registrationDates'],
      } });
    }
    if (request.method() === 'POST' && params.get('decide') === '1' && ours) {
      const body = request.postDataJSON() as { decision?: string; reason?: string };
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
      if (body.decision === 'reject' && !reason) return json(route, 400, { error: sentences.reasonRequired });
      if (body.decision === 'reject' && reason.length > MAX_REASON) return json(route, 400, { error: sentences.reasonTooLong });
      if (state.status !== 'under_review') return json(route, 409, { error: sentences.notUnderReview });
      if (body.decision === 'approve' && missing.length) return json(route, 409, { error: sentences.incomplete, missingFields: missing });
      state.decisions += 1;
      state.decidedAt = DECIDED_AT;
      if (body.decision === 'approve') {
        state.status = 'approved';
        notify(organiser, 'Request approved', `${coordinator.name} approved ${event.code} ${event.title}. The request is now Approved and moves to planning.`);
      } else {
        state.status = 'rejected';
        state.reason = reason;
        notify(organiser, 'Request rejected', `${coordinator.name} rejected ${event.code} ${event.title}. The request is now Rejected and can no longer be changed.\n\nReason: ${reason}`);
      }
      return json(route, 200, { decision: {
        eventId: event.id, eventCode: event.code, status: state.status, statusChangedAt: DECIDED_AT,
        decisionReason: state.status === 'rejected' ? reason : null,
      } });
    }
    if (request.method() === 'PATCH' && params.get('edit') === '1' && ours) {
      if (state.status === 'rejected') return json(route, 409, { error: sentences.rejectedReadOnly });
      return json(route, 200, { fields: Object.keys(request.postDataJSON() as object) });
    }
    return json(route, 404, { error: 'Not handled by the test backend.' });
  }

  return {
    signInAs(person: Person) { state.user = person; },
    get status() { return state.status; },
    get reason() { return state.reason; },
    get decisions() { return state.decisions; },
  };
}
