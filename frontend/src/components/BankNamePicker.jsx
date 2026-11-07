import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Check, ChevronDown, Landmark, Search, SearchX, X } from 'lucide-react';
import bankNames from '../data/indiaBanks.json';
import './BankNamePicker.css';

// Names come from the customer's India_Banks_AtoZ.pdf (120 entries).
const banks = [...bankNames].sort((a, b) => a.localeCompare(b, 'en-IN', { sensitivity: 'base' }));
const popularBanks = [
  { name: 'IDFC FIRST Bank', label: 'IDFC FIRST', initials: 'IDFC', color: '#9e2530' },
  { name: 'YES Bank', label: 'YES Bank', initials: 'YES', color: '#165a9d' },
  { name: 'State Bank of India', label: 'SBI', initials: 'SBI', color: '#0879b8' },
  { name: 'Kotak Mahindra Bank', label: 'Kotak Bank', initials: 'KMB', color: '#b5273a' },
  { name: 'HDFC Bank', label: 'HDFC Bank', initials: 'HDFC', color: '#164783' },
  { name: 'Punjab National Bank', label: 'PNB', initials: 'PNB', color: '#96334a' },
  { name: 'Bank of Baroda', label: 'Bank of Baroda', initials: 'BOB', color: '#bd5426' },
  { name: 'ICICI Bank', label: 'ICICI Bank', initials: 'ICICI', color: '#a74422' },
  { name: 'Axis Bank', label: 'Axis Bank', initials: 'AXIS', color: '#9c2d5b' },
  { name: 'Canara Bank', label: 'Canara Bank', initials: 'CB', color: '#247d9c' },
  { name: 'Union Bank of India', label: 'Union Bank', initials: 'UBI', color: '#24568d' },
  { name: 'Indian Bank', label: 'Indian Bank', initials: 'IB', color: '#366099' },
];
const aliases = {
  'State Bank of India': ['SBI'], 'Punjab National Bank': ['PNB'], 'Bank of Baroda': ['BOB'],
  'Union Bank of India': ['UBI', 'Union BOI'], 'Bank of India': ['BOI'],
  'Hong Kong and Shanghai Banking Corporation Limited': ['HSBC'],
  'India Post Payments Bank': ['IPPB'], 'Jammu & Kashmir Bank': ['J&K', 'JK Bank'],
  'Kotak Mahindra Bank': ['Kotak Bank'], 'Central Bank of India': ['CBI'],
};
const normalize = text => text.normalize('NFKD').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

