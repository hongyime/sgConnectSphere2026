import type { AuthenticatedUser } from '../accessControl/types.js';
import { canActAsRole } from '../accessControl/service.js';
import { USER_ROLES } from '../shared/roles.js';
import { AccessError, type Query } from '../eventVisibility/service.js';
import { sendJson } from '../../http.js';
import type { VercelRequest, VercelResponse } from '../../vercel.js';

const projection = 'id, event_id, title, message, is_read, read_at, created_at';

// Notifications are historical recipient snapshots. Do not recheck current
// registration: cancellation can withdraw a recipient before they read it.
export async function listInbox(query: Query, userId: string) {
  return (await query(`SELECT ${projection} FROM notifications
    WHERE user_id = $1 ORDER BY created_at DESC, id DESC`, [userId])).rows;
}

export async function markInboxRead(query: Query, userId: string, id: string) {
  const result = await query(`UPDATE notifications SET is_read = true,
    read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
    WHERE id = $1 AND user_id = $2 RETURNING ${projection}`, [id, userId]);
  if (!result.rows[0]) throw new AccessError(404, 'Notification not found.');
  return result.rows[0];
}

export function createInboxHandler(query: Query,
  authenticate: (request: VercelRequest) => Promise<AuthenticatedUser>, appUrl: () => string) {
  return async (request: VercelRequest, response: VercelResponse) => {
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Vary', 'Cookie');
    try {
      if (request.method !== 'GET' && request.method !== 'POST') {
        response.setHeader('Allow', 'GET, POST');
        throw new AccessError(405, 'Method not allowed.');
      }
      const user = await authenticate(request);
      if (!canActAsRole(user, USER_ROLES).allowed) throw new AccessError(403, 'Access denied.');
      if (request.method === 'GET') {
        sendJson(response, 200, { notifications: await listInbox(query, user.id) });
        return;
      }
      if (request.headers.origin !== appUrl()) throw new AccessError(403, 'Access denied.');
      const body = request.body as Record<string, unknown> | null;
      if (!body || typeof body !== 'object' || Array.isArray(body)
        || Object.keys(body).some(key => !['action', 'id'].includes(key))
        || body.action !== 'mark_read' || typeof body.id !== 'string'
        || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)) {
        throw new AccessError(400, 'Provide a valid notification ID and mark_read action.');
      }
      sendJson(response, 200, { notification: await markInboxRead(query, user.id, body.id) });
    } catch (error) {
      sendJson(response, error instanceof AccessError ? error.status : 503, {
        error: error instanceof AccessError ? error.message : 'Notifications unavailable. Please try again.',
      });
    }
  };
}
