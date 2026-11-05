import pg from 'pg';
import { productionDatabaseClientConfig } from '../backend/src/database/productionMigrationGuard.js';
import { insertNotificationDelivery } from '../backend/src/modules/notificationDispatcher/postgres.js';
import { createDeliveryTransport } from '../backend/src/providers/durableRedis.js';

const { Client } = pg;
const RECIPIENT_ENV = 'CONNECTSPHERE_PRODUCTION_TEST_RECIPIENTS';
const MARKER = 'CONNECTSPHERE_PRODUCTION_DELIVERY_TEST_V1';
const PRODUCTION_APP_URL = 'https://sgconnectsphere.vercel.app';

type DeliveryResult = {
  index: number;
  status: 'sent' | 'failed' | 'uncertain';
  dispatchState: string;
  providerAccepted: boolean;
  failureReason: string | null;
};

function recipients(): string[] {
  const value = process.env[RECIPIENT_ENV]?.trim();
  if (!value) throw new Error(`${RECIPIENT_ENV} is not configured`);
  const values = value.split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
  if (values.length !== 6 || new Set(values).size !== 6) {
    throw new Error(`${RECIPIENT_ENV} must contain exactly six unique addresses`);
  }
  for (const email of values) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('recipient address validation failed');
  }
  return values;
}

