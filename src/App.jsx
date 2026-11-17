import React, { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import CalendarWidget from './components/widgets/CalendarWidget';
import ScheduleWidget from './components/widgets/ScheduleWidget';
import TodoWidget from './components/widgets/TodoWidget';
import AiToolsWidget from './components/widgets/AiToolsWidget';
import RecentWidget from './components/widgets/RecentWidget';
import MemoWidget from './components/widgets/MemoWidget';
import NotesPage from './components/pages/NotesPage';
import QuickMemoPage from './components/pages/QuickMemoPage';
import ProjectsPage from './components/pages/ProjectsPage';
import BookmarksPage from './components/pages/BookmarksPage';
import FavoritesPage from './components/pages/FavoritesPage';
import FilesPage from './components/pages/FilesPage';
import BackupPage from './components/pages/BackupPage';
import TrashPage from './components/pages/TrashPage';
import PageHeader from './components/common/PageHeader';
import ErrorAlert from './components/common/ErrorAlert';
import AuthPage from './components/AuthPage'
import { useAuth } from './contexts/AuthContext'
import useNotes from './hooks/useNotes'
import useTasks from './hooks/useTasks'
import useScheduleEvents from './hooks/useScheduleEvents'
import useProjects from './hooks/useProjects'
import useUnifiedSearch from './hooks/useUnifiedSearch'
import useTrash from './hooks/useTrash'
import useQuickMemos from './hooks/useQuickMemos'
import useHashPage from './hooks/useHashPage'

const PAGE_META = {
  dashboard: { title: 'DASHBOARD', description: '오늘의 일정, 할 일, 메모를 한눈에 확인하세요.' },
  favorites: { title: 'FAVORITES', description: '즐겨찾기한 노트, 프로젝트, 북마크를 모아 봅니다.' },
  notes: { title: 'NOTES', description: '폴더와 태그로 마크다운 노트를 정리하세요.' },
  quick_memo: { title: 'QUICK_MEMO', description: '떠오른 생각을 빠르게 기록하세요.' },
  projects: { title: 'PROJECTS', description: '프로젝트 상태와 진행률을 관리하세요.' },
  schedule: { title: 'SCHEDULE', description: '날짜를 선택해 일정을 확인하고 추가하세요.' },
  tasks: { title: 'TASKS', description: '할 일과 마감일을 관리하세요.' },
  files: { title: 'FILES', description: '파일을 업로드하고 내려받으세요. 파일당 최대 10MB.' },
  bookmarks: { title: 'BOOKMARKS', description: '자주 찾는 링크를 저장하세요.' },
  ai_tools: { title: 'AI_TOOLS', description: '자주 쓰는 AI 도구로 바로 이동하세요.' },
  trash: { title: 'TRASH', description: '삭제한 항목을 복원하거나 영구 삭제하세요.' },
  backup: { title: 'BACKUP', description: '전체 데이터를 ZIP으로 백업하고 복원하세요.' },
};

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
};

