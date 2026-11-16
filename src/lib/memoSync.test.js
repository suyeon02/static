import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeQuickMemoLists,
  planLegacyMemoMerge,
  shouldMigrateLegacyMemoData,
} from './memoSync.js';

test('legacy migration preserves cloud draft and adds only missing local memos', () => {
  const plan = planLegacyMemoMerge({
    hasCloudDraft: true,
    cloudDraft: 'Cloud draft',
    cloudMemos: [
      { id: 'existing', content: 'Cloud version' },
      { id: 'same-id', content: 'Cloud memo' },
    ],
    localDraft: 'Local draft',
    localMemos: [
      { id: 'same-id', content: 'Local copy' },
      { id: 12, content: 'Local-only memo' },
    ],
  });

  assert.equal(plan.draftToInsert, null);
  assert.equal(plan.preserveDraftAsMemo, 'Local draft');
  assert.deepEqual(plan.memosToInsert, [{ id: 12, content: 'Local-only memo' }]);
});

test('legacy migration inserts a local draft only when cloud has no row', () => {
  assert.equal(
    planLegacyMemoMerge({
      hasCloudDraft: false,
      cloudDraft: '',
      cloudMemos: [],
      localDraft: 'Keep this draft',
      localMemos: [],
    }).draftToInsert,
    'Keep this draft',
  );
  assert.equal(
    planLegacyMemoMerge({
      hasCloudDraft: false,
      cloudDraft: '',
      cloudMemos: [],
      localDraft: '',
      localMemos: [],
    }).draftToInsert,
    null,
  );
});

test('quick memo merge is idempotent and keeps current records on ID conflicts', () => {
  const current = [{ id: '1', content: 'Current value' }];
  const incoming = [
    { id: 1, content: 'Older local value' },
    { id: '2', content: 'New memo' },
  ];

  const merged = mergeQuickMemoLists(current, incoming);

  assert.deepEqual(merged, [
    { id: '1', content: 'Current value' },
    { id: '2', content: 'New memo' },
  ]);
  assert.deepEqual(mergeQuickMemoLists(merged, incoming), merged);
});

test('legacy device data is migrated only to its bound account and only once', () => {
  assert.equal(shouldMigrateLegacyMemoData('account-a', 'account-a', false), true);
  assert.equal(shouldMigrateLegacyMemoData('account-a', 'account-a', true), false);
  assert.equal(shouldMigrateLegacyMemoData('account-a', 'account-b', false), false);
});
