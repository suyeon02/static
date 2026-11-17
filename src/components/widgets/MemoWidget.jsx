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
          <span role="status" className="text-meta font-bold text-green-800">SAVED ✓</span>
        )
      }
    >
      <textarea
        value={memoText}
        onChange={(e) => setMemoText(e.target.value)}
        placeholder="> Type your thoughts here..."
        disabled={isLoading}
        aria-label="Memo"
        className="ui-input h-auto min-h-[120px] flex-1 resize-none py-3 text-body"
      />
      <div className="mt-3 flex justify-between items-center shrink-0">
        <span className="text-meta text-muted">#quick_memo</span>
        <button
          onClick={handleSave}
          disabled={isLoading || isSaving}
          className="ui-btn ui-btn-primary px-4"
        >
          {isSaving ? 'SAVING…' : 'SAVE'}
        </button>
      </div>
    </WidgetCard>
  );
}