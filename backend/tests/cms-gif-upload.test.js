import { adminTokenFor } from './helpers/auth.js';
import { after, afterEach, before, beforeEach, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import cmsRouter from '../routes/cmsRoute.js';
import uploadMiddleware from '../middleware/multer.js';
import errorHandler from '../middleware/errorHandler.js';
import { CMS_GIF_MAX_BYTES, CMS_IMAGE_MAX_BYTES, CMS_VIDEO_MAX_BYTES } from '../../shared/cmsUploads.js';

// Local HTTP server and a mocked uploader: no database or external service.
Object.assign(process.env, { JWT_SECRET: 'local-gif-upload-test', ADMIN_EMAIL: 'admin@gif.test', ADMIN_PASSWORD: 'local-only', STAFF_EMAIL: 'staff@gif.test', STAFF_PASSWORD: 'staff-local', STAFF_PERMISSIONS: '/list' });
const gif = Buffer.from('47494638396102000100800000ff00000000ff21ff0b4e45545343415045322e30030100000021f90400320000002c0000000002000100000202040a0021f90400320000002c00000000020001000002024c0a003b', 'hex');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
const mp4 = Buffer.from('000000206674797069736f6d0000020069736f6d69736f32617663316d70343100000000', 'hex');
const pad = (bytes, length) => Buffer.concat([bytes, Buffer.alloc(length - bytes.length)]);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
let server, base, uploader, received = [], files = [], providerError;
const adminToken = () => adminTokenFor(process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD);

before(async () => {
    uploader = mock.method(cloudinary.uploader, 'upload', async (path, options) => {
        const bytes = await readFile(path);
        received.push({ size: bytes.length, hash: digest(bytes), options });
        if (providerError) throw providerError;
        return { secure_url: 'https://example.test/animated-banner.gif' };
    });
    const app = express();
    app.use((req, res, next) => { res.on('finish', () => { if (req.file?.path) files.push(req.file.path); }); next(); });
    app.use('/api/cms', cmsRouter);
    app.post('/standard-upload', uploadMiddleware.single('image'), (_req, res) => res.json({ success: true }));
    app.use(errorHandler);
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = 'http://127.0.0.1:' + server.address().port;
});
beforeEach(() => { received = []; files = []; providerError = undefined; });
afterEach(async () => {
    for (let attempt = 0; attempt < 20; attempt++) {
        const present = await Promise.all(files.map(path => access(path).then(() => true, () => false)));
        if (!present.some(Boolean)) return;
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.fail('CMS upload temporary files were not removed');
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); uploader?.mock.restore(); });

const upload = async (bytes = gif, type = 'image/gif', { token = adminToken(), path = '/api/cms/upload', field = 'image', duplicate = false } = {}) => {
    const body = new FormData();
    body.append(field, new Blob([bytes], { type }), 'banner.gif');
    if (duplicate) body.append(field, new Blob([bytes], { type }), 'second.gif');
    const response = await fetch(base + path, { method: 'POST', body, headers: { token } });
    return { status: response.status, data: await response.json() };
};

test('authenticated GIF upload preserves every byte and requests no flattening transformation', async () => {
    const result = await upload();
    assert.equal(result.status, 200);
    assert.equal(result.data.imageUrl, 'https://example.test/animated-banner.gif');
    assert.deepEqual(received, [{ size: gif.length, hash: digest(gif), options: { resource_type: 'auto', timeout: 120000 } }]);
});

for (const mb of [6, 25, 50]) test('CMS accepts a ' + mb + ' MB GIF above the former limits without altering its bytes', async () => {
    const bytes = pad(gif, mb * 1024 * 1024);
    const result = await upload(bytes);
    assert.equal(result.status, 200); assert.equal(result.data.success, true);
    assert.equal(received[0].hash, digest(bytes)); assert.equal(received[0].size, bytes.length);
});

test('oversize GIFs fail with a useful 413 message before reaching the provider', async () => {
    const result = await upload(pad(gif, CMS_GIF_MAX_BYTES + 1));
    assert.equal(result.status, 413); assert.match(result.data.message, /50 MB/);
    assert.equal(received.length, 0);
});

test('ordinary CMS images and videos keep their separate size limits', async () => {
    for (const [bytes, type, limit, label] of [[png, 'image/png', CMS_IMAGE_MAX_BYTES, '5 MB'], [mp4, 'video/mp4', CMS_VIDEO_MAX_BYTES, '20 MB']]) {
        const result = await upload(pad(bytes, limit + 1), type);
        assert.equal(result.status, 413); assert.ok(result.data.message.includes(label));
    }
    assert.equal(received.length, 0);
});

test('other upload routes retain the existing small image allowance for GIFs', async () => {
    const result = await upload(pad(gif, 6 * 1024 * 1024), 'image/gif', { path: '/standard-upload' });
    assert.equal(result.status, 400); assert.equal(received.length, 0);
});

test('CMS retains authentication, staff permissions, byte checks and one-file limits', async () => {
    assert.equal((await upload(gif, 'image/gif', { token: '' })).status, 401);
    assert.equal((await upload(gif, 'image/gif', { token: adminTokenFor(process.env.STAFF_EMAIL + process.env.STAFF_PASSWORD) })).status, 403);
    for (const [bytes, type, options] of [[gif, 'text/html', {}], [Buffer.from('<html>not an image</html>'), 'image/gif', {}], [png, 'image/gif', {}], [gif, 'image/gif', { duplicate: true }], [gif, 'image/gif', { field: 'unexpected' }]]) {
        assert.equal((await upload(bytes, type, options)).status, 400);
    }
    assert.equal(received.length, 0);
});

test('Cloudinary account size limits are explained separately from the website allowance', async () => {
    providerError = { http_code: 400, message: 'File size too large. Maximum is 10485760. private-provider-detail' };
    const result = await upload();
    assert.equal(result.status, 413); assert.equal(result.data.code, 'MEDIA_PROVIDER_SIZE_LIMIT');
    assert.match(result.data.message, /Cloudinary.*account/); assert.equal(result.data.message.includes('private-provider-detail'), false);
});

test('provider timeouts and unexpected failures return useful errors without leaking diagnostics', async () => {
    providerError = { http_code: 499, message: 'Request Timeout' };
    assert.equal((await upload()).status, 504);
    providerError = { http_code: 401, message: 'private-api-secret' };
    const result = await upload();
    assert.equal(result.status, 500); assert.equal(result.data.message, 'Error uploading media. Please try again.');
});
