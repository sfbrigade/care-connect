export async function apiLogin (page, email, password) {
  await page.goto('/');
  // Wait for facility selector or app to load
  const resetButton = page.getByRole('button', { name: 'RESET' });
  try {
    await resetButton.waitFor({ state: 'visible', timeout: 10000 });
    await resetButton.click();
    await page.waitForLoadState('networkidle');
  } catch {
    // No facility selector — already selected
  }
  // Login via API to get session cookie
  await page.request.post('http://localhost:3000/api/auth/login', {
    data: { email, password },
  });
}

export async function login (page, email, password) {
  await page.goto('/');

  // Wait for either RESET button or login form to appear
  const resetButton = page.getByRole('button', { name: 'RESET' });
  const emailField = page.getByPlaceholder('youremail@example.com');

  await Promise.race([
    resetButton.waitFor({ state: 'visible', timeout: 15000 }),
    emailField.waitFor({ state: 'visible', timeout: 15000 }),
  ]).catch(() => {});

  // Click RESET if it's the facility selector
  if (await resetButton.isVisible().catch(() => false)) {
    await resetButton.click();
    await page.waitForLoadState('networkidle');
  }

  // Navigate to login page — wait for email field
  await page.goto('/login');
  const loginEmailField = page.getByPlaceholder('youremail@example.com');

  // If facility selector reappears after navigation, handle it
  await Promise.race([
    loginEmailField.waitFor({ state: 'visible', timeout: 10000 }),
    resetButton.waitFor({ state: 'visible', timeout: 10000 }),
  ]).catch(() => {});

  if (await resetButton.isVisible().catch(() => false)) {
    await resetButton.click();
    await page.waitForLoadState('networkidle');
    await page.goto('/login');
    await loginEmailField.waitFor({ state: 'visible', timeout: 10000 });
  }

  await loginEmailField.fill(email);
  await page.getByPlaceholder('Enter password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  // After login, wait for final destination — handle facility selector or unit selector if they appear
  for (let i = 0; i < 5; i++) {
    // Check if we've reached a final page
    await Promise.race([
      page.waitForURL(/\/(units|holds|custody|care)/, { timeout: 5000 }),
      resetButton.waitFor({ state: 'visible', timeout: 5000 }),
    ]).catch(() => {});

    if (/\/(units|holds|custody|care)/.test(page.url())) break;

    if (await resetButton.isVisible().catch(() => false)) {
      await resetButton.click();
      await page.waitForLoadState('networkidle');
      continue;
    }
  }

  await page.waitForURL(/\/(units|holds|custody|care)/, { timeout: 15000 });

  // Handle unit selector if it appears (first login for SFPD/SFSO users)
  if (page.url().includes('/units')) {
    const unitInput = page.getByPlaceholder('Type unit name');
    await unitInput.waitFor({ state: 'visible', timeout: 5000 });
    await unitInput.click();
    const option = page.getByRole('option').first();
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
    await page.getByRole('button', { name: 'Confirm unit' }).click();
    await page.waitForURL(/\/(holds|custody|care)/, { timeout: 15000 });
  }
}
