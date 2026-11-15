import React from 'react';

export default function WidgetCard({ title, rightSlot, children }) {
  return (
    <section className="bg-white border border-[#CCCCCC] rounded-[8px] p-5 flex flex-col min-h-[260px] overflow-hidden">
      <div className="flex justify-between items-center border-b border-[#E6E6E6] pb-3 mb-4 shrink-0">
        <div className="flex items-center text-[15px] font-bold">
          <span className="w-2 h-2 bg-black rounded-full mr-2 inline-block" />
          <span>{title}</span>
        </div>
        {rightSlot && <div>{rightSlot}</div>}
      </div>
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </section>
  );
}