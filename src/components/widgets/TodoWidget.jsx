import React, { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import WidgetCard from '../common/WidgetCard';

export default function TodoWidget({
  todos,
  isLoading,
  isReady,
  onCreateTodo,
  onToggleTodo,
  onDeleteTodo,
  onUpdateTodoDueDate,
}) {
  const [input, setInput] = useState('');
  const [dueDate, setDueDate] = useState('');

  const completedCount = todos.filter((t) => t.done).length;

  const addTodo = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (await onCreateTodo(input.trim(), dueDate)) {
      setInput('');
      setDueDate('');
    }
  };

  const toggleTodo = (todo) => {
    void onToggleTodo(todo);
  };

  const deleteTodo = (id) => {
    void onDeleteTodo(id);
  };

  return (
    <WidgetCard
      title="TODO"
      rightSlot={
        <span className="rounded border border-line bg-subtle px-2 py-0.5 text-meta font-bold tabular-nums">
          {completedCount}/{todos.length}
        </span>
      }
    >
      <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 mb-3">
        {isLoading ? (
          <div className="ui-empty">Loading tasks...</div>
        ) : todos.length === 0 ? (
          <div className="ui-empty">All tasks cleared.</div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className="group flex items-start gap-2.5 rounded px-2 py-1.5 hover:bg-canvas"
            >
              <button
                type="button"
                onClick={() => toggleTodo(todo)}
                disabled={!isReady}
                role="checkbox"
                aria-checked={todo.done}
                aria-label={todo.text}
                className={`mt-0.5 flex size-4 shrink-0 cursor-pointer items-center justify-center rounded border ${
                  todo.done
                    ? 'border-ink bg-ink text-white'
                    : 'border-line bg-surface hover:border-ink'
                }`}
              >
                {todo.done && <Check size={11} strokeWidth={3} />}
              </button>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => toggleTodo(todo)}
                  disabled={!isReady}
                  tabIndex={-1}
                  className={`block w-full cursor-pointer truncate text-left text-small ${
                    todo.done ? 'text-muted line-through' : 'text-ink'
                  }`}
                >
                  {todo.text}
                </button>
                <input
                  type="date"
                  value={todo.dueDate || ''}
                  onChange={(event) =>
                    void onUpdateTodoDueDate(todo.id, event.target.value)
                  }
                  disabled={!isReady}
                  aria-label={`Due date for ${todo.text}`}
                  className="mt-0.5 h-5 w-[8rem] rounded bg-transparent text-meta text-muted tabular-nums outline-none hover:text-ink focus:text-ink"
                />
              </div>
              <button
                type="button"
                onClick={() => deleteTodo(todo.id)}
                disabled={!isReady}
                aria-label={`Delete ${todo.text}`}
                className="ui-icon-btn ui-reveal size-7"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={addTodo} className="flex gap-2 shrink-0">
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
          onChange={(event) => setDueDate(event.target.value)}
          disabled={!isReady}
          aria-label="Task due date"
          className="ui-input w-[8.5rem] px-2 text-meta tabular-nums"
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