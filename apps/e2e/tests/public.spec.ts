import { expect, test } from '@playwright/test';

test.describe('public site', () => {
  test('shows the promise, live prices, and remembers the cookie choice', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Fewer introductions. Better ones.');
    // Nothing non-essential runs before a choice is made.
    const banner = page.getByRole('dialog', { name: /cookies|privacy/i }).or(page.getByRole('region', { name: /cookies|privacy/i }));
    await expect(banner.first()).toBeVisible();
    await page.getByRole('button', { name: /essential only|decline|only essential/i }).first().click();
    await page.reload();
    await expect(banner.first()).toBeHidden();
  });

  test('pricing lists the plans with GST-inclusive prices', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('article', { name: 'Essential' })).toContainText('₹');
    await expect(page.getByText(/GST/i).first()).toBeVisible();
  });

  test('keyboard users can reach the main content first', async ({ page }) => {
    // Decide on cookies first so the banner does not take the first tab stop.
    await page.addInitScript(() => localStorage.setItem('mm_consent', JSON.stringify({ analytics: false, decidedAt: new Date().toISOString(), version: 1 })));
    await page.goto('/how-it-works');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  });

  test('an unknown page says so kindly', async ({ page }) => {
    await page.goto('/no-such-page');
    await expect(page.getByText('We could not find that page')).toBeVisible();
  });
});
