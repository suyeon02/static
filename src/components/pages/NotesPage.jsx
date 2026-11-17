import React, { useState } from 'react';
import {
  Check,
  Edit3,
  Eye,
  FileText,
  Folder,
  Plus,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import CardHeader from '../common/CardHeader';
import ErrorAlert from '../common/ErrorAlert';
import normalizeTags from '../../lib/normalizeTags';

const UNFILED = 'unfiled';

export default function NotesPage({
  notes,
  folders,
  onCreateNote,
  onUpdateNote,
  onSetNoteFavorite,
  onDeleteNote,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  isLoading,
  isFoldersLoading,
  foldersError,
  onRetryFolders,
}) {
  const [selectedId, setSelectedId] = useState(notes[0]?.id || null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  const folderNotes =
    selectedFolder === UNFILED
      ? notes.filter((note) => !note.folderId)
      : selectedFolder
        ? notes.filter((note) => note.folderId === selectedFolder)
        : notes;
  const availableTags = [
    ...new Set([
      ...folderNotes.flatMap((note) => note.tags || []),
      ...(selectedTag ? [selectedTag] : []),
    ]),
  ].sort((a, b) => a.localeCompare(b));
  const visibleNotes = selectedTag
    ? folderNotes.filter((note) => (note.tags || []).includes(selectedTag))
    : folderNotes;
  const activeNote =
    visibleNotes.find((note) => note.id === selectedId) || visibleNotes[0];
  const activeFolderId =
    selectedFolder && selectedFolder !== UNFILED ? selectedFolder : null;

  const handleCreateNote = async () => {
    try {
      const newNote = await onCreateNote({
        title: `untitled_${notes.length + 1}`,
        content: '# New Note\n\n> Start writing your markdown here...',
        folderId: activeFolderId,
      });
      setSelectedId(newNote.id);
      setSelectedTag(null);
      setIsPreview(false);
    } catch {
      // The persistence hook displays the error.
    }
  };

  const handleCreateFolder = async (event) => {
    event.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;

    try {
      const folder = await onCreateFolder(name);
      setNewFolderName('');
      setSelectedFolder(folder.id);
    } catch {
      // The persistence hook displays the error.
    }
  };

  const handleRenameFolder = async (event, folder) => {
    event.preventDefault();
    const name = editingFolderName.trim();
    if (!name) return;

    try {
      await onRenameFolder(folder.id, name);
      setEditingFolderId(null);
      setEditingFolderName('');
    } catch {
      // The persistence hook displays the error.
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!window.confirm(`"${folder.name}" 폴더를 삭제할까요? 폴더 안의 노트는 미분류 상태가 됩니다.`)) {
      return;
    }

    try {
      await onDeleteFolder(folder.id);
      if (selectedFolder === folder.id) setSelectedFolder(null);
      if (editingFolderId === folder.id) setEditingFolderId(null);
    } catch {
      // The persistence hook displays the error.
    }
  };

  const handleUpdate = (field, value) => {
    if (!activeNote) return;
    onUpdateNote(activeNote.id, { [field]: value });
  };

  const handleToggleFavorite = async (note) => {
    try {
      await onSetNoteFavorite(note.id, !note.isFavorite);
    } catch {
      // The persistence hook displays the error.
    }
  };

  const handleAddTag = (event) => {
    event.preventDefault();
    if (!activeNote) return;
    const tag = normalizeTags([newTag])[0];
    if (!tag) return;

    handleUpdate('tags', normalizeTags([...(activeNote.tags || []), tag]));
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove) => {
    handleUpdate(
      'tags',
      (activeNote.tags || []).filter((tag) => tag !== tagToRemove),
    );
  };

  const handleDelete = async (note) => {
    try {
      await onDeleteNote(note);
      if (activeNote?.id === note.id) {
        const remaining = visibleNotes.filter((item) => item.id !== note.id);
        setSelectedId(remaining[0]?.id || null);
      }
    } catch {
      // The persistence hook displays the error.
    }
  };

  const renderFolderRow = (folder) => {
    const isSelected = selectedFolder === folder.id;
    const isEditing = editingFolderId === folder.id;

    if (isEditing) {
      return (
        <form
          key={folder.id}
          onSubmit={(event) => handleRenameFolder(event, folder)}
          className="flex items-center gap-1 p-1"
        >
          <input
            autoFocus
            value={editingFolderName}
            onChange={(event) => setEditingFolderName(event.target.value)}
            aria-label="Folder name"
            className="ui-input h-8 flex-1 px-2"
          />
          <button
            type="submit"
            disabled={!editingFolderName.trim()}
            aria-label="Save folder name"
            className="ui-icon-btn"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={() => setEditingFolderId(null)}
            aria-label="Cancel renaming folder"
            className="ui-icon-btn"
          >
            <X size={14} />
          </button>
        </form>
      );
    }

    return (
      <div
        key={folder.id}
        className={`group flex items-center rounded ${
          isSelected ? 'bg-ink text-white' : 'hover:bg-hover'
        }`}
      >
        <button
          onClick={() => setSelectedFolder(folder.id)}
          type="button"
          aria-current={isSelected ? 'true' : undefined}
          className="flex h-9 min-w-0 flex-1 items-center gap-2 px-2 text-left text-small cursor-pointer"
        >
          <Folder size={14} className="shrink-0" />
          <span className="truncate">{folder.name}</span>
          <span
            className={`ml-auto text-meta tabular-nums ${
              isSelected ? 'text-neutral-300' : 'text-muted'
            }`}
          >
            {notes.filter((note) => note.folderId === folder.id).length}
          </span>
        </button>
        <button
          onClick={() => {
            setEditingFolderId(folder.id);
            setEditingFolderName(folder.name);
          }}
          title="Rename folder"
          aria-label={`Rename ${folder.name}`}
          type="button"
          className={`ui-icon-btn ui-reveal size-7 ${
            isSelected ? 'text-neutral-300 hover:bg-white/15 hover:text-white' : ''
          }`}
        >
          <Edit3 size={12} />
        </button>
        <button
          onClick={() => handleDeleteFolder(folder)}
          title="Delete folder"
          aria-label={`Delete ${folder.name}`}
          type="button"
          className={`ui-icon-btn ui-reveal size-7 mr-1 ${
            isSelected ? 'text-neutral-300 hover:bg-white/15 hover:text-white' : ''
          }`}
        >
          <Trash2 size={12} />
        </button>
      </div>
    );
  };

  return (
    <div className="grid h-full min-h-[540px] grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-[220px_minmax(260px,320px)_minmax(280px,1fr)]">
      <section className="ui-card flex min-h-[300px] flex-col">
        <CardHeader title="FOLDERS" icon={Folder} />

        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          <button
            onClick={() => setSelectedFolder(null)}
            className={`flex h-9 w-full items-center gap-2 rounded px-2 text-left text-small font-bold cursor-pointer ${
              selectedFolder === null ? 'bg-ink text-white' : 'hover:bg-hover'
            }`}
          >
            <Folder size={14} className="shrink-0" />
            <span>All notes</span>
          </button>
          <button
            onClick={() => setSelectedFolder(UNFILED)}
            className={`flex h-9 w-full items-center gap-2 rounded px-2 text-left text-small cursor-pointer ${
              selectedFolder === UNFILED
                ? 'bg-ink text-white'
                : 'hover:bg-hover'
            }`}
          >
            <Folder size={14} className="shrink-0" />
            <span>Unfiled</span>
          </button>
          {isFoldersLoading ? (
            <p className="px-2 py-2 text-meta text-muted">
              폴더를 불러오는 중...
            </p>
          ) : (
            folders.map(renderFolderRow)
          )}
          <ErrorAlert message={foldersError} onRetry={onRetryFolders} className="mt-2 px-3 py-2" />
        </div>

        <form onSubmit={handleCreateFolder} className="mt-3 flex items-center gap-2">
          <input
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            placeholder="Folder name"
            aria-label="New folder name"
            className="ui-input flex-1"
          />
          <button
            type="submit"
            disabled={!newFolderName.trim() || isFoldersLoading}
            aria-label="Create folder"
            className="ui-btn ui-btn-primary size-9 px-0"
          >
            <Plus size={14} />
          </button>
        </form>

        <div className="mt-4 border-t border-line-soft pt-3">
          <h3 className="px-2 text-meta font-bold tracking-[0.04em] text-muted">TAGS</h3>
          {availableTags.length === 0 ? (
            <p className="px-2 py-1 text-meta text-muted">No tags yet.</p>
          ) : (
            <div className="mt-1 max-h-28 space-y-0.5 overflow-y-auto">
              {availableTags.map((tag) => {
                const isSelected = selectedTag === tag;
                const count = folderNotes.filter((note) =>
                  (note.tags || []).includes(tag),
                ).length;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(isSelected ? null : tag)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-meta cursor-pointer ${
                      isSelected ? 'bg-ink text-white' : 'hover:bg-hover'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2 truncate">
                      <Tag size={12} className="shrink-0" />
                      {tag}
                    </span>
                    <span className={isSelected ? 'text-neutral-300' : 'text-muted'}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="ui-card flex min-h-[300px] flex-col">
        <div className="ui-card-header">
          <h2 className="ui-card-title">
            <FileText size={16} className="shrink-0" aria-hidden="true" />
            <span className="truncate">NOTES</span>
          </h2>
          <button
            onClick={handleCreateNote}
            disabled={isLoading || (selectedFolder && selectedFolder !== UNFILED && isFoldersLoading)}
            className="ui-btn ui-btn-primary h-8 px-2.5"
          >
            <Plus size={12} /> NEW
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="ui-empty">
              노트를 불러오는 중...
            </div>
          ) : visibleNotes.length === 0 ? (
            <div className="ui-empty">
              No notes found.
            </div>
          ) : (
            visibleNotes.map((note) => {
              const isSelected = activeNote?.id === note.id;
              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedId(note.id)}
                  className={`group flex cursor-pointer items-start justify-between gap-2 border-b border-line-soft py-3 ${
                    isSelected ? 'bg-subtle' : 'hover:bg-canvas'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-small font-bold">
                      {note.title}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(note.tags || []).map((tag) => (
                        <span
                          key={tag}
                          className="ui-tag"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleToggleFavorite(note);
                    }}
                    aria-label={`${note.isFavorite ? 'Remove' : 'Add'} ${note.title} ${note.isFavorite ? 'from' : 'to'} favorites`}
                    aria-pressed={note.isFavorite}
                    title={note.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    className={`ui-icon-btn size-7 ${
                      note.isFavorite ? 'text-amber-500 hover:text-amber-600' : 'hover:text-amber-600'
                    }`}
                  >
                    <Star size={14} fill={note.isFavorite ? 'currentColor' : 'none'} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="ui-card flex min-h-[420px] min-w-0 flex-col md:col-span-2 xl:col-span-1">
        {activeNote ? (
          <>
            <div className="ui-card-header">
              <h2 className="ui-card-title">
                <Edit3 size={16} className="shrink-0" aria-hidden="true" />
                <span className="truncate">EDITOR</span>
              </h2>
              <div className="-mr-2 flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setIsPreview(!isPreview)}
                  aria-label={isPreview ? 'Edit note' : 'Preview note'}
                  title={isPreview ? 'Edit note' : 'Preview note'}
                  className="ui-icon-btn"
                >
                  {isPreview ? <Edit3 size={15} /> : <Eye size={15} />}
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleFavorite(activeNote)}
                  aria-label={activeNote.isFavorite ? 'Remove note from favorites' : 'Add note to favorites'}
                  aria-pressed={activeNote.isFavorite}
                  title={activeNote.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  className={`ui-icon-btn ${
                    activeNote.isFavorite ? 'text-amber-500 hover:text-amber-600' : ''
                  }`}
                >
                  <Star size={16} fill={activeNote.isFavorite ? 'currentColor' : 'none'} />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(activeNote)}
                  aria-label="Move note to trash"
                  title="Move to Trash"
                  className="ui-icon-btn hover:text-red-700"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={activeNote.title}
                onChange={(event) => handleUpdate('title', event.target.value)}
                aria-label="Note title"
                className="ui-input flex-1 text-body font-bold"
              />
              <select
                value={activeNote.folderId || ''}
                onChange={(event) =>
                  handleUpdate('folderId', event.target.value || null)
                }
                aria-label="Note folder"
                disabled={isFoldersLoading}
                className="ui-input bg-surface px-2 sm:w-36"
              >
                <option value="">Unfiled</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              {(activeNote.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="ui-tag py-1 text-ink"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Remove ${tag} tag`}
                    className="cursor-pointer rounded-sm text-muted hover:text-ink"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <form onSubmit={handleAddTag} className="flex items-center gap-1">
                <input
                  value={newTag}
                  onChange={(event) => setNewTag(event.target.value)}
                  placeholder="Add tag"
                  aria-label="Add note tag"
                  className="ui-input h-8 w-32 px-2 text-meta"
                />
                <button
                  type="submit"
                  disabled={!newTag.trim()}
                  aria-label="Add tag"
                  className="ui-icon-btn"
                >
                  <Plus size={14} />
                </button>
              </form>
            </div>

            {isPreview ? (
              <div className="flex-1 overflow-y-auto whitespace-pre-wrap break-words rounded border border-line-soft bg-canvas p-4 text-body">
                {activeNote.content}
              </div>
            ) : (
              <textarea
                value={activeNote.content}
                onChange={(event) => handleUpdate('content', event.target.value)}
                placeholder="Write markdown..."
                className="ui-input h-auto min-h-[280px] flex-1 resize-none p-4 text-body"
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-body text-muted">
            Select or create a new note to start writing.
          </div>
        )}
      </section>
    </div>
  );
}
