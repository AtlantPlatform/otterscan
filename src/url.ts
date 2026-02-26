import { BlockTag } from "ethers";
import { ChecksummedAddress } from "./types";

export const fourBytesURL = (
  assetsURLPrefix: string,
  fourBytes: string,
): string => `${assetsURLPrefix}/signatures/${fourBytes}`;

export const topic0URL = (assetsURLPrefix: string, topic0: string): string =>
  `${assetsURLPrefix}/topic0/${topic0}`;

export const tokenLogoURL = (
  assetsURLPrefix: string,
  chainId: bigint,
  address: string,
): string => `${assetsURLPrefix}/assets/${chainId}/${address}/logo.png`;

export const chainInfoURL = (
  assetsURLPrefix: string,
  chainId: bigint,
): string => `${assetsURLPrefix}/chains/eip155-${chainId}.json`;

export const epochURL = (epochNumber: number) => `/epoch/${epochNumber}`;

export const slotURL = (slot: number | string) =>
  typeof slot === "number" ? `/slot/${slot}` : `/slotByBlockRoot/${slot}`;

export const slotAttestationsURL = (slotNumber: number) =>
  `/slot/${slotNumber}/attestations`;

export const validatorURL = (validatorIndex: number) =>
  `/validator/${validatorIndex}`;

const stripBlockTag = (blockTag: BlockTag): string => {
  const s = blockTag.toString();
  return s.startsWith("0x") ? s.slice(2) : s;
};

export const blockURL = (blockTag: BlockTag) =>
  `/block/${stripBlockTag(blockTag)}`;

export const blockTxsURL = (blockTag: BlockTag) =>
  `/block/${stripBlockTag(blockTag)}/txs`;

export const blockTxURL = (blockTag: BlockTag, txIndex: number) =>
  `/block/${stripBlockTag(blockTag)}/tx/${txIndex}`;

export const transactionURL = (txHash: string) => `/tx/${txHash}`;

export const addressByNonceURL = (address: ChecksummedAddress, nonce: bigint) =>
  `/address/${address}?nonce=${nonce}`;

export const openInRemixURL = (checksummedAddress: string, networkId: bigint) =>
  `https://remix.ethereum.org/#activate=sourcify&call=sourcify//fetchAndSave//${checksummedAddress}//${networkId}`;
