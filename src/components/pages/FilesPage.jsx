import { useEffect, useRef, useState } from 'react';
import { Download, FileUp, LoaderCircle, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getLocalizedErrorMessage } from '../../lib/userFacingError';

const BUCKET = 'my-desk-files';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PAGE_SIZE = 100;

function getErrorMessage(error) {
  return getLocalizedErrorMessage(error, '다시 시도해 주세요.');
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return 'Size unavailable';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isOwnedFile(userId, path) {
  const prefix = `${userId}/`;
  const name = path.startsWith(prefix) ? path.slice(prefix.length) : '';
  return Boolean(name && !name.includes('/') && !name.includes('\\'));
}

async function hasStoredObject(userId, name) {
  const { data, error } = await supabase.storage.from(BUCKET).list(userId, {
    limit: PAGE_SIZE,
    search: name,
  });
  if (error) throw error;
  return Boolean(data?.some((item) => item.id && item.name === name));
}

export default function FilesPage({ userId }) {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingPath, setDeletingPath] = useState(null);
  const [downloadingPath, setDownloadingPath] = useState(null);
  const [error, setError] = useState('');
  const [retryAction, setRetryAction] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let isCurrent = true;

    const loadFiles = async () => {
      setIsLoading(true);
      setFiles([]);
      setError('');
      setRetryAction(null);

      try {
        const items = [];
        for (let offset = 0; ; offset += PAGE_SIZE) {
          const { data, error: loadError } = await supabase.storage
            .from(BUCKET)
            .list(userId, {
              limit: PAGE_SIZE,
              offset,
              sortBy: { column: 'created_at', order: 'desc' },
            });
          if (loadError) throw loadError;

          const page = (data || []).filter(
            (item) =>
              item.id &&
              item.name &&
              !item.name.includes('/') &&
              !item.name.includes('\\'),
          );
          items.push(...page);
          if (!data || data.length < PAGE_SIZE) break;
        }

        if (!isCurrent) return;
        setFiles(
          items.map((item) => ({
            path: `${userId}/${item.name}`,
            name:
              typeof item.metadata?.originalName === 'string'
                ? item.metadata.originalName
                : item.name.slice(37) || item.name,
            size: Number(item.metadata?.size),
            createdAt: item.created_at,
          })),
        );
      } catch (loadError) {
        if (!isCurrent) return;
        setError(`파일 목록을 불러오지 못했습니다. ${getErrorMessage(loadError)}`);
        setRetryAction(
          () => () => setLoadAttempt((attempt) => attempt + 1),
        );
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    void loadFiles();
    return () => {
      isCurrent = false;
    };
  }, [userId, loadAttempt]);

  const clearError = () => {
    setError('');
    setRetryAction(null);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('파일 크기는 10MB 이하여야 합니다.');
      setRetryAction(null);
      return;
    }

    const path = `${userId}/${crypto.randomUUID()}`;
    const upload = async () => {
      setIsUploading(true);
      clearError();
      try {
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, selectedFile, {
            upsert: false,
            contentType: selectedFile.type || 'application/octet-stream',
            metadata: { originalName: selectedFile.name },
          });
        if (uploadError) {
          const exists = await hasStoredObject(userId, path.split('/').pop());
          if (!exists) throw uploadError;
        }

        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setLoadAttempt((attempt) => attempt + 1);
      } catch (uploadError) {
        setError(`파일 업로드에 실패했습니다. ${getErrorMessage(uploadError)}`);
        setRetryAction(() => upload);
      } finally {
        setIsUploading(false);
      }
    };

    await upload();
  };

  const handleDownload = async (file) => {
    if (!isOwnedFile(userId, file.path)) {
      setError('이 파일은 현재 로그인한 계정에 속하지 않습니다.');
      setRetryAction(null);
      return;
    }

    const download = async () => {
      setDownloadingPath(file.path);
      clearError();
      try {
        const { data, error: downloadError } = await supabase.storage
          .from(BUCKET)
          .download(file.path);
        if (downloadError) throw downloadError;

        const objectUrl = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = file.name;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      } catch (downloadError) {
        setError(`파일 다운로드에 실패했습니다. ${getErrorMessage(downloadError)}`);
        setRetryAction(() => download);
      } finally {
        setDownloadingPath(null);
      }
    };

    await download();
  };

  const handleDelete = async (file) => {
    if (!isOwnedFile(userId, file.path)) {
      setError('이 파일은 현재 로그인한 계정에 속하지 않습니다.');
      setRetryAction(null);
      return;
    }
    if (!window.confirm(`"${file.name}" 파일을 영구적으로 삭제할까요?`)) return;

    const removeFile = async () => {
      setDeletingPath(file.path);
      clearError();
      try {
        const { error: deleteError } = await supabase.storage
          .from(BUCKET)
          .remove([file.path]);
        if (deleteError) throw deleteError;
        setFiles((current) =>
          current.filter((item) => item.path !== file.path),
        );
      } catch (deleteError) {
        setError(`파일 삭제에 실패했습니다. ${getErrorMessage(deleteError)}`);
        setRetryAction(() => removeFile);
      } finally {
        setDeletingPath(null);
      }
    };

    await removeFile();
  };

  const handleRetry = () => {
    if (!retryAction) return;
    const retry = retryAction;
    setRetryAction(null);
    retry();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <form
        onSubmit={handleUpload}
        className="space-y-4 rounded-[8px] border border-[#CCCCCC] bg-white p-5"
      >
        <div className="flex items-center gap-2 border-b border-[#E6E6E6] pb-3">
          <FileUp size={17} />
          <h2 className="text-[14px] font-bold">// UPLOAD FILE</h2>
        </div>
        <label className="block space-y-1.5 text-[11px] font-bold">
          파일 (최대 10MB)
          <input
            ref={fileInputRef}
            type="file"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] || null);
              clearError();
            }}
            className="w-full cursor-pointer rounded-[4px] border border-black/15 bg-[#F0F0F0] px-3 py-2 text-[12px] font-normal file:mr-3 file:cursor-pointer file:border-0 file:bg-black file:px-3 file:py-1 file:text-[11px] file:font-bold file:text-white"
          />
        </label>
        {selectedFile && (
          <p className="text-[11px] text-[#666666]">
            {selectedFile.name} · {formatFileSize(selectedFile.size)}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!selectedFile || isUploading || isLoading}
            className="flex cursor-pointer items-center gap-1.5 rounded-[4px] bg-black px-3 py-2 text-[11px] font-bold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isUploading ? (
              <LoaderCircle size={13} className="animate-spin" />
            ) : (
              <FileUp size={13} />
            )}
            {isUploading ? 'UPLOADING...' : 'UPLOAD'}
          </button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-[12px] text-red-800"
        >
          <p>{error}</p>
          {retryAction && (
            <button
              type="button"
              onClick={handleRetry}
              className="mt-2 cursor-pointer font-bold underline"
            >
              다시 시도
            </button>
          )}
        </div>
      )}

      <section className="rounded-[8px] border border-[#CCCCCC] bg-white p-5">
        <div className="mb-3 flex items-center justify-between border-b border-[#E6E6E6] pb-3">
          <h2 className="text-[14px] font-bold">// FILES ({files.length})</h2>
        </div>
        {isLoading ? (
          <p className="py-8 text-center text-[12px] text-[#666666]">
            Loading files...
          </p>
        ) : files.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-[#666666]">
            No files yet.
          </p>
        ) : (
          <ul className="divide-y divide-[#E6E6E6]">
            {files.map((file) => (
              <li
                key={file.path}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold">{file.name}</p>
                  <p className="mt-1 text-[10px] text-[#666666]">
                    {formatFileSize(file.size)}
                    {file.createdAt &&
                      ` · ${new Date(file.createdAt).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDownload(file)}
                    disabled={downloadingPath !== null || deletingPath !== null}
                    aria-label={`Download ${file.name}`}
                    title="Download file"
                    className="cursor-pointer p-2 text-[#666666] hover:text-black disabled:opacity-40"
                  >
                    {downloadingPath === file.path ? (
                      <LoaderCircle size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(file)}
                    disabled={deletingPath !== null || downloadingPath !== null}
                    aria-label={`Delete ${file.name}`}
                    title="Delete file"
                    className="cursor-pointer p-2 text-[#666666] hover:text-black disabled:opacity-40"
                  >
                    {deletingPath === file.path ? (
                      <LoaderCircle size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
