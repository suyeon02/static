import React, { useState } from 'react';
import {
  Check,
  Edit3,
  Eye,
  Folder,
  Plus,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
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
            className="min-w-0 flex-1 border border-black/30 rounded px-2 py-1 text-[12px] outline-none focus:border-black"
          />
          <button
            type="submit"
            disabled={!editingFolderName.trim()}
            aria-label="Save folder name"
            className="p-1 cursor-pointer disabled:opacity-40"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={() => setEditingFolderId(null)}
            aria-label="Cancel renaming folder"
            className="p-1 cursor-pointer"
          >
            <X size={14} />
          </button>
        </form>
      );
    }

    return (
      <div
        key={folder.id}
        className={`group flex items-center rounded-[4px] ${
          isSelected ? 'bg-black text-white' : 'hover:bg-[#EAEAEA]'
        }`}
      >
        <button
          onClick={() => setSelectedFolder(folder.id)}
          className="flex min-w-0 flex-1 items-center gap-2 p-2 text-left text-[12px] cursor-pointer"
        >
          <Folder size={14} className="shrink-0" />
          <span className="truncate">{folder.name}</span>
          <span
            className={`ml-auto text-[10px] ${
              isSelected ? 'text-neutral-300' : 'text-[#666666]'
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
          className={`p-1 opacity-0 group-hover:opacity-100 cursor-pointer ${
            isSelected ? 'text-neutral-300 hover:text-white' : 'text-[#666666]'
          }`}
        >
          <Edit3 size={12} />
        </button>
        <button
          onClick={() => handleDeleteFolder(folder)}
          title="Delete folder"
          aria-label={`Delete ${folder.name}`}
          className={`mr-1 p-1 opacity-0 group-hover:opacity-100 cursor-pointer ${
            isSelected ? 'text-neutral-300 hover:text-white' : 'text-[#666666]'
          }`}
        >
          <Trash2 size={12} />
        </button>
      </div>
    );
  };

  return (
    <div className="grid h-full min-h-[540px] grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-[220px_minmax(260px,320px)_minmax(280px,1fr)]">
      <section className="flex min-h-[300px] flex-col rounded-[8px] border border-[#CCCCCC] bg-white p-5">
        <div className="mb-3 border-b border-[#E6E6E6] pb-3">
          <h2 className="text-[13px] font-bold">// FOLDERS</h2>
        </div>

        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          <button
            onClick={() => setSelectedFolder(null)}
            className={`flex w-full items-center gap-2 rounded-[4px] px-2 py-2 text-left text-[12px] font-bold cursor-pointer ${
              selectedFolder === null ? 'bg-black text-white' : 'hover:bg-[#EAEAEA]'
            }`}
          >
            <Folder size={14} className="shrink-0" />
            <span>All notes</span>
          </button>
          <button
            onClick={() => setSelectedFolder(UNFILED)}
            className={`flex w-full items-center gap-2 rounded-[4px] px-2 py-2 text-left text-[12px] cursor-pointer ${
              selectedFolder === UNFILED
                ? 'bg-black text-white'
                : 'hover:bg-[#EAEAEA]'
            }`}
          >
            <Folder size={14} className="shrink-0" />
            <span>Unfiled</span>
          </button>
          {isFoldersLoading ? (
            <p className="px-2 py-2 text-[11px] text-[#666666]">
              폴더를 불러오는 중...
            </p>
          ) : (
            folders.map(renderFolderRow)
          )}
          {foldersError && (
            <div
              role="alert"
              className="mt-2 rounded border border-red-300 bg-red-50 p-2 text-[11px] text-red-800"
            >
              <p>{foldersError}</p>
              <button
                onClick={onRetryFolders}
                className="mt-1 font-bold underline cursor-pointer"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleCreateFolder} className="mt-3 flex items-center gap-2">
          <input
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            placeholder="Folder name"
            aria-label="New folder name"
            className="min-w-0 flex-1 rounded-[4px] border border-[#CCCCCC] px-3 py-2 text-[11px] outline-none focus:border-black"
          />
          <button
            type="submit"
            disabled={!newFolderName.trim() || isFoldersLoading}
            aria-label="Create folder"
            className="rounded-[4px] bg-black p-2.5 text-white cursor-pointer hover:bg-neutral-800 disabled:opacity-40"
          >
            <Plus size={14} />
          </button>
        </form>

        <div className="mt-4 border-t border-[#E6E6E6] pt-3">
          <h3 className="px-1 text-[10px] font-bold text-[#666666]">// TAGS</h3>
          {availableTags.length === 0 ? (
            <p className="px-1 py-1 text-[11px] text-[#666666]">No tags yet.</p>
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
                    className={`flex w-full items-center justify-between rounded-[4px] px-2 py-1.5 text-left text-[11px] cursor-pointer ${
                      isSelected ? 'bg-black text-white' : 'hover:bg-[#EAEAEA]'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2 truncate">
                      <Tag size={12} className="shrink-0" />
                      {tag}
                    </span>
                    <span className={isSelected ? 'text-neutral-300' : 'text-[#666666]'}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="flex min-h-[300px] flex-col rounded-[8px] border border-[#CCCCCC] bg-white p-5">
        <div className="mb-3 flex items-center justify-between border-b border-[#E6E6E6] pb-3">
          <h2 className="text-[13px] font-bold">// NOTES</h2>
          <button
            onClick={handleCreateNote}
            disabled={isLoading || (selectedFolder && selectedFolder !== UNFILED && isFoldersLoading)}
            className="flex items-center gap-1 rounded-[4px] bg-black px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer hover:bg-neutral-800 disabled:opacity-40"
          >
            <Plus size={12} /> NEW
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-[12px] text-[#666666]">
              노트를 불러오는 중...
            </div>
          ) : visibleNotes.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-[#666666]">
              No notes found.
            </div>
          ) : (
            visibleNotes.map((note) => {
              const isSelected = activeNote?.id === note.id;
              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedId(note.id)}
                  className={`group flex cursor-pointer items-start justify-between gap-2 border-b border-[#F0F0F0] py-3 ${
                    isSelected ? 'bg-[#F8F8F8]' : 'hover:bg-[#FAFAFA]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-bold">
                      {note.title}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(note.tags || []).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-[4px] border border-[#666666] px-1.5 py-0.5 text-[9px] uppercase leading-tight"
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
                    className={`shrink-0 p-1 cursor-pointer ${
                      note.isFavorite ? 'text-amber-600' : 'text-[#666666] hover:text-amber-600'
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

      <section className="flex min-h-[420px] min-w-0 flex-col rounded-[8px] border border-[#CCCCCC] bg-white p-5 md:col-span-2 xl:col-span-1">
        {activeNote ? (
          <>
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#E6E6E6] pb-3">
              <h2 className="text-[13px] font-bold">// EDITOR</h2>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreview(!isPreview)}
                  aria-label={isPreview ? 'Edit note' : 'Preview note'}
                  title={isPreview ? 'Edit note' : 'Preview note'}
                  className="cursor-pointer text-[#666666] hover:text-black"
                >
                  {isPreview ? <Edit3 size={15} /> : <Eye size={15} />}
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleFavorite(activeNote)}
                  aria-label={activeNote.isFavorite ? 'Remove note from favorites' : 'Add note to favorites'}
                  aria-pressed={activeNote.isFavorite}
                  title={activeNote.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  className={`shrink-0 cursor-pointer ${
                    activeNote.isFavorite ? 'text-amber-500' : 'text-[#666666] hover:text-black'
                  }`}
                >
                  <Star size={16} fill={activeNote.isFavorite ? 'currentColor' : 'none'} />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(activeNote)}
                  aria-label="Move note to trash"
                  title="Move to Trash"
                  className="shrink-0 cursor-pointer text-[#666666] hover:text-black"
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
                className="min-w-0 flex-1 rounded-[4px] border border-[#CCCCCC] px-3 py-2 text-[12px] outline-none focus:border-black"
              />
              <select
                value={activeNote.folderId || ''}
                onChange={(event) =>
                  handleUpdate('folderId', event.target.value || null)
                }
                aria-label="Note folder"
                disabled={isFoldersLoading}
                className="w-full rounded-[4px] border border-[#CCCCCC] bg-white px-2 py-2 text-[11px] outline-none focus:border-black sm:w-36"
              >
                <option value="">Unfiled</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              {(activeNote.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-[4px] border border-[#666666] px-1.5 py-0.5 text-[9px] uppercase"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Remove ${tag} tag`}
                    className="cursor-pointer text-[#666666] hover:text-black"
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
                  className="w-32 rounded-[4px] border border-[#CCCCCC] px-3 py-2 text-[11px] outline-none focus:border-black"
                />
                <button
                  type="submit"
                  disabled={!newTag.trim()}
                  aria-label="Add tag"
                  className="p-1 cursor-pointer disabled:opacity-40"
                >
                  <Plus size={14} />
                </button>
              </form>
            </div>

            {isPreview ? (
              <div className="flex-1 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed bg-[#F8F8F8] p-4 rounded-[4px] border border-[#E6E6E6]">
                {activeNote.content}
              </div>
            ) : (
              <textarea
                value={activeNote.content}
                onChange={(event) => handleUpdate('content', event.target.value)}
                placeholder="Write markdown..."
                className="min-h-[280px] flex-1 w-full resize-none rounded-[4px] border border-[#E6E6E6] bg-[#F0F0F0] p-4 text-[13px] leading-relaxed outline-none focus:border-black"
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[13px] text-[#666666]">
            Select or create a new note to start writing.
          </div>
        )}
      </section>
    </div>
  );
}
