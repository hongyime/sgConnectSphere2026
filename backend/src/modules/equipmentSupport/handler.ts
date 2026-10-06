import type { Pool } from 'pg';
import type { AuthenticatedUser } from '../accessControl/types.js';
import type { Query } from '../eventVisibility/service.js';
import { isAllowedOrigin } from '../../config.js';
import { sendJson } from '../../http.js';
import type { VercelRequest, VercelResponse } from '../../vercel.js';
import { currentUser, databasePool, query, respondWithResult } from '../eventVisibility/runtime.js';
import { AccessError } from '../eventVisibility/service.js';
import { getEquipment, listEquipment, retireEquipment, saveEquipment } from './catalogue.js';
export function createEquipmentHandler(deps: {
  authenticate: (request: VercelRequest) => Promise<AuthenticatedUser>;
  query: Query; pool: () => Pool; allowedOrigin: typeof isAllowedOrigin;
}) {
  return async function equipmentHandler(request: VercelRequest, response: VercelResponse) {
    if (!['GET', 'POST'].includes(request.method ?? '')) {
      response.setHeader('Allow', 'GET, POST'); sendJson(response, 405, { error: 'method_not_allowed' }); return;
    }
    await respondWithResult(response, async () => {
      const user = await deps.authenticate(request);
      if (request.method === 'GET') {
        const id = new URL(request.url ?? '/', 'http://localhost').searchParams.get('id');
        return { status: 200, body: id ? { equipment: await getEquipment(deps.query, user, id) } : { equipment: await listEquipment(deps.query, user) } };
      }
      if (!deps.allowedOrigin(request.headers.origin)) throw new AccessError(403, 'Request origin not allowed.');
      const body = request.body as Record<string, unknown> | undefined;
      if (body?.action === 'create') return saveEquipment(deps.pool(), user, body);
      if (body?.action === 'update' || body?.action === 'retire') {
        if (typeof body.id !== 'string' || !body.id) throw new AccessError(400, 'An equipment id is required.');
        return body.action === 'retire' ? retireEquipment(deps.pool(), user, body.id) : saveEquipment(deps.pool(), user, body, body.id);
      }
      throw new AccessError(400, 'Choose create, update or retire.');
    });
  }

}
export const equipmentHandler = createEquipmentHandler({authenticate:currentUser,query,pool:databasePool,allowedOrigin:isAllowedOrigin});
