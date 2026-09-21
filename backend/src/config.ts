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
