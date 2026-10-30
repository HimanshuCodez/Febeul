/* eslint-disable react/prop-types -- This preview receives the validated home gift CMS settings. */
import { useState } from 'react';
import { ArrowRight, Check, Copy, Gift, LockKeyhole, Pause, Play, Sparkle, Sparkles, Ticket, X } from 'lucide-react';
import { getGiftDiscountLabel } from '../../../shared/homeGiftOffer.js';
import '../../../frontend/src/components/HomeGiftOffer.css';
import './HomeGiftOfferPreview.css';

const sparklePositions = [[13, 26, 12], [82, 17, 18], [76, 72, 11], [18, 76, 17], [52, 9, 9], [91, 49, 8]];
const confettiPieces = Array.from({ length: 14 }, (_, index) => ({
  '--confetti-x': `${Math.cos(index * 2.4) * (85 + index * 5)}px`,
  '--confetti-y': `${Math.sin(index * 2.4) * 90 - 45}px`,
  '--confetti-rotation': `${index * 67}deg`,
  animationDelay: `${index % 4 * 0.05}s`,
}));

function GiftPreviewArtwork({ compact = false }) {
  return <div className="gift-offer-art" aria-hidden="true">
    {!compact && <><div className="gift-offer-orbit gift-offer-orbit--outer" /><div className="gift-offer-orbit gift-offer-orbit--inner" /></>}
    <div className="gift-offer-present-shadow" />
    <div className="gift-offer-present">
      <div className="gift-offer-box"><span className="gift-offer-ribbon" /><span className="gift-offer-box-mark">F</span></div>
      <div className="gift-offer-lid">
        <span className="gift-offer-bow gift-offer-bow--left" /><span className="gift-offer-bow gift-offer-bow--right" />
        <span className="gift-offer-bow-knot" /><span className="gift-offer-lid-ribbon" />
      </div>
      {!compact && <span className="gift-offer-tag"><Sparkles size={12} strokeWidth={1.3} />For you</span>}
    </div>
    {sparklePositions.map(([left, top, size], index) => <Sparkle key={index} className="gift-offer-sparkle" size={size} style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${index * 0.55}s` }} />)}
  </div>;
}

export default function HomeGiftOfferPreview({ content }) {
  const [revealed, setRevealed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');
  const [message, setMessage] = useState('');
  const discountLabel = getGiftDiscountLabel(content.badgeOffer);
  const colors = {
    '--gift-bg': content.backgroundColor, '--gift-ink': content.textColor,
    '--gift-button': content.buttonColor, '--gift-button-ink': content.buttonTextColor,
    '--gift-paper': content.ticketColor,
  };
  const reset = () => { setRevealed(false); setCopiedCode(''); setMessage(''); };
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(content.couponCode);
      setCopiedCode(content.couponCode);
      setMessage('');
    } catch {
      setMessage('Select the code and copy it manually.');
    }
  };

  return <div className="home-gift-preview" data-theme="light">
    <div className="home-gift-preview-launcher-stage">
      <p className="home-gift-preview-label">Floating gift</p>
      <div style={colors} className="gift-offer-launcher" data-motion={paused ? 'paused' : 'playing'}>
        <button type="button" className="gift-offer-launcher-button" aria-label="Preview gift popup" onClick={reset}>
          <GiftPreviewArtwork compact />
          {discountLabel && <span className="gift-offer-discount">{discountLabel}</span>}
        </button>
      </div>
      <p className="home-gift-preview-hint">Appears at the bottom left of your store.</p>
    </div>

    <div className="home-gift-preview-controls" aria-label="Gift preview state">
      <button type="button" aria-pressed={!revealed} onClick={reset}>Unopened</button>
      <button type="button" aria-pressed={revealed} onClick={() => setRevealed(true)}>Revealed</button>
    </div>

    <div style={colors} className="gift-offer-dialog" data-motion={paused ? 'paused' : 'playing'}>
      <div className="gift-offer-content" data-revealed={revealed}>
        <div className="gift-offer-ambient" aria-hidden="true" />
        <button type="button" className="gift-offer-close" aria-label="Reset gift preview" onClick={reset}><X size={18} strokeWidth={1.5} /></button>
        <button type="button" className="gift-offer-playback" aria-label={paused ? 'Play preview animations' : 'Pause preview animations'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={13} /> : <Pause size={13} />}</button>
        <header className="gift-offer-header">
          <div className="gift-offer-eyebrow"><span /><Sparkle size={12} aria-hidden="true" />A gift from Febeul<span /></div>
          <h3 className="gift-offer-title">{revealed ? content.revealTitle : content.title}</h3>
          {content.description && <p className="gift-offer-description">{content.description}</p>}
        </header>

        <div className="gift-offer-stage" aria-live="polite">
          {revealed ? <div className="gift-offer-reveal" key="revealed">
            <div className="gift-offer-confetti" aria-hidden="true">{confettiPieces.map((style, index) => <i key={index} style={style} />)}</div>
            <div className="gift-offer-success" aria-hidden="true"><Check size={24} strokeWidth={1.5} /></div>
            <div className="gift-offer-ticket">
              <div className="gift-offer-ticket-heading"><Ticket size={15} aria-hidden="true" /><span>{content.ticketLabel}</span><Sparkles size={14} aria-hidden="true" /></div>
              <div className="gift-offer-ticket-body">
                <p className="gift-offer-code-label">Your coupon code</p><p className="gift-offer-code">{content.couponCode || 'YOURCODE'}</p>
                <button type="button" onClick={copyCode} disabled={!content.couponCode} className="gift-offer-copy" data-copied={Boolean(copiedCode && copiedCode === content.couponCode)}>
                  {copiedCode && copiedCode === content.couponCode ? <><Check size={14} />Copied!</> : <><Copy size={14} />Copy code</>}
                </button>
              </div>
              <div className="gift-offer-ticket-footer"><span /><span>Unwrapped. Just for you.</span><span /></div>
            </div>
          </div> : <div className="gift-offer-wrapped" key="wrapped">
            <GiftPreviewArtwork />
            <div className="gift-offer-seal"><Ticket size={14} aria-hidden="true" /><span>{content.ticketLabel}</span><span className="gift-offer-seal-line" /><LockKeyhole size={11} aria-hidden="true" /><span className="gift-offer-seal-hint">Unwrap to reveal</span></div>
          </div>}
        </div>

        <div className="gift-offer-actions">
          {message && <p role="status" className="gift-offer-message">{message}</p>}
          <button type="button" className="gift-offer-primary" onClick={() => revealed ? reset() : setRevealed(true)}>
            {!revealed && <Gift size={17} strokeWidth={1.5} aria-hidden="true" />}<span>{revealed ? 'Continue shopping' : content.buttonText}</span><ArrowRight size={17} aria-hidden="true" />
          </button>
          {!revealed && <p className="gift-offer-signin"><LockKeyhole size={10} aria-hidden="true" />Sign in to reveal and use your gift.</p>}
          {content.terms && <p className="gift-offer-terms">{content.terms}</p>}
        </div>
        <div className="gift-offer-footer" aria-hidden="true"><span />Little luxuries. Lovely surprises.<span /></div>
      </div>
    </div>
  </div>;
}
