import { AbiCoder, dataSlice, getAddress, getBytes, Log } from "ethers";
import {
  TRANSFER_TOPIC,
  UNIV2_SWAP_TOPIC,
  UNIV3_SWAP_TOPIC,
  WETH_ADDRESS,
  WETH_DEPOSIT_TOPIC,
  WETH_WITHDRAWAL_TOPIC,
} from "./topics";

export type Action =
  | {
      kind: "swap";
      protocol: "Uniswap V2" | "Uniswap V3";
      pool: string;
      token0: string;
      token1: string;
      amount0: bigint; // signed; positive = pool received, negative = pool sent
      amount1: bigint;
    }
  | {
      kind: "erc20-transfer";
      token: string;
      from: string;
      to: string;
      value: bigint;
    }
  | {
      kind: "erc721-transfer";
      token: string;
      from: string;
      to: string;
      tokenId: bigint;
      isMint: boolean;
    }
  | {
      kind: "weth-wrap";
      weth: string;
      account: string;
      value: bigint;
    }
  | {
      kind: "weth-unwrap";
      weth: string;
      account: string;
      value: bigint;
    };

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const abi = AbiCoder.defaultAbiCoder();

const topicToAddress = (topic: string): string =>
  getAddress(dataSlice(getBytes(topic), 12));

const isWeth = (addr: string): boolean =>
  addr.toLowerCase() === WETH_ADDRESS.toLowerCase();

const decodeTransfer = (log: Log): Action | null => {
  // ERC-20: 3 topics, value in data
  if (log.topics.length === 3) {
    const from = topicToAddress(log.topics[1]);
    const to = topicToAddress(log.topics[2]);
    const value = BigInt(log.data);
    return {
      kind: "erc20-transfer",
      token: getAddress(log.address),
      from,
      to,
      value,
    };
  }
  // ERC-721: 4 topics, tokenId in topic[3]
  if (log.topics.length === 4) {
    const from = topicToAddress(log.topics[1]);
    const to = topicToAddress(log.topics[2]);
    const tokenId = BigInt(log.topics[3]);
    return {
      kind: "erc721-transfer",
      token: getAddress(log.address),
      from,
      to,
      tokenId,
      isMint: from === ZERO_ADDRESS,
    };
  }
  return null;
};

const decodeWethDeposit = (log: Log): Action | null => {
  if (!isWeth(log.address) || log.topics.length !== 2) return null;
  return {
    kind: "weth-wrap",
    weth: getAddress(log.address),
    account: topicToAddress(log.topics[1]),
    value: BigInt(log.data),
  };
};

const decodeWethWithdrawal = (log: Log): Action | null => {
  if (!isWeth(log.address) || log.topics.length !== 2) return null;
  return {
    kind: "weth-unwrap",
    weth: getAddress(log.address),
    account: topicToAddress(log.topics[1]),
    value: BigInt(log.data),
  };
};

const decodeUniV2Swap = (
  log: Log,
  token0?: string,
  token1?: string,
): Action | null => {
  try {
    const [a0In, a1In, a0Out, a1Out] = abi.decode(
      ["uint256", "uint256", "uint256", "uint256"],
      log.data,
    ) as unknown as [bigint, bigint, bigint, bigint];
    // Normalize to signed deltas relative to the pool: positive = pool received
    const amount0 = a0In - a0Out;
    const amount1 = a1In - a1Out;
    return {
      kind: "swap",
      protocol: "Uniswap V2",
      pool: getAddress(log.address),
      token0: token0 ?? getAddress(log.address), // resolved later if possible
      token1: token1 ?? getAddress(log.address),
      amount0,
      amount1,
    };
  } catch {
    return null;
  }
};

const decodeUniV3Swap = (
  log: Log,
  token0?: string,
  token1?: string,
): Action | null => {
  try {
    const [amount0, amount1] = abi.decode(
      ["int256", "int256", "uint160", "uint128", "int24"],
      log.data,
    ) as unknown as [bigint, bigint, bigint, bigint, bigint];
    return {
      kind: "swap",
      protocol: "Uniswap V3",
      pool: getAddress(log.address),
      token0: token0 ?? getAddress(log.address),
      token1: token1 ?? getAddress(log.address),
      amount0,
      amount1,
    };
  } catch {
    return null;
  }
};

/**
 * Decode all candidate actions from a tx's receipt logs. No protocol-name
 * preference is applied here — that happens in `pickPrimaryAction`.
 *
 * `tokenLookup` may be passed to attach token0/token1 to swap actions; without
 * it the consumer must fetch them separately.
 */
export const decodeActions = (
  logs: readonly Log[],
  tokenLookup?: (pool: string) => { token0?: string; token1?: string },
): Action[] => {
  const actions: Action[] = [];
  for (const log of logs) {
    if (log.topics.length === 0) continue;
    const topic0 = log.topics[0];
    let a: Action | null = null;
    if (topic0 === TRANSFER_TOPIC) a = decodeTransfer(log);
    else if (topic0 === WETH_DEPOSIT_TOPIC) a = decodeWethDeposit(log);
    else if (topic0 === WETH_WITHDRAWAL_TOPIC) a = decodeWethWithdrawal(log);
    else if (topic0 === UNIV2_SWAP_TOPIC) {
      const t = tokenLookup?.(getAddress(log.address));
      a = decodeUniV2Swap(log, t?.token0, t?.token1);
    } else if (topic0 === UNIV3_SWAP_TOPIC) {
      const t = tokenLookup?.(getAddress(log.address));
      a = decodeUniV3Swap(log, t?.token0, t?.token1);
    }
    if (a) actions.push(a);
  }
  return actions;
};

const PRIORITY: Record<Action["kind"], number> = {
  swap: 5,
  "weth-wrap": 4,
  "weth-unwrap": 4,
  "erc721-transfer": 3,
  "erc20-transfer": 1,
};

export const pickPrimaryAction = (actions: Action[]): Action | null => {
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
  // For ERC-721 prefer mints over plain transfers.
  if (best.kind === "erc721-transfer") {
    const mint = actions.find(
      (a) => a.kind === "erc721-transfer" && a.isMint,
    );
    if (mint) return mint;
  }
  return best;
};
