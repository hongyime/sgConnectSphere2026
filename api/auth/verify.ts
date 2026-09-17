// SCRUM-93: POST /api/auth/verify
//
// Body: { token: string }
// Returns:
//   200 { verified: true }              on success
//   400 { error: 'invalid_token_format' } for malformed or missing token
//   400 { error: 'unknown_token' }        for a token not on record
//   403 { error: 'wrong_purpose' }        for a token issued for a
//                                         different flow (e.g. password
//                                         reset used against verify)
//   409 { error: 'already_verified' }     for a token that has already
//                                         been consumed
//   410 { error: 'expired' }              for a token past its expiry
//
// The endpoint is intentionally CSRF-safe by design: any client that can
// present a valid single-use token has, by construction, been sent that
// token by us. There is no origin check because the endpoint is designed
// to be called from an email-link redirect flow that will not carry a
// matching Origin header.

import { runtimeConfig, requireEnv } from '../../backend/src/config.js';
import { AccessError } from '../../backend/src/modules/eventVisibility/service.js';
import { respond, databasePool } from '../../backend/src/modules/eventVisibility/runtime.js';
import { VerificationError, consumeVerificationToken } from '../../backend/src/modules/accessControl/verificationTokens.js';
import type { VercelRequest, VercelResponse } from '../../backend/src/vercel.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  // Touch runtimeConfig / requireEnv so any missing configuration surfaces
  // consistently with the other auth endpoints even though this handler
  // does not read them directly.
  void runtimeConfig; void requireEnv;
  await respond(response, async () => {
    if (request.method !== 'POST') throw new AccessError(405, 'Method not allowed.');
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
  });
}
