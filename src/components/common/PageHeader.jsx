import React from 'react';

export default function PageHeader({ title, description, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-heading font-extrabold tracking-[-0.02em]">{title}</h1>
        {description && (
          <p className="mt-1 text-small text-muted">{description}</p>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}
