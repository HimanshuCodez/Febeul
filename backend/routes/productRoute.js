import express from 'express'
import { listProducts, addProduct, removeProduct, singleProduct, updateProduct, getSimilarProducts } from '../controllers/productController.js'
import upload from '../middleware/multer.js';
import adminAuth from '../middleware/adminAuth.js';
import authUser from '../middleware/auth.js';

const productRouter = express.Router();

productRouter.post('/add',adminAuth,upload.any(),addProduct);
productRouter.post('/remove',adminAuth,removeProduct);
productRouter.post('/single',singleProduct);
productRouter.post('/update', adminAuth, upload.any(), updateProduct);
productRouter.get('/list',listProducts)
productRouter.get('/similar/:productId', getSimilarProducts);

export default productRouter