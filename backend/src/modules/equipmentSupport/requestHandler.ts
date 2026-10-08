import type { Pool } from 'pg';
import type { AuthenticatedUser } from '../accessControl/types.js';
import type { Query } from '../eventVisibility/service.js';
import { AccessError } from '../eventVisibility/service.js';
import {
  currentUser,
  databasePool,
  query,
  respondWithResult,
} from '../eventVisibility/runtime.js';
import { isAllowedOrigin } from '../../config.js';
import { sendJson } from '../../http.js';
import type { VercelRequest, VercelResponse } from '../../vercel.js';
import {
  listEquipmentRequestEvents,
  getEquipmentRequests,
  saveEquipmentRequest,
  removeEquipmentRequest,
} from './requests.js';
import {
  changeReservation,
  releaseReservation,
  reserveEquipment,
} from './reservations.js';
export function createEquipmentRequestHandler(deps: {
  authenticate: (req: VercelRequest) => Promise<AuthenticatedUser>;
  query: Query;
  pool: () => Pool;
  allowedOrigin: typeof isAllowedOrigin;
}) {
  return async (request: VercelRequest, response: VercelResponse) => {
    if (!['GET', 'POST'].includes(request.method ?? '')) {
      response.setHeader('Allow', 'GET, POST');
      sendJson(response, 405, { error: 'method_not_allowed' });
      return;
    }
    await respondWithResult(response, async () => {
      const user = await deps.authenticate(request);
      const identifier =
        new URL(request.url ?? '/', 'http://localhost').searchParams.get(
          'event',
        ) ?? '';
      if (request.method === 'GET')
        return {
          status: 200,
          body: identifier
            ? await getEquipmentRequests(deps.query, user, identifier)
            : await listEquipmentRequestEvents(deps.query, user),
        };
      if (!deps.allowedOrigin(request.headers.origin))
        throw new AccessError(403, 'Request origin not allowed.');
      const body = request.body as Record<string, unknown> | undefined;
      if (body?.action === 'saveRequest') {
        if (body.id !== undefined && typeof body.id !== 'string')
          throw new AccessError(400, 'A valid request id is required.');
        return saveEquipmentRequest(
          deps.pool(),
          user,
          identifier,
          body,
          body.id as string | undefined,
        );
      }
      if (body?.action === 'removeRequest' && typeof body.id === 'string')
        return removeEquipmentRequest(deps.pool(), user, identifier, body.id);
      // E07-S04 reservation writers.
      if (body?.action === 'reserve')
        return reserveEquipment(deps.pool(), user, identifier, body);
      if (body?.action === 'changeReservation')
        return changeReservation(deps.pool(), user, identifier, body);
      if (body?.action === 'releaseReservation')
        return releaseReservation(deps.pool(), user, identifier, body);
      throw new AccessError(
        400,
        'Choose saveRequest, removeRequest, reserve, changeReservation or releaseReservation.',
      );
    });
  };
}
export const equipmentRequestHandler = createEquipmentRequestHandler({
  authenticate: currentUser,
  query,
  pool: databasePool,
  allowedOrigin: isAllowedOrigin,
});
