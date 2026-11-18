import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getLocalizedErrorMessage } from '../lib/userFacingError';

const LEGACY_PROJECTS_KEY = 'static_projects';
const BACKUP_KEY_PREFIX = 'static_projects_backup_';
const MIGRATION_USER_KEY = 'static_projects_migration_user_id';
const MIGRATION_DONE_KEY = 'static_projects_migration_done_user_id';

const PROJECT_FIELDS =
  'id, title, tag, status, progress, is_favorite, links';

const PROJECT_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const LINK_KEYS = ['repository', 'website', 'admin', 'docs'];

function normalizeLinks(value) {
  if (value == null) return {};

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('프로젝트 링크 형식이 올바르지 않습니다.');
  }

  const result = {};

  for (const key of LINK_KEYS) {
    const raw = value[key];

    if (raw == null || raw === '') continue;

    if (typeof raw !== 'string') {
      throw new Error('프로젝트 링크는 주소 문자열이어야 합니다.');
    }

    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (
      trimmed.startsWith('//') ||
      (
        /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed) &&
        !/^https?:\/\//i.test(trimmed)
      )
    ) {
      throw new Error('HTTP 또는 HTTPS 주소만 저장할 수 있습니다.');
    }

    let parsed;

    try {
      parsed = new URL(
        /^https?:\/\//i.test(trimmed)
          ? trimmed
          : `https://${trimmed}`,
      );
    } catch {
      throw new Error('올바른 프로젝트 링크 주소를 입력해 주세요.');
    }

    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password
    ) {
      throw new Error(
        '아이디·비밀번호가 포함되지 않은 HTTP 또는 HTTPS 주소를 입력해 주세요.',
      );
    }

    result[key] = parsed.href;
  }

  return result;
}

function mapProject(row) {
  return {
    id: row.id,
    title: row.title,
    tag: row.tag,
    status: row.status,
    progress: row.progress,
    isFavorite: row.is_favorite === true,
    links:
      row.links &&
      typeof row.links === 'object' &&
      !Array.isArray(row.links)
        ? row.links
        : {},
  };
}

function mapLegacyProject(project) {
  if (
    !project ||
    typeof project.title !== 'string' ||
    !project.title.trim() ||
    !PROJECT_STATUSES.includes(project.status) ||
    !Number.isInteger(project.progress) ||
    project.progress < 0 ||
    project.progress > 100
  ) {
    throw new Error('기존 프로젝트 형식이 올바르지 않습니다.');
  }

  return {
    title: project.title.trim(),
    tag:
      typeof project.tag === 'string' && project.tag.trim()
        ? project.tag.trim()
        : 'DEV',
    status: project.status,
    progress: project.progress,
  };
}

function saveBackup(userId, projects) {
  localStorage.setItem(
    `${BACKUP_KEY_PREFIX}${userId}`,
    JSON.stringify(projects),
  );
}

