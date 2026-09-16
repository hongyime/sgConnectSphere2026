import type { Query } from '../eventVisibility/service.js';
import { ProfileValidationError, type Profile, type ProfileRepository } from './profile.js';

const projection = `u.id, u.full_name, u.email, u.contact_number, u.client_org_id, o.name AS organisation_name`;
const active = `u.is_active AND u.failed_login_count < 5 AND (u.locked_until IS NULL OR u.locked_until <= now())`;

export function createProfileRepository(query: Query): ProfileRepository {
  return {
    async load(userId) {
      const result = await query<Profile>(`SELECT ${projection} FROM users u
        LEFT JOIN client_organisations o ON o.id = u.client_org_id
        WHERE u.id = $1 AND ${active}`, [userId]);
      return result.rows[0] ?? null;
    },
    async update(userId, input) {
      try {
        const result = await query<Profile>(`WITH updated AS (
          UPDATE users u SET full_name = $2, email = $3, contact_number = $4
          WHERE u.id = $1 AND ${active} RETURNING u.id, u.full_name, u.email, u.contact_number, u.client_org_id
        ) SELECT ${projection} FROM updated u
          LEFT JOIN client_organisations o ON o.id = u.client_org_id`,
        [userId, input.full_name, input.email.trim().toLowerCase(), input.contact_number]);
        return result.rows[0] ?? null;
      } catch (error) {
        const failure = error as { code?: string; constraint?: string };
        if (failure.code === '23505' && ['users_email_key', 'users_email_normalized_key', 'users_email_case_insensitive_idx'].includes(failure.constraint ?? '')) {
          throw new ProfileValidationError({ email: ['This email address is already in use'] }, 409);
        }
        throw error;
      }
    },
  };
}
