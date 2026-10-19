import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import nock from 'nock';
import { MongoMemoryServer } from 'mongodb-memory-server';
import userModel from '../models/userModel.js';
import { envAccounts, envToken, userToken } from '../utils/authTokens.js';

// Exercise the real routes against a disposable database, never the production server.
Object.assign(process.env, {
    JWT_SECRET: 'admin-luxe-test-secret-only-with-32-bytes',
    ADMIN_EMAIL: 'admin@luxe.test', ADMIN_PASSWORD: 'local-only',
    RESEND_API_KEY: 're_local', NODE_ENV: 'test',
});
const { default: adminRouter } = await import('../routes/adminRoute.js');
const { default: userRouter } = await import('../routes/userRoute.js');
let database, server, base, customer, admin, staff;
const request = async (path, body, token = userToken(admin, 'admin')) => {
    const response = await fetch(base + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { token } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, data: await response.json() };
};
const grant = (body = { userId: String(customer._id) }, token) => request('/api/admin/grant-luxe', body, token);

before(async () => {
    nock.disableNetConnect();
    nock.enableNetConnect(/127\.0\.0\.1/);
    database = await MongoMemoryServer.create();
    await mongoose.connect(database.getUri(), { dbName: 'admin-luxe-tests' });
    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);
    app.use('/api/user', userRouter);
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
    await userModel.deleteMany({});
    [customer, admin, staff] = await userModel.create([
        {
            email: 'customer@luxe.test', name: 'Customer', password: 'private-hash',
            bankAccount: { accountNumber: 'private-account' },
            cartData: [{ product: new mongoose.Types.ObjectId(), size: 'M', quantity: 1 }],
        },
        { email: 'db-admin@luxe.test', role: 'admin' },
        { email: 'staff@luxe.test', role: 'staff', permissions: ['/allusers'] },
    ]);
});

after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
    await database?.stop();
    nock.cleanAll();
    nock.enableNetConnect();
});

test('grants one calendar month with 15 wraps and exposes the saved membership in the directory and profile', async t => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-01-31T10:30:00Z') });
    const result = await grant({
        userId: String(customer._id), months: 12, giftWrapsLeft: 999,
        luxeMembershipExpires: '2099-01-01', role: 'admin',
    });
    assert.equal(result.status, 200);
    assert.equal(result.data.success, true);
    assert.deepEqual(result.data.user, {
        _id: String(customer._id), isLuxeMember: true,
        luxeMembershipExpires: '2026-02-28T10:30:00.000Z', giftWrapsLeft: 15,
    });
    const saved = await userModel.findById(customer._id);
    assert.equal(saved.luxeMembershipExpires.toISOString(), result.data.user.luxeMembershipExpires);
    assert.equal(saved.role, 'user');
    assert.equal(saved.password, 'private-hash');
    assert.equal(saved.cartData.length, 1);
    assert.equal(saved.tokenVersion, 0);
    const directory = await request('/api/user/allusers');
    assert.equal(directory.data.users.find(user => user._id === String(customer._id)).isLuxeMember, true);
    const profile = await request('/api/user/profile', undefined, userToken(customer));
    assert.equal(profile.data.user.isLuxeMember, true);
    assert.equal(profile.data.user.giftWrapsLeft, 15);
    assert.equal(profile.data.user.luxeMembershipExpires, result.data.user.luxeMembershipExpires);
});

test('extends active membership without losing paid time and handles leap years and year boundaries', async t => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2027-10-19T08:00:00Z') });
    for (const [currentExpiry, expectedExpiry] of [
        ['2028-01-31T12:00:00Z', '2028-02-29T12:00:00.000Z'],
        ['2027-12-19T12:00:00Z', '2028-01-19T12:00:00.000Z'],
    ]) {
        await userModel.updateOne({ _id: customer._id }, {
            isLuxeMember: true, luxeMembershipExpires: new Date(currentExpiry), giftWrapsLeft: 2,
        });
        const result = await grant();
        assert.equal(result.status, 200);
        assert.equal(result.data.user.luxeMembershipExpires, expectedExpiry);
        assert.equal(result.data.user.giftWrapsLeft, 15);
    }
});

test('expired, inactive, and undated memberships start their month at the time of the grant', async t => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-19T08:00:00Z') });
    for (const previous of [
        { isLuxeMember: true, luxeMembershipExpires: new Date('2026-10-18') },
        { isLuxeMember: false, luxeMembershipExpires: new Date('2030-01-01') },
        { isLuxeMember: true, luxeMembershipExpires: null },
    ]) {
        await userModel.updateOne({ _id: customer._id }, previous);
        const result = await grant();
        assert.equal(result.status, 200);
        assert.equal(result.data.user.luxeMembershipExpires, '2026-11-19T08:00:00.000Z');
    }
});

test('requires admin authentication and the All Users permission for staff', async () => {
    for (const token of ['', userToken(customer), userToken(customer, 'admin'), userToken(admin)]) {
        assert.equal((await grant(undefined, token)).status, 401);
    }
    await userModel.updateOne({ _id: staff._id }, { permissions: ['/orders'] });
    assert.equal((await grant(undefined, userToken(staff, 'admin'))).status, 403);
    assert.equal((await userModel.findById(customer._id)).isLuxeMember, false);

    await userModel.updateOne({ _id: staff._id }, { permissions: ['/allusers'], isBlocked: true });
    assert.equal((await grant(undefined, userToken(staff, 'admin'))).status, 401);
    await userModel.updateOne({ _id: staff._id }, { isBlocked: false });
    assert.equal((await grant(undefined, userToken(staff, 'admin'))).status, 200);
});

test('environment administrators can grant membership to any account without changing access or permissions', async () => {
    const token = envToken(envAccounts().find(account => account.role === 'admin'));
    for (const target of [customer, staff, admin]) {
        await userModel.updateOne({ _id: target._id }, { isBlocked: true });
        assert.equal((await grant({ userId: String(target._id) }, token)).status, 200);
        const saved = await userModel.findById(target._id);
        assert.equal(saved.isLuxeMember, true);
        assert.equal(saved.isBlocked, true);
        assert.equal(saved.role, target.role);
        assert.deepEqual([...saved.permissions], [...target.permissions]);
    }
});

test('rejects invalid IDs and missing accounts without changing another membership', async () => {
    for (const body of [{}, { userId: null }, { userId: 'invalid' }, { userId: { $ne: null } }, { userId: [String(customer._id)] }]) {
        const result = await grant(body);
        assert.equal(result.status, 400);
        assert.equal(result.data.success, false);
    }
    const missing = await grant({ userId: String(new mongoose.Types.ObjectId()) });
    assert.equal(missing.status, 404);
    assert.equal(missing.data.success, false);
    assert.equal((await userModel.findById(customer._id)).isLuxeMember, false);
});
