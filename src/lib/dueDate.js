const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseDueDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function getDueDateInfo(value, now = new Date()) {
  const due = parseDueDate(value);
  if (!due) return null;
  const diffDays = Math.round((due - startOfLocalDay(now)) / DAY_MS);
  if (diffDays < 0) return { label: '지남', urgent: true };
  if (diffDays === 0) return { label: '오늘', urgent: true };
  if (diffDays === 1) return { label: '내일', urgent: false };
  return { label: `${due.getMonth() + 1}.${due.getDate()}`, urgent: false };
}
