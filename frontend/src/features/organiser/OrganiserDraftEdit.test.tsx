// /organiser/drafts/:id failure states: a reply without a draft used to leave
// the page on "Loading draft…" forever; every error must now say so and offer
// a way back to the drafts list.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { OrganiserDraftEdit } from './OrganiserDrafts';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function renderDraft() {
  render(
    <MemoryRouter initialEntries={['/organiser/drafts/d-1']}>
      <Routes><Route path="/organiser/drafts/:id" element={<OrganiserDraftEdit />} /></Routes>
    </MemoryRouter>,
  );
}

test.each([
  ['a successful reply with no draft', 200, {}, 'The draft could not be loaded.'],
  ['a successful reply that is not JSON', 200, null, 'The draft could not be loaded.'],
  ['a missing draft', 404, { error: 'not_found' }, 'Draft not found.'],
  ['a server error', 503, {}, 'The draft could not be loaded.'],
])('%s shows an error with a way back, not endless loading', async (_case, status, body, message) => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: status < 300, status, json: body === null ? async () => { throw new SyntaxError('bad json'); } : async () => body,
  })));
  renderDraft();

  expect(await screen.findByRole('alert')).toHaveTextContent(message);
  expect(screen.queryByText('Loading draft…')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: '← Back to my drafts' })).toHaveAttribute('href', '/organiser/drafts');
});

test('TC_E04S02_02: reopening and saving a multi-Session draft preserves each Session and its id', async () => {
  const openingId = '11111111-1111-4111-8111-111111111111';
  const workshopId = '22222222-2222-4222-8222-222222222222';
  const fetchMock = vi.fn(async (url: string, _init: RequestInit) => url.includes('accessibilityFeatures')
    ? new Response(JSON.stringify({ features: [] }), { status: 200 })
    : new Response(JSON.stringify({ event: {
      id: 'd-1', title: 'Forum', description: 'Description', purpose: 'Purpose', status: 'draft',
      startAt: '2027-03-12T01:00:00.000Z', endAt: '2027-03-13T08:00:00.000Z', expectedAttendance: 75,
      venueRequirements: 'Main hall', accessibilityNote: 'Step-free', equipmentRequirements: 'Projector', layoutPreference: 'Theatre',
      registrationSetup: 'none_required', sessions: [
        { id: openingId, title: 'Opening', startAt: '2027-03-12T01:00:00.000Z', endAt: '2027-03-12T03:00:00.000Z',
          expectedAttendance: 40, venueRequirements: 'Hall A', accessibilityNote: 'Ramp', accessibilityFeatureIds: [], equipmentRequirements: 'Projector', layoutPreference: 'Theatre' },
        { id: workshopId, title: 'Workshop', startAt: '2027-03-13T05:00:00.000Z', endAt: '2027-03-13T08:00:00.000Z',
          expectedAttendance: 35, venueRequirements: 'Hall B', accessibilityNote: 'Lift', accessibilityFeatureIds: [], equipmentRequirements: 'Microphones', layoutPreference: 'Classroom' },
      ],
    } }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  renderDraft();

  expect(await screen.findByLabelText('Event name')).toHaveValue('Forum');
  expect(screen.getByLabelText('Session name (optional)')).toHaveValue('Workshop');
  expect(screen.getByLabelText('Expected attendance', { selector: '#request-session-2-expectedAttendance' })).toHaveValue(35);
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(await screen.findByText('Draft saved.')).toBeVisible();

  const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/events?id=d-1')!;
  const body = JSON.parse(init.body as string);
  expect(body.sessions.map((session: { id?: string; title: string; venueRequirements: string; equipmentRequirements: string }) => [
    session.id, session.title, session.venueRequirements, session.equipmentRequirements,
  ])).toEqual([
    [openingId, 'Forum', 'Hall A', 'Projector'],
    [workshopId, 'Workshop', 'Hall B', 'Microphones'],
  ]);
});
