import { createServer } from 'node:http';
import register from '../../api/auth/register.js';
import session from '../../api/auth/session.js';
import profile from '../../api/account/profile.js';

createServer(async (request, response) => {
  const handler = ({ '/api/auth/register': register, '/api/auth/session': session, '/api/account/profile': profile } as const)[new URL(request.url || '/', 'http://localhost').pathname as '/api/auth/register'];
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
    await handler({ url: request.url, method: request.method, headers: request.headers, body: raw ? JSON.parse(raw) : undefined }, {
      setHeader: (name: string, value: string) => { response.setHeader(name, value); },
      status: (code: number) => { response.statusCode = code; return { json }; }, json,
    });
  } catch { response.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'invalid_json' })); }
}).listen(3001, '127.0.0.1', () => console.log('Local API listening on http://127.0.0.1:3001'));
