import { JsonRpcApiProvider, JsonRpcProvider, WebSocketProvider } from "ethers";
import { ProbeError } from "./ProbeError";
import { MIN_API_LEVEL } from "./params";
import { ConnectionStatus } from "./types";

export const DEFAULT_RPC_URL = "http://127.0.0.1:8545";

export const createAndProbeProvider = async (
  rpcURL?: string,
): Promise<JsonRpcApiProvider> => {
  if (rpcURL !== undefined) {
    if (rpcURL === "") {
      console.info(`Using default API URL: ${DEFAULT_RPC_URL}`);
      rpcURL = DEFAULT_RPC_URL;
    } else {
      console.log(`Using configured API URL: ${rpcURL}`);
    }
  }

  if (rpcURL === undefined) {
    throw new ProbeError(ConnectionStatus.NOT_ETH_NODE, "");
  }

  // Convert relative URLs to absolute URLs for ethers.js
  // ethers.js doesn't support relative URLs, so we need to prepend the origin
  if (rpcURL.startsWith("/")) {
    const absoluteURL = `${window.location.origin}${rpcURL}`;
    console.log(`Converting relative URL to absolute: ${absoluteURL}`);
    rpcURL = absoluteURL;
  }

  let provider: JsonRpcApiProvider;
  if (rpcURL?.startsWith("ws://") || rpcURL?.startsWith("wss://")) {
    provider = new WebSocketProvider(rpcURL, undefined, {
      staticNetwork: true,
    });
  } else {
    // Batching takes place by default
    provider = new JsonRpcProvider(rpcURL, undefined, {
      staticNetwork: true,
    });
  }

  // Check if it is at least a regular ETH node
  const probeBlockNumber = provider.getBlockNumber();
  const probeHeader1 = provider.send("erigon_getHeaderByNumber", ["latest"]);
  const probeOtsAPI = provider.send("ots_getApiLevel", []).then((level) => {
    if (level < MIN_API_LEVEL) {
      throw new ProbeError(ConnectionStatus.NOT_OTTERSCAN_PATCHED, rpcURL);
    }
  });
  // Wait for the `eth_chainId` call ethers internally makes so provider._network
  // is available to components
  const getNetwork = provider.getNetwork();

  try {
    await Promise.all([
      probeBlockNumber,
      probeHeader1,
      probeOtsAPI,
      getNetwork,
    ]);
    return provider;
  } catch (err) {
    // If any was rejected, then check them sequentially in order to
    // narrow the error cause, but we need to await them individually
    // because we don't know if all of them have been finished

    try {
      await probeBlockNumber;
    } catch (err) {
      console.log(err);
      throw new ProbeError(ConnectionStatus.NOT_ETH_NODE, rpcURL);
    }

    // Check if it is an Erigon node by probing a lightweight method
    try {
      // Get header for block 1
      await probeHeader1;
    } catch (err) {
      console.log(err);
      throw new ProbeError(ConnectionStatus.NOT_ERIGON, rpcURL);
    }

    // Check if it has Otterscan patches by probing a lightweight method
    try {
      await probeOtsAPI;
    } catch (err) {
      console.log(err);
      throw new ProbeError(ConnectionStatus.NOT_OTTERSCAN_PATCHED, rpcURL);
    }

    throw new Error("Must not happen", { cause: err });
  }
};
