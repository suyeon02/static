import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getLocalizedErrorMessage } from '../lib/userFacingError';

const LEGACY_TRASH_KEY = 'static_trash';
const MIGRATION_USER_KEY = 'static_trash_migration_user_id';
const MIGRATION_DONE_KEY = 'static_trash_migration_done_user_id';
const ITEM_TYPES = new Set(['NOTE', 'QUICK_MEMO']);

function mapTrashItem(row) {
  const itemData =
    row.item_data && typeof row.item_data === 'object' ? row.item_data : {};

  return {
    ...itemData,
    id: row.id,
    type: row.item_type,
    itemData,
    deletedAt: new Date(row.deleted_at).toLocaleDateString(),
  };
}

function toItemData(item) {
  const { type: _type, ...itemData } = item;
  return itemData;
}

export default function useTrash(userId) {
  const [trashState, setTrashState] = useState({ userId: null, items: [] });
  const [loadState, setLoadState] = useState({
    userId: null,
    version: -1,
    status: 'idle',
  });
  const [errorState, setErrorState] = useState({ userId: null, message: '' });
  const [reloadVersion, setReloadVersion] = useState(0);
  const migrationPromises = useRef(new Map());
  const retryOperation = useRef(null);
  const items = trashState.userId === userId ? trashState.items : [];
  const isLoading = Boolean(
    userId &&
      (loadState.userId !== userId ||
        loadState.version !== reloadVersion ||
        loadState.status === 'loading'),
  );
  const error = errorState.userId === userId ? errorState.message : '';

  useEffect(() => {
    let cancelled = false;
    if (!userId) return () => {
      cancelled = true;
    };

    const loadTrash = async () => {
      try {
        setErrorState({ userId, message: '' });
        let migrationUserId = localStorage.getItem(MIGRATION_USER_KEY);
        if (!migrationUserId) {
          localStorage.setItem(MIGRATION_USER_KEY, userId);
          migrationUserId = userId;
        }

        const { data, error: loadError } = await supabase
          .from('trash_items')
          .select('id, item_type, item_data, deleted_at')
          .order('deleted_at', { ascending: false });
        if (loadError) throw loadError;

        let rows = data || [];

        if (
          migrationUserId === userId &&
          localStorage.getItem(MIGRATION_DONE_KEY) !== userId
        ) {
          let migration = migrationPromises.current.get(userId);
          if (!migration) {
            migration = (async () => {
              if (rows.length === 0) {
                const legacyValue = localStorage.getItem(LEGACY_TRASH_KEY);
                const legacyItems = legacyValue ? JSON.parse(legacyValue) : [];
                if (!Array.isArray(legacyItems)) {
                  throw new Error('기존 휴지통 데이터 형식이 올바르지 않습니다.');
                }

                const importRows = legacyItems
                  .filter((item) => item && ITEM_TYPES.has(item.type))
                  .map((item) => ({
                    item_type: item.type,
                    item_data: toItemData(item),
                    deleted_at: new Date().toISOString(),
                  }));

                if (importRows.length > 0) {
                  const { data: importedRows, error: importError } =
                    await supabase
                      .from('trash_items')
                      .insert(importRows)
                      .select('id, item_type, item_data, deleted_at');
                  if (importError) throw importError;
                  rows = importedRows || [];
                }
              }

              localStorage.setItem(MIGRATION_DONE_KEY, userId);
              return rows;
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

        if (!cancelled) {
          setTrashState({ userId, items: rows.map(mapTrashItem) });
          setLoadState({ userId, version: reloadVersion, status: 'success' });
        }
      } catch (loadError) {
        if (!cancelled) {
          setErrorState({
            userId,
            message: `휴지통을 불러오지 못했습니다: ${getLocalizedErrorMessage(loadError, '다시 시도해 주세요.')}`,
          });
          setLoadState({ userId, version: reloadVersion, status: 'error' });
        }
      }
    };

    void loadTrash();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadVersion]);

  const executeAction = useCallback(
    async (action) => {
      try {
        const result = await action();
        retryOperation.current = null;
        setErrorState({ userId, message: '' });
        return result;
      } catch (actionError) {
        retryOperation.current = { userId, action };
        setErrorState({
          userId,
          message: `휴지통 작업을 완료하지 못했습니다: ${getLocalizedErrorMessage(actionError, '다시 시도해 주세요.')}`,
        });
        throw actionError;
      }
    },
    [userId],
  );

  const addItem = useCallback(
    async (item) => {
      if (!userId) throw new Error('휴지통에 항목을 추가하려면 로그인해 주세요.');
      if (!ITEM_TYPES.has(item.type)) {
        throw new Error(`지원하지 않는 휴지통 항목 유형입니다: ${item.type}`);
      }

      const row = {
        id: crypto.randomUUID(),
        item_type: item.type,
        item_data: toItemData(item),
        deleted_at: new Date().toISOString(),
      };
      return executeAction(async () => {
        const { data, error: insertError } = await supabase
          .from('trash_items')
          .upsert(row, { onConflict: 'id' })
          .select('id, item_type, item_data, deleted_at')
          .single();
        if (insertError) throw insertError;

        const mappedItem = mapTrashItem(data);
        setTrashState((current) => ({
          userId,
          items:
            current.userId === userId
              ? [mappedItem, ...current.items.filter((entry) => entry.id !== mappedItem.id)]
              : [mappedItem],
        }));
        return mappedItem;
      });
    },
    [executeAction, userId],
  );

  const deleteItem = useCallback(
    async (id) =>
      executeAction(async () => {
        const { error: deleteError } = await supabase
          .from('trash_items')
          .delete()
          .eq('id', id);
        if (deleteError) throw deleteError;
        setTrashState((current) => ({
          ...current,
          items: current.items.filter((item) => item.id !== id),
        }));
      }),
    [executeAction],
  );

  const emptyTrash = useCallback(
    async () =>
      executeAction(async () => {
        const { error: deleteError } = await supabase
          .from('trash_items')
          .delete()
          .not('id', 'is', null);
        if (deleteError) throw deleteError;
        setTrashState((current) => ({ ...current, items: [] }));
      }),
    [executeAction],
  );

  const retry = useCallback(() => {
    if (retryOperation.current?.userId === userId) {
      void executeAction(retryOperation.current.action).catch(() => {});
    } else {
      setReloadVersion((version) => version + 1);
    }
  }, [executeAction, userId]);

  return { items, isLoading, error, addItem, deleteItem, emptyTrash, retry };
}
