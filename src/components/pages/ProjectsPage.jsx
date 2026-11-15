import React, { useState } from 'react';
import { Plus, Star, Trash2 } from 'lucide-react';

const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'DONE'];

export default function ProjectsPage({
  projects,
  isLoading,
  isReady,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
}) {
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('DEV');

  const addProject = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const created = await onCreateProject({
      title: title.trim(),
      tag: tag.toUpperCase(),
      status: 'IN_PROGRESS',
      progress: 20,
    });
    if (created) setTitle('');
  };

  const updateStatus = (id, status) => {
    void onUpdateProject(id, {
      status,
      progress: status === 'DONE' ? 100 : status === 'TODO' ? 0 : 50,
    });
  };

  const updateProgress = (id, progress) => {
    const val = Number(progress);
    void onUpdateProject(id, {
      progress: val,
      status: val === 100 ? 'DONE' : val === 0 ? 'TODO' : 'IN_PROGRESS',
    });
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={addProject}
        className="bg-white border border-[#CCCCCC] rounded-[8px] p-4 flex flex-wrap gap-3"
      >
        <input
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="TAG"
          className="w-24 px-3 py-2 bg-[#F0F0F0] border border-black/15 rounded-[4px] text-[12px] font-bold uppercase outline-none focus:border-black"
          disabled={!isReady}
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="+ New project name..."
          className="flex-1 min-w-[200px] px-3 py-2 bg-[#F0F0F0] border border-black/15 rounded-[4px] text-[13px] outline-none focus:border-black"
          disabled={!isReady}
        />
        <button
          type="submit"
          disabled={!isReady}
          className="px-4 py-2 bg-black text-white text-[12px] font-bold rounded-[4px] flex items-center gap-1.5 cursor-pointer hover:bg-neutral-800"
        >
          <Plus size={14} /> CREATE
        </button>
      </form>

      {isLoading ? (
        <p className="py-8 text-center text-[12px] text-[#666666]">
          프로젝트를 불러오는 중...
        </p>
      ) : projects.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-[#666666]">
          등록된 프로젝트가 없습니다.
        </p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((proj) => (
          <div
            key={proj.id}
            className="bg-white border border-[#CCCCCC] rounded-[8px] p-5 flex flex-col justify-between gap-4"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-[#F0F0F0] border border-black/20 rounded-[3px]">
                  [{proj.tag}]
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void onUpdateProject(proj.id, {
                        is_favorite: !proj.isFavorite,
                      })
                    }
                    aria-label={`${proj.isFavorite ? 'Remove' : 'Add'} ${proj.title} ${proj.isFavorite ? 'from' : 'to'} favorites`}
                    aria-pressed={proj.isFavorite}
                    title={proj.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    className={`cursor-pointer ${
                      proj.isFavorite ? 'text-amber-500' : 'text-[#666666] hover:text-black'
                    }`}
                    disabled={!isReady}
                  >
                    <Star size={14} fill={proj.isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => void onDeleteProject(proj.id)}
                    className="text-[#666666] hover:text-black cursor-pointer"
                    disabled={!isReady}
                    aria-label={`Delete ${proj.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="text-[15px] font-bold mb-4">{proj.title}</h3>

              {/* 진행률 바 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold">
                  <span>PROGRESS</span>
                  <span>{proj.progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={proj.progress}
                  onChange={(e) => updateProgress(proj.id, e.target.value)}
                  disabled={!isReady}
                  className="w-full accent-black cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-1 pt-3 border-t border-[#E6E6E6]">
              {STATUS_OPTIONS.map((st) => (
                <button
                  key={st}
                  onClick={() => updateStatus(proj.id, st)}
                  disabled={!isReady}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-[3px] cursor-pointer ${
                    proj.status === st
                      ? 'bg-black text-white'
                      : 'bg-[#F5F5F5] text-[#666666] hover:text-black'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}