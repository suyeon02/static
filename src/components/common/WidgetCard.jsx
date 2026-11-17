import React from 'react';

export default function WidgetCard({ title, rightSlot, children, className = '' }) {
  return (
    <section className={`ui-card flex min-h-[260px] flex-col overflow-hidden ${className}`}>
      <div className="ui-card-header">
        <h2 className="ui-card-title">
          <span className="size-2 shrink-0 rounded-full bg-ink" aria-hidden="true" />
          <span className="truncate">{title}</span>
        </h2>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
