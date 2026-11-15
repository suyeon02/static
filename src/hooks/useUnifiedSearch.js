import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getLocalizedErrorMessage } from '../lib/userFacingError';

const FILE_BUCKET = 'my-desk-files';
const RESULT_LIMIT = 8;
const FILE_SCAN_LIMIT = 100;

const EMPTY_RESULTS = {
  notes: [],
  tasks: [],
  events: [],
  projects: [],
  bookmarks: [],
  files: [],
};

function getPattern(query) {
  const escaped = query
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[%_]/g, '\\$&');
  return `"%${escaped}%"`;
}

function getDateRange(query) {
  if (/^\d{4}$/.test(query)) {
    return [`${query}-01-01`, `${Number(query) + 1}-01-01`];
  }
  if (/^\d{4}-\d{2}$/.test(query)) {
    const [year, month] = query.split('-').map(Number);
    if (month < 1 || month > 12) return null;
    const nextMonth = new Date(Date.UTC(year, month, 1));
    return [
      `${query}-01`,
      `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}-01`,
    ];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(query)) {
    return [query, query];
  }
  return null;
}

function toNoteResult(note) {
  return {
    id: note.id,
    type: 'note',
    title: note.title || 'Untitled note',
    detail:
      note.content?.trim() ||
      (Array.isArray(note.tags) ? note.tags.join(', ') : ''),
    target: 'notes',
  };
}

function toTaskResult(task) {
  return {
    id: task.id,
    type: 'task',
    title: task.title,
    detail: task.done ? 'Completed task' : 'Task',
    target: 'tasks',
  };
}

function toEventResult(event) {
  return {
    id: event.id,
    type: 'event',
    title: event.title,
    detail: `${event.event_date}${event.event_time ? ` · ${event.event_time.slice(0, 5)}` : ''}`,
    target: 'schedule',
    date: event.event_date,
  };
}

function toProjectResult(project) {
  return {
    id: project.id,
    type: 'project',
    title: project.title,
    detail: [project.status, project.tag].filter(Boolean).join(' · '),
    target: 'projects',
  };
}

function toBookmarkResult(bookmark) {
  return {
    id: bookmark.id,
    type: 'bookmark',
    title: bookmark.title,
    detail: bookmark.url,
    target: 'bookmarks',
  };
}

function toFileResult(userId, file) {
  return {
    id: `${userId}/${file.name}`,
    type: 'file',
    title:
      typeof file.metadata?.originalName === 'string'
        ? file.metadata.originalName
        : file.name.slice(37) || file.name,
    detail: 'File',
    target: 'files',
  };
}

async function searchUserData(userId, query) {
  const pattern = getPattern(query);
  const request = (table, columns, fields) =>
    supabase
      .from(table)
      .select(columns)
      .eq('user_id', userId)
      .or(fields.map((field) => `${field}.ilike.${pattern}`).join(','))
      .limit(RESULT_LIMIT);

  const eventRange = getDateRange(query);
  let eventDateRequest = Promise.resolve({ data: [], error: null });
  if (eventRange) {
    let dateQuery = supabase
      .from('events')
      .select('id, event_date, event_time, title')
      .eq('user_id', userId);
    dateQuery =
      eventRange[0] === eventRange[1]
        ? dateQuery.eq('event_date', eventRange[0])
        : dateQuery
            .gte('event_date', eventRange[0])
            .lt('event_date', eventRange[1]);
    eventDateRequest = dateQuery.limit(RESULT_LIMIT);
  }

  const [
    notesResponse,
    taggedNotesResponse,
    tasksResponse,
    eventsResponse,
    eventDateResponse,
    projectsResponse,
    bookmarksResponse,
    filesResponse,
  ] = await Promise.all([
    request('notes', 'id, title, content, tags', ['title', 'content']),
    supabase
      .from('notes')
      .select('id, title, content, tags')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(FILE_SCAN_LIMIT),
    request('tasks', 'id, title, done', ['title']),
    request('events', 'id, event_date, event_time, title', ['title']),
    eventDateRequest,
    request('projects', 'id, title, tag, status', [
      'title',
      'tag',
      'status',
    ]),
    request('bookmarks', 'id, title, url', ['title', 'url']),
    supabase.storage.from(FILE_BUCKET).list(userId, {
      limit: FILE_SCAN_LIMIT,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    }),
  ]);

  const responses = [
    notesResponse,
    taggedNotesResponse,
    tasksResponse,
    eventsResponse,
    eventDateResponse,
    projectsResponse,
    bookmarksResponse,
    filesResponse,
  ];
  const failedResponse = responses.find((response) => response.error);
  if (failedResponse) throw failedResponse.error;

  const lowerQuery = query.toLocaleLowerCase();
  const notesById = new Map(
    (notesResponse.data || []).map((note) => [note.id, note]),
  );
  for (const note of taggedNotesResponse.data || []) {
    if (
      Array.isArray(note.tags) &&
      note.tags.some((tag) =>
        String(tag).toLocaleLowerCase().includes(lowerQuery),
      )
    ) {
      notesById.set(note.id, note);
    }
  }

  const eventsById = new Map(
    (eventsResponse.data || []).map((event) => [event.id, event]),
  );
  for (const event of eventDateResponse.data || []) {
    eventsById.set(event.id, event);
  }

  return {
    notes: [...notesById.values()].slice(0, RESULT_LIMIT).map(toNoteResult),
    tasks: (tasksResponse.data || []).map(toTaskResult),
    events: [...eventsById.values()].slice(0, RESULT_LIMIT).map(toEventResult),
    projects: (projectsResponse.data || []).map(toProjectResult),
    bookmarks: (bookmarksResponse.data || []).map(toBookmarkResult),
    files: (filesResponse.data || [])
      .filter(
        (file) =>
          file.id &&
          file.name &&
          !file.name.includes('/') &&
          !file.name.includes('\\') &&
          toFileResult(userId, file)
            .title.toLocaleLowerCase()
            .includes(lowerQuery),
      )
      .slice(0, RESULT_LIMIT)
      .map((file) => toFileResult(userId, file)),
  };
}

export default function useUnifiedSearch(userId, searchQuery) {
  const [searchState, setSearchState] = useState({
    userId: null,
    query: '',
    results: EMPTY_RESULTS,
    error: '',
  });
  const query = searchQuery.trim().slice(0, 100);

  useEffect(() => {
    let isCurrent = true;

    if (!userId || !query) {
      return () => {
        isCurrent = false;
      };
    }

    const timeoutId = window.setTimeout(() => {
      void searchUserData(userId, query)
        .then((nextResults) => {
          if (isCurrent) {
            setSearchState({
              userId,
              query,
              results: nextResults,
              error: '',
            });
          }
        })
        .catch((searchError) => {
          if (isCurrent) {
            setSearchState({
              userId,
              query,
              results: EMPTY_RESULTS,
              error: getLocalizedErrorMessage(
                searchError,
                '검색하지 못했습니다. 다시 시도해 주세요.',
              ),
            });
          }
        });
    }, 300);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [query, userId]);

  const isCurrentSearch =
    searchState.userId === userId && searchState.query === query;
  return {
    results: isCurrentSearch ? searchState.results : EMPTY_RESULTS,
    isLoading: Boolean(userId && query && !isCurrentSearch),
    error: isCurrentSearch ? searchState.error : '',
  };
}
