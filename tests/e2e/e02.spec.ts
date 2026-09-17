import { test, expect } from '@playwright/test';

// E02 - 13 cases. Generated from docs/testing/PROJECT TEST CASES.xlsx.
// Each test.fixme() is a specification. Remove .fixme once implemented.

// PR #65 added a real /organiser/new-request route, but it passes a
// getAccessToken stub ('mock-token') that fails real Supabase verification
// (SCRUM-90/91 not done yet, both unassigned). /prototype reproduces the
// same client-side-only behaviour these tests were written against. Reroute
// to /organiser/new-request once SCRUM-90/91 land and mock-token is replaced
// with real auth.
const ORGANISER_REQUEST_FORM_PATH = '/prototype';

async function fillMandatoryFields(page: import('@playwright/test').Page, overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    'Event name': 'Annual Tech Summit',
    Description: 'A summit bringing together the tech community.',
    Purpose: 'Share the annual technology roadmap.',
    'Expected attendance': '180',
    'Venue requirements': 'Seminar room with theatre seating',
    'Accessibility needs': 'Wheelchair access',
    ...overrides,
  };

  for (const [label, value] of Object.entries(values)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }

  if (!('Preferred start date and time' in overrides)) {
    await page.getByLabel('Preferred start date and time').fill('2026-11-15T09:00');
  }
  if (!('Preferred end date and time' in overrides)) {
    await page.getByLabel('Preferred end date and time').fill('2026-11-15T12:00');
  }

  for (const field of ['Equipment requirements', 'Layout preference', 'Registration setup']) {
    if (!(field in overrides)) {
      await page.getByLabel(`${field}: none required`).check();
    }
  }
}

test.describe("E02-S01", () => {

  /**
   * TC_E02S01_01
   * AC:      E02-S01 - Scenario 1 (Complete request submitted)
   * Sprint:  1.0
   *
   * Pre-conditions:
   *   organiser_a@clienta.com is signed in; a new event request form is open
   *
   * Test data:
   *   Event Name: Annual Tech Summit | Preferred Date: 15/11/2026 (future); all 10 fields completed
   *
   * Expected result:
   *   A confirmation message is shown and the request status becomes "Submitted"
   */
  test("TC_E02S01_01 - Verify that submitting a request with every mandatory field complete should set its status to Submitted and confirm to the Organiser", async ({ page }) => {
    await page.goto(ORGANISER_REQUEST_FORM_PATH);
    await fillMandatoryFields(page);
    await page.getByRole('button', { name: 'Submit request' }).click();
    await expect(page.getByText('Submitted', { exact: true })).toBeVisible();
  });

  /**
   * TC_E02S01_02
   * AC:      E02-S01 - Scenario 2 (Missing mandatory fields blocked)
   * Sprint:  1.0
   *
   * Pre-conditions:
   *   organiser_a@clienta.com is signed in; a new event request form is open
   *
   * Test data:
   *   Missing fields: Venue Requirements, Layout Preference
   *
   * Expected result:
   *   Submission is blocked; both "Venue Requirements" and "Layout Preference" are listed as required/missing
   */
  test("TC_E02S01_02 - Verify that submitting with any mandatory field empty should be blocked with every missing field identified", async ({ page }) => {
    await page.goto(ORGANISER_REQUEST_FORM_PATH);
    await fillMandatoryFields(page, { 'Venue requirements': '', 'Layout preference': '' });
    await expect(page.getByRole('button', { name: 'Submit request' })).toBeDisabled();
    const missing = page.getByRole('list', { name: 'Missing mandatory fields' });
    await expect(missing.getByText('Venue requirements')).toBeVisible();
    await expect(missing.getByText('Layout preference')).toBeVisible();
  });

  /**
   * TC_E02S01_03
   * AC:      E02-S01 - Scenario 3 (Past date blocked)
   * Sprint:  1.0
   *
   * Pre-conditions:
   *   Signed in; today's date is 10/09/2026
   *
   * Test data:
   *   Preferred Date: 01/01/2026 (past)
   *
   * Expected result:
   *   Submission is blocked with the message "Preferred date must be in the future"
   */
  test("TC_E02S01_03 - Verify that entering a preferred date in the past should block submission with an explanation", async ({ page }) => {
    await page.goto(ORGANISER_REQUEST_FORM_PATH);
    await fillMandatoryFields(page, { 'Preferred start date and time': '2026-01-01T09:00' });
    await expect(page.getByRole('button', { name: 'Submit request' })).toBeDisabled();
    await expect(page.getByText('Preferred date must be in the future')).toBeVisible();
  });

  /**
   * TC_E02S01_04
   * AC:      E02-S01 - Scenario 4 (None required satisfies a field)
   * Sprint:  1.0
   *
   * Pre-conditions:
   *   Signed in; event "Community Meetup" needs no special equipment, no specific layout, and no registration setup
   *
   * Test data:
   *   Equipment Requirements: None Required | Layout Preference: None Required | Registration Setup: None Required
   *
   * Expected result:
   *   All three fields are treated as complete; submission proceeds and the status becomes "Submitted"
   */
  test("TC_E02S01_04 - Verify that selecting 'none required' for equipment, layout, or registration setup should count each as complete where the event does not need them", async ({ page }) => {
    await page.goto(ORGANISER_REQUEST_FORM_PATH);
    await fillMandatoryFields(page);
    await expect(page.getByRole('button', { name: 'Submit request' })).toBeEnabled();
    await page.getByRole('button', { name: 'Submit request' }).click();
    await expect(page.getByText('Submitted', { exact: true })).toBeVisible();
  });

  /**
   * TC_E02S01_05
   * AC:      E02-S01 (checklist: ten mandatory fields defined)
   * Sprint:  1.0
   *
   * Pre-conditions:
   *   Signed in; a new request form is open
   *
   * Test data:
   *   N/A (field audit)
   *
   * Expected result:
   *   All 10 named fields are present on the form and marked as mandatory
   */
  test("TC_E02S01_05 - Verify that the event request form should require all ten mandatory fields before it can be considered complete", async ({ page }) => {
    await page.goto(ORGANISER_REQUEST_FORM_PATH);
    for (const label of [
      'Event name',
      'Description',
      'Purpose',
      'Preferred start date and time',
      'Preferred end date and time',
      'Expected attendance',
      'Venue requirements',
      'Accessibility needs',
      'Equipment requirements',
      'Layout preference',
      'Registration setup',
    ]) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    }
    // Prove each field is actually enforced: complete the form, then clear one
    // mandatory field and confirm submission is blocked again.
    await fillMandatoryFields(page);
    await expect(page.getByRole('button', { name: 'Submit request' })).toBeEnabled();
    await page.getByLabel('Description', { exact: true }).fill('');
    await expect(page.getByRole('button', { name: 'Submit request' })).toBeDisabled();
  });

});

