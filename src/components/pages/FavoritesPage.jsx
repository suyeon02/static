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
import CardHeader from '../common/CardHeader';
import ErrorAlert from '../common/ErrorAlert';

const BOOKMARK_FIELDS = 'id, title, url, is_favorite';

function FavoriteSection({ title, icon: Icon, children, isEmpty, isLoading }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-muted" />
        <h2 className="text-small font-bold tracking-wide text-muted">
          {title}
        </h2>
      </div>

      {isLoading ? (
        <div className="ui-card py-10 text-center">
          <p className="ui-empty">Loading...</p>
        </div>
      ) : isEmpty ? (
        <div className="ui-card flex flex-col items-center justify-center gap-2 py-10 text-center">
          <Icon size={22} className="text-muted opacity-40" />
          <p className="ui-empty">No favorites in this category.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {children}
        </ul>
      )}
    </section>
  );
}

function FavoriteCard({ title, subtitle, onOpen, onRemove, icon: Icon }) {
  return (
    <li className="ui-card group flex items-center gap-3 p-4 transition-shadow hover:shadow-md">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-subtle text-muted">
        <Icon size={15} />
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left cursor-pointer"
      >
        <span className="block truncate text-[15px] font-semibold leading-snug text-foreground group-hover:underline">
          {title}
        </span>
        {subtitle && (
          <span className="mt-1 block truncate text-meta text-muted">
            {subtitle}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${title} from favorites`}
        title="Remove from favorites"
        className="ui-icon-btn shrink-0 text-amber-500 hover:text-amber-600"
      >
        <Star size={15} fill="currentColor" />
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
        setError(
          `즐겨찾기 북마크를 불러오지 못했습니다. ${getLocalizedErrorMessage(loadError, '다시 시도해 주세요.')}`,
        );
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
    <div className="w-full space-y-8">
      <ErrorAlert
        message={error}
        onRetry={() => setRetryVersion((version) => version + 1)}
      />

      {/* Notes */}
      <FavoriteSection
        title={`NOTES (${favoriteNotes.length})`}
        icon={FileText}
        isLoading={isNotesLoading}
        isEmpty={favoriteNotes.length === 0}
      >
        {favoriteNotes.map((note) => (
          <FavoriteCard
            key={note.id}
            title={note.title}
            subtitle={note.updatedAt}
            icon={FileText}
            onOpen={() => onNavigate('notes')}
            onRemove={() => void removeNoteFavorite(note.id)}
          />
        ))}
      </FavoriteSection>

      {/* Projects */}
      <FavoriteSection
        title={`PROJECTS (${favoriteProjects.length})`}
        icon={FolderKanban}
        isLoading={isProjectsLoading}
        isEmpty={favoriteProjects.length === 0}
      >
        {favoriteProjects.map((project) => (
          <FavoriteCard
            key={project.id}
            title={project.title}
            subtitle={`[${project.tag}] ${project.status}`}
            icon={FolderKanban}
            onOpen={() => onNavigate('projects')}
            onRemove={() =>
              void onUpdateProject(project.id, { is_favorite: false })
            }
          />
        ))}
      </FavoriteSection>

      {/* Bookmarks */}
      <FavoriteSection
        title={`BOOKMARKS (${bookmarks.length})`}
        icon={Bookmark}
        isLoading={isBookmarksLoading}
        isEmpty={bookmarks.length === 0}
      >
        {bookmarks.map((bookmark) => (
          <FavoriteCard
            key={bookmark.id}
            title={bookmark.title}
            subtitle={bookmark.url}
            icon={ExternalLink}
            onOpen={() => onNavigate('bookmarks')}
            onRemove={() => void removeBookmarkFavorite(bookmark)}
          />
        ))}
      </FavoriteSection>
    </div>
  );
}