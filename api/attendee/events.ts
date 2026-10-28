import { isAllowedOrigin } from '../../backend/src/config.js';
import { sendJson } from '../../backend/src/http.js';
import { AccessError } from '../../backend/src/modules/eventVisibility/service.js';
import { currentUser, databasePool, query, respond, respondWithResult } from '../../backend/src/modules/eventVisibility/runtime.js';
import { attendeeEvents } from '../../backend/src/modules/attendeeVisibility/service.js';
import { getRegistrationForm, listOpenEvents, registerForEvent, withdrawRegistration } from '../../backend/src/modules/attendeeRegistration/service.js';
import type { VercelRequest, VercelResponse } from '../../backend/src/vercel.js';

// GET              the Attendee's registered events (?id= for one)
// GET  ?open=1     Confirmed events taking registrations (E09-S01 discovery)
// GET  ?registration=1&id=   the registration form for one event
// POST ?registration=1&id=   register, body { sessionIds: string[] }
// POST ?registration=1&withdraw=1&id=   withdraw the Attendee's own registration (E09-S05)
export default async function handler(request: VercelRequest, response: VercelResponse) {
  const params = new URL(request.url || '/', 'http://localhost').searchParams;
  const id = params.get('id') || undefined;
  if (request.method === 'POST' && params.get('registration') === '1') {
    await respondWithResult(response, async () => {
      // Same origin check as the other cookie-authenticated write routes.
      if (!isAllowedOrigin(request.headers.origin)) throw new AccessError(403, 'Request origin not allowed.');
      if (params.get('withdraw') === '1') return withdrawRegistration(databasePool(), await currentUser(request), id ?? '');
      return registerForEvent(databasePool(), await currentUser(request), id ?? '', request.body);
    });
    return;
  }
  if (request.method !== 'GET') {
    response.setHeader('allow', 'GET, POST');
    sendJson(response, 405, { error: 'method_not_allowed' });
    return;
  }
  await respond(response, async () => {
    const user = await currentUser(request);
    if (params.get('open') === '1') return { events: await listOpenEvents(query, user) };
    if (params.get('registration') === '1') return await getRegistrationForm(query, user, id ?? '');
    return { events: await attendeeEvents(query, user, id) };
  });
}
