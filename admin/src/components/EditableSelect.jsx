import React, { useState } from "react";
import { Plus, Check, X } from "lucide-react";

// A <select> that also lets the user create a brand-new option inline
// (used for Category/Fabric/Type, whose lists are admin-managed CMS data
// rather than a fixed enum). `onAddNew` persists the new value upstream;
// `onChange` is only called with the confirmed value once that succeeds.
const EditableSelect = ({
  label,
  options = [],
  value,
  onChange,
  onAddNew,
  placeholder = "Select...",
  required = false,
  disableAdd = false,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Keep the current value selectable even if it's absent from `options` —
  // e.g. an older product whose category/type predates the current list.
  const allOptions = value && !options.includes(value) ? [...options, value] : options;

  const handleConfirmAdd = async () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    setIsSaving(true);
    try {
      await onAddNew(trimmed);
      onChange(trimmed);
      setNewValue("");
      setIsAdding(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full">
      <p className="mb-2 text-sm font-semibold text-gray-600">{label}</p>
      {!isAdding ? (
        <div className="flex gap-2">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none text-sm bg-white"
          >
            <option value="">{placeholder}</option>
            {allOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {!disableAdd && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              title={`Add new ${label}`}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200 transition-colors"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            autoFocus
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={`New ${label.toLowerCase()}...`}
            className="flex-1 px-3 py-2 rounded-lg border border-pink-300 focus:ring-2 focus:ring-pink-400 outline-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleConfirmAdd();
              }
            }}
          />
          <button
            type="button"
            disabled={isSaving || !newValue.trim()}
            onClick={handleConfirmAdd}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setNewValue("");
            }}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default EditableSelect;
