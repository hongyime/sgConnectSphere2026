// Frontend page for the email verification link (SCRUM-93 companion).
//
// A user clicks the verification link in their email. That link resolves to
// /verify?token=<hex>. This page reads the token from the URL, calls
// POST /api/auth/verify, and displays one of five states: pending, verified,
// expired, already-verified, invalid. Each state has a role-appropriate ARIA
// role and a next-step link so a signed-out user can still get to /login and
// a signed-in user can still get to /events.

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, MailCheck } from 'lucide-react';
import './verify.css';

type VerifyState = 'pending' | 'verified' | 'expired' | 'already_verified' | 'wrong_purpose' | 'invalid';

const stateCopy: Record<VerifyState, { role: 'status' | 'alert'; title: string; body: string }> = {
  pending:          { role: 'status', title: 'Verifying your email…',      body: 'Hold on while we check the link from your email.' },
  verified:         { role: 'status', title: 'Email verified',              body: 'Your account is confirmed. You can sign in.' },
  expired:          { role: 'alert',  title: 'This link has expired',       body: 'Ask for a fresh verification link and try again.' },
  already_verified: { role: 'status', title: 'Already verified',            body: 'Your email is already confirmed — no further action needed.' },
  wrong_purpose:    { role: 'alert',  title: 'This link is for another flow', body: 'The link you used was issued for password reset, not email verification.' },
  invalid:          { role: 'alert',  title: 'That link is not valid',      body: 'The link may be malformed. Check the email and try again.' },
};

export function VerifyPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<VerifyState>('pending');

  useEffect(() => {
    // Immediately reject an obviously-missing token so we do not hit the API
    // for something the API would reject anyway.
    if (!token) {
      setState('invalid');
      return;
    }
    let cancelled = false;
    async function verify() {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (response.status === 200)                     { setState('verified'); return; }
        if (response.status === 410)                     { setState('expired'); return; }
        if (response.status === 409)                     { setState('already_verified'); return; }
        if (response.status === 403)                     { setState('wrong_purpose'); return; }
        setState('invalid');
      } catch {
        if (!cancelled) setState('invalid');
      }
    }
    verify();
    return () => { cancelled = true; };
  }, [token]);

  const copy = stateCopy[state];
  const showRetry = state === 'expired' || state === 'invalid';
  return (
    <main className="verify-page">
      <section className="verify-card">
        <div className={`verify-icon verify-icon-${state === 'verified' || state === 'already_verified' ? 'ok' : state === 'pending' ? 'pending' : 'error'}`}>
          {state === 'verified' || state === 'already_verified' ? <CheckCircle2 size={28} aria-hidden="true" />
            : state === 'pending' ? <MailCheck size={28} aria-hidden="true" />
            : <AlertTriangle size={28} aria-hidden="true" />}
        </div>
        <h1>{copy.title}</h1>
        <p role={copy.role} aria-live="polite">{copy.body}</p>
        {state === 'pending' ? null : (
          <div className="verify-actions">
            <Link className="primary-action" to="/login">Sign in</Link>
            {showRetry ? (
              <Link className="secondary-action" to="/register">Register again</Link>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
