import { test, expect } from '@playwright/test';
import { login } from './helpers.js';

const ADMIN_EMAIL = 'admin@careconnectsf.org';
const ADMIN_PASSWORD = 'abcd1234';

async function loginAsAdmin (page) {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}

const STATUS_REASONS = {
  'Not accepting new holds': { status: 'OPEN_NOT_ACCEPTING', statusReasonId: 'safety_lockdown' },
  Closed: { status: 'CLOSED', statusReasonId: 'safety_lockdown' },
  Open: { status: 'OPEN_ACCEPTING' },
};

async function setFacilityStatus (page, statusLabel) {
  const payload = STATUS_REASONS[statusLabel];
  await page.request.post('http://localhost:3000/api/facilities/fdcb552e-27a6-4914-b3ef-cd84499ae006/status', {
    data: payload,
  });
}

test.describe('Facility Status Banner', () => {
  test.describe.configure({ mode: 'serial' });


  test('yellow banner on holds page when not accepting', async ({ page }) => {
    await loginAsAdmin(page);
    await setFacilityStatus(page, 'Not accepting new holds');

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
    await setFacilityStatus(page, 'Closed');

    await page.goto('/holds');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Active holds were cancelled. Do not bring persons to this facility.')).toBeVisible();
  });

  test('banner disappears when status returns to open', async ({ page }) => {
    await loginAsAdmin(page);
    // Ensure facility is not open first
    await setFacilityStatus(page, 'Not accepting new holds');
    await setFacilityStatus(page, 'Open');

    await page.goto('/holds');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('New holds are paused')).not.toBeVisible();
    await expect(page.getByText('Active holds were cancelled')).not.toBeVisible();
  });
});
