import { useState } from "react";

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const emptyBankForm = { accountHolderName: "", accountNumber: "", confirmAccountNumber: "", ifsc: "", bankName: "" };

export default function useBankAccountForm() {
  const [form, setForm] = useState(emptyBankForm);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;
    if (name === "accountNumber" || name === "confirmAccountNumber") {
      nextValue = value.replace(/\D/g, "").slice(0, 18);
    } else if (name === "ifsc") {
      nextValue = value.toUpperCase().replace(/\s/g, "").slice(0, 11);
    }
    setForm((prev) => ({ ...prev, [name]: nextValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.accountHolderName.trim()) nextErrors.accountHolderName = "Enter the account holder's name";
    if (!form.bankName.trim()) nextErrors.bankName = "Enter the bank name";
    if (!/^\d{9,18}$/.test(form.accountNumber)) nextErrors.accountNumber = "Enter a valid account number";
    if (form.accountNumber !== form.confirmAccountNumber) nextErrors.confirmAccountNumber = "Account numbers do not match";
    if (!IFSC_REGEX.test(form.ifsc)) nextErrors.ifsc = "Enter a valid IFSC code (e.g. HDFC0001234)";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const reset = () => {
    setForm(emptyBankForm);
    setErrors({});
  };

  return { form, errors, handleChange, validate, reset };
}
