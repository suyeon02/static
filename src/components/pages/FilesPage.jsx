import { useEffect, useRef, useState } from 'react';
import { Download, FileUp, LoaderCircle, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getLocalizedErrorMessage } from '../../lib/userFacingError';
import CardHeader from '../common/CardHeader';
import SwipePanels from '../common/SwipePanels';
import useSwipePanels from '../../hooks/useSwipePanels';
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

  const panels = useSwipePanels();
  const { goToPanel } = panels;

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
        goToPanel(1);
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
      <ErrorAlert message={error} onRetry={retryAction ? handleRetry : undefined} />
      <SwipePanels labels={['UPLOAD', 'FILES']} label="Files sections" controller={panels}>
      <form
        onSubmit={handleUpload}
        className="ui-card space-y-4"
      >
        <CardHeader title="UPLOAD FILE" icon={FileUp} />
        <label className="block space-y-1.5 text-small font-bold">
          파일 (최대 10MB)
          <input
            ref={fileInputRef}
            type="file"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] || null);
              clearError();
            }}
            className="w-full cursor-pointer rounded border border-line bg-subtle px-2 py-1.5 text-small font-normal file:mr-3 file:h-7 file:cursor-pointer file:rounded file:border-0 file:bg-ink file:px-3 file:text-meta file:font-bold file:text-white disabled:cursor-not-allowed disabled:opacity-40"
          />
        </label>
        {selectedFile && (
          <p className="text-meta text-muted">
            {selectedFile.name} · {formatFileSize(selectedFile.size)}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!selectedFile || isUploading || isLoading}
            className="ui-btn ui-btn-primary"
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

      <section className="ui-card">
        <CardHeader title={`FILES (${files.length})`} />
        {isLoading ? (
          <p className="ui-empty">
            Loading files...
          </p>
        ) : files.length === 0 ? (
          <p className="ui-empty">
            No files yet.
          </p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {files.map((file) => (
              <li
                key={file.path}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-small font-bold">{file.name}</p>
                  <p className="mt-1 text-meta text-muted">
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
                    className="ui-icon-btn"
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
                    className="ui-icon-btn"
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
      </SwipePanels>
    </div>
  );
}
