import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { cancelLostVenueBooking } from '../src/modules/venueBooking/lostVenueRecovery.js';

const actor: AuthenticatedUser = { id: '00000000-0000-4000-8000-000000000001', role: 'event_coordinator', email: 'coordinator@example.test', isActive: true, failedLoginCount: 0 };
const database = { connect() { throw new Error('Guard must refuse before database access'); } } as unknown as Pool;

test('TC_E10S05_03: cancellation refuses anonymous callers before connecting', async () => {
  await assert.rejects(cancelLostVenueBooking(database,undefined,{}),{status:401});
});

test('TC_E10S05_03: cancellation refuses wrong-role, inactive and locked callers before connecting', async () => {
  for (const user of [{...actor,role:'venue_staff' as const},{...actor,isActive:false},{...actor,failedLoginCount:5}]) {
    await assert.rejects(cancelLostVenueBooking(database,user,{}),{status:403});
  }
});

test('TC_E10S05_03: cancellation refuses invalid identifiers before connecting', async () => {
  for (const body of [undefined,null,[],{},'invalid',{booking_id:4},{booking_id:''},{booking_id:'not-a-uuid'}]) {
    await assert.rejects(cancelLostVenueBooking(database,actor,body),{status:400});
  }
});
