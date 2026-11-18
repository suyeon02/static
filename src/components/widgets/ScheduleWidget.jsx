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
  className = '',
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
      className={className}
      rightSlot={
        <span className="rounded bg-ink px-2 py-0.5 text-meta font-bold text-white tabular-nums">
          {selectedDate}
        </span>
      }
    >
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mb-3">
        {isLoading ? (
          <div className="ui-empty">
            Loading events...
          </div>
        ) : schedules.length === 0 ? (
          <div className="ui-empty">
            No events scheduled.
          </div>
        ) : (
          schedules.map((item) => (
            <div
              key={item.id}
              className="group flex min-h-9 items-center justify-between rounded bg-canvas py-1 pl-3 pr-1 text-small"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 font-bold text-muted tabular-nums">
                  {item.time}
                </span>
                <span className="truncate font-medium">{item.title}</span>
              </div>
              <button
                onClick={() => removeSchedule(item.id)}
                disabled={!isReady || isSaving}
                aria-label={`Delete ${item.title}`}
                className="ui-icon-btn ui-reveal ml-2 size-7"
              >
                <X size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={addSchedule} className="flex gap-2 shrink-0">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          disabled={!isReady || isSaving}
          aria-label="Event time"
          className="ui-input w-auto px-2 tabular-nums"
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!isReady || isSaving}
          placeholder="+ Add event..."
          aria-label="Event title"
          className="ui-input flex-1"
        />
        <button
          type="submit"
          disabled={!isReady || isSaving || !title.trim()}
          aria-label="Add event"
          className="ui-btn ui-btn-primary size-9 px-0"
        >
          <Plus size={14} />
        </button>
      </form>
    </WidgetCard>
  );
}