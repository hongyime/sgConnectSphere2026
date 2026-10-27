import { expect, test } from 'vitest';
import { lostVenueRecoveryState } from './lostVenueRecoveryState';
type Booking = { id: string; status: string; has_replacement?: boolean; replaces_booking_id?: string };

test('TC_E10S05_03: released branches and their descendants do not hold a recovery slot', () => {
  const root: Booking={id:'root',status:'conflicting',has_replacement:false};
  const rows=[root,{id:'released',status:'released',replaces_booking_id:'root'},{id:'detached',status:'pending',replaces_booking_id:'released'}];
  expect(lostVenueRecoveryState(rows,root)).toEqual({replacements:[],canRequest:true});
});

test('TC_E10S05_03: chain traversal handles reverse ordering, cycles and active descendants', () => {
  const root: Booking={id:'root',status:'conflicting',has_replacement:true};
  const rows=[{id:'leaf',status:'pending',replaces_booking_id:'middle'},{id:'middle',status:'rejected',replaces_booking_id:'root'},root];
  expect(lostVenueRecoveryState(rows,root).replacements.map(b=>b.id)).toEqual(['middle','leaf']);
  expect(lostVenueRecoveryState(rows,root).canRequest).toBe(false);
  expect(lostVenueRecoveryState([{id:'root',status:'rejected',replaces_booking_id:'root'}],root).replacements).toEqual([]);
  expect(lostVenueRecoveryState([root],root).canRequest).toBe(false);
});
