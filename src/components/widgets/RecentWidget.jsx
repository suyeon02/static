import React from 'react';
import { FileText } from 'lucide-react';
import WidgetCard from '../common/WidgetCard';

export default function RecentWidget({ recentDocs, onSelectDoc }) {
  return (
    <WidgetCard title="RECENT">
      <div className="flex-1 overflow-y-auto space-y-2">
        {recentDocs.map((doc) => (
          <button
            key={doc.id}
            onClick={() => onSelectDoc && onSelectDoc(doc)}
            className="w-full flex items-center justify-between p-2.5 bg-[#F5F5F5] hover:bg-[#EAEAEA] rounded-[4px] text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText size={14} className="shrink-0 text-black" />
              <span className="text-[12px] font-medium truncate">
                {doc.title}
              </span>
            </div>
            <span className="text-[10px] text-[#666666] shrink-0 ml-2">
              {doc.updatedAt}
            </span>
          </button>
        ))}
      </div>
    </WidgetCard>
  );
}