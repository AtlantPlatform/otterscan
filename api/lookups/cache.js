// Shared LRU caches for backend lookups. Each lookup module gets a positive
// cache (long TTL or none) and a negative cache (short TTL) so a transient
// upstream miss doesn't lock in `null` forever.

import { LRUCache } from 'lru-cache';

const makeLru = ({ max, ttl }) =>
  new LRUCache({ max, ttl: ttl ?? 0, allowStale: false });

export const caches = {
  // Selectors are immutable; pool tokens are immutable. No TTL.
  selectorPos: makeLru({ max: 5000 }),
  poolTokensPos: makeLru({ max: 5000 }),
  // Token metadata and Sourcify ABIs can in principle change (factory swap,
  // re-verification). Refresh once a day.
  tokenMetaPos: makeLru({ max: 5000, ttl: 24 * 3600 * 1000 }),
  sourcifyPos: makeLru({ max: 1000, ttl: 24 * 3600 * 1000 }),
  // Negative caches keep us from re-hitting slow upstreams on every request
  // for a not-found key. 1 hour is short enough that delayed mirror syncs
  // eventually pick up.
  selectorNeg: makeLru({ max: 5000, ttl: 3600 * 1000 }),
  tokenMetaNeg: makeLru({ max: 5000, ttl: 3600 * 1000 }),
  poolTokensNeg: makeLru({ max: 1000, ttl: 3600 * 1000 }),
  sourcifyNeg: makeLru({ max: 1000, ttl: 3600 * 1000 }),
};

/**
 * Look in the positive cache first, then the negative cache. Returns
 * { hit: true, value } on positive hit, { hit: true, value: null } on
 * negative hit, or { hit: false } if neither.
 */
export const lookup = (posCache, negCache, key) => {
  if (posCache.has(key)) return { hit: true, value: posCache.get(key) };
  if (negCache.has(key)) return { hit: true, value: null };
  return { hit: false };
};

export const remember = (posCache, negCache, key, value) => {
  if (value === null || value === undefined) negCache.set(key, true);
  else posCache.set(key, value);
};

/**
 * Race a promise against a hard timeout. Returns the timeout-default on
 * timeout or unhandled error. Lookups MUST use this so a flaky upstream
 * can't stall a response.
 */
export const withTimeout = async (promise, ms, onTimeout = null) => {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(onTimeout), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } catch {
    return onTimeout;
  } finally {
    clearTimeout(timer);
  }
};
