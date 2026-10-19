import { buildAdminReturnView, buildCustomerReturnStatus } from './returnStatus.js';
import { buildAdminExchangeView, buildCustomerExchangeView, INTERNAL_STATUS_LABELS as EXCHANGE_LABELS } from './exchangeStatus.js';

const iso = value => value !== null && value !== undefined && Number.isFinite(new Date(value).getTime()) ? new Date(value).toISOString() : null;
const words = value => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase());
const REFUND_LABELS = { pending: 'Refund requested', initiated: 'Refund initiated', processing: 'Refund processing', completed: 'Refund completed', failed: 'Refund failed', rejected: 'Request declined' };
const toneFor = value => /fail|lost|critical|rejected|declined|investigation|claim|cancelled|expired/i.test(value) ? 'attention'
    : /completed|delivered|refunded/i.test(value) ? 'complete' : 'active';

export function deliveryStatusOf(order) {
    const status = String(order.orderStatus || '').trim();
    if (order.isCancelled || status === 'Cancelled' || order.refundDetails?.requestType === 'cancellation') return 'Cancelled';
    if (order.payment && (order.items || []).some(item => item.sku === 'LUXE-MEMBERSHIP' || item.name === 'Febeul Luxe Membership')) return 'Delivered';
    const sr = String(order.shiprocketStatus || '').trim().toUpperCase();
    if (order.deliveredAt || status === 'Delivered' || sr === 'DELIVERED') return 'Delivered';
    if (['RTO', 'RTO_INITIATED', 'RTO_DELIVERED'].includes(sr) || status === 'Returned') return 'Courier return';
    if (sr === 'CANCELLED') return 'Cancelled';
    if (['UNDELIVERED', 'LOST'].includes(sr) || status === 'Failed') return 'Failed';
    if (sr === 'OUT_FOR_DELIVERY' || status === 'Out for delivery') return 'Out for delivery';
    if (sr === 'IN_TRANSIT') return 'Shipped';
    if (['SHIPPED', 'PICKED UP', 'AWB_ASSIGNED', 'PICKUP SCHEDULED'].includes(sr)) return 'Shipped';
    return status || 'Order Placed';
}

