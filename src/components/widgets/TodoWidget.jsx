import React, { useEffect, useState } from 'react';
import { Plus, X, Check, CalendarDays } from 'lucide-react';
import WidgetCard from '../common/WidgetCard';
import { getDueDateInfo } from '../../lib/dueDate';

const FILTERS = [
  { id: 'all', label: 'ALL', empty: '할 일이 없습니다.' },
  { id: 'active', label: 'ACTIVE', empty: '남은 할 일이 없습니다.' },
  { id: 'done', label: 'DONE', empty: '완료한 할 일이 없습니다.' },
];

function useToday() {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const nextMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const timer = setTimeout(() => setToday(new Date()), nextMidnight - Date.now() + 1000);
    return () => clearTimeout(timer);
  }, [today]);

  return today;
}

function matchesFilter(todo, filter) {
  if (filter === 'active') return !todo.done;
  if (filter === 'done') return todo.done;
  return true;
}

export default function TodoWidget({
  todos,
  isLoading,
  isReady,
  onCreateTodo,
  onToggleTodo,
  onDeleteTodo,
}) {
  const [input, setInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [filter, setFilter] = useState('all');
  const today = useToday();

  const completedCount = todos.filter((t) => t.done).length;
  const progress = todos.length === 0 ? 0 : (completedCount / todos.length) * 100;
  const visibleTodos = todos.filter((todo) => matchesFilter(todo, filter));
  const activeFilter = FILTERS.find((item) => item.id === filter);

  const addTodo = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (await onCreateTodo(input.trim(), dueDate)) {
      setInput('');
      setDueDate('');
    }
  };

  return (
    <WidgetCard
      title="TODO"
      rightSlot={
        <div className="flex items-center gap-2 text-meta text-muted">
          <span className="tabular-nums">
            {completedCount}/{todos.length}
          </span>
          <span className="h-1 w-10 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <span
              className="block h-full bg-ink transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </span>
        </div>
      }
    >
      <div
        role="group"
        aria-label="Filter tasks"
        className="mb-3 flex shrink-0 gap-1.5 border-b border-line pb-2"
      >
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            aria-pressed={filter === item.id}
            className={`h-6 cursor-pointer rounded px-2 text-meta tracking-[0.04em] transition-colors ${
              filter === item.id
                ? 'bg-ink font-bold text-white'
                : 'text-muted hover:bg-hover hover:text-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex-1 space-y-2 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="ui-empty">할 일을 불러오는 중...</div>
        ) : visibleTodos.length === 0 ? (
          <div className="ui-empty">{activeFilter.empty}</div>
        ) : (
          visibleTodos.map((todo) => {
            const due = getDueDateInfo(todo.dueDate, today);
            return (
              <div
                key={todo.id}
                className={`group flex items-center gap-2 rounded border border-line px-2.5 py-2 transition-colors ${
                  todo.done ? 'bg-hover opacity-60' : 'bg-canvas hover:border-ink/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => void onToggleTodo(todo)}
                  disabled={!isReady}
                  role="checkbox"
                  aria-checked={todo.done}
                  aria-label={todo.text}
                  className={`flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border ${
                    todo.done
                      ? 'border-ink bg-ink text-white'
                      : 'border-muted bg-surface hover:border-ink'
                  }`}
                >
                  {todo.done && <Check size={11} strokeWidth={3} />}
                </button>
                <button
                  type="button"
                  onClick={() => void onToggleTodo(todo)}
                  disabled={!isReady}
                  tabIndex={-1}
                  className={`min-w-0 flex-1 cursor-pointer truncate text-left text-small ${
                    todo.done ? 'text-muted line-through' : 'text-ink'
                  }`}
                >
                  {todo.text}
                </button>
                {due && (
                  <span
                    className={`flex shrink-0 items-center gap-1 text-meta tabular-nums ${
                      due.urgent && !todo.done ? 'font-bold text-red-700' : 'text-muted'
                    }`}
                  >
                    <CalendarDays size={11} aria-hidden="true" />
                    {due.label}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void onDeleteTodo(todo.id)}
                  disabled={!isReady}
                  aria-label={`Delete ${todo.text}`}
                  className="ui-icon-btn ui-reveal size-6 hover:text-red-700"
                >
                  <X size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={addTodo}
        className="flex shrink-0 gap-1.5 border-t border-dashed border-line pt-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!isReady}
          placeholder="+ New task..."
          aria-label="New task"
          className="ui-input flex-1"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={!isReady}
          aria-label="Due date"
          className={`ui-input w-[7.5rem] shrink-0 px-2 text-meta ${dueDate ? 'text-ink' : 'text-muted'}`}
        />
        <button
          type="submit"
          disabled={!isReady}
          aria-label="Add task"
          className="ui-btn ui-btn-primary size-9 px-0"
        >
          <Plus size={14} />
        </button>
      </form>
    </WidgetCard>
  );
}
