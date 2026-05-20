import { FC, useMemo } from "react";
import useSWRImmutable from "swr/immutable";
import FormattedBalance from "../../../components/FormattedBalance";
import { tokensAPI } from "../../../api/client";
import {
  Action,
  decodeActions,
  pickPrimaryAction,
} from "./summarize";
import { WETH_ADDRESS } from "./topics";
import { addressLabel } from "./labels";

/**
 * SSR-safe variant of TransactionAction.
 *
 * Used on routes that don't mount a RuntimeContext provider (e.g. /tx/:hash
 * served by TransactionSSR). Accepts the plain REST-API log shape and resolves
 * ERC-20 token metadata via /api/tokens. Swaps are summarised without
 * amounts because resolving pool token0/token1 would require a JSON-RPC call.
 */

type LiteLog = {
  address: string;
  topics: string[];
  data: string;
};

type Props = {
  logs?: LiteLog[];
  // Native-ETH fallback so plain transfers (no log decoders match) still
  // surface an action line.
  value?: string;
  from?: string;
  to?: string | null;
};

const useTokenMeta = (address: string | undefined) => {
  const { data } = useSWRImmutable(
    address ? ["restTokenMeta", address.toLowerCase()] : null,
    async ([_, addr]) => {
      try {
        return await tokensAPI.getToken(addr);
      } catch {
        return null;
      }
    },
  );
  return data;
};

// token0() = 0x0dfe1681, token1() = 0xd21220a7
const ethCall = async (to: string, data: string): Promise<string | null> => {
  try {
    const res = await fetch("/api/rpc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to, data }, "latest"],
      }),
    });
    const json = await res.json();
    return typeof json?.result === "string" ? json.result : null;
  } catch {
    return null;
  }
};

const usePoolTokens = (pool: string | undefined) => {
  const { data } = useSWRImmutable(
    pool ? ["poolTokens", pool.toLowerCase()] : null,
    async ([_, addr]) => {
      const [t0, t1] = await Promise.all([
        ethCall(addr, "0x0dfe1681"),
        ethCall(addr, "0xd21220a7"),
      ]);
      if (!t0 || !t1 || t0.length < 66 || t1.length < 66) return null;
      return {
        token0: "0x" + t0.slice(-40),
        token1: "0x" + t1.slice(-40),
      };
    },
  );
  return data;
};

const shortAddr = (a: string) => `${a.slice(0, 8)}…${a.slice(-6)}`;

const displayAddr = (a: string) => addressLabel(a) ?? shortAddr(a);

const TokenAmount: FC<{
  token: string;
  amount: bigint;
  nativeIfWeth?: boolean;
}> = ({ token, amount, nativeIfWeth = true }) => {
  const isWeth =
    nativeIfWeth && token.toLowerCase() === WETH_ADDRESS.toLowerCase();
  const meta = useTokenMeta(isWeth ? undefined : token);
  const decimals = isWeth ? 18 : meta?.decimals ?? 0;
  const symbol = isWeth ? "ETH" : meta?.symbol;
  return (
    <span className="inline-flex items-baseline space-x-1">
      <FormattedBalance value={amount} decimals={decimals} />
      <span className="font-semibold">{symbol ?? addressLabel(token) ?? shortAddr(token)}</span>
    </span>
  );
};

const Erc20Row: FC<{ action: Extract<Action, { kind: "erc20-transfer" }> }> = ({
  action,
}) => (
  <span className="inline-flex flex-wrap items-baseline gap-x-1">
    <span>Transfer</span>
    <TokenAmount token={action.token} amount={action.value} nativeIfWeth={false} />
    <span>from</span>
    <span className="font-hash" title={action.from}>{displayAddr(action.from)}</span>
    <span>to</span>
    <span className="font-hash" title={action.to}>{displayAddr(action.to)}</span>
  </span>
);

