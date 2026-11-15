import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import WidgetCard from '../common/WidgetCard';

export default function ScheduleWidget({
  schedules,
  selectedDate,
  isLoading,
  isReady,
  onCreateSchedule,
  onDeleteSchedule,
}) {
  const [time, setTime] = useState('14:00');
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const addSchedule = async (e) => {
    e.preventDefault();
    if (!title.trim() || !isReady || isSaving) return;
    setIsSaving(true);
    const created = await onCreateSchedule(time, title.trim());
    if (created) setTitle('');
    setIsSaving(false);
  };

  const removeSchedule = async (id) => {
    if (!isReady || isSaving) return;
    setIsSaving(true);
    await onDeleteSchedule(id);
    setIsSaving(false);
  };

  return (
    <WidgetCard
      title="SCHEDULE"
      rightSlot={
        <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-[4px] font-bold">
          {selectedDate}
        </span>
      }
    >
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
        {isLoading ? (
          <div className="text-[12px] text-[#666666] py-4 text-center">
            Loading events...
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-[12px] text-[#666666] py-4 text-center">
            No events scheduled.
          </div>
        ) : (
          schedules.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-[12px] py-1.5 px-2.5 bg-[#F5F5F5] rounded-[4px] group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-bold text-[#666666] shrink-0">
                  {item.time}
                </span>
                <span className="truncate font-medium">{item.title}</span>
              </div>
              <button
                onClick={() => removeSchedule(item.id)}
                disabled={!isReady || isSaving}
                className="opacity-0 group-hover:opacity-100 text-[#666666] hover:text-black cursor-pointer ml-2"
              >
                <X size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={addSchedule} className="flex gap-1.5 shrink-0">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          disabled={!isReady || isSaving}
          className="px-2 py-1.5 bg-[#F0F0F0] border border-black/15 rounded-[4px] text-[11px] outline-none focus:border-black"
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!isReady || isSaving}
          placeholder="+ Add event..."
          className="flex-1 min-w-0 px-2.5 py-1.5 bg-[#F0F0F0] border border-black/15 rounded-[4px] text-[12px] outline-none focus:border-black"
        />
        <button
          type="submit"
          disabled={!isReady || isSaving || !title.trim()}
          className="px-2.5 bg-black text-white rounded-[4px] flex items-center justify-center cursor-pointer hover:bg-neutral-800"
        >
          <Plus size={14} />
        </button>
      </form>
    </WidgetCard>
  );
}