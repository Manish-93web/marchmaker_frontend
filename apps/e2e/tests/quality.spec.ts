import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const SIZES = [
  { name: 'phone', width: 360, height: 780 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

const PUBLIC = ['/', '/how-it-works', '/why-human-review', '/safety', '/pricing', '/faq', '/about', '/contact', '/guides', '/success-stories', '/login', '/register'];

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  const essential = page.getByRole('button', { name: 'Essential only' });
  if (await essential.isVisible().catch(() => false)) await essential.click();
}

/** Anything wider than the screen forces sideways scrolling, which is a failure on a phone. */
async function expectNoHorizontalScroll(page: Page, where: string) {
  const { overflow, culprits } = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const bad = Array.from(document.querySelectorAll('body *'))
      .filter((el) => el.getBoundingClientRect().right > width + 1 && !el.closest('[class*="overflow-x-auto"]'))
      .slice(0, 4)
      .map((el) => `${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).slice(0, 80)}`);
    return { overflow: document.documentElement.scrollWidth - width, culprits: bad };
  });
  expect(overflow, `${where} scrolls sideways by ${overflow}px; widest: ${culprits.join(' | ')}`).toBeLessThanOrEqual(1);
}

for (const size of SIZES) {
  test.describe(`${size.name} (${size.width}px)`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test('public pages fit the screen, have a single-line header and no serious accessibility violations', async ({ page }, info) => {
      test.setTimeout(180_000);
      for (const path of PUBLIC) {
        await page.goto(path);
        await settle(page);
        await expectNoHorizontalScroll(page, path);
        const header = await page.locator('header').first().boundingBox();
        expect(header?.height ?? 0, `${path} header wraps`).toBeLessThanOrEqual(80);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
        expect(serious.map((v) => `${v.id} (${v.nodes.length}) on ${path}`), JSON.stringify(serious.map((v) => v.nodes[0]?.html))).toEqual([]);
      }
      await page.goto('/');
      await settle(page);
      await page.screenshot({ path: info.outputPath(`home-${size.name}.png`), fullPage: true });
    });
  });
}

test('the signed-in member screens and the admin console pass axe too', async ({ page, request, browser }) => {
  test.setTimeout(180_000);
  const email = `quality${Date.now()}@e2e.test`;
  const r = await request.post('http://localhost:4000/__e2e/member', { data: { email, firstName: 'Quality', gender: 'woman', dobYear: 1996, password: 'Str0ngPassw0rd!x' } });
  expect(r.ok()).toBeTruthy();
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Str0ngPassw0rd!x');
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await settle(page);
  for (const path of ['/dashboard', '/settings', '/support', '/safety-centre', '/billing', '/referrals', '/notifications', '/introductions', '/messages']) {
    for (const size of SIZES) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto(path);
      await settle(page);
      await expectNoHorizontalScroll(page, `${path} at ${size.width}`);
    }
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
    expect(serious.map((v) => `${v.id} on ${path}`), JSON.stringify(serious.map((v) => v.nodes[0]?.html))).toEqual([]);
  }

  const staff = await (await request.get('http://localhost:4000/__e2e/staff')).json();
  const { generateSync } = await import('otplib');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const admin = await ctx.newPage();
  await admin.goto('http://localhost:5174/');
  await admin.getByLabel('Email').fill(staff.email);
  await admin.getByLabel('Password').fill(staff.password);
  await admin.getByRole('button', { name: 'Sign in' }).click();
  await admin.locator('input[inputmode="numeric"]').first().click();
  await admin.keyboard.type(generateSync({ secret: staff.secret }));
  await expect(admin.getByRole('navigation').getByRole('link', { name: 'Insights' })).toBeVisible();
  for (const path of ['/insights', '/members', '/jobs', '/legal', '/faqs', '/notifications', '/data-requests', '/payments', '/moderation', '/support']) {
    await admin.goto(`http://localhost:5174${path}`);
    await admin.waitForLoadState('networkidle').catch(() => undefined);
    const results = await new AxeBuilder({ page: admin }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
    expect(serious.map((v) => `${v.id} on ${path}`), JSON.stringify(serious.map((v) => v.nodes[0]?.html))).toEqual([]);
  }
});
