// SCRUM-110: live PostgreSQL migration roundtrip for
// 0005_event_request_fields.sql (E02-S01 "Submit an event request").
//
// eventLifecycle.test.ts proves the validation and business-rule logic
// against a fake in-memory repository, but never proves the four
// migration-0005 columns (venue_requirements, equipment_requirements,
// layout_preference, registration_setup) actually survive a real
// INSERT -> SELECT roundtrip through PostgreSQL. This test does that,
// against a real, disposable schema, including the NONE_REQUIRED
// sentinel value (T-11) specifically.
//
// PostgresEventLifecycleRepository has no dependency-injection seam --
// it calls the process-wide getDatabasePool() singleton internally, which
// reads DATABASE_URL once at import time (see backend/src/config.ts and
// backend/src/database/client.ts). Schema isolation is therefore done via
// the connection string's `options=-c search_path=...` libpq parameter,
// set on process.env.DATABASE_URL BEFORE the eventLifecycle module graph
// is imported below. This works because this test targets a direct
// (non-pooled) PostgreSQL connection -- CI's postgres:17 service
// container, matching this test locally -- not a transaction-mode pooler
// like Supabase's, which is documented elsewhere in this repo as silently
// dropping that startup option.
//
// Requires TEST_DATABASE_URL; run via `npm run test:db --workspace backend`.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';

// TODO(follow-up once #119 merges): replace this local copy with the shared
// backend/tests/helpers/ensureTestExtensions.ts helper -- duplicated here
// rather than importing from a branch that hasn't merged to main yet.
// CREATE EXTENSION IF NOT EXISTS has a documented TOCTOU race under
// concurrent sessions (see #119); swallow only that specific error, since it
// means a concurrent test file's session created the extension first.
async function createExtensionIfNotExists(db: Client, name: 'pgcrypto' | 'btree_gist'): Promise<void> {
  try {
    await db.query(`CREATE EXTENSION IF NOT EXISTS ${name} WITH SCHEMA public`);
  } catch (error) {
    const pgError = error as { code?: string; constraint?: string };
    if (pgError.code === '23505' && pgError.constraint === 'pg_extension_name_index') {
      return;
    }
    throw error;
  }
}

test(
  'SCRUM-110: migration 0005 free-text fields survive a real PostgreSQL roundtrip',
  async () => {
    assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a disposable PostgreSQL database');
    const schema = `eventlifecycle_${randomUUID().replaceAll('-', '')}`;
    const db = new Client({ connectionString: process.env.TEST_DATABASE_URL });
    await db.connect();

    try {
      await createExtensionIfNotExists(db, 'pgcrypto');
      await createExtensionIfNotExists(db, 'btree_gist');
      await db.query(`CREATE SCHEMA ${schema}`);
      await db.query(`SET search_path TO ${schema}, public`);
      // 0005 depends only on 0001's base events table -- no other migration
      // in the chain touches the four columns this test asserts on.
      for (const migration of ['0001_connectsphere_schema.sql', '0005_event_request_fields.sql']) {
        await db.query(await readFile(new URL(`../database/migrations/${migration}`, import.meta.url), 'utf8'));
      }

      const org = randomUUID();
      const organiser = randomUUID();
      await db.query('INSERT INTO client_organisations (id, name) VALUES ($1, $2)', [org, 'Test client']);
      await db.query(
        `INSERT INTO users (id, client_org_id, email, password_hash, full_name, role)
         VALUES ($1, $2, 'organiser@example.test', 'unused', 'Organiser', 'event_organiser')`,
        [organiser, org],
      );

      // Point the app's process-wide DATABASE_URL singleton at this disposable
      // schema before importing anything that transitively reaches config.ts.
      const testDatabaseUrl = process.env.TEST_DATABASE_URL!;
      const separator = testDatabaseUrl.includes('?') ? '&' : '?';
      process.env.DATABASE_URL = `${testDatabaseUrl}${separator}options=-c%20search_path%3D${schema},public`;

      const { createEventRequest, NONE_REQUIRED } = await import('../src/modules/eventLifecycle/service.js');
      const { PostgresEventLifecycleRepository } = await import('../src/modules/eventLifecycle/repository.js');
      const repository = new PostgresEventLifecycleRepository();

      // Scenario 1: real free-text values in all four migration-0005 columns.
      const startAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const endAt = new Date(startAt.getTime() + 3 * 60 * 60 * 1000);
      const created = await createEventRequest(repository, {
        title: 'SCRUM-110 roundtrip event',
        organiserId: organiser,
        clientOrgId: org,
        status: 'submitted',
        startAt,
        endAt,
        expectedAttendance: 40,
        description: 'A description long enough to satisfy the mandatory field.',
        purpose: 'A stated purpose for the event.',
        accessibilityNote: 'No specific accessibility needs recorded.',
        venueRequirements: 'Ground floor, wheelchair accessible entrance',
        equipmentRequirements: 'Two wireless microphones, one projector',
        layoutPreference: 'Theatre seating facing the main screen',
        registrationSetup: 'Open registration, no approval needed',
      });

      const fetched = await repository.findEventById(created.id);
      assert.ok(fetched, 'the created event must be readable back by id');
      assert.equal(fetched.venueRequirements, 'Ground floor, wheelchair accessible entrance');
      assert.equal(fetched.equipmentRequirements, 'Two wireless microphones, one projector');
      assert.equal(fetched.layoutPreference, 'Theatre seating facing the main screen');
      assert.equal(fetched.registrationSetup, 'Open registration, no approval needed');
      assert.equal(fetched.status, 'submitted');

      // Scenario 2 (T-11): the NONE_REQUIRED sentinel round-trips literally --
      // it is stored and read back as the sentinel string, not coerced to
      // null/undefined, so the UI can distinguish "explicitly none required"
      // from "field left blank."
      const startAt2 = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
      const endAt2 = new Date(startAt2.getTime() + 2 * 60 * 60 * 1000);
      const createdNoneRequired = await createEventRequest(repository, {
        title: 'SCRUM-110 none-required roundtrip event',
        organiserId: organiser,
        clientOrgId: org,
        status: 'submitted',
        startAt: startAt2,
        endAt: endAt2,
        expectedAttendance: 10,
        description: 'A description long enough to satisfy the mandatory field.',
        purpose: 'A stated purpose for the event.',
        accessibilityNote: 'No specific accessibility needs recorded.',
        venueRequirements: 'A small meeting room',
        equipmentRequirements: NONE_REQUIRED,
        layoutPreference: NONE_REQUIRED,
        registrationSetup: NONE_REQUIRED,
      });

      const fetchedNoneRequired = await repository.findEventById(createdNoneRequired.id);
      assert.ok(fetchedNoneRequired, 'the none-required event must be readable back by id');
      assert.equal(fetchedNoneRequired.equipmentRequirements, NONE_REQUIRED);
      assert.equal(fetchedNoneRequired.layoutPreference, NONE_REQUIRED);
      assert.equal(fetchedNoneRequired.registrationSetup, NONE_REQUIRED);
    } finally {
      await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await db.end();
    }
  },
);
