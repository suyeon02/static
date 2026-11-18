import React, { useEffect, useState } from 'react';
import {
  Bold,
  Check,
  Edit3,
  Eye,
  FileText,
  Folder,
  Highlighter,
  Plus,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import ErrorAlert from '../common/ErrorAlert';
import normalizeTags from '../../lib/normalizeTags';

const UNFILED = 'unfiled';

const TEXT_COLORS = [
  { label: 'Default', value: '#191919' },
  { label: 'Orange', value: '#ff7a30' },
  { label: 'Red', value: '#e5484d' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Green', value: '#30a46c' },
];

const HIGHLIGHT_COLORS = [
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Orange Soft', value: '#ffedd5' },
  { label: 'Mint', value: '#d1fae5' },
  { label: 'Pink', value: '#fce7f3' },
];

const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i;

function escapeHTML(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toEditorHTML(content) {
  const value = String(content || '');
  if (!value) return '';
  if (HTML_TAG_RE.test(value)) return value;
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => (line ? `<p>${escapeHTML(line)}</p>` : '<p></p>'))
    .join('');
}

function RichNoteEditor({ note, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: toEditorHTML(note.content),
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentHTML = editor.getHTML();
    const nextHTML = toEditorHTML(note.content);
    if (nextHTML !== currentHTML) {
      editor.commands.setContent(nextHTML, false);
    }
  }, [note.id, editor]);

  if (!editor) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-md border border-line-soft bg-subtle px-2 py-1.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-pressed={editor.isActive('bold')}
          title="굵게 (Ctrl+B)"
          className={`flex h-7 w-7 items-center justify-center rounded border text-xs font-bold transition-colors cursor-pointer ${
            editor.isActive('bold')
              ? 'border-ink bg-ink text-white'
              : 'border-line-soft bg-canvas text-ink hover:bg-hover'
          }`}
        >
          <Bold size={13} />
        </button>

        <div className="mx-0.5 h-4 w-px bg-line-soft" />

        <div className="flex items-center gap-1" title="글자 색상">
          <span className="px-1 text-[11px] font-bold text-muted">A</span>
          {TEXT_COLORS.map((c) => {
            const isActive = editor.isActive('textStyle', { color: c.value });
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  if (c.value === '#191919') {
                    editor.chain().focus().unsetColor().run();
                  } else {
                    editor.chain().focus().setColor(c.value).run();
                  }
                }}
                title={`글자색: ${c.label}`}
                aria-label={`Text color ${c.label}`}
                className={`h-5 w-5 rounded-full border transition-transform cursor-pointer ${
                  isActive
                    ? 'scale-110 ring-2 ring-ink ring-offset-1'
                    : 'border-black/15 hover:scale-105'
                }`}
                style={{ backgroundColor: c.value }}
              />
            );
          })}
        </div>

        <div className="mx-0.5 h-4 w-px bg-line-soft" />

        <div className="flex items-center gap-1" title="형광펜">
          <Highlighter size={13} className="mx-1 text-muted" />
          {HIGHLIGHT_COLORS.map((h) => {
            const isActive = editor.isActive('highlight', { color: h.value });
            return (
              <button
                key={h.value}
                type="button"
                onClick={() =>
                  editor.chain().focus().toggleHighlight({ color: h.value }).run()
                }
                title={`형광펜: ${h.label}`}
                aria-label={`Highlight ${h.label}`}
                className={`h-5 w-5 rounded border transition-transform cursor-pointer ${
                  isActive
                    ? 'scale-110 ring-2 ring-ink ring-offset-1'
                    : 'border-black/15 hover:scale-105'
                }`}
                style={{ backgroundColor: h.value }}
              />
            );
          })}
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetHighlight().run()}
            title="형광펜 지우기"
            className="ml-0.5 rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-ink cursor-pointer"
          >
            해제
          </button>
        </div>
      </div>

      <div className="tiptap-editor-wrapper ui-input flex-1 overflow-y-auto p-4 text-body leading-relaxed min-h-[200px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

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
  const [selectedId, setSelectedId] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderForm, setShowFolderForm] = useState(false);

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

  const activeNote = selectedId
    ? notes.find((note) => note.id === selectedId)
    : null;

  const activeFolderId =
    selectedFolder && selectedFolder !== UNFILED ? selectedFolder : null;

  const handleCreateNote = async () => {
    try {
      const newNote = await onCreateNote({
        title: `untitled_${notes.length + 1}`,
        content: '<p>Start writing your note here...</p>',
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
      setShowFolderForm(false);
      setSelectedFolder(folder.id);
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
      if (selectedId === note.id) {
        setSelectedId(null);
      }
    } catch {
      // The persistence hook displays the error.
    }
  };

  const closeEditor = () => {
    setSelectedId(null);
    setIsPreview(false);
  };

  return (
    <div className="relative flex h-[calc(100dvh-210px)] min-h-[460px] flex-col md:h-full md:min-h-[540px]">
      {/* ── Top bar: Folder filter + Actions ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Folder size={16} className="text-muted" />
          <select
            value={selectedFolder ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedFolder(val === '' ? null : val === UNFILED ? UNFILED : val);
              setSelectedTag(null);
            }}
            className="ui-input h-9 min-w-[140px] bg-surface px-2.5 text-small"
          >
            <option value="">All notes</option>
            <option value={UNFILED}>Unfiled</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowFolderForm((v) => !v)}
          className="ui-btn h-9 px-3 text-small"
        >
          <Plus size={13} />
          Folder
        </button>

        <div className="ml-auto">
          <button
            onClick={handleCreateNote}
            disabled={isLoading || isFoldersLoading}
            className="ui-btn ui-btn-primary h-9 px-3"
          >
            <Plus size={14} />
            New note
          </button>
        </div>
      </div>

      {/* New folder form */}
      {showFolderForm && (
        <form
          onSubmit={handleCreateFolder}
          className="mb-4 flex items-center gap-2 rounded-md border border-line-soft bg-subtle p-3"
        >
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            className="ui-input h-9 flex-1 text-small"
          />
          <button
            type="submit"
            disabled={!newFolderName.trim()}
            className="ui-btn ui-btn-primary h-9 px-3"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => {
              setShowFolderForm(false);
              setNewFolderName('');
            }}
            className="ui-icon-btn"
          >
            <X size={16} />
          </button>
        </form>
      )}

      <ErrorAlert message={foldersError} onRetry={onRetryFolders} className="mb-3" />

      {/* Tags filter */}
      {availableTags.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-meta text-muted">Tags:</span>
          {availableTags.map((tag) => {
            const isActive = selectedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(isActive ? null : tag)}
                className={`rounded-full px-2.5 py-1 text-meta transition-colors ${
                  isActive
                    ? 'bg-ink text-white'
                    : 'bg-subtle text-muted hover:bg-hover hover:text-ink'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Notes list (main content) ── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="ui-empty py-16">노트를 불러오는 중...</div>
        ) : visibleNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <FileText size={32} className="text-muted opacity-40" />
            <p className="text-body text-muted">No notes found.</p>
            <button
              onClick={handleCreateNote}
              className="ui-btn ui-btn-primary mt-2"
            >
              <Plus size={14} /> Create first note
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleNotes.map((note) => {
              const isActive = selectedId === note.id;
              return (
                <li key={note.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(note.id);
                      setIsPreview(false);
                    }}
                    className={`group flex w-full flex-col rounded-lg border p-4 text-left transition-all ${
                      isActive
                        ? 'border-ink bg-subtle shadow-sm'
                        : 'border-line-soft bg-surface hover:border-line hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-[15px] font-semibold leading-snug text-foreground">
                        {note.title}
                      </h3>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleToggleFavorite(note);
                        }}
                        className={`shrink-0 ${
                          note.isFavorite
                            ? 'text-amber-500'
                            : 'text-muted opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Star
                          size={14}
                          fill={note.isFavorite ? 'currentColor' : 'none'}
                        />
                      </span>
                    </div>

                    {(note.tags || []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(note.tags || []).slice(0, 3).map((tag) => (
                          <span key={tag} className="ui-tag text-[11px]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="mt-2 line-clamp-2 text-meta text-muted">
                      {note.content
                        ? note.content.replace(/<[^>]+>/g, ' ').slice(0, 80)
                        : 'Empty note'}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Editor overlay (slides in from right) ── */}
      {activeNote && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 md:bg-black/10"
            onClick={closeEditor}
          />

          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-full flex-col border-l border-line bg-surface shadow-xl md:max-w-[640px]">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <Edit3 size={16} className="shrink-0 text-muted" />
                <span className="truncate text-small font-bold">EDITOR</span>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setIsPreview(!isPreview)}
                  className="ui-icon-btn"
                  title={isPreview ? 'Edit' : 'Preview'}
                >
                  {isPreview ? <Edit3 size={15} /> : <Eye size={15} />}
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleFavorite(activeNote)}
                  className={`ui-icon-btn ${
                    activeNote.isFavorite ? 'text-amber-500' : ''
                  }`}
                >
                  <Star
                    size={15}
                    fill={activeNote.isFavorite ? 'currentColor' : 'none'}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(activeNote)}
                  className="ui-icon-btn hover:text-red-700"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="ui-icon-btn ml-1"
                  aria-label="Close editor"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => handleUpdate('title', e.target.value)}
                  className="ui-input flex-1 text-[15px] font-semibold"
                  placeholder="Note title"
                />
                <select
                  value={activeNote.folderId || ''}
                  onChange={(e) =>
                    handleUpdate('folderId', e.target.value || null)
                  }
                  disabled={isFoldersLoading}
                  className="ui-input h-9 bg-surface px-2.5 text-small sm:w-36"
                >
                  <option value="">Unfiled</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                {(activeNote.tags || []).map((tag) => (
                  <span key={tag} className="ui-tag py-1 text-ink">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-0.5 text-muted hover:text-ink"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <form onSubmit={handleAddTag} className="flex items-center gap-1">
                  <input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag"
                    className="ui-input h-8 w-28 px-2 text-meta"
                  />
                  <button
                    type="submit"
                    disabled={!newTag.trim()}
                    className="ui-icon-btn"
                  >
                    <Plus size={14} />
                  </button>
                </form>
              </div>

              {isPreview ? (
                <div
                  className="tiptap-editor-wrapper flex-1 overflow-y-auto break-words rounded-md border border-line-soft bg-canvas p-4 text-body leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: toEditorHTML(activeNote.content),
                  }}
                />
              ) : (
                <RichNoteEditor
                  note={activeNote}
                  onChange={(html) => handleUpdate('content', html)}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}