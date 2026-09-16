import type { AuthenticatedUser } from './types.js';
import { canActAsRole } from './service.js';
import { USER_ROLES } from '../shared/roles.js';
import { AccessError } from '../eventVisibility/service.js';

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

export async function loadProfile(repository: ProfileRepository, user: AuthenticatedUser | undefined) {
  requireProfileUser(user);
  const profile = await repository.load(user.id);
  if (!profile) throw new AccessError(403, 'Profile unavailable.');
  return profile;
}

export async function updateProfile(repository: ProfileRepository, user: AuthenticatedUser | undefined, body: unknown) {
  requireProfileUser(user);
  const input = validateProfile(body);
  const profile = await repository.update(user.id, input);
  if (!profile) throw new AccessError(403, 'Profile unavailable.');
  return profile;
}
