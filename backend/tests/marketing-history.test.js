import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mailHistoryModel from '../models/mailHistoryModel.js';

// Import the controller without credentials or a production database connection.
process.env.RESEND_API_KEY = 're_local_test_only';
const { getMailHistory } = await import('../controllers/adminController.js');
let database;
const request = async (query = {}) => {
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; return this; } };
  await getMailHistory({ query }, response);
  return response;
};
const range = { sentFrom: '2026-10-09T18:30:00.000Z', sentBefore: '2026-10-20T18:30:00.000Z' };

before(async () => {
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'marketing-history-tests' });
  const records = [
    ...Array.from({ length: 104 }, (_, index) => ({ subject: `In range ${index}`, sentAt: '2026-10-15T12:00:00Z' })),
    ...Array.from({ length: 101 }, (_, index) => ({ subject: `Newer ${index}`, sentAt: '2026-10-25T12:00:00Z' })),
    { subject: 'First boundary', sentAt: range.sentFrom },
    { subject: 'Last boundary', sentAt: '2026-10-20T18:29:59.999Z' },
    { subject: 'Before range', sentAt: '2026-10-09T18:29:59.999Z' },
    { subject: 'After range', sentAt: range.sentBefore },
  ];
  await mailHistoryModel.insertMany(records.map(record => ({ ...record, target: 'all', htmlContent: '<p>Large campaign</p>', body: 'Large campaign body' })));
});

after(async () => {
  await mongoose.disconnect();
  await database?.stop();
});

test('finds older campaigns and every range match beyond the initial 100, without heavy HTML', async () => {
  const initial = await request();
  assert.equal(initial.data.history.length, 100);
  assert.ok(initial.data.history.every(record => record.subject.startsWith('Newer')));
  const result = await request(range);
  assert.equal(result.statusCode, 200);
  assert.equal(result.data.history.length, 106);
  const subjects = result.data.history.map(record => record.subject);
  assert.ok(subjects.includes('First boundary'));
  assert.ok(subjects.includes('Last boundary'));
  assert.ok(!subjects.includes('Before range') && !subjects.includes('After range'));
  const serialized = JSON.stringify(result.data);
  assert.ok(!serialized.includes('htmlContent') && !serialized.includes('Large campaign'));
  assert.equal(result.data.history[0].subject, 'Last boundary');
  assert.equal(result.data.history.at(-1).subject, 'First boundary');
});

test('supports one-sided dates, a single day, and empty matches', async () => {
  assert.equal((await request({ sentFrom: range.sentFrom })).data.history.length, 208);
  assert.equal((await request({ sentBefore: range.sentBefore })).data.history.length, 107);
  const singleDay = await request({ sentFrom: range.sentFrom, sentBefore: '2026-10-10T18:30:00.000Z' });
  assert.deepEqual(singleDay.data.history.map(record => record.subject), ['First boundary']);
  assert.deepEqual((await request({ sentFrom: '2026-11-01T00:00:00.000Z' })).data.history, []);
});

test('rejects malformed, non-scalar, and reversed date filters', async () => {
  for (const query of [
    { sentFrom: 'invalid' }, { sentFrom: '' }, { sentBefore: '2026-02-30T00:00:00.000Z' },
    { sentFrom: { $ne: '' } }, { sentBefore: [range.sentBefore] },
    { sentFrom: range.sentBefore, sentBefore: range.sentFrom },
    { sentFrom: range.sentFrom, sentBefore: range.sentFrom },
  ]) {
    const result = await request(query);
    assert.equal(result.statusCode, 400);
    assert.equal(result.data.success, false);
  }
});
