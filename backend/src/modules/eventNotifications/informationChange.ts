import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { AccessError, updateEventInformation, type Query } from '../eventVisibility/service.js';
import { assertEditableAfterDecision } from '../eventLifecycle/decision.js';
import { assessArrangementImpact, loadArrangementSnapshot } from '../changeManagement/arrangementImpact.js';
import { applyArrangementImpact, ArrangementsChangedError, loadOverSubscription, withRevision } from '../changeManagement/eventChange.js';
import { captureEventAudience, notifyEventChange, type NotificationOptions } from './service.js';

// Existing E03-S06 edit behaviour, now atomic with its audit and E11 deliveries.
// SCRUM-71 (E10-S02) flags the confirmed Session arrangements the saved edit
// affects, in the same transaction, and returns them with any
// over-subscription. E10-S01 reuses the transaction-aware variant below.
// `reviewed` is the preview's revision: when given and the save's own check
// differs, the whole edit rolls back before anything is flagged or sent.
export async function updateEventInformationWithNotifications(
  pool: Pool, user: AuthenticatedUser, identifier: string, input: unknown, options: NotificationOptions & { reviewed?: string } = {},
) {
  return inTransaction(pool, client => updateEventInformationWithNotificationsWith(client, user, identifier, input, options));
}

// Reuse the caller's transaction: change-request status, stale validation,
// Event edits, arrangement flags and outbox writes must commit together.
export async function updateEventInformationWithNotificationsWith(
  client: PoolClient, user: AuthenticatedUser, identifier: string, input: unknown, options: NotificationOptions & { reviewed?: string } = {},
  decisionRecipientId?: string,
) {
  const event = (await client.query<{ id: string }>(
    'SELECT id FROM events WHERE id::text=$1 OR event_code=$1 FOR UPDATE', [identifier])).rows[0];
  if (!event) throw new AccessError(403, 'Edit access denied.');
  const before = await captureEventAudience(client, event.id, options);
  const query: Query = (sql, values) => client.query(sql, values);
  await assertEditableAfterDecision(query, user, event.id); // SCRUM-34 (E03-S03, D11): rejected is read-only, checked under the row lock
  const arrangementsBefore = await loadArrangementSnapshot(query, event.id);
  const result = await updateEventInformation(query, user, identifier, input, decisionRecipientId !== undefined);
  const arrangementsAfter = await loadArrangementSnapshot(query, event.id);
  const impact = assessArrangementImpact(arrangementsBefore, arrangementsAfter);
  const overSubscription = await loadOverSubscription(query, event.id);
  const check = withRevision({ impact, overSubscription });
  if (options.reviewed !== undefined && options.reviewed !== check.revision) throw new ArrangementsChangedError(check);
  await applyArrangementImpact(query, user.id, event.id, impact);
  const after = await captureEventAudience(client, event.id, options);
  const dateChanged = after.status!=='draft' && (before.startsAt!==after.startsAt || before.endsAt!==after.endsAt);
  if (impact.affected || dateChanged) {
    // One change ID for the edit: staff who get the specific reconfirmation
    // notice below are not sent the generic date notice as well.
    const changeId = randomUUID();
    const changedAt = (await client.query<{ now: Date }>('SELECT transaction_timestamp() AS now')).rows[0].now;
    if (impact.affected) {
      const audience = await captureEventAudience(client, event.id, options, [...new Set(impact.bookings.map(booking => booking.venueId))]);
      // T-103: with no equipment flagged, only the technicians assigned to a
      // flagged support request must reconfirm, so only they are told.
      const technicalStaff = impact.reservations.length ? audience.technicalStaff : impact.supports.length
        ? (await client.query<{ staff_id: string }>(
          `SELECT DISTINCT staff_id FROM tech_staff_assignments WHERE request_id = ANY($1::uuid[]) AND status = 'assigned'`,
          [impact.supports.map(support => support.id)])).rows.map(row => row.staff_id).filter(id => audience.technicalStaff.includes(id))
        : [];
      const staff = { ...audience, technicalStaff };
      await notifyEventChange(client, { changeId, occurredAt: changedAt, actorId: user.id, before: staff, after: staff,
        change: { kind: 'reconfirmation_required', venueAffected: impact.bookings.length > 0,
          technicalAffected: impact.reservations.length > 0 || impact.supports.length > 0,
          reasons: [...impact.bookings, ...impact.reservations, ...impact.supports].flatMap(item => item.reasons) } });
    }
    if (dateChanged) await notifyEventChange(client, { changeId, occurredAt: changedAt, actorId: user.id,
      before: { ...before, organiser: before.organiser.filter(id => id !== decisionRecipientId) },
      after: { ...after, organiser: after.organiser.filter(id => id !== decisionRecipientId) },
      change: { kind: 'arrangements', fields: ['date','time'] } });
  }
  return { ...result, ...check };
}