const Erc721Row: FC<{ action: Extract<Action, { kind: "erc721-transfer" }> }> = ({
  action,
}) => (
  <span className="inline-flex flex-wrap items-baseline gap-x-1">
    <span>{action.isMint ? "Mint" : "Transfer"}</span>
    <span className="font-semibold">NFT #{action.tokenId.toString()}</span>
    <span>on</span>
    <span className="font-hash" title={action.token}>{displayAddr(action.token)}</span>
  </span>
);

const NativeTransferRow: FC<{
  value: bigint;
  from: string;
  to: string;
}> = ({ value, from, to }) => (
  <span className="inline-flex flex-wrap items-baseline gap-x-1">
    <span>Transfer</span>
    <FormattedBalance value={value} decimals={18} />
    <span className="font-semibold">ETH</span>
    <span>from</span>
    <span className="font-hash" title={from}>{displayAddr(from)}</span>
    <span>to</span>
    <span className="font-hash" title={to}>{displayAddr(to)}</span>
  </span>
);

const WethRow: FC<{
  action: Extract<Action, { kind: "weth-wrap" | "weth-unwrap" }>;
}> = ({ action }) => (
  <span className="inline-flex flex-wrap items-baseline gap-x-1">
    <span>{action.kind === "weth-wrap" ? "Wrap" : "Unwrap"}</span>
    <FormattedBalance value={action.value} decimals={18} />
    <span className="font-semibold">
      {action.kind === "weth-wrap" ? "ETH → WETH" : "WETH → ETH"}
    </span>
  </span>
);

const SwapRow: FC<{ action: Extract<Action, { kind: "swap" }> }> = ({
  action,
}) => {
  const tokens = usePoolTokens(action.pool);
  if (!tokens) {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-x-1">
        <span>Swap on</span>
        <span className="font-semibold">{action.protocol}</span>
        <span className="text-gray-500">({shortAddr(action.pool)})</span>
      </span>
    );
  }
  // Positive amount0 = pool received token0 (user paid token0).
  const paid0 = action.amount0 > 0n;
  const inToken = paid0 ? tokens.token0 : tokens.token1;
  const outToken = paid0 ? tokens.token1 : tokens.token0;
  const inAmount = paid0 ? action.amount0 : action.amount1;
  const outAmount = paid0 ? -action.amount1 : -action.amount0;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1">
      <span>Swap</span>
      <TokenAmount token={inToken} amount={inAmount > 0n ? inAmount : -inAmount} />
      <span>for</span>
      <TokenAmount token={outToken} amount={outAmount > 0n ? outAmount : -outAmount} />
      <span>on</span>
      <span className="font-semibold">{action.protocol}</span>
    </span>
  );
};

const TransactionActionLite: FC<Props> = ({ logs, value, from, to }) => {
  const action = useMemo(() => {
    if (!logs || logs.length === 0) return null;
    // decodeActions expects `Log`-shaped objects but only reads address,
    // topics, and data — the lite shape is structurally compatible.
    return pickPrimaryAction(decodeActions(logs as never));
  }, [logs]);

  // Fall back to a native ETH transfer when no log-based action matched
  // and the tx moves a non-zero value.
  const nativeValue = useMemo(() => {
    if (action) return null;
    if (!value || !from || !to) return null;
    try {
      const v = BigInt(value);
      return v > 0n ? v : null;
    } catch {
      return null;
    }
  }, [action, value, from, to]);

  if (!action && !nativeValue) return null;

  return (
    <div className="flex items-baseline space-x-2 border-b border-gray-200 px-3 py-3 text-sm dark:border-gray-700">
      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-blue-700 dark:bg-blue-900 dark:text-blue-200">
        Action
      </span>
      <div className="flex-1">
        {action?.kind === "swap" && <SwapRow action={action} />}
        {action?.kind === "erc20-transfer" && <Erc20Row action={action} />}
        {action?.kind === "erc721-transfer" && <Erc721Row action={action} />}
        {(action?.kind === "weth-wrap" || action?.kind === "weth-unwrap") && (
          <WethRow action={action} />
        )}
        {!action && nativeValue !== null && from && to && (
          <NativeTransferRow value={nativeValue} from={from} to={to} />
        )}
      </div>
    </div>
  );
};

export default TransactionActionLite;
