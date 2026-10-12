import { after, before, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, unlink } from 'node:fs/promises';
import express from 'express';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import cmsRouter from '../routes/cmsRoute.js';

// Local HTTP server and a mocked uploader: no database or external service is used.
process.env.JWT_SECRET = 'local-gif-upload-test';
process.env.ADMIN_EMAIL = 'admin@gif.test';
process.env.ADMIN_PASSWORD = 'local-only';
const gif = Buffer.from('47494638396102000100800000ff00000000ff21ff0b4e45545343415045322e30030100000021f90400320000002c0000000002000100000202040a0021f90400320000002c00000000020001000002024c0a003b', 'hex');
let server, base, uploader;
const files = new Set();
const received = [];

before(async () => {
    uploader = mock.method(cloudinary.uploader, 'upload', async (path) => {
        files.add(path);
        received.push(await readFile(path));
        return { secure_url: 'https://example.test/animated-banner.gif' };
    });
    const app = express();
    app.use('/api/cms', cmsRouter);
    app.use((error, _req, res, _next) => res.status(400).json({ success: false, message: error.message }));
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}/api/cms/upload`;
});

after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    uploader?.mock.restore();
    for (const path of files) await unlink(path);
});

const upload = async (mimeType, auth = true) => {
    const body = new FormData();
    body.append('image', new Blob([gif], { type: mimeType }), `hero-gif-test-${process.pid}-${Date.now()}.gif`);
    const response = await fetch(base, {
        method: 'POST', body,
        headers: auth ? { token: jwt.sign(process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD, process.env.JWT_SECRET) } : {},
    });
    return { status: response.status, data: await response.json() };
};

test('authenticated CMS upload accepts animated GIFs and forwards every frame unchanged', async () => {
    const result = await upload('image/gif');
    assert.equal(result.status, 200);
    assert.equal(result.data.imageUrl, 'https://example.test/animated-banner.gif');
    assert.deepEqual(received, [gif]);
});

test('GIF uploads retain authentication and unsupported file types remain rejected', async () => {
    assert.equal((await upload('image/gif', false)).status, 401);
    assert.equal((await upload('text/html')).status, 400);
    assert.equal(received.length, 1);
});
