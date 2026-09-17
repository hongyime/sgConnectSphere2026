// E14-S02 access-denied landing page.
//
// Renders when a signed-in user tries to open a route they do not have a role
// for. Kept intentionally text-only: no event details, no roster hints, no
// venue names. Matches the workbook's "Denied screens avoid leaking event
// details" convention. An audit entry is expected to be written by the API
// on the request that led here, not by this page.

import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import './permission-denied.css';

export function PermissionDenied() {
  return (
    <main className="permission-denied-page">
      <section className="permission-denied-card">
        <ShieldAlert size={32} aria-hidden="true" />
        <h1>Permission denied</h1>
        <p role="alert">You do not have access to this page. If you believe this is a mistake, contact your administrator.</p>
        <div className="permission-denied-actions">
          <Link className="primary-action" to="/">Back to home</Link>
          <Link className="secondary-action" to="/login">Sign in as another user</Link>
        </div>
      </section>
    </main>
  );
}
