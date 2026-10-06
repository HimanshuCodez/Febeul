import express from 'express';
import adminAuth from '../middleware/adminAuth.js';
import { searchAdminRecords } from '../services/adminSearchService.js';

export function createAdminSearchRouter({ search = searchAdminRecords, requestsPerMinute = 90 } = {}) {
  const router = express.Router();
  const buckets = new Map();
  let windowStart = Date.now();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/', adminAuth, async (req, res) => {
    const raw = req.query.q;
    if (typeof raw !== 'string' || raw.length > 80 || /[\u0000-\u001f\u007f]/.test(raw)) {
      return res.status(400).json({ success: false, message: 'Enter a search of 2 to 80 characters.' });
    }
    const query = raw.trim();
    if (query.length < 2) return res.json({ success: true, groups: [], unavailable: [] });
    if (Date.now() - windowStart >= 60000) { buckets.clear(); windowStart = Date.now(); }
    const key = req.userEmail;
    const count = buckets.get(key) || 0;
    if (count >= requestsPerMinute || (!buckets.has(key) && buckets.size >= 5000)) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((windowStart + 60000 - Date.now()) / 1000))));
      return res.status(429).json({ success: false, message: 'Please wait a moment before searching again.' });
    }
    buckets.set(key, count + 1);
    try {
      const result = await search(query, { role: req.role, permissions: req.permissions || [] });
      res.json({ success: true, ...result });
    } catch {
      res.status(503).json({ success: false, message: 'Record search is temporarily unavailable.' });
    }
  });
  return router;
}

export default createAdminSearchRouter();
