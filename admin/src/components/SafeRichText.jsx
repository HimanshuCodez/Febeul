import React from 'react';
import ReactQuill from 'react-quill-new';
import DOMPurify from 'dompurify';

const clean = value => DOMPurify.sanitize(String(value ?? ''), { USE_PROFILES: { html: true } });

// Treat saved rich text and editor exports as untrusted HTML at both boundaries.
const SafeRichText = React.forwardRef(function SafeRichText({ value, onChange, ...props }, ref) {
  return <ReactQuill {...props} ref={ref} value={clean(value)} onChange={(html, ...args) => onChange?.(clean(html), ...args)} />;
});
export default SafeRichText;
