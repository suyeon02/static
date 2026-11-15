import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getLocalizedErrorMessage } from '../lib/userFacingError';

const SCHEDULES_KEY = 'static_schedules';
const MIGRATION_USER_KEY = 'static_schedules_migration_user_id';
const MIGRATION_DONE_KEY = 'static_schedules_migration_done_user_id';
const EVENT_FIELDS = 'id, event_date, event_time, title';

function getLocalDateString() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

function mapEvent(row) {
  return {
    id: row.id,
    time: row.event_time.slice(0, 5),
    title: row.title,
  };
}

export default function useScheduleEvents(userId, selectedDate) {
  const [eventsState, setEventsState] = useState({
    userId: null,
    selectedDate: null,
    events: [],
  });
  const [loadState, setLoadState] = useState({
    userId: null,
    selectedDate: null,
    version: -1,
    status: 'idle',
  });
  const [errorState, setErrorState] = useState({
    userId: null,
    selectedDate: null,
    message: '',
  });
  const [reloadVersion, setReloadVersion] = useState(0);
  const migrationPromises = useRef(new Map());
  const currentUserId = useRef(userId);
  const currentSelectedDate = useRef(selectedDate);

  const events =
    eventsState.userId === userId &&
    eventsState.selectedDate === selectedDate
      ? eventsState.events
      : [];
  const isReady =
    Boolean(userId) &&
    loadState.userId === userId &&
    loadState.selectedDate === selectedDate &&
    loadState.version === reloadVersion &&
    loadState.status === 'success';
  const isLoading = Boolean(
    userId &&
      (loadState.userId !== userId ||
        loadState.selectedDate !== selectedDate ||
        loadState.version !== reloadVersion ||
        loadState.status === 'loading'),
  );
  const error =
    errorState.userId === userId &&
    errorState.selectedDate === selectedDate
      ? errorState.message
      : '';

  useEffect(() => {
    currentUserId.current = userId;
    currentSelectedDate.current = selectedDate;
  }, [userId, selectedDate]);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      return () => {
        cancelled = true;
      };
    }

    const migrateLegacySchedules = async () => {
      let migrationUserId = localStorage.getItem(MIGRATION_USER_KEY);
      if (!migrationUserId) {
        localStorage.setItem(MIGRATION_USER_KEY, userId);
        migrationUserId = userId;
      }

      if (
        migrationUserId !== userId ||
        localStorage.getItem(MIGRATION_DONE_KEY) === userId
      ) {
        return;
      }

      let migration = migrationPromises.current.get(userId);
      if (!migration) {
        migration = (async () => {
          const backup = localStorage.getItem(SCHEDULES_KEY);
          const savedSchedules = backup ? JSON.parse(backup) : [];
          if (!Array.isArray(savedSchedules)) {
            throw new Error('기존 일정 형식이 올바르지 않습니다.');
          }

          const migrationDate = getLocalDateString();
          const schedulesToImport = savedSchedules.map((schedule) => {
            if (
              !schedule ||
              typeof schedule.title !== 'string' ||
              !schedule.title.trim() ||
              typeof schedule.time !== 'string' ||
              !/^\d{2}:\d{2}$/.test(schedule.time)
            ) {
              throw new Error('기존 일정 형식이 올바르지 않습니다.');
            }
            return {
              event_date: migrationDate,
              event_time: schedule.time,
              title: schedule.title.trim(),
            };
          });

          if (schedulesToImport.length > 0) {
            if (currentUserId.current !== userId) {
              throw new Error('로그인 계정이 변경되어 일정 가져오기를 취소했습니다.');
            }
            const { error: importError } = await supabase
              .from('events')
              .insert(schedulesToImport);
            if (importError) throw importError;
          }

          localStorage.setItem(MIGRATION_DONE_KEY, userId);
        })();
        migrationPromises.current.set(userId, migration);
      }

      try {
        await migration;
      } catch (migrationError) {
        migrationPromises.current.delete(userId);
        throw migrationError;
      }
    };

    const loadEvents = async () => {
      try {
        setErrorState({ userId, selectedDate, message: '' });
        await migrateLegacySchedules();
        const { data, error: loadError } = await supabase
          .from('events')
          .select(EVENT_FIELDS)
          .eq('user_id', userId)
          .eq('event_date', selectedDate)
          .order('event_time', { ascending: true });

        if (loadError) throw loadError;
        if (!cancelled) {
          setEventsState({
            userId,
            selectedDate,
            events: (data || []).map(mapEvent),
          });
          setLoadState({
            userId,
            selectedDate,
            version: reloadVersion,
            status: 'success',
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setErrorState({
            userId,
            selectedDate,
            message: `일정을 불러오지 못했습니다: ${getLocalizedErrorMessage(loadError, '다시 시도해 주세요.')}`,
          });
          setLoadState({
            userId,
            selectedDate,
            version: reloadVersion,
            status: 'error',
          });
        }
      }
    };

    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, [userId, selectedDate, reloadVersion]);

  const createEvent = useCallback(
    async (time, title) => {
      if (!userId || !isReady) return false;
      try {
        const { data, error: createError } = await supabase
          .from('events')
          .insert({ event_date: selectedDate, event_time: time, title })
          .select(EVENT_FIELDS)
          .single();
        if (createError) throw createError;

        if (
          currentUserId.current === userId &&
          currentSelectedDate.current === selectedDate
        ) {
          setEventsState((current) => ({
            userId,
            selectedDate,
            events: [...current.events, mapEvent(data)].sort((a, b) =>
              a.time.localeCompare(b.time),
            ),
          }));
          setErrorState({ userId, selectedDate, message: '' });
        }
        return true;
      } catch (createError) {
        setErrorState({
          userId,
          selectedDate,
          message: `일정을 추가하지 못했습니다: ${getLocalizedErrorMessage(createError, '다시 시도해 주세요.')}`,
        });
        return false;
      }
    },
    [isReady, selectedDate, userId],
  );

  const deleteEvent = useCallback(
    async (id) => {
      if (!userId || !isReady) return;
      try {
        const { error: deleteError } = await supabase
          .from('events')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);
        if (deleteError) throw deleteError;

        if (
          currentUserId.current === userId &&
          currentSelectedDate.current === selectedDate
        ) {
          setEventsState((current) => ({
            ...current,
            events: current.events.filter((event) => event.id !== id),
          }));
          setErrorState({ userId, selectedDate, message: '' });
        }
      } catch (deleteError) {
        setErrorState({
          userId,
          selectedDate,
          message: `일정을 삭제하지 못했습니다: ${getLocalizedErrorMessage(deleteError, '다시 시도해 주세요.')}`,
        });
      }
    },
    [isReady, selectedDate, userId],
  );

  const retry = useCallback(() => {
    setReloadVersion((version) => version + 1);
  }, []);

  return { events, isLoading, isReady, error, createEvent, deleteEvent, retry };
}
