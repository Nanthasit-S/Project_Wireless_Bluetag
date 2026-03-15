export function normalizeWebId(value: string) {
  return String(value || '').trim().toUpperCase();
}

export function hashWebId(webId: string) {
  const normalized = normalizeWebId(webId);
  if (!normalized) return '';

  let hash = 0x811c9dc5;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
}
