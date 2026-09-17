import { runtimeConfig, requireEnv } from '../../backend/src/config.js';
import { AccessError } from '../../backend/src/modules/eventVisibility/service.js';
import { login, sessionToken, tokenDigest } from '../../backend/src/modules/accessControl/sessions.js';
import { currentUser, respond, databasePool, query } from '../../backend/src/modules/eventVisibility/runtime.js';
import type { VercelRequest, VercelResponse } from '../../backend/src/vercel.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await respond(response, async () => {
    if (request.method === 'GET') {
      // Idempotent whoami. No side effects, so skip the origin check that CSRF-protects the mutating branches.
      const user = await currentUser(request);
      return { user: { id: user.id, email: user.email, role: user.role, clientOrgId: user.clientOrgId } };
    }
    if (request.method !== 'POST' && request.method !== 'DELETE') throw new AccessError(405, 'Method not allowed.');
    if (request.headers.origin !== requireEnv(runtimeConfig.appUrl, 'APP_URL')) throw new AccessError(403, 'Access denied.');
    const flags = `Path=/; HttpOnly; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
    if (request.method === 'DELETE') {
      const token = sessionToken(request);
      if (token) await query('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenDigest(token)]);
      response.setHeader('Set-Cookie', `cs_access=; Max-Age=0; ${flags}`);
      return { signedOut: true };
    }
    const body = request.body as { email?: unknown; password?: unknown } | undefined;
    // Runtime type validation only; no password value is embedded here.
    if (typeof body?.email !== 'string' || typeof body.password !== 'string' || body.email.length > 255 || body.password.length > 1024) { // pragma: allowlist secret
      throw new AccessError(400, 'Enter your email and password.');
    }
    const token = await login(databasePool(), body.email, body.password);
    response.setHeader('Set-Cookie', `cs_access=${token}; Max-Age=3600; ${flags}`);
    return { signedIn: true };
  });
}
