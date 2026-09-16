import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './login.css';

type WhoAmIResponse = { user?: { role?: string } };

const roleHome: Record<string, string> = {
  attendee:            '/attendee/events',
  event_organiser:     '/events',
  event_coordinator:   '/events',
  venue_staff:         '/events',
  technical_support:   '/events',
  admin:               '/events',
};

export function LoginPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // Cheap resume-on-load: if the browser already has a live session cookie, skip the login form.
    let cancelled = false;
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() as Promise<WhoAmIResponse> : null)
      .then(payload => { if (!cancelled && payload?.user?.role) navigate(roleHome[payload.user.role] ?? '/events', { replace: true }); })
      .catch(() => { /* Silent on network failure - fall through to the form. */ });
    return () => { cancelled = true; };
  }, [navigate]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const form = event.currentTarget;
      const payload = Object.fromEntries(new FormData(form));
      const response = await fetch('/api/auth/session', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.status !== 200) {
        const problem = await response.json().catch(() => ({ error: 'Unable to sign in. Please try again.' }));
        setError(problem.error ?? 'Unable to sign in. Please try again.');
        return;
      }
      const who = await fetch('/api/auth/session', { credentials: 'same-origin' })
        .then(response => response.ok ? response.json() as Promise<WhoAmIResponse> : null)
        .catch(() => null);
      navigate(roleHome[who?.user?.role ?? 'attendee'] ?? '/events', { replace: true });
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="login-page">
      <div className="login-card">
        <h1>Sign in</h1>
        <p className="login-copy">Use your school email and account password.</p>
        <form onSubmit={submit} noValidate>
          <div className="login-field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" name="email" type="email" autoComplete="email" required disabled={pending} maxLength={255} />
          </div>
          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" name="password" type="password" autoComplete="current-password" required disabled={pending} />
          </div>
          <div role="alert" aria-live="polite" className="login-error">{error}</div>
          <button className="login-submit" type="submit" disabled={pending}>{pending ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <p className="login-footer">
          No account yet? <Link to="/register">Create an attendee account.</Link>
        </p>
      </div>
    </main>
  );
}
