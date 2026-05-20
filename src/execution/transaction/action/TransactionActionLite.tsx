import { FC, useMemo } from "react";
import { NavLink } from "react-router";
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
  // Raw calldata. When present and the tx isn't a recognised log-based
  // intent (swap, plain transfer, etc.) we surface a "Call <method> on <to>"
  // summary using the 4byte directory.
  data?: string;
  // EIP-7702 set-code transaction (type 4) authorization list.
  authorizationList?: Array<{
    chainId: number;
    address: string;
    nonce: number;
    authority: string | null;
  }> | null;
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

// Format a 4byte name like "execTransaction" → "Exec Transaction".
const formatMethodName = (name: string): string => {
  // camelCase → space-separated, with first letter capitalised.
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const useMethodName = (data: string | undefined) => {
  const selector =
    data && data.length >= 10 && data.startsWith("0x")
      ? data.slice(2, 10)
      : null;
  const { data: name } = useSWRImmutable(
    selector ? ["sigName", selector] : null,
    async ([_, sel]) => {
      try {
        const res = await fetch(`/signatures/${sel}`);
        if (!res.ok) return null;
        const text = await res.text();
        if (text.startsWith("<") || !text.includes("(")) return null;
        return text.split(";")[0].split("(")[0];
      } catch {
        return null;
      }
    },
  );
  return { selector: selector ? `0x${selector}` : null, name };
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

const AddressLink: FC<{ address: string; className?: string }> = ({
  address,
  className = "",
}) => (
  <NavLink
    to={`/address/${address}`}
    title={address}
    className={`font-hash text-link-blue hover:text-link-blue-hover ${className}`}
  >
    {displayAddr(address)}
  </NavLink>
);

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
  const label = symbol ?? addressLabel(token) ?? shortAddr(token);
  return (
    <span className="inline-flex items-baseline space-x-1">
      <FormattedBalance value={amount} decimals={decimals} />
      {isWeth ? (
        <span className="font-semibold">{label}</span>
      ) : (
        <NavLink
          to={`/address/${token}`}
          title={token}
          className="font-semibold text-link-blue hover:text-link-blue-hover"
        >
          {label}
        </NavLink>
      )}
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
    <AddressLink address={action.from} />
    <span>to</span>
    <AddressLink address={action.to} />
  </span>
);

const Erc721Row: FC<{ action: Extract<Action, { kind: "erc721-transfer" }> }> = ({
  action,
}) => (
  <span className="inline-flex flex-wrap items-baseline gap-x-1">
    <span>{action.isMint ? "Mint" : "Transfer"}</span>
    <span className="font-semibold">NFT #{action.tokenId.toString()}</span>
    <span>on</span>
    <AddressLink address={action.token} />
  </span>
);

const Eip7702Row: FC<{
  authorizations: NonNullable<Props["authorizationList"]>;
}> = ({ authorizations }) => {
  // Show the first authorization in the headline; if multiple delegations
  // exist with the same target, append "+N more" so the user knows there's
  // more to look at on the Authorizations tab.
  const first = authorizations[0];
  const more = authorizations.length - 1;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1">
      <span className="font-semibold">EIP-7702:</span>
      {first.authority ? (
        <AddressLink address={first.authority} />
      ) : (
        <span className="text-gray-500">unknown signer</span>
      )}
      <span>Delegate to</span>
      <AddressLink address={first.address} />
      {more > 0 && <span className="text-gray-500">(+{more} more)</span>}
    </span>
  );
};

const CallRow: FC<{
  method: string;
  from: string;
  to: string;
}> = ({ method, from, to }) => (
  <span className="inline-flex flex-wrap items-baseline gap-x-1">
    <span>Call</span>
    <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-gray-700">
      {method}
    </span>
    <span>Function by</span>
    <AddressLink address={from} />
    <span>on</span>
    <AddressLink address={to} />
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
    <AddressLink address={from} />
    <span>to</span>
    <AddressLink address={to} />
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
        <span className="text-gray-500">(<AddressLink address={action.pool} />)</span>
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

const TransactionActionLite: FC<Props> = ({
  logs,
  value,
  from,
  to,
  data,
  authorizationList,
}) => {
  // EIP-7702 set-code txs lead with the delegation, not log decoding.
  const hasAuths = !!(authorizationList && authorizationList.length > 0);
  const logAction = useMemo(() => {
    if (!logs || logs.length === 0) return null;
    // decodeActions expects `Log`-shaped objects but only reads address,
    // topics, and data — the lite shape is structurally compatible.
    return pickPrimaryAction(decodeActions(logs as never));
  }, [logs]);

  const { selector, name: methodName } = useMethodName(data);

  // When the tx is a contract call that *isn't* a direct transfer/swap on
  // the called contract, surface the call itself (matching Etherscan's
  // "Call <Method> Function by X on Y" line). Otherwise prefer the log
  // action — a token's own `transfer()` produces a Transfer log on the same
  // address as `tx.to`, and that's the more informative summary.
  const showCallInstead = useMemo(() => {
    if (!selector || !to) return false;
    if (!logAction) return true; // no log decoder matched
    if (logAction.kind === "swap") return false;
    if (logAction.kind === "weth-wrap" || logAction.kind === "weth-unwrap")
      return false;
    if (
      logAction.kind === "erc20-transfer" ||
      logAction.kind === "erc721-transfer"
    ) {
      // Direct transfer on the token contract (e.g. calling USDT.transfer()).
      if (logAction.token.toLowerCase() === to.toLowerCase()) return false;
      // Indirect transfer but the user is the source — e.g. calling a router
      // that pulls tokens from the user. Still reads as "user sent N TOK".
      if (from && logAction.from.toLowerCase() === from.toLowerCase()) {
        return false;
      }
    }
    return true;
  }, [selector, to, from, logAction]);

  const action = showCallInstead ? null : logAction;

  // Fall back to a native ETH transfer when no log-based action matched,
  // no contract call to show, and the tx moves a non-zero value.
  const nativeValue = useMemo(() => {
    if (action || showCallInstead) return null;
    if (!value || !from || !to) return null;
    try {
      const v = BigInt(value);
      return v > 0n ? v : null;
    } catch {
      return null;
    }
  }, [action, showCallInstead, value, from, to]);

  if (!hasAuths && !action && !showCallInstead && !nativeValue) return null;

  return (
    <div className="flex items-baseline space-x-2 border-b border-gray-200 px-3 py-3 text-sm dark:border-gray-700">
      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-blue-700 dark:bg-blue-900 dark:text-blue-200">
        Action
      </span>
      <div className="flex-1">
        {hasAuths && authorizationList && (
          <Eip7702Row authorizations={authorizationList} />
        )}
        {!hasAuths && action?.kind === "swap" && <SwapRow action={action} />}
        {!hasAuths && action?.kind === "erc20-transfer" && <Erc20Row action={action} />}
        {!hasAuths && action?.kind === "erc721-transfer" && <Erc721Row action={action} />}
        {!hasAuths && (action?.kind === "weth-wrap" || action?.kind === "weth-unwrap") && (
          <WethRow action={action} />
        )}
        {!hasAuths && showCallInstead && from && to && (
          <CallRow
            method={methodName ? formatMethodName(methodName) : (selector ?? "")}
            from={from}
            to={to}
          />
        )}
        {!hasAuths && !action && !showCallInstead && nativeValue !== null && from && to && (
          <NativeTransferRow value={nativeValue} from={from} to={to} />
        )}
      </div>
    </div>
  );
};

export default TransactionActionLite;
