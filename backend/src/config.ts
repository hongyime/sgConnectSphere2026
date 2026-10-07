export type RuntimeConfig = {
  appEnv: string;
  appUrl?: string;
  cronSecret?: string;
  emailProvider: 'brevo' | 'resend';
  emailFrom?: string;
  emailReplyTo?: string;
  brevoApiKey?: string;
  upstashRedisRestUrl?: string;
  upstashRedisRestToken?: string;
  notificationQueueName: string;
  databaseUrl?: string;
};

const read = (name: string) => process.env[name]?.trim() || undefined;

export const runtimeConfig: RuntimeConfig = {
  appEnv: read('APP_ENV') ?? process.env.NODE_ENV ?? 'development',
  appUrl: read('APP_URL') ?? read('PUBLIC_SITE_URL'),
  cronSecret: read('CRON_SECRET'),
  emailProvider: (read('EMAIL_PROVIDER') ?? 'brevo') as RuntimeConfig['emailProvider'],
  emailFrom: read('EMAIL_FROM'),
  emailReplyTo: read('EMAIL_REPLY_TO'),
  brevoApiKey: read('BREVO_API_KEY'),
  upstashRedisRestUrl: read('UPSTASH_REDIS_REST_URL'),
  upstashRedisRestToken: read('UPSTASH_REDIS_REST_TOKEN'),
  notificationQueueName: read('UPSTASH_REDIS_QUEUE_NOTIFICATIONS') ?? 'connectsphere:notifications',
  databaseUrl: read('DATABASE_URL'),
};

export function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

// Normalise an origin string for comparison. Origin headers are always
// `scheme://host[:port]` (no path), but we defensively lowercase the whole
// URL and strip a trailing slash before comparing, so a caller that sends
// `HTTPS://Example.com/` matches an allowed value of `https://example.com`.
// Returns `null` when the input is not a syntactically valid absolute URL,
// so we never accept a header we could not parse.
function normaliseOrigin(value: string | string[] | undefined | null): string | null {
  if (Array.isArray(value)) return null; // Duplicate Origin headers are malformed; reject.
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\/+$/, '');
  if (trimmed.length === 0) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    // `URL#origin` gives us `scheme://host[:port]` with default ports stripped.
    return parsed.origin.toLowerCase();
  } catch {
    return null;
  }
}

// Build the set of origins that mutating requests may present in their
// `Origin` header. Sources, all optional except APP_URL/PUBLIC_SITE_URL:
//   - APP_URL: the canonical production host (unchanged behaviour).
//   - PUBLIC_SITE_URL: an additional accepted host, not just a fallback for
//     APP_URL. Some deployments serve the same app under two brands.
//   - VERCEL_URL / VERCEL_PROJECT_PRODUCTION_URL / VERCEL_BRANCH_URL: injected
//     by Vercel with the current deployment's hostnames (no scheme). This is
//     what lets the `.vercel.app` alias, the unique preview URL and the
//     `-git-<branch>-` preview alias log in without hardcoding them. Vercel
//     deployments are always https.
//   - ADDITIONAL_ALLOWED_ORIGINS: comma-separated escape hatch for local dev
//     hosts (e.g. `http://localhost:5173`). Defaults to empty. Each entry
//     must be a full origin; substring/suffix matching is intentionally not
//     supported because `endsWith('.vercel.app')` would accept a hostile
//     `https://evil-vercel.app` and `https://foo.vercel.app.attacker.com`.
export function allowedOrigins(): ReadonlySet<string> {
  const set = new Set<string>();
  const add = (value: string | undefined | null) => {
    const normalised = normaliseOrigin(value);
    if (normalised) set.add(normalised);
  };
  add(runtimeConfig.appUrl);
  add(read('PUBLIC_SITE_URL'));
  const vercelUrl = read('VERCEL_URL');
  if (vercelUrl) add(`https://${vercelUrl.replace(/^https?:\/\//i, '')}`);
  const vercelProd = read('VERCEL_PROJECT_PRODUCTION_URL');
  if (vercelProd) add(`https://${vercelProd.replace(/^https?:\/\//i, '')}`);
  const vercelBranch = read('VERCEL_BRANCH_URL');
  if (vercelBranch) add(`https://${vercelBranch.replace(/^https?:\/\//i, '')}`);
  const extras = read('ADDITIONAL_ALLOWED_ORIGINS');
  if (extras) {
    for (const entry of extras.split(',')) add(entry);
  }
  return set;
}

// True when `origin` (typically `request.headers.origin`) matches any
// configured allowed origin under case-insensitive scheme+host comparison.
// A missing or unparseable origin is rejected, matching the previous
// behaviour on mutating requests. Rejection is logged (origin + allowed set
// size) so a mis-set env var can be diagnosed without leaking secrets.
export function isAllowedOrigin(origin: string | string[] | undefined | null): boolean {
  const normalised = normaliseOrigin(origin);
  const allowed = allowedOrigins();
  if (allowed.size === 0) {
    // Fail closed. If nothing is configured, refuse rather than allow all.
    console.warn('[csrf] no allowed origins configured; rejecting request', {
      receivedOrigin: normalised ?? '(missing)',
    });
    return false;
  }
  if (!normalised) {
    console.warn('[csrf] rejecting request with missing or unparseable Origin header', {
      // Raw header text is attacker-controlled; cap what reaches the logs.
      receivedOrigin: origin == null ? '(missing)' : String(origin).slice(0, 200),
      allowedCount: allowed.size,
    });
    return false;
  }
  if (!allowed.has(normalised)) {
    console.warn('[csrf] rejecting request from non-allowed origin', {
      receivedOrigin: normalised,
      allowedCount: allowed.size,
      allowed: Array.from(allowed),
    });
    return false;
  }
  return true;
}

export function getReadiness() {
  return {
    app: true,
    upstashRedis: Boolean(
      runtimeConfig.upstashRedisRestUrl && runtimeConfig.upstashRedisRestToken,
    ),
    brevo: Boolean(runtimeConfig.brevoApiKey && runtimeConfig.emailFrom),
    cronSecret: Boolean(runtimeConfig.cronSecret),
    database: Boolean(runtimeConfig.databaseUrl),
  };
}
