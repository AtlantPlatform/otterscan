// Resolve a 4byte selector to a method name. Two upstreams:
// 1. local /signatures/ mirror (proxied or baked-in dist asset)
// 2. live 4byte.directory
// Both are cached. Negative results are also cached (short TTL).

import { caches, lookup, remember } from './cache.js';

const MIRROR_BASE =
  process.env.SIGNATURES_MIRROR_BASE || 'https://ethscan.org';
// Per-upstream timeout: mirror is on the public internet and can be
// sluggish; 4byte.directory is usually <200ms. Each upstream gets its own
// budget so a slow mirror doesn't starve the fallback.
const MIRROR_TIMEOUT_MS = 1500;
const FOURBYTE_TIMEOUT_MS = 1500;

const parseSig = (text) => {
  if (!text || text.startsWith('<') || !text.includes('(')) return null;
  const sig = text.split(';')[0];
  const name = sig.slice(0, sig.indexOf('('));
  return name || null;
};

const fetchWithTimeout = async (url, ms) => {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
};

const fromMirror = async (selBare) => {
  try {
    const res = await fetchWithTimeout(
      `${MIRROR_BASE}/signatures/${selBare}`,
      MIRROR_TIMEOUT_MS,
    );
    if (!res.ok) return null;
    return parseSig(await res.text());
  } catch {
    return null;
  }
};

const from4byteDir = async (selBare) => {
  try {
    const res = await fetchWithTimeout(
      `https://www.4byte.directory/api/v1/signatures/?hex_signature=0x${selBare}`,
      FOURBYTE_TIMEOUT_MS,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const sig = json?.results?.[0]?.text_signature;
    if (!sig || !sig.includes('(')) return null;
    return sig.slice(0, sig.indexOf('('));
  } catch {
    return null;
  }
};

/**
 * Resolve a single selector. Input may be "0xabcdef12" or "abcdef12".
 * Returns the method name (e.g. "transfer") or null.
 */
export const resolveSelector = async (selector) => {
  if (!selector) return null;
  const sel = selector.startsWith('0x') ? selector.slice(2).toLowerCase()
                                        : selector.toLowerCase();
  if (sel.length !== 8) return null;

  const cached = lookup(caches.selectorPos, caches.selectorNeg, sel);
  if (cached.hit) return cached.value;

  const name = (await fromMirror(sel)) ?? (await from4byteDir(sel));
  remember(caches.selectorPos, caches.selectorNeg, sel, name);
  return name;
};

/**
 * Resolve many selectors in parallel. Returns Map<selectorBare, name|null>.
 * Callers should pass `tx.data` slices; we de-dupe.
 */
export const resolveSelectors = async (selectors) => {
  const unique = [...new Set(selectors.filter(Boolean).map(
    (s) => s.startsWith('0x') ? s.slice(2).toLowerCase() : s.toLowerCase()
  ))].filter((s) => s.length === 8);
  const results = await Promise.all(unique.map((s) => resolveSelector(s)));
  const map = new Map();
  unique.forEach((s, i) => map.set(s, results[i]));
  return map;
};
