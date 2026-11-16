import React, { useState } from 'react';
import WidgetCard from '../common/WidgetCard';

export default function MemoWidget({
  memoText,
  setMemoText,
  onSaveMemo,
  isLoading,
}) {
  const [savedNotice, setSavedNotice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!memoText.trim()) return;
    setIsSaving(true);
    try {
      await onSaveMemo(memoText);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 1800);
    } catch {
      // The persistence hook displays the sync error.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <WidgetCard
      title="MEMO"
      rightSlot={
        savedNotice && (
          <span className="text-[10px] font-bold text-black">SAVED ✓</span>
        )
      }
    >
      <textarea
        value={memoText}
        onChange={(e) => setMemoText(e.target.value)}
        placeholder="> Type your thoughts here..."
        disabled={isLoading}
        className="flex-1 w-full p-3 bg-[#F0F0F0] border border-black/10 rounded-[4px] text-[13px] leading-relaxed resize-none outline-none focus:border-black min-h-[120px]"
      />
      <div className="mt-3 flex justify-between items-center shrink-0">
        <span className="text-[11px] text-[#666666]">#quick_memo</span>
        <button
          onClick={handleSave}
          disabled={isLoading || isSaving}
          className="px-4 py-1.5 bg-black text-white text-[12px] font-bold rounded-[4px] cursor-pointer hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'SAVING…' : 'SAVE'}
        </button>
      </div>
    </WidgetCard>
  );
}