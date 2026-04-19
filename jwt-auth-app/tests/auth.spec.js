// tests/auth.spec.js
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';

// Generate unique email per test run to avoid duplicate conflicts
const uniqueEmail = () => `testuser_${Date.now()}_${Math.floor(Math.random()*9999)}@example.com`;
const VALID_PASSWORD = 'SecurePass123';
const SHORT_PASSWORD  = 'abc';

// ── Registration Tests ──────────────────────────────────────────────────────

test.describe('Registration — Positive', () => {
  test('register with valid data shows success message', async ({ page }) => {
    await page.goto(`${BASE_URL}/register-page`);

    const email    = uniqueEmail();
    const username = `user_${Date.now()}`;

    await page.fill('#email',    email);
    await page.fill('#username', username);
    await page.fill('#password', VALID_PASSWORD);
    await page.fill('#confirm',  VALID_PASSWORD);
    await page.click('#submit-btn');

    // Wait for alert to appear
    const alert = page.locator('#alert');
    await expect(alert).toBeVisible({ timeout: 8000 });
    await expect(alert).toHaveClass(/success/);
    await expect(alert).toContainText(username);
  });

  test('successful registration stores token in localStorage', async ({ page }) => {
    await page.goto(`${BASE_URL}/register-page`);

    const email    = uniqueEmail();
    const username = `user_${Date.now()}`;

    await page.fill('#email',    email);
    await page.fill('#username', username);
    await page.fill('#password', VALID_PASSWORD);
    await page.fill('#confirm',  VALID_PASSWORD);
    await page.click('#submit-btn');

    await expect(page.locator('#alert.success')).toBeVisible({ timeout: 8000 });

    const token = await page.evaluate(() => localStorage.getItem('jwt_token'));
    expect(token).toBeTruthy();
    expect(token.split('.').length).toBe(3); // valid JWT has 3 parts
  });
});

