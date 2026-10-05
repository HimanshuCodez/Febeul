import express from 'express';
import { createHash, randomBytes } from 'node:crypto';
import authUser from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';
import { AnalyticsEvent, AnalyticsRevocation } from './models.js';
import { analyticsConfig, expiresAt } from './config.js';
import { validateBatch, reportRange } from './validation.js';
import { ingestEvents } from './service.js';
import { summaryReport, journeyReport } from './reports.js';
import { UUID } from '../../shared/analyticsPrivacy.js';

export function createRateLimiter({ limit = 120, maxBuckets = 5000, now = Date.now } = {}) {
  const buckets = new Map();
  const salt = randomBytes(16).toString('hex');
  let globalCount = 0, windowEnd = 0;
  return (req, res, next) => {
    const time = now();
    if (time >= windowEnd) { buckets.clear(); globalCount = 0; windowEnd = time + 60000; }
    const key = createHash('sha256').update(salt + req.ip).digest('hex');
    const count = buckets.get(key) || 0;
    if (globalCount >= 5000 || count >= limit || (!count && buckets.size >= maxBuckets)) return res.status(429).json({ success: false, message: 'Analytics request limit reached' });
    buckets.set(key, count + 1); globalCount += 1;
    next();
  };
}

export function createAnalyticsRouter(deps = {}) {
  const router = express.Router();
  const ingest = deps.ingest || ingestEvents;
  const summary = deps.summary || summaryReport;
  const journeys = deps.journeys || journeyReport;
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/config', (req, res) => res.json({ success: true, ...analyticsConfig(), advertising: false }));
  router.use(createRateLimiter());
  router.use(express.json({ limit: '32kb', strict: true }));
  router.post('/events', (req, res, next) => analyticsConfig().enabled ? next() : res.status(204).end(), (req, res, next) => req.headers.token ? authUser(req, res, next) : next(), async (req, res) => {
    let events;
    try { events = validateBatch(req.body, req.userId); } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
    try { await ingest(events); res.status(202).json({ success: true }); }
    catch { res.status(503).json({ success: false, message: 'Analytics temporarily unavailable' }); }
  });
  router.post('/withdraw', async (req, res) => {
    if (typeof req.body?.visitorId !== 'string' || !UUID.test(req.body.visitorId)) return res.status(400).json({ success: false });
    try {
      const visitorId = req.body.visitorId;
      await AnalyticsRevocation.updateOne({ visitorId }, { $set: { expiresAt: expiresAt() } }, { upsert: true });
      await AnalyticsEvent.deleteMany({ visitorId });
      res.status(204).end();
    } catch { res.status(503).json({ success: false }); }
  });
  // Reuse existing auth; ENV staff without explicit permissions must not bypass it.
  router.use('/reports', adminAuth, (req, res, next) => req.role === 'admin' || (req.role === 'staff' && req.permissions?.includes('/user-tracking')) ? next() : res.status(403).json({ success: false, message: 'User Tracking permission required' }));
  router.get('/reports/:report', async (req, res) => {
    if (!['summary', 'journeys'].includes(req.params.report)) return res.status(404).json({ success: false });
    let range, page;
    try {
      range = reportRange(req.query);
      page = Number(req.query.page || 1);
      if (!Number.isInteger(page) || page < 1 || page > 10000) throw new Error('Invalid page');
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
    try {
      const data = req.params.report === 'summary' ? await summary(range) : await journeys(range, page);
      res.json({ success: true, ...data });
    } catch { res.status(503).json({ success: false, message: 'Analytics reports temporarily unavailable. Please retry.' }); }
  });
  router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res.status(error.type === 'entity.too.large' ? 413 : 400).json({ success: false, message: 'Invalid analytics payload' });
  });
  return router;
}
export default createAnalyticsRouter();
