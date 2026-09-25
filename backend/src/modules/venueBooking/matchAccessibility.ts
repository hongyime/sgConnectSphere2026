import type { AuthenticatedUser } from '../accessControl/types.js';
import { AccessError, type Query } from '../eventVisibility/service.js';

// E02-S03 / BDR T-13: event requests and venue records share one predefined
// accessibility vocabulary (the accessibility_features table). This module
// is the matching primitive only - given a set of requested feature ids,
// which venues support every one of them. It does not aggregate suitability
// across other dimensions (layout, capacity, ...); that combination belongs
// to E06-S02, which is out of scope here per the Jira ticket's guardrail.

// Shared by matchVenuesByAccessibility() below and searchVenues() in
// catalogue.ts, so the two never drift apart. $<paramIndex> must bind a
// uuid[] of the requested feature ids. Relational division: a venue matches
// only if no requested feature is missing from its own accessibility links
// (AND semantics - E02-S03 Scenario 3 treats a venue missing even one
// required feature as unsuitable).
export function accessibilityMatchCondition(paramIndex: number): string {
  return `NOT EXISTS (
    SELECT 1 FROM unnest($${paramIndex}::uuid[]) AS required(feature_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM venue_accessibility_features vaf
      WHERE vaf.venue_id = v.id AND vaf.feature_id = required.feature_id
    )
  )`;
}

// Standalone primitive for direct unit testing and future reuse (e.g.
// E06-S02): given feature ids, returns the ids of active venues supporting
// all of them. An empty input matches nothing - there is no meaningful "any
// venue satisfies zero requirements" case for a caller of this primitive.
export async function matchVenuesByAccessibility(query: Query, featureIds: string[]): Promise<string[]> {
  if (featureIds.length === 0) return [];
  const result = await query<{ id: string }>(`
    SELECT v.id FROM venues v
    WHERE v.is_active AND ${accessibilityMatchCondition(1)}
    ORDER BY v.name
  `, [featureIds]);
  return result.rows.map(row => row.id);
}

export type AccessibilityFeature = { id: string; code: string; label: string };

// Reference/vocabulary data, not sensitive - any signed-in user may list it
// (the organiser checklist needs it, and organisers are not catalogue
// viewers). Still requires a session so an anonymous caller gets a 401 like
// every other endpoint.
export async function listAccessibilityFeatures(
  query: Query,
  user: AuthenticatedUser | undefined,
): Promise<AccessibilityFeature[]> {
  if (!user) {
    throw new AccessError(401, 'Sign in to continue.');
  }
  const result = await query<AccessibilityFeature>(
    `SELECT id, code, label FROM accessibility_features ORDER BY label`,
  );
  return result.rows;
}
