import express from 'express';
import { listGiftWraps, addGiftWrap, removeGiftWrap } from '../controllers/giftWrapController.js';
import upload from '../middleware/multer.js';
import adminAuth from '../middleware/adminAuth.js';

const giftWrapRouter = express.Router();

giftWrapRouter.get('/list', listGiftWraps);
giftWrapRouter.post('/add', adminAuth, upload.single('image'), addGiftWrap);
giftWrapRouter.post('/remove', adminAuth, removeGiftWrap);

export default giftWrapRouter;
