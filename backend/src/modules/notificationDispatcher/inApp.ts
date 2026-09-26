// In-app notification rows for workflow events (E03 "X is notified").
//
// E11-S01 (SCRUM-75) owns full notification delivery and has no backend yet,
// so E03 stories write the in-app `notifications` row directly, the same way
// event comments already do (eventVisibility/service.ts). Every E03 caller
// goes through this one helper so E11 can later add email/outbox delivery in
// a single place. Callers pass their transaction client so the notification
// commits or rolls back with the change it announces.

type SqlRunner = { query: (sql: string, values?: unknown[]) => Promise<unknown> };

export async function notifyUser(
  runner: SqlRunner,
  notification: { userId: string; eventId: string | null; title: string; message: string },
): Promise<void> {
  await runner.query(
    `INSERT INTO notifications (user_id, event_id, title, message, is_read)
     VALUES ($1, $2, $3, $4, false)`,
    [notification.userId, notification.eventId, notification.title, notification.message],
  );
}
