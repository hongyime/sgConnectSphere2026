import { requireEnv, runtimeConfig } from '../../backend/src/config.js';
import { hasInternalSecret, requireMethod, sendJson } from '../../backend/src/http.js';
import { notificationDatabase } from '../../backend/src/database/pool.js';
import { dispatchCommittedDeliveries, publishCommittedDeliveries } from '../../backend/src/modules/notificationDispatcher/dispatch.js';
import { postgresDeliveryStore } from '../../backend/src/modules/notificationDispatcher/postgres.js';
import { createDeliveryTransport } from '../../backend/src/providers/durableRedis.js';
import { sendDurableBrevoEmail } from '../../backend/src/providers/brevo.js';
import type { VercelRequest, VercelResponse } from '../../backend/src/vercel.js';

// /api/cron/notification-worker rewrites here with ?task=worker (see vercel.json)
// so both crons ship as one function under the Vercel Hobby plan's function limit.
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!requireMethod(request, response, 'GET')) {
    return;
  }

  if (!hasInternalSecret(request, runtimeConfig.cronSecret)) {
    sendJson(response, 401, { error: 'unauthorized' });
    return;
  }

  const task = new URL(request.url || '/', 'http://localhost').searchParams.get('task');

  if (task === 'worker') {
    if (process.env.NOTIFICATION_DELIVERY_ENABLED !== 'true') {
      sendJson(response, 503, { error: 'notification_delivery_not_enabled' });
      return;
    }
    try {
      requireEnv(runtimeConfig.brevoApiKey, 'BREVO_API_KEY');
      requireEnv(runtimeConfig.emailFrom, 'EMAIL_FROM');
      const result = await dispatchCommittedDeliveries(
        postgresDeliveryStore(notificationDatabase()), createDeliveryTransport(), sendDurableBrevoEmail,
      );
      sendJson(response, 200, result);
    } catch {
      sendJson(response, 503, { error: 'notification_worker_unavailable' });
    }
    return;
  }

  if (process.env.NOTIFICATION_RELAY_ENABLED !== 'true') {
    sendJson(response, 503, { error: 'notification_relay_not_enabled' });
    return;
  }
  try {
    const result = await publishCommittedDeliveries(postgresDeliveryStore(notificationDatabase()), createDeliveryTransport());
    sendJson(response, 200, result);
  } catch {
    sendJson(response, 503, { error: 'notification_relay_unavailable' });
  }
}
