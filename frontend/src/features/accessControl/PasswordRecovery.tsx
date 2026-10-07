import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import './login.css';

export function PasswordRecovery({ reset = false }: { reset?: boolean }) {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (reset) window.history.replaceState(window.history.state, '', window.location.pathname);
  }, [reset]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setError('');
    if (reset && data.get('password') !== data.get('confirmPassword')) {
      setError('Passwords must match.');
      return;
    }
    setPending(true);
    try {
      const response = await fetch(`/api/auth/${reset ? 'reset-password' : 'request-reset'}`, {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(reset ? { token, password: data.get('password') } : { email: data.get('email') }),
      });
      const result = await response.json();
      if (!response.ok) setError(result.error ?? 'Unable to complete your request. Please try again.');
      else setMessage(result.message);
    } catch { setError('Unable to reach the server. Please try again.'); }
    finally { setPending(false); }
  }

  const invalidLink = reset && !/^[a-f0-9]{64}$/.test(token);
  return <main className="login-page"><div className="login-card">
    <h1>{reset ? 'Set a new password' : 'Reset your password'}</h1>
    <p className="login-copy">{reset
      ? 'Choose a password with at least 12 characters, one uppercase letter, one number and one special character.'
      : 'Enter your registered email. We’ll email you a single-use link that expires 15 minutes after it is issued.'}</p>
    {invalidLink ? <p role="alert">This reset link is invalid. Request a new link below.</p>
      : message ? <p role="status">{message}</p>
        : <form onSubmit={submit} noValidate>
          {reset ? <>
            <div className="login-field"><label htmlFor="new-password">New password</label>
              <input id="new-password" name="password" type="password" autoComplete="new-password" maxLength={1024} disabled={pending} required /></div>
            <div className="login-field"><label htmlFor="confirm-password">Confirm new password</label>
              <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" maxLength={1024} disabled={pending} required /></div>
          </> : <div className="login-field"><label htmlFor="reset-email">Email</label>
            <input id="reset-email" name="email" type="email" autoComplete="email" maxLength={255} disabled={pending} required /></div>}
          <div role="alert" aria-live="polite" className="login-error">{error}</div>
          <button className="login-submit" type="submit" disabled={pending}>
            {pending ? 'Please wait…' : reset ? 'Save new password' : 'Send reset link'}
          </button>
        </form>}
    {reset && <p className="login-footer"><Link to="/forgot-password">Request a new reset link</Link></p>}
    <p className="login-footer"><Link to="/login">Back to sign in</Link></p>
  </div></main>;
}
