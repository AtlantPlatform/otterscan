// Uniswap V2/V3 pool token0()/token1() resolution. Pool tokens are
// immutable, so the positive cache has no TTL.

import { caches, lookup, remember, withTimeout } from './cache.js';

const TOKEN0_SIG = '0x0dfe1681';
const TOKEN1_SIG = '0xd21220a7';
const LOOKUP_TIMEOUT_MS = 800;

const decodeAddr = (data) => {
  if (!data || data.length < 66) return null;
  return '0x' + data.slice(-40);
};

/**
 * Resolve token0/token1 for a pool. Returns { token0, token1 } or null.
 */
export const resolvePoolTokens = async (provider, pool) => {
  if (!pool) return null;
  const key = pool.toLowerCase();

  const cached = lookup(caches.poolTokensPos, caches.poolTokensNeg, key);
  if (cached.hit) return cached.value;

  const tokens = await withTimeout(
    (async () => {
      try {
        const [t0, t1] = await Promise.all([
          provider.call({ to: pool, data: TOKEN0_SIG }).catch(() => null),
          provider.call({ to: pool, data: TOKEN1_SIG }).catch(() => null),
        ]);
        const token0 = decodeAddr(t0);
        const token1 = decodeAddr(t1);
        if (!token0 || !token1) return null;
        return { token0, token1 };
      } catch {
        return null;
      }
    })(),
    LOOKUP_TIMEOUT_MS,
    null,
  );

  remember(caches.poolTokensPos, caches.poolTokensNeg, key, tokens);
  return tokens;
};
