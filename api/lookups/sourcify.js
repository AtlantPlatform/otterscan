// Resolve a contract method name via Sourcify's verified ABI. Used as a
// fallback after the global 4byte directory comes up empty.

import { id as keccakId } from 'ethers';
import { caches, lookup, remember, withTimeout } from './cache.js';

const LOOKUP_TIMEOUT_MS = 600;
const BASE = 'https://repo.sourcify.dev/contracts';

const abiTypeString = (input) => {
  if (input.type === 'tuple' && input.components) {
    return `(${input.components.map(abiTypeString).join(',')})`;
  }
  if (input.type.startsWith('tuple[') && input.components) {
    const suffix = input.type.slice('tuple'.length);
    return `(${input.components.map(abiTypeString).join(',')})${suffix}`;
  }
  return input.type;
};

const abiSelector = (fn) => {
  const sig = `${fn.name ?? ''}(${(fn.inputs ?? []).map(abiTypeString).join(',')})`;
  return keccakId(sig).slice(0, 10);
};

const fetchAbi = async (contract) => {
  for (const variant of ['full_match', 'partial_match']) {
    try {
      const res = await fetch(`${BASE}/${variant}/1/${contract}/metadata.json`);
      if (!res.ok) continue;
      const meta = await res.json();
      const abi = meta?.output?.abi ?? [];
      const map = new Map();
      for (const item of abi) {
        if (item.type !== 'function' || !item.name) continue;
        try {
          map.set(abiSelector(item), item.name);
        } catch {
          /* skip malformed entries */
        }
      }
      return map;
    } catch {
      /* try next variant */
    }
  }
  return null;
};

/**
 * Look up a selector's method name in a contract's verified Sourcify ABI.
 * Caches the entire ABI map per contract so subsequent lookups against the
 * same contract are free.
 */
export const resolveSourcifyMethod = async (contract, selector) => {
  if (!contract || !selector) return null;
  const cKey = contract.toLowerCase();
  const sel = selector.toLowerCase();

  const cached = lookup(caches.sourcifyPos, caches.sourcifyNeg, cKey);
  let map;
  if (cached.hit) {
    map = cached.value; // may be null (negative)
  } else {
    map = await withTimeout(fetchAbi(contract), LOOKUP_TIMEOUT_MS, null);
    remember(caches.sourcifyPos, caches.sourcifyNeg, cKey, map);
  }
  if (!map) return null;
  return map.get(sel) ?? null;
};
