// E10-S02 (SCRUM-237): who the Coordinator is told will be asked to reconfirm,
// and the edit client's reading of save and preview replies.
import { afterEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArrangementReview, staffToNotify } from './ArrangementReview';
import { previewEventInformation, updateEventInformation } from './eventEditApi';
import { stubApi } from '../../testing/fakeApi';

afterEach(() => { vi.unstubAllGlobals(); });

const reservation = { id: 'r', sessionId: 's', equipmentId: 'e', equipmentName: 'Projector', reasons: ['time' as const] };

test('TC_E10S02_06: equipment alone is reconfirmed by Technical Support Staff only', () => {
  expect(staffToNotify({ impact: { affected: true, bookings: [], reservations: [reservation] }, overSubscription: [] })).toBe('Technical Support Staff');
});

test('a save reply without fields or impact falls back to the sent fields and nothing affected', async () => {
  stubApi({ 'PATCH /api/events?edit=1&id=evt-1': { body: { updated: true } } });
  expect(await updateEventInformation('evt-1', { description: 'New wording' })).toEqual({
    ok: true, fields: ['description'], impact: { affected: false, bookings: [], reservations: [] }, overSubscription: [],
  });
});

test('the preview goes to &preview=1 and a refusal is passed through as a failure', async () => {
  const calls = stubApi({ 'PATCH /api/events?edit=1&id=evt-1&preview=1': { status: 409, body: { error: 'Approved events need a change request for this field.' } } });
  const result = await previewEventInformation('evt-1', { startAt: '2026-11-20T01:00:00.000Z' });
  expect(result.ok).toBe(false);
  expect(result.ok ? null : result.message).toBe('Approved events need a change request for this field.');
  expect(calls[0].body).toEqual({ startAt: '2026-11-20T01:00:00.000Z' });
});


test('TC_E10S01_04: layout/accessibility impacts name their requirements rather than a headcount mismatch', () => {
  render(<ArrangementReview check={{ impact: { affected: true, bookings: [{ id: 'b', sessionId: 's', venueId: 'v', venueName: 'Seminar Hall', governingHeadcount: 40, capacity: 50, reasons: ['layout', 'accessibility'] }], reservations: [] }, overSubscription: [] }} busy={false} onConfirm={() => {}} onCancel={() => {}} />);
  expect(screen.getByText(/room layout changed; accessibility requirements changed/)).toBeTruthy();
  expect(screen.queryByText(/40 people for 50 places/)).toBeNull();
});

const support = { id: 's', description: 'Sound desk', startsAt: '2026-12-04T22:00:00.000Z', endsAt: '2026-12-05T04:00:00.000Z', reasons: ['time' as const] };

test('TC_E10S02_06: staffed support alone is reconfirmed by Technical Support Staff (T-103)', () => {
  expect(staffToNotify({ impact: { affected: true, bookings: [], reservations: [], supports: [{ ...support, shiftMs: 0 }] }, overSubscription: [] })).toBe('Technical Support Staff');
  expect(staffToNotify({ impact: { affected: false, bookings: [], reservations: [], supports: [] }, overSubscription: [] })).toBe('');
});

test('TC_E10S02_03: the preview lists flagged support with the time it moves to, or says it stays (T-103)', () => {
  const week = 7 * 24 * 60 * 60 * 1000;
  render(<ArrangementReview check={{ impact: { affected: true, bookings: [], reservations: [], supports: [
    { ...support, shiftMs: week }, { ...support, id: 't', description: '', shiftMs: 0 },
  ] }, overSubscription: [] }} busy={false} onConfirm={() => {}} onCancel={() => {}} />);
  expect(screen.getByRole('heading', { name: 'Technical Support to reconfirm' })).toBeTruthy();
  const items = screen.getAllByRole('listitem').map(item => item.textContent);
  expect(items).toEqual([
    'Sound desk: 5 Dec 2026, 6:00 am – 12:00 pm → 12 Dec 2026, 6:00 am – 12:00 pm',
    'Technical support: 5 Dec 2026, 6:00 am – 12:00 pm, time stays the same',
  ]);
  expect(screen.getByText(/notifies the Technical Support Staff\./)).toBeTruthy();
});
