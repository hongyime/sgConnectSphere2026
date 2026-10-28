import test from 'node:test';
import assert from 'node:assert/strict';
import { currentUser } from '../src/modules/eventVisibility/runtime.js';
import { hasInternalSecret } from '../src/http.js';
import { AccessError, type Query } from '../src/modules/eventVisibility/service.js';
import type { VercelRequest } from '../src/vercel.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

const VALID_TOKEN = 'a'.repeat(64);

function createMockRequest(cookieValue?: string): VercelRequest {
  return {
    headers: {
      cookie: cookieValue ? `cs_access=${cookieValue}` : undefined,
    },
  } as unknown as VercelRequest;
}

test('currentUser: rejects request with missing session cookie with 401', async () => {
  const req = createMockRequest();
  await assert.rejects(
    currentUser(req),
    (err: unknown) => err instanceof AccessError && err.status === 401 && err.message === 'Sign in to continue.',
  );
});

test('currentUser: rejects request with malformed session token with 401', async () => {
  const req = createMockRequest('not-a-valid-hex-token');
  await assert.rejects(
    currentUser(req),
    (err: unknown) => err instanceof AccessError && err.status === 401 && err.message === 'Sign in to continue.',
  );
});

test('currentUser: rejects expired or non-existent session with 401', async () => {
  const req = createMockRequest(VALID_TOKEN);
  const mockQuery: Query = async () => ({ rows: [] });
  await assert.rejects(
    currentUser(req, mockQuery),
    (err: unknown) => err instanceof AccessError && err.status === 401 && err.message === 'Your session has expired. Please sign in again.',
  );
});

test('currentUser: rejects inactive account (isActive = false) with 403', async () => {
  const req = createMockRequest(VALID_TOKEN);
  const inactiveUser: AuthenticatedUser = {
    id: 'user-inactive-1',
    email: 'inactive@example.test',
    role: 'attendee',
    isActive: false,
    failedLoginCount: 0,
    lockedUntil: undefined,
  };
  const mockQuery: Query = async () => ({ rows: [inactiveUser] });

  await assert.rejects(
    currentUser(req, mockQuery),
    (err: unknown) => err instanceof AccessError && err.status === 403 && err.message === 'Account is inactive.',
  );
});

test('currentUser: returns user when account is active even if lockedUntil is in the future (does not kill existing session)', async () => {
  const req = createMockRequest(VALID_TOKEN);
  const lockedUser: AuthenticatedUser = {
    id: 'user-locked-1',
    email: 'locked@example.test',
    role: 'attendee',
    isActive: true,
    failedLoginCount: 5,
    lockedUntil: new Date(Date.now() + 1000 * 60 * 15), // locked for 15 more minutes
  };
  const mockQuery: Query = async () => ({ rows: [lockedUser] });

  const user = await currentUser(req, mockQuery);
  assert.equal(user.id, 'user-locked-1');
  assert.equal(user.isActive, true);
});

test('currentUser: rejects account that is both inactive and locked with 403 Account is inactive', async () => {
  const req = createMockRequest(VALID_TOKEN);
  const lockedInactiveUser: AuthenticatedUser = {
    id: 'user-locked-inactive-1',
    email: 'locked-inactive@example.test',
    role: 'attendee',
    isActive: false,
    failedLoginCount: 5,
    lockedUntil: new Date(Date.now() + 1000 * 60 * 15),
  };
  const mockQuery: Query = async () => ({ rows: [lockedInactiveUser] });

  await assert.rejects(
    currentUser(req, mockQuery),
    (err: unknown) => err instanceof AccessError && err.status === 403 && err.message === 'Account is inactive.',
  );
});