test.describe('Registration — Negative', () => {
  test('short password shows client-side error without server call', async ({ page }) => {
    await page.goto(`${BASE_URL}/register-page`);

    await page.fill('#email',    uniqueEmail());
    await page.fill('#username', 'validuser');
    await page.fill('#password', SHORT_PASSWORD);
    await page.fill('#confirm',  SHORT_PASSWORD);
    await page.click('#submit-btn');

    // Field error visible
    const passErr = page.locator('#password-err');
    await expect(passErr).toBeVisible();
    await expect(passErr).toContainText('8 characters');

    // No alert (no server call)
    await expect(page.locator('#alert')).not.toHaveClass(/error|success/);
  });

  test('invalid email format shows client-side error', async ({ page }) => {
    await page.goto(`${BASE_URL}/register-page`);

    await page.fill('#email',    'notanemail');
    await page.fill('#username', 'validuser');
    await page.fill('#password', VALID_PASSWORD);
    await page.fill('#confirm',  VALID_PASSWORD);
    await page.click('#submit-btn');

    await expect(page.locator('#email-err')).toBeVisible();
    await expect(page.locator('#email-err')).toContainText('valid email');
  });

  test('mismatched passwords shows client-side error', async ({ page }) => {
    await page.goto(`${BASE_URL}/register-page`);

    await page.fill('#email',    uniqueEmail());
    await page.fill('#username', 'validuser2');
    await page.fill('#password', VALID_PASSWORD);
    await page.fill('#confirm',  'DifferentPass999');
    await page.click('#submit-btn');

    await expect(page.locator('#confirm-err')).toBeVisible();
    await expect(page.locator('#confirm-err')).toContainText('do not match');
  });

  test('duplicate email registration shows server error', async ({ page }) => {
    await page.goto(`${BASE_URL}/register-page`);

    const email    = uniqueEmail();
    const username = `dup_${Date.now()}`;

    // First registration (should succeed)
    await page.fill('#email',    email);
    await page.fill('#username', username);
    await page.fill('#password', VALID_PASSWORD);
    await page.fill('#confirm',  VALID_PASSWORD);
    await page.click('#submit-btn');
    await expect(page.locator('#alert.success')).toBeVisible({ timeout: 8000 });

    // Navigate back and try same email again
    await page.goto(`${BASE_URL}/register-page`);
    await page.fill('#email',    email);
    await page.fill('#username', `${username}_2`);
    await page.fill('#password', VALID_PASSWORD);
    await page.fill('#confirm',  VALID_PASSWORD);
    await page.click('#submit-btn');

    await expect(page.locator('#alert.error')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#alert')).toContainText(/already|registered/i);
  });
});

// ── Login Tests ─────────────────────────────────────────────────────────────

test.describe('Login — Positive', () => {
  let testEmail, testUsername;

  test.beforeAll(async ({ browser }) => {
    // Seed a user via API for login tests
    testEmail    = uniqueEmail();
    testUsername = `logintest_${Date.now()}`;

    const context = await browser.newContext();
    const page    = await context.newPage();
    await page.goto(`${BASE_URL}/register-page`);
    await page.fill('#email',    testEmail);
    await page.fill('#username', testUsername);
    await page.fill('#password', VALID_PASSWORD);
    await page.fill('#confirm',  VALID_PASSWORD);
    await page.click('#submit-btn');
    await expect(page.locator('#alert.success')).toBeVisible({ timeout: 8000 });
    await context.close();
  });

  test('login with correct credentials shows success message', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await page.fill('#email',    testEmail);
    await page.fill('#password', VALID_PASSWORD);
    await page.click('#submit-btn');

    const alert = page.locator('#alert');
    await expect(alert).toBeVisible({ timeout: 8000 });
    await expect(alert).toHaveClass(/success/);
    await expect(alert).toContainText(testUsername);
  });

  test('successful login stores JWT in localStorage', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await page.fill('#email',    testEmail);
    await page.fill('#password', VALID_PASSWORD);
    await page.click('#submit-btn');

    await expect(page.locator('#alert.success')).toBeVisible({ timeout: 8000 });

    const token = await page.evaluate(() => localStorage.getItem('jwt_token'));
    expect(token).toBeTruthy();
    expect(token.split('.').length).toBe(3);
  });

  test('successful login displays token preview in UI', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await page.fill('#email',    testEmail);
    await page.fill('#password', VALID_PASSWORD);
    await page.click('#submit-btn');

    await expect(page.locator('#token-display')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#token-display')).toContainText('JWT:');
  });
});

test.describe('Login — Negative', () => {
  test('wrong password returns 401 and UI shows error', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await page.fill('#email',    'anyuser@example.com');
    await page.fill('#password', 'WrongPassword999');
    await page.click('#submit-btn');

    const alert = page.locator('#alert');
    await expect(alert).toBeVisible({ timeout: 8000 });
    await expect(alert).toHaveClass(/error/);
    await expect(alert).toContainText(/invalid|credentials|password/i);
  });

  test('empty email shows client-side validation error', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await page.fill('#password', VALID_PASSWORD);
    await page.click('#submit-btn');

    await expect(page.locator('#email-err')).toBeVisible();
    await expect(page.locator('#email-err')).toContainText(/required/i);
  });

  test('invalid email format shows client-side error', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await page.fill('#email',    'bademail');
    await page.fill('#password', VALID_PASSWORD);
    await page.click('#submit-btn');

    await expect(page.locator('#email-err')).toBeVisible();
    await expect(page.locator('#email-err')).toContainText(/valid email/i);
  });

  test('unregistered email returns error from server', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await page.fill('#email',    `nonexistent_${Date.now()}@nowhere.com`);
    await page.fill('#password', VALID_PASSWORD);
    await page.click('#submit-btn');

    const alert = page.locator('#alert');
    await expect(alert).toBeVisible({ timeout: 8000 });
    await expect(alert).toHaveClass(/error/);
  });
});
