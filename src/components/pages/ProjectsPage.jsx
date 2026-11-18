import React, { useState } from 'react';
import { FolderKanban, Plus, Star, Trash2 } from 'lucide-react';

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
    <div className="w-full space-y-6">
      {/* Create form */}
      <form
        onSubmit={addProject}
        className="ui-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center"
      >
        <input
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="TAG"
          aria-label="Project tag"
          className="ui-input h-10 w-full font-bold uppercase sm:w-24"
          disabled={!isReady}
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New project name..."
          aria-label="Project name"
          className="ui-input h-10 min-w-0 flex-1 text-body"
          disabled={!isReady}
        />
        <button
          type="submit"
          disabled={!isReady || !title.trim()}
          className="ui-btn ui-btn-primary h-10 shrink-0 px-5 w-full sm:w-auto"
        >
          <Plus size={14} />
          Create
        </button>
      </form>

      {/* List */}
      {isLoading ? (
        <div className="ui-card py-14 text-center">
          <p className="ui-empty">프로젝트를 불러오는 중...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="ui-card flex flex-col items-center justify-center gap-3 py-16 text-center">
          <FolderKanban size={28} className="text-muted opacity-40" />
          <p className="ui-empty">등록된 프로젝트가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="ui-card flex flex-col justify-between gap-4 p-5 transition-shadow hover:shadow-md"
            >
              {/* Header */}
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="ui-tag">{proj.tag}</span>
                  <div className="-mr-1 flex items-center">
                    <button
                      type="button"
                      onClick={() =>
                        void onUpdateProject(proj.id, {
                          is_favorite: !proj.isFavorite,
                        })
                      }
                      aria-label={`${proj.isFavorite ? 'Remove' : 'Add'} ${proj.title} ${proj.isFavorite ? 'from' : 'to'} favorites`}
                      aria-pressed={proj.isFavorite}
                      title={
                        proj.isFavorite
                          ? 'Remove from favorites'
                          : 'Add to favorites'
                      }
                      className={`ui-icon-btn ${
                        proj.isFavorite
                          ? 'text-amber-500 hover:text-amber-600'
                          : 'text-muted hover:text-amber-500'
                      }`}
                      disabled={!isReady}
                    >
                      <Star
                        size={14}
                        fill={proj.isFavorite ? 'currentColor' : 'none'}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDeleteProject(proj.id)}
                      className="ui-icon-btn text-muted hover:text-destructive"
                      disabled={!isReady}
                      aria-label={`Delete ${proj.title}`}
                      title="Delete project"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 className="mb-4 text-[15px] font-semibold leading-snug break-words">
                  {proj.title}
                </h3>

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-meta font-bold tabular-nums text-muted">
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
                    className="w-full cursor-pointer accent-ink"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex gap-1 border-t border-line-soft pt-3">
                {STATUS_OPTIONS.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => updateStatus(proj.id, st)}
                    disabled={!isReady}
                    aria-pressed={proj.status === st}
                    className={`ui-segment flex-1 ${
                      proj.status === st
                        ? 'ui-segment-active'
                        : 'ui-segment-idle'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}