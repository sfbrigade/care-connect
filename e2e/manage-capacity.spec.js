import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@careconnectsf.org';
const ADMIN_PASSWORD = 'abcd1234';
const SFPD_EMAIL = 'sfpd@careconnectsf.org';
const SFPD_PASSWORD = 'abcd1234';

async function login (page, email, password) {
  await page.goto('/');
  // Select facility if facility selector is shown
  const resetButton = page.getByRole('button', { name: 'RESET' });
  if (await resetButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await resetButton.click();
  }
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder('youremail@example.com').fill(email);
  await page.getByPlaceholder('Enter password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click({ force: true });

  // Handle unit selector if it appears (SFPD users)
  const unitInput = page.getByPlaceholder('Start typing a unit name');
  if (await unitInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await unitInput.click();
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: 'Confirm unit' }).click({ force: true });
  }

  await page.waitForURL(/\/(holds|custody|care)/);
}

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
  await page.getByRole('button', { name: 'Confirm new status' }).click({ force: true });
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

  test('auth guard — non-admin is redirected', async ({ browser }) => {
    // Use a fresh context to avoid session carryover from admin login
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsSfpd(page);
    await page.goto('/manage-capacity');
    await page.waitForLoadState('networkidle');

    // Should be redirected away — not on manage-capacity
    await expect(page).not.toHaveURL(/manage-capacity/);
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
    await page.getByRole('button', { name: 'Update availability' }).click({ force: true });

    // Should show toast and redirect home
    await expect(page.getByText('Capacity updated')).toBeVisible();
    await expect(page).toHaveURL(/\/(holds|custody|care)/);
  });

  test('adjust chair availability — make chairs available again', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/manage-capacity');
    await page.waitForLoadState('networkidle');

    await page.getByText('Adjust chair availability').click();
    await page.getByLabel('Unavailable chairs').fill('0');

    await expect(page.getByText(/will make.*chair.*available/)).toBeVisible();

    await page.getByRole('button', { name: 'Update availability' }).click({ force: true });
    await expect(page.getByText('Capacity updated')).toBeVisible();
    await expect(page).toHaveURL(/\/(holds|custody|care)/);
  });

  test('change facility status to not accepting', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/manage-capacity');
    await page.waitForLoadState('networkidle');

    await page.getByText('Change facility status').click();
    await page.locator('.mantine-Chip-label', { hasText: 'Not accepting new holds' }).waitFor({ state: 'visible' });
    await page.locator('.mantine-Chip-label', { hasText: 'Not accepting new holds' }).click({ force: true });

    // Reason should appear
    await expect(page.getByText('Reason')).toBeVisible();
    await page.locator('.mantine-Chip-label', { hasText: 'Safety Lock-down' }).click({ force: true });

    // Wait for button to be enabled
    await expect(page.getByRole('button', { name: 'Confirm new status' })).toBeEnabled();
    await page.getByRole('button', { name: 'Confirm new status' }).click();
    await expect(page.getByText('Status updated')).toBeVisible();
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
    await page.locator('.mantine-Chip-label', { hasText: 'Open' }).click({ force: true });
    await page.getByRole('button', { name: 'Confirm new status' }).click({ force: true });

    await expect(page.getByText('Status updated')).toBeVisible();
    await expect(page).toHaveURL(/\/(holds|custody|care)/);

    // Banner should be gone
    await expect(page.getByText('New holds are paused')).not.toBeVisible();
  });

  test('change facility status to closed', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/manage-capacity');
    await page.waitForLoadState('networkidle');

    await page.getByText('Change facility status').click();
    await page.locator('.mantine-Chip-label', { hasText: 'Closed' }).click({ force: true });
    await page.locator('.mantine-Chip-label', { hasText: 'Safety Lock-down' }).click({ force: true });
    await expect(page.getByRole('button', { name: 'Confirm new status' })).toBeEnabled();
    await page.getByRole('button', { name: 'Confirm new status' }).click({ force: true });

    await expect(page.getByText('Status updated')).toBeVisible();
    await expect(page).toHaveURL(/\/(holds|custody|care)/);

    // Red banner should appear
    await expect(page.getByText('Active holds were cancelled')).toBeVisible();

    // Clean up — set back to open
    await page.goto('/manage-capacity');
    await page.waitForLoadState('networkidle');
    await page.getByText('Change facility status').click();
    await page.locator('.mantine-Chip-label', { hasText: 'Open' }).click({ force: true });
    await page.getByRole('button', { name: 'Confirm new status' }).click({ force: true });
    await expect(page).toHaveURL(/\/(holds|custody|care)/);
  });
});

test.describe('Manage Holds', () => {
  test('view holds list and cancel if available', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/manage-capacity');
    await page.waitForLoadState('networkidle');

    await page.getByText('Manage chair holds').click();
    await expect(page.getByText('Holds in transit')).toBeVisible();

    // If there are active holds, cancel one
    const cancelButton = page.getByRole('button', { name: 'Cancel hold' }).first();
    if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelButton.click();

      // Confirmation modal
      await expect(page.getByText(/Cancel hold for/)).toBeVisible();
      await expect(page.getByText('This will notify the officer')).toBeVisible();

      // Confirm cancellation — click the modal's cancel button
      await page.locator('.mantine-Modal-content').getByRole('button', { name: 'Cancel hold' }).click();

      // Toast
      await expect(page.getByText('Hold canceled')).toBeVisible();

      // Card should show cancelled state
      await expect(page.getByText(/Cancelled by/)).toBeVisible();
    }
  });
});
