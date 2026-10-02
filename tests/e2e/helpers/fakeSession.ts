// Playwright helper: sign the browser in as a role without a backend.
// Answers the session and notification calls the shared header makes, so any
// signed-in page renders with the right navigation. Add page.route() calls
// for your story's own endpoints after this. See docs/frontend-guide.md.
//
//   await signInAs(page, 'venue_staff');
//   await page.route('**/api/venues**', route => route.fulfill({ json: { venues: [] } }));
//   await page.goto('/venue/inventory');
import type { Page } from '@playwright/test';

export type TestRole = 'attendee' | 'event_organiser' | 'event_coordinator' | 'venue_staff' | 'technical_support_staff' | 'admin';

export async function signInAs(page: Page, role: TestRole, options: { email?: string; notifications?: unknown[] } = {}) {
  await page.route('**/api/auth/session', route => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({ json: { user: {
      id: `test-${role}`, email: options.email ?? `${role}@example.com`, role,
      clientOrgId: role === 'event_organiser' ? 'client-a' : null,
    } } });
  });
  await page.route('**/api/notifications', route => route.request().method() === 'GET'
    ? route.fulfill({ json: { notifications: options.notifications ?? [] } })
    : route.fallback());
}
