import { useEffect, useState, type FormEvent } from 'react';
import './registration.css';

type Profile = { full_name: string; email: string; contact_number: string | null; organisation_name: string | null };
const fields = [
  { name: 'full_name', label: 'Full name', type: 'text', autoComplete: 'name', maxLength: 160 },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', maxLength: 255 },
  { name: 'contact_number', label: 'Contact number', type: 'tel', autoComplete: 'tel', maxLength: 32 },
] as const;
const LOAD_FAILED = 'Your profile could not be loaded. Please try again.';

export function ProfileForm() {
  const [profile, setProfile] = useState<Profile>();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(true);
  const [signIn, setSignIn] = useState(false);
  const [revision, setRevision] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [deactivationError, setDeactivationError] = useState('');
  const [blockingEvents, setBlockingEvents] = useState<{ id: string; title: string; event_code: string | null }[]>([]);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setErrors({});
    fetch('/api/account/profile', { signal: controller.signal }).then(async response => {
      // A crash page is not JSON, and an error or empty reply may carry no
      // message: fall back to a plain one so the retry never appears alone.
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setSignIn(response.status === 401); setProfile(undefined); throw new Error(data.error || LOAD_FAILED); }
      if (!data.profile) throw new Error(LOAD_FAILED);
      setSignIn(false); setProfile(data.profile);
    }).catch(error => {
      if (!controller.signal.aborted) setErrors({ form: [error instanceof Error && !(error instanceof TypeError) && error.message ? error.message : LOAD_FAILED] });
    }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [revision]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    setBusy(true); setErrors({}); setSaved(false);
    try {
      const response = await fetch(signIn ? '/api/auth/session' : '/api/account/profile', {
        method: signIn ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors(data.errors ?? { form: [data.error || 'Unable to save profile.'] });
        if (response.status === 401) { setProfile(undefined); setSignIn(true); }
        return;
      }
      if (signIn) { form.reset(); setRevision(value => value + 1); }
      else { setProfile(data.profile); setSaved(true); }
    } catch { setErrors({ form: ['Service unavailable. Please try again.'] }); }
    finally { setBusy(false); }
  }

  async function deactivate() {
    if (busy) return;
    setBusy(true); setSaved(false); setDeactivationError(''); setBlockingEvents([]);
    try {
      const response = await fetch('/api/account/profile', {
        method: 'DELETE', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        setDeactivationError(data.error || 'Unable to deactivate your account. Please try again.');
        setBlockingEvents(data.events ?? []);
        return;
      }
      setProfile(undefined); setSignIn(true);
      // Full navigation drops in-memory authenticated views; the server revoked
      // all sessions and expired the HttpOnly cookie before returning success.
      window.location.replace('/login');
    } catch { setDeactivationError('Unable to reach the server. Please try again.'); }
    finally { setBusy(false); }
  }

  return <main className="registration-page">
    <a href="/" className="registration-brand">ConnectSphere</a>
    <header className="page-heading">
      <p className="eyebrow">Account</p>
      <h1>My Profile</h1>
    </header>
    {errors.form?.length ? <div role="alert" className="login-error">{errors.form.map(message => <p key={message}>{message}</p>)}</div> : null}
    {busy && <p role="status">Loading...</p>}
    {saved && <p role="status" className="profile-saved-banner">Your profile has been saved.</p>}
    {signIn ? <form onSubmit={submit} className="card">
      <div className="form-section">
        <h2>Sign in</h2>
        <div className="registration-field"><label>Email<input name="email" type="email" autoComplete="username" required /></label></div>
        <div className="registration-field"><label>Password<input name="password" type="password" autoComplete="current-password" required /></label></div>
      </div>
      <div className="form-actions">
        <button className="primary-action" disabled={busy}>Sign in</button>
      </div>
    </form> : profile ? <form onSubmit={submit} noValidate className="card">
      <div className="form-section">
        <h2>Your details</h2>
        <p className="profile-hint">Name, email and contact number are required.</p>
        {fields.map(field => <div className="registration-field" key={field.name}>
          <label htmlFor={`profile-${field.name}`}>{field.label}</label>
          <input {...field} id={`profile-${field.name}`} required disabled={busy}
            value={profile[field.name] ?? ''} onChange={event => { setSaved(false); setProfile({ ...profile, [field.name]: event.target.value }); }}
            aria-invalid={Boolean(errors[field.name])} aria-describedby={`${field.name}-errors`} />
          <div id={`${field.name}-errors`} aria-live="polite">{errors[field.name]?.map(message => <p key={message} className="field-error">{message}</p>)}</div>
        </div>)}
        {profile.organisation_name && (
          <div className="profile-organisation">
            <p>Organisation: {profile.organisation_name}</p>
            <small className="profile-hint">Organisation changes require admin approval — contact your Coordinator to update this.</small>
          </div>
        )}
      </div>
      <div className="form-actions">
        <button className="primary-action" disabled={busy}>Save profile</button>
      </div>
    </form> : !busy && <button className="secondary-action" onClick={() => setRevision(value => value + 1)}>Try again</button>}
    {profile && !signIn && <section className="card profile-danger-zone" aria-label="Account deactivation">
      <div className="form-section">
        <h2>Deactivate Account</h2>
        {!confirming ? <button type="button" className="profile-danger-button" disabled={busy} onClick={() => setConfirming(true)}>Deactivate Account</button> : <>
          <p>Your account will be disabled and you will be signed out. Your historical records will be retained.
            Upcoming registrations and waitlist entries will be withdrawn even after the withdrawal deadline.</p>
          <div className="form-actions">
            <button type="button" className="secondary-action" disabled={busy} onClick={() => { setConfirming(false); setDeactivationError(''); setBlockingEvents([]); }}>Cancel deactivation</button>
            <button type="button" className="profile-danger-button" disabled={busy} onClick={() => void deactivate()}>Confirm deactivation</button>
          </div>
        </>}
        {deactivationError && <p role="alert" className="field-error">{deactivationError}</p>}
        {blockingEvents.length > 0 && <ul aria-label="Events requiring reassignment" className="validation-list">
          {blockingEvents.map(event => <li key={event.id}>{event.event_code ? `${event.event_code}: ` : ''}{event.title}</li>)}
        </ul>}
      </div>
    </section>}
  </main>;
}
