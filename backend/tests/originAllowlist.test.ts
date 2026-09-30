// CSRF origin allowlist unit tests (fix/login-origin-allowlist).
//
// Before this change, `api/auth/session.ts` compared `request.headers.origin`
// to a single `APP_URL` string. Vercel serves the same production deployment
// under APP_URL, the project's own `<project>.vercel.app` alias, and unique
// preview hostnames per PR, so every browser except one hostname received a
// 403 with a generic "Access denied." message. See PR body for the four-row
// curl reproduction.
//
// These tests pin the new allowlist:
//   - APP_URL and PUBLIC_SITE_URL are both accepted (not just fallbacks).
//   - VERCEL_URL / VERCEL_PROJECT_PRODUCTION_URL derive an https origin.
//   - ADDITIONAL_ALLOWED_ORIGINS is an opt-in escape hatch, empty by default.
//   - Comparison normalises trailing slash and case.
//   - Substring/suffix spoofing (evil-vercel.app, *.vercel.app.attacker.com)
//     is rejected. Missing/empty Origin is rejected. Unset config fails closed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedOrigin, allowedOrigins, runtimeConfig } from '../src/config.js';

const ENV_KEYS = [
  'APP_URL',
  'PUBLIC_SITE_URL',
  'VERCEL_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
  'VERCEL_BRANCH_URL',
  'ADDITIONAL_ALLOWED_ORIGINS',
] as const;

// Save-and-restore fixture. `runtimeConfig.appUrl` is memoised at import time
// so the tests keep it in sync with APP_URL for each case.
function withEnv(overrides: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>, body: () => void) {
  const saved: Record<string, string | undefined> = {};
  const savedAppUrl = runtimeConfig.appUrl;
  const consoleWarn = console.warn;
  console.warn = () => {}; // Silence expected rejection logs.
  try {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      const value = overrides[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    runtimeConfig.appUrl = (process.env.APP_URL?.trim() || process.env.PUBLIC_SITE_URL?.trim()) || undefined;
    body();
  } finally {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key]!;
    }
    runtimeConfig.appUrl = savedAppUrl;
    console.warn = consoleWarn;
  }
}

test('accepts the configured APP_URL exactly', () => {
  withEnv({ APP_URL: 'https://sgconnectsphere.hong-yi.me' }, () => {
    assert.equal(isAllowedOrigin('https://sgconnectsphere.hong-yi.me'), true);
  });
});

test('accepts PUBLIC_SITE_URL as an additional allowed origin, not only as an APP_URL fallback', () => {
  withEnv({ APP_URL: 'https://sgconnectsphere.hong-yi.me', PUBLIC_SITE_URL: 'https://sgconnectsphere.vercel.app' }, () => {
    // Both hosts pass, because both env vars contribute to the allowlist.
    assert.equal(isAllowedOrigin('https://sgconnectsphere.hong-yi.me'), true);
    assert.equal(isAllowedOrigin('https://sgconnectsphere.vercel.app'), true);
  });
});

test('accepts a Vercel-injected hostname (VERCEL_URL) as https, matching the deployment', () => {
  withEnv({ APP_URL: 'https://sgconnectsphere.hong-yi.me', VERCEL_URL: 'sgconnectsphere-git-pr123.vercel.app' }, () => {
    assert.equal(isAllowedOrigin('https://sgconnectsphere-git-pr123.vercel.app'), true);
  });
});

test('accepts VERCEL_PROJECT_PRODUCTION_URL as https', () => {
  withEnv({ APP_URL: 'https://sgconnectsphere.hong-yi.me', VERCEL_PROJECT_PRODUCTION_URL: 'sgconnectsphere.vercel.app' }, () => {
    assert.equal(isAllowedOrigin('https://sgconnectsphere.vercel.app'), true);
  });
});

test('accepts the Vercel branch alias (VERCEL_BRANCH_URL) as https', () => {
  withEnv({ APP_URL: 'https://sgconnectsphere.hong-yi.me', VERCEL_BRANCH_URL: 'sgconnectsphere-git-fix-login-theprawnvercel.vercel.app' }, () => {
    assert.equal(isAllowedOrigin('https://sgconnectsphere-git-fix-login-theprawnvercel.vercel.app'), true);
  });
});

test('truncates an unparseable attacker-controlled Origin before logging it', () => {
  const logged: unknown[] = [];
  withEnv({ APP_URL: 'https://sgconnectsphere.hong-yi.me' }, () => {
    const quiet = console.warn;
    console.warn = (...args: unknown[]) => { logged.push(...args); };
    try {
      assert.equal(isAllowedOrigin(`not a url ${'x'.repeat(5000)}`), false);
    } finally {
      console.warn = quiet;
    }
  });
  const details = logged.find((entry): entry is { receivedOrigin: string } =>
    typeof entry === 'object' && entry !== null && 'receivedOrigin' in entry);
  assert.ok(details, 'rejection details were logged');
  assert.ok(details.receivedOrigin.length <= 200, `logged ${details.receivedOrigin.length} chars`);
});