export default function useProjects(userId) {
  const [projectsState, setProjectsState] = useState({
    userId: null,
    projects: [],
  });

  const [loadState, setLoadState] = useState({
    userId: null,
    version: -1,
    status: 'idle',
  });

  const [errorState, setErrorState] = useState({
    userId: null,
    message: '',
  });

  const [reloadVersion, setReloadVersion] = useState(0);

  const migrationPromises = useRef(new Map());
  const currentUserId = useRef(userId);
  const projectsRef = useRef(projectsState);

  const commitProjects = useCallback((ownerId, nextProjects) => {
    projectsRef.current = {
      userId: ownerId,
      projects: nextProjects,
    };

    setProjectsState({
      userId: ownerId,
      projects: nextProjects,
    });

    try {
      saveBackup(ownerId, nextProjects);
      setErrorState({ userId: ownerId, message: '' });
    } catch (backupError) {
      setErrorState({
        userId: ownerId,
        message: `프로젝트 로컬 백업을 저장하지 못했습니다: ${getLocalizedErrorMessage(
          backupError,
          '다시 시도해 주세요.',
        )}`,
      });
    }
  }, []);

  const projects =
    projectsState.userId === userId ? projectsState.projects : [];

  const isReady =
    Boolean(userId) &&
    loadState.userId === userId &&
    loadState.version === reloadVersion &&
    loadState.status === 'success';

  const isLoading = Boolean(
    userId &&
      (
        loadState.userId !== userId ||
        loadState.version !== reloadVersion ||
        loadState.status === 'loading'
      ),
  );

  const error =
    errorState.userId === userId ? errorState.message : '';

  useEffect(() => {
    currentUserId.current = userId;
  }, [userId]);

  useEffect(() => {
    projectsRef.current = projectsState;
  }, [projectsState]);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      return () => {
        cancelled = true;
      };
    }

    const loadProjects = async () => {
      try {
        setErrorState({ userId, message: '' });

        let migrationUserId = localStorage.getItem(MIGRATION_USER_KEY);

        if (!migrationUserId) {
          localStorage.setItem(MIGRATION_USER_KEY, userId);
          migrationUserId = userId;
        }

        const { data, error: loadError } = await supabase
          .from('projects')
          .select(PROJECT_FIELDS)
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (loadError) throw loadError;

        let rows = data || [];

        if (
          migrationUserId === userId &&
          localStorage.getItem(MIGRATION_DONE_KEY) !== userId
        ) {
          let migration = migrationPromises.current.get(userId);

          if (!migration) {
            migration = (async () => {
              let migratedRows = rows;

              if (rows.length === 0) {
                const backup = localStorage.getItem(LEGACY_PROJECTS_KEY);
                const savedProjects = backup ? JSON.parse(backup) : [];

                if (!Array.isArray(savedProjects)) {
                  throw new Error(
                    '기존 프로젝트 형식이 올바르지 않습니다.',
                  );
                }

                const projectsToImport =
                  savedProjects.map(mapLegacyProject);

                if (projectsToImport.length > 0) {
                  if (currentUserId.current !== userId) {
                    throw new Error(
                      '로그인 계정이 변경되어 프로젝트 가져오기를 취소했습니다.',
                    );
                  }

                  const { data: importedRows, error: importError } =
                    await supabase
                      .from('projects')
                      .insert(
                        projectsToImport.map((project) => ({
                          ...project,
                          user_id: userId,
                        })),
                      )
                      .select(PROJECT_FIELDS);

                  if (importError) throw importError;

                  migratedRows = importedRows || [];
                }
              }

              localStorage.setItem(MIGRATION_DONE_KEY, userId);

              return migratedRows;
            })();

            migrationPromises.current.set(userId, migration);
          }

          try {
            rows = await migration;
          } catch (migrationError) {
            migrationPromises.current.delete(userId);
            throw migrationError;
          }
        }

        if (!cancelled && currentUserId.current === userId) {
          const mappedProjects = rows.map(mapProject);

          commitProjects(userId, mappedProjects);

          setLoadState({
            userId,
            version: reloadVersion,
            status: 'success',
          });
        }
      } catch (loadError) {
        if (!cancelled && currentUserId.current === userId) {
          setErrorState({
            userId,
            message: `프로젝트를 불러오지 못했습니다: ${getLocalizedErrorMessage(
              loadError,
              '다시 시도해 주세요.',
            )}`,
          });

          setLoadState({
            userId,
            version: reloadVersion,
            status: 'error',
          });
        }
      }
    };

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [commitProjects, userId, reloadVersion]);

  const createProject = useCallback(
    async (project) => {
      if (
        !userId ||
        !isReady ||
        currentUserId.current !== userId
      ) {
        return false;
      }

      try {
        const { data, error: createError } = await supabase
          .from('projects')
          .insert({
            ...project,
            links: normalizeLinks(project.links),
            user_id: userId,
          })
          .select(PROJECT_FIELDS)
          .single();

        if (createError) throw createError;

        if (currentUserId.current === userId) {
          const currentProjects =
            projectsRef.current.userId === userId
              ? projectsRef.current.projects
              : [];

          commitProjects(userId, [
            mapProject(data),
            ...currentProjects,
          ]);
        }

        return true;
      } catch (createError) {
        setErrorState({
          userId,
          message: `프로젝트를 만들지 못했습니다: ${getLocalizedErrorMessage(
            createError,
            '다시 시도해 주세요.',
          )}`,
        });

        return false;
      }
    },
    [commitProjects, isReady, userId],
  );

  const updateProject = useCallback(
    async (id, patch) => {
      if (
        !userId ||
        !isReady ||
        currentUserId.current !== userId
      ) {
        return false;
      }

      try {
        const nextPatch = { ...patch };

        if (Object.prototype.hasOwnProperty.call(patch, 'links')) {
          nextPatch.links = normalizeLinks(patch.links);
        }

        const { data, error: updateError } = await supabase
          .from('projects')
          .update(nextPatch)
          .eq('id', id)
          .eq('user_id', userId)
          .select(PROJECT_FIELDS)
          .single();

        if (updateError) throw updateError;

        if (
          currentUserId.current === userId &&
          projectsRef.current.userId === userId
        ) {
          const nextProjects =
            projectsRef.current.projects.map((project) =>
              project.id === id ? mapProject(data) : project,
            );

          commitProjects(userId, nextProjects);
        }

        return true;
      } catch (updateError) {
        setErrorState({
          userId,
          message: `프로젝트를 수정하지 못했습니다: ${getLocalizedErrorMessage(
            updateError,
            '다시 시도해 주세요.',
          )}`,
        });

        return false;
      }
    },
    [commitProjects, isReady, userId],
  );

  const deleteProject = useCallback(
    async (id) => {
      if (
        !userId ||
        !isReady ||
        currentUserId.current !== userId
      ) {
        return false;
      }

      try {
        const { error: deleteError } = await supabase
          .from('projects')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;

        if (
          currentUserId.current === userId &&
          projectsRef.current.userId === userId
        ) {
          const nextProjects =
            projectsRef.current.projects.filter(
              (project) => project.id !== id,
            );

          commitProjects(userId, nextProjects);
        }

        return true;
      } catch (deleteError) {
        setErrorState({
          userId,
          message: `프로젝트를 삭제하지 못했습니다: ${getLocalizedErrorMessage(
            deleteError,
            '다시 시도해 주세요.',
          )}`,
        });

        return false;
      }
    },
    [commitProjects, isReady, userId],
  );

  const retry = useCallback(() => {
    setReloadVersion((version) => version + 1);
  }, []);

  return {
    projects,
    isLoading,
    isReady,
    error,
    createProject,
    updateProject,
    deleteProject,
    retry,
  };
}