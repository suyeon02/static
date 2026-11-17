import React, { useEffect, useState } from 'react';
import { BookmarkPlus, ExternalLink, Plus, Star, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getLocalizedErrorMessage } from '../../lib/userFacingError';
import CardHeader from '../common/CardHeader';
import ErrorAlert from '../common/ErrorAlert';

const BOOKMARK_COLUMNS = 'id, title, url, created_at, is_favorite';

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('//')) return null;
  if (
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed) &&
    !/^https?:\/\//i.test(trimmed)
  ) {
    return null;
  }

  try {
    const url = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

export default function BookmarksPage({ userId }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [retryAction, setRetryAction] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    const loadBookmarks = async () => {
      setIsLoading(true);
      setBookmarks([]);
      setError('');
      setRetryAction(null);

      const { data, error: loadError } = await supabase
        .from('bookmarks')
        .select(BOOKMARK_COLUMNS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!isCurrent) return;

      if (loadError) {
        setError(`북마크를 불러오지 못했습니다. ${getLocalizedErrorMessage(loadError, '다시 시도해 주세요.')}`);
        setRetryAction(() => () => setLoadAttempt((attempt) => attempt + 1));
      } else {
        setBookmarks(data);
      }
      setIsLoading(false);
    };

    void loadBookmarks().catch((loadError) => {
      if (!isCurrent) return;
      setError(
        `북마크를 불러오지 못했습니다. ${getLocalizedErrorMessage(loadError, '다시 시도해 주세요.')}`,
      );
      setRetryAction(() => () => setLoadAttempt((attempt) => attempt + 1));
      setIsLoading(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [userId, loadAttempt]);

  const handleAdd = async (event) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const normalizedUrl = normalizeUrl(url);

    if (!trimmedTitle || !normalizedUrl) {
      setError(
        !trimmedTitle
          ? '북마크 제목을 입력해 주세요.'
          : '올바른 HTTP 또는 HTTPS 주소를 입력해 주세요.',
      );
      setRetryAction(null);
      return;
    }

    const saveBookmark = async () => {
      setIsAdding(true);
      setError('');
      setRetryAction(null);
      try {
        const { data, error: saveError } = await supabase
          .from('bookmarks')
          .insert({ title: trimmedTitle, url: normalizedUrl })
          .select(BOOKMARK_COLUMNS)
          .single();

        if (saveError) throw saveError;
        setBookmarks((current) => [data, ...current]);
        setTitle('');
        setUrl('');
      } catch (saveError) {
        setError(
          `북마크를 저장하지 못했습니다. ${getLocalizedErrorMessage(saveError, '다시 시도해 주세요.')}`,
        );
        setRetryAction(() => saveBookmark);
      } finally {
        setIsAdding(false);
      }
    };

    await saveBookmark();
  };

  const handleDelete = async (bookmark) => {
    const deleteBookmark = async () => {
      setDeletingId(bookmark.id);
      setError('');
      setRetryAction(null);
      try {
        const { error: deleteError } = await supabase
          .from('bookmarks')
          .delete()
          .eq('id', bookmark.id);

        if (deleteError) throw deleteError;
        setBookmarks((current) =>
          current.filter((item) => item.id !== bookmark.id),
        );
      } catch (deleteError) {
        setError(
          `북마크를 삭제하지 못했습니다. ${getLocalizedErrorMessage(deleteError, '다시 시도해 주세요.')}`,
        );
        setRetryAction(() => deleteBookmark);
      } finally {
        setDeletingId(null);
      }
    };

    await deleteBookmark();
  };

  const handleToggleFavorite = async (bookmark) => {
    const isFavorite = !bookmark.is_favorite;
    setBookmarks((current) =>
      current.map((item) =>
        item.id === bookmark.id ? { ...item, is_favorite: isFavorite } : item,
      ),
    );
    setError('');
    setRetryAction(null);
    try {
      const { error: updateError } = await supabase
        .from('bookmarks')
        .update({ is_favorite: isFavorite })
        .eq('id', bookmark.id)
        .eq('user_id', userId);

      if (updateError) throw updateError;
    } catch (updateError) {
      setBookmarks((current) =>
        current.map((item) =>
          item.id === bookmark.id
            ? { ...item, is_favorite: bookmark.is_favorite }
            : item,
        ),
      );
      setError(
        `북마크를 수정하지 못했습니다. ${getLocalizedErrorMessage(updateError, '다시 시도해 주세요.')}`,
      );
    }
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
        onSubmit={handleAdd}
        className="ui-card space-y-4"
      >
        <CardHeader title="ADD BOOKMARK" icon={BookmarkPlus} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1.5 text-small font-bold">
            TITLE
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Bookmark title"
              required
              className="ui-input font-normal"
            />
          </label>
          <label className="space-y-1.5 text-small font-bold">
            URL
            <input
              type="text"
              inputMode="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              required
              className="ui-input font-normal"
            />
          </label>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isAdding || isLoading}
            className="ui-btn ui-btn-primary"
          >
            <Plus size={13} /> ADD BOOKMARK
          </button>
        </div>
      </form>

      <ErrorAlert message={error} onRetry={retryAction ? handleRetry : undefined} />

      <section className="ui-card">
        <CardHeader title={`BOOKMARKS (${bookmarks.length})`} />
        {isLoading ? (
          <p className="ui-empty">
            Loading bookmarks...
          </p>
        ) : bookmarks.length === 0 ? (
          <p className="ui-empty">
            No bookmarks yet.
          </p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {bookmarks.map((bookmark) => (
              <li
                key={bookmark.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 truncate text-small font-bold hover:underline"
                  >
                    <span className="truncate">{bookmark.title}</span>
                    <ExternalLink size={12} className="shrink-0" />
                  </a>
                  <p className="mt-1 truncate text-meta text-muted">
                    {bookmark.url}
                  </p>
                </div>
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => void handleToggleFavorite(bookmark)}
                    aria-label={`${bookmark.is_favorite ? 'Remove' : 'Add'} ${bookmark.title} ${bookmark.is_favorite ? 'from' : 'to'} favorites`}
                    aria-pressed={bookmark.is_favorite}
                    title={bookmark.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    className={`ui-icon-btn ${
                      bookmark.is_favorite ? 'text-amber-500 hover:text-amber-600' : ''
                    }`}
                  >
                    <Star size={14} fill={bookmark.is_favorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(bookmark)}
                    disabled={deletingId !== null}
                    aria-label={`Delete ${bookmark.title}`}
                    title="Delete bookmark"
                    className="ui-icon-btn"
                  >
                    <Trash2 size={14} />
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
