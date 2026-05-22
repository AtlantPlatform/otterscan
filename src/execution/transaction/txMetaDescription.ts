import { formatUnits } from "ethers";
import { ResolvedAction, TokenDescriptor } from "../../api/client";
import { addressLabel } from "./action/labels";

const UINT256_MAX = (1n << 256n) - 1n;

const shortAddr = (a: string): string =>
  a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";

const addrLabel = (a: string): string => addressLabel(a) ?? shortAddr(a);

const tokenLabel = (t: TokenDescriptor): string =>
  t.symbol || addressLabel(t.address) || shortAddr(t.address);

const formatAmount = (value: bigint, decimals: number): string => {
  const s = formatUnits(value, decimals);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
};

const summarizeAction = (action: ResolvedAction): string => {
  switch (action.kind) {
    case "approve": {
      const val = BigInt(action.value);
      const amount =
        val === UINT256_MAX
          ? `unlimited ${tokenLabel(action.token)}`
          : `${formatAmount(val, action.token.decimals)} ${tokenLabel(action.token)}`;
      return `Approve ${amount} for ${addrLabel(action.spender)}`;
    }
    case "swap":
      return `Swap ${formatAmount(BigInt(action.amountIn), action.tokenIn.decimals)} ${tokenLabel(action.tokenIn)} for ${formatAmount(BigInt(action.amountOut), action.tokenOut.decimals)} ${tokenLabel(action.tokenOut)} on ${action.protocol}`;
    case "swap-partial":
      return `Swap on ${action.protocol}`;
    case "weth-wrap":
      return `Wrap ${formatAmount(BigInt(action.value), 18)} ETH to WETH`;
    case "weth-unwrap":
      return `Unwrap ${formatAmount(BigInt(action.value), 18)} WETH to ETH`;
    case "call":
      return `Call ${action.method} on ${addrLabel(action.to)}`;
    case "erc20-transfer":
      return `Transfer ${formatAmount(BigInt(action.value), action.token.decimals)} ${tokenLabel(action.token)} to ${addrLabel(action.to)}`;
    case "erc721-transfer":
      return `${action.isMint ? "Mint" : "Transfer"} NFT #${action.tokenId} on ${addrLabel(action.token)}`;
    case "native-transfer":
      return `Transfer ${formatAmount(BigInt(action.value), 18)} ETH to ${addrLabel(action.to)}`;
    case "eip7702": {
      const first = action.authorizations[0];
      const more = action.authorizations.length - 1;
      const tail = more > 0 ? ` (+${more} more)` : "";
      return `EIP-7702 Delegate to ${addrLabel(first.address)}${tail}`;
    }
  }
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const formatTxTime = (ts: number): string => {
  const d = new Date(ts * 1000);
  const mm = MONTHS[d.getUTCMonth()];
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  let h = d.getUTCHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${mm}-${dd}-${yyyy} ${String(h).padStart(2, "0")}:${mi}:${ss} ${ampm} (UTC)`;
};

export type TxMetaInput = {
  hash: string;
  from: string;
  status: boolean | null;
  timestamp: number | null;
  resolvedAction: ResolvedAction | null;
};

export const buildTxMetaDescription = (tx: TxMetaInput): string => {
  const action = tx.resolvedAction
    ? summarizeAction(tx.resolvedAction)
    : `Ethereum Transaction ${tx.hash}`;
  const status =
    tx.status === null ? "Pending" : tx.status ? "Success" : "Failed";
  const parts = [`${action} By ${addrLabel(tx.from)}`, status];
  if (tx.timestamp) parts.push(formatTxTime(tx.timestamp));
  return parts.join(" | ");
};
