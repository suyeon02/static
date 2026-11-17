import React from 'react';
import {
  FileText,
  FolderKanban,
  LayoutDashboard,
  StickyNote,
  Calendar,
  CheckSquare,
  Bookmark,
  Star,
  Cpu,
  Trash2,
  X,
  FileArchive,
  Database,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    title: 'HOME',
    items: [{ id: 'dashboard', label: 'DASHBOARD', icon: LayoutDashboard }],
  },
  {
    title: 'MAIN',
    items: [
      { id: 'favorites', label: 'FAVORITES', icon: Star },
      { id: 'notes', label: 'NOTES', icon: FileText },
      { id: 'quick_memo', label: 'QUICK_MEMO', icon: StickyNote },
      { id: 'projects', label: 'PROJECTS', icon: FolderKanban },
    ],
  },
  {
    title: 'PLANNER',
    items: [
      { id: 'schedule', label: 'SCHEDULE', icon: Calendar },
      { id: 'tasks', label: 'TASKS', icon: CheckSquare },
    ],
  },
  {
    title: 'ARCHIVE',
    items: [
      { id: 'files', label: 'FILES', icon: FileArchive },
      { id: 'bookmarks', label: 'BOOKMARKS', icon: Bookmark },
      { id: 'ai_tools', label: 'AI_TOOLS', icon: Cpu },
      { id: 'trash', label: 'TRASH', icon: Trash2 },
      { id: 'backup', label: 'BACKUP', icon: Database },
    ],
  },
];

export default function Sidebar({ activeMenu, onSelectMenu, isOpen, onClose }) {
  const sidebarContent = (
    <aside className="w-64 h-full bg-canvas border-r border-line flex flex-col select-none">
      <div className="h-20 flex items-center justify-between px-6 border-b border-line shrink-0">
        <div className="flex items-center font-extrabold text-[18px] tracking-[-0.9px]">
          <span className="w-3 h-3 bg-ink rounded-full mr-2 inline-block" />
          <span>STATIC</span>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-1 text-ink hover:bg-black/5 rounded"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      <nav
        aria-label="Main"
        className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="px-3 mb-2 text-meta font-bold text-muted tracking-[0.1em]">
              {group.title}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => {
                      onSelectMenu(item.id);
                      onClose();
                    }}
                    className={`w-full h-9 flex items-center gap-3 px-3 rounded-md text-left text-small tracking-[0.04em] transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-ink text-white font-bold'
                        : 'text-ink font-medium hover:bg-hover'
                    }`}
                  >
                    <Icon size={16} strokeWidth={2} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );

  return (
    <>
      <div className="hidden md:block shrink-0 h-screen">{sidebarContent}</div>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}