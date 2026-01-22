import express from 'express';
import { handleWebhook } from '../controllers/shiprocketWebhookController.js';

const router = express.Router();

router.post('/tracking-updates', handleWebhook);

export default router;
