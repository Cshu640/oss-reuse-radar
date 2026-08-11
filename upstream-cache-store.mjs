function finitePositive(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Small bounded memory cache for upstream JSON responses.
 *
 * The cache deliberately stores only response data and safe validators. It is
 * process-local: restarting OpenRadar clears it, which avoids putting tokens
 * or upstream response headers on disk.
 */
export function createUpstreamCacheStore({ maxEntries = 160, now = () => Date.now() } = {}) {
  const entries = new Map();
  const metrics = { hits: 0, misses: 0, staleHits: 0, evictions: 0, writes: 0 };
  const capacity = Math.max(1, Math.floor(finitePositive(maxEntries, 160)));

  function touch(key, value) {
    entries.delete(key);
    entries.set(key, value);
  }

  function get(key, { ttlMs = 0, maxStaleMs = 0 } = {}) {
    const entry = entries.get(key);
    if (!entry) {
      metrics.misses += 1;
      return null;
    }
    const ageMs = Math.max(0, now() - entry.savedAt);
    if (ageMs <= ttlMs) {
      metrics.hits += 1;
      touch(key, entry);
      return { ...entry, ageMs, state: 'fresh' };
    }
    if (ageMs <= maxStaleMs) {
      metrics.staleHits += 1;
      touch(key, entry);
      return { ...entry, ageMs, state: 'stale' };
    }
    metrics.misses += 1;
    return { ...entry, ageMs, state: 'expired' };
  }

  function set(key, value) {
    const entry = {
      data: value?.data,
      fetchedAt: value?.fetchedAt || '',
      revalidatedAt: value?.revalidatedAt || '',
      status: value?.status || 0,
      etag: value?.etag || '',
      lastModified: value?.lastModified || '',
      contentType: value?.contentType || '',
      savedAt: now(),
    };
    entries.delete(key);
    entries.set(key, entry);
    metrics.writes += 1;
    while (entries.size > capacity) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
      metrics.evictions += 1;
    }
    return entry;
  }

  function revalidate(key, patch) {
    const existing = entries.get(key);
    if (!existing) return set(key, patch);
    const entry = { ...existing, ...patch };
    entries.delete(key);
    entries.set(key, entry);
    return entry;
  }

  function deleteEntry(key) {
    return entries.delete(key);
  }

  return {
    get,
    set,
    revalidate,
    delete: deleteEntry,
    clear() {
      entries.clear();
    },
    size() {
      return entries.size;
    },
    metrics() {
      return { ...metrics, entries: entries.size, maxEntries: capacity, storage: 'memory-only' };
    },
  };
}

export function normalizeUpstreamRequestKey(provider, url, method = 'GET') {
  const parsed = new URL(url, 'http://openradar.local');
  const query = [...parsed.searchParams.entries()]
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  const normalizedUrl = `${parsed.origin}${parsed.pathname}${query ? `?${query}` : ''}`;
  return `${String(provider || 'unknown').toLowerCase()}\u0000${String(method || 'GET').toUpperCase()}\u0000${normalizedUrl}`;
}
