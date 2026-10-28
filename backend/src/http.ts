import type { VercelRequest, VercelResponse } from './vercel.js';

export function sendJson(
  response: VercelResponse,
  statusCode: number,
  body: Record<string, unknown>,
) {
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.status(statusCode).json(body);
}

export function requireMethod(
  request: VercelRequest,
  response: VercelResponse,
  allowedMethod: string,
) {
  if (request.method === allowedMethod) {
    return true;
  }

  response.setHeader('allow', allowedMethod);
  sendJson(response, 405, { error: 'method_not_allowed' });
  return false;
}

export function hasInternalSecret(request: VercelRequest, expectedSecret?: string) {
  if (!expectedSecret || expectedSecret.trim() === '') {
    return false;
  }

  const headerSecretValue = request.headers['x-internal-secret'];
  const headerSecret = Array.isArray(headerSecretValue)
    ? headerSecretValue[0]
    : headerSecretValue;
  const authHeaderValue = request.headers.authorization;
  const authHeader = Array.isArray(authHeaderValue) ? authHeaderValue[0] : authHeaderValue;
  const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  return headerSecret === expectedSecret || bearerSecret === expectedSecret;
}
