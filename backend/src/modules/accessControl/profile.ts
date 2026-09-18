import type { AuthenticatedUser } from './types.js';
import { canActAsRole } from './service.js';
import { USER_ROLES } from '../shared/roles.js';
import { AccessError, type Query } from '../eventVisibility/service.js';

export type Profile = {
  id: string; full_name: string; email: string; contact_number: string | null;
  client_org_id: string | null; organisation_name: string | null;
};
export type ProfileInput = Pick<Profile, 'full_name' | 'email'> & { contact_number: string };
export type ProfileRepository = {
  load(userId: string): Promise<Profile | null>;
  update(userId: string, input: ProfileInput): Promise<Profile | null>;
};
export class ProfileValidationError extends AccessError {
  constructor(public errors: Record<string, string[]>, status = 400) {
    super(status, 'Please correct the highlighted fields.');
  }
}

export function requireProfileUser(user: AuthenticatedUser | undefined): asserts user is AuthenticatedUser {
  if (!user) throw new AccessError(401, 'Sign in to continue.');
  if (!canActAsRole(user, USER_ROLES).allowed) throw new AccessError(403, 'Access denied.');
}

// E14-S02 Scenario 2: requireProfileUser must stay a synchronous assertion
// function for its type-narrowing to work, so the audit write for its 403
// branch lives here instead, wrapping it rather than being folded into it.
async function requireProfile(query: Query, user: AuthenticatedUser | undefined): Promise<AuthenticatedUser> {
  try {
    requireProfileUser(user);
    return user;
  } catch (error) {
    if (user && error instanceof AccessError && error.status === 403) {
      await query(`INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, new_value)
        VALUES ($1, 'screen', gen_random_uuid(), 'Access Denied', 'profile')`, [user.id]);
    }
    throw error;
  }
}

export function validateProfile(body: unknown): ProfileInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ProfileValidationError({ form: ['Submit your name, email and contact number.'] });
  }
  const data = body as Record<string, unknown>;
  const errors: Record<string, string[]> = {};
  const labels = { full_name: 'Name', email: 'Email', contact_number: 'Contact number' };
  for (const field of Object.keys(data)) {
    if (!Object.hasOwn(labels, field)) errors[field] = ['This field cannot be changed through your profile.'];
  }
  for (const [field, label] of Object.entries(labels)) {
    if (typeof data[field] !== 'string' || !(data[field] as string).trim()) errors[field] = [`${label} is required`];
  }
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  if (!errors.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255)) {
    errors.email = ['Please enter a valid email address'];
  }
  for (const [field, limit] of [['full_name', 160], ['contact_number', 32]] as const) {
    if (!errors[field] && (data[field] as string).trim().length > limit) errors[field] = [`${labels[field]} must be at most ${limit} characters.`];
  }
  if (Object.keys(errors).length) throw new ProfileValidationError(errors);
  return { full_name: (data.full_name as string).trim(), email, contact_number: (data.contact_number as string).trim() };
}

export async function loadProfile(query: Query, repository: ProfileRepository, user: AuthenticatedUser | undefined) {
  const authorized = await requireProfile(query, user);
  const profile = await repository.load(authorized.id);
  if (!profile) throw new AccessError(403, 'Profile unavailable.');
  return profile;
}

export async function updateProfile(query: Query, repository: ProfileRepository, user: AuthenticatedUser | undefined, body: unknown) {
  const authorized = await requireProfile(query, user);
  const input = validateProfile(body);
  const profile = await repository.update(authorized.id, input);
  if (!profile) throw new AccessError(403, 'Profile unavailable.');
  return profile;
}
