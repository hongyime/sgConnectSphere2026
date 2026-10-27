import type { Pool } from 'pg';
import type { AuthenticatedUser } from '../accessControl/types.js';
import { AccessError } from '../eventVisibility/service.js';
import { currentUser, databasePool, respondWithResult } from '../eventVisibility/runtime.js';
import { isAllowedOrigin } from '../../config.js';
import { sendJson } from '../../http.js';
import type { VercelRequest, VercelResponse } from '../../vercel.js';
import { cancelLostVenueBooking } from './lostVenueRecovery.js';
import { submitBooking } from './bookingSubmission.js';
import { withdrawBooking } from './bookingWithdrawal.js';
import { setPrimaryBooking } from './bookingPrimary.js';
import type { NotificationOptions } from '../eventNotifications/service.js';

export function createBookingSubmissionHandler(deps: {
  authenticate: (request: VercelRequest) => Promise<AuthenticatedUser>;
  pool: () => Pool; allowedOrigin: typeof isAllowedOrigin; notifications?: NotificationOptions;
}) {
  return async (request: VercelRequest, response: VercelResponse) => {
    if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); sendJson(response, 405, { error: 'method_not_allowed' }); return; }
    await respondWithResult(response, async () => {
      if (!deps.allowedOrigin(request.headers.origin)) throw new AccessError(403, 'Request origin not allowed.');
      const user = await deps.authenticate(request);
      if ((request.body as Record<string, unknown> | undefined)?.action === 'cancel_lost_booking')
        return cancelLostVenueBooking(deps.pool(), user, request.body, deps.notifications);
      if ((request.body as Record<string, unknown> | undefined)?.action === 'set_primary')
        return setPrimaryBooking(deps.pool(), user, request.body);
      if ((request.body as Record<string, unknown> | undefined)?.action === 'withdraw_booking')
        return withdrawBooking(deps.pool(), user, request.body, deps.notifications);
      const key = request.headers['idempotency-key'];
      return submitBooking(deps.pool(), user, request.body, typeof key === 'string' ? key : undefined, deps.notifications);
    });
  };
}
export const bookingSubmissionHandler = createBookingSubmissionHandler({ authenticate: currentUser, pool: databasePool, allowedOrigin: isAllowedOrigin });
