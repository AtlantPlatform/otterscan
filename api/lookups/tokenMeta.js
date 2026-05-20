// ERC-20 token metadata (name, symbol, decimals) via eth_call.
// Handles both standard ABI strings and legacy bytes32 (USDT, MKR, ...).

import { caches, lookup, remember, withTimeout } from './cache.js';

const NAME_SIG = '0x06fdde03';
const SYMBOL_SIG = '0x95d89b41';
const DECIMALS_SIG = '0x313ce567';
const LOOKUP_TIMEOUT_MS = 800;

// Decode either an ABI-dynamic string (offset+len+data) or a bytes32 with
// trailing zeros. Returns "" if the response is unusable.
const decodeString = (data) => {
  if (!data || data === '0x') return '';
  const hex = data.startsWith('0x') ? data.slice(2) : data;
  if (hex.length > 64 && hex.slice(0, 64) === '0'.repeat(62) + '20') {
    const len = parseInt(hex.slice(64, 128), 16);
    return Buffer.from(hex.slice(128, 128 + len * 2), 'hex').toString('utf8');
  }
  const buf = Buffer.from(hex.padEnd(64, '0').slice(0, 64), 'hex');
  let end = buf.length;
  while (end > 0 && buf[end - 1] === 0) end--;
  return buf.slice(0, end).toString('utf8');
};

/**
 * Resolve ERC-20 metadata for a contract address.
 * Returns { address, name, symbol, decimals } or null when the address is
 * either not a token or fails to probe within the timeout.
 */
export const resolveTokenMeta = async (provider, address) => {
  if (!address) return null;
  const key = address.toLowerCase();

  const cached = lookup(caches.tokenMetaPos, caches.tokenMetaNeg, key);
  if (cached.hit) return cached.value;

  const meta = await withTimeout(
    (async () => {
      try {
        const [nameData, symbolData, decimalsData] = await Promise.all([
          provider.call({ to: address, data: NAME_SIG }).catch(() => null),
          provider.call({ to: address, data: SYMBOL_SIG }).catch(() => null),
          provider.call({ to: address, data: DECIMALS_SIG }).catch(() => null),
        ]);
        if (!symbolData || symbolData === '0x') return null;
        const name = decodeString(nameData);
        const symbol = decodeString(symbolData);
        if (!symbol.trim()) return null;
        const decimals = decimalsData ? parseInt(decimalsData, 16) : 18;
        return { address, name, symbol, decimals };
      } catch {
        return null;
      }
    })(),
    LOOKUP_TIMEOUT_MS,
    null,
  );

  remember(caches.tokenMetaPos, caches.tokenMetaNeg, key, meta);
  return meta;
};
