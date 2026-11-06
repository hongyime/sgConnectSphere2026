import { expect, test, type Page } from '@playwright/test';
import { signInAs, type TestRole } from './helpers/fakeSession';

// E01 cases from docs/testing/cases/E01.md. Most are proven against real
// PostgreSQL in backend/tests (search for the TC ID); the role landing pages
// of E01-S13 are browser behaviour, so they live here.
// E01-S01 is active in tests/auth-e2e/loginRecovery.spec.ts.

// Pages behind each landing call their own endpoints; answer them all with a
// refusal so only the routing and the shared header are under test.
async function signedInLanding(page: Page, role: TestRole) {
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Not under test.' } }));
  await signInAs(page, role);
  await page.goto('/home');
}

const mainLinks = (page: Page) => page.getByRole('navigation', { name: 'Main' }).getByRole('link');
const coordinatorPages = ['Dashboard', 'Equipment requests', 'Review queue', 'Reassignments', 'Venue search', 'Venue calendar'];

test.describe('E01-S13', () => {
  test('TC_E01S13_01 — a Lead lands on the unassigned queue with the oversight view in the navigation and no Coordinator pages', async ({ page }) => {
    await signedInLanding(page, 'event_coordinator_lead');
    await expect(page).toHaveURL(/\/coordinator-lead\/queue$/);
    for (const label of coordinatorPages) await expect(mainLinks(page).filter({ hasText: label })).toHaveCount(0);
    await expect(mainLinks(page).filter({ hasText: /oversight/i })).toHaveCount(1);
  });

  test('TC_E01S13_01 — a Safety Officer lands on the events awaiting safety check with no Lead or Coordinator pages', async ({ page }) => {
    await signedInLanding(page, 'safety_officer');
    await expect(page).toHaveURL(/\/safety\/queue$/);
    await expect(mainLinks(page)).toHaveText(['Safety review queue']);
  });

  // The landings TC_E01S01_01 established for the five existing roles.
  const existing: [TestRole, RegExp][] = [
    ['event_organiser', /\/events$/],
    ['event_coordinator', /\/coordinator$/],
    ['venue_staff', /\/venue\/inventory$/],
    ['technical_support_staff', /\/support$/],
    ['attendee', /\/attendee\/events$/],
  ];
  test('TC_E01S13_02 — the five existing roles still land on the dashboards they did before', async ({ context }) => {
    for (const [role, home] of existing) {
      const page = await context.newPage();
      await signedInLanding(page, role);
      await expect(page, role).toHaveURL(home);
      await page.close();
    }
  });
});
