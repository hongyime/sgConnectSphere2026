import { runtimeConfig, requireEnv } from '../../backend/src/config.js';
import { AccessError } from '../../backend/src/modules/eventVisibility/service.js';
import { login, sessionToken, tokenDigest } from '../../backend/src/modules/accessControl/sessions.js';
import { currentUser, respond, databasePool, query } from '../../backend/src/modules/eventVisibility/runtime.js';
import { VerificationError, consumeVerificationToken } from '../../backend/src/modules/accessControl/verificationTokens.js';
import { requestPasswordReset, resetPassword, RESET_REQUEST_MESSAGE } from '../../backend/src/modules/accessControl/passwordReset.js';
import { canActAsRole } from '../../backend/src/modules/accessControl/service.js';
import { USER_ROLES } from '../../backend/src/modules/shared/roles.js';
import type { VercelRequest, VercelResponse } from '../../backend/src/vercel.js';

// /api/auth/verify rewrites here with ?task=verify (see vercel.json) so both
// auth endpoints ship as one function under the Vercel Hobby plan's function
// limit. The external URL frontend/e2e code calls is unchanged.
export default async function handler(request: VercelRequest, response: VercelResponse) {
  await respond(response, async () => {
    const task = new URL(request.url || '/', 'http://localhost').searchParams.get('task');

    if (task === 'request-reset' || task === 'reset-password') {
      if (request.method !== 'POST') throw new AccessError(405, 'Method not allowed.');
      if (request.headers.origin !== requireEnv(runtimeConfig.appUrl, 'APP_URL')) throw new AccessError(403, 'Access denied.');
      const body = request.body as Record<string, unknown> | undefined;
      if (task === 'request-reset') {
        if (typeof body?.email !== 'string' || body.email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
          throw new AccessError(400, 'Enter a valid email address.');
        }
        await requestPasswordReset(databasePool(), body.email);
        return { message: RESET_REQUEST_MESSAGE };
      }
      if (typeof body?.token !== 'string' || typeof body.password !== 'string') { // pragma: allowlist secret - runtime type validation
        throw new AccessError(400, 'Enter the reset token and your new password.');
      }
      await resetPassword(databasePool(), body.token, body.password);
      return { message: 'Your password has been reset. Sign in with your new password.' };
    }

    if (task === 'verify') {
      if (request.method !== 'POST') throw new AccessError(405, 'Method not allowed.');
      // Intentionally CSRF-safe by design, not by origin check: any client that
      // can present a valid single-use token has, by construction, been sent
      // that token by us. There is no origin check because this is designed to
      // be called from an email-link redirect flow that will not carry a
      // matching Origin header.
      const body = request.body as { token?: unknown } | undefined;
      if (!body || typeof body.token !== 'string' || body.token.length === 0) {
        throw new AccessError(400, 'Enter the verification token from your email.');
      }
      try {
        await consumeVerificationToken(databasePool(), body.token, 'email_verification');
        return { verified: true };
      } catch (error) {
        if (error instanceof VerificationError) {
          switch (error.code) {
            case 'unknown':       throw new AccessError(400, 'invalid_token_format');
            case 'expired':       throw new AccessError(410, 'expired');
            case 'consumed':      throw new AccessError(409, 'already_verified');
            case 'wrong_purpose': throw new AccessError(403, 'wrong_purpose');
          }
        }
        throw error;
      }
    }

    if (request.method === 'GET') {
      // Idempotent whoami. No side effects, so skip the origin check that CSRF-protects the mutating branches.
      const user = await currentUser(request);
      if (!canActAsRole(user, USER_ROLES).allowed) throw new AccessError(401, 'Sign in to continue.');
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