test.describe("E02-S02", () => {

  /**
   * TC_E02S02_01
   * AC:      E02-S02 - Scenario 1 (Draft saved and hidden from Coordinators)
   * Sprint:  1.0
   *
   * Pre-conditions:
   *   organiser_a@clienta.com is signed in; coordinator_1@connectsphere.com exists
   *
   * Test data:
   *   Event Name: Product Launch (draft, incomplete)
   *
   * Expected result:
   *   The draft is saved with status "Draft"; it does not appear anywhere in coordinator_1@connectsphere.com's view
   */
  test.fixme("TC_E02S02_01 - Verify that saving a partially completed request as a draft should hide it from Event Coordinators", async ({ page }) => {
    // Steps from the specification:
    // 1. Partially complete a request "Product Launch" (Event Name only)
    // 2. Click "Save as Draft"
    // 3. Log in as coordinator_1@connectsphere.com and check the request queue
    void page;
  });

  /**
   * TC_E02S02_02
   * AC:      E02-S02 - Scenario 2 (Draft reopened with values restored)
   * Sprint:  1.0
   *
   * Pre-conditions:
   *   Draft "Product Launch" exists with Description = "Launch of new product line" already saved
   *
   * Test data:
   *   Draft: Product Launch | previously saved Description: "Launch of new product line"
   *
   * Expected result:
   *   The Event Name field shows "Product Launch" and the Description field shows "Launch of new product line", exactly as last saved
   */
  test.fixme("TC_E02S02_02 - Verify that reopening a saved draft should restore all previously entered values", async ({ page }) => {
    // Steps from the specification:
    // 1. Navigate to "My Drafts"
    // 2. Click on the draft "Product Launch"
    // 3. Review the Event Name and Description fields
    void page;
  });

  /**
   * TC_E02S02_03
   * AC:      E02-S02 - Scenario 3 (Draft deleted)
   * Sprint:  1.0
   *
   * Pre-conditions:
   *   Draft "Team Offsite" exists in organiser_a@clienta.com's drafts
   *
   * Test data:
   *   Draft: Team Offsite
   *
   * Expected result:
   *   "Team Offsite" no longer appears in "My Drafts" and is not counted in any active-request total
   */
  test.fixme("TC_E02S02_03 - Verify that deleting a draft should remove it from the list and stop it counting as an active request", async ({ page }) => {
    // Steps from the specification:
    // 1. Navigate to "My Drafts"
    // 2. Select "Team Offsite"
    // 3. Click "Delete" and confirm
    void page;
  });

  /**
   * TC_E02S02_04
   * AC:      E02-S02 - Scenario 4 (Completed draft submitted)
   * Sprint:  1.0
   *
   * Pre-conditions:
   *   Draft "Product Launch" now has all mandatory fields completed
   *
   * Test data:
   *   Draft: Product Launch (now complete)
   *
   * Expected result:
   *   The request follows the E02-S01 submission flow and its status becomes "Submitted"
   */
  test.fixme("TC_E02S02_04 - Verify that submitting a draft with every mandatory field complete should follow the normal submission flow", async ({ page }) => {
    // Steps from the specification:
    // 1. Open draft "Product Launch"
    // 2. Confirm all mandatory fields are filled
    // 3. Click "Submit"
    void page;
  });

  /**
   * TC_E02S02_05
   * AC:      E02-S02 (checklist: drafts distinguishable from submitted requests)
   * Sprint:  1.0
   *
   * Pre-conditions:
   *   organiser_a@clienta.com has 1 draft ("Team Offsite") and 1 submitted request ("Annual Tech Summit")
   *
   * Test data:
   *   Draft: Team Offsite | Submitted: Annual Tech Summit
   *
   * Expected result:
   *   Both items are shown but visually distinguishable (e.g. a "Draft" badge on Team Offsite vs a "Submitted" status on Annual Tech Summit)
   */
  test.fixme("TC_E02S02_05 - Verify that all of an Organiser's saved drafts should be listed and clearly distinguishable from submitted requests", async ({ page }) => {
    // Steps from the specification:
    // 1. Navigate to "My Requests"
    // 2. Review the combined list of drafts and submitted requests
    void page;
  });

});

