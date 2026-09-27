// E03 targeted workflow notices share E11's transactional, idempotent writer.
// Supply the durable change ID when the notice also covers a generic change.
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { writeEventNotification } from '../eventNotifications/service.js';

export async function notifyUser(client: PoolClient, notification: {
  userId: string; eventId: string; title: string; message: string;
  changeId?: string; occurredAt?: Date;
}): Promise<void> {
  await writeEventNotification(client, {...notification,
    changeId:notification.changeId ?? randomUUID(), occurredAt:notification.occurredAt ?? new Date()});
}
