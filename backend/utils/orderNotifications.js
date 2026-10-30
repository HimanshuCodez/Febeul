import orderModel from '../models/orderModel.js';

// Claim each notification atomically so repeated webhooks, polling and admin
// updates cannot send the same event concurrently. Failed sends can be retried.
const sendOrderEventEmail = async (orderId, type, eligibility) => {
    const marker = `emailNotifications.${type}`;
    const claimedAt = new Date();
    let claimed;
    try {
        claimed = await orderModel.findOneAndUpdate({
            _id: orderId, ...eligibility, [marker]: null,
        }, { $set: { [marker]: claimedAt } }, { new: true }).populate('userId', 'name email');
        if (!claimed) return;
        let result = { success: false };
        if (claimed.userId?.email) {
            const { sendTemplateEmail } = await import('./sendTemplateEmail.js');
            result = await sendTemplateEmail(type, claimed.userId.email, {
                order: claimed,
                userName: claimed.userId.name || claimed.address?.name,
                orderId: claimed.orderItemId || String(claimed._id),
                courierName: claimed.shiprocket?.courier,
                trackingNumber: claimed.shiprocket?.awb,
                trackingUrl: claimed.shiprocket?.trackingUrl,
                cancellationReason: claimed.cancellation?.reason,
                amount: claimed.refundDetails?.amount,
                method: claimed.paymentMethod,
            });
        }
        if (!result.success) await orderModel.updateOne({ _id: orderId, [marker]: claimedAt }, { $unset: { [marker]: '' } });
    } catch (error) {
        console.error(`Unable to send ${type} notification`, { name: error.name });
        if (claimed) {
            await orderModel.updateOne({ _id: orderId, [marker]: claimedAt }, { $unset: { [marker]: '' } })
                .catch(() => {});
        }
    }
};

export const sendOrderStatusEmail = (orderId, status) => {
    const type = { Shipped: 'order-shipped', 'Out for delivery': 'order-shipped', Delivered: 'order-delivered', Cancelled: 'order-cancelled' }[status];
    if (!type) return;
    return sendOrderEventEmail(orderId, type, {
        orderStatus: type === 'order-shipped' ? { $in: ['Shipped', 'Out for delivery'] } : status,
        ...(status === 'Cancelled' ? {} : { isCancelled: { $ne: true }, 'items.name': { $ne: 'Febeul Luxe Membership' } }),
    });
};

export const sendRefundCompletedEmail = orderId => sendOrderEventEmail(orderId, 'refund-processed', {
    'refundDetails.status': 'completed', 'refundDetails.amount': { $gt: 0 },
});
