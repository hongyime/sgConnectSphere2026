import { hashPassword, passwordPolicyErrors } from './password.js';

export type RegistrationInput = {
  full_name: string;
  email: string;
  password: string;
  contact_number: string;
};
export type RegistrationErrors = Record<string, string[]>;
export type PublicAccount = { id: string; email: string; role: 'attendee' };
export type AccountInsert = Omit<RegistrationInput, 'password'> & { password_hash: string };
export type AccountRepository = {
  createAttendee(input: AccountInsert): Promise<PublicAccount | null>;
};

export function validateRegistration(body: unknown):
  | { input: RegistrationInput; errors?: never }
  | { errors: RegistrationErrors; input?: never } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: { form: ['Submit an object containing the required registration fields.'] } };
  }
  const data = body as Record<string, unknown>;
  const errors: RegistrationErrors = {};
  const labels = { full_name: 'Name', email: 'Email', password: 'Password', contact_number: 'Contact number' }; // pragma: allowlist secret - field display labels
  for (const [field, label] of Object.entries(labels)) {
    if (typeof data[field] !== 'string' || !(data[field] as string).trim()) {
      errors[field] = [`${label} is required`];
    }
  }
  if (Object.hasOwn(data, 'role')) errors.role = ['Role cannot be supplied during public registration.'];
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  if (!errors.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255)) {
    errors.email = ['Enter a valid email address of at most 255 characters.'];
  }
  for (const [field, limit] of [['full_name', 160], ['contact_number', 32]] as const) {
    if (!errors[field] && (data[field] as string).trim().length > limit) {
      errors[field] = [`${labels[field]} must be at most ${limit} characters.`];
    }
  }
  if (!errors.password) {
    const password = data.password as string;
    const messages = passwordPolicyErrors(password);
    if (messages.length) errors.password = messages;
  }
  if (Object.keys(errors).length) return { errors };
  return { input: {
    full_name: (data.full_name as string).trim(), email,
    password: data.password as string, contact_number: (data.contact_number as string).trim(),
  } };
}

export async function registerAccount(body: unknown, repository: AccountRepository) {
  const validated = validateRegistration(body);
  if (validated.errors) return { status: 400, body: { error: 'validation_failed', errors: validated.errors } };
  const { password, ...details } = validated.input;
  const account = await repository.createAttendee({ ...details, password_hash: await hashPassword(password) });
  if (!account) return { status: 409, body: {
    error: 'email_in_use', errors: { email: ['This email address is already in use'] },
  } };
  return { status: 201, body: { account } };
}
