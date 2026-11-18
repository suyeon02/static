import { useEffect, useRef, useState } from 'react';
import { Download, FileUp, LoaderCircle, Trash2, File } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getLocalizedErrorMessage } from '../../lib/userFacingError';
import CardHeader from '../common/CardHeader';
import ErrorAlert from '../common/ErrorAlert';

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
    <div className="w-full space-y-6">
      <ErrorAlert message={error} onRetry={retryAction ? handleRetry : undefined} />

      {/* Upload */}
      <form onSubmit={handleUpload} className="ui-card space-y-4 p-5">
        <CardHeader title="UPLOAD FILE" icon={FileUp} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="block min-w-0 flex-1">
            <input
              ref={fileInputRef}
              type="file"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] || null);
                clearError();
              }}
              className="w-full cursor-pointer rounded border border-line bg-subtle px-3 py-2 text-small font-normal file:mr-3 file:h-7 file:cursor-pointer file:rounded file:border-0 file:bg-ink file:px-3 file:text-meta file:font-bold file:text-white disabled:cursor-not-allowed disabled:opacity-40"
            />
          </label>

          <button
            type="submit"
            disabled={!selectedFile || isUploading || isLoading}
            className="ui-btn ui-btn-primary h-10 shrink-0 px-5 w-full sm:w-auto"
          >
            {isUploading ? (
              <>
                <LoaderCircle size={14} className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <FileUp size={14} />
                Upload
              </>
            )}
          </button>
        </div>

        {selectedFile && (
          <p className="text-meta text-muted">
            {selectedFile.name} · {formatFileSize(selectedFile.size)}
          </p>
        )}
      </form>

      {/* Files list */}
      <section className="w-full">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-small font-bold tracking-wide text-muted">
            FILES ({files.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="ui-card py-14 text-center">
            <p className="ui-empty">Loading files...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="ui-card flex flex-col items-center justify-center gap-3 py-16 text-center">
            <File size={28} className="text-muted opacity-40" />
            <p className="ui-empty">No files yet.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {files.map((file) => (
              <li
                key={file.path}
                className="ui-card group flex items-center gap-3 p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-subtle text-muted">
                  <File size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold leading-snug">
                    {file.name}
                  </p>
                  <p className="mt-1 truncate text-meta text-muted">
                    {formatFileSize(file.size)}
                    {file.createdAt &&
                      ` · ${new Date(file.createdAt).toLocaleString()}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleDownload(file)}
                    disabled={downloadingPath !== null || deletingPath !== null}
                    aria-label={`Download ${file.name}`}
                    title="Download file"
                    className="ui-icon-btn text-muted hover:text-foreground"
                  >
                    {downloadingPath === file.path ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <Download size={15} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(file)}
                    disabled={deletingPath !== null || downloadingPath !== null}
                    aria-label={`Delete ${file.name}`}
                    title="Delete file"
                    className="ui-icon-btn text-muted hover:text-destructive"
                  >
                    {deletingPath === file.path ? (
                      <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
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