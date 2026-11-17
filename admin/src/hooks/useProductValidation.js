import { useState } from 'react';
import { validateProduct } from '../../../shared/productValidation';

export function focusProductError(field) {
  const variation = field.match(/^variations\.(\d+)(?:\.sizes\.(\d+)\.(\w+)|\.(\w+))?/);
  let target;
  if (variation) {
    const [, index, sizeIndex, sizeField, variationField] = variation;
    target = document.getElementById(`product-${sizeField || variationField}-${index}${sizeIndex !== undefined ? `-${sizeIndex}` : ''}`)
      || document.querySelector(`[aria-label="Variation ${Number(index) + 1}"]`);
  } else if (field === 'description') target = document.querySelector('.ql-editor');
  else target = document.getElementById(`product-${field === 'itemDimensionsLxWxH' ? 'item-dimensions-lxwxh' : field.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`)
    || document.querySelector(`select[aria-label="${field[0].toUpperCase() + field.slice(1)}"]`);
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target?.focus({ preventScroll: true });
}

export default function useProductValidation(values) {
  const [attempted, setAttempted] = useState(false);
  return {
    errors: attempted ? validateProduct(values) : [],
    validate() {
      const errors = validateProduct(values);
      setAttempted(true);
      if (errors.length) focusProductError(errors[0].field);
      return !errors.length;
    },
    reset: () => setAttempted(false),
  };
}
