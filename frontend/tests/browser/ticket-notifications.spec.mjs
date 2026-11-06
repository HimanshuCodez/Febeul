import { test, expect } from '@playwright/test';

const adminUrl = 'http://127.0.0.1:5178';
const shopUrl = 'http://127.0.0.1:5177';
const customer = { _id: '650000000000000000000001', name: 'Test Customer', email: 'customer@example.test', addresses: [] };
let messageSequence = 100;
const message = (sender, text) => ({ _id: (++messageSequence).toString(16).padStart(24, '0'), sender, message: text, images: [], createdAt: new Date().toISOString() });
const makeTicket = (extra = {}) => ({
  _id: '650000000000000000000011', ticketNumber: '123456', user: customer,
  subject: 'Help with my order', description: 'How can we help?', type: 'support', status: 'open',
  createdAt: '2026-11-05T08:00:00Z', updatedAt: '2026-11-05T08:00:00Z', images: [],
  messages: [message('admin', 'How can we help?')], lastSeenByAdminMessageCount: 0, ...extra,
});
const badge = (locator, count) => locator.locator(`[aria-label="${count} unread customer messages"]`);
const sidebarLink = page => page.locator('a[href="/tickets"]:visible');
const header = page => page.getByRole('heading', { name: /Support tickets/ });

