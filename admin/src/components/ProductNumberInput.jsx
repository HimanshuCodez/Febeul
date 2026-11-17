/* eslint-disable react/prop-types -- Controlled numeric product-editor input. */
import { useEffect, useRef } from 'react';
import { isProductNumericInput } from '../../../shared/productValidation';

export default function ProductNumberInput({ value, onChange, integer = false, min = 0, max, ...props }) {
  const input = useRef(null);
  useEffect(() => {
    let error = '';
    if (value !== '' && value != null) {
      if (!isProductNumericInput(String(value), integer) || !Number.isFinite(Number(value))) error = 'Enter numbers only.';
      else if (Number(value) < min) error = `Enter a value of at least ${min}.`;
      else if (max !== undefined && Number(value) > Number(max)) error = `Enter a value no greater than ${max}.`;
    }
    input.current?.setCustomValidity(error);
  }, [value, integer, min, max]);
  return <input {...props} ref={input} type="text" inputMode={integer ? 'numeric' : 'decimal'} min={min} max={max}
    pattern={integer ? '[0-9]+' : '(?:[0-9]+(?:\\.[0-9]{0,2})?|\\.[0-9]{1,2})'} value={value ?? ''}
    onChange={event => { if (isProductNumericInput(event.target.value, integer)) onChange(event); }} />;
}
