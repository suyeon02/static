import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  mergeQuickMemoLists,
  planLegacyMemoMerge,
  shouldMigrateLegacyMemoData,
} from '../lib/memoSync';
import { getLocalizedErrorMessage } from '../lib/userFacingError';

const DRAFT_KEY = 'static_memo';
const QUICK_MEMOS_KEY = 'static_quick_memos';
const DEVICE_ID_KEY = 'static_memo_migration_device_id';
const MIGRATION_USER_KEY = 'static_memos_migration_user_id';
const MIGRATION_DONE_KEY = 'static_memos_migration_done_user_id';
const DRAFT_FIELDS = 'user_id, content, updated_at';
const QUICK_MEMO_FIELDS =
  'user_id, id, content, display_date, created_at';

function mapQuickMemo(row) {
  return {
    id: String(row.id),
    content: row.content,
    createdAt:
      row.display_date ||
      new Date(row.created_at).toLocaleDateString(),
  };
}

function parseLocalQuickMemos() {
  const saved = localStorage.getItem(QUICK_MEMOS_KEY);
  if (!saved) return [];

  const memos = JSON.parse(saved);
  if (
    !Array.isArray(memos) ||
    memos.some(
      (memo) =>
        !memo ||
        typeof memo !== 'object' ||
        (typeof memo.id !== 'string' && typeof memo.id !== 'number') ||
        typeof memo.content !== 'string',
    )
  ) {
    throw new Error('기존 빠른 메모 데이터 형식이 올바르지 않습니다.');
  }

  return memos.map((memo) => ({
    id: String(memo.id),
    content: memo.content,
    createdAt:
      typeof memo.createdAt === 'string' ? memo.createdAt : '',
  }));
}

function toQuickMemoRow(userId, memo) {
  return {
    user_id: userId,
    id: String(memo.id),
    content: memo.content,
    display_date: memo.createdAt || '',
  };
}

function isUniqueConflict(error) {
  return error?.code === '23505';
}

