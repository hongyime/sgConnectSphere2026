// E02-S03: unit tests for the accessibility matching primitive
// (backend/src/modules/venueBooking/matchAccessibility.ts). Covers match,
// partial-match and no-match directly against a hand-rolled Query stub -
// see venueCatalogue.test.ts for the combined searchVenues() coverage, and
// venueAccessibility.integration.test.ts for the real-Postgres version.

import test from 'node:test';
import assert from 'node:assert/strict';
import { listAccessibilityFeatures, matchVenuesByAccessibility } from '../src/modules/venueBooking/matchAccessibility';
import type { Query } from '../src/modules/eventVisibility/service';
import type { AuthenticatedUser } from '../src/modules/accessControl/types';

const organiser: AuthenticatedUser = { id: 'organiser-1', email: 'organiser@example.test', role: 'event_organiser', isActive: true, failedLoginCount: 0 };

// A minimal in-memory model of venues -> the accessibility feature ids they
// support, queried the same way the real relational-division SQL would
// answer it: a venue matches only if every requested id is present.
function makeAccessibilityQuery(venueFeatures: Record<string, string[]>): Query {
  return async (sql, values) => {
    if (sql.includes('FROM venues v')) {
      const [featureIds] = values as [string[]];
      const ids = Object.entries(venueFeatures)
        .filter(([, features]) => featureIds.every(id => features.includes(id)))
        .map(([id]) => id);
      return { rows: ids.map(id => ({ id })) as never[] };
    }
    throw new Error(`Unexpected query: ${sql}`);
  };
}

test('matchVenuesByAccessibility returns a venue that supports every requested feature', async () => {
  const query = makeAccessibilityQuery({
    'venue-a': ['wheelchair-access', 'hearing-loop'],
    'venue-b': ['wheelchair-access'],
  });
  const matches = await matchVenuesByAccessibility(query, ['wheelchair-access', 'hearing-loop']);
  assert.deepEqual(matches, ['venue-a']);
});

test('matchVenuesByAccessibility excludes a venue that only partially supports the requested features', async () => {
  const query = makeAccessibilityQuery({
    'venue-a': ['wheelchair-access'],
  });
  const matches = await matchVenuesByAccessibility(query, ['wheelchair-access', 'hearing-loop']);
  assert.deepEqual(matches, []);
});

test('matchVenuesByAccessibility returns nothing when no venue supports any requested feature', async () => {
  const query = makeAccessibilityQuery({
    'venue-a': ['step-free-access'],
  });
  const matches = await matchVenuesByAccessibility(query, ['wheelchair-access']);
  assert.deepEqual(matches, []);
});

test('matchVenuesByAccessibility with no requested ids matches nothing without querying', async () => {
  const query: Query = async () => { throw new Error('should not query with an empty feature id list'); };
  const matches = await matchVenuesByAccessibility(query, []);
  assert.deepEqual(matches, []);
});

test('listAccessibilityFeatures requires a signed-in user', async () => {
  const query: Query = async () => { throw new Error('should not query without a user'); };
  await assert.rejects(listAccessibilityFeatures(query, undefined), { status: 401 });
});

test('listAccessibilityFeatures returns the vocabulary for any signed-in user, including an organiser', async () => {
  const features = [{ id: 'f-1', code: 'wheelchair_access', label: 'Wheelchair access' }];
  const query: Query = async sql => {
    if (sql.includes('FROM accessibility_features')) return { rows: features as never[] };
    throw new Error(`Unexpected query: ${sql}`);
  };
  const result = await listAccessibilityFeatures(query, organiser);
  assert.deepEqual(result, features);
});
