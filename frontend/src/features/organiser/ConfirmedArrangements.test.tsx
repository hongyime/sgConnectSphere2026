// E08-S03 (SCRUM-60) Scenario 6, the Organiser side, against a stubbed API
// shaped like the live endpoints: once the event is Confirmed, the request
// page lists every confirmed venue with its purpose and period, and the
// equipment and support arranged (TC_E08S03_05, D66). Also fix (a): "none
// required" reads as words, and an event in Safety Review still loads. The
// read itself is proven against PostgreSQL in
// backend/tests/eventReadiness.integration.test.ts.
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { stubApi } from '../../testing/fakeApi';
import { SubmittedDetail } from './Organiser';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const arrangements = {
  venues: [
    { venueName: 'Grand Auditorium', purpose: 'Main programme', startsAt: '2027-01-15T01:00:00.000Z', endsAt: '2027-01-15T09:00:00.000Z' },
    { venueName: 'Seminar Room A', purpose: null, startsAt: '2027-01-15T06:00:00.000Z', endsAt: '2027-01-15T08:00:00.000Z' },
  ],
  equipment: [{ name: 'Projector-HD', quantity: 3 }, { name: 'Microphone-Wireless', quantity: 2 }],
  support: [{ description: 'Sound desk operator', startsAt: '2027-01-15T01:00:00.000Z', endsAt: '2027-01-15T09:00:00.000Z' }],
  equipmentNoneRequired: false,
};

function orgRead(status: string, extra: Record<string, unknown> = {}) {
  return { event: {
    id: 'evt-run', event_code: 'EVT-RUN', title: 'Charity Run', status, status_changed_at: '2026-10-16T02:00:00.000Z',
    statusHistory: [], comments: [], outstandingQuestions: [], decision: null, arrangements: null, ...extra,
  } };
}
const ownRead = (status: string, equipmentRequirements = 'none_required') => ({ event: {
  id: 'evt-run', title: 'Charity Run', purpose: 'Raise funds', status, equipmentRequirements,
  startAt: '2027-01-15T01:00:00.000Z', endAt: '2027-01-15T09:00:00.000Z', expectedAttendance: 300,
} });

function renderRequestPage() {
  render(
    <MemoryRouter initialEntries={['/organiser/requests/EVT-RUN']}>
      <Routes><Route path="/organiser/requests/:eventCode" element={<SubmittedDetail />} /></Routes>
    </MemoryRouter>,
  );
}

test('TC_E08S03_05 - once confirmed, the Organiser sees every confirmed venue with its purpose and period, and the arrangements', async () => {
  stubApi({
    'GET /api/events?mine=1&id=evt-run': { body: ownRead('confirmed', 'Projector and microphones') },
    'GET /api/events?id=EVT-RUN': { body: orgRead('confirmed', { arrangements }) },
  });
  renderRequestPage();
  const card = within(await screen.findByRole('region', { name: 'Confirmed arrangements' }));
  const venues = within(card.getByRole('table', { name: 'Confirmed venues' }));
  expect(venues.getByText('Grand Auditorium')).toBeInTheDocument();
  expect(venues.getByText('Main programme')).toBeInTheDocument();
  expect(venues.getByText('15 Jan 2027, 9:00 am – 5:00 pm')).toBeInTheDocument();
  expect(venues.getByText('Seminar Room A')).toBeInTheDocument();
  expect(venues.getByText('None recorded')).toBeInTheDocument();
  expect(venues.getByText('15 Jan 2027, 2:00 pm – 4:00 pm')).toBeInTheDocument();
  expect(card.getByText('Projector-HD × 3, Microphone-Wireless × 2')).toBeInTheDocument();
  expect(card.getByText('Sound desk operator (15 Jan 2027, 9:00 am – 5:00 pm)')).toBeInTheDocument();
  expect(document.querySelector('.ui-page-heading .status-pill')).toHaveTextContent('Confirmed');
  // E09-S02: a Confirmed event links to its registrations.
  expect(screen.getByRole('link', { name: 'Registrations' }).getAttribute('href')).toMatch(/^\/organiser\/requests\/[^/]+\/registrations$/);
});

test('TC_E08S03_05 - a confirmed event with none required, no support and no venue rows says so in words', async () => {
  stubApi({
    'GET /api/events?mine=1&id=evt-run': { body: ownRead('confirmed') },
    'GET /api/events?id=EVT-RUN': { body: orgRead('confirmed', {
      arrangements: { venues: [], equipment: [], support: [], equipmentNoneRequired: true },
    }) },
  });
  renderRequestPage();
  const card = within(await screen.findByRole('region', { name: 'Confirmed arrangements' }));
  expect(card.getByText('No confirmed venue recorded.')).toBeInTheDocument();
  expect(card.getByText('None required')).toBeInTheDocument();
  expect(card.getByText('None recorded')).toBeInTheDocument();
  cleanup(); vi.unstubAllGlobals();

  // Free-text equipment with nothing reserved: no equipment to show.
  stubApi({
    'GET /api/events?mine=1&id=evt-run': { body: ownRead('confirmed', 'Two lecterns') },
    'GET /api/events?id=EVT-RUN': { body: orgRead('confirmed', {
      arrangements: { ...arrangements, equipment: [], support: [], equipmentNoneRequired: false },
    }) },
  });
  renderRequestPage();
  const other = within(await screen.findByRole('region', { name: 'Confirmed arrangements' }));
  expect(other.getAllByText('None recorded').length).toBe(3);
});

test('SCRUM-60 fix (a) - equipment recorded as none required reads "None required", not the stored value', async () => {
  stubApi({
    'GET /api/events?mine=1&id=evt-run': { body: ownRead('planning') },
    'GET /api/events?id=EVT-RUN': { body: orgRead('planning') },
  });
  renderRequestPage();
  const summary = within(await screen.findByRole('region', { name: 'Summary' }));
  expect(summary.getByText('None required')).toBeInTheDocument();
  expect(screen.queryByText('none_required')).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Confirmed arrangements' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Registrations' })).not.toBeInTheDocument();
});

test('TC_E08S03_08 - an event in Safety Review loads, with its pill and what happens next', async () => {
  stubApi({
    'GET /api/events?mine=1&id=evt-run': { body: ownRead('safety_review') },
    'GET /api/events?id=EVT-RUN': { body: orgRead('safety_review', { arrangements: { broken: true } }) },
  });
  renderRequestPage();
  expect(await screen.findByText('Your event is awaiting its safety check. It is confirmed once the Safety Officer approves it.')).toBeInTheDocument();
  expect(document.querySelector('.ui-page-heading .status-pill')).toHaveTextContent('Safety Review');
  expect(screen.queryByRole('region', { name: 'Confirmed arrangements' })).not.toBeInTheDocument();
});