test('normalises trailing slash on both stored and received origins', () => {
  withEnv({ APP_URL: 'https://sgconnectsphere.hong-yi.me/' }, () => {
    assert.equal(isAllowedOrigin('https://sgconnectsphere.hong-yi.me'), true);
    assert.equal(isAllowedOrigin('https://sgconnectsphere.hong-yi.me/'), true);
  });
});

test('compares case-insensitively on scheme and host', () => {
  withEnv({ APP_URL: 'https://sgconnectsphere.hong-yi.me' }, () => {
    assert.equal(isAllowedOrigin('HTTPS://SGConnectSphere.Hong-Yi.ME'), true);
  });
});

test('rejects a foreign origin', () => {
  withEnv({ APP_URL: 'https://sgconnectsphere.hong-yi.me' }, () => {
    assert.equal(isAllowedOrigin('https://attacker.example.test'), false);
  });
});

test('rejects a suffix-spoof of a vercel.app hostname (evil-vercel.app)', () => {
  // If we ever regressed to `endsWith('.vercel.app')` this would slip through.
  withEnv({ APP_URL: 'https://sgconnectsphere.vercel.app' }, () => {
    assert.equal(isAllowedOrigin('https://evil-vercel.app'), false);
  });
});

test('rejects a subdomain-spoof appending an attacker-controlled TLD', () => {
  withEnv({ APP_URL: 'https://sgconnectsphere.vercel.app' }, () => {
    assert.equal(isAllowedOrigin('https://sgconnectsphere.vercel.app.attacker.com'), false);
  });
});

test('rejects a missing, empty, or whitespace-only Origin header', () => {
  withEnv({ APP_URL: 'https://sgconnectsphere.hong-yi.me' }, () => {
    assert.equal(isAllowedOrigin(undefined), false);
    assert.equal(isAllowedOrigin(''), false);
    assert.equal(isAllowedOrigin('   '), false);
    assert.equal(isAllowedOrigin(null), false);
  });
});

test('rejects a non-http(s) scheme even if the host matches', () => {
  // Prevents `file://`, `javascript:`, `data:` etc. from ever being allowed.
  withEnv({ APP_URL: 'https://sgconnectsphere.hong-yi.me' }, () => {
    assert.equal(isAllowedOrigin('javascript://sgconnectsphere.hong-yi.me'), false);
    assert.equal(isAllowedOrigin('file:///sgconnectsphere.hong-yi.me'), false);
  });
});

test('rejects a malformed origin string (not a URL) rather than throwing', () => {
  withEnv({ APP_URL: 'https://sgconnectsphere.hong-yi.me' }, () => {
    assert.equal(isAllowedOrigin('not a url'), false);
    assert.equal(isAllowedOrigin('https://'), false);
  });
});

test('fails closed when no origins are configured at all', () => {
  withEnv({}, () => {
    assert.equal(allowedOrigins().size, 0);
    assert.equal(isAllowedOrigin('https://sgconnectsphere.hong-yi.me'), false);
  });
});

test('ADDITIONAL_ALLOWED_ORIGINS accepts comma-separated local dev hosts and ignores blanks', () => {
  withEnv({ APP_URL: 'https://sgconnectsphere.hong-yi.me', ADDITIONAL_ALLOWED_ORIGINS: 'http://localhost:5173, http://127.0.0.1:5173 ,,' }, () => {
    assert.equal(isAllowedOrigin('http://localhost:5173'), true);
    assert.equal(isAllowedOrigin('http://127.0.0.1:5173'), true);
    assert.equal(isAllowedOrigin('http://localhost:9999'), false);
  });
});

test('the allowed set deduplicates identical origins from multiple env vars', () => {
  withEnv({
    APP_URL: 'https://sgconnectsphere.vercel.app',
    PUBLIC_SITE_URL: 'https://sgconnectsphere.vercel.app/',
    VERCEL_PROJECT_PRODUCTION_URL: 'sgconnectsphere.vercel.app',
  }, () => {
    assert.equal(allowedOrigins().size, 1);
    assert.equal(isAllowedOrigin('https://sgconnectsphere.vercel.app'), true);
  });
});

test('does not accept an origin that only matches a superstring of an allowed value', () => {
  // Guards against a naive `startsWith`/`includes` implementation.
  withEnv({ APP_URL: 'https://sgconnectsphere.hong-yi.me' }, () => {
    assert.equal(isAllowedOrigin('https://sgconnectsphere.hong-yi.me.attacker.com'), false);
    assert.equal(isAllowedOrigin('https://prefix-sgconnectsphere.hong-yi.me'), false);
  });
});
