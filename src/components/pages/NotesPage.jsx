import React, { useEffect, useState } from 'react';
import {
  Bold,
  Check,
  Edit3,
  Eye,
  FileText,
  Folder,
  Highlighter,
  List,
  ListOrdered,
  Pencil,
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

        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleBulletList().run()
          }
          aria-label="글머리 목록"
          aria-pressed={editor.isActive('bulletList')}
          title="글머리 목록"
          className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded border text-xs transition-colors ${
            editor.isActive('bulletList')
              ? 'border-ink bg-ink text-white'
              : 'border-line-soft bg-canvas text-ink hover:bg-hover'
          }`}
        >
          <List size={15} />
        </button>

        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
          aria-label="숫자 목록"
          aria-pressed={editor.isActive('orderedList')}
          title="숫자 목록"
          className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded border text-xs transition-colors ${
            editor.isActive('orderedList')
              ? 'border-ink bg-ink text-white'
              : 'border-line-soft bg-canvas text-ink hover:bg-hover'
          }`}
        >
          <ListOrdered size={15} />
        </button>

        <div className="mx-0.5 h-4 w-px bg-line-soft" />

        <div className="flex items-center gap-1" title="글자 색상">
          <span className="px-1 text-[11px] font-bold text-muted">
            A
          </span>

          {TEXT_COLORS.map((color) => {
            const isActive = editor.isActive('textStyle', {
              color: color.value,
            });

            return (
              <button
                key={color.value}
                type="button"
                onClick={() => {
                  if (color.value === '#191919') {
                    editor.chain().focus().unsetColor().run();
                  } else {
                    editor.chain().focus().setColor(color.value).run();
                  }
                }}
                title={`글자색: ${color.label}`}
                aria-label={`글자색 ${color.label}`}
                className={`h-5 w-5 rounded-full border transition-transform cursor-pointer ${
                  isActive
                    ? 'scale-110 ring-2 ring-ink ring-offset-1'
                    : 'border-black/15 hover:scale-105'
                }`}
                style={{ backgroundColor: color.value }}
              />
            );
          })}
        </div>

        <div className="mx-0.5 h-4 w-px bg-line-soft" />

        <div className="flex items-center gap-1" title="형광펜">
          <Highlighter
            size={13}
            className="mx-1 text-muted"
            aria-hidden="true"
          />

          {HIGHLIGHT_COLORS.map((highlight) => {
            const isActive = editor.isActive('highlight', {
              color: highlight.value,
            });

            return (
              <button
                key={highlight.value}
                type="button"
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .toggleHighlight({ color: highlight.value })
                    .run()
                }
                title={`형광펜: ${highlight.label}`}
                aria-label={`형광펜 ${highlight.label}`}
                className={`h-5 w-5 rounded border transition-transform cursor-pointer ${
                  isActive
                    ? 'scale-110 ring-2 ring-ink ring-offset-1'
                    : 'border-black/15 hover:scale-105'
                }`}
                style={{ backgroundColor: highlight.value }}
              />
            );
          })}

          <button
            type="button"
            onClick={() =>
              editor.chain().focus().unsetHighlight().run()
            }
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
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renamingFolderName, setRenamingFolderName] = useState('');
  const [isRenamingFolder, setIsRenamingFolder] = useState(false);

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
    ? folderNotes.filter((note) =>
        (note.tags || []).includes(selectedTag),
      )
    : folderNotes;

  const activeNote = selectedId
    ? notes.find((note) => note.id === selectedId)
    : null;

  const activeFolderId =
    selectedFolder && selectedFolder !== UNFILED
      ? selectedFolder
      : null;

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

  const handleRenameFolder = async (event) => {
    event.preventDefault();

    const name = renamingFolderName.trim();

    if (!name || !renamingFolderId) return;

    setIsRenamingFolder(true);

    try {
      await onRenameFolder(renamingFolderId, name);

      setRenamingFolderId(null);
      setRenamingFolderName('');
    } catch (error) {
      console.error('폴더 이름 변경 실패:', error);
    } finally {
      setIsRenamingFolder(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (isDeletingFolder) return;

    const folder = folders.find(
      (item) => item.id === selectedFolder,
    );

    if (!folder) return;

    if (!window.confirm(`"${folder.name}" 폴더를 삭제할까요?`)) {
      return;
    }

    setIsDeletingFolder(true);

    try {
      await onDeleteFolder(folder.id);

      setSelectedFolder(null);
      setSelectedTag(null);
    } catch (error) {
      console.error('폴더 삭제 실패:', error);
    } finally {
      setIsDeletingFolder(false);
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

    handleUpdate(
      'tags',
      normalizeTags([...(activeNote.tags || []), tag]),
    );

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
      {/* ── Mobile top bar ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3 md:hidden">
        <div className="flex items-center gap-2">
          <Folder
            size={16}
            className="text-muted"
            aria-hidden="true"
          />

          <select
            value={selectedFolder ?? ''}
            onChange={(event) => {
              const value = event.target.value;

              setSelectedFolder(
                value === ''
                  ? null
                  : value === UNFILED
                    ? UNFILED
                    : value,
              );
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
          onClick={() => setShowFolderForm((value) => !value)}
          className="ui-btn h-9 px-3 text-small"
        >
          <Plus size={13} aria-hidden="true" />
          Folder
        </button>

        {selectedFolder && selectedFolder !== UNFILED && (
          <button
            type="button"
            onClick={handleDeleteFolder}
            disabled={isDeletingFolder || isFoldersLoading}
            className="ui-btn h-9 px-3 text-small hover:text-red-700"
            title="선택한 폴더 삭제"
            aria-label="선택한 폴더 삭제"
          >
            <Trash2 size={14} aria-hidden="true" />
            {isDeletingFolder ? '삭제 중...' : '폴더 삭제'}
          </button>
        )}

        <div className="ml-auto">
          <button
            type="button"
            onClick={handleCreateNote}
            disabled={isLoading || isFoldersLoading}
            className="ui-btn ui-btn-primary h-9 px-3"
          >
            <Plus size={14} aria-hidden="true" />
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
            onChange={(event) =>
              setNewFolderName(event.target.value)
            }
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
            aria-label="폴더 생성 취소"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </form>
      )}

      <ErrorAlert
        message={foldersError}
        onRetry={onRetryFolders}
        className="mb-3"
      />

      {/* ── PC folder sidebar + notes list ── */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row md:items-start md:gap-5">
        {/* PC-only folder sidebar */}
        <aside className="hidden w-56 shrink-0 flex-col md:flex md:h-[calc(100dvh-260px)] md:min-h-[420px]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-meta font-bold text-muted">
              FOLDERS
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowFolderForm(true)}
                className="ui-icon-btn"
                aria-label="폴더 추가"
                title="폴더 추가"
              >
                <Plus size={14} aria-hidden="true" />
              </button>

              {selectedFolder && selectedFolder !== UNFILED && (
                <button
                  type="button"
                  onClick={handleDeleteFolder}
                  disabled={isDeletingFolder || isFoldersLoading}
                  className="ui-icon-btn hover:text-red-700"
                  aria-label="선택한 폴더 삭제"
                  title="선택한 폴더 삭제"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-lg border border-line-soft bg-surface p-2">
            <button
              type="button"
              onClick={() => {
                setSelectedFolder(null);
                setSelectedTag(null);
              }}
              aria-pressed={selectedFolder === null}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-small transition-colors ${
                selectedFolder === null
                  ? 'bg-ink text-white'
                  : 'text-ink hover:bg-hover'
              }`}
            >
              <FileText size={14} aria-hidden="true" />
              All notes
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedFolder(UNFILED);
                setSelectedTag(null);
              }}
              aria-pressed={selectedFolder === UNFILED}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-small transition-colors ${
                selectedFolder === UNFILED
                  ? 'bg-ink text-white'
                  : 'text-ink hover:bg-hover'
              }`}
            >
              <Folder size={14} aria-hidden="true" />
              Unfiled
            </button>

            {folders.map((folder) => {
              const isActive = selectedFolder === folder.id;
              const isRenaming = renamingFolderId === folder.id;

              if (isRenaming) {
                return (
                  <form
                    key={folder.id}
                    onSubmit={handleRenameFolder}
                    className="flex items-center gap-1 rounded-md bg-subtle px-2 py-1.5"
                  >
                    <input
                      autoFocus
                      value={renamingFolderName}
                      onChange={(event) =>
                        setRenamingFolderName(event.target.value)
                      }
                      disabled={isRenamingFolder}
                      className="ui-input h-8 min-w-0 flex-1 px-2 text-small"
                      aria-label="폴더 이름 변경"
                    />

                    <button
                      type="submit"
                      disabled={
                        isRenamingFolder ||
                        !renamingFolderName.trim()
                      }
                      className="ui-icon-btn"
                      aria-label="폴더 이름 저장"
                      title="폴더 이름 저장"
                    >
                      <Check size={14} aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRenamingFolderId(null);
                        setRenamingFolderName('');
                      }}
                      disabled={isRenamingFolder}
                      className="ui-icon-btn"
                      aria-label="폴더 이름 변경 취소"
                      title="취소"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </form>
                );
              }

              return (
                <div
                  key={folder.id}
                  className={`group flex items-center gap-1 rounded-md transition-colors ${
                    isActive
                      ? 'bg-ink text-white'
                      : 'hover:bg-hover'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFolder(folder.id);
                      setSelectedTag(null);
                    }}
                    aria-pressed={isActive}
                    className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-small"
                  >
                    <Folder
                      size={14}
                      className="shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {folder.name}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRenamingFolderId(folder.id);
                      setRenamingFolderName(folder.name);
                    }}
                    disabled={isRenamingFolder}
                    className={`ui-icon-btn shrink-0 ${
                      isActive ? 'text-white' : 'text-muted'
                    }`}
                    aria-label={`${folder.name} 이름 변경`}
                    title="폴더 이름 변경"
                  >
                    <Pencil size={13} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={handleCreateNote}
              disabled={isLoading || isFoldersLoading}
              className="ui-btn ui-btn-primary w-full"
            >
              <Plus size={14} aria-hidden="true" />
              New note
            </button>
          </div>
        </aside>

        {/* Notes list */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          {/* Tags filter */}
          {availableTags.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-meta text-muted">
                Tags:
              </span>

              {availableTags.map((tag) => {
                const isActive = selectedTag === tag;

                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setSelectedTag(isActive ? null : tag)
                    }
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

          {isLoading ? (
            <div className="ui-empty py-16">
              노트를 불러오는 중...
            </div>
          ) : visibleNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <FileText
                size={32}
                className="text-muted opacity-40"
                aria-hidden="true"
              />
              <p className="text-body text-muted">
                No notes found.
              </p>

              <button
                type="button"
                onClick={handleCreateNote}
                className="ui-btn ui-btn-primary mt-2"
              >
                <Plus size={14} aria-hidden="true" />
                Create first note
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
                          onClick={(event) => {
                            event.stopPropagation();
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
                            fill={
                              note.isFavorite
                                ? 'currentColor'
                                : 'none'
                            }
                            aria-hidden="true"
                          />
                        </span>
                      </div>

                      {(note.tags || []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(note.tags || [])
                            .slice(0, 3)
                            .map((tag) => (
                              <span
                                key={tag}
                                className="ui-tag text-[11px]"
                              >
                                {tag}
                              </span>
                            ))}
                        </div>
                      )}

                      <p className="mt-2 line-clamp-2 text-meta text-muted">
                        {note.content
                          ? note.content
                              .replace(/<[^>]+>/g, ' ')
                              .slice(0, 80)
                          : 'Empty note'}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Editor overlay ── */}
      {activeNote && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 md:bg-black/10"
            onClick={closeEditor}
          />

          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-full flex-col border-l border-line bg-surface shadow-xl md:max-w-[640px]">
            <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <Edit3
                  size={16}
                  className="shrink-0 text-muted"
                  aria-hidden="true"
                />
                <span className="truncate text-small font-bold">
                  EDITOR
                </span>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setIsPreview(!isPreview)}
                  className="ui-icon-btn"
                  title={isPreview ? 'Edit' : 'Preview'}
                >
                  {isPreview ? (
                    <Edit3 size={15} aria-hidden="true" />
                  ) : (
                    <Eye size={15} aria-hidden="true" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleToggleFavorite(activeNote)
                  }
                  className={`ui-icon-btn ${
                    activeNote.isFavorite
                      ? 'text-amber-500'
                      : ''
                  }`}
                >
                  <Star
                    size={15}
                    fill={
                      activeNote.isFavorite
                        ? 'currentColor'
                        : 'none'
                    }
                    aria-hidden="true"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => void handleDelete(activeNote)}
                  className="ui-icon-btn hover:text-red-700"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={closeEditor}
                  className="ui-icon-btn ml-1"
                  aria-label="에디터 닫기"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(event) =>
                    handleUpdate('title', event.target.value)
                  }
                  className="ui-input flex-1 text-[15px] font-semibold"
                  placeholder="Note title"
                />

                <select
                  value={activeNote.folderId || ''}
                  onChange={(event) =>
                    handleUpdate(
                      'folderId',
                      event.target.value || null,
                    )
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
                  <span
                    key={tag}
                    className="ui-tag py-1 text-ink"
                  >
                    {tag}

                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-0.5 text-muted hover:text-ink"
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </span>
                ))}

                <form
                  onSubmit={handleAddTag}
                  className="flex items-center gap-1"
                >
                  <input
                    value={newTag}
                    onChange={(event) =>
                      setNewTag(event.target.value)
                    }
                    placeholder="Add tag"
                    className="ui-input h-8 w-28 px-2 text-meta"
                  />

                  <button
                    type="submit"
                    disabled={!newTag.trim()}
                    className="ui-icon-btn"
                  >
                    <Plus size={14} aria-hidden="true" />
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
                  onChange={(html) =>
                    handleUpdate('content', html)
                  }
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}