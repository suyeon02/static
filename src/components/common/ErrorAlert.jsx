import React from 'react';

export default function ErrorAlert({ message, onRetry, className = '' }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-small text-red-800 ${className}`}
    >
      <p className="min-w-0 flex-1">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 cursor-pointer font-bold underline underline-offset-2 hover:text-red-950"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
