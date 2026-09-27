import { createInboxHandler } from '../../backend/src/modules/eventNotifications/inbox.js';
import { currentUser, query } from '../../backend/src/modules/eventVisibility/runtime.js';
import { runtimeConfig, requireEnv } from '../../backend/src/config.js';
import { hasInternalSecret, requireMethod, sendJson } from '../../backend/src/http.js';
import { inTransaction, notificationDatabase } from '../../backend/src/database/pool.js';
import { isDeliveryId } from '../../backend/src/modules/notificationDispatcher/durable.js';
import { prepareCommittedDelivery } from '../../backend/src/modules/notificationDispatcher/postgres.js';
import type { VercelRequest, VercelResponse } from '../../backend/src/vercel.js';

const inbox = createInboxHandler(query, currentUser, () => requireEnv(runtimeConfig.appUrl, 'APP_URL'));

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (new URL(request.url ?? '/', 'http://localhost').searchParams.get('task') === 'inbox') {
    await inbox(request, response);
    return;
  }
  if (!requireMethod(request, response, 'POST')) {
    return;
  }

  if (!hasInternalSecret(request, runtimeConfig.cronSecret)) {
    sendJson(response, 401, { error: 'unauthorized' });
    return;
  }

  const id = (request.body as { deliveryId?: unknown } | undefined)?.deliveryId;
  if (!isDeliveryId(id)) {
    sendJson(response, 400, {
      error: 'invalid_payload',
      required: ['deliveryId'],
    });
    return;
  }

  try {
    const delivery = await inTransaction(notificationDatabase(), (client) => prepareCommittedDelivery(client, id));
    sendJson(response, 202, { committed: true, deliveryId: delivery.id, status: delivery.status });
  } catch (error) {
    const missing = error instanceof Error && error.message === 'delivery_not_found';
    sendJson(response, missing ? 404 : 503, { error: missing ? 'delivery_not_found' : 'notification_storage_unavailable' });
  }
}
