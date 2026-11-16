export function planLegacyMemoMerge({
  hasCloudDraft,
  cloudDraft,
  cloudMemos,
  localDraft,
  localMemos,
}) {
  const existingIds = new Set(cloudMemos.map((memo) => String(memo.id)));
  const memosToInsert = localMemos.filter((memo) => {
    const id = String(memo.id);
    if (existingIds.has(id)) return false;
    existingIds.add(id);
    return true;
  });

  return {
    draftToInsert:
      !hasCloudDraft && localDraft.length > 0 ? localDraft : null,
    preserveDraftAsMemo:
      hasCloudDraft && localDraft && localDraft !== cloudDraft
        ? localDraft
        : null,
    memosToInsert,
  };
}

export function mergeQuickMemoLists(currentMemos, incomingMemos) {
  const existingIds = new Set(currentMemos.map((memo) => String(memo.id)));
  const additions = incomingMemos.filter((memo) => {
    const id = String(memo.id);
    if (existingIds.has(id)) return false;
    existingIds.add(id);
    return true;
  });

  return [...currentMemos, ...additions];
}

export function shouldMigrateLegacyMemoData(ownerUserId, userId, isDone) {
  return ownerUserId === userId && !isDone;
}
