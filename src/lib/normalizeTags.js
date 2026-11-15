export default function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];

  return [...new Set(
    tags
      .filter((tag) => typeof tag === 'string')
      .map((tag) => tag.trim().replace(/\s+/g, ' ').toLowerCase())
      .filter(Boolean),
  )];
}
