import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$131072$8$1$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const match = /^scrypt\$131072\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(hash);
  // Unknown accounts pay the same scrypt cost as registered accounts.
  const key = await derive(password, Buffer.from(match?.[1] ?? '0'.repeat(32), 'hex'));
  if (match) return timingSafeEqual(key, Buffer.from(match[2], 'hex'));
  // Retain compatibility with older seeded accounts; all writes use hashPassword.
  const legacy = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(hash);
  if (!legacy) return false;
  const legacyKey = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, legacy[1], 64, (error, result) => error ? reject(error) : resolve(result));
  });
  return timingSafeEqual(legacyKey, Buffer.from(legacy[2], 'hex'));
}

export function passwordPolicyErrors(password: string): string[] {
  const errors: string[] = [];
  if ([...password].length < 12) errors.push('Password must be at least 12 characters.');
  if (!/[A-Z]/.test(password)) errors.push('Password must include at least one uppercase letter.');
  if (!/[0-9]/.test(password)) errors.push('Password must include at least one number.');
  if (!/[\p{P}\p{S}]/u.test(password)) errors.push('Password must include at least one special character.');
  return errors;
}
