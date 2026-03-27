import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@careconnectsf.org';
const ADMIN_PASSWORD = 'abcd1234';

async function loginAsAdmin (page) {
  await page.goto('/');
  const resetButton = page.getByRole('button', { name: 'RESET' });
  if (await resetButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await resetButton.click();
    // Wait for facility selection to take effect
    await page.waitForURL(/\/login/);
  } else {
    await page.goto('/login');
  }
  await page.getByPlaceholder('youremail@example.com').waitFor({ state: 'visible' });
  await page.getByPlaceholder('youremail@example.com').fill(ADMIN_EMAIL);
  await page.getByPlaceholder('Enter password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL(/\/(holds|custody|care)/);
}

async function setFacilityStatus (page, statusLabel, reasonLabel) {
  await page.goto('/manage-capacity');
  await page.waitForLoadState('networkidle');
  await page.getByText('Change facility status').click();
  await page.locator('.mantine-Chip-label', { hasText: statusLabel }).waitFor({ state: 'visible' });
  await page.locator('.mantine-Chip-label', { hasText: statusLabel }).click({ force: true });
  if (reasonLabel) {
    await page.locator('.mantine-Chip-label', { hasText: reasonLabel }).waitFor({ state: 'visible' });
    await page.locator('.mantine-Chip-label', { hasText: reasonLabel }).click({ force: true });
  }
  await page.getByRole('button', { name: 'Confirm new status' }).click();
  await page.waitForURL(/\/(holds|custody|care)/);
}

test.describe('Facility Status Banner', () => {
  test.describe.configure({ mode: 'serial' });


  test('yellow banner on holds page when not accepting', async ({ page }) => {
    await loginAsAdmin(page);
    await setFacilityStatus(page, 'Not accepting new holds', 'Safety Lock-down');

    await page.goto('/holds');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('New holds are paused. Existing holds can still be transferred.')).toBeVisible();
  });

  test('yellow banner on custody page when not accepting', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/custody');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('New holds are paused. Existing holds can still be transferred.')).toBeVisible();
  });

  test('yellow banner on care page when not accepting', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/care');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('New holds are paused. Existing holds can still be transferred.')).toBeVisible();
  });

  test('banner dismissible per session', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/holds');
    await page.waitForLoadState('networkidle');

    const banner = page.getByText('New holds are paused. Existing holds can still be transferred.');
    await expect(banner).toBeVisible();

    // Dismiss — Mantine Alert close button
    await page.locator('.mantine-Alert-closeButton').click();
    await expect(banner).not.toBeVisible();

    // Navigate to another page — banner reappears (new component mount)
    await page.goto('/custody');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('New holds are paused. Existing holds can still be transferred.')).toBeVisible();
  });

  test('red banner when closed', async ({ page }) => {
    await loginAsAdmin(page);
    await setFacilityStatus(page, 'Closed', 'Safety Lock-down');

    await page.goto('/holds');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Active holds were cancelled. Do not bring persons to this facility.')).toBeVisible();
  });

  test('banner disappears when status returns to open', async ({ page }) => {
    await loginAsAdmin(page);
    // Ensure facility is not open first
    await setFacilityStatus(page, 'Not accepting new holds', 'Safety Lock-down');
    await setFacilityStatus(page, 'Open');

    await page.goto('/holds');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('New holds are paused')).not.toBeVisible();
    await expect(page.getByText('Active holds were cancelled')).not.toBeVisible();
  });
});
