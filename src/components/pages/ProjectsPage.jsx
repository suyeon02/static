import React, { useRef, useState } from 'react';
import {
  ExternalLink,
  FileText,
  FolderKanban,
  GitBranch,
  Globe,
  Link2,
  Pencil,
  Plus,
  Save,
  Settings,
  Star,
  Trash2,
  X,
} from 'lucide-react';

const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'DONE'];

const LINK_FIELDS = [
  {
    key: 'repository',
    label: '저장소',
    placeholder: '저장소 주소',
    icon: GitBranch,
  },
  {
    key: 'website',
    label: '사이트',
    placeholder: '배포된 사이트 주소',
    icon: Globe,
  },
  {
    key: 'admin',
    label: '관리 페이지',
    placeholder: 'DB·배포 관리 페이지 주소',
    icon: Settings,
  },
  {
    key: 'docs',
    label: '문서',
    placeholder: '기획·개발 문서 주소',
    icon: FileText,
  },
];

function normalizeUrl(value) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('//')) return null;

  if (
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed) &&
    !/^https?:\/\//i.test(trimmed)
  ) {
    return null;
  }

  try {
    const url = new URL(
      /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`,
    );

    if (
      !['http:', 'https:'].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function ProjectLinks({ project, isReady, onUpdateProject }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);

  const savedLinks = LINK_FIELDS.flatMap((field) => {
    const href = normalizeUrl(project.links?.[field.key]);

    return href ? [{ ...field, href }] : [];
  });

  const startEditing = () => {
    const nextDraft = {};

    for (const field of LINK_FIELDS) {
      const value = project.links?.[field.key];
      nextDraft[field.key] =
        typeof value === 'string' ? value : '';
    }

    setDraft(nextDraft);
    setError('');
    setIsEditing(true);
  };

  const saveLinks = async (event) => {
    event.preventDefault();

    if (!isReady || savingRef.current) return;

    const links = {};

    for (const field of LINK_FIELDS) {
      const raw = (draft[field.key] || '').trim();

      // 빈 값은 저장 결과에서 제외하여 링크를 제거합니다.
      if (!raw) continue;

      const normalized = normalizeUrl(raw);

      if (!normalized) {
        setError(
          `${field.label}: 아이디·비밀번호가 포함되지 않은 HTTP 또는 HTTPS 주소를 입력해 주세요.`,
        );
        return;
      }

      links[field.key] = normalized;
    }

    savingRef.current = true;
    setIsSaving(true);
    setError('');

    try {
      const updated = await onUpdateProject(project.id, { links });

      if (!updated) {
        setError(
          '링크를 저장하지 못했습니다. 상단 오류 메시지도 확인해 주세요.',
        );
        return;
      }

      setIsEditing(false);
    } catch {
      setError('링크 저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="min-w-0 border-t border-line-soft pt-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-meta font-bold text-muted">
          <Link2 size={13} aria-hidden="true" />
          QUICK LINKS
        </span>

        {!isEditing && (
          <button
            type="button"
            onClick={startEditing}
            disabled={!isReady}
            className="ui-btn h-8 px-2 text-meta hover:bg-hover"
          >
            {savedLinks.length > 0 ? (
              <Pencil size={12} aria-hidden="true" />
            ) : (
              <Plus size={12} aria-hidden="true" />
            )}
            {savedLinks.length > 0 ? '링크 수정' : '링크 추가'}
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={saveLinks} className="space-y-3">
          <p className="text-meta leading-relaxed text-muted">
            주소만 저장하세요. 비밀번호·API 키·로그인 토큰이 포함된
            링크는 입력하지 마세요.
          </p>

          {LINK_FIELDS.map((field) => {
            const Icon = field.icon;

            return (
              <label
                key={field.key}
                className="flex min-w-0 flex-col gap-1.5"
              >
                <span className="flex items-center gap-1.5 text-small text-ink">
                  <Icon size={13} aria-hidden="true" />
                  {field.label}
                </span>

                <input
                  type="text"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={draft[field.key] || ''}
                  onChange={(event) => {
                    const value = event.target.value;

                    setDraft((current) => ({
                      ...current,
                      [field.key]: value,
                    }));
                  }}
                  placeholder={field.placeholder}
                  disabled={isSaving || !isReady}
                  className="ui-input"
                />
              </label>
            );
          })}

          <p className="text-meta text-muted">
            주소를 비우고 저장하면 해당 링크가 제거됩니다.
          </p>

          {error && (
            <p role="alert" className="text-small text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setError('');
              }}
              disabled={isSaving}
              className="ui-btn ui-btn-secondary h-8 px-3"
            >
              <X size={13} aria-hidden="true" />
              취소
            </button>

            <button
              type="submit"
              disabled={isSaving || !isReady}
              className="ui-btn ui-btn-primary h-8 px-3"
            >
              <Save size={13} aria-hidden="true" />
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      ) : savedLinks.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {savedLinks.map((link) => {
            const Icon = link.icon;

            return (
              <a
                key={link.key}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                title={link.href}
                aria-label={`${project.title} ${link.label} — 새 탭에서 열기`}
                className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded border border-line-soft bg-subtle px-2.5 py-1.5 text-small text-ink transition-colors hover:border-ink hover:bg-ink hover:text-white"
              >
                <Icon size={13} aria-hidden="true" />
                {link.label}
                <ExternalLink
                  size={11}
                  className="shrink-0"
                  aria-hidden="true"
                />
              </a>
            );
          })}
        </div>
      ) : (
        <p className="text-small leading-relaxed text-muted">
          저장소·사이트·관리 페이지·문서를 연결해 보세요.
        </p>
      )}
    </div>
  );
}

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
  const [isCreating, setIsCreating] = useState(false);
  const creatingRef = useRef(false);

  const addProject = async (event) => {
    event.preventDefault();

    if (!title.trim() || !isReady || creatingRef.current) return;

    creatingRef.current = true;
    setIsCreating(true);

    try {
      const created = await onCreateProject({
        title: title.trim(),
        tag: tag.trim().toUpperCase() || 'DEV',
        status: 'IN_PROGRESS',
        progress: 20,
        links: {},
      });

      if (created) setTitle('');
    } catch {
      // 상위 훅에서 오류를 표시합니다.
    } finally {
      creatingRef.current = false;
      setIsCreating(false);
    }
  };

  const updateStatus = (id, status) => {
    void onUpdateProject(id, {
      status,
      progress: status === 'DONE' ? 100 : status === 'TODO' ? 0 : 50,
    });
  };

  const updateProgress = (id, progress) => {
    const value = Number(progress);

    void onUpdateProject(id, {
      progress: value,
      status:
        value === 100
          ? 'DONE'
          : value === 0
            ? 'TODO'
            : 'IN_PROGRESS',
    });
  };

  const handleDelete = (project) => {
    if (!window.confirm(`"${project.title}" 프로젝트를 삭제할까요?`)) {
      return;
    }

    void onDeleteProject(project.id);
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Create form */}
      <form
        onSubmit={addProject}
        className="ui-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center"
      >
        <input
          type="text"
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          placeholder="TAG"
          aria-label="프로젝트 태그"
          className="ui-input h-10 w-full font-bold uppercase sm:w-24"
          disabled={!isReady || isCreating}
        />

        <input
  type="text"
  value={title}
  onChange={(event) => setTitle(event.target.value)}
  placeholder="New project name..."
  aria-label="프로젝트 이름"
  className="ui-input h-10 min-h-[40px] w-full min-w-0 flex-none text-body sm:flex-1"
  disabled={!isReady || isCreating}
/>

        <button
          type="submit"
          disabled={!isReady || !title.trim() || isCreating}
          className="ui-btn ui-btn-primary h-10 w-full shrink-0 px-5 sm:w-auto"
        >
          <Plus size={14} aria-hidden="true" />
          {isCreating ? 'Creating...' : 'Create'}
        </button>
      </form>

      {/* List */}
      {isLoading ? (
        <div className="ui-card py-14 text-center">
          <p role="status" className="ui-empty">
            프로젝트를 불러오는 중...
          </p>
        </div>
      ) : projects.length === 0 ? (
        <div className="ui-card flex flex-col items-center justify-center gap-3 py-16 text-center">
          <FolderKanban
            size={28}
            className="text-muted opacity-40"
            aria-hidden="true"
          />
          <p className="ui-empty">
            등록된 프로젝트가 없습니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="ui-card flex min-w-0 flex-col gap-4 p-5 transition-shadow hover:shadow-md"
            >
              {/* Header */}
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="ui-tag">
                    {project.tag}
                  </span>

                  <div className="-mr-1 flex items-center">
                    <button
                      type="button"
                      onClick={() =>
                        void onUpdateProject(project.id, {
                          is_favorite: !project.isFavorite,
                        })
                      }
                      aria-label={`${project.title} 즐겨찾기 ${
                        project.isFavorite ? '해제' : '추가'
                      }`}
                      aria-pressed={project.isFavorite}
                      title={
                        project.isFavorite
                          ? '즐겨찾기 해제'
                          : '즐겨찾기 추가'
                      }
                      className={`ui-icon-btn ${
                        project.isFavorite
                          ? 'text-amber-500 hover:text-amber-600'
                          : 'text-muted hover:text-amber-500'
                      }`}
                      disabled={!isReady}
                    >
                      <Star
                        size={14}
                        fill={
                          project.isFavorite
                            ? 'currentColor'
                            : 'none'
                        }
                        aria-hidden="true"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(project)}
                      className="ui-icon-btn text-muted hover:text-red-700"
                      disabled={!isReady}
                      aria-label={`${project.title} 삭제`}
                      title="프로젝트 삭제"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <h3 className="mb-4 break-words text-[15px] font-semibold leading-snug">
                  {project.title}
                </h3>

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-meta font-bold tabular-nums text-muted">
                    <span>PROGRESS</span>
                    <span className="text-ink">
                      {project.progress}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={project.progress}
                    onChange={(event) =>
                      updateProgress(
                        project.id,
                        event.target.value,
                      )
                    }
                    disabled={!isReady}
                    aria-label={`${project.title} 진행률`}
                    className="w-full cursor-pointer accent-ink"
                  />
                </div>
              </div>

              {/* Project shortcuts */}
              <ProjectLinks
                project={project}
                isReady={isReady}
                onUpdateProject={onUpdateProject}
              />

              {/* Status */}
              <div className="flex flex-wrap gap-1 border-t border-line-soft pt-3">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() =>
                      updateStatus(project.id, status)
                    }
                    disabled={!isReady}
                    aria-pressed={project.status === status}
                    className={`ui-segment min-h-8 flex-1 ${
                      project.status === status
                        ? 'ui-segment-active'
                        : 'ui-segment-idle'
                    }`}
                  >
                    {status}
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