import { runtimeConfig, requireEnv } from '../../backend/src/config.js';
import { currentUser, query, databasePool } from '../../backend/src/modules/eventVisibility/runtime.js';
import { AccessError } from '../../backend/src/modules/eventVisibility/service.js';
import { loadProfile, updateProfile, ProfileValidationError, type ProfileRepository } from '../../backend/src/modules/accessControl/profile.js';
import { createProfileRepository } from '../../backend/src/modules/accessControl/profileRepository.js';
import type { AuthenticatedUser } from '../../backend/src/modules/accessControl/types.js';
import type { VercelRequest, VercelResponse } from '../../backend/src/vercel.js';
import { deactivateAccount, DeactivationBlockedError } from '../../backend/src/modules/accessControl/deactivation.js';
import { sendJson } from '../../backend/src/http.js';

export function createProfileHandler(repository: ProfileRepository, authenticate: (request: VercelRequest) => Promise<AuthenticatedUser>, appUrl: () => string, deactivate: (user: AuthenticatedUser, body: unknown) => Promise<Record<string, unknown>> = (user, body) => deactivateAccount(databasePool(), user, body)) {
  return async (request: VercelRequest, response: VercelResponse) => {
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Vary', 'Cookie');
    try {
      if (request.method !== 'GET' && request.method !== 'PUT' && request.method !== 'DELETE') {
        response.setHeader('Allow', 'GET, PUT, DELETE');
        throw new AccessError(405, 'Method not allowed.');
      }
      const user = await authenticate(request);
      if (request.method !== 'GET' && request.headers.origin !== appUrl()) throw new AccessError(403, 'Access denied.');
      if (request.method === 'DELETE') {
        const result = await deactivate(user, request.body);
        const flags = `Path=/; HttpOnly; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
        response.setHeader('Set-Cookie', `cs_access=; Max-Age=0; ${flags}`);
        sendJson(response, 200, result);
        return;
      }
      const profile = request.method === 'GET' ? await loadProfile(repository, user) : await updateProfile(repository, user, request.body);
      sendJson(response, 200, { profile });
    } catch (error) {
      sendJson(response, error instanceof AccessError ? error.status : 503, {
        error: error instanceof AccessError ? error.message : 'Service unavailable. Please try again.',
        ...(error instanceof DeactivationBlockedError ? { events: error.events } : {}),
        ...(error instanceof ProfileValidationError ? { errors: error.errors } : {}),
      });
    }
  };
}

export default createProfileHandler(createProfileRepository(query), currentUser, () => requireEnv(runtimeConfig.appUrl, 'APP_URL'));
