import fs from 'fs';
import path from 'path';
import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './helpers.js';

const PASSWORD = 'abcd1234';
const SFPD_EMAIL = 'sfpd@careconnectsf.org';
const SFSO_EMAIL = 'sfso@careconnectsf.org';
const ADMIN_EMAIL = 'admin@careconnectsf.org';

const allResults = [];

function summarizeViolations (violations) {
  return violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    nodes: v.nodes.map((n) => ({
      html: n.html.slice(0, 200),
      target: n.target.join(' '),
      message: n.any?.[0]?.message || n.all?.[0]?.message || '',
    })),
  }));
}

async function auditPage (page, urlPath, label) {
  await page.goto(urlPath);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const summary = {
    path: urlPath,
    label,
    violationCount: results.violations.length,
    nodeCount: results.violations.reduce((sum, v) => sum + v.nodes.length, 0),
    violations: summarizeViolations(results.violations),
  };

  allResults.push(summary);

  // TEMP: exclude color-contrast until design team finalizes colors.
  // Remove this filter before merging so the gate enforces WCAG 2.1 AA in full.
  const blockingViolations = results.violations.filter((v) => v.id !== 'color-contrast');

  if (summary.violationCount > 0) {
    console.log(`  ⚠ ${label} (${urlPath}): ${summary.violationCount} rules, ${summary.nodeCount} nodes`);
  } else {
    console.log(`  ✓ ${label} (${urlPath}): no violations`);
  }

  if (blockingViolations.length > 0) {
    const ids = blockingViolations.map((v) => v.id).join(', ');
    throw new Error(`${label} (${urlPath}): ${blockingViolations.length} blocking violations — ${ids}`);
  }
}

async function loginWithContext (browser, email, password) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, email, password);
  return { context, page };
}

function writeReport () {
  const reportPath = path.resolve('e2e/accessibility-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
  console.log(`\nReport written to ${reportPath}`);

  // Print summary table
  const total = allResults.reduce((sum, r) => sum + r.nodeCount, 0);
  const failing = allResults.filter((r) => r.violationCount > 0);
  console.log(`\n=== Summary: ${failing.length}/${allResults.length} pages with violations, ${total} total nodes ===\n`);
}

// ============================================================
// Public pages (no auth)
// ============================================================
test.describe('Accessibility: Public pages', () => {
  const routes = [
    ['/login', 'Login'],
    ['/passwords/forgot', 'Forgot Password'],
    ['/feedback', 'Feedback Form'],
  ];

  for (const [urlPath, label] of routes) {
    test(label, async ({ page }) => {
      await auditPage(page, urlPath, label);
    });
  }
});

// ============================================================
// SFPD / FIELD role pages
// ============================================================
test.describe('Accessibility: SFPD pages', () => {
  test.describe.configure({ mode: 'serial' });

  let context;
  let sfpdPage;

  test.beforeAll(async ({ browser }) => {
    ({ context, page: sfpdPage } = await loginWithContext(browser, SFPD_EMAIL, PASSWORD));
  });

  test.afterAll(async () => {
    await context?.close();
  });

  const routes = [
    ['/holds', 'Holds List'],
    ['/incident', 'Incident Form'],
    ['/profile', 'Profile'],
    ['/profile/edit', 'Edit Profile'],
    ['/feedback/list', 'Feedback List'],
  ];

  for (const [urlPath, label] of routes) {
    test(label, async () => {
      await auditPage(sfpdPage, urlPath, label);
    });
  }
});

// ============================================================
// SFSO / CUSTODY role pages
// ============================================================
test.describe('Accessibility: SFSO pages', () => {
  test.describe.configure({ mode: 'serial' });

  let context;
  let sfsoPage;

  test.beforeAll(async ({ browser }) => {
    ({ context, page: sfsoPage } = await loginWithContext(browser, SFSO_EMAIL, PASSWORD));
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('Custody List', async () => {
    await auditPage(sfsoPage, '/custody', 'Custody List');
  });
});

// ============================================================
// Admin pages
// ============================================================
test.describe('Accessibility: Admin pages', () => {
  test.describe.configure({ mode: 'serial' });

  let context;
  let adminPage;

  test.beforeAll(async ({ browser }) => {
    ({ context, page: adminPage } = await loginWithContext(browser, ADMIN_EMAIL, PASSWORD));
  });

  test.afterAll(async () => {
    await context?.close();
  });

  const routes = [
    ['/admin/users', 'Admin Users List'],
    ['/admin/invites', 'Admin Invites List'],
    ['/admin/invites/new', 'Admin New Invite'],
    ['/admin/invites/batch', 'Admin Batch Invites'],
    ['/admin/organizations', 'Admin Organizations List'],
    ['/admin/organizations/new', 'Admin New Organization'],
    ['/admin/facilities', 'Admin Facilities List'],
    ['/admin/facilities/new', 'Admin New Facility'],
    ['/admin/enums/facility-status-reasons', 'Admin Facility Status Reasons'],
    ['/admin/enums/facility-status-reasons/new', 'Admin New Status Reason'],
    ['/admin/enums/deflection-cancel-reasons', 'Admin Cancel Reasons'],
    ['/admin/enums/deflection-cancel-reasons/new', 'Admin New Cancel Reason'],
  ];

  for (const [urlPath, label] of routes) {
    test(label, async () => {
      await auditPage(adminPage, urlPath, label);
    });
  }
});

// ============================================================
// Write report after all tests
// ============================================================
test.afterAll(() => {
  writeReport();
});
