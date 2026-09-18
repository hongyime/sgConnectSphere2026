import { createServer } from 'node:http';
import register from '../../api/auth/register.js';
import session from '../../api/auth/session.js';
import profile from '../../api/account/profile.js';
import events from '../../api/events.js';
import attendeeEvents from '../../api/attendee/events.js';
import internalPlanning from '../../api/internal/planning.js';
import venues from '../../api/venues/index.js';

const routes: Record<string, Record<string, typeof register>> = {
  '/api/auth/register': { POST: register },
  '/api/auth/session': { GET: session, POST: session, DELETE: session },
  '/api/auth/verify': { POST: session },
  '/api/auth/request-reset': { POST: session },
  '/api/auth/reset-password': { POST: session },
  '/api/account/profile': { GET: profile, PUT: profile },
  '/api/events': { GET: events, POST: events, PATCH: events, DELETE: events },
  '/api/attendee/events': { GET: attendeeEvents },
  '/api/internal/planning': { GET: internalPlanning },
  '/api/venues': { GET: venues, POST: venues },
};

// Mirrors vercel.json's rewrite (/api/auth/verify -> /api/auth/session?task=verify)
// so both auth flows keep shipping as one function on Vercel's Hobby plan.
function rewrittenUrl(pathname: string, originalUrl: string): string {
  const tasks: Record<string, string> = {
    '/api/auth/verify': 'verify', '/api/auth/request-reset': 'request-reset', '/api/auth/reset-password': 'reset-password', // pragma: allowlist secret - route names
  };
  if (!tasks[pathname]) return originalUrl;
  const parsed = new URL(originalUrl, 'http://localhost');
  parsed.searchParams.set('task', tasks[pathname]);
  return parsed.pathname + parsed.search;
}

createServer(async (request, response) => {
  const pathname = new URL(request.url || '/', 'http://localhost').pathname;
  const handler = routes[pathname]?.[request.method || 'GET'];
  if (!handler) { response.writeHead(404).end(); return; }
  try {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 1024 * 1024) { response.writeHead(413).end(); return; }
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString();
    const json = (body: unknown) => { response.end(JSON.stringify(body)); };
    await handler({
      url: rewrittenUrl(pathname, request.url || '/'), method: request.method, headers: request.headers,
      body: raw ? JSON.parse(raw) : undefined,
    }, {
      setHeader: (name: string, value: string) => { response.setHeader(name, value); },
      status: (code: number) => { response.statusCode = code; return { json }; }, json,
    });
  } catch { response.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'invalid_json' })); }
}).listen(Number(process.env.PORT ?? 3001), '127.0.0.1', () => console.log('Local API ready'));
