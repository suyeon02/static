import React from 'react';

export default function CardHeader({ title, icon: Icon, rightSlot, className = '' }) {
  return (
    <div className={`ui-card-header ${className}`}>
      <h2 className="ui-card-title">
        {Icon ? (
          <Icon size={16} className="shrink-0" aria-hidden="true" />
        ) : (
          <span className="size-2 shrink-0 rounded-full bg-ink" aria-hidden="true" />
        )}
        <span className="truncate">{title}</span>
      </h2>
      {rightSlot && <div className="flex shrink-0 items-center gap-1">{rightSlot}</div>}
    </div>
  );
}
