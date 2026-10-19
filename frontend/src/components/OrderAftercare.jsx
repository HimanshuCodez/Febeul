import { createElement } from 'react';
import { ArrowLeftRight, ArrowUpRight, Check, CreditCard, RotateCcw, Clock3 } from 'lucide-react';
import { getRefundMilestones } from '../utils/orderAftercare';
import './OrderAftercare.css';

const actions = [
  { type: 'return', label: 'Return', detail: 'Arrange a return for your order', Icon: RotateCcw },
  { type: 'refund', label: 'Refund', detail: 'Ask our team for a refund', Icon: CreditCard },
  { type: 'exchange', label: 'Exchange', detail: 'Received a wrong or damaged item?', Icon: ArrowLeftRight },
];

export function OrderAftercareActions({ eligibility, onRequest }) {
  return <section className="aftercare-actions" aria-labelledby="aftercare-actions-title">
    <div className="aftercare-actions-header"><div><p className="aftercare-eyebrow">HERE TO HELP</p><h2 id="aftercare-actions-title">Need help with your purchase?</h2></div><span><Clock3 size={14} /> From the delivery date</span></div>
    <div className="aftercare-action-grid">
      {actions.map(({ type, label, detail, Icon }) => <button type="button" key={type} onClick={() => onRequest(type)} disabled={!eligibility[type].allowed} className="aftercare-action" aria-describedby={`aftercare-${type}-details`}>
        <span className="aftercare-action-icon">{createElement(Icon, { size: 20 })}</span>
        <span><strong>{label}</strong><span id={`aftercare-${type}-details`}>{eligibility[type].allowed ? detail : eligibility[type].reason}</span><small>{type === 'exchange' ? 'Within 2 days' : 'Within 3 days'}</small></span>
        <ArrowUpRight size={17} className="aftercare-action-arrow" />
      </button>)}
    </div>
  </section>;
}

