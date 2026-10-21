import type { PoolClient } from 'pg';
import { writeEventNotification } from '../eventNotifications/service.js';

// E11-S01: event-level equipment responsibilities. Venue membership comes
// from explicit setup assignments, never equipment storage or decided_by.
// Capture before release; historical, already-released staff are not recipients.
export async function equipmentStaffRecipients(client: PoolClient, eventId: string, actorId: string) {
  const { rows } = await client.query<{ id: string }>(`SELECT DISTINCT u.id FROM users u
    WHERE u.is_active AND u.id <> $2 AND (
      (u.role='technical_support_staff' AND EXISTS (
        SELECT 1 FROM tech_staff_assignments a WHERE a.event_id=$1 AND a.staff_id=u.id AND a.status='assigned'))
      OR (u.role='venue_staff' AND EXISTS (
        SELECT 1 FROM venue_bookings b JOIN venue_staff_assignments a ON a.venue_id=b.venue_id
        WHERE b.event_id=$1 AND b.status IN ('pending','confirmed') AND a.staff_id=u.id
          AND a.active_from <= now() AND (a.active_until IS NULL OR a.active_until > now())))
    ) ORDER BY u.id`, [eventId, actorId]);
  return rows.map(row => row.id);
}

export async function notifyEquipmentStaff(client: PoolClient, input: {
  eventId: string; actorId: string; changeId: string; occurredAt: Date;
  title: string; message: string; recipients?: readonly string[];
}) {
  const recipients = input.recipients ?? await equipmentStaffRecipients(client, input.eventId, input.actorId);
  for (const userId of new Set(recipients)) {
    if (userId === input.actorId) continue;
    await writeEventNotification(client, {
      eventId: input.eventId, changeId: input.changeId, occurredAt: input.occurredAt,
      userId, title: input.title, message: `${input.message} Changed at ${input.occurredAt.toISOString()}.`,
    });
  }
}
