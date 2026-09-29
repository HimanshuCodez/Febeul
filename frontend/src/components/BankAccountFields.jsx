import { useId } from "react";

const BankAccountFields = ({ form, errors, onChange: handleChange }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div className="sm:col-span-2">
      <BankFormInput
        name="accountHolderName"
        label="Account Holder Name"
        value={form.accountHolderName}
        onChange={handleChange}
        error={errors.accountHolderName}
        placeholder="As per bank records"
      />
    </div>
    <div className="sm:col-span-2">
      <BankFormInput
        name="bankName"
        label="Bank Name"
        value={form.bankName}
        onChange={handleChange}
        error={errors.bankName}
        placeholder="e.g. HDFC Bank"
      />
    </div>
    <BankFormInput
      name="accountNumber"
      label="Account Number"
      value={form.accountNumber}
      onChange={handleChange}
      error={errors.accountNumber}
      inputMode="numeric"
      placeholder="Enter account number"
    />
    <BankFormInput
      name="confirmAccountNumber"
      label="Confirm Account Number"
      value={form.confirmAccountNumber}
      onChange={handleChange}
      onPaste={(e) => e.preventDefault()}
      error={errors.confirmAccountNumber}
      inputMode="numeric"
      placeholder="Re-enter account number"
    />
    <div className="sm:col-span-2">
      <BankFormInput
        name="ifsc"
        label="IFSC Code"
        value={form.ifsc}
        onChange={handleChange}
        error={errors.ifsc}
        placeholder="e.g. HDFC0001234"
      />
    </div>
  </div>
);

const BankFormInput = ({ label, error, ...props }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm ${error ? "border-red-400" : "border-gray-300"}`}
      />
      {error && <p id={`${id}-error`} className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

export default BankAccountFields;
