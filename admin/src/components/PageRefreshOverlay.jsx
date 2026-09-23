import React from 'react'

const PageRefreshOverlay = ({ show }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-white/70 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]">
      <div className="flex flex-col items-center gap-4 px-9 py-8 bg-white rounded-2xl shadow-2xl border border-gray-100">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 rounded-full border-4 border-black border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-medium text-gray-500 tracking-wide">Loading…</p>
      </div>
    </div>
  );
};

export default PageRefreshOverlay;