function getMigrationDeviceId() {
  const saved = localStorage.getItem(DEVICE_ID_KEY);
  if (saved && /^[a-zA-Z0-9-]{1,100}$/.test(saved)) return saved;
  const deviceId = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

export default function useQuickMemos(userId) {
  const [memoState, setMemoState] = useState({
    userId: null,
    draft: '',
    quickMemos: [],
  });
  const [loadState, setLoadState] = useState({
    userId: null,
    version: -1,
    status: 'idle',
  });
  const [errorState, setErrorState] = useState({ userId: null, message: '' });
  const [reloadVersion, setReloadVersion] = useState(0);
  const draftRef = useRef('');
  const quickMemosRef = useRef([]);
  const draftExistsRef = useRef(false);
  const readyUserIdRef = useRef(null);
  const draftSyncFailedUserIdRef = useRef(null);
  const draftTimerRef = useRef(null);
  const draftQueueRef = useRef(Promise.resolve());
  const pendingDraftSavesRef = useRef(0);
  const stateUserId = memoState.userId === userId ? userId : null;
  const memoText = stateUserId ? memoState.draft : '';
  const quickMemos = stateUserId ? memoState.quickMemos : [];
  const isLoading = Boolean(
    userId &&
      (loadState.userId !== userId ||
        loadState.version !== reloadVersion),
  );
  const error = errorState.userId === userId ? errorState.message : '';

  const setError = useCallback(
    (message) => setErrorState({ userId, message }),
    [userId],
  );

  const saveDraft = useCallback(
    (text, targetUserId) => {
      const previous = draftQueueRef.current;
      pendingDraftSavesRef.current += 1;
      const next = previous.catch(() => {}).then(async () => {
        const { error: saveError } = await supabase
          .from('memo_drafts')
          .upsert(
            {
              user_id: targetUserId,
              content: text,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
          );
        if (saveError) throw saveError;
        if (targetUserId === userId) {
          draftExistsRef.current = true;
          draftSyncFailedUserIdRef.current = null;
          setError('');
        }
      });
      draftQueueRef.current = next;
      void next
        .finally(() => {
          pendingDraftSavesRef.current -= 1;
        })
        .catch(() => {});
      void next.catch((saveError) => {
        if (targetUserId === userId) {
          draftSyncFailedUserIdRef.current = targetUserId;
          setError(
            `메모를 동기화하지 못했습니다: ${getLocalizedErrorMessage(saveError, '다시 시도해 주세요.')}`,
          );
        }
      });
      return next;
    },
    [setError, userId],
  );

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      readyUserIdRef.current = null;
      return () => {
        cancelled = true;
      };
    }

    readyUserIdRef.current = null;

    const loadMemos = async () => {
      try {
        const [draftResult, memosResult] = await Promise.all([
          supabase
            .from('memo_drafts')
            .select(DRAFT_FIELDS)
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('quick_memos')
            .select(QUICK_MEMO_FIELDS)
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
        ]);
        if (draftResult.error) throw draftResult.error;
        if (memosResult.error) throw memosResult.error;

        let draftRow = draftResult.data;
        let rows = memosResult.data || [];
        const migrationKey = `${MIGRATION_DONE_KEY}:${userId}`;
        let migrationUserId = localStorage.getItem(MIGRATION_USER_KEY);
        if (!migrationUserId) {
          localStorage.setItem(MIGRATION_USER_KEY, userId);
          migrationUserId = userId;
        }
        if (
          shouldMigrateLegacyMemoData(
            migrationUserId,
            userId,
            localStorage.getItem(migrationKey) === 'true',
          )
        ) {
          const localDraft = localStorage.getItem(DRAFT_KEY) || '';
          const localMemos = parseLocalQuickMemos();
          const mergePlan = planLegacyMemoMerge({
            hasCloudDraft: Boolean(draftRow),
            cloudDraft: draftRow?.content || '',
            cloudMemos: rows,
            localDraft,
            localMemos,
          });
          const memosToInsert = mergePlan.memosToInsert;
          if (mergePlan.preserveDraftAsMemo) {
            const preservedDraft = {
              id: `legacy-draft-${getMigrationDeviceId()}`,
              content: mergePlan.preserveDraftAsMemo,
              createdAt: new Date().toLocaleDateString(),
            };
            const alreadyExists = rows.some(
              (row) => String(row.id) === preservedDraft.id,
            );
            if (
              !alreadyExists &&
              !memosToInsert.some((memo) => memo.id === preservedDraft.id)
            ) {
              memosToInsert.push(preservedDraft);
            }
          }

          if (mergePlan.draftToInsert !== null) {
            const { data, error: insertError } = await supabase
              .from('memo_drafts')
              .insert({ user_id: userId, content: mergePlan.draftToInsert })
              .select(DRAFT_FIELDS)
              .single();
            if (insertError && !isUniqueConflict(insertError)) {
              throw insertError;
            }
            if (data) draftRow = data;
            if (insertError && isUniqueConflict(insertError)) {
              const { data: currentDraft, error: reloadDraftError } =
                await supabase
                  .from('memo_drafts')
                  .select(DRAFT_FIELDS)
                  .eq('user_id', userId)
                  .maybeSingle();
              if (reloadDraftError) throw reloadDraftError;
              draftRow = currentDraft;
            }
          }

          if (memosToInsert.length > 0) {
            const { error: insertError } = await supabase
              .from('quick_memos')
              .upsert(
                memosToInsert.map((memo) =>
                  toQuickMemoRow(userId, memo),
                ),
                {
                  onConflict: 'user_id,id',
                  ignoreDuplicates: true,
                },
              );
            if (insertError) throw insertError;
          }

          const { data: mergedRows, error: reloadError } = await supabase
            .from('quick_memos')
            .select(QUICK_MEMO_FIELDS)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
          if (reloadError) throw reloadError;
          rows = mergedRows || [];
          localStorage.setItem(migrationKey, 'true');
        } else if (migrationUserId !== userId) {
          localStorage.setItem(migrationKey, 'true');
        }

        if (cancelled) return;
        const loadedDraft = draftRow?.content || '';
        const loadedMemos = rows.map(mapQuickMemo);
        draftRef.current = loadedDraft;
        quickMemosRef.current = loadedMemos;
        draftExistsRef.current = Boolean(draftRow);
        draftSyncFailedUserIdRef.current = null;
        readyUserIdRef.current = userId;
        setMemoState({ userId, draft: loadedDraft, quickMemos: loadedMemos });
        localStorage.setItem(DRAFT_KEY, loadedDraft);
        localStorage.setItem(QUICK_MEMOS_KEY, JSON.stringify(loadedMemos));
        setErrorState({ userId, message: '' });
        setLoadState({ userId, version: reloadVersion, status: 'success' });
      } catch (loadError) {
        if (cancelled) return;
        setErrorState({
          userId,
          message: `메모를 불러오지 못했습니다: ${getLocalizedErrorMessage(loadError, '다시 시도해 주세요.')}`,
        });
        setLoadState({ userId, version: reloadVersion, status: 'error' });
      }
    };

    void loadMemos();
    return () => {
      cancelled = true;
    };
  }, [reloadVersion, setError, userId]);

  useEffect(() => {
    if (!userId || readyUserIdRef.current !== userId) return undefined;
    const channel = supabase
      .channel(`user-memos-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memo_drafts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const nextDraft = payload.new?.content || '';
          // Skip echoes of this device's own saves; applying them mid-typing
          // overwrites newer keystrokes (and breaks IME composition).
          if (
            draftTimerRef.current ||
            pendingDraftSavesRef.current > 0 ||
            nextDraft === draftRef.current
          ) {
            return;
          }
          draftRef.current = nextDraft;
          draftExistsRef.current = Boolean(payload.new);
          setMemoState((current) =>
            current.userId === userId
              ? { ...current, draft: nextDraft }
              : current,
          );
          try {
            localStorage.setItem(DRAFT_KEY, nextDraft);
          } catch (storageError) {
            setError(
              `메모를 이 기기에 저장하지 못했습니다: ${getLocalizedErrorMessage(storageError, '다시 시도해 주세요.')}`,
            );
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quick_memos',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const changedId = String(payload.new?.id || payload.old?.id || '');
          const nextMemos =
            payload.eventType === 'DELETE'
              ? quickMemosRef.current.filter(
                  (memo) => String(memo.id) !== changedId,
                )
              : mergeQuickMemoLists(
                  quickMemosRef.current.filter(
                    (memo) => String(memo.id) !== changedId,
                  ),
                  [mapQuickMemo(payload.new)],
                );
          quickMemosRef.current = nextMemos;
          setMemoState((current) =>
            current.userId === userId
              ? { ...current, quickMemos: nextMemos }
              : current,
          );
          try {
            localStorage.setItem(QUICK_MEMOS_KEY, JSON.stringify(nextMemos));
          } catch (storageError) {
            setError(
              `빠른 메모를 이 기기에 저장하지 못했습니다: ${getLocalizedErrorMessage(storageError, '다시 시도해 주세요.')}`,
            );
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [setError, userId, loadState.status]);

  useEffect(
    () => () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    },
    [userId],
  );

  const setMemoText = useCallback(
    (nextValue) => {
      if (readyUserIdRef.current !== userId) return;
      const nextDraft =
        typeof nextValue === 'function'
          ? nextValue(draftRef.current)
          : nextValue;
      draftRef.current = nextDraft;
      setMemoState((current) =>
        current.userId === userId
          ? { ...current, draft: nextDraft }
          : current,
      );
      try {
        localStorage.setItem(DRAFT_KEY, nextDraft);
      } catch (storageError) {
        setError(
          `메모를 이 기기에 저장하지 못했습니다: ${getLocalizedErrorMessage(storageError, '다시 시도해 주세요.')}`,
        );
      }

      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      draftTimerRef.current = setTimeout(() => {
        draftTimerRef.current = null;
        void saveDraft(draftRef.current, userId);
      }, 500);
    },
    [saveDraft, setError, userId],
  );

  const commitQuickMemos = useCallback(
    (nextMemos) => {
      quickMemosRef.current = nextMemos;
      setMemoState((current) =>
        current.userId === userId
          ? { ...current, quickMemos: nextMemos }
          : current,
      );
      try {
        localStorage.setItem(QUICK_MEMOS_KEY, JSON.stringify(nextMemos));
      } catch (storageError) {
        setError(
          `빠른 메모를 이 기기에 저장하지 못했습니다: ${getLocalizedErrorMessage(storageError, '다시 시도해 주세요.')}`,
        );
      }
    },
    [setError, userId],
  );

  const createQuickMemo = useCallback(
    async (content, options = {}) => {
      if (!userId || readyUserIdRef.current !== userId) {
        throw new Error('빠른 메모를 저장하려면 메모를 먼저 불러와야 합니다.');
      }
      const memo = {
        id: String(options.id ?? crypto.randomUUID()),
        content: content.trim(),
        createdAt: options.createdAt || new Date().toLocaleDateString(),
      };
      if (!memo.content) return null;

      try {
        const { data, error: insertError } = await supabase
          .from('quick_memos')
          .insert(toQuickMemoRow(userId, memo))
          .select(QUICK_MEMO_FIELDS)
          .single();
        if (insertError && !(options.ifMissing && isUniqueConflict(insertError))) {
          throw insertError;
        }
        if (insertError) {
          const { data: existingMemo, error: loadError } = await supabase
            .from('quick_memos')
            .select(QUICK_MEMO_FIELDS)
            .eq('user_id', userId)
            .eq('id', memo.id)
            .maybeSingle();
          if (loadError) throw loadError;
          if (existingMemo?.content !== memo.content) {
            throw new Error(
              '같은 ID의 빠른 메모가 다른 내용으로 이미 존재합니다. 휴지통 항목은 유지했습니다.',
            );
          }
          return existingMemo ? mapQuickMemo(existingMemo) : null;
        }
        const savedMemo = mapQuickMemo(data);
        commitQuickMemos(mergeQuickMemoLists([savedMemo], quickMemosRef.current));
        setError('');
        return savedMemo;
      } catch (createError) {
        setError(
          `빠른 메모를 만들지 못했습니다: ${getLocalizedErrorMessage(createError, '다시 시도해 주세요.')}`,
        );
        throw createError;
      }
    },
    [commitQuickMemos, setError, userId],
  );

  const updateQuickMemo = useCallback(
    async (id, content) => {
      if (!userId || readyUserIdRef.current !== userId) {
        throw new Error('빠른 메모를 저장하려면 메모를 먼저 불러와야 합니다.');
      }
      try {
        const { data, error: updateError } = await supabase
          .from('quick_memos')
          .update({ content: content.trim() })
          .eq('user_id', userId)
          .eq('id', String(id))
          .select(QUICK_MEMO_FIELDS)
          .single();
        if (updateError) throw updateError;
        const updatedMemo = mapQuickMemo(data);
        commitQuickMemos(
          quickMemosRef.current.map((memo) =>
            memo.id === updatedMemo.id ? updatedMemo : memo,
          ),
        );
        setError('');
        return updatedMemo;
      } catch (updateError) {
        setError(
          `빠른 메모를 수정하지 못했습니다: ${getLocalizedErrorMessage(updateError, '다시 시도해 주세요.')}`,
        );
        throw updateError;
      }
    },
    [commitQuickMemos, setError, userId],
  );

  const deleteQuickMemo = useCallback(
    async (id) => {
      if (!userId || readyUserIdRef.current !== userId) {
        throw new Error('빠른 메모를 삭제하려면 메모를 먼저 불러와야 합니다.');
      }
      try {
        const { error: deleteError } = await supabase
          .from('quick_memos')
          .delete()
          .eq('user_id', userId)
          .eq('id', String(id));
        if (deleteError) throw deleteError;
        commitQuickMemos(
          quickMemosRef.current.filter((memo) => memo.id !== String(id)),
        );
        setError('');
      } catch (deleteError) {
        setError(
          `빠른 메모를 삭제하지 못했습니다: ${getLocalizedErrorMessage(deleteError, '다시 시도해 주세요.')}`,
        );
        throw deleteError;
      }
    },
    [commitQuickMemos, setError, userId],
  );

  const mergeQuickMemos = useCallback(
    async (incomingMemos) => {
      if (!userId || readyUserIdRef.current !== userId) {
        throw new Error('빠른 메모를 복원하려면 메모를 먼저 불러와야 합니다.');
      }
      const additions = mergeQuickMemoLists([], incomingMemos).filter(
        (memo) =>
          !quickMemosRef.current.some(
            (current) => String(current.id) === String(memo.id),
          ),
      );
      if (additions.length > 0) {
        const { error: insertError } = await supabase
          .from('quick_memos')
          .upsert(
            additions.map((memo) => toQuickMemoRow(userId, memo)),
            { onConflict: 'user_id,id', ignoreDuplicates: true },
          );
        if (insertError) throw insertError;
      }
      const { data, error: loadError } = await supabase
        .from('quick_memos')
        .select(QUICK_MEMO_FIELDS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (loadError) throw loadError;
      commitQuickMemos((data || []).map(mapQuickMemo));
      return additions.length;
    },
    [commitQuickMemos, userId],
  );

  const mergeMemoDraft = useCallback(
    async (incomingDraft) => {
      if (!incomingDraft || draftRef.current) return false;
      if (!userId || readyUserIdRef.current !== userId) {
        throw new Error('메모를 복원하려면 메모를 먼저 불러와야 합니다.');
      }
      if (draftExistsRef.current) return false;
      const { data, error: insertError } = await supabase
        .from('memo_drafts')
        .insert({ user_id: userId, content: incomingDraft })
        .select(DRAFT_FIELDS)
        .single();
      if (insertError && !isUniqueConflict(insertError)) throw insertError;
      if (insertError) {
        const { data: currentDraft, error: reloadError } = await supabase
          .from('memo_drafts')
          .select(DRAFT_FIELDS)
          .eq('user_id', userId)
          .maybeSingle();
        if (reloadError) throw reloadError;
        if (currentDraft) {
          draftExistsRef.current = true;
          draftRef.current = currentDraft.content || '';
          setMemoState((current) =>
            current.userId === userId
              ? { ...current, draft: draftRef.current }
              : current,
          );
          return false;
        }
      }
      if (!data) return false;
      draftExistsRef.current = true;
      draftRef.current = data.content;
      setMemoState((current) =>
        current.userId === userId
          ? { ...current, draft: data.content }
          : current,
      );
      localStorage.setItem(DRAFT_KEY, data.content);
      return true;
    },
    [userId],
  );

  const mergeBackupMemos = useCallback(
    async (incomingDraft, incomingMemos) => {
      const result = {
        draftImported: false,
        draftError: null,
        memosImported: 0,
        memosError: null,
      };
      try {
        result.draftImported = await mergeMemoDraft(incomingDraft);
      } catch (mergeError) {
        result.draftError = mergeError;
      }
      try {
        result.memosImported = await mergeQuickMemos(incomingMemos);
      } catch (mergeError) {
        result.memosError = mergeError;
      }
      if (result.draftError || result.memosError) {
        const firstError = result.draftError || result.memosError;
        setError(
          `백업 메모를 병합하지 못했습니다: ${getLocalizedErrorMessage(firstError, '다시 시도해 주세요.')}`,
        );
      }
      return result;
    },
    [mergeMemoDraft, mergeQuickMemos, setError],
  );

  const retry = useCallback(() => {
    if (
      userId &&
      readyUserIdRef.current === userId &&
      draftSyncFailedUserIdRef.current === userId
    ) {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
      void saveDraft(draftRef.current, userId).catch(() => {});
      return;
    }
    setReloadVersion((version) => version + 1);
  }, [saveDraft, userId]);

  return {
    memoText,
    setMemoText,
    quickMemos,
    createQuickMemo,
    updateQuickMemo,
    deleteQuickMemo,
    mergeBackupMemos,
    isLoading,
    error,
    retry,
  };
}
