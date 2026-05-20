import { Contract, JsonRpcApiProvider } from "ethers";
import { FC, useContext, useMemo } from "react";
import useSWRImmutable from "swr/immutable";
import FormattedBalance from "../../../components/FormattedBalance";
import { TransactionData } from "../../../types";
import { useTokenMetadata } from "../../../useErigonHooks";
import { RuntimeContext } from "../../../useRuntime";
import TransactionAddress from "../../components/TransactionAddress";
import {
  Action,
  decodeActions,
  pickPrimaryAction,
} from "./summarize";
import { WETH_ADDRESS } from "./topics";

type Props = {
  txData: TransactionData;
};

const UNI_PAIR_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
];

const usePairTokens = (
  provider: JsonRpcApiProvider,
  pool: string | undefined,
) => {
  const { data } = useSWRImmutable(
    pool !== undefined ? ["pair-tokens", pool] : null,
    async ([_, address]) => {
      try {
        const c = new Contract(address, UNI_PAIR_ABI, provider);
        const [token0, token1] = (await Promise.all([
          c.token0(),
          c.token1(),
        ])) as [string, string];
        return { token0, token1 };
      } catch {
        return undefined;
      }
    },
  );
  return data;
};

const TokenAmount: FC<{ token: string; amount: bigint; nativeIfWeth?: boolean }> = ({
  token,
  amount,
  nativeIfWeth = true,
}) => {
  const { provider } = useContext(RuntimeContext);
  const isWeth =
    nativeIfWeth && token.toLowerCase() === WETH_ADDRESS.toLowerCase();
  const meta = useTokenMetadata(provider, isWeth ? undefined : token);
  const decimals = isWeth ? 18 : meta?.decimals ?? 0;
  const symbol = isWeth ? "ETH" : meta?.symbol;
  return (
    <span className="inline-flex items-baseline space-x-1">
      <FormattedBalance value={amount} decimals={decimals} />
      {symbol ? (
        <span className="font-semibold">{symbol}</span>
      ) : (
        <TransactionAddress address={token} />
      )}
    </span>
  );
};

const SwapRow: FC<{ action: Extract<Action, { kind: "swap" }> }> = ({
  action,
}) => {
  const { provider } = useContext(RuntimeContext);
  const tokens = usePairTokens(provider, action.pool);
  const token0 = tokens?.token0;
  const token1 = tokens?.token1;

  // The user paid the side with positive delta (pool received) and got the negative side.
  // For UniV2 we computed a0In - a0Out so positive = paid by user.
  const paid0 = action.amount0 > 0n;
  const inToken = paid0 ? token0 : token1;
  const outToken = paid0 ? token1 : token0;
  const inAmount = paid0 ? action.amount0 : action.amount1;
  const outAmount = paid0 ? -action.amount1 : -action.amount0;

  if (!inToken || !outToken) {
    return (
      <span>
        Swap on <span className="font-semibold">{action.protocol}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1">
      <span>Swap</span>
      <TokenAmount token={inToken} amount={inAmount > 0n ? inAmount : -inAmount} />
      <span>for</span>
      <TokenAmount
        token={outToken}
        amount={outAmount > 0n ? outAmount : -outAmount}
      />
      <span>on</span>
      <span className="font-semibold">{action.protocol}</span>
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
    <TransactionAddress address={action.from} />
    <span>to</span>
    <TransactionAddress address={action.to} />
  </span>
);

const Erc721Row: FC<{ action: Extract<Action, { kind: "erc721-transfer" }> }> = ({
  action,
}) => (
  <span className="inline-flex flex-wrap items-baseline gap-x-1">
    <span>{action.isMint ? "Mint" : "Transfer"}</span>
    <span className="font-semibold">NFT #{action.tokenId.toString()}</span>
    <span>from</span>
    <TransactionAddress address={action.from} />
    <span>to</span>
    <TransactionAddress address={action.to} />
    <span>on</span>
    <TransactionAddress address={action.token} />
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

const TransactionAction: FC<Props> = ({ txData }) => {
  const logs = txData.confirmedData?.logs;
  const action = useMemo(() => {
    if (!logs || logs.length === 0) return null;
    return pickPrimaryAction(decodeActions(logs));
  }, [logs]);

  if (!action) return null;

  return (
    <div className="flex items-baseline space-x-2 border-b border-gray-200 px-3 py-3 text-sm">
      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-blue-700">
        Action
      </span>
      <div className="flex-1">
        {action.kind === "swap" && <SwapRow action={action} />}
        {action.kind === "erc20-transfer" && <Erc20Row action={action} />}
        {action.kind === "erc721-transfer" && <Erc721Row action={action} />}
        {(action.kind === "weth-wrap" || action.kind === "weth-unwrap") && (
          <WethRow action={action} />
        )}
      </div>
    </div>
  );
};

export default TransactionAction;
