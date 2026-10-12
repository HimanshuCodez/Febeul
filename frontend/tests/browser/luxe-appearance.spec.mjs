import { test, expect } from '@playwright/test';
import { DEFAULT_LUXE_PAGE_CONTENT, validateLuxePageContent } from '../../../backend/utils/luxePageContent.js';
import { DEFAULT_LUXE_APPEARANCE, LUXE_COLOR_FIELDS } from '../../../shared/luxeAppearance.js';

const shop = 'http://127.0.0.1:5177', admin = 'http://127.0.0.1:5178';
const custom = {
  headingFont: 'Georgia', bodyFont: 'Arial', backgroundColor: '#102030', cardBackgroundColor: '#fff9ee',
  headingColor: '#247a43', textColor: '#73513f', descriptionColor: '#38516b', accentColor: '#e98723',
  borderColor: '#6599aa', buttonBackgroundColor: '#336699', buttonTextColor: '#ffeeaa', buttonHoverColor: '#223355',
  bannerBackgroundColor: '#142840', bannerTextColor: '#ccddee',
};
async function fixture(page, content = DEFAULT_LUXE_PAGE_CONTENT) {
  const state = { content: structuredClone(content), saves: [], errors: [], member: false };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('token', 'local-luxe-test');
    if (location.port === '5178') {
      localStorage.setItem('role', 'admin');
      localStorage.setItem('permissions', '[]');
    }
  });
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/analytics/config') return route.fulfill({ json: { success: true, enabled: true, consentVersion: 'local-test' } });
      if (url.pathname === '/api/user/profile') return route.fulfill({ json: { success: true, user: { _id: 'local-shopper', name: 'Local shopper', isLuxeMember: state.member } } });
      if (url.pathname === '/api/cms/luxePage') return route.fulfill({ json: { success: true, content: state.content } });
      if (url.pathname === '/api/cms' && req.method() === 'POST') {
        const body = req.postDataJSON();
        state.saves.push(body);
        state.content = validateLuxePageContent(body.content);
        return route.fulfill({ json: { success: true, content: state.content } });
      }
      if (url.pathname.startsWith('/api/coupon/')) return route.fulfill({ json: { success: true, coupons: [{ _id: 'join', code: 'JOIN30', userType: 'membership', isActive: true, expiryDate: '2099-12-31', discountType: 'fixed', discountValue: 30, description: 'Membership discount' }] } });
      return route.fulfill({ json: { success: true, content: null, products: [], wishlist: [], cartItems: [], messages: [] } });
    }
    return [shop, admin].includes(url.origin) ? route.continue() : route.abort();
  });
  return state;
}

