import test from 'node:test';
import assert from 'node:assert/strict';
import {
  changeEventStatus,
  createEventRequest,
  deleteEventRequest,
  EventAccessError,
  EventNotFoundError,
  EventValidationError,
  NONE_REQUIRED,
  updateEventRequest,
} from '../src/modules/eventLifecycle/service';
import { createInMemoryEventLifecycleRepository as fakeRepository } from './helpers/inMemoryEventLifecycleRepository.js';
import type { CreateEventRequest } from '../src/modules/eventLifecycle/types';
import { isAfterSingaporeDate, singaporeDateKey, twoCalendarYearsFromSingaporeDate } from '../src/modules/eventLifecycle/dateHorizon.js';

function completeRequest(overrides: Partial<CreateEventRequest> = {}): CreateEventRequest {
  const startAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

  return {
    title: 'Annual Tech Summit',
    description: 'A summit for the tech community',
    purpose: 'Knowledge sharing',
    organiserId: 'organiser-a',
    clientOrgId: 'client-a',
    status: 'submitted',
    startAt,
    endAt,
    expectedAttendance: 180,
    venueRequirements: 'Seminar room with theatre seating',
    accessibilityNote: 'Wheelchair access',
    equipmentRequirements: NONE_REQUIRED,
    layoutPreference: NONE_REQUIRED,
    registrationSetup: NONE_REQUIRED,
    ...overrides,
  };
}

test('a request with all ten mandatory fields complete is submitted', async () => {
  const repository = fakeRepository();
  const event = await createEventRequest(repository, completeRequest());
  assert.equal(event.status, 'submitted');
  assert.equal(repository.created.length, 1);
});

test('every missing mandatory field is named, not just the first one', async () => {
  const repository = fakeRepository();
  await assert.rejects(
    createEventRequest(repository, completeRequest({ venueRequirements: undefined, layoutPreference: undefined })),
    (error: unknown) => {
      assert.ok(error instanceof EventValidationError);
      assert.equal(error.message, 'missing_mandatory_fields');
      assert.deepEqual(error.details?.missingFields, ['Venue requirements', 'Layout preference']);
      return true;
    },
  );
  assert.equal(repository.created.length, 0);
});

test('a preferred date in the past is blocked with an explanation', async () => {
  const repository = fakeRepository();
  const pastStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pastEnd = new Date(pastStart.getTime() + 60 * 60 * 1000);
  await assert.rejects(
    createEventRequest(repository, completeRequest({ startAt: pastStart, endAt: pastEnd })),
    { message: 'Preferred date must be in the future' },
  );
  assert.equal(repository.created.length, 0);
});

test('the two-year boundary uses the Singapore-local calendar date and includes the exact limit', () => {
  const submittedAt = new Date('2026-10-12T16:00:00.000Z');
  const maximumDate = twoCalendarYearsFromSingaporeDate(submittedAt);

  assert.equal(singaporeDateKey(submittedAt), '2026-10-13');
  assert.equal(maximumDate, '2028-10-13');
  assert.equal(isAfterSingaporeDate(new Date('2028-10-13T15:59:00.000Z'), maximumDate), false);
  assert.equal(isAfterSingaporeDate(new Date('2028-10-13T16:00:00.000Z'), maximumDate), true);
});

test('adding two calendar years clamps leap day to the last valid day of February', () => {
  assert.equal(twoCalendarYearsFromSingaporeDate(new Date('2028-02-28T16:00:00.000Z')), '2030-02-28');
});

test('a feasible next-day Event date has no fixed minimum lead time', async () => {
  const repository = fakeRepository();
  const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const event = await createEventRequest(repository, completeRequest({
    startAt,
    endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
  }));

  assert.equal(event.status, 'submitted');
  assert.equal(repository.created.length, 1);
});

test('a submitted Event date on the exact two-year boundary is accepted', async () => {
  const repository = fakeRepository();
  const maximumDate = twoCalendarYearsFromSingaporeDate(new Date());
  const startAt = new Date(`${maximumDate}T09:00:00+08:00`);
  const event = await createEventRequest(repository, completeRequest({
    startAt,
    endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
  }));

  assert.equal(event.status, 'submitted');
  assert.equal(repository.created.length, 1);
});

for (const field of ['startAt', 'endAt'] as const) {
  test(`an Event ${field} after the two-year boundary is identified and blocked`, async () => {
    const repository = fakeRepository();
    const maximumDate = twoCalendarYearsFromSingaporeDate(new Date());
    const beyond = new Date(`${maximumDate}T09:00:00+08:00`);
    beyond.setUTCDate(beyond.getUTCDate() + 1);
    const overrides = field === 'startAt'
      ? { startAt: beyond, endAt: new Date(beyond.getTime() + 60 * 60 * 1000) }
      : { startAt: new Date(Date.now() + 24 * 60 * 60 * 1000), endAt: beyond };

    await assert.rejects(createEventRequest(repository, completeRequest(overrides)), (error: unknown) => {
      assert.ok(error instanceof EventValidationError);
      assert.equal(error.message, 'event_date_outside_horizon');
      assert.deepEqual(error.details, { field, maximumDate });
      return true;
    });
    assert.equal(repository.created.length, 0);
  });
}

