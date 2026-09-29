import { runtimeConfig, requireEnv, isAllowedOrigin } from '../../backend/src/config.js';
import { requireMethod } from '../../backend/src/http.js';
import { currentUser, query, respond } from '../../backend/src/modules/eventVisibility/runtime.js';
import { AccessError } from '../../backend/src/modules/eventVisibility/service.js';
import { publishEvent } from '../../backend/src/modules/attendeeVisibility/service.js';
import type { VercelRequest, VercelResponse } from '../../backend/src/vercel.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!requireMethod(request, response, 'POST')) return;
  await respond(response, async () => {
    if (!isAllowedOrigin(request.headers.origin)) throw new AccessError(403, 'Request origin not allowed.');
    const user = await currentUser(request);
    const body = request.body as { eventId?: unknown } | undefined;
    if (typeof body?.eventId !== 'string') throw new AccessError(400, 'An event identifier is required.');
    await publishEvent(query, user, body.eventId);
    return { published: true };
  });
}
