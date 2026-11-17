import test from 'node:test';
import assert from 'node:assert/strict';
import { getDueDateInfo, parseDueDate } from './dueDate.js';

const now = new Date(2026, 10, 18, 23, 30);

test('parseDueDate reads YYYY-MM-DD as a local date', () => {
  const date = parseDueDate('2026-11-18');
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 10);
  assert.equal(date.getDate(), 18);
  assert.equal(parseDueDate(''), null);
  assert.equal(parseDueDate(null), null);
});

test('getDueDateInfo labels relative due dates', () => {
  assert.deepEqual(getDueDateInfo('2026-11-17', now), { label: '지남', urgent: true });
  assert.deepEqual(getDueDateInfo('2026-11-18', now), { label: '오늘', urgent: true });
  assert.deepEqual(getDueDateInfo('2026-11-19', now), { label: '내일', urgent: false });
  assert.deepEqual(getDueDateInfo('2026-12-03', now), { label: '12.3', urgent: false });
  assert.equal(getDueDateInfo(null, now), null);
});