test('a draft may keep a farther date, but submitting that draft applies the horizon', async () => {
  const repository = fakeRepository();
  const maximumDate = twoCalendarYearsFromSingaporeDate(new Date());
  const startAt = new Date(`${maximumDate}T09:00:00+08:00`);
  startAt.setUTCDate(startAt.getUTCDate() + 1);
  const draft = await createEventRequest(repository, completeRequest({
    status: 'draft',
    startAt,
    endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
  }));

  assert.equal(draft.status, 'draft');
  await assert.rejects(updateEventRequest(repository, draft.id, draft.organiserId, { status: 'submitted' }), (error: unknown) => {
    assert.ok(error instanceof EventValidationError);
    assert.equal(error.message, 'event_date_outside_horizon');
    assert.deepEqual(error.details, { field: 'startAt', maximumDate });
    return true;
  });
});

test('"none required" satisfies equipment, layout and registration setup', async () => {
  const repository = fakeRepository();
  const event = await createEventRequest(
    repository,
    completeRequest({
      equipmentRequirements: NONE_REQUIRED,
      layoutPreference: NONE_REQUIRED,
      registrationSetup: NONE_REQUIRED,
    }),
  );
  assert.equal(event.status, 'submitted');
  assert.equal(repository.created[0].equipmentRequirements, NONE_REQUIRED);
});

test('an empty equipment/layout/registration field without "none required" is still missing', async () => {
  const repository = fakeRepository();
  await assert.rejects(
    createEventRequest(repository, completeRequest({ equipmentRequirements: undefined })),
    (error: unknown) => {
      assert.ok(error instanceof EventValidationError);
      assert.deepEqual(error.details?.missingFields, ['Equipment requirements']);
      return true;
    },
  );
});

test('an end time at or before the start time is rejected', async () => {
  const repository = fakeRepository();
  const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await assert.rejects(
    createEventRequest(repository, completeRequest({ startAt, endAt: startAt })),
    { message: 'invalid_event_range' },
  );
});

test('a non-positive or non-integer expected attendance is reported as missing', async () => {
  const repository = fakeRepository();
  await assert.rejects(
    createEventRequest(repository, completeRequest({ expectedAttendance: 0 })),
    (error: unknown) => {
      assert.ok(error instanceof EventValidationError);
      assert.deepEqual(error.details?.missingFields, ['Expected attendance']);
      return true;
    },
  );
});

// Cover the HTTP parser as well as the service: previously the parser returned
// invalid_payload before the service could name all missing mandatory fields.
import { parseCreateEventBody } from '../src/modules/eventLifecycle/parseRequest.js';

test('an empty HTTP request being submitted reports all ten mandatory fields without writing', async () => {
  const repository = fakeRepository();
  const request = parseCreateEventBody({ status: 'submitted' }, 'organiser-a', 'client-a');
  assert.ok(request);
  await assert.rejects(createEventRequest(repository, request), (error: unknown) => {
    assert.ok(error instanceof EventValidationError);
    assert.equal(error.message, 'missing_mandatory_fields');
    assert.deepEqual(error.details?.missingFields, [
      'Event name', 'Description', 'Purpose', 'Expected attendance',
      'Venue requirements', 'Accessibility needs', 'Equipment requirements',
      'Layout preference', 'Registration setup', 'Preferred dates and times',
    ]);
    return true;
  });
  assert.equal(repository.created.length, 0);
});

// SCRUM-27 Option B: a draft only requires title, expected attendance and
// dates. The empty HTTP request above defaults to status 'draft' (the
// parser's default), so it reports just those three, not all ten.
test('an empty HTTP request saved as a draft reports only the three always-mandatory fields', async () => {
  const repository = fakeRepository();
  const request = parseCreateEventBody({}, 'organiser-a', 'client-a');
  assert.ok(request);
  assert.equal(request.status, 'draft');
  await assert.rejects(createEventRequest(repository, request), (error: unknown) => {
    assert.ok(error instanceof EventValidationError);
    assert.equal(error.message, 'missing_mandatory_fields');
    assert.deepEqual(error.details?.missingFields, [
      'Event name', 'Expected attendance', 'Preferred dates and times',
    ]);
    return true;
  });
  assert.equal(repository.created.length, 0);
});

