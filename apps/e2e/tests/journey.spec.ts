import { expect, test, type Browser, type Page } from '@playwright/test';
import { generateSync } from 'otplib';

const API = 'http://localhost:4000';
const PASSWORD = 'Str0ngPassw0rd!x';

async function signInMember(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/dashboard/);
}

async function signInStaff(page: Page, staff: { email: string; password: string; secret: string }) {
  await page.goto('http://localhost:5174/');
  await page.getByLabel('Email').fill(staff.email);
  await page.getByLabel('Password').fill(staff.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Authenticator code')).toBeVisible();
  await page.locator('input[inputmode="numeric"]').first().click();
  await page.keyboard.type(generateSync({ secret: staff.secret }));
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Insights' })).toBeVisible();
}

async function memberPage(browser: Browser, email: string) {
  const ctx = await browser.newContext({ baseURL: 'http://localhost:5173' });
  const page = await ctx.newPage();
  await signInMember(page, email);
  const essential = page.getByRole('button', { name: 'Essential only' });
  if (await essential.isVisible().catch(() => false)) await essential.click();
  return page;
}

async function buyCredit(page: Page) {
  await page.goto('/billing');
  await page.getByRole('button', { name: 'Buy' }).first().click();
  await expect(page.getByText('Payment received')).toBeVisible();
}

/**
 * The whole path, through the real screens: two members whose profile and documents are waiting for the team, a
 * staff member who approves the profiles, photos and verifications, runs matching and approves the match, both
 * members paying and saying yes, then talking and leaving feedback. Only the two uploads the browser cannot do
 * against in-memory storage, and the ten-minute cool-off, are shortcut by test helpers.
 */
test('verification, review, match, introduction, payment, conversation and feedback', async ({ browser, request }) => {
  test.setTimeout(240_000);
  const stamp = Date.now();
  const asha = { email: `asha${stamp}@e2e.test`, firstName: 'Asha', gender: 'woman', dobYear: 1996 };
  const ravi = { email: `ravi${stamp}@e2e.test`, firstName: 'Ravi', gender: 'man', dobYear: 1994 };
  for (const m of [asha, ravi]) {
    const r = await request.post(`${API}/__e2e/member`, { data: { ...m, password: PASSWORD } });
    expect(r.ok()).toBeTruthy();
  }
  const staff = await (await request.get(`${API}/__e2e/staff`)).json();

  // ---- staff: approve profiles, photos and verifications
  const staffCtx = await browser.newContext();
  const admin = await staffCtx.newPage();
  await signInStaff(admin, staff);

  for (const m of [asha, ravi]) {
    await admin.goto('http://localhost:5174/profiles');
    await admin.getByText(m.firstName, { exact: false }).first().click();
    await admin.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(admin.getByText(/approved/i).first()).toBeVisible();
  }

  await admin.goto('http://localhost:5174/photos');
  for (let i = 0; i < 2; i++) {
    await admin.getByRole('button', { name: 'Approve' }).first().click();
    await expect(admin.getByRole('button', { name: 'Approve' })).toHaveCount(1 - i);
  }

  for (let i = 0; i < 2; i++) {
    await admin.goto('http://localhost:5174/verification');
    await admin.getByRole('row').nth(1).click();
    await expect(admin.getByRole('checkbox').first()).toBeVisible();
    for (const box of await admin.getByRole('checkbox').all()) await box.check();
    await admin.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(admin.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0);
  }

  // ---- staff: run matching, review the pair and approve it with the explanation
  await admin.goto('http://localhost:5174/matches');
  await admin.getByRole('button', { name: 'Run matching now' }).click();
  await expect(admin.getByText(/Matching finished/)).toBeVisible();
  await admin.getByRole('row').nth(1).click();
  await admin.getByRole('button', { name: 'Approve', exact: true }).click();
  const dialog = admin.getByRole('dialog');
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Confirm' }).click();
  await expect(admin.getByText(/It will be released to both members/)).toBeVisible();

  // The real wait is ten minutes so a mistake can be undone; the test skips it.
  const released = await request.post(`${API}/__e2e/release`);
  expect(released.ok()).toBeTruthy();

  // ---- both members: buy a credit, read the introduction, say yes
  const a = await memberPage(browser, asha.email);
  const r = await memberPage(browser, ravi.email);
  for (const [page, who] of [[a, 'Ravi'], [r, 'Asha']] as const) {
    await buyCredit(page);
    await page.goto('/introductions');
    await expect(page.getByText(who)).toBeVisible();
    await page.getByRole('link', { name: 'View introduction' }).click();
    await expect(page.getByText('Why we introduced you')).toBeVisible();
    await page.getByRole('button', { name: 'Say yes' }).click();
    await page.getByRole('textbox').fill('Hello! Your profile made me smile, and I would love to talk about weekends and family.');
    await page.getByRole('button', { name: 'Say yes and send my note' }).click();
  }

  // ---- connected: the second yes unlocks the introduction for both
  await a.reload();
  await expect(a.getByText('You are connected').first()).toBeVisible();
  await expect(a.getByRole('link', { name: 'Send a message' })).toBeVisible();

  // ---- a conversation
  await a.getByRole('link', { name: 'Send a message' }).click();
  await a.getByRole('textbox').fill('Good evening Ravi, how was your week?');
  await a.getByRole('button', { name: 'Send' }).click();
  await expect(a.getByText('Good evening Ravi, how was your week?')).toBeVisible();
  await r.goto('/messages');
  await r.getByRole('link', { name: /Asha/ }).click();
  await expect(r.getByText('Good evening Ravi, how was your week?')).toBeVisible();

  // ---- ending the conversation asks for a short note, which only the team sees
  await a.getByRole('button', { name: 'End conversation' }).first().click();
  await a.getByRole('dialog').getByRole('button', { name: 'End conversation' }).click();
  await expect(a.getByRole('dialog', { name: 'Before you go' })).toBeVisible();
  await a.getByRole('radio', { name: '4 out of 5' }).click();
  await a.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(a.getByText('Thank you. This really helps.')).toBeVisible();
});
