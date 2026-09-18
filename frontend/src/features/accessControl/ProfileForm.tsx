import { useEffect, useState, type FormEvent } from 'react';
import './registration.css';

type Profile = { full_name: string; email: string; contact_number: string | null; organisation_name: string | null };
const fields = [
  { name: 'full_name', label: 'Full name', type: 'text', autoComplete: 'name', maxLength: 160 },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', maxLength: 255 },
  { name: 'contact_number', label: 'Contact number', type: 'tel', autoComplete: 'tel', maxLength: 32 },
] as const;

export function ProfileForm() {
  const [profile, setProfile] = useState<Profile>();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(true);
  const [signIn, setSignIn] = useState(false);
  const [revision, setRevision] = useState(0);
  const [saved, setSaved] = useState(false);
  const [deactivateMessage, setDeactivateMessage] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setErrors({});
    fetch('/api/account/profile', { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) { setSignIn(response.status === 401); setProfile(undefined); throw new Error(data.error); }
      setSignIn(false); setProfile(data.profile);
    }).catch(error => {
      if (!controller.signal.aborted) setErrors({ form: [error instanceof Error ? error.message : 'Unable to load profile.'] });
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

  return <main className="registration-page">
    <a href="/">ConnectSphere</a><h1>My Profile</h1>
    <div role="alert">{errors.form?.map(message => <p key={message}>{message}</p>)}</div>
    {busy && <p role="status">Loading...</p>}
    {saved && <p role="status">Your profile has been saved.</p>}
    {signIn ? <form onSubmit={submit}>
      <h2>Sign in</h2>
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
      <button disabled={busy}>Sign in</button>
    </form> : profile ? <form onSubmit={submit} noValidate>
      <p>Name, email and contact number are required.</p>
      {fields.map(field => <div className="registration-field" key={field.name}>
        <label htmlFor={`profile-${field.name}`}>{field.label}</label>
        <input {...field} id={`profile-${field.name}`} required disabled={busy}
          value={profile[field.name] ?? ''} onChange={event => { setSaved(false); setProfile({ ...profile, [field.name]: event.target.value }); }}
          aria-invalid={Boolean(errors[field.name])} aria-describedby={`${field.name}-errors`} />
        <div id={`${field.name}-errors`} aria-live="polite">{errors[field.name]?.map(message => <p key={message}>{message}</p>)}</div>
      </div>)}
      {profile.organisation_name && (
        <div className="profile-organisation">
          <p>Organisation: {profile.organisation_name}</p>
          <small className="profile-hint">Organisation changes require admin approval — contact your Coordinator to update this.</small>
        </div>
      )}
      <button className="primary-action" disabled={busy}>Save profile</button>
    </form> : !busy && <button onClick={() => setRevision(value => value + 1)}>Try again</button>}
    {profile && !signIn && <section className="profile-danger-zone">
      <h2>Deactivate account</h2>
      <p>Deactivating your account signs you out and stops you from using ConnectSphere, while your historical records are retained.</p>
      <button type="button" className="profile-danger-button" onClick={() => setDeactivateMessage(true)}>Deactivate account</button>
      {deactivateMessage && <p role="status" className="profile-hint">This feature isn't available yet. Contact your Coordinator or Administrator if you need your account deactivated.</p>}
    </section>}
  </main>;
}