test.describe("E02-S03", () => {

  /**
   * TC_E02S03_01
   * AC:      E02-S03 - Scenario 1 (Predefined requirements stored)
   * Sprint:  1.0
   *
   * Pre-conditions:
   *   organiser_a@clienta.com is creating request "Annual Tech Summit"
   *
   * Test data:
   *   Predefined requirements selected: Wheelchair Access, Hearing Loop
   *
   * Expected result:
   *   Both requirements are stored against the request and visible to the assigned Coordinator
   */
  test.fixme("TC_E02S03_01 - Verify that selecting predefined accessibility requirements should store them with the request and show them to the Coordinator", async ({ page }) => {
    // Steps from the specification:
    // 1. In the Accessibility Needs section, select "Wheelchair Access" and "Hearing Loop" from the predefined list
    // 2. Save/submit the request
    // 3. Log in as the assigned Coordinator and open the request
    void page;
  });

  /**
   * TC_E02S03_02
   * AC:      E02-S03 - Scenario 2 (Free-text captured but not matched)
   * Sprint:  1.0
   *
   * Pre-conditions:
   *   organiser_a@clienta.com is creating a request; "Service animal resting area" is not in the predefined list
   *
   * Test data:
   *   Free-text requirement: "Service animal resting area"
   *
   * Expected result:
   *   The free-text entry is visible to the Coordinator on the request, but venue search results are filtered only on predefined requirements (unaffected by this entry)
   */
  test.fixme("TC_E02S03_02 - Verify that a free-text accessibility requirement should be stored and shown to the Coordinator but excluded from automated venue matching", async ({ page }) => {
    // Steps from the specification:
    // 1. Enter "Service animal resting area" in the free-text accessibility box
    // 2. Save/submit the request
    // 3. Run a venue search for the event
    // 4. Log in as the Coordinator and open the request
    void page;
  });

  /**
   * TC_E02S03_03
   * AC:      E02-S03 - Scenario 3 (Search filters on predefined requirements)
   * Sprint:  1.0
   *
   * Pre-conditions:
   *   Event requires predefined requirement "Wheelchair Access"; Venue X lacks wheelchair access, Venue Y has it
   *
   * Test data:
   *   Predefined requirement: Wheelchair Access | Venue X: no wheelchair access | Venue Y: wheelchair accessible
   *
   * Expected result:
   *   Venue X is excluded from the results or clearly marked unsuitable; Venue Y appears as a normal match
   */
  test.fixme("TC_E02S03_03 - Verify that recorded predefined accessibility requirements should exclude or flag venues that cannot meet them", async ({ page }) => {
    // Steps from the specification:
    // 1. Record "Wheelchair Access" as a predefined requirement for the event
    // 2. Run a venue search for that event
    void page;
  });

});
