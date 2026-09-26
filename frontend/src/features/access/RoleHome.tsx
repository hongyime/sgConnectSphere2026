// SCAFFOLD: replace with real E01-S01 implementation. Safe to delete/rewrite entirely.

import { Link } from 'react-router-dom';
import './role-home.css';

export function RoleHome() {
  return (
    <main className="role-home-page" data-scaffold="true">
      <header>
        <p className="eyebrow">Access and Account</p>
        <h1>Role-aware Home</h1>
      </header>
      <p>
        Post-login landing page. Shows role-based priority queues, pending
        actions, and recent notifications. Dashboard cards and module links
        adapt to the active role; permissioned links hide unavailable modules
        (E01-S01).
      </p>
      <nav>
        <Link to="/organiser" className="secondary-action">Organiser workspace</Link>
        <Link to="/coordinator" className="secondary-action">Coordinator workspace</Link>
        <Link to="/venue" className="secondary-action">Venue workspace</Link>
        <Link to="/support" className="secondary-action">Technical support workspace</Link>
        <Link to="/attendee/discover" className="secondary-action">Attendee discover</Link>
        <Link to="/admin" className="secondary-action">Admin workspace</Link>
      </nav>
    </main>
  );
}
