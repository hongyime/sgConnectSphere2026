import { runtimeConfig, requireEnv } from '../../backend/src/config.js';
import { currentUser, query } from '../../backend/src/modules/eventVisibility/runtime.js';
import { AccessError, type Query } from '../../backend/src/modules/eventVisibility/service.js';
import { loadProfile, updateProfile, ProfileValidationError, type ProfileRepository } from '../../backend/src/modules/accessControl/profile.js';
import { createProfileRepository } from '../../backend/src/modules/accessControl/profileRepository.js';
import type { AuthenticatedUser } from '../../backend/src/modules/accessControl/types.js';
import type { VercelRequest, VercelResponse } from '../../backend/src/vercel.js';
import { sendJson } from '../../backend/src/http.js';

export function createProfileHandler(
  repository: ProfileRepository,
  authenticate: (request: VercelRequest) => Promise<AuthenticatedUser>,
  appUrl: () => string,
  auditQuery: Query = query,
) {
  return async (request: VercelRequest, response: VercelResponse) => {
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Vary', 'Cookie');
    try {
      if (request.method !== 'GET' && request.method !== 'PUT') {
        response.setHeader('Allow', 'GET, PUT');
        throw new AccessError(405, 'Method not allowed.');
      }
      const user = await authenticate(request);
      if (request.method === 'PUT' && request.headers.origin !== appUrl()) throw new AccessError(403, 'Access denied.');
      const profile = request.method === 'GET'
        ? await loadProfile(auditQuery, repository, user)
        : await updateProfile(auditQuery, repository, user, request.body);
      sendJson(response, 200, { profile });
    } catch (error) {
      sendJson(response, error instanceof AccessError ? error.status : 503, {
        error: error instanceof AccessError ? error.message : 'Service unavailable. Please try again.',
        ...(error instanceof ProfileValidationError ? { errors: error.errors } : {}),
      });
    }
  };
}

export default createProfileHandler(createProfileRepository(query), currentUser, () => requireEnv(runtimeConfig.appUrl, 'APP_URL'));
