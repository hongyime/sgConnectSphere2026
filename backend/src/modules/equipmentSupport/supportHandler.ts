// HTTP entry for E07-S06 technical support requests (SCRUM-56):
//   GET  /api/venues?task=support&event=<event id or code>
//   POST /api/venues?task=support  { action: 'request', event, description, startsAt, endsAt }
//   POST /api/venues?task=support  { action: 'none', event }
// Routed through api/venues/index.ts like ?task=equipment, to stay within the
// Vercel Hobby plan's serverless function limit.
import type { Pool } from 'pg';
import type { AuthenticatedUser } from '../accessControl/types.js';
import type { Query } from '../eventVisibility/service.js';
import { isAllowedOrigin } from '../../config.js';
import { sendJson } from '../../http.js';
import type { VercelRequest, VercelResponse } from '../../vercel.js';
import { currentUser, databasePool, query, respondWithResult } from '../eventVisibility/runtime.js';
import { AccessError } from '../eventVisibility/service.js';
import { declareNoSupport, getSupportRequests, requestSupport } from './supportRequests.js';

export function createSupportHandler(deps: {
  authenticate: (request: VercelRequest) => Promise<AuthenticatedUser>;
  query: Query; pool: () => Pool; allowedOrigin: typeof isAllowedOrigin;
}) {
  return async function supportHandler(request: VercelRequest, response: VercelResponse) {
    if (!['GET', 'POST'].includes(request.method ?? '')) {
      response.setHeader('Allow', 'GET, POST');
      sendJson(response, 405, { error: 'method_not_allowed' });
      return;
    }
    await respondWithResult(response, async () => {
      const user = await deps.authenticate(request);
      if (request.method === 'GET') {
        const event = new URL(request.url ?? '/', 'http://localhost').searchParams.get('event') ?? '';
        return { status: 200, body: await getSupportRequests(deps.query, user, event) };
      }
      if (!deps.allowedOrigin(request.headers.origin)) throw new AccessError(403, 'Request origin not allowed.');
      const body = request.body as Record<string, unknown> | undefined;
      const event = typeof body?.event === 'string' ? body.event : '';
      if (body?.action === 'request') return requestSupport(deps.pool(), user, event, body);
      if (body?.action === 'none') return declareNoSupport(deps.pool(), user, event);
      throw new AccessError(400, 'Choose request or none.');
    });
  };
}

export const supportHandler = createSupportHandler({
  authenticate: currentUser, query, pool: databasePool, allowedOrigin: isAllowedOrigin,
});