test('currentUser: returns user when account is active and lock is expired (lockedUntil <= now)', async () => {
  const req = createMockRequest(VALID_TOKEN);
  const expiredLockUser: AuthenticatedUser = {
    id: 'user-expired-lock-1',
    email: 'expired-lock@example.test',
    role: 'event_organiser',
    isActive: true,
    failedLoginCount: 5,
    lockedUntil: new Date(Date.now() - 1000 * 60), // expired 1 minute ago
  };
  const mockQuery: Query = async () => ({ rows: [expiredLockUser] });

  const user = await currentUser(req, mockQuery);
  assert.equal(user.id, 'user-expired-lock-1');
  assert.equal(user.isActive, true);
  assert.equal(user.role, 'event_organiser');
});

test('currentUser: returns user when account is active and never locked (lockedUntil undefined)', async () => {
  const req = createMockRequest(VALID_TOKEN);
  const activeUser: AuthenticatedUser = {
    id: 'user-active-1',
    email: 'active@example.test',
    role: 'event_coordinator',
    isActive: true,
    failedLoginCount: 0,
    lockedUntil: undefined,
  };
  const mockQuery: Query = async () => ({ rows: [activeUser] });

  const user = await currentUser(req, mockQuery);
  assert.equal(user.id, 'user-active-1');
  assert.equal(user.isActive, true);
  assert.equal(user.role, 'event_coordinator');
});

test('hasInternalSecret: returns false for undefined, empty, or whitespace-only expectedSecret under development and production', () => {
  const originalEnv = process.env.NODE_ENV;
  try {
    for (const env of ['development', 'production', 'test']) {
      process.env.NODE_ENV = env;
      const requestWithValidSecret = {
        headers: {
          'x-internal-secret': 'super-secret-token', // pragma: allowlist secret
          authorization: 'Bearer super-secret-token', // pragma: allowlist secret
        },
      } as unknown as VercelRequest;

      // undefined
      assert.equal(hasInternalSecret(requestWithValidSecret, undefined), false);
      // empty string
      assert.equal(hasInternalSecret(requestWithValidSecret, ''), false);
      // whitespace-only
      assert.equal(hasInternalSecret(requestWithValidSecret, '   '), false);
      assert.equal(hasInternalSecret(requestWithValidSecret, '\t\n'), false);
    }
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

test('hasInternalSecret: authenticates valid secret via x-internal-secret header', () => {
  const validSecret = 'correct-internal-secret-123'; // pragma: allowlist secret
  const request = {
    headers: {
      'x-internal-secret': validSecret,
    },
  } as unknown as VercelRequest;

  assert.equal(hasInternalSecret(request, validSecret), true);
  assert.equal(hasInternalSecret(request, 'wrong-secret'), false);
});

test('hasInternalSecret: authenticates valid secret via Bearer token in authorization header', () => {
  const validSecret = 'bearer-internal-secret-456'; // pragma: allowlist secret
  const request = {
    headers: {
      authorization: `Bearer ${validSecret}`,
    },
  } as unknown as VercelRequest;

  assert.equal(hasInternalSecret(request, validSecret), true);
  assert.equal(hasInternalSecret(request, 'wrong-secret'), false);
});

test('hasInternalSecret: supports array header values', () => {
  const validSecret = 'multi-header-secret-789'; // pragma: allowlist secret
  const request = {
    headers: {
      'x-internal-secret': [validSecret, 'another-value'],
      authorization: [`Bearer ${validSecret}`],
    },
  } as unknown as VercelRequest;

  assert.equal(hasInternalSecret(request, validSecret), true);
});

test('hasInternalSecret: rejects when headers are missing or mismatched', () => {
  const validSecret = 'secret-token'; // pragma: allowlist secret
  const emptyRequest = {
    headers: {},
  } as unknown as VercelRequest;

  assert.equal(hasInternalSecret(emptyRequest, validSecret), false);

  const mismatchedRequest = {
    headers: {
      'x-internal-secret': 'different-token', // pragma: allowlist secret
      authorization: 'Bearer different-token', // pragma: allowlist secret
    },
  } as unknown as VercelRequest;

  assert.equal(hasInternalSecret(mismatchedRequest, validSecret), false);
});
