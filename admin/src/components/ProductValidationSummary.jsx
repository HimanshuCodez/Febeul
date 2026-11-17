/* eslint-disable react/prop-types -- Shared product editor validation results. */
import { focusProductError } from '../hooks/useProductValidation';

export default function ProductValidationSummary({ errors }) {
  if (!errors.length) return null;
  return <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
    <p className="font-semibold">Complete the required product details before saving.</p>
    <ul className="mt-2 space-y-1">{errors.slice(0, 5).map(error => <li key={error.field}><button type="button" onClick={() => focusProductError(error.field)} className="text-left underline underline-offset-2">{error.message}</button></li>)}</ul>
    {errors.length > 5 && <p className="mt-2 text-xs">{errors.length - 5} more field{errors.length - 5 === 1 ? '' : 's'} need attention.</p>}
  </div>;
}
