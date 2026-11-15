import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  ExternalLink,
  FileText,
  FolderKanban,
  Star,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getLocalizedErrorMessage } from '../../lib/userFacingError';

const BOOKMARK_FIELDS = 'id, title, url, is_favorite';

function FavoriteSection({ title, icon: Icon, children, isEmpty }) {
  return (
    <section className="bg-white border border-[#CCCCCC] rounded-[8px] p-5">
      <div className="flex items-center gap-2 border-b border-[#E6E6E6] pb-3 mb-3">
        <Icon size={15} />
        <h2 className="text-[13px] font-bold">// {title}</h2>
      </div>
      {isEmpty ? (
        <p className="py-4 text-center text-[12px] text-[#666666]">
          No favorites in this category.
        </p>
      ) : (
        <ul className="divide-y divide-[#E6E6E6]">{children}</ul>
      )}
    </section>
  );
}

function FavoriteRow({ title, subtitle, onOpen, onRemove, icon: Icon }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer"
      >
        <Icon size={15} className="shrink-0 text-[#666666]" />
        <span className="min-w-0">
          <span className="block truncate text-[12px] font-bold">{title}</span>
          {subtitle && (
            <span className="mt-1 block truncate text-[10px] text-[#666666]">
              {subtitle}
            </span>
          )}
        </span>
      </button>
      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 text-[10px] font-bold text-[#666666] hover:text-black cursor-pointer"
        >
          OPEN
        </button>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${title} from favorites`}
        title="Remove from favorites"
        className="shrink-0 p-1 text-amber-500 hover:text-amber-700 cursor-pointer"
      >
        <Star size={14} fill="currentColor" />
      </button>
    </li>
  );
}

export default function FavoritesPage({
  userId,
  notes,
  projects,
  isNotesLoading,
  isProjectsLoading,
  onSetNoteFavorite,
  onUpdateProject,
  onNavigate,
}) {
  const [bookmarks, setBookmarks] = useState([]);
  const [isBookmarksLoading, setIsBookmarksLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    const loadBookmarks = async () => {
      setIsBookmarksLoading(true);
      setError('');
      const { data, error: loadError } = await supabase
        .from('bookmarks')
        .select(BOOKMARK_FIELDS)
        .eq('user_id', userId)
        .eq('is_favorite', true)
        .order('created_at', { ascending: false });

      if (!isCurrent) return;
      if (loadError) {
        setError(`즐겨찾기 북마크를 불러오지 못했습니다. ${getLocalizedErrorMessage(loadError, '다시 시도해 주세요.')}`);
      } else {
        setBookmarks(data || []);
      }
      setIsBookmarksLoading(false);
    };

    void loadBookmarks().catch((loadError) => {
      if (!isCurrent) return;
      setError(
        `즐겨찾기 북마크를 불러오지 못했습니다. ${getLocalizedErrorMessage(loadError, '다시 시도해 주세요.')}`,
      );
      setIsBookmarksLoading(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [userId, retryVersion]);

  const removeBookmarkFavorite = async (bookmark) => {
    setError('');
    try {
      const { error: updateError } = await supabase
        .from('bookmarks')
        .update({ is_favorite: false })
        .eq('id', bookmark.id)
        .eq('user_id', userId);
      if (updateError) throw updateError;
      setBookmarks((current) =>
        current.filter((item) => item.id !== bookmark.id),
      );
    } catch (updateError) {
      setError(
        `북마크 즐겨찾기를 수정하지 못했습니다. ${getLocalizedErrorMessage(updateError, '다시 시도해 주세요.')}`,
      );
    }
  };

  const removeNoteFavorite = async (id) => {
    try {
      await onSetNoteFavorite(id, false);
    } catch {
      // The notes hook displays the persistence error.
    }
  };

  const favoriteNotes = notes.filter((note) => note.isFavorite);
  const favoriteProjects = projects.filter((project) => project.isFavorite);

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="flex items-center gap-2 text-[15px] font-bold">
        <Star size={17} fill="currentColor" /> FAVORITES
      </h1>
      {error && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-[12px] text-red-800"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setRetryVersion((version) => version + 1)}
            className="mt-2 font-bold underline cursor-pointer"
          >
            다시 시도
          </button>
        </div>
      )}
      <FavoriteSection
        title={`NOTES (${favoriteNotes.length})`}
        icon={FileText}
        isEmpty={!isNotesLoading && favoriteNotes.length === 0}
      >
        {isNotesLoading ? (
          <li className="py-4 text-center text-[12px] text-[#666666]">
            Loading notes...
          </li>
        ) : (
          favoriteNotes.map((note) => (
            <FavoriteRow
              key={note.id}
              title={note.title}
              subtitle={note.updatedAt}
              icon={FileText}
              onOpen={() => onNavigate('notes')}
              onRemove={() => void removeNoteFavorite(note.id)}
            />
          ))
        )}
      </FavoriteSection>
      <FavoriteSection
        title={`PROJECTS (${favoriteProjects.length})`}
        icon={FolderKanban}
        isEmpty={!isProjectsLoading && favoriteProjects.length === 0}
      >
        {isProjectsLoading ? (
          <li className="py-4 text-center text-[12px] text-[#666666]">
            Loading projects...
          </li>
        ) : (
          favoriteProjects.map((project) => (
            <FavoriteRow
              key={project.id}
              title={project.title}
              subtitle={`[${project.tag}] ${project.status}`}
              icon={FolderKanban}
              onOpen={() => onNavigate('projects')}
              onRemove={() =>
                void onUpdateProject(project.id, { is_favorite: false })
              }
            />
          ))
        )}
      </FavoriteSection>
      <FavoriteSection
        title={`BOOKMARKS (${bookmarks.length})`}
        icon={Bookmark}
        isEmpty={!isBookmarksLoading && bookmarks.length === 0}
      >
        {isBookmarksLoading ? (
          <li className="py-4 text-center text-[12px] text-[#666666]">
            Loading bookmarks...
          </li>
        ) : (
          bookmarks.map((bookmark) => (
            <FavoriteRow
              key={bookmark.id}
              title={bookmark.title}
              subtitle={bookmark.url}
              icon={ExternalLink}
              onOpen={() => onNavigate('bookmarks')}
              onRemove={() => void removeBookmarkFavorite(bookmark)}
            />
          ))
        )}
      </FavoriteSection>
    </div>
  );
}
