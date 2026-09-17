import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEventRequest,
  deleteEventRequest,
  EventAccessError,
  EventNotFoundError,
  EventValidationError,
  NONE_REQUIRED,
  updateEventRequest,
} from '../src/modules/eventLifecycle/service';
import type { EventLifecycleRepository } from '../src/modules/eventLifecycle/repository';
import type { CreateEventRequest, EventRecord } from '../src/modules/eventLifecycle/types';

function recordFromCreate(id: string, request: CreateEventRequest): EventRecord {
  return {
    id,
    title: request.title,
    description: request.description,
    purpose: request.purpose,
    clientOrgId: request.clientOrgId,
    organiserId: request.organiserId,
    status: request.status ?? 'submitted',
    statusChangedAt: new Date(),
    startAt: request.startAt,
    endAt: request.endAt,
    expectedAttendance: request.expectedAttendance,
    venueRequirements: request.venueRequirements,
    accessibilityNote: request.accessibilityNote,
    equipmentRequirements: request.equipmentRequirements,
    layoutPreference: request.layoutPreference,
    registrationSetup: request.registrationSetup,
  };
}

// A fake backed by an in-memory map, so the SCRUM-27 update/delete tests can
// exercise a real find -> mutate -> persist round trip without a database.
function fakeRepository(): EventLifecycleRepository & { created: CreateEventRequest[]; events: Map<string, EventRecord> } {
  const created: CreateEventRequest[] = [];
  const events = new Map<string, EventRecord>();
  let nextId = 1;

  return {
    created,
    events,
    async createEvent(request) {
      created.push(request);
      const record = recordFromCreate(`event-${nextId++}`, request);
      events.set(record.id, record);
      return record;
    },
    async findEventById(eventId) {
      return events.get(eventId) ?? null;
    },
    async updateEventStatus() {
      throw new Error('not used in this test');
    },
    async listEventsByOrganiser(organiserId, status) {
      return [...events.values()].filter(
        (event) => event.organiserId === organiserId && (!status || event.status === status),
      );
    },
    async updateEvent(eventId, update) {
      const existing = events.get(eventId);
      if (!existing) {
        throw new Error(`Event not found: ${eventId}`);
      }
      const record: EventRecord = { ...existing, ...update, statusChangedAt: new Date() };
      events.set(eventId, record);
      return record;
    },
    async deleteEvent(eventId) {
      const existing = events.get(eventId);
      if (!existing || existing.status !== 'draft') {
        throw new Error(`Draft event not found: ${eventId}`);
      }
      events.delete(eventId);
    },
  };
}

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
