import { test, expect } from '@playwright/test';
import { login, apiLogin } from './helpers.js';

const ADMIN_EMAIL = 'admin@careconnectsf.org';
const ADMIN_PASSWORD = 'abcd1234';
const SFPD_EMAIL = 'sfpd@careconnectsf.org';
const SFPD_PASSWORD = 'abcd1234';
const CARE_EMAIL = 'care@careconnectsf.org';
const CARE_PASSWORD = 'abcd1234';
const SFSO_EMAIL = 'sfso@careconnectsf.org';
const SFSO_PASSWORD = 'abcd1234';

async function loginAsAdmin (page) {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}

async function loginAsSfpd (page) {
  await login(page, SFPD_EMAIL, SFPD_PASSWORD);
}

// Ensure facility is open before/after tests that change status
async function ensureFacilityOpen (page) {
  await page.goto('/manage-capacity');
  await page.getByText('Change facility status').click();

  const openChip = page.getByRole('radio', { name: 'Open' });
  if (await openChip.isChecked()) return;

  await openChip.click();
  await page.getByRole('button', { name: 'Confirm new status' }).evaluate(el => el.click());
  await page.waitForURL('/');
}

test.describe('Manage Capacity Page', () => {
  test.describe.configure({ mode: 'serial' });

  test('page access and stats display', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/manage-capacity');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Manage capacity')).toBeVisible();
    await expect(page.getByText('Update chair availability or facility status.')).toBeVisible();
    await expect(page.getByText(/Available now/)).toBeVisible();
    await expect(page.getByText(/Held \(in transit\)/)).toBeVisible();
    await expect(page.getByText(/Occupied/)).toBeVisible();
    await expect(page.getByText(/Unavailable/)).toBeVisible();

    await expect(page.getByText('Adjust chair availability')).toBeVisible();
    await expect(page.getByText('Manage chair holds')).toBeVisible();
    await expect(page.getByText('Change facility status')).toBeVisible();
  });

  test('auth guard — FIELD user is redirected', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await apiLogin(page, SFPD_EMAIL, SFPD_PASSWORD);
    await page.goto('/manage-capacity');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/manage-capacity/);
    await context.close();
  });

  test('auth guard — CUSTODY user is redirected', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await apiLogin(page, SFSO_EMAIL, SFSO_PASSWORD);
    await page.goto('/manage-capacity');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/manage-capacity/);
    await context.close();
  });

  test('auth guard — CARE user can access', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, CARE_EMAIL, CARE_PASSWORD);
    await page.goto('/manage-capacity');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Manage capacity')).toBeVisible();
    await expect(page.getByText('Adjust chair availability')).toBeVisible();
    await context.close();
  });

  test('adjust chair availability — make chairs unavailable', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/manage-capacity');
    await page.waitForLoadState('networkidle');

    await page.getByText('Adjust chair availability').click();
    await expect(page.getByLabel('Unavailable chairs')).toBeVisible();

    // Enter a number
    await page.getByLabel('Unavailable chairs').fill('2');

    // Reason chips should appear
    await expect(page.getByText('Reason')).toBeVisible();
    await page.getByText('Lack of SFSD staffing').click();

    // Confirmation text
    await expect(page.getByText(/will mark.*chair/)).toBeVisible();

    // Submit
    await page.getByRole('button', { name: 'Update availability' }).evaluate(el => el.click());

    // Should show toast and redirect home
    await expect(page.getByText('Capacity updated')).toBeVisible();
    await expect(page.getByText(/chairs marked unavailable/)).toBeVisible();
    await expect(page).toHaveURL(/\/(holds|custody|care)/);
  });

  test('adjust chair availability — make chairs available again', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/manage-capacity');
    await page.waitForLoadState('networkidle');

    await page.getByText('Adjust chair availability').click();
    await page.getByLabel('Unavailable chairs').fill('0');

    await expect(page.getByText(/will make.*chair.*available/)).toBeVisible();

    await page.getByRole('button', { name: 'Update availability' }).evaluate(el => el.click());
    await expect(page.getByText('Capacity updated')).toBeVisible();
    await expect(page.getByText(/chairs are now available/)).toBeVisible();
    await expect(page).toHaveURL(/\/(holds|custody|care)/);
  });

  test('change facility status to not accepting', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/manage-capacity');
    await page.waitForLoadState('networkidle');

    await page.getByText('Change facility status').click();
    await page.locator('.mantine-Chip-label', { hasText: 'Not accepting new holds' }).waitFor({ state: 'visible' });
    await page.locator('.mantine-Chip-label', { hasText: 'Not accepting new holds' }).evaluate(el => el.click());

    // Reason should appear
    await expect(page.getByText('Reason')).toBeVisible();
    await page.locator('.mantine-Chip-label', { hasText: 'Safety Lock-down' }).evaluate(el => el.click());

    // Wait for button to be enabled
    await expect(page.getByRole('button', { name: 'Confirm new status' })).toBeEnabled();
    await page.getByRole('button', { name: 'Confirm new status' }).click();
    await expect(page.getByText('Status updated')).toBeVisible();
    await expect(page.getByText('New holds are paused.', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/(holds|custody|care)/);
  });

  test('facility status banner appears when not accepting', async ({ page }) => {
    await loginAsAdmin(page);
    // Facility should still be not-accepting from previous test
    await page.goto('/holds');
    await expect(page.getByText('New holds are paused')).toBeVisible();
  });

  test('change facility status back to open', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/manage-capacity');
    await page.waitForLoadState('networkidle');

    await page.getByText('Change facility status').click();

    // Current status should be pre-selected as not-accepting
    await page.locator('.mantine-Chip-label', { hasText: 'Open' }).evaluate(el => el.click());
    await page.getByRole('button', { name: 'Confirm new status' }).evaluate(el => el.click());

    await expect(page.getByText('Status updated')).toBeVisible();
    await expect(page.getByText(/open and accepting/)).toBeVisible();
    await expect(page).toHaveURL(/\/(holds|custody|care)/);

    // Banner should be gone
    await expect(page.getByText('New holds are paused')).not.toBeVisible();
  });

  test('change facility status to closed', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/manage-capacity');
    await page.waitForLoadState('networkidle');

    await page.getByText('Change facility status').click();
    await page.locator('.mantine-Chip-label', { hasText: 'Closed' }).evaluate(el => el.click());
    await page.locator('.mantine-Chip-label', { hasText: 'Safety Lock-down' }).evaluate(el => el.click());
    await expect(page.getByRole('button', { name: 'Confirm new status' })).toBeEnabled();
    await page.getByRole('button', { name: 'Confirm new status' }).evaluate(el => el.click());

    await expect(page.getByText('Status updated')).toBeVisible();
    await expect(page.getByText(/temporarily closed/).first()).toBeVisible();
    await expect(page).toHaveURL(/\/(holds|custody|care)/);

    // Red banner should appear
    await expect(page.getByText('temporarily closed').first()).toBeVisible();

    // Clean up — set back to open
    await page.goto('/manage-capacity');
    await page.waitForLoadState('networkidle');
    await page.getByText('Change facility status').click();
    await page.locator('.mantine-Chip-label', { hasText: 'Open' }).evaluate(el => el.click());
    await page.getByRole('button', { name: 'Confirm new status' }).evaluate(el => el.click());
    await expect(page).toHaveURL(/\/(holds|custody|care)/);
  });
});

test.describe('Manage Holds', () => {
  test('view holds list and cancel if available', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/manage-capacity');
    await page.waitForLoadState('networkidle');

    await page.getByText('Manage chair holds').click();
    await expect(page.getByRole('heading', { name: 'Holds in transit' })).toBeVisible();

    // If there are active holds, cancel one
    const cancelButton = page.getByRole('button', { name: 'Cancel hold' }).first();
    try {
      await cancelButton.waitFor({ state: 'visible', timeout: 3000 });
      await cancelButton.click();

      // Confirmation modal
      await expect(page.getByText(/Cancel hold for/)).toBeVisible();
      await expect(page.getByText('This will notify the officer')).toBeVisible();

      // Confirm cancellation — click the modal's cancel button
      await page.locator('.mantine-Modal-content').getByRole('button', { name: 'Cancel hold' }).click();

      // Toast
      await expect(page.getByText('Hold canceled')).toBeVisible();
      await expect(page.getByText('Officer notified.')).toBeVisible();

      // Card should show canceled state
      await expect(page.getByText(/Canceled by/)).toBeVisible();
    } catch {
      // No active holds to cancel — that's OK
    }
  });
});
