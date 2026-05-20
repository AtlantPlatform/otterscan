// Backend port of src/execution/transaction/action/summarize.ts.
// Kept in sync by behaviour test: same inputs must yield the same Action
// kinds. The wire format from /api/transactions/recent + the receipt logs is
// structurally compatible with the ethers Log shape this expects (we only
// read address, topics, data).

import {
  AbiCoder,
  dataSlice,
  getAddress,
  getBytes,
} from 'ethers';

export const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export const WETH_DEPOSIT_TOPIC =
  '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c';
export const WETH_WITHDRAWAL_TOPIC =
  '0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65';
export const UNIV2_SWAP_TOPIC =
  '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';
export const UNIV3_SWAP_TOPIC =
  '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';

export const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const abi = AbiCoder.defaultAbiCoder();

const topicToAddress = (topic) => getAddress(dataSlice(getBytes(topic), 12));
const isWeth = (a) => a.toLowerCase() === WETH_ADDRESS.toLowerCase();

const decodeTransfer = (log) => {
  if (log.topics.length === 3) {
    return {
      kind: 'erc20-transfer',
      token: getAddress(log.address),
      from: topicToAddress(log.topics[1]),
      to: topicToAddress(log.topics[2]),
      value: BigInt(log.data),
    };
  }
  if (log.topics.length === 4) {
    const from = topicToAddress(log.topics[1]);
    return {
      kind: 'erc721-transfer',
      token: getAddress(log.address),
      from,
      to: topicToAddress(log.topics[2]),
      tokenId: BigInt(log.topics[3]),
      isMint: from === ZERO_ADDRESS,
    };
  }
  return null;
};

const decodeWethDeposit = (log) => {
  if (!isWeth(log.address) || log.topics.length !== 2) return null;
  return {
    kind: 'weth-wrap',
    weth: getAddress(log.address),
    account: topicToAddress(log.topics[1]),
    value: BigInt(log.data),
  };
};

const decodeWethWithdrawal = (log) => {
  if (!isWeth(log.address) || log.topics.length !== 2) return null;
  return {
    kind: 'weth-unwrap',
    weth: getAddress(log.address),
    account: topicToAddress(log.topics[1]),
    value: BigInt(log.data),
  };
};

const decodeUniV2Swap = (log) => {
  try {
    const [a0In, a1In, a0Out, a1Out] = abi.decode(
      ['uint256', 'uint256', 'uint256', 'uint256'],
      log.data,
    );
    return {
      kind: 'swap',
      protocol: 'Uniswap V2',
      pool: getAddress(log.address),
      amount0: a0In - a0Out,
      amount1: a1In - a1Out,
    };
  } catch {
    return null;
  }
};

const decodeUniV3Swap = (log) => {
  try {
    const [amount0, amount1] = abi.decode(
      ['int256', 'int256', 'uint160', 'uint128', 'int24'],
      log.data,
    );
    return {
      kind: 'swap',
      protocol: 'Uniswap V3',
      pool: getAddress(log.address),
      amount0,
      amount1,
    };
  } catch {
    return null;
  }
};

export const decodeActions = (logs) => {
  const out = [];
  if (!Array.isArray(logs)) return out;
  for (const log of logs) {
    if (!log?.topics?.length) continue;
    const t = log.topics[0];
    let a = null;
    if (t === TRANSFER_TOPIC) a = decodeTransfer(log);
    else if (t === WETH_DEPOSIT_TOPIC) a = decodeWethDeposit(log);
    else if (t === WETH_WITHDRAWAL_TOPIC) a = decodeWethWithdrawal(log);
    else if (t === UNIV2_SWAP_TOPIC) a = decodeUniV2Swap(log);
    else if (t === UNIV3_SWAP_TOPIC) a = decodeUniV3Swap(log);
    if (a) out.push(a);
  }
  return out;
};

const PRIORITY = {
  swap: 5,
  'weth-wrap': 4,
  'weth-unwrap': 4,
  'erc721-transfer': 3,
  'erc20-transfer': 1,
};

export const pickPrimaryAction = (actions) => {
  if (actions.length === 0) return null;
  let best = actions[0];
  let bestScore = PRIORITY[best.kind];
  for (const a of actions.slice(1)) {
    const s = PRIORITY[a.kind];
    if (s > bestScore) {
      best = a;
      bestScore = s;
    }
  }
  if (best.kind === 'erc721-transfer') {
    const mint = actions.find((a) => a.kind === 'erc721-transfer' && a.isMint);
    if (mint) return mint;
  }
  return best;
};
