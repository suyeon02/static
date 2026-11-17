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
        className="ui-card flex flex-wrap gap-2 p-4"
      >
        <input
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="TAG"
          aria-label="Project tag"
          className="ui-input w-24 font-bold uppercase"
          disabled={!isReady}
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="+ New project name..."
          aria-label="Project name"
          className="ui-input flex-1 min-w-[200px] text-body"
          disabled={!isReady}
        />
        <button
          type="submit"
          disabled={!isReady}
          className="ui-btn ui-btn-primary px-4"
        >
          <Plus size={14} /> CREATE
        </button>
      </form>

      {isLoading ? (
        <p className="ui-empty">
          프로젝트를 불러오는 중...
        </p>
      ) : projects.length === 0 ? (
        <p className="ui-empty">
          등록된 프로젝트가 없습니다.
        </p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((proj) => (
          <div
            key={proj.id}
            className="ui-card flex flex-col justify-between gap-4"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="ui-tag">
                  {proj.tag}
                </span>
                <div className="-mr-2 flex items-center gap-0.5">
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
                    className={`ui-icon-btn ${
                      proj.isFavorite ? 'text-amber-500 hover:text-amber-600' : ''
                    }`}
                    disabled={!isReady}
                  >
                    <Star size={14} fill={proj.isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => void onDeleteProject(proj.id)}
                    className="ui-icon-btn"
                    disabled={!isReady}
                    aria-label={`Delete ${proj.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="mb-4 text-title font-bold break-words">{proj.title}</h3>

              {/* 진행률 바 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-meta font-bold text-muted tabular-nums">
                  <span>PROGRESS</span>
                  <span className="text-ink">{proj.progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={proj.progress}
                  onChange={(e) => updateProgress(proj.id, e.target.value)}
                  disabled={!isReady}
                  aria-label={`${proj.title} progress`}
                  className="w-full accent-ink cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-1 border-t border-line-soft pt-3">
              {STATUS_OPTIONS.map((st) => (
                <button
                  key={st}
                  onClick={() => updateStatus(proj.id, st)}
                  disabled={!isReady}
                  type="button"
                  aria-pressed={proj.status === st}
                  className={`ui-segment flex-1 ${
                    proj.status === st ? 'ui-segment-active' : 'ui-segment-idle'
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