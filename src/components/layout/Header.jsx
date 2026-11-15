import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Bookmark,
  CalendarDays,
  CheckSquare,
  FileArchive,
  FileText,
  FolderKanban,
  LoaderCircle,
  LogOut,
  Menu,
  Search,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import usePushNotifications from '../../hooks/usePushNotifications';
import PushNotificationsPanel from './PushNotificationsPanel';
import { getLocalizedErrorMessage } from '../../lib/userFacingError';

const RESULT_GROUPS = [
  { key: 'notes', label: 'NOTES', icon: FileText },
  { key: 'tasks', label: 'TASKS', icon: CheckSquare },
  { key: 'events', label: 'SCHEDULE', icon: CalendarDays },
  { key: 'projects', label: 'PROJECTS', icon: FolderKanban },
  { key: 'bookmarks', label: 'BOOKMARKS', icon: Bookmark },
  { key: 'files', label: 'FILES', icon: FileArchive },
];

export default function Header({
  onOpenSidebar,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearchLoading,
  searchError,
  onSelectSearchResult,
}) {
  const { signOut, user } = useAuth();
  const push = usePushNotifications(user?.id);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPushPanelOpen, setIsPushPanelOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const flattenedResults = RESULT_GROUPS.flatMap((group) =>
    (searchResults?.[group.key] || []).map((result) => ({
      ...result,
      group: group.key,
    })),
  );

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!searchContainerRef.current?.contains(event.target)) {
        setIsSearchOpen(false);
        setActiveResultIndex(-1);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError('');

    try {
      const { error } = await signOut();
      if (error) setSignOutError(getLocalizedErrorMessage(error));
    } catch (error) {
      setSignOutError(getLocalizedErrorMessage(error));
    } finally {
      setIsSigningOut(false);
    }
  };

  const selectResult = (result) => {
    onSelectSearchResult(result);
    setIsSearchOpen(false);
    setActiveResultIndex(-1);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsSearchOpen(false);
      setActiveResultIndex(-1);
      return;
    }

    if (event.key === 'ArrowDown' && flattenedResults.length > 0) {
      event.preventDefault();
      setIsSearchOpen(true);
      setActiveResultIndex((index) =>
        index >= flattenedResults.length - 1 ? 0 : index + 1,
      );
    } else if (event.key === 'ArrowUp' && flattenedResults.length > 0) {
      event.preventDefault();
      setIsSearchOpen(true);
      setActiveResultIndex((index) =>
        index <= 0 ? flattenedResults.length - 1 : index - 1,
      );
    } else if (event.key === 'Enter' && flattenedResults.length > 0) {
      event.preventDefault();
      selectResult(
        flattenedResults[
          activeResultIndex >= 0 ? activeResultIndex : 0
        ],
      );
    }
  };

  return (
    <header className="relative h-20 shrink-0 bg-[#F5F5F5] border-b border-[#CCCCCC] px-4 md:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={onOpenSidebar}
          className="md:hidden w-10 h-10 bg-white border border-black/30 rounded-[4px] flex items-center justify-center shrink-0 cursor-pointer"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        <div ref={searchContainerRef} className="relative w-full">
          <label className="relative w-full block">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 flex pointer-events-none">
            <Search size={16} strokeWidth={2} color="#111111" />
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            maxLength={100}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setIsSearchOpen(Boolean(event.target.value.trim()));
              setActiveResultIndex(-1);
            }}
            onFocus={() => setIsSearchOpen(Boolean(searchQuery.trim()))}
            onKeyDown={handleSearchKeyDown}
            placeholder="grep 'search_query'..."
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isSearchOpen && Boolean(searchQuery.trim())}
            aria-controls="global-search-results"
            aria-activedescendant={
              activeResultIndex >= 0
                ? `global-search-result-${activeResultIndex}`
                : undefined
            }
            className="w-full py-2 pr-4 pl-9 bg-white border border-black/30 rounded-[4px] text-[14px] font-medium text-black placeholder:text-[#666666] outline-none focus:border-black"
          />
          </label>
          {isSearchOpen && searchQuery.trim() && (
            <div
              id="global-search-results"
              role="listbox"
              aria-label="Unified search results"
              className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[min(70vh,32rem)] overflow-y-auto rounded-[6px] border border-black/20 bg-white p-2 shadow-lg"
            >
              {isSearchLoading ? (
                <p className="flex items-center gap-2 px-3 py-4 text-[12px] text-[#666666]">
                  <LoaderCircle size={14} className="animate-spin" />
                  Searching...
                </p>
              ) : searchError ? (
                <p role="alert" className="px-3 py-4 text-[12px] text-red-700">
                  검색하지 못했습니다: {searchError}
                </p>
              ) : flattenedResults.length === 0 ? (
                <p className="px-3 py-4 text-[12px] text-[#666666]">
                  No results found.
                </p>
              ) : (
                RESULT_GROUPS.map((group) => {
                  const results = searchResults?.[group.key] || [];
                  if (results.length === 0) return null;
                  const Icon = group.icon;

                  return (
                    <section
                      key={group.key}
                      role="group"
                      aria-label={group.label}
                    >
                      <h2 className="px-3 pb-1 pt-2 text-[10px] font-bold tracking-[0.08em] text-[#777777]">
                        {group.label}
                      </h2>
                      {results.map((result) => {
                        const resultIndex = flattenedResults.findIndex(
                          (item) =>
                            item.group === group.key && item.id === result.id,
                        );
                        return (
                          <button
                            key={`${group.key}-${result.id}`}
                            id={`global-search-result-${resultIndex}`}
                            type="button"
                            role="option"
                            aria-selected={activeResultIndex === resultIndex}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() =>
                              setActiveResultIndex(resultIndex)
                            }
                            onClick={() => selectResult(result)}
                            className={`flex w-full items-center gap-3 rounded-[4px] px-3 py-2 text-left ${
                              activeResultIndex === resultIndex
                                ? 'bg-[#F0F0F0]'
                                : 'hover:bg-[#F5F5F5]'
                            }`}
                          >
                            <Icon size={14} className="shrink-0 text-[#666666]" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12px] font-semibold text-black">
                                {result.title}
                              </span>
                              {result.detail && (
                                <span className="mt-0.5 block truncate text-[10px] text-[#777777]">
                                  {result.detail}
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </section>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="h-10 px-3 bg-white border border-black/30 rounded-[4px] flex items-center justify-center gap-2 text-[11px] font-bold hover:border-black disabled:opacity-50 cursor-pointer"
        >
          <LogOut size={16} strokeWidth={2} />
          {isSigningOut ? 'SIGNING OUT...' : 'SIGN OUT'}
        </button>
        <div className="relative">
          <button
            type="button"
            aria-label="Push reminder settings"
            aria-haspopup="dialog"
            aria-expanded={isPushPanelOpen}
            aria-controls={
              isPushPanelOpen ? 'push-reminder-settings-panel' : undefined
            }
            onClick={() => setIsPushPanelOpen((open) => !open)}
            className="w-10 h-10 bg-white border border-black/30 rounded-[4px] flex items-center justify-center relative hover:border-black cursor-pointer"
          >
            <Bell size={16} strokeWidth={2} />
            {push.enabled && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full" />
            )}
          </button>
          {isPushPanelOpen && (
            <div id="push-reminder-settings">
              <PushNotificationsPanel
                push={push}
                onClose={() => setIsPushPanelOpen(false)}
              />
            </div>
          )}
        </div>
        <button
          aria-label="Settings"
          className="w-10 h-10 bg-white border border-black/30 rounded-[4px] flex items-center justify-center hover:border-black cursor-pointer"
        >
          <Settings size={16} strokeWidth={2} />
        </button>
      </div>
      {signOutError && (
        <p
          role="alert"
          className="absolute top-full right-4 md:right-8 z-10 mt-2 max-w-[calc(100vw-2rem)] rounded border border-red-300 bg-red-50 px-3 py-2 text-[12px] text-red-800"
        >
          로그아웃하지 못했습니다: {signOutError}
        </p>
      )}
    </header>
  );
}