test('a draft with title, attendance and dates but nothing else is saved', async () => {
  const repository = fakeRepository();
  const event = await createEventRequest(repository, completeRequest({
    status: 'draft',
    description: undefined,
    purpose: undefined,
    venueRequirements: undefined,
    accessibilityNote: undefined,
    equipmentRequirements: undefined,
    layoutPreference: undefined,
    registrationSetup: undefined,
  }));
  assert.equal(event.status, 'draft');
  assert.equal(repository.created.length, 1);
});

test('a draft missing title, attendance or dates is still rejected', async () => {
  const repository = fakeRepository();
  await assert.rejects(
    createEventRequest(repository, completeRequest({ status: 'draft', title: '', expectedAttendance: 0 })),
    (error: unknown) => {
      assert.ok(error instanceof EventValidationError);
      assert.deepEqual(error.details?.missingFields, ['Event name', 'Expected attendance']);
      return true;
    },
  );
  assert.equal(repository.created.length, 0);
});

for (const attendance of [true, [], [1], '1', 0, -1, 1.5]) {
  test(`HTTP attendance ${JSON.stringify(attendance)} is rejected before persistence`, async () => {
    const repository = fakeRepository();
    const valid = completeRequest();
    const request = parseCreateEventBody({
      ...valid, startAt: valid.startAt.toISOString(), endAt: valid.endAt.toISOString(),
      expectedAttendance: attendance,
    }, valid.organiserId, valid.clientOrgId);
    assert.ok(request);
    await assert.rejects(createEventRequest(repository, request), (error: unknown) => {
      assert.ok(error instanceof EventValidationError);
      assert.deepEqual(error.details?.missingFields, ['Expected attendance']);
      return true;
    });
    assert.equal(repository.created.length, 0);
  });
}

for (const field of ['startAt', 'endAt'] as const) {
  test(`invalid ${field} cannot bypass date validation with NaN`, async () => {
    const repository = fakeRepository();
    await assert.rejects(
      createEventRequest(repository, completeRequest({ [field]: new Date(Number.NaN) })),
      { message: 'missing_mandatory_fields' },
    );
    assert.equal(repository.created.length, 0);
  });
}

// --- E02-S03: accessibilityFeatureIds ---

test('a predefined accessibility selection alone satisfies the mandatory Accessibility needs field', async () => {
  const repository = fakeRepository();
  const event = await createEventRequest(repository, completeRequest({
    accessibilityNote: undefined,
    accessibilityFeatureIds: ['feature-wheelchair-access'],
  }));
  assert.equal(event.status, 'submitted');
  assert.deepEqual(repository.created[0].accessibilityFeatureIds, ['feature-wheelchair-access']);
});

test('neither free text nor a predefined selection still reports Accessibility needs as missing', async () => {
  const repository = fakeRepository();
  await assert.rejects(
    createEventRequest(repository, completeRequest({ accessibilityNote: undefined, accessibilityFeatureIds: undefined })),
    (error: unknown) => {
      assert.ok(error instanceof EventValidationError);
      assert.deepEqual(error.details?.missingFields, ['Accessibility needs']);
      return true;
    },
  );
});

test('accessibilityFeatureIds round-trips through create and a subsequent update', async () => {
  const repository = fakeRepository();
  const created = await createEventRequest(repository, completeRequest({
    status: 'draft',
    accessibilityFeatureIds: ['feature-wheelchair-access'],
  }));
  assert.deepEqual(created.accessibilityFeatureIds, ['feature-wheelchair-access']);

  // A patch that only touches an unrelated field leaves the existing
  // selection untouched, same as every other field's merge-against-current
  // behaviour in updateEventRequest.
  const untouchedUpdate = await updateEventRequest(repository, created.id, created.organiserId, { venueRequirements: 'Level 3 hall' });
  assert.deepEqual(untouchedUpdate.accessibilityFeatureIds, ['feature-wheelchair-access']);

  // A patch that explicitly sends a new list replaces it wholesale, not merges.
  const replacedUpdate = await updateEventRequest(repository, created.id, created.organiserId, {
    accessibilityFeatureIds: ['feature-hearing-loop'],
  });
  assert.deepEqual(replacedUpdate.accessibilityFeatureIds, ['feature-hearing-loop']);
});

// --- SCRUM-27: updateEventRequest / deleteEventRequest ---

test('a draft can be re-saved as a draft with a changed field', async () => {
  const repository = fakeRepository();
  const draft = await createEventRequest(repository, completeRequest({ status: 'draft', venueRequirements: undefined }));
  const updated = await updateEventRequest(repository, draft.id, draft.organiserId, { venueRequirements: 'Level 3 hall' });
  assert.equal(updated.status, 'draft');
  assert.equal(updated.venueRequirements, 'Level 3 hall');
});

