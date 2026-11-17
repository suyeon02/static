import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import WidgetCard from '../common/WidgetCard';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function CalendarWidget({ selectedDate, onSelectDate }) {
  const [viewDate, setViewDate] = useState(new Date());
  const today = new Date();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const formatDateStr = (d) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const isToday = (d) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === d;

  return (
    <WidgetCard
      title="CALENDAR"
      rightSlot={
        <div className="flex items-center gap-1 text-small font-bold tabular-nums">
          <button
            onClick={prevMonth}
            className="ui-icon-btn size-7"
            aria-label="Previous month"
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            {year}.{String(month + 1).padStart(2, '0')}
          </span>
          <button
            onClick={nextMonth}
            className="ui-icon-btn size-7"
            aria-label="Next month"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-1 text-center text-meta font-bold text-muted mb-2">
        {DAYS.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-small tabular-nums flex-1 content-start">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const dateStr = formatDateStr(day);
          const selected = selectedDate === dateStr;
          const currentToday = isToday(day);

          return (
            <button
              key={day}
              onClick={() => onSelectDate(dateStr)}
              aria-pressed={selected}
              aria-current={currentToday ? 'date' : undefined}
              className={`h-8 rounded flex items-center justify-center transition-colors cursor-pointer ${
                selected
                  ? 'bg-ink text-white font-bold'
                  : currentToday
                  ? 'border border-ink font-bold text-ink'
                  : 'hover:bg-hover text-ink'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </WidgetCard>
  );
}