const returnCopy = {
  requested: 'We received your request. Our team will review it before arranging pickup.',
  pickup_scheduled: 'Collection has been arranged with our courier partner. Keep your item and packaging ready.',
  picked_up: 'The courier has collected your item.',
  in_transit: 'Your return is on its way to our warehouse.',
  received: 'Your item has reached our warehouse.',
  qc_done: 'The inspection of your returned item is complete.',
  refund_initiated: 'Your refund is being processed.',
  refund_completed: 'Your refund has been processed. Your bank or payment provider may take time to show the credit.',
};
const exchangeCopy = {
  requested: 'We received your request. Our team will review the details and photos.',
  verified: 'Your exchange has been approved.',
  pickup_scheduled: 'Collection has been arranged for your original item.',
  picked_up: 'The courier has collected your original item.',
  received: 'Your original item has arrived for inspection.',
  dispatched: 'Your replacement is on its way.',
  out_for_delivery: 'Your replacement is out for delivery.',
  delivered: 'Your replacement has been delivered.',
};
const formatDate = date => date && Number.isFinite(new Date(date).getTime())
  ? new Date(date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : null;

function Journey({ title, item, milestones, copy, issue, children }) {
  return <section className="aftercare-journey" aria-label={title}>
    <ol className="aftercare-journey-list">
      {milestones.map((milestone, index) => <li key={milestone.key} className={`aftercare-milestone ${milestone.reached ? 'is-reached' : ''} ${milestone.current ? 'is-current' : ''}`} aria-current={milestone.current ? 'step' : undefined}>
        <span className="aftercare-milestone-dot" aria-hidden="true">{milestone.reached ? <Check size={16} strokeWidth={2.5} /> : <span />}</span>
        <div className="aftercare-milestone-content">
          <div className="aftercare-milestone-heading"><h3>{milestone.label}</h3>{milestone.current && <span>{issue ? 'Needs attention' : ['refund_completed', 'delivered'].includes(milestone.key) ? 'Completed' : 'Current step'}</span>}</div>
          {index === 0 && item && <p className="aftercare-journey-item">{item}</p>}
          <p>{milestone.reached ? copy[milestone.key] : 'Awaiting update'}</p>
          {milestone.reached && formatDate(milestone.at) && <time dateTime={new Date(milestone.at).toISOString()}>{formatDate(milestone.at)}</time>}
          {milestone.current && issue && <p className="aftercare-error">{issue}</p>}
        </div>
      </li>)}
    </ol>
    {children && <div className="aftercare-journey-details">{children}</div>}
  </section>;
}

export function OrderAftercareTimeline({ order }) {
  const refund = order.refundDetails || {};
  const isRequest = ['return', 'refund'].includes(refund.requestType) && refund.status && refund.status !== 'none';
  const returnStatus = order.returnStatus;
  const isReturn = refund.requestType === 'return';
  const isRejected = refund.status === 'rejected';
  const milestones = isRejected
    ? [{ key: 'requested', label: `${isReturn ? 'Return' : 'Refund'} request declined`, reached: true, current: true, at: refund.requestedAt }]
    : isReturn
      ? (returnStatus?.milestones || [{ key: 'requested', reached: true, current: true, at: refund.requestedAt }]).map(milestone => ({ ...milestone, label: milestone.key === 'requested' ? 'Return initiated' : milestone.label }))
      : getRefundMilestones(refund);
  // Only customer-safe courier scans are presented; raw provider/internal text
  // is not used as a substitute for a milestone from the server.
  const pickupScans = (refund.pickup?.trackingHistory || []).filter(scan => !/shiprocket/i.test(scan.activity || ''));
  return <div id="aftercare-timeline" className="aftercare-timelines" role="region" aria-label="After-sales tracking" tabIndex={-1}>
    {isRequest && <Journey title={isReturn ? 'Return tracking' : 'Refund tracking'} milestones={milestones}
      copy={{ ...returnCopy, ...(!isReturn ? { requested: 'We received your refund request. It is awaiting review.' } : {}), ...(isRejected ? { requested: 'Our team reviewed your request and could not approve it.' } : {}) }}
      issue={isRejected ? refund.rejectionReason || 'Contact support if you need help with this decision.' : refund.status === 'failed' ? 'Your refund needs attention. Please contact support with your order ID.' : null}>
      {!isRejected && <>
        {returnStatus?.refundByDate && <p className="aftercare-refund-due"><CreditCard size={16} /> Refund due by {new Date(returnStatus.refundByDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
        {(returnStatus?.awb || returnStatus?.courier) && <p className="aftercare-hint">{returnStatus.courier}{returnStatus.awb && ` · Return AWB: ${returnStatus.awb}`}</p>}
        {refund.id && <p className="aftercare-hint">Refund reference: {refund.id}</p>}
        {pickupScans.length > 0 && <details className="aftercare-scans"><summary>View courier updates</summary><ul>{[...pickupScans].sort((a, b) => new Date(b.date) - new Date(a.date)).map((scan, index) => <li key={index}>
          <p>{scan.activity || 'Courier tracking updated'}{scan.location && ` · ${scan.location}`}</p><time>{formatDate(scan.date)}</time>
        </li>)}</ul></details>}
        {isReturn && refund.status !== 'completed' && <p className="aftercare-hint">Pickup and transit updates appear here as the courier reports them. Keep your pickup receipt until your request is resolved.</p>}
      </>}
    </Journey>}
    {(order.exchanges || []).filter(exchange => exchange.exchangeStatus).map(exchange => {
      const status = exchange.exchangeStatus;
      const item = order.items[exchange.orderItemIndex];
      const steps = status.blocked ? [{ key: 'requested', label: status.label, reached: true, current: true, at: status.requestedAt }]
        : (status.milestones || []).map(milestone => ({ ...milestone, label: milestone.key === 'requested' ? 'Exchange initiated' : milestone.label }));
      return <Journey key={exchange._id || exchange.ticketId} title={`Exchange tracking ${status.ticketId}`} item={`${item?.name || 'Item exchange'} · ${status.ticketId}`} milestones={steps}
        copy={status.blocked ? { requested: status.message } : exchangeCopy} issue={status.blocked ? status.rejectionReason || status.message : null} />;
    })}
  </div>;
}