test('a draft can be submitted through the same update entry point', async () => {
  const repository = fakeRepository();
  const draft = await createEventRequest(repository, completeRequest({ status: 'draft' }));
  const updated = await updateEventRequest(repository, draft.id, draft.organiserId, { status: 'submitted' });
  assert.equal(updated.status, 'submitted');
});

test('submitting an update still requires every mandatory field', async () => {
  const repository = fakeRepository();
  const draft = await createEventRequest(repository, completeRequest({ status: 'draft', venueRequirements: undefined }));
  await assert.rejects(
    updateEventRequest(repository, draft.id, draft.organiserId, { status: 'submitted' }),
    (error: unknown) => {
      assert.ok(error instanceof EventValidationError);
      assert.deepEqual(error.details?.missingFields, ['Venue requirements']);
      return true;
    },
  );
});

test('updating someone else\'s draft is refused', async () => {
  const repository = fakeRepository();
  const draft = await createEventRequest(repository, completeRequest({ status: 'draft' }));
  await assert.rejects(
    updateEventRequest(repository, draft.id, 'a-different-organiser', { venueRequirements: 'x' }),
    (error: unknown) => error instanceof EventAccessError,
  );
});

test('updating an already-submitted request is refused', async () => {
  const repository = fakeRepository();
  const submitted = await createEventRequest(repository, completeRequest());
  await assert.rejects(
    updateEventRequest(repository, submitted.id, submitted.organiserId, { venueRequirements: 'x' }),
    (error: unknown) => {
      assert.ok(error instanceof EventValidationError);
      assert.equal(error.message, 'not_editable');
      return true;
    },
  );
});

test('updating an unknown draft id is reported as not found', async () => {
  const repository = fakeRepository();
  await assert.rejects(
    updateEventRequest(repository, 'no-such-event', 'organiser-a', { venueRequirements: 'x' }),
    (error: unknown) => error instanceof EventNotFoundError,
  );
});

test('a draft can be deleted by its owner', async () => {
  const repository = fakeRepository();
  const draft = await createEventRequest(repository, completeRequest({ status: 'draft' }));
  await deleteEventRequest(repository, draft.id, draft.organiserId);
  assert.equal(await repository.findEventById(draft.id), null);
});

test('deleting someone else\'s draft is refused', async () => {
  const repository = fakeRepository();
  const draft = await createEventRequest(repository, completeRequest({ status: 'draft' }));
  await assert.rejects(
    deleteEventRequest(repository, draft.id, 'a-different-organiser'),
    (error: unknown) => error instanceof EventAccessError,
  );
  assert.notEqual(await repository.findEventById(draft.id), null);
});

test('deleting an already-submitted request is refused', async () => {
  const repository = fakeRepository();
  const submitted = await createEventRequest(repository, completeRequest());
  await assert.rejects(
    deleteEventRequest(repository, submitted.id, submitted.organiserId),
    (error: unknown) => {
      assert.ok(error instanceof EventValidationError);
      assert.equal(error.message, 'not_deletable');
      return true;
    },
  );
  assert.notEqual(await repository.findEventById(submitted.id), null);
});

// --- E14-S02 Scenario 1: status change recorded (TC_E14S02_01) ---

test('changing status passes the actor and prior status through for the audit entry', async () => {
  const repository = fakeRepository();
  const submitted = await createEventRequest(repository, completeRequest());
  await changeEventStatus(repository, {
    eventId: submitted.id,
    actorId: 'coordinator-1',
    toStatus: 'under_review',
  });
  assert.deepEqual(repository.statusChanges, [{
    eventId: submitted.id,
    status: 'under_review',
    actorId: 'coordinator-1',
    fromStatus: 'submitted',
    reason: undefined,
  }]);
});

test('an illegal status transition is rejected before any audit entry is written', async () => {
  const repository = fakeRepository();
  const submitted = await createEventRequest(repository, completeRequest());
  await assert.rejects(
    changeEventStatus(repository, { eventId: submitted.id, actorId: 'coordinator-1', toStatus: 'confirmed' }),
    { message: 'Illegal event status transition: submitted -> confirmed' },
  );
  assert.equal(repository.statusChanges.length, 0);
});

test('changing status to the same status is a no-op that writes no audit entry', async () => {
  const repository = fakeRepository();
  const submitted = await createEventRequest(repository, completeRequest());
  await changeEventStatus(repository, { eventId: submitted.id, actorId: 'coordinator-1', toStatus: 'submitted' });
  assert.equal(repository.statusChanges.length, 0);
});

test('changing the status of an unknown event is reported as not found', async () => {
  const repository = fakeRepository();
  await assert.rejects(
    changeEventStatus(repository, { eventId: 'no-such-event', actorId: 'coordinator-1', toStatus: 'under_review' }),
    { message: 'Event not found: no-such-event' },
  );
});
