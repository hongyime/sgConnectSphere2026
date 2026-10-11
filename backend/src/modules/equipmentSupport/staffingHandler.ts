// HTTP entry for E07-S07 technician assignments (SCRUM-57):
//   GET  /api/venues?task=staffing                      open and staffed support requests
//   GET  /api/venues?task=staffing&request=<id>         one request, its assignees and who is free
//   GET  /api/venues?task=staffing&schedule=mine        the signed-in technician's schedule
//   POST /api/venues?task=staffing  { action: 'assign', request, staff }
//   POST /api/venues?task=staffing  { action: 'remove', assignment }
// Routed through api/venues/index.ts like ?task=support, to stay within the
// Vercel Hobby plan's serverless function limit.
import type { Pool } from 'pg';
import type { AuthenticatedUser } from '../accessControl/types.js';
import type { Query } from '../eventVisibility/service.js';
import { isAllowedOrigin } from '../../config.js';
import { sendJson } from '../../http.js';
import type { VercelRequest, VercelResponse } from '../../vercel.js';
import { currentUser, databasePool, query, respondWithResult } from '../eventVisibility/runtime.js';
import { AccessError } from '../eventVisibility/service.js';
import { assignTechnician, getRequest, listQueue, mySchedule, removeAssignment } from './staffAssignments.js';

export function createStaffingHandler(deps: {
  authenticate: (request: VercelRequest) => Promise<AuthenticatedUser>;
  query: Query; pool: () => Pool; allowedOrigin: typeof isAllowedOrigin;
}) {
  return async function staffingHandler(request: VercelRequest, response: VercelResponse) {
    if (!['GET', 'POST'].includes(request.method ?? '')) {
      response.setHeader('Allow', 'GET, POST');
      sendJson(response, 405, { error: 'method_not_allowed' });
      return;
    }
    await respondWithResult(response, async () => {
      const user = await deps.authenticate(request);
      if (request.method === 'GET') {
        const params = new URL(request.url ?? '/', 'http://localhost').searchParams;
        if (params.has('request')) return { status: 200, body: await getRequest(deps.query, user, params.get('request')) };
        if (params.get('schedule') === 'mine') return { status: 200, body: await mySchedule(deps.query, user) };
        return { status: 200, body: await listQueue(deps.query, user) };
      }
      if (!deps.allowedOrigin(request.headers.origin)) throw new AccessError(403, 'Request origin not allowed.');
      const body = request.body as Record<string, unknown> | undefined;
      if (body?.action === 'assign') return assignTechnician(deps.pool(), user, body);
      if (body?.action === 'remove') return removeAssignment(deps.pool(), user, body);
      throw new AccessError(400, 'Choose assign or remove.');
    });
  };
}

export const staffingHandler = createStaffingHandler({
  authenticate: currentUser, query, pool: databasePool, allowedOrigin: isAllowedOrigin,
});
