import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import nock from 'nock';
import { MongoMemoryServer } from 'mongodb-memory-server';
import userModel from '../models/userModel.js';
import { ticketModel } from '../models/ticketModel.js';
import { userToken } from '../utils/authTokens.js';

Object.assign(process.env, { JWT_SECRET: 'ticket-unread-tests-only-secret-32-bytes', RESEND_API_KEY: 're_local', NODE_ENV: 'test' });
const { default: ticketRouter } = await import('../routes/ticketRoute.js');
let database, server, base, admin, customer;
const request = async (path, body, token = userToken(admin, 'admin')) => {
  const response = await fetch(base + '/api/ticket' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { token, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json() };
};
const counts = async () => {
  const response = await request('/admin-unread');
  assert.equal(response.status, 200);
  return response.data;
};
const makeTicket = (extra = {}) => ticketModel.create({ user: customer._id, subject: 'Test ticket',
  description: 'Test conversation', ticketNumber: '123456', messages: [{ sender: 'admin', message: 'How can we help?' }], ...extra });
const reply = async (ticket, message = 'Customer reply') => {
  const response = await request('/reply', { ticketId: String(ticket._id), message }, userToken(customer));
  assert.equal(response.status, 200);
  assert.equal(response.data.success, true);
  return ticketModel.findById(ticket._id);
};
const read = async (ticket, lastMessageId = ticket.messages.at(-1)._id) => {
  const response = await request('/admin-mark-read', { ticketId: String(ticket._id), lastMessageId: String(lastMessageId) });
  assert.equal(response.status, 200);
  return response.data;
};

before(async () => {
  nock.disableNetConnect(); nock.enableNetConnect(/127\.0\.0\.1/);
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'ticket-unread-tests' });
  const app = express(); app.use(express.json()); app.use('/api/ticket', ticketRouter);
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => {
  nock.cleanAll();
  nock('https://api.resend.com').persist().post('/emails').reply(200, { id: 'local-test-email' });
  await Promise.all([ticketModel.deleteMany({}), userModel.deleteMany({})]);
  [admin, customer] = await userModel.create([{ name: 'Admin', email: 'admin@ticket.test', role: 'admin' }, { name: 'Customer', email: 'customer@ticket.test' }]);
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect(); await database?.stop(); nock.cleanAll(); nock.enableNetConnect();
});

test('Support replies increment per-ticket and total counts, while admin messages do not', async () => {
  let ticket = await makeTicket();
  assert.equal((await counts()).total, 0);
  ticket = await reply(ticket);
  ticket = await reply(ticket, 'One more question');
  assert.deepEqual((await counts()).counts, { [ticket._id]: 2 });
  await request('/admin-reply', { ticketId: String(ticket._id), sender: 'admin', message: 'Support response' });
  assert.equal((await counts()).total, 2);
  ticket = await ticketModel.findById(ticket._id);
  await read(ticket);
  assert.deepEqual((await counts()).counts, {});
  assert.equal((await counts()).total, 0);
  await reply(ticket, 'Thank you, another question');
  assert.equal((await counts()).total, 1);
});

test('a read acknowledgement cannot swallow a newer reply or move backwards', async () => {
  let ticket = await makeTicket();
  ticket = await reply(ticket, 'First question');
  const visibleMessageId = ticket.messages.at(-1)._id;
  ticket.messages.push({ sender: 'user', message: 'Arrived during reading', createdAt: ticket.messages.at(-1).createdAt });
  await ticket.save();
  const lastUpdated = ticket.updatedAt.getTime();
  await read(ticket, visibleMessageId);
  assert.equal((await counts()).total, 1);
  await read(ticket);
  await read(ticket, visibleMessageId);
  assert.equal((await counts()).total, 0);
  const saved = await ticketModel.findById(ticket._id);
  assert.equal(saved.lastSeenByAdminMessageCount, ticket.messages.length);
  assert.equal(saved.updatedAt.getTime(), lastUpdated);
});

test('new tickets, legacy tickets, appeals, closed conversations and attachment replies are counted', async () => {
  const created = await request('/create', { subject: 'New question', message: 'Please help' }, userToken(customer));
  assert.equal(created.data.success, true);
  const legacy = await makeTicket({ type: 'appeal', status: 'closed', messages: [
    { sender: 'user', message: 'My appeal' }, { sender: 'user', images: ['https://example.test/evidence.png'] },
  ] });
  await ticketModel.collection.updateOne({ _id: legacy._id }, { $unset: { lastSeenByAdminMessageCount: 1 } });
  const result = await counts();
  assert.equal(result.total, 3);
  assert.equal(result.counts[legacy._id], 2);
  assert.equal(result.counts[created.data.ticket._id], 1);
});

test('listing tickets and customer read markers do not clear the admin inbox', async () => {
  let ticket = await makeTicket();
  ticket = await reply(ticket);
  assert.equal((await request('/list')).data.tickets.length, 1);
  await request('/mark-read', { ticketId: String(ticket._id) }, userToken(customer));
  assert.equal((await counts()).total, 1);
  await read(ticket);
  assert.equal((await counts()).total, 0);
  const saved = await ticketModel.findById(ticket._id);
  assert.ok(saved.lastSeenByUserAt);
});

test('unread counts and read mutations require admin or permitted support staff', async () => {
  const ticket = await makeTicket({ messages: [{ sender: 'user', message: 'Private question' }] });
  const body = { ticketId: String(ticket._id), lastMessageId: String(ticket.messages[0]._id) };
  for (const token of ['', userToken(customer)]) {
    assert.equal((await request('/admin-unread', undefined, token)).status, 401);
    assert.equal((await request('/admin-mark-read', body, token)).status, 401);
  }
  const staff = await userModel.create({ name: 'Staff', email: 'staff@ticket.test', role: 'staff', permissions: ['/list'] });
  assert.equal((await request('/admin-unread', undefined, userToken(staff, 'admin'))).status, 403);
  assert.equal((await request('/admin-mark-read', body, userToken(staff, 'admin'))).status, 403);
  await userModel.updateOne({ _id: staff._id }, { $set: { permissions: ['/tickets'] } });
  assert.equal((await request('/admin-unread', undefined, userToken(staff, 'admin'))).data.total, 1);
  assert.equal((await request('/admin-mark-read', body, userToken(staff, 'admin'))).status, 200);
  assert.equal((await counts()).total, 0);
});

test('invalid tickets and unseen message IDs cannot clear a conversation', async () => {
  const ticket = await makeTicket({ messages: [{ sender: 'user', message: 'Unread question' }] });
  assert.equal((await request('/admin-mark-read', { ticketId: 'bad', lastMessageId: 'bad' })).status, 400);
  assert.equal((await request('/admin-mark-read', { ticketId: String(ticket._id), lastMessageId: String(new mongoose.Types.ObjectId()) })).status, 400);
  assert.equal((await request('/admin-mark-read', { ticketId: String(new mongoose.Types.ObjectId()), lastMessageId: String(ticket.messages[0]._id) })).status, 404);
  assert.equal((await counts()).total, 1);
});