async function fixture(context, tickets = [makeTicket()], role = 'admin') {
  const state = { tickets, reads: [], replies: [], unreadRequests: 0, errors: [] };
  await context.addInitScript(role => {
    if (!['http://127.0.0.1:5178', 'http://127.0.0.1:5177'].includes(location.origin)) return;
    localStorage.setItem('token', 'local-ticket-test');
    if (location.port === '5178') {
      localStorage.setItem('role', role);
      localStorage.setItem('userEmail', 'admin@example.test');
      localStorage.setItem('permissions', JSON.stringify(role === 'staff' ? ['/list'] : []));
    }
  }, role);
  context.on('page', page => page.on('pageerror', error => state.errors.push(error.message)));
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      let data = { success: true, enabled: false, content: null, data: {}, products: [], wishlist: [], cartItems: [], tickets: [], coupons: [], giftWraps: [], reviews: [], policies: [], messages: [] };
      if (url.pathname === '/api/user/profile') data.user = customer;
      if (['/api/ticket/list', '/api/ticket/user'].includes(url.pathname)) data.tickets = state.tickets;
      if (url.pathname === '/api/ticket/admin-unread') {
        state.unreadRequests++;
        data.counts = Object.fromEntries(state.tickets.map(ticket => [ticket._id,
          ticket.messages.slice(ticket.lastSeenByAdminMessageCount || 0).filter(msg => msg.sender === 'user').length,
        ]).filter(([, count]) => count > 0));
      }
      if (url.pathname === '/api/ticket/admin-mark-read') {
        const body = request.postDataJSON();
        state.reads.push(body);
        const ticket = state.tickets.find(ticket => ticket._id === body.ticketId);
        ticket.lastSeenByAdminMessageCount = Math.max(ticket.lastSeenByAdminMessageCount || 0,
          ticket.messages.findIndex(msg => msg._id === body.lastMessageId) + 1);
      }
      if (url.pathname === '/api/ticket/reply') {
        const body = request.postDataBuffer().toString();
        const field = name => body.match(new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]+)`))?.[1];
        const ticket = state.tickets.find(ticket => ticket._id === field('ticketId'));
        const reply = message('user', field('message'));
        ticket.messages.push(reply);
        state.replies.push(reply);
        data.newMessage = reply; data.newImages = [];
      }
      return route.fulfill({ json: data });
    }
    return [adminUrl, shopUrl].includes(url.origin) ? route.continue() : route.abort();
  });
  return state;
}

test('a customer reply from Support automatically appears in the admin sidebar and Tickets count', async ({ context }) => {
  const state = await fixture(context);
  const admin = await context.newPage();
  await admin.clock.install();
  await admin.goto(`${adminUrl}/list`);
  await expect(sidebarLink(admin)).toBeVisible();
  await expect(sidebarLink(admin).locator('[aria-label$="unread customer messages"]')).toHaveCount(0);
  const shop = await context.newPage();
  await shop.goto(`${shopUrl}/support`);
  await shop.getByText('Help with my order', { exact: true }).click();
  await shop.getByPlaceholder('Type your message...').fill('Please check the delivery of my order.');
  await shop.getByPlaceholder('Type your message...').press('Enter');
  await expect.poll(() => state.replies.length).toBe(1);
  await admin.bringToFront();
  await admin.clock.fastForward(15000);
  await expect(badge(sidebarLink(admin), 1)).toHaveText('1');
  await sidebarLink(admin).click();
  await expect(badge(header(admin), 1)).toHaveText('1');
  const row = admin.getByRole('row').filter({ hasText: 'Help with my order' });
  await expect(badge(row, 1)).toBeVisible();
  await expect.poll(() => state.reads.length).toBe(0);
  await row.getByRole('button', { name: 'View Details' }).click();
  await expect(admin.getByRole('dialog').getByText('Please check the delivery of my order.')).toBeVisible();
  await expect(sidebarLink(admin).locator('[aria-label$="unread customer messages"]')).toHaveCount(0);
  expect(state.reads[0].lastMessageId).toBe(state.replies[0]._id);
  expect(state.errors).toEqual([]);
});

test('counts include every unread reply and appeal, clear only the opened ticket, and survive reload', async ({ context, page }) => {
  const first = makeTicket({ messages: [message('admin', 'Support'), message('user', 'First question'), message('user', 'Second question')] });
  const second = makeTicket({ _id: '650000000000000000000012', ticketNumber: '234567', subject: 'Another order', status: 'closed', messages: [message('user', 'Closed ticket follow-up')] });
  const appeal = makeTicket({ _id: '650000000000000000000013', ticketNumber: '345678', subject: 'Account appeal', type: 'appeal', messages: [message('user', 'Please review my account')] });
  const state = await fixture(context, [first, second, appeal]);
  await page.goto(`${adminUrl}/tickets`);
  await expect(badge(sidebarLink(page), 4)).toBeVisible();
  await expect(badge(header(page), 4)).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: first.subject });
  await expect(badge(row, 2)).toHaveText('2');
  await row.getByRole('button', { name: 'View Details' }).click();
  await expect(badge(sidebarLink(page), 2)).toHaveText('2');
  await page.getByRole('button', { name: 'Close ticket details' }).click();
  await expect(row.locator('[aria-label$="unread customer messages"]')).toHaveCount(0);
  await page.reload();
  await expect(badge(header(page), 2)).toBeVisible();
  await page.getByRole('button', { name: /^Appeals/ }).click();
  await expect(badge(page.getByRole('row').filter({ hasText: appeal.subject }), 1)).toBeVisible();
  await page.getByTitle('Collapse sidebar').click();
  await expect(badge(sidebarLink(page), 2)).toBeVisible();
  expect(state.errors).toEqual([]);
});

test('new replies appear in an open conversation before their count is cleared', async ({ context, page }) => {
  const ticket = makeTicket({ messages: [message('user', 'Initial question')] });
  const state = await fixture(context, [ticket]);
  await page.clock.install();
  await page.goto(`${adminUrl}/tickets`);
  await page.getByRole('row').filter({ hasText: ticket.subject }).getByRole('button', { name: 'View Details' }).click();
  await expect.poll(() => state.reads.length).toBe(1);
  await expect(header(page).locator('[aria-label$="unread customer messages"]')).toHaveCount(0);
  const incoming = message('user', 'New follow-up while the admin is reading');
  ticket.messages.push(incoming);
  await page.clock.fastForward(15000);
  await expect(page.getByRole('dialog').getByText(incoming.message)).toBeVisible();
  await expect.poll(() => state.reads.at(-1).lastMessageId).toBe(incoming._id);
  await expect(header(page).locator('[aria-label$="unread customer messages"]')).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test('mobile cards and the sidebar drawer show numeric reply counts', async ({ context, page }) => {
  const ticket = makeTicket({ messages: [message('user', 'First'), message('user', 'Second')] });
  const state = await fixture(context, [ticket]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${adminUrl}/tickets`);
  const card = page.locator('div.cursor-pointer').filter({ hasText: ticket.subject });
  await expect(badge(card, 2)).toBeVisible();
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(badge(sidebarLink(page), 2)).toBeVisible();
  await page.getByRole('button', { name: 'Close menu' }).click();
  await card.click();
  await expect(header(page).locator('[aria-label$="unread customer messages"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close ticket details' }).click();
  await expect(card.locator('[aria-label$="unread customer messages"]')).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test('staff without Tickets permission do not request or display customer reply counts', async ({ context, page }) => {
  const state = await fixture(context, [makeTicket({ messages: [message('user', 'Private request')] })], 'staff');
  await page.goto(`${adminUrl}/list`);
  await expect(page.getByRole('link', { name: /^List Items/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Tickets/ })).toHaveCount(0);
  expect(state.unreadRequests).toBe(0);
  expect(state.errors).toEqual([]);
});
