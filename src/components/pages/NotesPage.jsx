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
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
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
      setIsCreatingFolder(false);
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
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full min-h-[540px]">
      <div className="md:col-span-4 lg:col-span-3 bg-white border border-[#CCCCCC] rounded-[8px] p-4 flex flex-col">
        <div className="flex items-center justify-between border-b border-[#E6E6E6] pb-3 mb-3">
          <span className="text-[13px] font-bold">// NOTES ({visibleNotes.length})</span>
          <button
            onClick={handleCreateNote}
            disabled={isLoading || (selectedFolder && selectedFolder !== UNFILED && isFoldersLoading)}
            className="px-2.5 py-1 bg-black text-white text-[11px] font-bold rounded-[4px] flex items-center gap-1 cursor-pointer hover:bg-neutral-800 disabled:opacity-40"
          >
            <Plus size={12} /> NEW
          </button>
        </div>

        <div className="mb-3 space-y-0.5 border-b border-[#E6E6E6] pb-3">
          <button
            onClick={() => setSelectedFolder(null)}
            className={`flex w-full items-center justify-between rounded-[4px] px-2 py-1.5 text-left text-[12px] cursor-pointer ${
              selectedFolder === null ? 'bg-black text-white' : 'hover:bg-[#EAEAEA]'
            }`}
          >
            <span>All notes</span>
            <span>{notes.length}</span>
          </button>
          <button
            onClick={() => setSelectedFolder(UNFILED)}
            className={`flex w-full items-center justify-between rounded-[4px] px-2 py-1.5 text-left text-[12px] cursor-pointer ${
              selectedFolder === UNFILED
                ? 'bg-black text-white'
                : 'hover:bg-[#EAEAEA]'
            }`}
          >
            <span>Unfiled</span>
            <span>{notes.filter((note) => !note.folderId).length}</span>
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
          {isCreatingFolder ? (
            <form onSubmit={handleCreateFolder} className="flex items-center gap-1 p-1">
              <input
                autoFocus
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                placeholder="Folder name"
                aria-label="New folder name"
                className="min-w-0 flex-1 border border-black/30 rounded px-2 py-1 text-[12px] outline-none focus:border-black"
              />
              <button
                type="submit"
                disabled={!newFolderName.trim() || isFoldersLoading}
                aria-label="Create folder"
                className="p-1 cursor-pointer disabled:opacity-40"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                }}
                aria-label="Cancel creating folder"
                className="p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsCreatingFolder(true)}
              disabled={isFoldersLoading}
              className="flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-[11px] text-[#666666] hover:bg-[#F5F5F5] hover:text-black cursor-pointer disabled:opacity-40"
            >
              <Plus size={13} /> New folder
            </button>
          )}
        </div>

        <div className="mb-3 border-b border-[#E6E6E6] pb-3">
          <div className="px-2 pb-1 text-[10px] font-bold text-[#666666]">
            TAGS
          </div>
          {availableTags.length === 0 ? (
            <p className="px-2 py-1 text-[11px] text-[#666666]">No tags yet.</p>
          ) : (
            <div className="space-y-0.5">
              {availableTags.map((tag) => {
                const isSelected = selectedTag === tag;
                const count = folderNotes.filter((note) =>
                  (note.tags || []).includes(tag),
                ).length;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(isSelected ? null : tag)}
                    className={`flex w-full items-center justify-between rounded-[4px] px-2 py-1.5 text-left text-[12px] cursor-pointer ${
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

        <div className="flex-1 overflow-y-auto space-y-1.5">
          {isLoading ? (
            <div className="text-[12px] text-[#666666] py-8 text-center">
              노트를 불러오는 중...
            </div>
          ) : visibleNotes.length === 0 ? (
            <div className="text-[12px] text-[#666666] py-8 text-center">
              No notes found.
            </div>
          ) : (
            visibleNotes.map((note) => {
              const isSelected = activeNote?.id === note.id;
              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedId(note.id)}
                  className={`flex items-center justify-between p-2.5 rounded-[4px] cursor-pointer group ${
                    isSelected
                      ? 'bg-black text-white'
                      : 'bg-[#F5F5F5] hover:bg-[#EAEAEA] text-black'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className="shrink-0" />
                    <div className="truncate">
                      <div className="text-[12px] font-bold truncate">
                        {note.title}
                      </div>
                      <div
                        className={`text-[10px] ${
                          isSelected ? 'text-neutral-300' : 'text-[#666666]'
                        }`}
                      >
                        {note.updatedAt}
                      </div>
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
                    className={`p-1 cursor-pointer ${
                      note.isFavorite ? 'text-amber-500' : 'text-[#666666] opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <Star size={13} fill={note.isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(note);
                    }}
                    className={`p-1 opacity-0 group-hover:opacity-100 cursor-pointer ${
                      isSelected
                        ? 'text-neutral-300 hover:text-white'
                        : 'text-[#666666] hover:text-black'
                    }`}
                    title="Move to Trash"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="md:col-span-8 lg:col-span-9 bg-white border border-[#CCCCCC] rounded-[8px] p-5 flex flex-col">
        {activeNote ? (
          <>
            <div className="flex items-center justify-between border-b border-[#E6E6E6] pb-3 mb-4 gap-3">
              <input
                type="text"
                value={activeNote.title}
                onChange={(event) => handleUpdate('title', event.target.value)}
                className="text-[16px] font-bold bg-transparent outline-none flex-1 min-w-0"
              />
              <select
                value={activeNote.folderId || ''}
                onChange={(event) =>
                  handleUpdate('folderId', event.target.value || null)
                }
                aria-label="Note folder"
                disabled={isFoldersLoading}
                className="max-w-40 border border-black/20 rounded-[4px] px-2 py-1.5 text-[11px] bg-white"
              >
                <option value="">Unfiled</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  void handleToggleFavorite(activeNote)
                }
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
                onClick={() => setIsPreview(!isPreview)}
                className="px-3 py-1.5 border border-black/30 rounded-[4px] text-[11px] font-bold flex items-center gap-1.5 hover:border-black cursor-pointer shrink-0"
              >
                {isPreview ? (
                  <>
                    <Edit3 size={13} /> EDIT
                  </>
                ) : (
                  <>
                    <Eye size={13} /> PREVIEW
                  </>
                )}
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              {(activeNote.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-[#F0F0F0] px-2.5 py-1 text-[11px]"
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
                  className="w-28 border border-black/20 rounded-[4px] px-2 py-1 text-[11px] outline-none focus:border-black"
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
                className="flex-1 w-full resize-none outline-none text-[13px] leading-relaxed bg-[#F5F5F5] p-4 rounded-[4px] border border-black/10 focus:border-black"
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[13px] text-[#666666]">
            Select or create a new note to start writing.
          </div>
        )}
      </div>
    </div>
  );
}
