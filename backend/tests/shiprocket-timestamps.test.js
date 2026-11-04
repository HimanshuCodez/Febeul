import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { parseShiprocketTimestamp } from '../utils/shiprocketStatusMap.js';
import { getAftercareEligibility } from '../../frontend/src/utils/orderAftercare.js';

test('unqualified courier timestamps use India time across server timezones', () => {
    const parserUrl = new URL('../utils/shiprocketStatusMap.js', import.meta.url).href;
    const formats = ['04 11 2026 14:15:59', '2026-11-04 14:15:59', '2026-11-04T14:15:59'];
    const script = `import { parseShiprocketTimestamp } from ${JSON.stringify(parserUrl)};
        console.log(JSON.stringify(${JSON.stringify(formats)}.map(value => parseShiprocketTimestamp(value).toISOString())));`;
    for (const timezone of ['UTC', 'Asia/Kolkata', 'America/Los_Angeles']) {
        const result = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
            env: { ...process.env, TZ: timezone }, encoding: 'utf8',
        });
        assert.deepEqual(JSON.parse(result), formats.map(() => '2026-11-04T08:45:59.000Z'), timezone);
    }
});

test('explicit offsets, fractional seconds, dates and numeric timestamps retain their meaning', () => {
    for (const value of ['2026-11-04T08:45:59.123Z', '2026-11-04T14:15:59.123+05:30',
        '2026-11-04T00:45:59.123-08:00', new Date('2026-11-04T08:45:59.123Z'),
        Date.parse('2026-11-04T08:45:59.123Z')]) {
        assert.equal(parseShiprocketTimestamp(value).toISOString(), '2026-11-04T08:45:59.123Z');
    }
    assert.equal(parseShiprocketTimestamp('2026-11-04 00:15:00.500').toISOString(), '2026-11-03T18:45:00.500Z');
});

test('missing and invalid timestamps fall back to the receipt time', () => {
    for (const value of [undefined, null, '', 'not a timestamp', '04 11 2026 99:99:99']) {
        const before = Date.now();
        const parsed = parseShiprocketTimestamp(value).getTime();
        assert.ok(parsed >= before && parsed <= Date.now());
    }
});

test('a just-delivered courier event immediately opens the existing request windows', () => {
    const order = {
        items: [{ name: 'Test garment' }], exchanges: [], refundDetails: { status: 'none' },
        deliveredAt: parseShiprocketTimestamp('04 11 2026 14:15:59'),
    };
    const eligibility = getAftercareEligibility(order, 'Delivered', Date.parse('2026-11-04T08:46:00Z'));
    assert.equal(eligibility.return.allowed, true);
    assert.equal(eligibility.refund.allowed, true);
    assert.equal(eligibility.exchange.allowed, true);
    const later = getAftercareEligibility(order, 'Delivered', Date.parse('2026-11-06T20:45:59Z'));
    assert.equal(later.return.allowed, true);
    assert.equal(later.exchange.allowed, false);
    assert.equal(getAftercareEligibility(order, 'Delivered', Date.parse('2026-11-07T08:46:00Z')).return.allowed, false);
});
