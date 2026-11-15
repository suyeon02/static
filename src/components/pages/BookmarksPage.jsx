import React, { useEffect, useState } from 'react';
import { BookmarkPlus, ExternalLink, Plus, Star, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getLocalizedErrorMessage } from '../../lib/userFacingError';

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
        className="bg-white border border-[#CCCCCC] rounded-[8px] p-5 space-y-4"
      >
        <div className="flex items-center gap-2 border-b border-[#E6E6E6] pb-3">
          <BookmarkPlus size={17} />
          <h2 className="text-[14px] font-bold">// ADD BOOKMARK</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1.5 text-[11px] font-bold">
            TITLE
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Bookmark title"
              required
              className="w-full px-3 py-2 bg-[#F0F0F0] border border-black/15 rounded-[4px] text-[12px] font-normal outline-none focus:border-black"
            />
          </label>
          <label className="space-y-1.5 text-[11px] font-bold">
            URL
            <input
              type="text"
              inputMode="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              required
              className="w-full px-3 py-2 bg-[#F0F0F0] border border-black/15 rounded-[4px] text-[12px] font-normal outline-none focus:border-black"
            />
          </label>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isAdding || isLoading}
            className="px-3 py-2 bg-black text-white text-[11px] font-bold rounded-[4px] flex items-center gap-1.5 cursor-pointer hover:bg-neutral-800 disabled:opacity-40"
          >
            <Plus size={13} /> ADD BOOKMARK
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
              className="mt-2 font-bold underline cursor-pointer"
            >
              다시 시도
            </button>
          )}
        </div>
      )}

      <section className="bg-white border border-[#CCCCCC] rounded-[8px] p-5">
        <div className="flex items-center justify-between border-b border-[#E6E6E6] pb-3 mb-3">
          <h2 className="text-[14px] font-bold">
            // BOOKMARKS ({bookmarks.length})
          </h2>
        </div>
        {isLoading ? (
          <p className="py-8 text-center text-[12px] text-[#666666]">
            Loading bookmarks...
          </p>
        ) : bookmarks.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-[#666666]">
            No bookmarks yet.
          </p>
        ) : (
          <ul className="divide-y divide-[#E6E6E6]">
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
                    className="flex items-center gap-2 truncate text-[12px] font-bold hover:underline"
                  >
                    <span className="truncate">{bookmark.title}</span>
                    <ExternalLink size={12} className="shrink-0" />
                  </a>
                  <p className="mt-1 truncate text-[10px] text-[#666666]">
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
                    className={`p-2 cursor-pointer ${
                      bookmark.is_favorite ? 'text-amber-500' : 'text-[#666666] hover:text-black'
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
                    className="p-2 text-[#666666] hover:text-black cursor-pointer disabled:opacity-40"
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
