import { describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { buildPatch, EventEditForm, toLocalInput } from './EventEditForm';

const initial = {
  title: 'Charity Run', description: 'Annual fundraiser.', purpose: '', startAt: '2026-11-12T09:00', endAt: '2026-11-12T12:00',
  expectedAttendance: '200', venueRequirements: 'Outdoor start line', accessibilityNote: '', equipmentRequirements: '', layoutPreference: '',
};

describe('buildPatch', () => {
  test('sends only the fields that changed, trimmed and typed', () => {
    const { patch, errors } = buildPatch(initial, { ...initial, expectedAttendance: '250', venueRequirements: '  Covered start line  ' });
    expect(errors).toEqual({});
    expect(patch).toEqual({ expectedAttendance: 250, venueRequirements: 'Covered start line' });
  });

  test('sends nothing when nothing changed, including whitespace-only edits', () => {
    expect(buildPatch(initial, { ...initial, title: ' Charity Run ' }).patch).toEqual({});
  });

  test('an empty optional field left empty is not sent', () => {
    expect(buildPatch(initial, { ...initial, purpose: '   ' }).patch).toEqual({});
  });

  test('clearing a field that had a value is refused, as the server does', () => {
    expect(buildPatch(initial, { ...initial, venueRequirements: '' }).errors).toEqual({ venueRequirements: "Venue requirements can't be left empty." });
  });

  test.each(['0', '-5', '12.5', 'many', '007'])('attendance %s is refused', value => {
    expect(buildPatch(initial, { ...initial, expectedAttendance: value }).errors.expectedAttendance).toBe('Enter a whole number greater than 0.');
  });

  test('an end before the start is refused', () => {
    expect(buildPatch(initial, { ...initial, endAt: '2026-11-12T08:00' }).errors).toEqual({ endAt: 'The event must end after it starts.' });
  });

  test('changed dates are sent as ISO timestamps', () => {
    const { patch } = buildPatch(initial, { ...initial, startAt: '2026-11-13T09:00', endAt: '2026-11-13T12:00' });
    expect(patch.startAt).toBe(new Date('2026-11-13T09:00').toISOString());
    expect(patch.endAt).toBe(new Date('2026-11-13T12:00').toISOString());
  });
});

test('toLocalInput round-trips through the browser time zone', () => {
  const iso = new Date('2026-11-12T09:30').toISOString();
  expect(toLocalInput(iso)).toBe('2026-11-12T09:30');
  expect(toLocalInput('not a date')).toBe('');
});

test('date fields warn that a change notifies people and name the time zone', () => {
  render(
    <EventEditForm
      eventId="evt-1"
      values={{ title: 'Charity Run', description: null, purpose: null, starts_at: '2026-11-12T01:00:00.000Z', ends_at: '2026-11-12T04:00:00.000Z',
        expected_attendance: 200, venue_requirements: null, accessibility_note: null, equipment_requirements: null, layout_preference: null }}
      editable={new Set(['startAt', 'endAt'])}
      onSaved={() => {}}
      onCancel={() => {}}
    />,
  );
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  for (const label of ['Starts', 'Ends']) {
    expect(screen.getByLabelText(label)).toHaveAccessibleDescription(
      `Times are in ${zone}. Changing the date notifies the Organiser and registered attendees.`,
    );
  }
  cleanup();
});