// An admin read model, never persisted and never attached to customer APIs.
// Return/exchange stages are obtained from the same builders as their queues.
export function buildAdminOrderTracking(order, exchanges = [], returnSettings, exchangeSettings) {
    const refund = order.refundDetails || {}, rt = refund.returnTracking || {};
    const deliveryStatus = deliveryStatusOf(order);
    const events = [], journeys = [];
    const addEvent = (source, label, at, note, by, reference) => {
        if (!label) return;
        events.push({ source, label, at: iso(at), note: note || '', by: by || '', reference: reference || '' });
    };
    const addScans = (source, scans, reference) => (scans || []).forEach(scan =>
        addEvent(source, words(scan.status) || 'Tracking updated', scan.date, [scan.activity, scan.location].filter(Boolean).join(' · '), 'Courier', reference));
    addEvent('Order', 'Order placed', order.date);
    addScans('Delivery', order.shiprocket?.trackingHistory, order.shiprocket?.awb);
    const firstScan = statuses => (order.shiprocket?.trackingHistory || []).find(scan => statuses.includes(scan.status))?.date;
    const levels = { 'Order Placed': 0, Processing: 0, Confirmed: 0, Shipped: 1, 'Out for delivery': 2, Delivered: 3 };
    const level = levels[deliveryStatus] ?? (order.deliveredAt ? 3 : order.shippedAt ? 1 : 0);
    const shipmentSteps = [
        { key: 'confirmed', label: 'Order confirmed', at: iso(order.date) },
        { key: 'shipped', label: 'Shipped', at: iso(order.shippedAt || firstScan(['AWB_ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'PICKED UP'])) },
        { key: 'out_for_delivery', label: 'Out for delivery', at: iso(firstScan(['OUT_FOR_DELIVERY'])) },
        { key: 'delivered', label: 'Delivered', at: iso(order.deliveredAt || firstScan(['DELIVERED'])) },
    ];
    const stopped = ['Cancelled', 'Courier return', 'Failed'].includes(deliveryStatus);
    const isLuxe = (order.items || []).some(item => item.sku === 'LUXE-MEMBERSHIP');
    let milestones = shipmentSteps.map((step, index) => ({ ...step, reached: index <= level, current: !stopped && index === level }));
    if (isLuxe) milestones = milestones.filter(step => ['confirmed', 'delivered'].includes(step.key));
    if (stopped) milestones = [...milestones.filter(step => step.reached), { key: 'stopped', label: deliveryStatus, reached: true, current: true, at: iso(order.cancellation?.requestedAt || firstScan(['CANCELLED', 'RTO', 'RTO_INITIATED', 'RTO_DELIVERED', 'UNDELIVERED', 'LOST'])) }];
    journeys.push({ key: 'delivery', title: isLuxe ? 'Membership' : 'Delivery', label: deliveryStatus, tone: toneFor(deliveryStatus), milestones,
        references: { awb: order.shiprocket?.awb, courier: order.shiprocket?.courier, lastTrackedAt: iso(order.shiprocket?.lastTrackedAt) } });
    if (order.deliveredAt && !firstScan(['DELIVERED'])) addEvent('Delivery', 'Delivered', order.deliveredAt);
    if (deliveryStatus === 'Cancelled' && !(rt.history || []).some(event => event.status === 'ORDER_CANCELLED')) addEvent('Cancellation', 'Order cancelled', order.cancellation?.requestedAt || refund.requestedAt, order.cancellation?.reason || refund.reason, order.cancellation?.requestedByName || order.cancellation?.requestedBy);

    const refundExists = refund.status && refund.status !== 'none';
    const requestHistory = rt.history || [];
    requestHistory.forEach(event => addEvent(refund.requestType === 'cancellation' ? 'Cancellation / refund' : refund.requestType === 'return' ? 'Return / refund' : 'Refund', event.status === 'RETURN_REQUESTED' && refund.requestType === 'refund' ? 'Refund requested' : words(event.status), event.date, event.note, event.by));
    const recorded = status => requestHistory.some(event => event.status === status);
    if (refundExists && !recorded('RETURN_REQUESTED') && !recorded('CANCELLATION_REFUND_REQUESTED')) addEvent('Refund', refund.requestType === 'return' ? 'Return initiated' : 'Refund requested', refund.requestedAt, refund.reason);
    addScans('Return pickup', refund.pickup?.trackingHistory, refund.pickup?.awb);

    if (refund.requestType === 'return' && refundExists) {
        const view = buildAdminReturnView(order, returnSettings);
        const customer = buildCustomerReturnStatus(order, returnSettings);
        const label = refund.status === 'pending' ? 'Return awaiting approval' : refund.status === 'rejected' ? 'Return request declined' : view.label;
        const steps = customer?.milestones.map(step => ({ ...step, at: iso(step.at), label: step.key === 'requested' ? 'Return initiated' : step.label }))
            || [{ key: 'requested', label: 'Return initiated', reached: true, current: false, at: iso(refund.requestedAt) },
                { key: 'declined', label, reached: true, current: true, at: iso(requestHistory.find(event => event.status === 'REQUEST_REJECTED')?.date) }];
        journeys.push({ key: 'return', title: 'Return', label, customerLabel: customer?.label, tone: toneFor(refund.status === 'rejected' ? 'rejected' : view.status),
            milestones: steps, active: refund.status !== 'rejected' && view.status !== 'REFUND_COMPLETED', at: iso(refund.requestedAt),
            references: { awb: refund.pickup?.awb, courier: refund.pickup?.courier, lastTrackedAt: iso(refund.pickup?.lastTrackedAt), refundDueDate: iso(view.refundDueDate), refundOverdue: view.refundOverdue, qcResult: rt.qcResult, investigationTicket: rt.investigationTicket, claimStatus: rt.claimStatus !== 'none' ? rt.claimStatus : undefined },
            notice: refund.rejectionReason || refund.pickup?.failureReason || '',
        });
    }

    if (refundExists) {
        const complete = refund.status === 'completed', initiated = complete || ['initiated', 'processing'].includes(refund.status) || Boolean(rt.refundInitiatedAt);
        const label = REFUND_LABELS[refund.status] || words(refund.status);
        const issue = ['failed', 'rejected'].includes(refund.status);
        const steps = [
            { key: 'requested', label: 'Refund requested', reached: true, current: !initiated, at: iso(refund.requestedAt) },
            { key: 'refund_initiated', label: 'Refund initiated', reached: initiated, current: initiated && !complete, at: iso(rt.refundInitiatedAt) },
            { key: 'refund_completed', label: 'Refund completed', reached: complete, current: complete, at: complete ? iso(rt.refundPaidAt || refund.processedAt) : null },
        ];
        const refundMilestones = issue ? [
            ...steps.filter(step => step.reached).map(step => ({ ...step, current: false })),
            { key: refund.status, label, reached: true, current: true, at: iso([...requestHistory].reverse().find(event => event.status === (refund.status === 'rejected' ? 'REQUEST_REJECTED' : 'REFUND_FAILED'))?.date || (refund.status === 'failed' ? refund.lastAttemptAt : null)) },
        ] : steps;
        // Returns already include these milestones; the independent summary is
        // still needed when the refund is settled before the parcel arrives.
        journeys.push({ key: 'refund', title: refund.requestType === 'cancellation' ? 'Cancellation refund' : 'Refund', label, tone: issue ? 'attention' : complete ? 'complete' : 'active',
            milestones: refund.requestType === 'return' ? [] : refundMilestones, active: !complete && refund.status !== 'rejected', at: iso(refund.requestedAt),
            references: { amount: refund.amount, refundId: refund.id, utr: rt.refundUtr, gatewayStatus: refund.gatewayStatus, attempts: refund.attempts, nextRetryAt: iso(refund.nextRetryAt) },
            notice: refund.lastError || refund.rejectionReason || refund.adminRefundComment || '',
        });
        if (complete && !recorded('REFUND_COMPLETED')) addEvent('Refund', 'Refund completed', rt.refundPaidAt || refund.processedAt, refund.adminRefundComment, rt.refundDecidedBy, refund.id || rt.refundUtr);
    }

    for (const exchange of exchanges) {
        const view = buildAdminExchangeView(exchange), customer = buildCustomerExchangeView(exchange, exchangeSettings);
        const key = `exchange-${exchange._id || exchange.ticketId}`;
        const label = view.label;
        journeys.push({ key, title: `Exchange ${exchange.ticketId}`, label, customerLabel: customer.label, tone: customer.blocked ? 'attention' : toneFor(view.status), active: view.isOpen,
            at: iso(exchange.createdAt), item: exchange.originalItem?.name || order.items?.[exchange.orderItemIndex]?.name, ticketId: exchange.ticketId,
            milestones: customer.blocked ? [{ key: 'requested', label: 'Exchange initiated', reached: true, current: false, at: iso(exchange.createdAt) }, { key: 'blocked', label: customer.label, reached: true, current: true, at: iso(exchange.closedAt) }]
                : customer.milestones.map(step => ({ ...step, at: iso(step.at), label: step.key === 'requested' ? 'Exchange initiated' : step.label })),
            references: { awb: exchange.reversePickup?.awb, courier: exchange.reversePickup?.courier, replacementAwb: exchange.forwardShipment?.awb, replacementCourier: exchange.forwardShipment?.courier, qcResult: exchange.qc?.result },
            notice: exchange.rejectionReason || exchange.reversePickup?.failureReason || (customer.blocked ? customer.message : ''),
        });
        if (!(exchange.timeline || []).some(event => event.event === 'EXCHANGE_CREATED')) addEvent('Exchange', 'Exchange initiated', exchange.createdAt, exchange.description, 'Customer', exchange.ticketId);
        (exchange.timeline || []).forEach(event => addEvent('Exchange', event.event && event.event !== event.status ? words(event.event) : EXCHANGE_LABELS[event.status] || words(event.status), event.date, event.note, event.by, exchange.ticketId));
        addScans('Exchange pickup', exchange.reversePickup?.trackingHistory, exchange.ticketId);
        addScans('Replacement delivery', exchange.forwardShipment?.trackingHistory, exchange.ticketId);
    }
    const aftercare = journeys.filter(journey => journey.key !== 'delivery' && (journey.key !== 'refund' || refund.requestType !== 'return'));
    aftercare.sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)) || (new Date(b.at).getTime() || 0) - (new Date(a.at).getTime() || 0));
    const primary = deliveryStatus === 'Cancelled' ? journeys[0] : aftercare[0] || journeys[0];
    const seen = new Set();
    const history = events.filter(event => {
        const key = JSON.stringify([event.source, event.label, event.at, event.note, event.reference]);
        if (seen.has(key)) return false;
        seen.add(key); return true;
    }).sort((a, b) => (a.at ? new Date(a.at).getTime() : Infinity) - (b.at ? new Date(b.at).getTime() : Infinity));
    const label = primary.key.startsWith('exchange-') ? `Exchange · ${primary.label}`
        : primary.key === 'return' && !/^return/i.test(primary.label) ? `Return · ${primary.label}` : primary.label;
    return { label, tone: primary.tone, deliveryStatus, journeys, events: history };
}
