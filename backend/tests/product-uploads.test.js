import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { v2 as cloudinary } from 'cloudinary';
import nock from 'nock';
import productRouter from '../routes/productRoute.js';
import upload from '../middleware/multer.js';
import errorHandler from '../middleware/errorHandler.js';
import productModel from '../models/productModel.js';
import userModel from '../models/userModel.js';
import { signToken, userToken } from '../utils/authTokens.js';
import { PRODUCT_IMAGE_MAX_BYTES, PRODUCT_UPLOAD_MAX_FILES } from '../../shared/productUploads.js';

// Real multipart parsing and MongoDB; no deployment keys or Cloudinary calls.
process.env.JWT_SECRET = 'product-upload-tests-only-32-characters';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
const variationsFor = count => Array.from({ length: count }, (_, i) => ({ color: `Color ${i}`, sku: `SKU-${i}`, sizes: [{ size: 'M', price: 399, mrp: 499, stock: 10 }], images: [] }));
const bodyFor = (counts, { variations = variationsFor(counts.length), productId } = {}) => {
    const body = new FormData();
    for (const [name, value] of Object.entries({ name: 'Multi-color product', description: '<p>Test listing</p>', category: 'BABYDOLL', isActive: 'true', variations: JSON.stringify(variations), ...(productId ? { productId } : {}) })) body.append(name, value);
    counts.forEach((count, v) => { for (let i = 0; i < count; i++) body.append(`variations[${v}][images]`, new Blob([png, `marker:${v}-${i}`], { type: 'image/png' }), `${v}-${i}.png`); });
    return body;
};
let database, server, base, admin, customer, staff, calls = [], temporaryPaths = [], failCloud = false;
const originalUpload = cloudinary.uploader.upload;
const originalDestroy = cloudinary.uploader.destroy;
const adminToken = account => signToken({ id: String(account._id), version: 0 }, 'admin', '1h');
async function send(path, body, token = adminToken(admin)) {
    const response = await fetch(base + path, { method: 'POST', headers: { token }, body });
    return { status: response.status, data: await response.json() };
}

