import { useRef, useState } from 'react';
import { Archive, Download, FileUp, LoaderCircle } from 'lucide-react';
import { createBackupZip, restoreBackupZip } from '../../lib/backup';
import { getLocalizedErrorMessage } from '../../lib/userFacingError';

const CATEGORY_LABELS = {
  archive: 'Backup validation',
  note_folders: 'Note folders',
  notes: 'Notes',
  tasks: 'Tasks',
  events: 'Events',
  projects: 'Projects',
  bookmarks: 'Bookmarks',
  trash_items: 'Trash',
  static_memo: 'Memo',
  static_quick_memos: 'Quick memos',
  files: 'Uploaded files',
};

function getErrorMessage(error) {
  return getLocalizedErrorMessage(error, '다시 시도해 주세요.');
}

export default function BackupPage({
  userId,
  memoText,
  setMemoText,
  quickMemos,
  setQuickMemos,
  onRestoreComplete,
}) {
  const [backupFile, setBackupFile] = useState(null);
  const [busyAction, setBusyAction] = useState('');
  const [progress, setProgress] = useState({});
  const [operationError, setOperationError] = useState('');
  const [completedAction, setCompletedAction] = useState('');
  const fileInputRef = useRef(null);

  const updateProgress = (category, next) => {
    setProgress((current) => ({ ...current, [category]: next }));
  };

  const handleCreateBackup = async () => {
    setBusyAction('export');
    setProgress({});
    setOperationError('');
    setCompletedAction('');
    try {
      const blob = await createBackupZip({
        userId,
        memoText,
        quickMemos,
        onProgress: updateProgress,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `static-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setCompletedAction('Your ZIP backup was downloaded.');
    } catch (error) {
      setOperationError(`백업을 완료하지 못했습니다. ${getErrorMessage(error)}`);
    } finally {
      setBusyAction('');
    }
  };

  const handleRestore = async () => {
    if (!backupFile) return;
    const confirmed = window.confirm(
      '선택한 STATIC 백업을 현재 로그인한 계정에 병합하시겠습니까? 기존 데이터와 파일은 유지되며, ID나 경로가 중복되는 항목은 덮어쓰지 않습니다.',
    );
    if (!confirmed) return;

    setBusyAction('restore');
    setProgress({});
    setOperationError('');
    setCompletedAction('');
    try {
      const results = await restoreBackupZip({
        file: backupFile,
        userId,
        memoText,
        quickMemos,
        setMemoText,
        setQuickMemos,
        onProgress: updateProgress,
      });
      const errorCount = Object.values(results).reduce(
        (total, result) => total + result.errors.length,
        0,
      );
      setCompletedAction(
        errorCount
          ? '오류와 함께 복원이 완료되었습니다. 아래 항목별 내용을 확인해 주세요.'
          : 'Restore completed. Existing records and files were kept.',
      );
      onRestoreComplete();
    } catch (error) {
      setOperationError(`복원을 완료하지 못했습니다. ${getErrorMessage(error)}`);
    } finally {
      setBusyAction('');
    }
  };

  const isBusy = Boolean(busyAction);

  return (
    <div className="max-w-3xl space-y-6">
      <section className="space-y-4 rounded-[8px] border border-[#CCCCCC] bg-white p-5">
        <div className="flex items-center gap-2 border-b border-[#E6E6E6] pb-3">
          <Archive size={17} />
          <h2 className="text-[14px] font-bold">// FULL DATA BACKUP</h2>
        </div>
        <p className="text-[12px] leading-relaxed text-[#555555]">
          Download a ZIP containing your signed-in account&apos;s notes, folders,
          tasks, events, projects, bookmarks, trash, local memos, and every
          uploaded file with its original filename.
        </p>
        <button
          type="button"
          onClick={handleCreateBackup}
          disabled={isBusy}
          className="flex cursor-pointer items-center gap-2 rounded-[4px] bg-black px-3 py-2 text-[11px] font-bold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busyAction === 'export' ? (
            <LoaderCircle size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          {busyAction === 'export' ? 'CREATING ZIP…' : 'DOWNLOAD ZIP BACKUP'}
        </button>
      </section>

      <section className="space-y-4 rounded-[8px] border border-[#CCCCCC] bg-white p-5">
        <div className="flex items-center gap-2 border-b border-[#E6E6E6] pb-3">
          <FileUp size={17} />
          <h2 className="text-[14px] font-bold">// RESTORE FROM ZIP</h2>
        </div>
        <p className="text-[12px] leading-relaxed text-[#555555]">
          Restore uses merge mode: existing data and files always win. Records
          with duplicate IDs and files with duplicate paths are skipped, not
          overwritten. Folders are imported before notes. Restored data is
          associated with the currently signed-in account.
        </p>
        <label className="block space-y-1.5 text-[11px] font-bold">
          STATIC backup ZIP
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip"
            disabled={isBusy}
            onChange={(event) => {
              setBackupFile(event.target.files?.[0] || null);
              setProgress({});
              setOperationError('');
              setCompletedAction('');
            }}
            className="w-full cursor-pointer rounded-[4px] border border-black/15 bg-[#F0F0F0] px-3 py-2 text-[12px] font-normal file:mr-3 file:cursor-pointer file:border-0 file:bg-black file:px-3 file:py-1 file:text-[11px] file:font-bold file:text-white disabled:opacity-40"
          />
        </label>
        {backupFile && (
          <p className="text-[11px] text-[#666666]">{backupFile.name}</p>
        )}
        <button
          type="button"
          onClick={handleRestore}
          disabled={!backupFile || isBusy}
          className="flex cursor-pointer items-center gap-2 rounded-[4px] border border-black px-3 py-2 text-[11px] font-bold hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busyAction === 'restore' ? (
            <LoaderCircle size={14} className="animate-spin" />
          ) : (
            <FileUp size={14} />
          )}
          {busyAction === 'restore' ? 'RESTORING…' : 'RESTORE & MERGE'}
        </button>
      </section>

      {(completedAction || operationError || Object.keys(progress).length > 0) && (
        <section
          aria-live="polite"
          className="space-y-3 rounded-[8px] border border-[#CCCCCC] bg-white p-5"
        >
          <h2 className="text-[13px] font-bold">// OPERATION STATUS</h2>
          {completedAction && (
            <p className="text-[12px] text-green-800">{completedAction}</p>
          )}
          {operationError && (
            <p role="alert" className="text-[12px] text-red-800">
              {operationError}
            </p>
          )}
          <ul className="space-y-2">
            {Object.entries(progress).map(([category, item]) => (
              <li
                key={category}
                className="rounded border border-[#E6E6E6] bg-[#FAFAFA] p-3 text-[11px]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold">
                    {CATEGORY_LABELS[category] || category}
                  </span>
                  <span
                    className={
                      item.status === 'error'
                        ? 'text-red-700'
                        : item.status === 'done'
                          ? 'text-green-800'
                          : 'text-[#666666]'
                    }
                  >
                    {item.status === 'error' ? '오류' : item.status}
                  </span>
                </div>
                {item.total > 0 && (
                  <progress
                    className="mt-2 h-1 w-full accent-black"
                    value={item.done || 0}
                    max={item.total}
                  />
                )}
                <p className="mt-1 break-words text-[#666666]">{item.message}</p>
                {item.errors?.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-red-800">
                    {item.errors.map((error, index) => (
                      <li key={`${index}-${error}`} className="break-words">
                        {error}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
