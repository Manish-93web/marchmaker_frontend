import { expect, test } from '@playwright/test';

const PASSWORD = 'Str0ng-Passw0rd!x';

test('a member joins, confirms their email, signs in and buys introductions', async ({ page, request }) => {
  const email = `member${Date.now()}@e2e.test`;

  // ---- create the account
  await page.goto('/register');
  await page.getByLabel('First name').fill('Meera');
  await page.getByLabel('I am').selectOption('woman');
  await page.getByLabel('Date of birth').fill('1996-02-02');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Check your inbox')).toBeVisible();

  // ---- confirm the email from the message the API "sent"
  // Email goes out just after the page is answered, so wait for it rather than assume.
  const fetchMail = async () => (await (await request.get(`http://localhost:4000/__e2e/mail?to=${encodeURIComponent(email)}`)).json()) as { html: string } | null;
  await expect.poll(async () => Boolean((await fetchMail())?.html), { timeout: 15_000 }).toBe(true);
  const mail = (await fetchMail())!;
  const link = /(\/verify-email\?token=[A-Za-z0-9_-]+)/.exec(mail.html)?.[1];
  expect(link, `links in the email: ${(mail.html.match(/href="[^"]+"/g) ?? []).join(' ')}`).toBeTruthy();
  await page.goto(link!);
  await expect(page.getByText('Email confirmed')).toBeVisible();

  // ---- sign in
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Meera');

  // ---- buy a single introduction (the mock provider completes the payment)
  await page.goto('/billing');
  await expect(page.getByText('0 available')).toBeVisible();
  await page.getByRole('button', { name: 'Buy' }).first().click();
  await expect(page.getByText('Payment received')).toBeVisible();
  await expect(page.getByText('1 available')).toBeVisible();
  await expect(page.getByText(/INV\/\d{4}-\d{2}\/\d{6}/)).toBeVisible();

  // ---- the receipt shows up in the notification bell
  await page.goto('/notifications');
  await expect(page.getByText('Credits added')).toBeVisible();

  // ---- and signing out ends the session
  await page.getByRole('button', { name: 'Sign out' }).first().click();
  await page.goto('/billing');
  await expect(page).toHaveURL(/login/);
});

test('a wrong password is refused kindly and does not reveal whether the account exists', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('nobody@e2e.test');
  await page.getByLabel('Password').fill('Wrong-password-1');
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Email or password is incorrect')).toBeVisible();
});
