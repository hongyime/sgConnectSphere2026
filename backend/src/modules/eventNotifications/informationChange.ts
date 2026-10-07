import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { inTransaction } from '../../database/pool.js';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { AccessError, updateEventInformation, type Query } from '../eventVisibility/service.js';
import { assertEditableAfterDecision } from '../eventLifecycle/decision.js';
import { captureEventAudience, notifyEventChange, type NotificationOptions } from './service.js';

// Existing E03-S06 edit behaviour, now atomic with its audit and E11 deliveries.
// This does not implement E10 approval/reconfirmation or venue-change workflows.
export async function updateEventInformationWithNotifications(
  pool: Pool, user: AuthenticatedUser, identifier: string, input: unknown, options: NotificationOptions = {},
) {
  return inTransaction(pool, async client => {
    const event = (await client.query<{ id: string }>(
      'SELECT id FROM events WHERE id::text=$1 OR event_code=$1 FOR UPDATE', [identifier])).rows[0];
    if (!event) throw new AccessError(403, 'Edit access denied.');
    const before = await captureEventAudience(client, event.id, options);
    const query: Query = (sql, values) => client.query(sql, values);
    await assertEditableAfterDecision(query, user, event.id); // SCRUM-34 (E03-S03, D11): rejected is read-only, checked under the row lock
    const result = await updateEventInformation(query, user, identifier, input);
    const after = await captureEventAudience(client, event.id, options);
    if (after.status!=='draft' && (before.startsAt!==after.startsAt || before.endsAt!==after.endsAt)) {
      const changedAt = (await client.query<{ now: Date }>('SELECT transaction_timestamp() AS now')).rows[0].now;
      await notifyEventChange(client, { changeId: randomUUID(), occurredAt: changedAt, actorId: user.id,
        before, after, change: { kind: 'arrangements', fields: ['date','time'] } });
    }
    return result;
  });
}