export default function App() {
  const [activeMenu, setActiveMenu] = useHashPage(PAGE_META, 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  const { user, isLoading } = useAuth()
  const {
    memoText,
    setMemoText,
    quickMemos,
    createQuickMemo,
    updateQuickMemo,
    deleteQuickMemo,
    mergeBackupMemos,
    isLoading: areMemosLoading,
    error: memosError,
    retry: retryMemos,
  } = useQuickMemos(user?.id)
  const {
    items: trash,
    isLoading: isTrashLoading,
    error: trashError,
    addItem: addTrashItem,
    deleteItem: deleteTrashItem,
    emptyTrash,
    retry: retryTrash,
  } = useTrash(user?.id)
  const {
    events,
    isLoading: isSchedulesLoading,
    isReady: areSchedulesReady,
    error: schedulesError,
    createEvent,
    deleteEvent,
    retry: retrySchedules,
  } = useScheduleEvents(user?.id, selectedDate)
  const {
    tasks: todos,
    isLoading: isTasksLoading,
    isReady: areTasksReady,
    error: tasksError,
    createTask,
    toggleTask,
    deleteTask,
    retry: retryTasks,
  } = useTasks(user?.id)
  const filteredTodos = searchQuery
    ? todos.filter((t) => t.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : todos;

  const filteredSchedules = searchQuery
    ? events.filter((s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : events;

    const {
      notes,
      isLoading: isNotesLoading,
      error: notesError,
      createNote,
      updateNote,
      setNoteFavorite,
      deleteNote,
      retry: retryNotes,
      folders,
      isFoldersLoading,
      foldersError,
      createFolder,
      renameFolder,
      deleteFolder,
      retryFolders,
    } = useNotes(user?.id)

  const deleteNoteToTrash = async (note) => {
    const trashItem = await addTrashItem({ ...note, type: 'NOTE' });
    try {
      await deleteNote(note);
    } catch (deleteError) {
      await deleteTrashItem(trashItem.id);
      throw deleteError;
    }
  };

  const archiveQuickMemo = async (memo) => {
    const trashItem = await addTrashItem({
      id: memo.id,
      title: memo.content.slice(0, 25) + '...',
      content: memo.content,
      createdAt: memo.createdAt,
      type: 'QUICK_MEMO',
    });
    try {
      await deleteQuickMemo(memo.id);
    } catch (deleteError) {
      await deleteTrashItem(trashItem.id);
      throw deleteError;
    }
  };

  const restoreFromTrash = async (item) => {
    try {
      if (item.type === 'NOTE') {
        await createNote(item.itemData);
      } else if (item.type === 'QUICK_MEMO') {
        const restoredMemo = await createQuickMemo(item.itemData.content, {
          id: item.itemData.id,
          createdAt: item.itemData.createdAt || item.deletedAt,
          ifMissing: true,
        });
        try {
          await deleteTrashItem(item.id);
        } catch (deleteError) {
          if (restoredMemo) await deleteQuickMemo(restoredMemo.id);
          throw deleteError;
        }
        return;
      }
      await deleteTrashItem(item.id);
    } catch {
      // Persistence hooks display retryable errors.
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await emptyTrash();
    } catch {
      // The trash hook displays the persistence error.
    }
  };

  const handleDeleteTrashItem = async (id) => {
    try {
      await deleteTrashItem(id);
    } catch {
      // The trash hook displays the persistence error.
    }
  };
  const {
    projects,
    isLoading: isProjectsLoading,
    isReady: areProjectsReady,
    error: projectsError,
    createProject,
    updateProject,
    deleteProject,
    retry: retryProjects,
  } = useProjects(user?.id)
  const {
    results: searchResults,
    isLoading: isSearchLoading,
    error: searchError,
  } = useUnifiedSearch(user?.id, searchQuery)

  const handleSelectSearchResult = (result) => {
    if (result.type === 'event' && result.date) {
      setSelectedDate(result.date);
    }
    setActiveMenu(result.target);
    setSearchQuery('');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-small text-muted">
        불러오는 중...
      </div>
    );
  }
  if (!user) return <AuthPage />;

  const pageMeta = PAGE_META[activeMenu];
  const persistenceErrors = [
    { key: 'notes', message: notesError, onRetry: retryNotes },
    { key: 'trash', message: trashError, onRetry: retryTrash },
    { key: 'memos', message: memosError, onRetry: retryMemos },
    { key: 'tasks', message: tasksError, onRetry: retryTasks },
    { key: 'schedules', message: schedulesError, onRetry: retrySchedules },
    { key: 'projects', message: projectsError, onRetry: retryProjects },
  ].filter((item) => item.message);

  return (
    <div className="min-h-screen md:h-screen flex bg-canvas text-ink overflow-x-hidden md:overflow-hidden">
      <Sidebar
        activeMenu={activeMenu}
        onSelectMenu={setActiveMenu}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 min-w-0 flex flex-col h-full">
        <Header
          onOpenSidebar={() => setIsSidebarOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          isSearchLoading={isSearchLoading}
          searchError={searchError}
          onSelectSearchResult={handleSelectSearchResult}
        />

        <div
          className={`flex-1 overflow-y-auto p-4 md:p-8 ${
            activeMenu === 'schedule' ? 'flex flex-col' : ''
          }`}
        >
          {pageMeta && (
            <PageHeader title={pageMeta.title} description={pageMeta.description} />
          )}
          {persistenceErrors.length > 0 && (
            <div className="mb-6 space-y-2">
              {persistenceErrors.map((item) => (
                <ErrorAlert key={item.key} message={item.message} onRetry={item.onRetry} />
              ))}
            </div>
          )}
          {activeMenu === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CalendarWidget
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
              <ScheduleWidget
                schedules={filteredSchedules}
                selectedDate={selectedDate}
                isLoading={isSchedulesLoading}
                isReady={areSchedulesReady}
                onCreateSchedule={createEvent}
                onDeleteSchedule={deleteEvent}
              />
              <TodoWidget
                todos={filteredTodos}
                isLoading={isTasksLoading}
                isReady={areTasksReady}
                onCreateTodo={createTask}
                onToggleTodo={toggleTask}
                onDeleteTodo={deleteTask}
              />
              <AiToolsWidget />
              <RecentWidget
                recentDocs={notes.slice(0, 4)}
                onSelectDoc={() => setActiveMenu('notes')}
              />
              <MemoWidget
                memoText={memoText}
                setMemoText={setMemoText}
                onSaveMemo={createQuickMemo}
                isLoading={areMemosLoading || Boolean(memosError)}
              />
            </div>
          )}

          {activeMenu === 'notes' && (
            <NotesPage
              notes={notes}
              folders={folders}
              onCreateNote={createNote}
              onUpdateNote={updateNote}
              onSetNoteFavorite={setNoteFavorite}
              onDeleteNote={deleteNoteToTrash}
              onCreateFolder={createFolder}
              onRenameFolder={renameFolder}
              onDeleteFolder={deleteFolder}
              isLoading={isNotesLoading}
              isFoldersLoading={isFoldersLoading}
              foldersError={foldersError}
              onRetryFolders={retryFolders}
            />
          )}

          {activeMenu === 'favorites' && (
            <FavoritesPage
              userId={user.id}
              notes={notes}
              projects={projects}
              isNotesLoading={isNotesLoading}
              isProjectsLoading={isProjectsLoading}
              onSetNoteFavorite={setNoteFavorite}
              onUpdateProject={updateProject}
              onNavigate={setActiveMenu}
            />
          )}

          {activeMenu === 'quick_memo' && (
            <QuickMemoPage
              quickMemos={quickMemos}
              onCreateMemo={createQuickMemo}
              onUpdateMemo={updateQuickMemo}
              onMoveToTrash={archiveQuickMemo}
              isLoading={areMemosLoading || Boolean(memosError)}
            />
          )}

          {activeMenu === 'projects' && (
            <ProjectsPage
              projects={projects}
              isLoading={isProjectsLoading}
              isReady={areProjectsReady}
              onCreateProject={createProject}
              onUpdateProject={updateProject}
              onDeleteProject={deleteProject}
            />
          )}

          {activeMenu === 'schedule' && (
            <div className="grid flex-1 grid-cols-1 gap-6 md:min-h-0 md:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
              <div className="md:self-start">
                <CalendarWidget
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
              </div>
              <ScheduleWidget
                className="h-[65vh] md:h-full"
                schedules={filteredSchedules}
                selectedDate={selectedDate}
                isLoading={isSchedulesLoading}
                isReady={areSchedulesReady}
                onCreateSchedule={createEvent}
                onDeleteSchedule={deleteEvent}
              />
            </div>
          )}

          {activeMenu === 'tasks' && (
            <div className="max-w-3xl">
              <TodoWidget
                todos={filteredTodos}
                isLoading={isTasksLoading}
                isReady={areTasksReady}
                onCreateTodo={createTask}
                onToggleTodo={toggleTask}
                onDeleteTodo={deleteTask}
              />
            </div>
          )}

          {activeMenu === 'bookmarks' && (
            <BookmarksPage key={user.id} userId={user.id} />
          )}

          {activeMenu === 'files' && (
            <FilesPage key={user.id} userId={user.id} />
          )}

          {activeMenu === 'backup' && (
            <BackupPage
              key={user.id}
              userId={user.id}
              memoText={memoText}
              quickMemos={quickMemos}
              mergeBackupMemos={mergeBackupMemos}
              onRestoreComplete={() => {
                retryNotes();
                retryFolders();
                retryTasks();
                retrySchedules();
                retryProjects();
                retryTrash();
              }}
            />
          )}

          {activeMenu === 'ai_tools' && (
            <div className="max-w-3xl">
              <AiToolsWidget />
            </div>
          )}

          {activeMenu === 'trash' && (
            <TrashPage
              items={trash}
              isLoading={isTrashLoading}
              onRestore={restoreFromTrash}
              onDelete={handleDeleteTrashItem}
              onEmpty={handleEmptyTrash}
            />
          )}
        </div>
      </main>
    </div>
  );
}