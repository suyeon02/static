import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const migrationUrl = new URL(
  '../../supabase/migrations/20261116010000_fix_claim_due_push_reminders.sql',
  import.meta.url,
);

test('claim RPC resolves the unique conflict target as table columns', async () => {
  const migration = await readFile(fileURLToPath(migrationUrl), 'utf8');

  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.claim_due_push_reminders/);
  assert.match(migration, /RETURNS TABLE\s*\([\s\S]*?\bsubscription_id uuid,/);
  assert.match(migration, /#variable_conflict use_column\s+BEGIN/);
  assert.match(
    migration,
    /ON CONFLICT \(subscription_id, reminder_kind, record_id, scheduled_at\)\s+DO NOTHING;/,
  );
  assert.match(migration, /FOR UPDATE OF d SKIP LOCKED/);
});
