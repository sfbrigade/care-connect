export async function apiLogin (page, email, password) {
  await page.goto('/');
  // Set facility
  const resetButton = page.getByRole('button', { name: 'RESET' });
  if (await resetButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await resetButton.click();
  }
  // Login via API to get session cookie
  await page.request.post('http://localhost:3000/api/auth/login', {
    data: { email, password },
  });
}

export async function login (page, email, password) {
  await page.goto('/');

  // Select RESET facility if selector is shown, retry if it reappears
  for (let i = 0; i < 3; i++) {
    const resetButton = page.getByRole('button', { name: 'RESET' });
    if (await resetButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await resetButton.click();
    }
    await page.goto('/login');
    const emailField = page.getByPlaceholder('youremail@example.com');
    if (await emailField.isVisible({ timeout: 5000 }).catch(() => false)) break;
  }

  await page.getByPlaceholder('youremail@example.com').fill(email);
  await page.getByPlaceholder('Enter password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  // Handle unit selector if it appears (SFPD/SFSO users)
  const unitInput = page.getByPlaceholder('Start typing a unit name');
  if (await unitInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.waitForLoadState('networkidle');
    await unitInput.click();
    await unitInput.press('ArrowDown');
    const option = page.getByRole('option').first();
    if (await option.isVisible({ timeout: 5000 }).catch(() => false)) {
      await option.click();
      await page.getByRole('button', { name: 'Confirm unit' }).click();
      await page.waitForURL(/\/(holds|custody|care)/, { timeout: 15000 });
    }
    return;
  }

  await page.waitForURL(/\/(holds|custody|care)/, { timeout: 15000 });
}
