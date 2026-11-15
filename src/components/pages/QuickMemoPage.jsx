import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function QuickMemoPage({ quickMemos, setQuickMemos, onMoveToTrash }) {
  const [input, setInput] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const newMemo = {
      id: Date.now(),
      content: input.trim(),
      createdAt: new Date().toLocaleDateString(),
    };
    setQuickMemos([newMemo, ...quickMemos]);
    setInput('');
  };

  const handleDelete = async (memo) => {
    try {
      await onMoveToTrash(memo);
    } catch {
      // The persistence hook displays the error.
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleAdd}
        className="bg-white border border-[#CCCCCC] rounded-[8px] p-4 flex gap-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="> Drop a quick thought or snippet..."
          className="flex-1 px-3 py-2 bg-[#F0F0F0] border border-black/15 rounded-[4px] text-[13px] outline-none focus:border-black"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-black text-white text-[12px] font-bold rounded-[4px] flex items-center gap-1.5 cursor-pointer hover:bg-neutral-800"
        >
          <Plus size={14} /> ADD
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickMemos.map((memo) => (
          <div
            key={memo.id}
            className="bg-white border border-[#CCCCCC] rounded-[8px] p-4 flex flex-col justify-between min-h-[160px] group"
          >
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
              {memo.content}
            </p>
            <div className="flex items-center justify-between border-t border-[#E6E6E6] pt-2.5 mt-4 text-[11px] text-[#666666]">
              <span>{memo.createdAt}</span>
              <button
                onClick={() => handleDelete(memo)}
                className="opacity-0 group-hover:opacity-100 hover:text-black cursor-pointer"
                title="Move to Trash"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}