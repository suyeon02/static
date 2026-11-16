import React, { useState } from 'react';
import { Check, Plus, Pencil, Trash2, X } from 'lucide-react';

export default function QuickMemoPage({
  quickMemos,
  onCreateMemo,
  onUpdateMemo,
  onMoveToTrash,
  isLoading,
}) {
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      await onCreateMemo(input);
      setInput('');
    } catch {
      // The persistence hook displays the sync error.
    }
  };

  const handleUpdate = async (id) => {
    if (!editContent.trim()) return;
    try {
      await onUpdateMemo(id, editContent);
      setEditingId(null);
      setEditContent('');
    } catch {
      // The persistence hook displays the sync error.
    }
  };

  const beginEdit = (memo) => {
    setEditingId(memo.id);
    setEditContent(memo.content);
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
          disabled={isLoading}
          className="flex-1 px-3 py-2 bg-[#F0F0F0] border border-black/15 rounded-[4px] text-[13px] outline-none focus:border-black"
        />
        <button
          type="submit"
          disabled={isLoading}
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
            {editingId === memo.id ? (
              <div className="flex flex-1 flex-col gap-2">
                <textarea
                  autoFocus
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  disabled={isLoading}
                  className="min-h-[100px] w-full resize-y rounded-[4px] border border-black/15 bg-[#F0F0F0] p-2 text-[13px] leading-relaxed outline-none focus:border-black"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdate(memo.id)}
                    disabled={isLoading || !editContent.trim()}
                    className="cursor-pointer rounded border border-black p-1.5 hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Save memo"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="cursor-pointer rounded border border-black/20 p-1.5 hover:border-black"
                    aria-label="Cancel editing"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                {memo.content}
              </p>
            )}
            <div className="flex items-center justify-between border-t border-[#E6E6E6] pt-2.5 mt-4 text-[11px] text-[#666666]">
              <span>{memo.createdAt}</span>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                {editingId !== memo.id && (
                  <button
                    onClick={() => beginEdit(memo)}
                    disabled={isLoading}
                    className="cursor-pointer hover:text-black disabled:cursor-not-allowed"
                    title="Edit memo"
                    aria-label="Edit memo"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(memo)}
                  disabled={isLoading}
                  className="cursor-pointer hover:text-black disabled:cursor-not-allowed"
                  title="Move to Trash"
                  aria-label="Move memo to trash"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}