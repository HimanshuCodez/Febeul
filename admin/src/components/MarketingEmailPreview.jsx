/* eslint-disable react/prop-types -- Preview receives the sanitized campaign document and display settings. */
import { useEffect, useRef, useState } from 'react';

export default function MarketingEmailPreview({ html, device = 'desktop', title = 'Marketing email preview' }) {
  const container = useRef(null);
  const [availableWidth, setAvailableWidth] = useState(600);
  const [height, setHeight] = useState(600);
  const width = device === 'mobile' ? 375 : 600;
  const scale = Math.min(1, Math.max(1, availableWidth - 24) / width);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={container} className="min-w-0 max-h-[75vh] overflow-auto rounded-xl border bg-gray-100">
    <div className="p-3">
      <div className="mx-auto overflow-hidden bg-white shadow-sm" style={{ width: width * scale, height: height * scale }}>
        <iframe
          key={device}
          title={title}
          srcDoc={html}
          sandbox="allow-same-origin"
          onLoad={event => {
            try {
              const body = event.currentTarget.contentDocument?.body;
              if (body) setHeight(Math.max(240, body.offsetHeight + 24));
            } catch { /* A link opened inside the preview may navigate to another origin. */ }
          }}
          style={{ width, height, border: 0, display: 'block', background: '#fff', transform: `scale(${scale})`, transformOrigin: 'top left' }}
        />
      </div>
    </div>
  </div>;
}
