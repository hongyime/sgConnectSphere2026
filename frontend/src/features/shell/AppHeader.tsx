// Shared app header: brand, role-aware links, notifications, profile and
// sign out. Reads the signed-in user from GET /api/auth/session and signs out
// with DELETE /api/auth/session (both from api/auth/session.ts).
//
// AppShell (app/AppShell.tsx) renders it above every signed-in route. Each
// role's links and home page come from app/roles.ts.
import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, LogOut, UserRound } from 'lucide-react';
import { listNotifications } from '../notifications/notificationsApi';
import { homeFor, isRole, roleLabel, roleNavigation } from '../../app/roles';
import './appHeader.css';

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

function useUnreadCount(enabled: boolean) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    listNotifications().then(result => {
      if (active && result.ok) setCount(result.notifications.filter(item => !item.is_read).length);
    });
    return () => { active = false; };
  }, [enabled]);
  return count;
}

export function AppHeader() {
  const session = useSession();
  const navigate = useNavigate();
  const signedIn = session.status === 'signed-in';
  const unread = useUnreadCount(signedIn);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const role = signedIn && isRole(session.user.role) ? session.user.role : null;
  const links = role ? roleNavigation[role] : [];
  const home = signedIn ? homeFor(session.user.role) : '/';

  async function signOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      const response = await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin' });
      if (!response.ok) throw new Error();
      navigate('/login', { replace: true });
    } catch {
      setSignOutError('Sign out failed. Please try again.');
      setSigningOut(false);
    }
  }

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link to={home} className="app-header-brand">ConnectSphere</Link>
        {links.length > 0 ? (
          <nav className="app-header-nav" aria-label="Main">
            {links.map(link => (
              <NavLink key={link.to} to={link.to} end={link.end}>{link.label}</NavLink>
            ))}
          </nav>
        ) : <span className="app-header-spacer" />}
        <div className="app-header-actions">
          {session.status === 'loading' ? <span className="app-header-placeholder" aria-hidden="true" /> : null}
          {signedIn ? (
            <>
              <NavLink
                to="/notifications"
                className="app-header-icon"
                aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
              >
                <Bell size={18} aria-hidden="true" />
                {unread ? <span className="app-header-badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</span> : null}
              </NavLink>
              <NavLink to="/profile" className="app-header-icon" aria-label="Profile">
                <UserRound size={18} aria-hidden="true" />
              </NavLink>
              <span className="app-header-role">{role ? roleLabel[role] : session.user.role}</span>
              <button type="button" className="app-header-signout" onClick={signOut} disabled={signingOut} aria-label={signingOut ? 'Signing out' : 'Sign out'}>
                <LogOut size={16} aria-hidden="true" />
                <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
              </button>
            </>
          ) : null}
          {session.status === 'signed-out' ? <Link to="/login" className="app-header-signin">Sign in</Link> : null}
        </div>
      </div>
      {signOutError ? <p role="alert" className="app-header-error">{signOutError}</p> : null}
    </header>
  );
}
