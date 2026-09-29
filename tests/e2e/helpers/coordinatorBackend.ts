// In-memory stand-in for the E03-S01 Coordinator endpoints in api/events.ts,
// plus the session and notification endpoints the shared header calls.
// It keeps just enough state (assignee, pending reassignment, notifications,
// signed-in user) for a browser test to walk a reassignment end to end and
// switch users by calling signInAs(). Response shapes follow SCRUM-32 (#141).
import type { Page, Route } from '@playwright/test';

export type Coordinator = { id: string; name: string; email: string };

export const coordA: Coordinator = { id: '11111111-1111-4111-8111-111111111111', name: 'Coord A', email: 'coord_a@connectsphere.com' };
export const coordB: Coordinator = { id: '22222222-2222-4222-8222-222222222222', name: 'Coord B', email: 'coord_b@connectsphere.com' };

type Notice = { id: string; title: string; message: string; is_read: boolean; read_at: null; created_at: string; event_id: string };

export async function fakeCoordinatorBackend(page: Page, options: {
  eventCode: string;
  title: string;
  assignedTo: Coordinator;
  pendingTo?: Coordinator;
  status?: string;
}) {
  const eventId = `event-${options.eventCode.toLowerCase()}`;
  const state = {
    user: options.assignedTo,
    assignedTo: options.assignedTo,
    status: options.status ?? 'under_review',
    pending: options.pendingTo ? { id: 'reassignment-1', from: options.assignedTo, to: options.pendingTo, at: '2026-09-28T02:00:00.000Z' } : null as null | { id: string; from: Coordinator; to: Coordinator; at: string },
    notices: new Map<string, Notice[]>(),
  };

  function notify(to: Coordinator, title: string, message: string) {
    const list = state.notices.get(to.id) ?? [];
    list.unshift({ id: `n-${list.length + 1}-${to.id}`, title, message, is_read: false, read_at: null, created_at: '2026-09-28T03:00:00.000Z', event_id: eventId });
    state.notices.set(to.id, list);
  }

  function reassignment(status: string) {
    if (!state.pending) throw new Error('no pending reassignment');
    return {
      id: state.pending.id, eventId, eventCode: options.eventCode, eventTitle: options.title, status,
      requestedAt: state.pending.at, decidedAt: status === 'pending' ? null : '2026-09-28T03:00:00.000Z',
      fromCoordinator: { id: state.pending.from.id, name: state.pending.from.name },
      toCoordinator: { id: state.pending.to.id, name: state.pending.to.name },
    };
  }

  const summary = () => ({
    id: eventId, event_code: options.eventCode, title: options.title, status: state.status,
    status_changed_at: '2026-09-20T01:00:00.000Z', starts_at: '2026-11-12T01:00:00.000Z', ends_at: '2026-11-12T04:00:00.000Z',
    expected_attendance: 250, coordinator_assigned_at: '2026-09-20T01:00:00.000Z', organiser_name: 'Organiser A',
  });

  const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, json: body });

  await page.route('**/api/auth/session', route => json(route, 200, {
    user: { id: state.user.id, email: state.user.email, role: 'event_coordinator', clientOrgId: null },
  }));
  await page.route('**/api/notifications', route => json(route, 200, { notifications: state.notices.get(state.user.id) ?? [] }));

  await page.route('**/api/events?*', route => {
    const request = route.request();
    const params = new URL(request.url()).searchParams;
    const mine = state.assignedTo.id === state.user.id;

    if (request.method() === 'GET' && params.get('reassignments') === '1') {
      const all = state.pending ? [reassignment('pending')] : [];
      return json(route, 200, {
        incoming: all.filter(item => item.toCoordinator.id === state.user.id),
        outgoing: all.filter(item => item.fromCoordinator.id === state.user.id),
      });
    }
    if (request.method() === 'GET' && params.get('coordinators') === '1') {
      return json(route, 200, { coordinators: [coordA, coordB].filter(item => item.id !== state.user.id)
        .map(item => ({ id: item.id, full_name: item.name, email: item.email, active_events: item.id === coordB.id ? 1 : 3 })) });
    }
    if (request.method() === 'GET' && params.get('assigned') === '1' && params.get('id')) {
      if (!mine) return json(route, 403, { error: 'Access denied. This event is not assigned to you.' });
      return json(route, 200, { event: {
        ...summary(), description: 'Charity fundraiser run.', purpose: null, venue_requirements: 'Outdoor start line',
        accessibility_note: null, equipment_requirements: null, layout_preference: null, registration_setup: null,
        coordinator_id: state.assignedTo.id, coordinator_name: state.assignedTo.name, organiser_email: 'organiser_a@clienta.com',
        pendingReassignment: state.pending ? reassignment('pending') : null,
      } });
    }
    if (request.method() === 'GET' && params.get('assigned') === '1') {
      return json(route, 200, { events: mine ? [{ ...summary(), reassignment_pending: Boolean(state.pending) }] : [] });
    }
    if (request.method() === 'POST' && params.get('reassign') === '1') {
      if (!mine) return json(route, 403, { error: 'Only the assigned Coordinator can reassign this event.' });
      const to = [coordA, coordB].find(item => item.id === (request.postDataJSON() as { toCoordinatorId?: string }).toCoordinatorId);
      if (!to) return json(route, 400, { error: 'That colleague is not an active Event Coordinator.' });
      state.pending = { id: 'reassignment-1', from: state.user, to, at: '2026-09-28T02:00:00.000Z' };
      notify(to, 'Reassignment requested', `${state.user.name} asked you to take over ${options.title}.`);
      return json(route, 201, { reassignment: reassignment('pending') });
    }
    if (request.method() === 'POST' && params.get('reassignment')) {
      if (!state.pending || state.pending.to.id !== state.user.id) return json(route, 403, { error: 'Only the named colleague can respond to this reassignment.' });
      const accepted = params.get('decision') === 'accept';
      const answered = reassignment(accepted ? 'accepted' : 'declined');
      if (accepted) {
        state.assignedTo = state.pending.to;
        notify(state.pending.from, 'Reassignment accepted', `${state.pending.to.name} accepted ${options.title}.`);
      } else {
        notify(state.pending.from, 'Reassignment declined', `${state.pending.to.name} declined ${options.title}. You remain assigned.`);
      }
      state.pending = null;
      return json(route, 200, { reassignment: answered });
    }
    return json(route, 404, { error: 'Not handled by the test backend.' });
  });

  return {
    signInAs(user: Coordinator) { state.user = user; },
    get assignedTo() { return state.assignedTo; },
  };
}
