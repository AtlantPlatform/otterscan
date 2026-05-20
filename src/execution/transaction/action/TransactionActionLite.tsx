import { id as keccakId } from "ethers";
import { FC, useMemo } from "react";
import { NavLink } from "react-router";
import useSWRImmutable from "swr/immutable";
import FormattedBalance from "../../../components/FormattedBalance";
import { tokensAPI, ResolvedAction, TokenDescriptor } from "../../../api/client";
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
  // Server-resolved action. When present, renders directly without any SWR
  // roundtrips — labels are already in the SSR HTML.
  resolvedAction?: ResolvedAction | null;
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

// Build "name(type1,type2,...)" from an ABI function fragment so we can
// keccak it and match against the 4byte selector. Recurses into tuple types
// so structs get encoded as their canonical "(t1,t2,...)" form.
const abiTypeString = (
  input: { type: string; components?: { type: string; components?: unknown[] }[] },
): string => {
  if (input.type === "tuple" && input.components) {
    return `(${input.components.map((c) => abiTypeString(c as never)).join(",")})`;
  }
  if (input.type.startsWith("tuple[") && input.components) {
    const suffix = input.type.slice("tuple".length);
    return `(${input.components.map((c) => abiTypeString(c as never)).join(",")})${suffix}`;
  }
  return input.type;
};

type AbiFn = {
  type: string;
  name?: string;
  inputs?: { type: string; components?: unknown[] }[];
};

const abiSelector = (fn: AbiFn): string => {
  const sig = `${fn.name ?? ""}(${(fn.inputs ?? []).map((i) => abiTypeString(i as never)).join(",")})`;
  return keccakId(sig).slice(0, 10);
};

// Try Sourcify (full match first, then partial) to resolve a method name
// from the contract's verified ABI when the 4byte directory comes up empty.
const sourcifyLookup = async (
  contract: string,
  selector: string,
): Promise<string | null> => {
  const base = "https://repo.sourcify.dev/contracts";
  const checksummed = contract; // sourcify accepts checksummed or lowercase
  for (const variant of ["full_match", "partial_match"]) {
    try {
      const res = await fetch(`${base}/${variant}/1/${checksummed}/metadata.json`);
      if (!res.ok) continue;
      const meta = (await res.json()) as { output?: { abi?: AbiFn[] } };
      const abi = meta.output?.abi ?? [];
      for (const item of abi) {
        if (item.type !== "function" || !item.name) continue;
        try {
          if (abiSelector(item) === selector) return item.name;
        } catch {
          /* skip malformed entries */
        }
      }
    } catch {
      /* network / parse errors → try next variant */
    }
  }
  return null;
};

