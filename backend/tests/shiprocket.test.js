import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import nock from 'nock';
import { buildShiprocketOrderPayload, createShiprocketOrder, createAndAssignShipment } from '../utils/shiprocket.js';

// No dotenv, database connection, or real Shiprocket requests in this suite.
const shiprocketUrl = 'https://apiv2.shiprocket.in';
const orderFixture = (overrides = {}) => ({
    _id: '507f1f77bcf86cd799439011',
    invoiceNumber: 42,
    date: Date.parse('2026-10-07T20:15:30.000Z'),
    userId: { email: 'buyer@example.test' },
    address: {
        name: 'Test Buyer', address: 'Test address', locality: 'Test locality',
        landmark: 'Test landmark', city: 'Delhi', zip: '110042', state: 'Delhi', phone: '9999999999'
    },
    items: [{ name: 'Test product', sku: 'TEST-M', hsn: '62121000', quantity: 4, price: 105, discountAmount: 20 }],
    orderTotal: 445,
    shippingCharge: 0,
    codCharge: 50,
    couponDiscount: 25,
    ...overrides
});

before(() => nock.disableNetConnect());
afterEach(() => {
    const pending = nock.pendingMocks();
    nock.cleanAll();
    assert.deepEqual(pending, [], 'all mocked Shiprocket calls should be consumed');
});
after(() => nock.enableNetConnect());

const captureOrder = async (order, method = 'COD') => {
    let request;
    const response = { order_id: 123, shipment_id: 456, status: 'NEW' };
    nock(shiprocketUrl, { reqheaders: { authorization: 'Bearer local-test-token' } })
        .post('/v1/external/orders/create/adhoc')
        .reply(200, (_uri, body) => { request = body; return response; });
    assert.deepEqual(await createShiprocketOrder(buildShiprocketOrderPayload(order), 'local-test-token', method), response);
    return request;
};

for (const method of ['COD', 'Prepaid']) {
    test(`${method} sends product label fields without changing checkout values`, async () => {
        const order = orderFixture();
        const before = structuredClone(order);
        const request = await captureOrder(order, method);
        assert.equal(request.order_id, order._id);
        assert.equal(request.payment_method, method);
        assert.equal(request.sub_total, 445);
        assert.deepEqual(request.order_items, [{
            name: 'Test product', sku: 'Test product', units: 4,
            selling_price: 105, discount: 6.25, tax: 5, hsn: '62121000'
        }]);
        assert.equal(request.billing_customer_name, 'Test');
        assert.equal(request.billing_last_name, 'Buyer');
        assert.equal(request.billing_email, order.userId.email);
        assert.equal(request.billing_address_2, 'Test locality, Test landmark');
        assert.equal(request.shipping_is_billing, true);
        assert.equal(request.pickup_location, 'warehouse');
        assert.deepEqual([request.length, request.breadth, request.height, request.weight], [10, 10, 5, 0.5]);
        assert.deepEqual(order, before, 'shipment serialization must not mutate the saved order');
    });
}

test('four low-priced units retain their product details and unit price', async () => {
    const request = await captureOrder(orderFixture({
        items: [{ name: 'Test product', quantity: 4, price: 5 }],
        orderTotal: 20, codCharge: 0, couponDiscount: 0
    }));
    assert.deepEqual(request.order_items, [{
        name: 'Test product', sku: 'Test product', units: 4,
        selling_price: 5, discount: 0, tax: 5, hsn: ''
    }]);
    assert.equal(request.sub_total, 20);
});

test('multiple products retain separate names, prices, quantities and HSN codes', async () => {
    const request = await captureOrder(orderFixture({
        items: [
            { name: 'Test product A', quantity: 2, price: 105, hsn: '62121000' },
            { name: 'Test product B', quantity: 1, price: 210, hsn: '61091000' }
        ],
        orderTotal: 470, couponDiscount: 0
    }));
    assert.deepEqual(request.order_items, [
        { name: 'Test product A', sku: 'Test product A', units: 2, selling_price: 105, discount: 0, tax: 5, hsn: '62121000' },
        { name: 'Test product B', sku: 'Test product B', units: 1, selling_price: 210, discount: 0, tax: 5, hsn: '61091000' }
    ]);
    assert.equal(request.sub_total, 470);
});

test('HSN is never invented when it is missing from the product snapshot', async () => {
    const order = orderFixture();
    order.items[0].hsn = '';
    const request = await captureOrder(order);
    assert.equal(request.order_items[0].hsn, '');
    assert.equal(request.order_items[0].tax, 5);
});

test('Shiprocket failure still returns null to the existing checkout flow', async (t) => {
    t.mock.method(console, 'error', () => {});
    t.mock.method(console, 'log', () => {});
    nock(shiprocketUrl).post('/v1/external/auth/login').reply(503, { message: 'Test unavailable' });
    assert.equal(await createAndAssignShipment(orderFixture(), 'COD'), null);
});
