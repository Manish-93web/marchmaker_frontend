import { expect, test } from '@playwright/test';
import { generateSync } from 'otplib';

test('staff sign in with a password and authenticator code, then reach the console', async ({ page, request }) => {
  const staff = await (await request.get('http://localhost:4000/__e2e/staff')).json();

  await page.goto('http://localhost:5174/');
  await page.getByLabel('Email').fill(staff.email);
  await page.getByLabel('Password').fill(staff.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // The console asks for the authenticator code; typing the sixth digit signs in.
  const code = generateSync({ secret: staff.secret });
  await expect(page.getByText('Authenticator code')).toBeVisible();
  await page.locator('input[inputmode="numeric"]').first().click();
  await page.keyboard.type(code);

  await expect(page.getByRole('navigation').getByRole('link', { name: 'Insights' })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Insights' }).click();
  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();
  await expect(page.getByText('Journey funnel')).toBeVisible();

  await page.getByRole('navigation').getByRole('link', { name: 'Payments' }).click();
  await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible();
});