before(async () => {
    nock.disableNetConnect(); nock.enableNetConnect(/127\.0\.0\.1/);
    database = await MongoMemoryServer.create(); await mongoose.connect(database.getUri());
    [admin, customer, staff] = await userModel.create([{ name: 'Editor', email: 'editor@uploads.test', role: 'admin' }, { email: 'customer@uploads.test' }, { email: 'staff@uploads.test', role: 'staff', permissions: ['/orders'] }]);
    cloudinary.uploader.upload = async path => {
        calls.push(path);
        if (failCloud) throw new Error('Simulated upload failure');
        const marker = (await readFile(path)).toString('utf8').split('marker:').at(-1);
        return { secure_url: `https://res.cloudinary.com/local/image/upload/${marker}.png` };
    };
    cloudinary.uploader.destroy = async () => { throw new Error('Existing gallery should not be removed in these tests'); };
    const app = express();
    app.use((req, res, next) => { res.on('finish', () => temporaryPaths.push(...(req.files || []).map(file => file.path).filter(Boolean))); next(); });
    app.use('/api/product', productRouter);
    app.post('/default-upload', upload.any(), (_req, res) => res.json({ success: true }));
    app.use(errorHandler);
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => { await productModel.deleteMany({}); calls = []; temporaryPaths = []; failCloud = false; });
afterEach(async () => {
    // Response cleanup is asynchronous; verify all accepted temporary files disappear.
    for (let attempt = 0; attempt < 20; attempt++) {
        const remaining = await Promise.all(temporaryPaths.map(path => access(path).then(() => true, () => false)));
        if (!remaining.some(Boolean)) return;
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.fail('Uploaded temporary files were not cleaned up');
});
after(async () => {
    await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); await database.stop();
    cloudinary.uploader.upload = originalUpload; cloudinary.uploader.destroy = originalDestroy; nock.enableNetConnect();
});

for (const counts of [[5, 5, 5, 5], [6, 5, 5, 5, 5]]) test(`adds ${counts.length} variations with ${counts.reduce((sum, count) => sum + count, 0)} images and preserves each gallery`, async () => {
    const result = await send('/api/product/add', bodyFor(counts));
    assert.equal(result.status, 200); assert.equal(result.data.success, true);
    const saved = await productModel.findOne(); assert.equal(saved.variations.length, counts.length);
    counts.forEach((count, v) => assert.deepEqual([...saved.variations[v].images], Array.from({ length: count }, (_, i) => `https://res.cloudinary.com/local/image/upload/${v}-${i}.png`)));
    assert.equal(calls.length, counts.reduce((sum, count) => sum + count, 0));
    assert.equal(saved.creator.name, 'Editor');
});

test('update accepts 26 new images while retaining existing variation images', async () => {
    const variations = variationsFor(5); variations[0].images = ['https://res.cloudinary.com/local/image/upload/existing.png'];
    const product = await productModel.create({ name: 'Existing', description: 'Existing', category: 'BABYDOLL', date: Date.now(), variations });
    const result = await send('/api/product/update', bodyFor([6, 5, 5, 5, 5], { variations, productId: String(product._id) }));
    assert.equal(result.data.success, true);
    const saved = await productModel.findById(product._id);
    assert.equal(saved.variations[0].images[0], variations[0].images[0]);
    assert.deepEqual(saved.variations.map(v => v.images.length), [7, 5, 5, 5, 5]);
    assert.equal(calls.length, 26);
});

test('product uploads accept the 60-file boundary but reject 61 before contacting Cloudinary', async () => {
    assert.equal((await send('/api/product/add', bodyFor([PRODUCT_UPLOAD_MAX_FILES]))).data.success, true);
    calls = [];
    const result = await send('/api/product/add', bodyFor([PRODUCT_UPLOAD_MAX_FILES + 1]));
    assert.equal(result.status, 400); assert.match(result.data.message, /60 new images/);
    assert.equal(calls.length, 0); assert.equal(await productModel.countDocuments(), 1);
});

test('other upload endpoints keep the original 12-file limit', async () => {
    const result = await send('/default-upload', bodyFor([13]));
    assert.equal(result.status, 400); assert.equal(calls.length, 0);
});

test('invalid formats, disguised HTML and unexpected file fields are rejected', async () => {
    for (const [field, type, bytes] of [['variations[0][images]', 'image/png', '<html>not an image</html>'], ['variations[0][images]', 'video/mp4', png], ['wrongField', 'image/png', png]]) {
        const body = bodyFor([0]); body.append(field, new Blob([bytes], { type }), 'test.png');
        const result = await send('/api/product/add', body);
        assert.equal(result.status, 400); assert.notEqual(result.data.message, 'Unable to complete request.');
    }
    assert.equal(calls.length, 0); assert.equal(await productModel.countDocuments(), 0);
});

test('oversize images return a clear 413 error before any cloud upload', async () => {
    const body = bodyFor([0]); body.append('variations[0][images]', new Blob([png, Buffer.alloc(PRODUCT_IMAGE_MAX_BYTES)], { type: 'image/png' }), 'too-large.png');
    const result = await send('/api/product/add', body);
    assert.equal(result.status, 413); assert.match(result.data.message, /5 MB/); assert.equal(calls.length, 0);
});

test('add and update still require admin or the appropriate staff permission', async () => {
    for (const path of ['/api/product/add', '/api/product/update']) {
        for (const [token, status] of [['', 401], [userToken(customer), 401], [adminToken(staff), 403]]) assert.equal((await send(path, bodyFor([13]), token)).status, status);
    }
    assert.equal(calls.length, 0); assert.equal(temporaryPaths.length, 0);
});

test('temporary files are removed when the cloud provider rejects the product upload', async () => {
    failCloud = true;
    const result = await send('/api/product/add', bodyFor([2]));
    assert.equal(result.data.success, false); assert.equal(await productModel.countDocuments(), 0);
    assert.equal(temporaryPaths.length, 2);
});
