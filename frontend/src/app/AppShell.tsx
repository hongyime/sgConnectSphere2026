// Frame for every signed-in page: the shared header above the page itself.
// Pages render their own <main>; the shell adds only what every page shares.
import { Outlet } from 'react-router-dom';
import { AppHeader } from '../features/shell/AppHeader';

export function AppShell() {
  return (
    <>
      <AppHeader />
      <Outlet />
    </>
  );
}
