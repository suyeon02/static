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
        className="ui-card flex gap-2 p-4"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="> Drop a quick thought or snippet..."
          disabled={isLoading}
          aria-label="New quick memo"
          className="ui-input flex-1 text-body"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="ui-btn ui-btn-primary px-4"
        >
          <Plus size={14} /> ADD
        </button>
      </form>

      {quickMemos.length === 0 && (
        <p className="ui-empty">{isLoading ? '메모를 불러오는 중...' : '아직 메모가 없습니다.'}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quickMemos.map((memo) => (
          <div
            key={memo.id}
            className="ui-card group flex min-h-[160px] flex-col justify-between"
          >
            {editingId === memo.id ? (
              <div className="flex flex-1 flex-col gap-2">
                <textarea
                  autoFocus
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  disabled={isLoading}
                  aria-label="Edit memo"
                  className="ui-input h-auto min-h-[100px] resize-y py-2 text-body"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdate(memo.id)}
                    disabled={isLoading || !editContent.trim()}
                    className="ui-btn ui-btn-primary size-8 px-0"
                    aria-label="Save memo"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="ui-btn ui-btn-secondary size-8 px-0"
                    aria-label="Cancel editing"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-body leading-relaxed whitespace-pre-wrap break-words">
                {memo.content}
              </p>
            )}
            <div className="mt-4 flex min-h-8 items-center justify-between border-t border-line-soft pt-2 text-meta text-muted tabular-nums">
              <span>{memo.createdAt}</span>
              <div className="ui-reveal flex items-center gap-0.5">
                {editingId !== memo.id && (
                  <button
                    onClick={() => beginEdit(memo)}
                    disabled={isLoading}
                    className="ui-icon-btn"
                    title="Edit memo"
                    aria-label="Edit memo"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(memo)}
                  disabled={isLoading}
                  className="ui-icon-btn"
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