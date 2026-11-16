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
import { RotateCcw, Trash2 } from 'lucide-react';
import AuthPage from './components/AuthPage'
import { useAuth } from './contexts/AuthContext'
import useNotes from './hooks/useNotes'
import useTasks from './hooks/useTasks'
import useScheduleEvents from './hooks/useScheduleEvents'
import useProjects from './hooks/useProjects'
import useUnifiedSearch from './hooks/useUnifiedSearch'
import useTrash from './hooks/useTrash'
import useQuickMemos from './hooks/useQuickMemos'

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
};

export default function App() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
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
    updateTaskDueDate,
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

    if (isLoading) return <div>불러오는 중...</div>
if (!user) return <AuthPage />

  return ( 
    
    <div className="min-h-screen md:h-screen flex bg-[#F5F5F5] text-black overflow-x-hidden md:overflow-hidden">
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

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {notesError && (
            <div
              role="alert"
              className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-[12px] text-red-800"
            >
              <p>{notesError}</p>
              <button
                onClick={retryNotes}
                className="mt-2 font-bold underline cursor-pointer"
              >
                다시 시도
              </button>
            </div>
          )}
          {trashError && (
            <div
              role="alert"
              className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-[12px] text-red-800"
            >
              <p>{trashError}</p>
              <button
                onClick={retryTrash}
                className="mt-2 font-bold underline cursor-pointer"
              >
                다시 시도
              </button>
            </div>
          )}
          {memosError && (
            <div
              role="alert"
              className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-[12px] text-red-800"
            >
              <p>{memosError}</p>
              <button
                onClick={retryMemos}
                className="mt-2 font-bold underline cursor-pointer"
              >
                다시 시도
              </button>
            </div>
          )}
          {tasksError && (
            <div
              role="alert"
              className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-[12px] text-red-800"
            >
              <p>{tasksError}</p>
              <button
                onClick={retryTasks}
                className="mt-2 font-bold underline cursor-pointer"
              >
                다시 시도
              </button>
            </div>
          )}
          {schedulesError && (
            <div
              role="alert"
              className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-[12px] text-red-800"
            >
              <p>{schedulesError}</p>
              <button
                onClick={retrySchedules}
                className="mt-2 font-bold underline cursor-pointer"
              >
                다시 시도
              </button>
            </div>
          )}
          {projectsError && (
            <div
              role="alert"
              className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-[12px] text-red-800"
            >
              <p>{projectsError}</p>
              <button
                onClick={retryProjects}
                className="mt-2 font-bold underline cursor-pointer"
              >
                다시 시도
              </button>
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
                onUpdateTodoDueDate={updateTaskDueDate}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
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
            </div>
          )}

          {activeMenu === 'tasks' && (
            <div className="max-w-2xl">
              <TodoWidget
                todos={filteredTodos}
                isLoading={isTasksLoading}
                isReady={areTasksReady}
                onCreateTodo={createTask}
                onToggleTodo={toggleTask}
                onDeleteTodo={deleteTask}
                onUpdateTodoDueDate={updateTaskDueDate}
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
            <div className="bg-white border border-[#CCCCCC] rounded-[8px] p-6 max-w-3xl">
              <div className="flex justify-between items-center border-b border-[#E6E6E6] pb-3 mb-4">
                <h2 className="text-[15px] font-bold">
                  // TRASH ({trash.length})
                </h2>
                {trash.length > 0 && (
                  <button
                    onClick={handleEmptyTrash}
                    className="text-[11px] font-bold text-[#666666] hover:text-black cursor-pointer"
                  >
                    EMPTY TRASH
                  </button>
                )}
              </div>
              {isTrashLoading ? (
                <p className="text-[12px] text-[#666666] py-6 text-center">
                  Loading trash...
                </p>
              ) : trash.length === 0 ? (
                <p className="text-[12px] text-[#666666] py-6 text-center">
                  Trash is empty.
                </p>
              ) : (
                <div className="space-y-2">
                  {trash.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-[#F5F5F5] rounded-[4px] text-[12px]"
                    >
                      <div>
                        <span className="font-bold mr-2">[{item.type}]</span>
                        <span>{item.title}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => restoreFromTrash(item)}
                          className="p-1.5 bg-white border border-black/20 rounded hover:border-black cursor-pointer"
                          title="Restore"
                        >
                          <RotateCcw size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteTrashItem(item.id)}
                          className="p-1.5 bg-white border border-black/20 rounded hover:border-black cursor-pointer"
                          title="Delete permanently"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}