// /home sends a signed-in user to their role's home page (roles.ts), and a
// signed-out visitor to sign in. Links such as "Back to my home page" use it
// so they never need to know the user's role.
import { Navigate } from 'react-router-dom';
import { useSession } from '../shared/session';
import { homeFor } from './roles';

export function HomeRedirect() {
  const session = useSession();
  if (session.status === 'loading') return <p role="status" className="visually-hidden">Finding your home page…</p>;
  if (session.status === 'signed-out') return <Navigate to="/login" replace />;
  return <Navigate to={homeFor(session.user.role)} replace />;
}
