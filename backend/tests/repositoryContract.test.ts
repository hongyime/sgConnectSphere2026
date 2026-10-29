// The shared EventLifecycleRepository contract: the semantics both the
// in-memory fake (helpers/inMemoryEventLifecycleRepository.ts) and the real
// PostgreSQL implementation must satisfy. Assertions are limited to behaviour
// the fake genuinely mirrors; Postgres-only rules (illegal-transition
// validation, the draft-only update guard, assignIfSubmitted, accessibility
// side-effects) are covered by the existing integration suites instead.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createInMemoryEventLifecycleRepository } from './helpers/inMemoryEventLifecycleRepository.js';
import { loginDatabase } from './helpers/loginDatabase.js';
import { NONE_REQUIRED } from '../src/modules/eventLifecycle/service.js';
import type { EventLifecycleRepository } from '../src/modules/eventLifecycle/repository.js';
import type { CreateEventRequest } from '../src/modules/eventLifecycle/types.js';

type Fixture = { organiserId: string; otherOrganiserId: string; clientOrgId: string };

function draftRequest(fixture: Fixture, overrides: Partial<CreateEventRequest> = {}): CreateEventRequest {
  const startAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return {
    title: 'Contract draft',
    description: 'A description.',
    purpose: 'A purpose.',
    organiserId: fixture.organiserId,
    clientOrgId: fixture.clientOrgId,
    status: 'draft',
    startAt,
    endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
    expectedAttendance: 20,
    venueRequirements: 'A seminar room',
    accessibilityNote: 'Step-free access',
    equipmentRequirements: NONE_REQUIRED,
    layoutPreference: NONE_REQUIRED,
    registrationSetup: NONE_REQUIRED,
    ...overrides,
  };
}

export async function assertRepositoryContract(repository: EventLifecycleRepository, fixture: Fixture): Promise<void> {
  const created = await repository.createEvent(draftRequest(fixture));
  assert.equal(created.title, 'Contract draft');
  assert.equal(created.organiserId, fixture.organiserId);
  assert.equal(created.clientOrgId, fixture.clientOrgId);
  assert.equal(created.expectedAttendance, 20);
  assert.equal(created.status, 'draft');
  assert.ok(created.startAt instanceof Date && created.endAt instanceof Date);

  assert.equal((await repository.findEventById(created.id))?.id, created.id);
  // A UUID that exists nowhere: the id column is uuid, so a non-uuid string
  // would error rather than answer "not found".
  assert.equal(await repository.findEventById(randomUUID()), null);

  const other = await repository.createEvent(
    draftRequest(fixture, { title: 'Other organiser draft', organiserId: fixture.otherOrganiserId }),
  );
  const ids = (await repository.listEventsByOrganiser(fixture.organiserId)).map(event => event.id);
  assert.ok(ids.includes(created.id));
  assert.ok(!ids.includes(other.id));

  const startAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const updated = await repository.updateEvent(created.id, {
    title: 'Contract draft updated',
    startAt,
    endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
    expectedAttendance: 25,
  });
  assert.equal(updated.id, created.id);
  assert.equal(updated.title, 'Contract draft updated');
  assert.equal(updated.expectedAttendance, 25);

  const submitted = await repository.updateEventStatus(created.id, 'submitted', fixture.organiserId);
  assert.equal(submitted.id, created.id);
  assert.equal(submitted.status, 'submitted');

  await assert.rejects(repository.deleteEvent(created.id));
}

test('in-memory EventLifecycleRepository satisfies the shared contract', async () => {
  await assertRepositoryContract(createInMemoryEventLifecycleRepository(), {
    organiserId: 'organiser-a',
    otherOrganiserId: 'organiser-b',
    clientOrgId: 'client-a',
  });
});

const skipPostgres = process.env.TEST_DATABASE_URL
  ? false
  : 'Set TEST_DATABASE_URL to a disposable PostgreSQL database';

test('PostgresEventLifecycleRepository satisfies the shared contract', { skip: skipPostgres }, async () => {
  const database = await loginDatabase();
  try {
    const clientOrgId = randomUUID();
    const organiserId = randomUUID();
    const otherOrganiserId = randomUUID();
    await database.pool.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2)', [clientOrgId, 'Contract client']);
    for (const [id, email, name] of [
      [organiserId, 'contract_organiser@example.test', 'Contract Organiser'],
      [otherOrganiserId, 'contract_other@example.test', 'Other Organiser'],
    ] as const) {
      await database.pool.query(
        `INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
         VALUES ($1, $2, $3, 'unused', $4, 'event_organiser')`,
        [id, clientOrgId, email, name],
      );
    }

    const { PostgresEventLifecycleRepository } = await import('../src/modules/eventLifecycle/repository.js');
    await assertRepositoryContract(
      new PostgresEventLifecycleRepository({}, database.pool),
      { organiserId, otherOrganiserId, clientOrgId },
    );
  } finally {
    await database.close();
  }
});
