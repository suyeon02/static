import React from 'react';
import {
  Folder,
  FileText,
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
    title: '[ HOME ]',
    items: [{ id: 'dashboard', label: 'DASHBOARD', isHome: true }],
  },
  {
    title: '[ MAIN ]',
    items: [
      { id: 'favorites', label: 'FAVORITES', icon: Star },
      { id: 'notes', label: 'NOTES', icon: Folder },
      { id: 'quick_memo', label: 'QUICK_MEMO', icon: FileText },
      { id: 'projects', label: 'PROJECTS', icon: Folder },
    ],
  },
  {
    title: '[ PLANNER ]',
    items: [
      { id: 'schedule', label: 'SCHEDULE', icon: Calendar },
      { id: 'tasks', label: 'TASKS', icon: CheckSquare },
    ],
  },
  {
    title: '[ ARCHIVE ]',
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
    <aside className="w-64 h-full bg-[#F5F5F5] border-r border-[#CCCCCC] flex flex-col select-none">
      <div className="h-20 flex items-center justify-between px-6 border-b border-[#CCCCCC] shrink-0">
        <div className="flex items-center font-extrabold text-[18px] tracking-[-0.9px]">
          <span className="w-3 h-3 bg-black rounded-full mr-2 inline-block" />
          <span>STATIC</span>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-1 text-black hover:bg-black/5 rounded"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6 text-[13px]">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="px-2 text-[12px] font-bold text-[#666666] uppercase tracking-[0.05em] mb-3">
              {group.title}
            </div>
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectMenu(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center px-3 py-2 rounded-[6px] text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-black text-white font-bold'
                        : 'text-black font-medium hover:bg-black/5'
                    }`}
                  >
                    {Icon && (
                      <Icon
                        size={16}
                        strokeWidth={2}
                        className={`mr-3 shrink-0 ${
                          isActive ? 'text-white' : 'text-black'
                        }`}
                      />
                    )}
                    <span
                      className={
                        item.isHome
                          ? 'text-[14px]'
                          : 'text-[12px] tracking-[0.6px]'
                      }
                    >
                      {item.label}
                    </span>
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