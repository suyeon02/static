import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getLocalizedErrorMessage } from '../lib/userFacingError';

const TASKS_KEY = 'static_todos';
const MIGRATION_USER_KEY = 'static_todos_migration_user_id';
const MIGRATION_DONE_KEY = 'static_todos_migration_done_user_id';
const TASK_FIELDS = 'id, title, done, due_date, created_at';

function mapTask(row) {
  return {
    id: row.id,
    text: row.title,
    done: row.done,
    dueDate: row.due_date,
  };
}

export default function useTasks(userId) {
  const [tasksState, setTasksState] = useState({ userId: null, tasks: [] });
  const [loadState, setLoadState] = useState({
    userId: null,
    version: -1,
    status: 'idle',
  });
  const [errorState, setErrorState] = useState({ userId: null, message: '' });
  const [reloadVersion, setReloadVersion] = useState(0);
  const migrationPromises = useRef(new Map());
  const currentUserId = useRef(userId);

  useEffect(() => {
    currentUserId.current = userId;
  }, [userId]);

  const tasks = tasksState.userId === userId ? tasksState.tasks : [];
  const isReady =
    Boolean(userId) &&
    loadState.userId === userId &&
    loadState.version === reloadVersion &&
    loadState.status === 'success';
  const isLoading = Boolean(
    userId &&
      (loadState.userId !== userId ||
        loadState.version !== reloadVersion ||
        loadState.status === 'loading'),
  );
  const error = errorState.userId === userId ? errorState.message : '';

  useEffect(() => {
    let cancelled = false;
    if (!userId) return () => {
      cancelled = true;
    };

    const loadTasks = async () => {
      try {
        setErrorState({ userId, message: '' });

        let migrationUserId = localStorage.getItem(MIGRATION_USER_KEY);
        if (!migrationUserId) {
          localStorage.setItem(MIGRATION_USER_KEY, userId);
          migrationUserId = userId;
        }

        const { data, error: loadError } = await supabase
          .from('tasks')
          .select(TASK_FIELDS)
          .order('created_at', { ascending: true });

        if (loadError) throw loadError;
        let rows = data || [];

        if (
          migrationUserId === userId &&
          localStorage.getItem(MIGRATION_DONE_KEY) !== userId
        ) {
          let migration = migrationPromises.current.get(userId);
          if (!migration) {
            migration = (async () => {
              let importedRows = rows;
              if (rows.length === 0) {
                const backup = localStorage.getItem(TASKS_KEY);
                const savedTasks = backup ? JSON.parse(backup) : [];
                if (!Array.isArray(savedTasks)) {
                  throw new Error('기존 로컬 할 일 형식이 올바르지 않습니다.');
                }

                const tasksToImport = savedTasks
                  .filter((task) => task && typeof task.text === 'string')
                  .map((task) => ({
                    title: task.text,
                    done: Boolean(task.done),
                  }));

                if (tasksToImport.length > 0) {
                  const { data: insertedRows, error: importError } =
                    await supabase
                      .from('tasks')
                      .insert(tasksToImport)
                      .select(TASK_FIELDS);

                  if (importError) throw importError;
                  importedRows = insertedRows || [];
                }
              }

              localStorage.setItem(MIGRATION_DONE_KEY, userId);
              return importedRows;
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
          setTasksState({ userId, tasks: rows.map(mapTask) });
          setLoadState({ userId, version: reloadVersion, status: 'success' });
        }
      } catch (loadError) {
        if (!cancelled) {
          setErrorState({
            userId,
            message: `할 일을 불러오지 못했습니다: ${getLocalizedErrorMessage(loadError, '다시 시도해 주세요.')}`,
          });
          setLoadState({ userId, version: reloadVersion, status: 'error' });
        }
      }
    };

    void loadTasks();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadVersion]);

  const createTask = useCallback(
    async (text, dueDate) => {
      if (!userId || !isReady) return false;
      try {
        const { data, error: createError } = await supabase
          .from('tasks')
          .insert({ title: text, done: false, due_date: dueDate || null })
          .select(TASK_FIELDS)
          .single();
        if (createError) throw createError;

        if (currentUserId.current === userId) {
          setTasksState((current) => ({
            userId,
            tasks:
              current.userId === userId
                ? [...current.tasks, mapTask(data)]
                : [mapTask(data)],
          }));
          setErrorState({ userId, message: '' });
        }
        return true;
      } catch (createError) {
        setErrorState({
          userId,
          message: `할 일을 만들지 못했습니다: ${getLocalizedErrorMessage(createError, '다시 시도해 주세요.')}`,
        });
        return false;
      }
    },
    [isReady, userId],
  );

  const updateTaskDueDate = useCallback(
    async (taskId, dueDate) => {
      if (!userId || !isReady) return false;
      try {
        const { data, error: updateError } = await supabase
          .from('tasks')
          .update({ due_date: dueDate || null })
          .eq('id', taskId)
          .select(TASK_FIELDS)
          .single();
        if (updateError) throw updateError;

        if (currentUserId.current === userId) {
          setTasksState((current) => ({
            ...current,
            tasks: current.tasks.map((task) =>
              task.id === taskId ? mapTask(data) : task,
            ),
          }));
          setErrorState({ userId, message: '' });
        }
        return true;
      } catch (updateError) {
        setErrorState({
          userId,
          message: `할 일 마감일을 수정하지 못했습니다: ${getLocalizedErrorMessage(updateError, '다시 시도해 주세요.')}`,
        });
        return false;
      }
    },
    [isReady, userId],
  );

  const toggleTask = useCallback(
    async (task) => {
      if (!userId || !isReady) return;
      try {
        const { data, error: updateError } = await supabase
          .from('tasks')
          .update({ done: !task.done })
          .eq('id', task.id)
          .select(TASK_FIELDS)
          .single();
        if (updateError) throw updateError;

        if (currentUserId.current === userId) {
          setTasksState((current) => ({
            ...current,
            tasks: current.tasks.map((item) =>
              item.id === task.id ? mapTask(data) : item,
            ),
          }));
          setErrorState({ userId, message: '' });
        }
      } catch (updateError) {
        setErrorState({
          userId,
          message: `할 일을 수정하지 못했습니다: ${getLocalizedErrorMessage(updateError, '다시 시도해 주세요.')}`,
        });
      }
    },
    [isReady, userId],
  );

  const deleteTask = useCallback(
    async (id) => {
      if (!userId || !isReady) return;
      try {
        const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('id', id);
        if (deleteError) throw deleteError;

        if (currentUserId.current === userId) {
          setTasksState((current) => ({
            ...current,
            tasks: current.tasks.filter((task) => task.id !== id),
          }));
          setErrorState({ userId, message: '' });
        }
      } catch (deleteError) {
        setErrorState({
          userId,
          message: `할 일을 삭제하지 못했습니다: ${getLocalizedErrorMessage(deleteError, '다시 시도해 주세요.')}`,
        });
      }
    },
    [isReady, userId],
  );

  const retry = useCallback(() => {
    setReloadVersion((version) => version + 1);
  }, []);

  return {
    tasks,
    isLoading,
    isReady,
    error,
    createTask,
    toggleTask,
    deleteTask,
    updateTaskDueDate,
    retry,
  };
}
