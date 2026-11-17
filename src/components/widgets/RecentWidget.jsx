import React from 'react';
import { FileText } from 'lucide-react';
import WidgetCard from '../common/WidgetCard';

export default function RecentWidget({ recentDocs, onSelectDoc }) {
  return (
    <WidgetCard title="RECENT">
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {recentDocs.length === 0 && (
          <p className="ui-empty">No recent notes.</p>
        )}
        {recentDocs.map((doc) => (
          <button
            key={doc.id}
            onClick={() => onSelectDoc && onSelectDoc(doc)}
            type="button"
            className="w-full min-h-9 flex items-center justify-between gap-3 px-3 py-2 bg-canvas hover:bg-hover rounded text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText size={14} className="shrink-0 text-ink" />
              <span className="text-small font-medium truncate">
                {doc.title}
              </span>
            </div>
            <span className="shrink-0 text-meta text-muted tabular-nums">
              {doc.updatedAt}
            </span>
          </button>
        ))}
      </div>
    </WidgetCard>
  );
}