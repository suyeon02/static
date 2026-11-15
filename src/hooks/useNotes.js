import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import normalizeTags from '../lib/normalizeTags';
import { getLocalizedErrorMessage } from '../lib/userFacingError';

const NOTES_KEY = 'static_notes';
const MIGRATION_USER_KEY = 'static_notes_migration_user_id';
const MIGRATION_DONE_KEY = 'static_notes_migration_done_user_id';
const NOTE_FIELDS =
  'id, title, content, updated_at, folder_id, tags, is_favorite';
const FOLDER_FIELDS = 'id, name, created_at';

function mapNote(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    folderId: row.folder_id || null,
    tags: normalizeTags(row.tags),
    isFavorite: row.is_favorite === true,
    updatedAt: row.updated_at
      ? new Date(row.updated_at).toLocaleString(undefined, {
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : 'JUST NOW',
  };
}

export default function useNotes(userId) {
  const [notesState, setNotesState] = useState({ userId: null, notes: [] });
  const [loadState, setLoadState] = useState({
    userId: null,
    version: -1,
    status: 'idle',
  });
  const [operationError, setOperationError] = useState({
    userId: null,
    message: '',
  });
  const [reloadVersion, setReloadVersion] = useState(0);
  const [foldersState, setFoldersState] = useState({
    userId: null,
    folders: [],
  });
  const [folderLoadState, setFolderLoadState] = useState({
    userId: null,
    version: -1,
    status: 'idle',
  });
  const [folderErrorState, setFolderErrorState] = useState({
    userId: null,
    message: '',
  });
  const [folderReloadVersion, setFolderReloadVersion] = useState(0);
  const notes =
    notesState.userId === userId ? notesState.notes : [];
  const folders =
    foldersState.userId === userId ? foldersState.folders : [];
  const isFoldersLoading = Boolean(
    userId &&
      (folderLoadState.userId !== userId ||
        folderLoadState.version !== folderReloadVersion ||
        folderLoadState.status === 'loading'),
  );
  const foldersError =
    folderErrorState.userId === userId ? folderErrorState.message : '';
  const isLoading = Boolean(
    userId &&
      (loadState.userId !== userId ||
        loadState.version !== reloadVersion ||
        loadState.status === 'loading'),
  );
  const error =
    operationError.userId === userId ? operationError.message : '';
  const notesRef = useRef(notes);
  const notesRefUserId = useRef(null);
  const saveTimers = useRef(new Map());
  const saveQueues = useRef(new Map());
  const migrationPromises = useRef(new Map());

  const enqueueSave = useCallback((id, save) => {
    const previous = saveQueues.current.get(id) || Promise.resolve();
    const next = previous.catch(() => {}).then(save);
    saveQueues.current.set(id, next);
    const cleanup = () => {
      if (saveQueues.current.get(id) === next) {
        saveQueues.current.delete(id);
      }
    };
    void next.then(cleanup, cleanup);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!userId) return () => {
      cancelled = true;
    };

    const loadNotes = async () => {
      try {
        setOperationError({ userId, message: '' });
        let migrationUserId = localStorage.getItem(MIGRATION_USER_KEY);
        if (!migrationUserId) {
          localStorage.setItem(MIGRATION_USER_KEY, userId);
          migrationUserId = userId;
        }

        const { data, error: loadError } = await supabase
          .from('notes')
          .select(NOTE_FIELDS)
          .order('updated_at', { ascending: false });

        if (loadError) throw loadError;
        let rows = data || [];

        if (
          migrationUserId === userId &&
          localStorage.getItem(MIGRATION_DONE_KEY) !== userId
        ) {
          let migration = migrationPromises.current.get(userId);
          if (!migration) {
            migration = (async () => {
              if (rows.length === 0) {
                const backup = localStorage.getItem(NOTES_KEY);
                const savedNotes = backup ? JSON.parse(backup) : [];
                if (!Array.isArray(savedNotes)) {
                  throw new Error('기존 로컬 노트 형식이 올바르지 않습니다.');
                }

                if (savedNotes.length > 0) {
                  const { data: importedRows, error: importError } =
                    await supabase
                      .from('notes')
                      .insert(
                        savedNotes.map((note) => ({
                          title: String(note.title || 'Untitled'),
                          content: String(note.content || ''),
                          tags: normalizeTags(note.tags),
                          updated_at: new Date().toISOString(),
                        })),
                      )
                      .select(NOTE_FIELDS);

                  if (importError) throw importError;
                  rows = importedRows || [];
                }
              }

              localStorage.setItem(MIGRATION_DONE_KEY, userId);
              return rows;
            })();
            migrationPromises.current.set(userId, migration);
          }

          try {
            rows = await migration;
          } catch (migrationError) {
            migrationPromises.current.delete(userId);
            throw migrationError;
          }
        }

        if (!cancelled) {
          const mappedNotes = rows.map(mapNote);
          notesRef.current = mappedNotes;
          notesRefUserId.current = userId;
          setNotesState({ userId, notes: mappedNotes });
          setLoadState({
            userId,
            version: reloadVersion,
            status: 'success',
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setOperationError({
            userId,
            message: `노트를 불러오지 못했습니다: ${getLocalizedErrorMessage(loadError, '다시 시도해 주세요.')}`,
          });
          setLoadState({
            userId,
            version: reloadVersion,
            status: 'error',
          });
        }
      }
    };

    void loadNotes();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadVersion]);

  useEffect(() => {
    let cancelled = false;

    if (!userId) return () => {
      cancelled = true;
    };

    const loadFolders = async () => {
      try {
        setFolderErrorState({ userId, message: '' });
        const { data, error: loadError } = await supabase
          .from('note_folders')
          .select(FOLDER_FIELDS)
          .order('name', { ascending: true });

        if (loadError) throw loadError;
        if (!cancelled) {
          setFoldersState({ userId, folders: data || [] });
          setFolderLoadState({
            userId,
            version: folderReloadVersion,
            status: 'success',
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setFolderErrorState({
            userId,
            message: `폴더를 불러오지 못했습니다: ${getLocalizedErrorMessage(loadError, '다시 시도해 주세요.')}`,
          });
          setFolderLoadState({
            userId,
            version: folderReloadVersion,
            status: 'error',
          });
        }
      }
    };

    void loadFolders();
    return () => {
      cancelled = true;
    };
  }, [userId, folderReloadVersion]);

  useEffect(
    () => {
      const timers = saveTimers.current;
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      return () => {
        timers.forEach((timer) => clearTimeout(timer));
        timers.clear();
      };
    },
    [userId],
  );

  const createNote = useCallback(
    async ({
      title,
      content,
      folderId = null,
      tags = [],
      isFavorite = false,
    }) => {
      const { data, error: createError } = await supabase
        .from('notes')
        .insert({
          title,
          content,
          folder_id: folderId,
          tags: normalizeTags(tags),
          is_favorite: isFavorite,
          updated_at: new Date().toISOString(),
        })
        .select(NOTE_FIELDS)
        .single();

      if (createError) {
        setOperationError({
          userId,
          message: `노트를 만들지 못했습니다: ${getLocalizedErrorMessage(createError, '다시 시도해 주세요.')}`,
        });
        throw createError;
      }

      const note = mapNote(data);
      const currentNotes =
        notesRefUserId.current === userId ? notesRef.current : [];
      const nextNotes = [note, ...currentNotes];
      notesRef.current = nextNotes;
      notesRefUserId.current = userId;
      setNotesState((current) =>
        current.userId === userId
          ? { ...current, notes: [note, ...current.notes] }
          : { userId, notes: [note] },
      );
      setOperationError({ userId, message: '' });
      return note;
    },
    [userId],
  );

  const updateNote = useCallback(
    (id, patch) => {
      const current = notesRef.current.find((note) => note.id === id);
      if (!current) return;

      const updatedNote = {
        ...current,
        ...patch,
        updatedAt: 'JUST NOW',
      };
      notesRef.current = notesRef.current.map((note) =>
        note.id === id ? updatedNote : note,
      );
      setNotesState((state) =>
        state.userId === userId
          ? { ...state, notes: notesRef.current }
          : state,
      );

      const previousTimer = saveTimers.current.get(id);
      if (previousTimer) clearTimeout(previousTimer);

      const timer = setTimeout(() => {
        saveTimers.current.delete(id);
        void enqueueSave(id, async () => {
          const latest = notesRef.current.find((note) => note.id === id);
          if (!latest) return;

          const { error: saveError } = await supabase.from('notes').upsert({
            id,
            title: latest.title,
            content: latest.content,
            folder_id: latest.folderId,
            tags: normalizeTags(latest.tags),
            is_favorite: latest.isFavorite,
            updated_at: new Date().toISOString(),
          });
          if (saveError) {
            setOperationError({
              userId,
              message: `노트를 저장하지 못했습니다: ${getLocalizedErrorMessage(saveError, '다시 시도해 주세요.')}`,
            });
            return;
          }
          setOperationError({ userId, message: '' });
        });
      }, 600);
      saveTimers.current.set(id, timer);
    },
    [enqueueSave, userId],
  );

  const setNoteFavorite = useCallback(
    async (id, isFavorite) => {
      const current = notesRef.current.find((note) => note.id === id);
      if (!current) return;

      const updatedNote = { ...current, isFavorite };
      notesRef.current = notesRef.current.map((note) =>
        note.id === id ? updatedNote : note,
      );
      setNotesState((state) =>
        state.userId === userId
          ? { ...state, notes: notesRef.current }
          : state,
      );

      const previousTimer = saveTimers.current.get(id);
      if (previousTimer) {
        clearTimeout(previousTimer);
        saveTimers.current.delete(id);
      }

      try {
        await enqueueSave(id, async () => {
          const { error: saveError } = await supabase
            .from('notes')
            .update({ is_favorite: isFavorite })
            .eq('id', id);
          if (saveError) throw saveError;
        });
        setOperationError({ userId, message: '' });
      } catch (saveError) {
        const latest = notesRef.current.find((note) => note.id === id);
        if (latest?.isFavorite === isFavorite) {
          const revertedNote = { ...latest, isFavorite: current.isFavorite };
          notesRef.current = notesRef.current.map((note) =>
            note.id === id ? revertedNote : note,
          );
          setNotesState((state) =>
            state.userId === userId
              ? { ...state, notes: notesRef.current }
              : state,
          );
        }
        setOperationError({
          userId,
          message: `즐겨찾기를 저장하지 못했습니다: ${getLocalizedErrorMessage(saveError, '다시 시도해 주세요.')}`,
        });
        throw saveError;
      }
    },
    [enqueueSave, userId],
  );

  const deleteNote = useCallback(
    async (note) => {
      const timer = saveTimers.current.get(note.id);
      if (timer) {
        clearTimeout(timer);
        saveTimers.current.delete(note.id);
      }

      try {
        await enqueueSave(note.id, async () => {
          const { error: deleteError } = await supabase
            .from('notes')
            .delete()
            .eq('id', note.id);
          if (deleteError) throw deleteError;
        });
        setNotesState((current) =>
          current.userId === userId
            ? {
                ...current,
                notes: current.notes.filter((item) => item.id !== note.id),
              }
            : current,
        );
        notesRef.current = notesRef.current.filter(
          (item) => item.id !== note.id,
        );
        notesRefUserId.current = userId;
        setOperationError({ userId, message: '' });
      } catch (deleteError) {
        setOperationError({
          userId,
          message: `노트를 삭제하지 못했습니다: ${getLocalizedErrorMessage(deleteError, '다시 시도해 주세요.')}`,
        });
        throw deleteError;
      }
    },
    [enqueueSave, userId],
  );

  const retry = useCallback(
    () => setReloadVersion((version) => version + 1),
    [],
  );
  const createFolder = useCallback(
    async (name) => {
      try {
        const { data, error: createError } = await supabase
          .from('note_folders')
          .insert({ name: name.trim() })
          .select(FOLDER_FIELDS)
          .single();
        if (createError) throw createError;

        setFoldersState((current) => ({
          ...current,
          folders: current.userId === userId
            ? [...current.folders, data].sort((a, b) =>
                a.name.localeCompare(b.name),
              )
            : current.folders,
        }));
        setFolderErrorState({ userId, message: '' });
        return data;
      } catch (createError) {
        setFolderErrorState({
          userId,
          message: `폴더를 만들지 못했습니다: ${getLocalizedErrorMessage(createError, '다시 시도해 주세요.')}`,
        });
        throw createError;
      }
    },
    [userId],
  );
  const renameFolder = useCallback(
    async (id, name) => {
      try {
        const { data, error: updateError } = await supabase
          .from('note_folders')
          .update({ name: name.trim() })
          .eq('id', id)
          .select(FOLDER_FIELDS)
          .single();
        if (updateError) throw updateError;

        setFoldersState((current) =>
          current.userId === userId
            ? {
                ...current,
                folders: current.folders
                  .map((folder) => (folder.id === id ? data : folder))
                  .sort((a, b) => a.name.localeCompare(b.name)),
              }
            : current,
        );
        setFolderErrorState({ userId, message: '' });
        return data;
      } catch (updateError) {
        setFolderErrorState({
          userId,
          message: `폴더 이름을 바꾸지 못했습니다: ${getLocalizedErrorMessage(updateError, '다시 시도해 주세요.')}`,
        });
        throw updateError;
      }
    },
    [userId],
  );
  const deleteFolder = useCallback(
    async (id) => {
      try {
        const { error: deleteError } = await supabase
          .from('note_folders')
          .delete()
          .eq('id', id);
        if (deleteError) throw deleteError;

        setFoldersState((current) =>
          current.userId === userId
            ? {
                ...current,
                folders: current.folders.filter((folder) => folder.id !== id),
              }
            : current,
        );
        const unfiledNotes =
          notesRefUserId.current === userId
            ? notesRef.current.map((note) =>
                note.folderId === id ? { ...note, folderId: null } : note,
              )
            : null;
        if (unfiledNotes) notesRef.current = unfiledNotes;
        setNotesState((current) =>
          unfiledNotes && current.userId === userId
            ? { ...current, notes: unfiledNotes }
            : current,
        );
        setFolderErrorState({ userId, message: '' });
      } catch (deleteError) {
        setFolderErrorState({
          userId,
          message: `폴더를 삭제하지 못했습니다: ${getLocalizedErrorMessage(deleteError, '다시 시도해 주세요.')}`,
        });
        throw deleteError;
      }
    },
    [userId],
  );
  const retryFolders = useCallback(
    () => setFolderReloadVersion((version) => version + 1),
    [],
  );

  return {
    notes,
    isLoading,
    error,
    createNote,
    updateNote,
    setNoteFavorite,
    deleteNote,
    retry,
    folders,
    isFoldersLoading,
    foldersError,
    createFolder,
    renameFolder,
    deleteFolder,
    retryFolders,
  };
}
