// Frame for every signed-in page: a skip link and the shared header above
// the page itself. Pages render their own <main>; the shell adds only what
// every page shares.
import type { MouseEvent } from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from '../features/shell/AppHeader';

// Moves focus past the header to the page's <main> (design.md section 9).
// Every page renders one, so this works without each page adding an id.
function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
  const main = document.querySelector<HTMLElement>('main');
  if (!main) return;
  event.preventDefault();
  if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
  main.focus();
}

export function AppShell() {
  return (
    <>
      <a className="skip-link" href="#main" onClick={skipToContent}>Skip to content</a>
      <AppHeader />
      <Outlet />
    </>
  );
}
