import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventRequest, EventValidationError, NONE_REQUIRED } from '../src/modules/eventLifecycle/service';
import type { EventLifecycleRepository } from '../src/modules/eventLifecycle/repository';
import type { CreateEventRequest, EventRecord } from '../src/modules/eventLifecycle/types';

function fakeRepository(): EventLifecycleRepository & { created: CreateEventRequest[] } {
  const created: CreateEventRequest[] = [];
  return {
    created,
    async createEvent(request) {
      created.push(request);
      return {
        id: 'event-1',
        title: request.title,
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
      } satisfies EventRecord;
    },
    async findEventById() {
      return null;
    },
    async updateEventStatus() {
      throw new Error('not used in this test');
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
