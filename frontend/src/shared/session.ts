// The signed-in user, from GET /api/auth/session (api/auth/session.ts).
// Used by the shared header (features/shell/AppHeader.tsx) and by any screen
// that needs the current user or role.
import { useEffect, useState } from 'react';

export type SessionUser = { id: string; email: string; role: string; clientOrgId: string | null };
export type SessionState =
  | { status: 'loading' }
  | { status: 'signed-in'; user: SessionUser }
  | { status: 'signed-out' };

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/session', { credentials: 'same-origin', signal: controller.signal })
      .then(async response => {
        const body = response.ok ? await response.json() as { user?: SessionUser } : null;
        setState(body?.user ? { status: 'signed-in', user: body.user } : { status: 'signed-out' });
      })
      .catch(error => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setState({ status: 'signed-out' });
      });
    return () => controller.abort();
  }, []);
  return state;
}
