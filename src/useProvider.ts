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

  // First, create a temporary provider to detect the network
  const tempProvider = new JsonRpcProvider(rpcURL);
  const network = await tempProvider.getNetwork();
  tempProvider.destroy();

  // Now create the actual provider with the detected network
  let provider: JsonRpcApiProvider;
  if (rpcURL?.startsWith("ws://") || rpcURL?.startsWith("wss://")) {
    provider = new WebSocketProvider(rpcURL, network, {
      staticNetwork: network,
    });
  } else {
    // Batching takes place by default
    provider = new JsonRpcProvider(rpcURL, network, {
      staticNetwork: network,
    });
  }

  return provider;
};
