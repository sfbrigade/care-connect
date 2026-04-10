import { test, expect } from '@playwright/test';
import { login } from './helpers.js';

const PASSWORD = 'abcd1234';
const SFPD_EMAIL = 'sfpd@careconnectsf.org';
const SFSO_EMAIL = 'sfso@careconnectsf.org';
const CARE_EMAIL = 'care@careconnectsf.org';

// Test subject details
const SUBJECT = {
  firstName: 'Test',
  lastName: 'Person',
};

let deflectionId;

test.describe('Happy Path: Full Lifecycle', () => {
  test.describe.configure({ mode: 'serial', timeout: 240000 });

  test.use({
    permissions: ['geolocation'],
    geolocation: { latitude: 37.7749, longitude: -122.4194 },
  });

  // ── Phase 1: SFPD Officer creates incident and holds a chair ──
  // Note: global-setup.js resets the database before tests run

  test('SFPD officer holds a chair and creates incident', async ({ page }) => {
    await login(page, SFPD_EMAIL, PASSWORD);
    await expect(page).toHaveURL(/\/holds/);

    // Click "Hold a chair" — should navigate to incident form since no active incident
    const holdBtn = page.getByTestId('hold-a-chair-btn');
    await expect(holdBtn).toBeEnabled({ timeout: 5000 });
    await holdBtn.click();
    await expect(page).toHaveURL(/\/incident/, { timeout: 5000 });

    // Wait for form to initialize — address fields may already be expanded (geolocation auto-filled)
    const addressLine1 = page.getByTestId('incident-address-line1');
    const arrestLocation = page.getByTestId('incident-arrest-location');

    console.log('[incident] waiting for address fields or arrest location...');
    const addressVisible = await addressLine1.isVisible().catch(() => false);
    const locationVisible = await arrestLocation.isVisible().catch(() => false);
    console.log(`[incident] addressLine1 visible: ${addressVisible}, arrestLocation visible: ${locationVisible}`);

    await Promise.race([
      addressLine1.waitFor({ state: 'visible', timeout: 10000 }),
      arrestLocation.waitFor({ state: 'visible', timeout: 10000 }),
    ]).catch(() => {});
    console.log('everything should be visible')

    const addressVisibleAfter = await addressLine1.isVisible().catch(() => false);
    const locationVisibleAfter = await arrestLocation.isVisible().catch(() => false);
    console.log(`[incident] AFTER WAIT — addressLine1 visible: ${addressVisibleAfter}, arrestLocation visible: ${locationVisibleAfter}`);

    // If collapsed, click to expand
    if (locationVisibleAfter) {
      // Wait for the form to be enabled (geolocation initialization complete)
      console.log('[incident] waiting for arrest location to be enabled...');
      await expect(arrestLocation).toBeEnabled({ timeout: 15000 });
      console.log('[incident] enabled, focusing to expand...');
      await arrestLocation.focus();
      console.log('[incident] focused, waiting for address fields...');
      await addressLine1.waitFor({ state: 'visible', timeout: 5000 });
      console.log('[incident] address fields expanded');
    }

    console.log('[incident] filling address...');
    await addressLine1.fill('100 Main St');
    await page.getByTestId('incident-city').fill('San Francisco');
    await page.getByTestId('incident-state').fill('CA');
    console.log('[incident] address filled');

    await page.getByTestId('incident-cad').fill('TESTCAD001');
    await page.getByTestId('incident-case').fill('TESTCASE001');
    await page.getByTestId('incident-star').fill('9999');

    // Select "Encountered via"
    await page.getByText('On view').click();

    await expect(page.getByTestId('incident-submit-btn')).toBeEnabled({ timeout: 3000 });
    await page.getByTestId('incident-submit-btn').click();

    // Should return to holds page with a new hold
    await expect(page).toHaveURL(/\/holds/, { timeout: 10000 });
    await expect(page.getByTestId('add-details-btn').first()).toBeVisible({ timeout: 10000 });
  });

  test('SFPD officer fills in person details', async ({ page }) => {
    await login(page, SFPD_EMAIL, PASSWORD);
    await expect(page).toHaveURL(/\/holds/);

    // Click "Add Details" on the hold card
    await page.getByTestId('add-details-btn').first().click();

    // Should navigate to subject form
    await page.waitForURL(/\/holds\/\d+\/subject/, { timeout: 10000 });

    // Capture the deflection ID from the URL
    const url = page.url();
    const match = url.match(/\/holds\/(\d+)\//);
    if (match) {
      deflectionId = parseInt(match[1], 10);
    }

    // Fill subject details
    await page.getByTestId('subject-first-name').fill(SUBJECT.firstName);
    await page.getByTestId('subject-last-name').fill(SUBJECT.lastName);

    // Save
    await page.getByTestId('subject-save-btn').click();
    await page.waitForLoadState('networkidle');
  });

  test('SFPD officer arrives at facility', async ({ page }) => {
    await login(page, SFPD_EMAIL, PASSWORD);
    await expect(page).toHaveURL(/\/holds/);

    // Click "I've arrived"
    await page.getByTestId('arrived-btn').click();

    // Handle confirmation modal if it appears
    const confirmButton = page.getByTestId('arrival-confirm-btn');
    try {
      await confirmButton.waitFor({ state: 'visible', timeout: 3000 });
      await confirmButton.click();
    } catch {
      // No confirmation modal — arrival went through directly
    }

    // Wait for status to update
    await expect(page.getByTestId('left-btn')).toBeVisible({ timeout: 10000 });
  });

  // ── Phase 2: SFSO Custody staff transfers and performs safety check ──

  test('SFSO transfers person into custody via manual code entry', async ({ page }) => {
    await login(page, SFSO_EMAIL, PASSWORD);
    await expect(page).toHaveURL(/\/custody/);

    // Get the deflection ID if we don't have it yet
    if (!deflectionId) {
      const response = await page.request.get('http://localhost:3000/api/deflections?active=true');
      const deflections = await response.json();
      const active = deflections.find(d => d.subjectStatus === 'ONSITE_AWAITING_TRANSFER');
      deflectionId = active?.id;
    }
    expect(deflectionId).toBeTruthy();

    // Click "Scan transfer code" button
    await page.getByTestId('scan-code-btn').click();

    // Switch to manual entry
    await page.getByText('Type code').click();

    // Enter the deflection ID and submit
    await page.getByTestId('manual-code-input').fill(String(deflectionId));
    await page.getByTestId('manual-code-submit').click();

    // Wait for modal to close and page to update
    await page.waitForLoadState('networkidle');
  });

  test('SFSO completes safety check', async ({ page }) => {
    await login(page, SFSO_EMAIL, PASSWORD);
    await expect(page).toHaveURL(/\/custody/);

    // Find our person's card by name, then click "View details" to go to detail page
    const personCard = page.locator('.mantine-Card-root', { hasText: SUBJECT.lastName }).first();
    await personCard.getByRole('button', { name: /View details/i }).click();
    await expect(page).toHaveURL(/\/custody\/\d+/, { timeout: 5000 });

    // Click "Complete safety check"
    await page.getByTestId('safety-check-btn').click();
    await page.waitForLoadState('networkidle');
  });

  // ── Phase 3: Care staff admits and completes intake ──

  test('Care staff admits person via manual code entry', async ({ page }) => {
    await login(page, CARE_EMAIL, PASSWORD);
    await expect(page).toHaveURL(/\/care/);

    // Click "Scan transfer code" button
    await page.getByTestId('scan-code-btn').click();

    // Switch to manual entry
    await page.getByText('Type code').click();

    // Enter the deflection ID and submit
    await page.getByTestId('manual-code-input').fill(String(deflectionId));
    await page.getByTestId('manual-code-submit').click();

    await page.waitForLoadState('networkidle');
  });

  test('Care staff completes medical intake', async ({ page }) => {
    await login(page, CARE_EMAIL, PASSWORD);
    await expect(page).toHaveURL(/\/care/);

    // Find the person's card and click "Complete intake" directly from the list
    const personCard = page.locator('.mantine-Card-root', { hasText: SUBJECT.lastName }).first();
    await personCard.getByRole('button', { name: /Complete intake/i }).click();

    // Confirm in modal
    await page.getByTestId('intake-confirm-btn').click();
    await page.waitForLoadState('networkidle');
  });

  // ── Phase 4: SFSO performs legal release ──

  test('SFSO initiates legal release', async ({ page }) => {
    await login(page, SFSO_EMAIL, PASSWORD);
    await expect(page).toHaveURL(/\/custody/);

    // Find the person's card and click "View details"
    const personCard = page.locator('.mantine-Card-root', { hasText: SUBJECT.lastName }).first();
    await personCard.getByRole('button', { name: /View details/i }).click();
    await expect(page).toHaveURL(/\/custody\/\d+/, { timeout: 5000 });

    // Click "Start legal release"
    await page.getByTestId('start-release-btn').click();
    await expect(page).toHaveURL(/\/legal-release/, { timeout: 5000 });

    // Select "Can care for themselves" release reason
    await page.getByTestId('release-reason-sobered').click();

    // Confirm release
    await page.getByTestId('release-confirm-btn').click();

    // Should return to custody page
    await expect(page).toHaveURL(/\/custody/, { timeout: 10000 });
  });

  // ── Phase 5: Verify generated documents ──

  test('849b PDF is generated with correct data', async ({ page }) => {
    await login(page, SFSO_EMAIL, PASSWORD);
    expect(deflectionId).toBeTruthy();

    const { PDFDocument } = await import('pdf-lib');

    const response = await page.request.get(
      `http://localhost:3000/api/forms/849b/pdf/${deflectionId}`
    );
    expect(response.ok()).toBeTruthy();

    const pdfBytes = await response.body();
    const doc = await PDFDocument.load(pdfBytes);
    const form = doc.getForm();

    expect(form.getTextField('INCIDENT NUMBER').getText()).toBe('TESTCASE001');
    expect(form.getTextField('CAD NUMBER').getText()).toBe('TESTCAD001');
    expect(form.getTextField('NAME LAST FIRST MIDDLE').getText()).toContain(SUBJECT.lastName);
  });

  test('Certificate of Release PDF is generated', async ({ page }) => {
    await login(page, SFSO_EMAIL, PASSWORD);
    expect(deflectionId).toBeTruthy();

    const response = await page.request.get(
      `http://localhost:3000/api/forms/cert/pdf/${deflectionId}`
    );
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toBe('application/pdf');
  });
});
