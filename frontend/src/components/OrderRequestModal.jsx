import { createElement, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeftRight, ArrowUpRight, Camera, Check, CreditCard, LoaderCircle, PackageCheck, RotateCcw, ShieldCheck, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import BankAccountFields from './BankAccountFields';
import useBankAccountForm from '../hooks/useBankAccountForm';
import './OrderAftercare.css';

const options = [
  { value: 'return', label: 'Return', detail: 'Send the product back', Icon: RotateCcw },
  { value: 'refund', label: 'Refund', detail: 'Request your money back', Icon: CreditCard },
  { value: 'exchange', label: 'Exchange', detail: 'Replace a wrong or damaged item', Icon: ArrowLeftRight },
];
const RequiredMark = () => <><span className="aftercare-required" aria-hidden="true"> *</span><span className="sr-only"> (required)</span></>;
const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function OrderRequestModal({ order, token, initialType = 'return', initialItemIndex, eligibility, onClose, onSubmitted }) {
  const dialogRef = useRef(null);
  const errorRef = useRef(null);
  const uploadRef = useRef(null);
  const submittingRef = useRef(false);
  const previewsRef = useRef([]);
  const [type, setType] = useState(initialType);
  const [itemIndex, setItemIndex] = useState(initialItemIndex ?? eligibility.exchangeItems[0] ?? 0);
  const [reason, setReason] = useState('');
  const [exchangeReason, setExchangeReason] = useState('wrong_item');
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const savedAccount = useAuthStore(state => state.user?.bankAccount);
  const [bankAccountChoice, setBankAccountChoice] = useState('saved');
  const [payoutMethod, setPayoutMethod] = useState('bank');
  const [upiId, setUpiId] = useState('');
  const { form: bankForm, errors: bankErrors, handleChange: handleBankChange, validate: validateBankForm } = useBankAccountForm();
  const hasSavedAccount = Boolean(savedAccount?.accountNumber);
  const useSavedAccount = hasSavedAccount && bankAccountChoice === 'saved';
  const needsPayout = order.paymentMethod === 'COD' && type !== 'exchange';

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
      previewsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const close = () => { if (!submittingRef.current) onClose(); };
  const keepFocusInDialog = event => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled):not([tabindex="-1"]), select:not(:disabled), textarea:not(:disabled), a[href]'))
      .filter(element => element.getClientRects().length > 0);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const addPhotos = event => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (photos.length + files.length > 4) {
      setPhotoError('Add exactly 4 photos. Remove a photo before choosing another.');
      return;
    }
    if (files.some(file => !imageTypes.includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setPhotoError('Use JPG, PNG, WebP or GIF images, up to 5 MB each.');
      return;
    }
    const added = files.map(file => ({ file, url: URL.createObjectURL(file) }));
    previewsRef.current.push(...added.map(photo => photo.url));
    setPhotos(previous => [...previous, ...added]);
    setPhotoError('');
  };
  const removePhoto = index => {
    const removed = photos[index];
    URL.revokeObjectURL(removed.url);
    previewsRef.current = previewsRef.current.filter(url => url !== removed.url);
    setPhotos(previous => previous.filter((_, position) => position !== index));
    setPhotoError('');
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (submittingRef.current) return;
    setError('');
    if (!eligibility[type].allowed) return setError(eligibility[type].reason);
    if (type === 'exchange' && !eligibility.exchangeItems.includes(itemIndex)) return setError('Select an eligible item to exchange.');
    if (!reason.trim()) return setError('Tell us what went wrong so we can help.');
    if (photos.length !== 4) return setPhotoError('Please upload all 4 images for review.');
    if (needsPayout && payoutMethod === 'upi' && !/^[\w.-]+@[\w.-]+$/.test(upiId.trim())) return setError('Enter a valid UPI ID, such as yourname@upi.');
    if (needsPayout && payoutMethod === 'bank' && !useSavedAccount && !validateBankForm()) {
      setError('Please check the bank account details below.');
      return;
    }
    const account = useSavedAccount ? savedAccount : bankForm;
    if (needsPayout && payoutMethod === 'bank' && (!account.accountHolderName || !account.accountNumber || !account.ifsc)) return setError('Please provide complete bank account details.');
    const data = new FormData();
    data.append('orderId', order._id);
    if (type === 'exchange') {
      data.append('orderItemIndex', String(itemIndex));
      data.append('reason', exchangeReason);
      data.append('description', reason.trim());
    } else {
      data.append('requestType', type);
      data.append('reason', reason.trim());
      if (needsPayout) data.append('payoutDetails', JSON.stringify(payoutMethod === 'upi'
        ? { type: 'upi', upiId: upiId.trim() }
        : { type: 'bank', accountHolderName: account.accountHolderName, bankAccount: account.accountNumber, ifsc: account.ifsc, bankName: account.bankName }));
    }
    photos.forEach(photo => data.append('images', photo.file));
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/${type === 'exchange' ? 'exchange' : 'refund'}/request`, data, { headers: { token } });
      if (!response.data.success) {
        setError(response.data.message || 'We could not submit your request. Please try again.');
        return;
      }
      toast.success(`${type[0].toUpperCase() + type.slice(1)} request submitted.`);
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.message || 'We could not submit your request. Please try again.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const selectedItems = type === 'exchange' ? [order.items[itemIndex]] : eligibility.physicalItems.map(index => order.items[index]);
  return createPortal(
    <dialog ref={dialogRef} className="aftercare-dialog" aria-labelledby="order-request-title" aria-describedby="order-request-description" onKeyDown={keepFocusInDialog}
      onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="aftercare-panel">
        <header className="aftercare-modal-header">
          <div className="aftercare-header-icon"><PackageCheck size={25} /></div>
          <div className="min-w-0 flex-1">
            <p className="aftercare-eyebrow">ORDER SUPPORT · #{order.orderItemId || order._id.slice(-8)}</p>
            <h2 id="order-request-title">Let’s make it right</h2>
            <p id="order-request-description">Return, refund or exchange your purchase.</p>
          </div>
          <button type="button" className="aftercare-close" onClick={close} disabled={isSubmitting} aria-label="Close request"><X size={21} /></button>
        </header>
        <form onSubmit={handleSubmit} className="aftercare-form" aria-busy={isSubmitting}>
          <div className="aftercare-scroll">
            <fieldset disabled={isSubmitting} className="aftercare-fields">
              <fieldset>
                <legend className="aftercare-label">Request type<RequiredMark /></legend>
                <div className="aftercare-options">
                  {options.map(({ value, label, detail, Icon }) => (
                    <label key={value} className={`aftercare-option ${type === value ? 'is-selected' : ''} ${!eligibility[value].allowed ? 'is-unavailable' : ''}`}>
                      <input type="radio" name="requestType" value={value} checked={type === value} disabled={!eligibility[value].allowed}
                        onChange={() => { setType(value); setError(''); }} aria-describedby={`request-${value}-hint`} />
                      <span className="aftercare-option-top">{createElement(Icon, { size: 21 })}<span className="aftercare-radio-dot">{type === value && <Check size={10} strokeWidth={3} />}</span></span>
                      <span className="aftercare-option-title">{label}</span>
                      <span id={`request-${value}-hint`} className="aftercare-option-description">{eligibility[value].allowed ? detail : eligibility[value].reason}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <section className="aftercare-product-section" aria-label="Items in this request">
                {type === 'exchange' && eligibility.exchangeItems.length > 1 && (
                  <div className="mb-3">
                    <label htmlFor="exchange-item" className="aftercare-label">Item to exchange<RequiredMark /></label>
                    <select id="exchange-item" value={itemIndex} onChange={event => setItemIndex(Number(event.target.value))} className="aftercare-input">
                      {eligibility.exchangeItems.map(index => <option key={index} value={index}>{order.items[index].name} · {order.items[index].size}</option>)}
                    </select>
                  </div>
                )}
                {selectedItems.map((item, index) => item && (
                  <div className="aftercare-product" key={index}>
                    <img src={item.image} alt="" />
                    <div className="min-w-0"><p>{item.name}</p><span>{[item.size, item.color, `Qty: ${item.quantity}`].filter(Boolean).join(' · ')}</span></div>
                  </div>
                ))}
                <p className="aftercare-hint mt-2">{type === 'exchange' ? 'For a wrong or damaged item, within 2 days of delivery.' : `This ${type} request covers the order. Available within 3 days of delivery.`}</p>
              </section>

              {type === 'exchange' && <div>
                <label htmlFor="exchange-reason" className="aftercare-label">Reason for exchange<RequiredMark /></label>
                <select id="exchange-reason" className="aftercare-input" value={exchangeReason} onChange={event => setExchangeReason(event.target.value)}>
                  <option value="wrong_item">Wrong item delivered</option><option value="damaged">Damaged or defective product</option>
                </select>
              </div>}
              <div>
                <label htmlFor="request-reason" className="aftercare-label">{type === 'exchange' ? 'Tell us more' : 'Reason for your request'}<RequiredMark /></label>
                <textarea id="request-reason" className="aftercare-input" rows={3} required maxLength={2000} value={reason}
                  onChange={event => setReason(event.target.value)} placeholder="Describe the issue with your item so our team can help." />
              </div>

              <section aria-labelledby="request-photos-label">
                <div className="aftercare-section-heading">
                  <label id="request-photos-label" htmlFor="request-photos" className="aftercare-label">Upload 4 Images<RequiredMark /></label>
                  <span className={`aftercare-photo-count ${photos.length === 4 ? 'is-complete' : ''}`} aria-live="polite">{photos.length}/4 added</span>
                </div>
                <p id="request-photos-help" className="aftercare-hint">Show the full item, the issue, the label and the packaging.</p>
                <input id="request-photos" ref={uploadRef} type="file" accept={imageTypes.join(',')} multiple className="sr-only" tabIndex={-1}
                  aria-required="true" aria-invalid={Boolean(photoError)} aria-describedby="request-photos-help request-photos-format" onChange={addPhotos} />
                <div className="aftercare-photos">
                  {[0, 1, 2, 3].map(index => photos[index] ? (
                    <div className="aftercare-photo" key={photos[index].url}>
                      <img src={photos[index].url} alt={`Evidence photo ${index + 1}`} />
                      <span className="aftercare-photo-number">{index + 1}</span>
                      <button type="button" onClick={() => removePhoto(index)} aria-label={`Remove photo ${index + 1}`}><X size={15} /></button>
                    </div>
                  ) : <button type="button" className="aftercare-photo-add" key={index} onClick={() => uploadRef.current?.click()} aria-label={`Add photo ${index + 1}`}>
                    <Camera size={23} /><span>Photo {index + 1}</span><span className="aftercare-photo-plus">+</span>
                  </button>)}
                </div>
                <p id="request-photos-format" className="aftercare-hint">JPG, PNG, WebP or GIF · Up to 5 MB each</p>
                {photoError && <p role="alert" className="aftercare-error">{photoError}</p>}
              </section>

              {needsPayout ? (
                <section className="aftercare-payout" aria-label="Refund payout method">
                  <h3><CreditCard size={18} /> Refund payout method</h3>
                  <p className="aftercare-hint">For your cash-on-delivery order, choose where to receive an approved refund.</p>
                  <div className="aftercare-payout-choices">
                    {[['bank', 'Bank account'], ['upi', 'UPI']].map(([value, label]) => <label key={value}>
                      <input type="radio" name="payoutMethod" checked={payoutMethod === value} onChange={() => setPayoutMethod(value)} />{label}
                    </label>)}
                  </div>
                  {payoutMethod === 'upi' ? <div>
                    <label htmlFor="return-upi-id" className="aftercare-label">UPI ID<RequiredMark /></label>
                    <input id="return-upi-id" className="aftercare-input" placeholder="yourname@upi" value={upiId} onChange={event => setUpiId(event.target.value)} autoCapitalize="none" spellCheck={false} required />
                  </div> : <div className="space-y-3">
                    {hasSavedAccount && <>
                      <label className="aftercare-saved-bank">
                        <input type="radio" name="bankAccountChoice" checked={useSavedAccount} onChange={() => setBankAccountChoice('saved')} />
                        <span><strong>Saved bank account</strong><span>{savedAccount.accountHolderName}</span><span>{savedAccount.bankName} · Ending in {savedAccount.accountNumber.slice(-4)}</span></span>
                      </label>
                      <label className="aftercare-new-bank"><input type="radio" name="bankAccountChoice" checked={!useSavedAccount} onChange={() => setBankAccountChoice('new')} /> Use a different bank account</label>
                    </>}
                    {!useSavedAccount && <BankAccountFields form={bankForm} errors={bankErrors} onChange={handleBankChange} />}
                  </div>}
                </section>
              ) : type !== 'exchange' && <div className="aftercare-note"><ShieldCheck size={20} /><p>Approved refunds are sent to your original payment method. No bank details needed.</p></div>}

              <div className="aftercare-next"><span>WHAT HAPPENS NEXT</span><p>{type === 'exchange'
                ? 'Our team reviews your request, arranges pickup if approved, then checks the item before dispatching a replacement.'
                : type === 'return' ? 'Our team reviews your request. Once approved, pickup and refund updates will appear below Delivered in your order timeline.'
                  : 'Our team reviews your request. You can follow its progress and payment updates in your order timeline.'}</p></div>
            </fieldset>
          </div>
          <footer className="aftercare-modal-footer">
            {error && <p ref={errorRef} tabIndex={-1} className="aftercare-error outline-none" role="alert">{error}</p>}
            <div className="aftercare-footer-row">
              <button type="button" className="aftercare-cancel" onClick={close} disabled={isSubmitting}>Cancel</button>
              <button type="submit" className="aftercare-submit" disabled={isSubmitting || photos.length !== 4 || !reason.trim() || !eligibility[type].allowed}>
                {isSubmitting ? <><LoaderCircle size={18} className="animate-spin" />Submitting…</> : <>Submit {type} request<ArrowUpRight size={18} /></>}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </dialog>, document.body);
}
