import {
  BigNumberish,
  Fragment,
  Interface,
  TransactionDescription,
} from "ethers";
import { useContext, useMemo } from "react";
import { Fetcher } from "swr";
import useSWRImmutable from "swr/immutable";
import { useSourcifyMetadata } from "./sourcify/useSourcify";
import { fourBytesURL } from "./url";
import { RuntimeContext } from "./useRuntime";

export type FourBytesEntry = {
  name: string;
  signature: string | undefined;
  fromVerifiedContract: boolean;
};

/**
 * Given a hex input data; extract the method selector
 *
 * @param rawInput Raw tx input including the "0x"
 * @returns the first 4 bytes, including the "0x" or null if the input
 * contains an invalid selector, e.g., txs with 0x00 data; simple transfers (0x)
 * return null as well as it is not a method selector
 */
export const extract4Bytes = (rawInput: string): string | null => {
  if (rawInput.length < 10) {
    return null;
  }
  return rawInput.slice(0, 10);
};

type FourBytesKey = [id: "4bytes", fourBytes: string];
type FourBytesFetcher = Fetcher<
  FourBytesEntry | null | undefined,
  FourBytesKey
>;

const fourBytesFetcher =
  (assetsURLPrefix: string): FourBytesFetcher =>
  async ([_, key]) => {
    if (key === null || key === "0x") {
      return undefined;
    }

    // Handle simple transfers with invalid selector like tx:
    // 0x8bcbdcc1589b5c34c1e55909c8269a411f0267a4fed59a73dd4348cc71addbb9,
    // which contains 0x00 as data
    if (key.length !== 10) {
      return undefined;
    }

    const fourBytes = key.slice(2);
    const signatureURL = fourBytesURL(assetsURLPrefix, fourBytes);

    try {
      const res = await fetch(signatureURL);
      if (!res.ok) {
        console.warn(`Signature does not exist in 4bytes DB: ${fourBytes}`);
        return null;
      }

      // Get only the first occurrence, for now ignore alternative param names
      const sigs = await res.text();
      // Defensive: some hosts return an SPA HTML 200 for unknown selectors
      // instead of a 404. Reject anything that isn't a plain signature string.
      if (sigs.startsWith("<") || !sigs.includes("(")) {
        return null;
      }
      const sig = sigs.split(";")[0];
      const cut = sig.indexOf("(");
      const method = sig.slice(0, cut);

      const entry: FourBytesEntry = {
        name: method,
        signature: sig,
        fromVerifiedContract: false,
      };
      return entry;
    } catch (err) {
      // Network error or something wrong with URL config;
      // silence and don't try it again
      return null;
    }
  };

/**
 * Extract 4bytes DB info
 *
 * @param rawFourBytes a hex string containing the 4bytes signature in the "0xXXXXXXXX" format.
 * @param address (optional) the address to which this four-byte selector is sent; if a
 * Sourcify match exists at this address, the contract ABI will be used to decode the selector.
 */
export const use4Bytes = (
  rawFourBytes: string | null,
  address?: string,
): FourBytesEntry | null | undefined => {
  if (rawFourBytes !== null && !rawFourBytes.startsWith("0x")) {
    throw new Error(
      `rawFourBytes must contain a bytes hex string starting with 0x; received value: "${rawFourBytes}"`,
    );
  }

  // RuntimeContext may be absent on SSR-safe routes (e.g. /tx/recent, /), so
  // fall back to same-origin ("" prefix → "/signatures/..."), which the dev
  // server proxies to the canonical assets host and production serves directly
  // from the baked-in otterscan-assets bundle.
  const runtime = useContext(RuntimeContext);
  const assetsURLPrefix = runtime?.config?.assetsURLPrefix ?? "";

  const { data } = useSWRImmutable<
    FourBytesEntry | null | undefined,
    unknown,
    FourBytesKey | null
  >(
    rawFourBytes !== null ? ["4bytes", rawFourBytes] : null,
    fourBytesFetcher(assetsURLPrefix),
  );
  return data;
};

export const useMethodSelector = (
  data: string,
  to?: string,
): [boolean, string, string, boolean] => {
  const rawFourBytes = extract4Bytes(data);
  let fourBytesEntry = use4Bytes(rawFourBytes, to);
  const isSimpleTransfer = data === "0x";
  const methodName = isSimpleTransfer
    ? "transfer"
    : (fourBytesEntry?.name ?? rawFourBytes ?? "-");
  const methodTitle = isSimpleTransfer
    ? "ETH Transfer"
    : methodName === rawFourBytes
      ? methodName
      : `${methodName} [${rawFourBytes}]`;

  const fromVerifiedContract = fourBytesEntry
    ? fourBytesEntry.fromVerifiedContract
    : false;
  return [isSimpleTransfer, methodName, methodTitle, fromVerifiedContract];
};

export const useTransactionDescription = (
  fourBytesEntry: FourBytesEntry | null | undefined,
  data: string | undefined,
  value: BigNumberish | undefined,
): TransactionDescription | null | undefined => {
  const txDesc = useMemo(() => {
    if (!fourBytesEntry) {
      return fourBytesEntry;
    }
    if (
      !fourBytesEntry.signature ||
      data === undefined ||
      value === undefined
    ) {
      return undefined;
    }

    const sig = fourBytesEntry?.signature;
    const functionFragment = Fragment.from(`function ${sig}`);
    const intf = new Interface([functionFragment]);
    try {
      return intf.parseTransaction({ data, value });
    } catch {
      return undefined;
    }
  }, [fourBytesEntry, data, value]);

  return txDesc;
};
