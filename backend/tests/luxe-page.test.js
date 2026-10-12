import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import cmsRouter from '../routes/cmsRoute.js';
import cmsModel from '../models/cmsModel.js';
import { DEFAULT_LUXE_PAGE_CONTENT, validateLuxePageContent } from '../utils/luxePageContent.js';
import { DEFAULT_LUXE_APPEARANCE, luxeFontUrl, resolveLuxeAppearance } from '../../shared/luxeAppearance.js';

// Use a disposable local database; never load dotenv or the production server.
process.env.JWT_SECRET = 'local-luxe-page-test';
process.env.ADMIN_EMAIL = 'admin@luxe.test';
process.env.ADMIN_PASSWORD = 'local-test';
let database, server, base;
const token = () => jwt.sign(process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD, process.env.JWT_SECRET);
before(async () => {
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri(), { dbName: 'luxe-page-test' });
  const app = express();
  app.use(express.json());
  app.use('/cms', cmsRouter);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/cms`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (database) await database.stop();
});
const save = content => fetch(base, { method: 'POST', headers: { token: token(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'luxePage', content }) });

test('unconfigured and legacy Luxe pages retain the current fonts and colours', async () => {
  const response = await (await fetch(base + '/luxePage')).json();
  assert.deepEqual(response.content.appearance, DEFAULT_LUXE_APPEARANCE);
  const legacy = structuredClone(DEFAULT_LUXE_PAGE_CONTENT);
  delete legacy.appearance;
  assert.deepEqual(validateLuxePageContent(legacy).appearance, DEFAULT_LUXE_APPEARANCE);
  assert.deepEqual(resolveLuxeAppearance(), DEFAULT_LUXE_APPEARANCE);
});

test('appearance saves and reloads alongside existing Luxe text and images', async () => {
  const content = structuredClone(DEFAULT_LUXE_PAGE_CONTENT);
  content.hero.title = 'Your Luxe Club';
  content.appearance = { ...DEFAULT_LUXE_APPEARANCE, headingFont: 'Georgia', bodyFont: 'Arial', backgroundColor: '#102030', headingColor: '#AABBCC', buttonBackgroundColor: '#334455' };
  const saved = await save(content);
  assert.equal(saved.status, 201);
  const data = await (await fetch(base + '/luxePage')).json();
  assert.deepEqual(data.content, { ...content, appearance: { ...content.appearance, headingColor: '#aabbcc' } });
  assert.equal(luxeFontUrl(content.appearance), null);
  assert.match(luxeFontUrl({ headingFont: 'Playfair Display', bodyFont: 'Inter' }), /family=Playfair\+Display/);
  assert.match(luxeFontUrl({ headingFont: 'Cinzel', bodyFont: 'Arial' }), /family=Cinzel:wght@400;700/);
});

test('invalid fonts and colours are rejected without replacing saved settings', async () => {
  const previous = (await cmsModel.findOne({ name: 'luxePage' }).lean()).content;
  for (const appearance of [null, [], { headingFont: 'url(https://example.test)' }, { bodyFont: 'Imaginary font' }, { textColor: 'red' }, { backgroundColor: '#fff; color:red' }, { buttonTextColor: '#gggggg' }]) {
    const response = await save({ ...DEFAULT_LUXE_PAGE_CONTENT, appearance });
    assert.equal(response.status, 400);
  }
  assert.deepEqual((await cmsModel.findOne({ name: 'luxePage' }).lean()).content, previous);
});
