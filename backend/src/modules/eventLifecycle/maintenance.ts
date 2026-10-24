// The phases commit independently; preserve completed expiry work on failure.
export async function runEventMaintenance(
  expire: () => Promise<{ holdsExpired: number; notified: number }>,
  complete: () => Promise<{ completed: number }>,
) {
  let holds;
  try { holds = await expire(); }
  catch { return { status: 503, body: { error: 'hold_expiry_unavailable' } }; }
  const committed = { holds_expired: holds.holdsExpired, notified: holds.notified };
  try {
    const completion = await complete();
    return { status: 200, body: { ...committed, events_completed: completion.completed } };
  } catch {
    return { status: 503, body: { ...committed, error: 'event_completion_unavailable' } };
  }
}