function BankSelectionDialog({ value, onSelect, onClose }) {
  const dialogRef = useRef(null);
  const searchRef = useRef(null);
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState(value);
  const titleId = useId();
  const queryValue = normalize(query);
  const results = banks.filter(bank => [bank, ...(aliases[bank] || [])].some(name => normalize(name).includes(queryValue)));
  const selectedPopular = popularBanks.find(bank => bank.name === selection);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const ownsScrollLock = previousOverflow !== 'hidden';
    dialog.showModal();
    if (ownsScrollLock) document.body.style.overflow = 'hidden';
    searchRef.current?.focus();
    return () => {
      dialog.close();
      if (ownsScrollLock) document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const keepFocus = event => {
    // A portal inside the request dialog still bubbles React events to it.
    // Its focus trap and Escape handler must leave this dialog in control.
    event.stopPropagation();
    if (event.key !== 'Tab') return;
    const controls = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled)')]
      .filter(element => element.getClientRects().length > 0);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return createPortal(
    <dialog ref={dialogRef} className="bank-picker-dialog" aria-labelledby={titleId} onKeyDown={keepFocus}
      onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}
      onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
      <div className="bank-picker-panel">
        <header className="bank-picker-header">
          <button type="button" className="bank-picker-back" onClick={onClose} aria-label="Back to account details"><ArrowLeft size={22} /></button>
          <span className="bank-picker-kicker"><Landmark size={14} /> REFUND BANK ACCOUNT</span>
          <button type="button" className="bank-picker-close" onClick={onClose} aria-label="Close bank selection"><X size={21} /></button>
          <h2 id={titleId}>Select your bank</h2>
          <p>Choose the bank for your refund account.</p>
          <div className="bank-picker-search">
            <Search size={21} aria-hidden="true" />
            <input ref={searchRef} type="search" aria-label="Search banks" placeholder="Enter the bank name" value={query}
              onChange={event => setQuery(event.target.value)} autoComplete="off" spellCheck={false} />
            {query && <button type="button" onClick={() => { setQuery(''); searchRef.current?.focus(); }} aria-label="Clear bank search"><X size={18} /></button>}
          </div>
        </header>
        <div className="bank-picker-scroll">
          {!queryValue && <section className="bank-picker-card" aria-labelledby={`${titleId}-popular`}>
            <h3 id={`${titleId}-popular`}>Popular banks</h3>
            <div className="bank-picker-popular">
              {popularBanks.map(bank => <button key={bank.name} type="button" aria-label={`Select ${bank.name}`} aria-pressed={selection === bank.name}
                className="bank-picker-tile" onClick={() => setSelection(bank.name)}>
                <span className="bank-picker-emblem" style={{ '--bank-color': bank.color }}><span>{bank.initials}</span>
                  {selection === bank.name && <span className="bank-picker-check"><Check size={12} strokeWidth={3} /></span>}
                </span>
                <span>{bank.label}</span>
              </button>)}
            </div>
          </section>}
          <section className="bank-picker-card bank-picker-all" aria-labelledby={`${titleId}-all`}>
            <div className="bank-picker-section-title"><h3 id={`${titleId}-all`}>{queryValue ? 'Search results' : 'All banks'}</h3>
              <span role="status" aria-live="polite">{results.length} {results.length === 1 ? 'bank' : 'banks'}</span>
            </div>
            {results.length ? results.map((bank, index) => <div key={bank}>
              {!queryValue && bank[0].toUpperCase() !== results[index - 1]?.[0].toUpperCase()
                && <p className="bank-picker-letter">{bank[0].toUpperCase()}</p>}
              <button type="button" className="bank-picker-row" aria-label={`Select ${bank}`} aria-pressed={selection === bank} onClick={() => setSelection(bank)}>
                <span className="bank-picker-row-icon"><Landmark size={20} aria-hidden="true" /></span><span>{bank}</span>
                <span className="bank-picker-radio" aria-hidden="true">{selection === bank && <Check size={12} strokeWidth={3} />}</span>
              </button>
            </div>) : <div className="bank-picker-empty"><SearchX size={30} /><h4>No banks found</h4><p>Try a different bank name or abbreviation.</p></div>}
          </section>
        </div>
        <footer className="bank-picker-footer">
          {selection && <p className="bank-picker-selection"><Check size={15} /><span>{selection}</span></p>}
          <button type="button" className="bank-picker-confirm" disabled={!banks.includes(selection)}
            onClick={() => { onSelect(selection); onClose(); }}>
            {selection ? `Confirm ${selectedPopular?.label || 'bank'}` : 'Choose a bank to continue'}
          </button>
        </footer>
      </div>
    </dialog>, document.body);
}

export default function BankNamePicker({ value, error, onChange }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div>
    <label id={`${id}-label`} htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
    <button id={id} type="button" className={`bank-name-field ${error ? 'has-error' : ''}`} aria-labelledby={`${id}-label`}
      aria-describedby={error ? `${id}-error` : undefined} aria-haspopup="dialog" aria-expanded={open} aria-invalid={Boolean(error)} onClick={() => setOpen(true)}>
      <Landmark size={19} aria-hidden="true" /><span className={value ? '' : 'bank-name-placeholder'}>{value || 'Select your bank'}</span><ChevronDown size={18} aria-hidden="true" />
    </button>
    {error && <p id={`${id}-error`} className="text-xs text-red-500 mt-1">{error}</p>}
    {open && <BankSelectionDialog value={value} onSelect={onChange} onClose={() => setOpen(false)} />}
  </div>;
}
