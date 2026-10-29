// R4 (docs/class-diagram.md BookingStatus): proves the BookingState subtype
// polymorphism — every booking status flows through the shared interface and
// returns the exact NOT_DECIDABLE wording decideBooking has always returned.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingState, type BookingState, type BookingStatus } from '../src/modules/venueBooking/bookingState.js';

const ALREADY_DECIDED = 'This request has already been decided, so it can no longer be changed.';

const states: BookingState[] = [
  bookingState('pending'),
  bookingState('tentative'),
  bookingState('confirmed'),
  bookingState('rejected'),
  bookingState('released'),
  bookingState('conflicting'),
  bookingState('expired'),
];

test('each of the 7 booking statuses gets its own BookingState', () => {
  assert.equal(states.length, 7);
  assert.equal(new Set(states.map((state) => state.status)).size, 7);
});

test('every BookingState reports decidability through the shared interface', () => {
  const expected: Record<BookingStatus, string | null> = {
    pending: null,
    confirmed: ALREADY_DECIDED,
    rejected: ALREADY_DECIDED,
    conflicting: 'This booking now clashes with a change to the venue. It must be resolved before it can be decided.',
    released: 'The Coordinator withdrew this request, so there is nothing to decide.',
    tentative: 'This is a tentative hold, not a request yet, so there is nothing to decide.',
    expired: 'This hold has expired, so there is nothing to decide.',
  };
  for (const state of states) {
    assert.equal(state.canDecide(), expected[state.status], `${state.status}.canDecide() keeps the API wording`);
  }
});

test('an unknown status keeps the old "already decided" fallback', () => {
  assert.equal(bookingState('unknown-status').canDecide(), ALREADY_DECIDED);
});