const useMethodName = (data: string | undefined, contract?: string | null) => {
  const selector =
    data && data.length >= 10 && data.startsWith("0x")
      ? data.slice(0, 10)
      : null;
  const key: ["methodName", string, string | null] | null = selector
    ? ["methodName", selector, contract ? contract.toLowerCase() : null]
    : null;
  const { data: name } = useSWRImmutable<string | null, unknown, typeof key>(
    key,
    async ([_, sel, contractAddr]) => {
      const selBare = sel.slice(2);
      // 1. Local /signatures/ mirror (otterscan-assets / proxied to ethscan).
      try {
        const res = await fetch(`/signatures/${selBare}`);
        if (res.ok) {
          const text = await res.text();
          if (!text.startsWith("<") && text.includes("(")) {
            return text.split(";")[0].split("(")[0];
          }
        }
      } catch {
        /* fall through */
      }
      // 2. Live 4byte.directory — picks up selectors added after our mirror
      //    was last synced.
      try {
        const res = await fetch(
          `https://www.4byte.directory/api/v1/signatures/?hex_signature=${sel}`,
        );
        if (res.ok) {
          const json = (await res.json()) as {
            results?: { text_signature: string }[];
          };
          const sig = json.results?.[0]?.text_signature;
          if (sig && sig.includes("(")) {
            return sig.split("(")[0];
          }
        }
      } catch {
        /* fall through */
      }
      // 3. Sourcify-verified contract ABI (catches contract-specific names
      //    when the contract is verified on Sourcify).
      if (contractAddr) {
        const sName = await sourcifyLookup(contractAddr, sel);
        if (sName) return sName;
      }
      return null;
    },
  );
  return { selector, name };
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

// Decode an `approve(address spender, uint256 value)` call's arguments from
// the tx calldata.
const decodeApprove = (
  data: string,
): { spender: string; value: bigint } | null => {
  if (!data || data.length < 138 || !data.toLowerCase().startsWith("0x095ea7b3")) {
    return null;
  }
  try {
    const spender = "0x" + data.slice(10 + 24, 10 + 64);
    const value = BigInt("0x" + data.slice(10 + 64, 10 + 128));
    return { spender, value };
  } catch {
    return null;
  }
};

// uint256 max — the conventional "infinite" approval amount.
const UINT256_MAX = (1n << 256n) - 1n;

const ApproveRow: FC<{
  token: string;
  spender: string;
  value: bigint;
  owner: string;
}> = ({ token, spender, value, owner }) => {
  const isUnlimited = value === UINT256_MAX;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1">
      <span>Approve</span>
      {isUnlimited ? (
        <span className="font-semibold">unlimited</span>
      ) : (
        <TokenAmount token={token} amount={value} nativeIfWeth={false} />
      )}
      {isUnlimited && (
        <NavLink
          to={`/address/${token}`}
          title={token}
          className="font-semibold text-link-blue hover:text-link-blue-hover"
        >
          {addressLabel(token) ?? shortAddr(token)}
        </NavLink>
      )}
      <span>for</span>
      <AddressLink address={spender} />
      <span>by</span>
      <AddressLink address={owner} />
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

// Render path for server-resolved actions. Every label is already on the
// payload, so no SWR/eth_call is needed. SSR HTML already has the final
// labels; hydration is a no-op for this branch.
const ResolvedRow: FC<{ action: ResolvedAction }> = ({ action }) => {
  switch (action.kind) {
    case "eip7702": {
      const first = action.authorizations[0];
      const more = action.authorizations.length - 1;
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
    }
    case "approve":
      return (
        <ResolvedApprove
          token={action.token}
          spender={action.spender}
          owner={action.owner}
          value={BigInt(action.value)}
        />
      );
    case "swap":
      return (
        <span className="inline-flex flex-wrap items-baseline gap-x-1">
          <span>Swap</span>
          <ResolvedTokenAmount token={action.tokenIn} amount={BigInt(action.amountIn)} />
          <span>for</span>
          <ResolvedTokenAmount token={action.tokenOut} amount={BigInt(action.amountOut)} />
          <span>on</span>
          <span className="font-semibold">{action.protocol}</span>
        </span>
      );
    case "swap-partial":
      return (
        <span className="inline-flex flex-wrap items-baseline gap-x-1">
          <span>Swap on</span>
          <span className="font-semibold">{action.protocol}</span>
          <span className="text-gray-500">(<AddressLink address={action.pool} />)</span>
        </span>
      );
    case "weth-wrap":
    case "weth-unwrap":
      return (
        <span className="inline-flex flex-wrap items-baseline gap-x-1">
          <span>{action.kind === "weth-wrap" ? "Wrap" : "Unwrap"}</span>
          <FormattedBalance value={BigInt(action.value)} decimals={18} />
          <span className="font-semibold">
            {action.kind === "weth-wrap" ? "ETH → WETH" : "WETH → ETH"}
          </span>
        </span>
      );
    case "call":
      return (
        <span className="inline-flex flex-wrap items-baseline gap-x-1">
          <span>Call</span>
          <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-gray-700">
            {action.method}
          </span>
          <span>Function by</span>
          <AddressLink address={action.from} />
          <span>on</span>
          <AddressLink address={action.to} />
        </span>
      );
    case "erc20-transfer":
      return (
        <span className="inline-flex flex-wrap items-baseline gap-x-1">
          <span>Transfer</span>
          <ResolvedTokenAmount token={action.token} amount={BigInt(action.value)} />
          <span>from</span>
          <AddressLink address={action.from} />
          <span>to</span>
          <AddressLink address={action.to} />
        </span>
      );
    case "erc721-transfer":
      return (
        <span className="inline-flex flex-wrap items-baseline gap-x-1">
          <span>{action.isMint ? "Mint" : "Transfer"}</span>
          <span className="font-semibold">NFT #{action.tokenId}</span>
          <span>on</span>
          <AddressLink address={action.token} />
        </span>
      );
    case "native-transfer":
      return (
        <span className="inline-flex flex-wrap items-baseline gap-x-1">
          <span>Transfer</span>
          <FormattedBalance value={BigInt(action.value)} decimals={18} />
          <span className="font-semibold">ETH</span>
          <span>from</span>
          <AddressLink address={action.from} />
          <span>to</span>
          <AddressLink address={action.to} />
        </span>
      );
  }
};

const ResolvedTokenAmount: FC<{ token: TokenDescriptor; amount: bigint }> = ({
  token,
  amount,
}) => (
  <span className="inline-flex items-baseline space-x-1">
    <FormattedBalance value={amount} decimals={token.decimals} />
    {token.symbol === "ETH" ? (
      <span className="font-semibold">ETH</span>
    ) : (
      <NavLink
        to={`/address/${token.address}`}
        title={token.address}
        className="font-semibold text-link-blue hover:text-link-blue-hover"
      >
        {token.symbol || shortAddr(token.address)}
      </NavLink>
    )}
  </span>
);

const ResolvedApprove: FC<{
  token: TokenDescriptor;
  spender: string;
  owner: string;
  value: bigint;
}> = ({ token, spender, owner, value }) => {
  const isUnlimited = value === UINT256_MAX;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1">
      <span>Approve</span>
      {isUnlimited ? (
        <>
          <span className="font-semibold">unlimited</span>
          <NavLink
            to={`/address/${token.address}`}
            title={token.address}
            className="font-semibold text-link-blue hover:text-link-blue-hover"
          >
            {token.symbol || shortAddr(token.address)}
          </NavLink>
        </>
      ) : (
        <ResolvedTokenAmount token={token} amount={value} />
      )}
      <span>for</span>
      <AddressLink address={spender} />
      <span>by</span>
      <AddressLink address={owner} />
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
  resolvedAction,
}) => {
  // Fast path: backend resolved everything. SSR HTML already has the labels;
  // skip all the client-side decoders below.
  if (resolvedAction) {
    return (
      <div className="flex items-baseline space-x-2 border-b border-gray-200 px-3 py-3 text-sm dark:border-gray-700">
        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-blue-700 dark:bg-blue-900 dark:text-blue-200">
          Action
        </span>
        <div className="flex-1">
          <ResolvedRow action={resolvedAction} />
        </div>
      </div>
    );
  }

  // EIP-7702 set-code txs lead with the delegation, not log decoding.
  const hasAuths = !!(authorizationList && authorizationList.length > 0);

  // Detect ERC-20 approve calls on the destination token contract.
  const approve = useMemo(
    () => (data ? decodeApprove(data) : null),
    [data],
  );
  const logAction = useMemo(() => {
    if (!logs || logs.length === 0) return null;
    // decodeActions expects `Log`-shaped objects but only reads address,
    // topics, and data — the lite shape is structurally compatible.
    return pickPrimaryAction(decodeActions(logs as never));
  }, [logs]);

  const { selector, name: methodName } = useMethodName(data, to);

  // When the tx is a contract call that *isn't* a direct transfer/swap on
  // the called contract, surface the call itself (matching Etherscan's
  // "Call <Method> Function by X on Y" line). Otherwise prefer the log
  // action — a token's own `transfer()` produces a Transfer log on the same
  // address as `tx.to`, and that's the more informative summary.
  const showCallInstead = useMemo(() => {
    if (!selector || !to) return false;
    if (!logAction) return true; // no log decoder matched → use call summary
    // If the 4byte directory definitively doesn't know this selector, prefer
    // the log action — rendering "Call 0xabcdef12" is less informative than
    // the transfer it produced (matches Etherscan's behaviour for unknown
    // contract methods). `undefined` means "still loading"; let the call form
    // render with the selector and upgrade to the name when it arrives, so
    // there's no flicker for resolvable methods.
    if (methodName === null) return false;
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
  }, [selector, to, from, logAction, methodName]);

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

  const showApprove = !hasAuths && !!approve && !!to && !!from;

  if (!hasAuths && !showApprove && !action && !showCallInstead && !nativeValue)
    return null;

  return (
    <div className="flex items-baseline space-x-2 border-b border-gray-200 px-3 py-3 text-sm dark:border-gray-700">
      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-blue-700 dark:bg-blue-900 dark:text-blue-200">
        Action
      </span>
      <div className="flex-1">
        {hasAuths && authorizationList && (
          <Eip7702Row authorizations={authorizationList} />
        )}
        {showApprove && approve && to && from && (
          <ApproveRow
            token={to}
            spender={approve.spender}
            value={approve.value}
            owner={from}
          />
        )}
        {!hasAuths && !showApprove && action?.kind === "swap" && <SwapRow action={action} />}
        {!hasAuths && !showApprove && action?.kind === "erc20-transfer" && <Erc20Row action={action} />}
        {!hasAuths && !showApprove && action?.kind === "erc721-transfer" && <Erc721Row action={action} />}
        {!hasAuths && !showApprove && (action?.kind === "weth-wrap" || action?.kind === "weth-unwrap") && (
          <WethRow action={action} />
        )}
        {!hasAuths && !showApprove && showCallInstead && from && to && (
          <CallRow
            method={methodName ? formatMethodName(methodName) : (selector ?? "")}
            from={from}
            to={to}
          />
        )}
        {!hasAuths && !showApprove && !action && !showCallInstead && nativeValue !== null && from && to && (
          <NativeTransferRow value={nativeValue} from={from} to={to} />
        )}
      </div>
    </div>
  );
};

export default TransactionActionLite;
