import { test, expect } from '@playwright/test';
import { login } from './helpers.js';

const ADMIN_EMAIL = 'admin@careconnectsf.org';
const ADMIN_PASSWORD = 'abcd1234';

async function loginAsAdmin (page) {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}

const STATUS_REASONS = {
  'Not accepting new holds': { status: 'OPEN_NOT_ACCEPTING', statusReason: 'SAFETY_LOCKDOWN' },
  Closed: { status: 'CLOSED', statusReason: 'SAFETY_LOCKDOWN' },
  Open: { status: 'OPEN_ACCEPTING' },
};

async function getFacilityId (page) {
  const response = await page.request.get('http://localhost:3000/api/facilities');
  const facilities = await response.json();
  const reset = facilities.find(f => f.subdomain === 'reset');
  return reset.id;
}

async function setFacilityStatus (page, statusLabel) {
  const payload = STATUS_REASONS[statusLabel];
  const facilityId = await getFacilityId(page);
  const response = await page.request.post(`http://localhost:3000/api/facilities/${facilityId}/status`, {
    data: payload,
  });
  if (!response.ok()) {
    throw new Error(`Failed to set facility status to ${statusLabel}: ${response.status()} ${await response.text()}`);
  }
}

test.describe('Facility Status Banner', () => {
  test.describe.configure({ mode: 'serial' });


  test('yellow banner on holds page when not accepting', async ({ page }) => {
    await loginAsAdmin(page);
    await setFacilityStatus(page, 'Not accepting new holds');

    await page.goto('/holds');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('New holds are paused. Continue processing current persons.')).toBeVisible();
  });

  test('yellow banner on custody page when not accepting', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/custody');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('New holds are paused. Continue processing current persons.')).toBeVisible();
  });

  test('yellow banner on care page when not accepting', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/care');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('New holds are paused. Continue processing current persons.')).toBeVisible();
  });

  test('banner dismissible per session', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/holds');
    await page.waitForLoadState('networkidle');

    const banner = page.getByText('New holds are paused. Continue processing current persons.');
    await expect(banner).toBeVisible();

    // Dismiss — Mantine Alert close button
    await page.locator('.mantine-Alert-closeButton').click();
    await expect(banner).not.toBeVisible();

    // Navigate to another page — banner reappears (new component mount)
    await page.goto('/custody');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('New holds are paused. Continue processing current persons.')).toBeVisible();
  });

  test('red banner when closed', async ({ page }) => {
    await loginAsAdmin(page);
    await setFacilityStatus(page, 'Closed');

    await page.goto('/holds');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('RESET is temporarily closed.')).toBeVisible();
  });

  test('banner disappears when status returns to open', async ({ page }) => {
    await loginAsAdmin(page);
    // Ensure facility is not open first
    await setFacilityStatus(page, 'Not accepting new holds');
    await setFacilityStatus(page, 'Open');

    // Clear stale facility from localStorage so it re-fetches fresh status
    await page.evaluate(() => window.localStorage.removeItem('selectedFacility'));
    await page.goto('/');
    const resetButton = page.getByRole('button', { name: 'RESET' });
    try {
      await resetButton.waitFor({ state: 'visible', timeout: 3000 });
      await resetButton.click();
    } catch {
      // Facility already selected
    }
    await page.goto('/holds');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('New holds are paused')).not.toBeVisible();
    await expect(page.getByText('RESET is temporarily closed.')).not.toBeVisible();
    await expect(page.getByText('This facility is temporarily closed')).not.toBeVisible();
  });
});
