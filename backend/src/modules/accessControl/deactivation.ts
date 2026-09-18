import type { Pool } from 'pg';
import { inTransaction } from '../../database/pool.js';
import { AccessError } from '../eventVisibility/service.js';
import type { AuthenticatedUser } from './types.js';

export const DEACTIVATION_BLOCKING_STATUSES = [
  'submitted', 'under_review', 'awaiting_clarification', 'approved', 'planning', 'confirmed',
] as const;

export class DeactivationBlockedError extends AccessError {
  constructor(public events: { id: string; title: string; event_code: string | null }[]) {
    super(409, 'Reassign your active events before deactivating your account.');
  }
}

export async function deactivateAccount(database: Pool, user: AuthenticatedUser, body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || (body as Record<string, unknown>).confirm !== true
    || Object.keys(body).some(key => key !== 'confirm')) {
    throw new AccessError(400, 'Confirm deactivation without supplying account or role fields.');
  }
  return inTransaction(database, async client => {
    // Shared with login's row lock: a concurrent login either completes before
    // session revocation or observes the inactive account after this commits.
    const result = await client.query<{ id: string; role: string; is_active: boolean }>(
      'SELECT id, role, is_active FROM users WHERE id = $1 FOR UPDATE', [user.id]);
    const account = result.rows[0];
    if (!account) throw new AccessError(401, 'Sign in to continue.');
    if (!account.is_active) throw new AccessError(409, 'Your account is already deactivated.');

    if (account.role === 'event_coordinator') {
      const assigned = await client.query<{ id: string; title: string; event_code: string | null }>(`
        SELECT id, title, event_code FROM events
        WHERE coordinator_id = $1 AND status = ANY($2::event_status[])
        ORDER BY id FOR UPDATE`, [account.id, DEACTIVATION_BLOCKING_STATUSES]);
      if (assigned.rows.length) throw new DeactivationBlockedError(assigned.rows);
    }

    let withdrawn = 0;
    if (account.role === 'attendee') {
      // T-53: equality at the start boundary is historical, not upcoming.
      // T-54/T-55: no deadline predicate; withdraw waitlisted entries as well.
      const registrations = await client.query(`
        UPDATE event_registrations r SET status = 'withdrawn', withdrawn_at = now()
        FROM events e WHERE r.event_id = e.id AND r.attendee_id = $1
          AND r.status IN ('registered', 'waitlisted') AND lower(e.event_range) > now()
        RETURNING r.id`, [account.id]);
      withdrawn = registrations.rowCount ?? 0;
    }
    await client.query('UPDATE users SET is_active = false, deactivated_at = now() WHERE id = $1', [account.id]);
    await client.query('DELETE FROM auth_sessions WHERE user_id = $1', [account.id]);
    await client.query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, occurred_at)
      VALUES ($1, 'user', $1, 'Account Deactivated', now())`, [account.id]);
    return { deactivated: true, signedOut: true, withdrawnRegistrations: withdrawn };
  });
}
