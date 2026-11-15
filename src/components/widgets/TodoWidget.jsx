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
        <span className="text-[10px] bg-[#F0F0F0] border border-black/20 px-2 py-0.5 rounded-[4px] font-bold">
          {completedCount}/{todos.length}
        </span>
      }
    >
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
        {isLoading ? (
          <div className="text-[12px] text-[#666666] py-4 text-center">
            Loading tasks...
          </div>
        ) : todos.length === 0 ? (
          <div className="text-[12px] text-[#666666] py-4 text-center">
            All tasks cleared.
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-2 text-[12px] py-1 px-1 hover:bg-[#F5F5F5] rounded-[4px] group"
            >
              <button
                onClick={() => toggleTodo(todo)}
                disabled={!isReady}
                className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
              >
                <span
                  className={`w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 ${
                    todo.done
                      ? 'bg-black border-black text-white'
                      : 'border-black/40 bg-white'
                  }`}
                >
                  {todo.done && <Check size={11} strokeWidth={3} />}
                </span>
                <span
                  className={`truncate ${
                    todo.done ? 'line-through text-[#666666]' : 'text-black'
                  }`}
                >
                  {todo.text}
                </span>
              </button>
              <input
                type="date"
                value={todo.dueDate || ''}
                onChange={(event) =>
                  void onUpdateTodoDueDate(todo.id, event.target.value)
                }
                disabled={!isReady}
                aria-label={`Due date for ${todo.text}`}
                className="w-[7.5rem] shrink-0 bg-transparent text-[10px] text-[#666666] outline-none focus:text-black"
              />
              <button
                onClick={() => deleteTodo(todo.id)}
                disabled={!isReady}
                aria-label={`Delete ${todo.text}`}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-[#666666] hover:text-black cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={addTodo} className="flex gap-1.5 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!isReady}
          placeholder="+ New task..."
          className="flex-1 min-w-0 px-2.5 py-1.5 bg-[#F0F0F0] border border-black/15 rounded-[4px] text-[12px] outline-none focus:border-black"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          disabled={!isReady}
          aria-label="Task due date"
          className="w-[7.5rem] px-1 bg-[#F0F0F0] border border-black/15 rounded-[4px] text-[10px] outline-none focus:border-black"
        />
        <button
          type="submit"
          disabled={!isReady}
          className="px-2.5 bg-black text-white rounded-[4px] flex items-center justify-center cursor-pointer hover:bg-neutral-800"
        >
          <Plus size={14} />
        </button>
      </form>
    </WidgetCard>
  );
}