import { test, expect } from '@playwright/test';

// Sign-in checks against the deployed site (BASE_URL). Each seeded demo
// account signs in once with the correct password, so no failed attempt can
// count towards a lockout, lands on its role's home, and signs out. Not
// read-only: each sign-in resets the account's failed-login count and creates
// a session row, which the sign-out removes. Nothing else is created.
const password = process.env.DEPLOYED_DEMO_PASSWORD ?? 'ValidPass123'; // pragma: allowlist secret - public synthetic seed credential (T-97)

const accounts = [
  { email: 'organiser_a@clienta.com', role: 'Event Organiser', home: /\/events$/ },
  { email: 'coord_a@connectsphere.com', role: 'Event Coordinator', home: /\/coordinator$/ },
  { email: 'coord_lead@connectsphere.com', role: 'Event Coordinator Lead', home: /\/coordinator-lead\/queue$/ },
  { email: 'safety_officer@connectsphere.com', role: 'Safety Officer', home: /\/safety\/queue$/ },
  { email: 'venue_a@connectsphere.com', role: 'Venue Staff', home: /\/venue\/inventory$/ },
  { email: 'tech_a@connectsphere.com', role: 'Technical Support Staff', home: /\/support$/ },
  { email: 'attendee_a@example.com', role: 'Attendee', home: /\/attendee\/events$/ },
];

for (const account of accounts) {
  test(`TC_E01S01_01 deployed sign-in as ${account.role} reaches that role's home, then signs out`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(account.email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(account.home, { timeout: 15_000 });
    await expect(page.getByRole('heading').first()).toBeVisible();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).not.toHaveURL(account.home);
  });
}
