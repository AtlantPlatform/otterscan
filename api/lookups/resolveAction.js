// Produce a fully-resolved Action (with token symbols, pool tokens, method
// name) ready to render in the SSR HTML. Mirrors the decision tree of
// src/execution/transaction/action/TransactionActionLite.tsx so the server
// and client converge on the same Action kind given the same inputs.

import { decodeActions, pickPrimaryAction, WETH_ADDRESS } from './decodeActions.js';
import { resolveSelector } from './signatures.js';
import { resolveTokenMeta } from './tokenMeta.js';
import { resolvePoolTokens } from './poolTokens.js';
import { resolveSourcifyMethod } from './sourcify.js';

const APPROVE_SELECTOR = '0x095ea7b3';

// Token-meta wrapper that always returns the shape the wire format expects.
const tokenDescriptor = async (provider, address) => {
  if (!address) return null;
  const isWeth = address.toLowerCase() === WETH_ADDRESS.toLowerCase();
  if (isWeth) {
    return { address, name: 'Wrapped Ether', symbol: 'WETH', decimals: 18 };
  }
  const meta = await resolveTokenMeta(provider, address);
  return meta;
};

const formatMethodName = (name) => {
  if (!name) return null;
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const decodeApprove = (data) => {
  if (!data || data.length < 138) return null;
  if (data.slice(0, 10).toLowerCase() !== APPROVE_SELECTOR) return null;
  try {
    return {
      spender: '0x' + data.slice(10 + 24, 10 + 64),
      value: BigInt('0x' + data.slice(10 + 64, 10 + 128)),
    };
  } catch {
    return null;
  }
};

// Bigints serialise as decimal strings so they survive the JSON boundary.
const s = (b) => b.toString();
const abs = (b) => (b < 0n ? -b : b);

export const resolveAction = async (provider, tx) => {
  if (!tx) return null;

  const logs = tx.logs ?? [];

  // 1. EIP-7702 authorizations always lead.
  if (Array.isArray(tx.authorizationList) && tx.authorizationList.length > 0) {
    return {
      kind: 'eip7702',
      authorizations: tx.authorizationList.map((a) => ({
        authority: a.authority,
        address: a.address,
        chainId: a.chainId,
        nonce: a.nonce,
      })),
    };
  }

  // 2. ERC-20 approve calls.
  const ap = decodeApprove(tx.data || '0x');
  if (ap && tx.to && tx.from) {
    const meta = await tokenDescriptor(provider, tx.to);
    return {
      kind: 'approve',
      token: meta ?? { address: tx.to, name: '', symbol: '', decimals: 0 },
      spender: ap.spender,
      owner: tx.from,
      value: s(ap.value),
    };
  }

  const decoded = decodeActions(logs);
  const logAction = pickPrimaryAction(decoded);

  // 3. Swap.
  if (logAction?.kind === 'swap') {
    const pool = await resolvePoolTokens(provider, logAction.pool);
    if (pool) {
      const paid0 = logAction.amount0 > 0n;
      const inAddr = paid0 ? pool.token0 : pool.token1;
      const outAddr = paid0 ? pool.token1 : pool.token0;
      const inAmt = abs(paid0 ? logAction.amount0 : logAction.amount1);
      const outAmt = abs(paid0 ? logAction.amount1 : logAction.amount0);
      const [inMeta, outMeta] = await Promise.all([
        tokenDescriptor(provider, inAddr),
        tokenDescriptor(provider, outAddr),
      ]);
      return {
        kind: 'swap',
        protocol: logAction.protocol,
        pool: logAction.pool,
        tokenIn: inMeta ?? { address: inAddr, name: '', symbol: '', decimals: 0 },
        tokenOut: outMeta ?? { address: outAddr, name: '', symbol: '', decimals: 0 },
        amountIn: s(inAmt),
        amountOut: s(outAmt),
      };
    }
    // Pool lookup failed — degrade to a partial swap line.
    return {
      kind: 'swap-partial',
      protocol: logAction.protocol,
      pool: logAction.pool,
    };
  }

  // 4. WETH wrap/unwrap.
  if (logAction?.kind === 'weth-wrap' || logAction?.kind === 'weth-unwrap') {
    return {
      kind: logAction.kind,
      weth: logAction.weth,
      account: logAction.account,
      value: s(logAction.value),
    };
  }

  // 5. Method-call summary (same heuristic as the client).
  const selector =
    tx.data && tx.data.length >= 10 ? tx.data.slice(0, 10).toLowerCase() : null;
  let methodName = null;
  if (selector) {
    methodName = await resolveSelector(selector);
    if (!methodName && tx.to) {
      methodName = await resolveSourcifyMethod(tx.to, selector);
    }
  }

  // showCallInstead heuristic:
  // - No log action OR
  // - methodName resolved AND log isn't a direct transfer on the called token
  //   AND log's `from` isn't tx.from (user-pulled-by-router pattern)
  if (selector && tx.to) {
    let prefersCall = false;
    if (!logAction) prefersCall = true;
    else if (methodName) {
      if (
        logAction.kind === 'erc20-transfer' ||
        logAction.kind === 'erc721-transfer'
      ) {
        const tokenIsTo =
          logAction.token.toLowerCase() === tx.to.toLowerCase();
        const userIsFrom =
          tx.from && logAction.from.toLowerCase() === tx.from.toLowerCase();
        if (!tokenIsTo && !userIsFrom) prefersCall = true;
      }
      // swap / weth handled above; nothing else preempts call.
    }
    if (prefersCall) {
      return {
        kind: 'call',
        method: methodName ? formatMethodName(methodName) : selector,
        selector,
        from: tx.from,
        to: tx.to,
      };
    }
  }

  // 6. ERC-20 / ERC-721 transfer.
  if (logAction?.kind === 'erc20-transfer') {
    const meta = await tokenDescriptor(provider, logAction.token);
    return {
      kind: 'erc20-transfer',
      token: meta ?? { address: logAction.token, name: '', symbol: '', decimals: 0 },
      from: logAction.from,
      to: logAction.to,
      value: s(logAction.value),
    };
  }
  if (logAction?.kind === 'erc721-transfer') {
    return {
      kind: 'erc721-transfer',
      token: logAction.token,
      from: logAction.from,
      to: logAction.to,
      tokenId: s(logAction.tokenId),
      isMint: logAction.isMint,
    };
  }

  // 7. Native ETH transfer (no logs, non-zero value).
  if (tx.value && tx.from && tx.to) {
    let v;
    try {
      v = BigInt(tx.value);
    } catch {
      v = 0n;
    }
    if (v > 0n) {
      return {
        kind: 'native-transfer',
        from: tx.from,
        to: tx.to,
        value: s(v),
      };
    }
  }

  return null;
};