test('admin previews and saves fonts and colours for desktop, mobile and active members', async ({ page }) => {
  const state = await fixture(page);
  await page.goto(admin + '/luxe-page');
  await page.getByRole('combobox', { name: 'Heading font', exact: true }).selectOption(custom.headingFont);
  await page.getByRole('combobox', { name: 'Body and button font', exact: true }).selectOption(custom.bodyFont);
  for (const [key, label] of LUXE_COLOR_FIELDS) await page.getByRole('textbox', { name: label, exact: true }).fill(custom[key]);
  const preview = page.getByRole('region', { name: 'Luxe appearance preview' });
  await expect(preview).toHaveCSS('background-color', 'rgb(16, 32, 48)');
  await expect(preview.getByRole('heading', { name: 'Luxe Membership' })).toHaveCSS('font-family', 'Georgia, serif');
  await expect(preview.getByRole('button', { name: 'Become a Member' })).toHaveCSS('background-color', 'rgb(51, 102, 153)');
  await page.getByRole('button', { name: 'Save Luxe page', exact: true }).click();
  await expect.poll(() => state.saves.length).toBe(1);
  expect(state.content.appearance).toEqual(custom);
  expect(state.content.features).toEqual(DEFAULT_LUXE_PAGE_CONTENT.features);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Heading font', exact: true })).toHaveValue('Georgia');
  await expect(page.getByRole('textbox', { name: 'Button background', exact: true })).toHaveValue('#336699');

  await page.goto(shop + '/luxe');
  const luxe = page.getByRole('region', { name: 'Luxe page', exact: true });
  await expect(luxe).toHaveCSS('background-color', 'rgb(16, 32, 48)');
  const heading = luxe.getByRole('heading', { name: 'Luxe Membership', exact: true });
  await expect(heading).toHaveCSS('color', 'rgb(36, 122, 67)');
  await expect(heading).toHaveCSS('font-family', 'Georgia, serif');
  await expect(luxe.getByText('Experience The Elite', { exact: true })).toHaveCSS('font-family', 'Arial, sans-serif');
  await expect(luxe.getByText('Join Febeul Luxe Today', { exact: true })).toHaveCSS('color', 'rgb(204, 221, 238)');
  const join = luxe.getByRole('button', { name: 'Become a Member', exact: true });
  await expect(join).toHaveCSS('background-color', 'rgb(51, 102, 153)');
  await expect(join).toHaveCSS('color', 'rgb(255, 238, 170)');
  await join.hover();
  await expect(join).toHaveCSS('background-color', 'rgb(34, 51, 85)');
  const input = luxe.getByRole('textbox', { name: 'Have a coupon?' });
  await expect(input).toHaveCSS('background-color', 'rgb(255, 249, 238)');
  await expect(luxe.getByText('Membership discount', { exact: true })).toHaveCSS('color', 'rgb(56, 81, 107)');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(heading).toHaveCSS('color', 'rgb(36, 122, 67)');
  await expect(input).toHaveCSS('font-family', 'Arial, sans-serif');
  state.member = true;
  await page.reload();
  await expect(luxe.getByRole('heading', { name: 'LUXE PRIVE SALE' })).toHaveCSS('font-family', 'Georgia, serif');
  await expect(luxe.getByRole('heading', { name: 'LUXE PRIVE SALE' })).toHaveCSS('color', 'rgb(36, 122, 67)');
  expect(state.errors).toEqual([]);
});

test('resetting appearance preserves text and benefits and loads the selected web fonts', async ({ page }) => {
  const state = await fixture(page, { ...DEFAULT_LUXE_PAGE_CONTENT, appearance: custom });
  await page.goto(admin + '/luxe-page');
  await page.getByLabel('Page title', { exact: true }).fill('Your Luxe Club');
  await page.getByRole('combobox', { name: 'Heading font', exact: true }).selectOption('Playfair Display');
  await expect(page.locator('head link[href*="family=Playfair+Display"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Reset fonts & colours', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Heading font', exact: true })).toHaveValue('Cormorant Garamond');
  await expect(page.getByRole('combobox', { name: 'Body and button font', exact: true })).toHaveValue('Raleway');
  await expect(page.getByLabel('Page title', { exact: true })).toHaveValue('Your Luxe Club');
  await expect(page.locator('head link[href*="family=Playfair+Display"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save Luxe page', exact: true }).click();
  await expect.poll(() => state.saves.length).toBe(1);
  expect(state.content.appearance).toEqual(DEFAULT_LUXE_APPEARANCE);
  expect(state.content.hero.title).toBe('Your Luxe Club');
  expect(state.content.features).toEqual(DEFAULT_LUXE_PAGE_CONTENT.features);
  expect(state.errors).toEqual([]);
});

test('saved pages without appearance settings keep their original styling', async ({ page }) => {
  const legacy = structuredClone(DEFAULT_LUXE_PAGE_CONTENT);
  delete legacy.appearance;
  const state = await fixture(page, legacy);
  await page.goto(shop + '/luxe');
  const luxe = page.getByRole('region', { name: 'Luxe page', exact: true });
  await expect(luxe).toHaveCSS('background-color', 'rgb(253, 245, 245)');
  await expect(luxe.getByRole('heading', { name: 'Luxe Membership' })).toHaveCSS('color', 'rgb(184, 122, 123)');
  await page.goto(admin + '/luxe-page');
  await expect(page.getByRole('combobox', { name: 'Heading font', exact: true })).toHaveValue('Cormorant Garamond');
  await expect(page.getByRole('textbox', { name: 'Page background', exact: true })).toHaveValue('#fdf5f5');
  expect(state.errors).toEqual([]);
});
