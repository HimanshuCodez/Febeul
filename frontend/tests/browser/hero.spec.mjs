import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const shop = 'http://127.0.0.1:5177';
const admin = 'http://127.0.0.1:5178';
const gif = Buffer.from('47494638396102000100800000ff00000000ff21ff0b4e45545343415045322e30030100000021f90400320000002c0000000002000100000202040a0021f90400320000002c00000000020001000002024c0a003b', 'hex');
const defaults = [
  { desktop: '/media/wide.svg', mobile: '/media/portrait.svg', link: '/products' },
  { desktop: '/media/animated.gif', mobile: '', link: '' },
];
const poseDefaults = { desktop: '/media/wide.svg', mobile: '/media/portrait.svg', link: '/products/pose-collection' };
const styleDefaults = {
  items: ['Satin Babydoll', 'Net Nighty', 'Silk Nighty'].map(label => ({ label, icon: 'Star', link: '/products' })),
  pillBackgroundColor: '#123456', pillTextColor: '#ffffff', pillFontFamily: 'Arial',
  desktopBackground: '/media/wide.svg', mobileBackground: '/media/portrait.svg',
};

async function fixture(page, slides = defaults, sections = {}) {
  const state = {
    slides: structuredClone(slides),
    pose: structuredClone(sections.pose ?? poseDefaults),
    styles: structuredClone(sections.styles ?? styleDefaults),
    errors: [], uploads: [], saves: [], uploadError: null,
  };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-10-12T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-12T00:00:01Z'));
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(() => {
    if (location.port === '5178') {
      localStorage.setItem('token', 'local-hero-test');
      localStorage.setItem('role', 'admin');
      localStorage.setItem('permissions', '[]');
    }
  });
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.startsWith('/media/')) {
      if (url.pathname.endsWith('broken.gif')) return route.fulfill({ status: 404, body: '' });
      if (url.pathname.endsWith('.gif')) return route.fulfill({ contentType: 'image/gif', body: gif });
      const [width, height] = url.pathname.includes('portrait') ? [600, 900] : [1200, 300];
      return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="pink"/></svg>` });
    }
    if (url.pathname.startsWith('/api/')) {
      // Pending consent prevents the unrelated automatic membership popup during carousel checks.
      if (url.pathname === '/api/analytics/config') return route.fulfill({ json: { success: true, enabled: true, consentVersion: 'local-test' } });
      if (url.pathname === '/api/cms/hero_carousel') return route.fulfill({ json: { success: true, content: state.slides } });
      if (url.pathname === '/api/cms/pose_section') return route.fulfill({ json: { success: true, content: state.pose } });
      if (url.pathname === '/api/cms/style_categories') return route.fulfill({ json: { success: true, content: state.styles } });
      if (url.pathname === '/api/cms/upload') {
        state.uploads.push({ token: request.headers().token, body: request.postDataBuffer() });
        if (state.uploadError) return route.fulfill({ status: 413, json: { success: false, message: state.uploadError } });
        return route.fulfill({ json: { success: true, imageUrl: '/media/animated.gif' } });
      }
      if (url.pathname === '/api/cms' && request.method() === 'POST') {
        const body = request.postDataJSON();
        state.saves.push(body);
        const field = { hero_carousel: 'slides', pose_section: 'pose', style_categories: 'styles' }[body.name];
        if (field) state[field] = body.content;
        return route.fulfill({ json: { success: true, content: body.content } });
      }
      return route.fulfill({ json: { success: true, content: null, products: [], coupons: [], messages: [] } });
    }
    return [shop, admin].includes(url.origin) ? route.continue() : route.abort();
  });
  return state;
}

async function expectNaturalSize(page, source, ratio) {
  const hero = page.getByRole('region', { name: 'Featured collections' });
  const image = hero.locator('[aria-hidden="false"] img');
  await expect(image).toHaveAttribute('src', source);
  await expect.poll(() => image.evaluate(el => el.naturalWidth > 0)).toBe(true);
  await expect.poll(async () => {
    const bounds = await hero.boundingBox();
    return Math.abs(bounds.height - bounds.width / ratio);
  }).toBeLessThan(1);
  const bounds = await hero.boundingBox();
  const media = await image.boundingBox();
  expect(Math.abs(media.x - bounds.x)).toBeLessThan(1);
  expect(Math.abs(media.width - bounds.width)).toBeLessThan(1);
  expect(Math.abs(media.height - bounds.height)).toBeLessThan(1);
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
}

test('hero follows each image or GIF ratio, swaps mobile artwork and stays aligned on resize', async ({ page }) => {
  const state = await fixture(page);
  await page.goto(shop);
  await expectNaturalSize(page, '/media/wide.svg', 4);
  await expect(page.getByRole('region', { name: 'Featured collections' }).getByRole('link')).toHaveAttribute('href', '/products');
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNaturalSize(page, '/media/portrait.svg', 2 / 3);
  await page.clock.fastForward(3000);
  await expectNaturalSize(page, '/media/animated.gif', 2);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expectNaturalSize(page, '/media/animated.gif', 2);
  await page.setViewportSize({ width: 1000, height: 700 });
  await expectNaturalSize(page, '/media/animated.gif', 2);
  expect(state.errors).toEqual([]);
});

async function expectSectionMedia(page, name, source, ratio) {
  const section = page.getByRole('region', { name, exact: true });
  const media = section.locator('img');
  await expect(media).toHaveAttribute('src', source);
  await expect.poll(() => media.evaluate(el => el.naturalWidth > 0)).toBe(true);
  await expect.poll(async () => {
    const bounds = await media.boundingBox();
    return Math.abs(bounds.height - bounds.width / ratio);
  }).toBeLessThan(1);
  const bounds = await section.boundingBox(), image = await media.boundingBox();
  expect(Math.abs(image.width - bounds.width)).toBeLessThan(1);
  expect(Math.abs(image.x - bounds.x)).toBeLessThan(1);
  expect(image.y).toBeGreaterThanOrEqual(bounds.y - 1);
  expect(image.y + image.height).toBeLessThanOrEqual(bounds.y + bounds.height + 1);
  expect(bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
  if (name === 'Pose collection') expect(Math.abs(image.height - bounds.height)).toBeLessThan(1);
  for (const pill of await section.getByRole('link').all()) {
    const link = await pill.boundingBox();
    expect(link.y).toBeGreaterThanOrEqual(bounds.y);
    expect(link.y + link.height).toBeLessThanOrEqual(bounds.y + bounds.height);
  }
}

test('pose and style backgrounds retain complete proportions on desktop and mobile', async ({ page }) => {
  const state = await fixture(page);
  await page.goto(shop);
  for (const [width, height, source, ratio] of [
    [1280, 900, '/media/wide.svg', 4],
    [390, 844, '/media/portrait.svg', 2 / 3],
    [1440, 900, '/media/wide.svg', 4],
  ]) {
    await page.setViewportSize({ width, height });
    await expectSectionMedia(page, 'Pose collection', source, ratio);
    await expectSectionMedia(page, 'Style categories', source, ratio);
  }
  await expect(page.getByRole('region', { name: 'Pose collection' }).getByRole('link')).toHaveAttribute('href', poseDefaults.link);
  const pill = page.getByRole('region', { name: 'Style categories' }).getByRole('link', { name: 'Satin Babydoll' });
  await expect(pill).toHaveAttribute('href', '/products');
  await expect(pill).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  await expect(pill).toHaveCSS('color', 'rgb(255, 255, 255)');
  expect(state.errors).toEqual([]);
});

test('one uploaded GIF works on both screen sizes and styles expand to fit the pills', async ({ page }) => {
  const state = await fixture(page, defaults, {
    pose: { ...poseDefaults, desktop: '', mobile: '/media/animated.gif' },
    styles: { ...styleDefaults, desktopBackground: '/media/animated.gif', mobileBackground: '' },
  });
  await page.goto(shop);
  for (const viewport of [{ width: 1280, height: 900 }, { width: 320, height: 640 }]) {
    await page.setViewportSize(viewport);
    await expectSectionMedia(page, 'Pose collection', '/media/animated.gif', 2);
    await expectSectionMedia(page, 'Style categories', '/media/animated.gif', 2);
  }
  const styles = page.getByRole('region', { name: 'Style categories' });
  expect((await styles.boundingBox()).height).toBeGreaterThan((await styles.locator('img').boundingBox()).height);
  expect(state.errors).toEqual([]);
});

test('admin saves GIFs and natural previews for pose and style backgrounds', async ({ page }) => {
  const state = await fixture(page);
  await page.goto(admin + '/images');
  await expect(page.getByRole('heading', { name: 'Loading...', exact: true })).toHaveCount(0);
  for (const [section, label, alt, save] of [
    ['Pose Section (Desktop & Mobile)', 'Image / GIF', 'pose preview', 'SAVE POSE SETTINGS'],
    ['Style Categories (Homepage Pills)', 'Background / GIF', 'style background preview', 'Save Style Categories'],
  ]) {
    await page.getByRole('button', { name: new RegExp(section.replace(/[()&]/g, '\\$&')) }).click();
    for (const version of ['Desktop', 'Mobile']) {
      const input = page.getByLabel(`Upload ${version} ${label}`, { exact: true });
      await expect(input).toHaveAttribute('accept', /image\/gif/);
      await input.setInputFiles({ name: 'animated.gif', mimeType: 'image/gif', buffer: gif });
      const preview = page.getByAltText(`${version} ${alt}`);
      await expect(preview).toHaveAttribute('src', '/media/animated.gif');
      await expect.poll(() => preview.evaluate(el => el.naturalWidth)).toBe(2);
      const bounds = await preview.boundingBox();
      expect(bounds.width / bounds.height).toBeCloseTo(2);
    }
    await page.getByRole('button', { name: save, exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Loading...', exact: true })).toHaveCount(0);
  }
  await expect.poll(() => state.saves.length).toBe(2);
  expect(state.saves).toEqual([
    { name: 'pose_section', content: { ...poseDefaults, desktop: '/media/animated.gif', mobile: '/media/animated.gif' } },
    { name: 'style_categories', content: { ...styleDefaults, desktopBackground: '/media/animated.gif', mobileBackground: '/media/animated.gif' } },
  ]);
  expect(state.uploads).toHaveLength(4);
  for (const upload of state.uploads) {
    expect(upload.token).toBe('local-hero-test');
    expect(upload.body.includes(gif)).toBe(true);
  }
  await page.goto(shop);
  await expectSectionMedia(page, 'Pose collection', '/media/animated.gif', 2);
  await expectSectionMedia(page, 'Style categories', '/media/animated.gif', 2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectSectionMedia(page, 'Pose collection', '/media/animated.gif', 2);
  await expectSectionMedia(page, 'Style categories', '/media/animated.gif', 2);
  expect(state.errors).toEqual([]);
});

test('empty slides are skipped and unavailable artwork falls back to the other version', async ({ page }) => {
  const state = await fixture(page, [{ desktop: '', mobile: '' }, { desktop: '/media/broken.gif', mobile: '/media/portrait.svg' }]);
  await page.goto(shop);
  await expectNaturalSize(page, '/media/portrait.svg', 2 / 3);
  await expect(page.getByRole('region', { name: 'Featured collections' }).locator('img')).toHaveCount(1);
  expect(state.errors).toEqual([]);
});

test('admin accepts GIFs, previews their complete dimensions and saves them for the storefront', async ({ page }) => {
  const state = await fixture(page, [defaults[0]]);
  await page.goto(admin + '/images');
  await expect(page.getByRole('heading', { name: 'Loading...', exact: true })).toHaveCount(0);
  for (const version of ['Desktop', 'Mobile']) {
    const input = page.getByLabel(`Upload ${version} Image / GIF`);
    await expect(input).toHaveAttribute('accept', /image\/gif/);
    await input.setInputFiles({ name: 'animated.gif', mimeType: 'image/gif', buffer: gif });
    const preview = page.getByAltText(`${version} preview for slide 1`);
    await expect(preview).toHaveAttribute('src', '/media/animated.gif');
    await expect.poll(() => preview.evaluate(el => el.naturalWidth)).toBe(2);
    const bounds = await preview.boundingBox();
    expect(bounds.width / bounds.height).toBeCloseTo(2);
  }
  expect(state.uploads).toHaveLength(2);
  for (const upload of state.uploads) {
    expect(upload.token).toBe('local-hero-test');
    expect(upload.body.includes(gif)).toBe(true);
  }
  await page.getByRole('button', { name: 'Save Carousel', exact: true }).click();
  await expect.poll(() => state.saves.length).toBe(1);
  expect(state.saves[0]).toEqual({ name: 'hero_carousel', content: [{ desktop: '/media/animated.gif', mobile: '/media/animated.gif', link: '/products' }] });
  await page.goto(shop);
  await expectNaturalSize(page, '/media/animated.gif', 2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNaturalSize(page, '/media/animated.gif', 2);
  expect(state.errors).toEqual([]);
});

test('a 25 MB hero GIF uploads and is saved for both desktop and mobile fallback', async ({ page }) => {
  const state = await fixture(page, [{ desktop: '/media/wide.svg', mobile: '', link: '/products' }]);
  await page.goto(admin + '/images');
  await expect(page.getByText(/Animated GIF: up to 50 MB per file/)).toBeVisible();
  const largeGif = Buffer.concat([gif, Buffer.alloc(25 * 1024 * 1024 - gif.length)]);
  await page.getByLabel('Upload Desktop Image / GIF').setInputFiles({ name: 'large-animated.gif', mimeType: 'image/gif', buffer: largeGif });
  await expect(page.getByAltText('Desktop preview for slide 1')).toHaveAttribute('src', '/media/animated.gif');
  expect(state.uploads).toHaveLength(1); expect(state.uploads[0].body.includes(largeGif)).toBe(true);
  await page.getByRole('button', { name: 'Save Carousel', exact: true }).click();
  await expect.poll(() => state.saves.length).toBe(1);
  await page.goto(shop); await expectNaturalSize(page, '/media/animated.gif', 2);
  await page.setViewportSize({ width: 390, height: 844 }); await expectNaturalSize(page, '/media/animated.gif', 2);
  expect(state.errors).toEqual([]);
});

test('oversized GIFs and still images are rejected locally without replacing the current hero', async ({ page }) => {
  const state = await fixture(page, [defaults[0]]); await page.goto(admin + '/images');
  const input = page.getByLabel('Upload Desktop Image / GIF');
  for (const [name, length, message] of [
    ['too-large.gif', 50 * 1024 * 1024 + 1, 'GIFs must be 50 MB or smaller.'],
    ['too-large.png', 5 * 1024 * 1024 + 1, 'Images must be 5 MB or smaller.'],
  ]) {
    // Playwright caps in-memory upload buffers at 50 MB; use a local fixture.
    const path = test.info().outputPath(name);
    await writeFile(path, Buffer.alloc(length));
    await input.setInputFiles(path);
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    await expect(page.getByAltText('Desktop preview for slide 1')).toHaveAttribute('src', '/media/wide.svg');
  }
  expect(state.uploads).toHaveLength(0); expect(state.saves).toHaveLength(0); expect(state.errors).toEqual([]);
});

test('a Cloudinary rejection preserves the saved hero and permits retrying the same file', async ({ page }) => {
  const state = await fixture(page, [defaults[0]]);
  state.uploadError = 'Cloudinary rejected this file because it exceeds your account’s upload limit. Reduce the file size or increase the upload limit in your Cloudinary account.';
  await page.goto(admin + '/images');
  const input = page.getByLabel('Upload Mobile Image / GIF');
  await input.setInputFiles({ name: 'animated.gif', mimeType: 'image/gif', buffer: gif });
  await expect(page.getByText(state.uploadError, { exact: true })).toBeVisible();
  await expect(page.getByAltText('Mobile preview for slide 1')).toHaveAttribute('src', '/media/portrait.svg');
  await expect(page.getByRole('heading', { name: 'Loading...', exact: true })).toHaveCount(0);
  expect(state.saves).toHaveLength(0);
  state.uploadError = null;
  await input.setInputFiles({ name: 'animated.gif', mimeType: 'image/gif', buffer: gif });
  await expect(page.getByAltText('Mobile preview for slide 1')).toHaveAttribute('src', '/media/animated.gif');
  expect(state.uploads).toHaveLength(2); expect(state.errors).toEqual([]);
});
