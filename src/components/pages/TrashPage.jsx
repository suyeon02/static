import React from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import CardHeader from '../common/CardHeader';

export default function TrashPage({ items, isLoading, onRestore, onDelete, onEmpty }) {
  return (
    <section className="ui-card max-w-3xl">
      <CardHeader
        title={`ITEMS (${items.length})`}
        icon={Trash2}
        rightSlot={
          items.length > 0 && (
            <button type="button" onClick={onEmpty} className="ui-btn ui-btn-secondary h-8">
              EMPTY TRASH
            </button>
          )
        }
      />
      {isLoading ? (
        <p className="ui-empty">휴지통을 불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="ui-empty">휴지통이 비어 있습니다.</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="ui-tag shrink-0">{item.type}</span>
                <span className="truncate text-small font-medium">{item.title}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onRestore(item)}
                  className="ui-icon-btn"
                  title="Restore"
                  aria-label={`Restore ${item.title}`}
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="ui-icon-btn hover:text-red-700"
                  title="Delete permanently"
                  aria-label={`Delete ${item.title} permanently`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