async function preflight(client: pg.Client, emails: string[]) {
  const tables = await client.query<{ notifications: string | null; deliveries: string | null }>(
    `SELECT to_regclass('public.notifications') AS notifications,
            to_regclass('public.notification_deliveries') AS deliveries`,
  );
  if (!tables.rows[0]?.notifications || !tables.rows[0]?.deliveries) throw new Error('notification tables are missing');

  const columns = await client.query<{ count: string }>(`SELECT count(*)::text AS count
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notification_deliveries'
      AND column_name = ANY($1::text[])`, [['recipient_email', 'subject', 'html', 'dispatch_state', 'delivery_purpose']]);
  if (Number(columns.rows[0]?.count) !== 5) throw new Error('durable notification delivery columns are incomplete');

  const users = await client.query<{ id: string; is_active: boolean }>(
    `SELECT id, is_active FROM users WHERE lower(email) = ANY($1::text[])`, [emails],
  );
  if (users.rows.length !== 6 || users.rows.some(user => !user.is_active)) {
    throw new Error(`expected six distinct active accounts, found ${users.rows.length}`);
  }

  const marker = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM notifications WHERE message LIKE $1`, [`${MARKER}%`],
  );
  if (Number(marker.rows[0]?.count) !== 0) throw new Error('prior production test marker exists; refusing a second run');

  const pending = await client.query<{ queued: string; uncertain: string }>(`SELECT
    count(*) FILTER (WHERE delivery_status = 'queued')::text AS queued,
    count(*) FILTER (WHERE dispatch_state = 'uncertain')::text AS uncertain
    FROM notification_deliveries`);
  const queued = Number(pending.rows[0]?.queued ?? 0);
  const uncertain = Number(pending.rows[0]?.uncertain ?? 0);
  if (queued !== 0 || uncertain !== 0) {
    throw new Error(`unrelated delivery backlog exists (queued=${queued}, uncertain=${uncertain})`);
  }

  const queuePointers = await createDeliveryTransport().peek(5);
  if (queuePointers.length !== 0) throw new Error(`notification Redis queue is not empty (${queuePointers.length} sampled pointer(s))`);
}

async function markerResults(client: pg.Client, ids: string[]): Promise<DeliveryResult[]> {
  const result = await client.query<{
    delivery_status: string; dispatch_state: string; provider_message_id: string | null; failure_reason: string | null;
  }>(`SELECT d.delivery_status, d.dispatch_state, d.provider_message_id, d.failure_reason
      FROM notification_deliveries d
      JOIN notifications n ON n.id = d.notification_id
      WHERE d.id = ANY($1::uuid[])
      ORDER BY d.created_at, d.id`, [ids]);
  if (result.rows.length !== 6) throw new Error(`expected six delivery rows, found ${result.rows.length}`);
  return result.rows.map((row, index) => ({
    index: index + 1,
    dispatchState: row.dispatch_state,
    status: row.delivery_status === 'sent' && row.dispatch_state === 'done'
      ? 'sent'
      : row.delivery_status === 'failed' && row.dispatch_state === 'failed' ? 'failed' : 'uncertain',
    providerAccepted: row.delivery_status === 'sent' && row.dispatch_state === 'done',
    failureReason: row.failure_reason,
  }));
}

async function invoke(url: string, secret: string): Promise<Record<string, number>> {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(`protected endpoint returned HTTP ${response.status}`);
  const numeric: Record<string, number> = {};
  for (const [key, value] of Object.entries(body)) if (typeof value === 'number') numeric[key] = value;
  return numeric;
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const confirmProduction = args.includes('--confirm-production');
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const secret = process.env.CRON_SECRET?.trim();
  const emails = recipients();
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured');
  if (execute && !confirmProduction) throw new Error('execution requires --confirm-production');
  const clientConfig = execute
    ? { ...productionDatabaseClientConfig(databaseUrl), statement_timeout: 10000, query_timeout: 12000 }
    : { connectionString: databaseUrl, statement_timeout: 10000, query_timeout: 12000 };
  if (!execute) {
    console.log('DRY RUN: no database writes, relay calls, worker calls, or emails will occur.');
  } else if (!secret) {
    throw new Error('CRON_SECRET is not configured');
  }

  const client = new Client(clientConfig);
  await client.connect();
  try {
    await preflight(client, emails);
    console.log('Preflight PASS: six unique active accounts, no prior marker, no queued/uncertain deliveries, and an empty Redis delivery queue.');
    if (!execute) {
      console.log('Would insert exactly six marked notifications and six email delivery rows.');
      return;
    }

    const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const title = `ConnectSphere production delivery test ${runId}`;
    const message = `${MARKER}\nControlled production delivery test. No action is required.`;
    const ids: string[] = [];
    await client.query('BEGIN');
    try {
      for (const email of emails) {
        const user = await client.query<{ id: string }>('SELECT id FROM users WHERE lower(email) = $1 AND is_active = true', [email]);
        const notification = await client.query<{ id: string }>(
          `INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3) RETURNING id`,
          [user.rows[0]!.id, title, message],
        );
        ids.push(await insertNotificationDelivery(client as any, notification.rows[0]!.id));
      }
      if (ids.length !== 6) throw new Error('transaction did not create exactly six delivery rows');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    console.log('Committed exactly six marked notifications and six delivery rows.');

    const base = PRODUCTION_APP_URL.replace(/\/$/, '');
    const relay = await invoke(`${base}/api/cron/outbox-relay`, secret ?? '');
    const afterRelay = await markerResults(client, ids);
    if ((relay.retained ?? 0) > 0) throw new Error('relay retained an ambiguous or failed delivery; refusing automatic retry');
    if (afterRelay.some(result => result.dispatchState === 'uncertain' || result.dispatchState === 'sending')) {
      throw new Error('relay left an ambiguous delivery; refusing automatic retry');
    } else if (afterRelay.some(result => result.dispatchState === 'pending' || result.dispatchState === 'published')) {
      const secondRelay = await invoke(`${base}/api/cron/outbox-relay`, secret ?? '');
      console.log(`Relay calls completed: 2 (${JSON.stringify(relay)}, ${JSON.stringify(secondRelay)}).`);
    } else {
      console.log(`Relay call completed: 1 (${JSON.stringify(relay)}).`);
    }

    let workerCalls = 0;
    for (; workerCalls < 2; workerCalls++) {
      const worker = await invoke(`${base}/api/cron/notification-worker`, secret ?? '');
      const results = await markerResults(client, ids);
      console.log(`Worker call ${workerCalls + 1} completed: ${JSON.stringify(worker)}.`);
      if ((worker.retained ?? 0) > 0 || results.some(result => result.dispatchState === 'uncertain' || result.dispatchState === 'sending')) break;
      if (results.every(result => result.status !== 'uncertain')) break;
    }
    const results = await markerResults(client, ids);
    const counts = results.reduce<Record<string, number>>((all, result) => {
      all[result.status] = (all[result.status] ?? 0) + 1;
      return all;
    }, {});
    console.log(`Final delivery outcomes: ${JSON.stringify(counts)}; provider_accepted=${results.filter(result => result.providerAccepted).length}; worker_calls=${workerCalls}.`);
    for (const result of results) console.log(`delivery_${result.index}=${result.status}${result.failureReason ? ` (${result.failureReason})` : ''}`);
    if (results.some(result => result.status === 'uncertain')) process.exitCode = 2;
    else if (results.some(result => result.status === 'failed')) process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error(`Production notification probe aborted: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
});
