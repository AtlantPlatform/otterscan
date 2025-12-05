import { FC, memo, useEffect, useState } from "react";
import { createRuntime, OtterscanRuntime, RuntimeContext } from "../useRuntime";
import { ChainInfoContext, populateChainInfo } from "../useChainInfo";
import { loadOtterscanConfig } from "../useConfig";
import PriceBox from "../PriceBox";

/**
 * Client-only PriceBox wrapper.
 * Creates its own runtime since SSR pages don't have RuntimeContext.
 * Shows a placeholder skeleton during loading.
 */
const PriceBoxClient: FC = () => {
  const [mounted, setMounted] = useState(false);
  const [runtime, setRuntime] = useState<OtterscanRuntime | null>(null);

  useEffect(() => {
    setMounted(true);

    let cancelled = false;

    const initRuntime = async () => {
      try {
        const config = loadOtterscanConfig();
        const rt = await populateChainInfo(createRuntime(config));
        if (!cancelled) {
          setRuntime(rt);
        }
      } catch (err) {
        console.error("Failed to initialize runtime for PriceBox:", err);
      }
    };

    initRuntime();

    return () => {
      cancelled = true;
    };
  }, []);

  // Show placeholder during SSR and loading
  if (!mounted || !runtime) {
    return (
      <div className="flex space-x-2 rounded-lg px-2 py-1 bg-gray-100 font-sans text-xs text-gray-800 animate-pulse">
        <span>ETH: $----.--</span>
        <span>|</span>
        <span className="text-gray-400">-- Gwei</span>
      </div>
    );
  }

  const { config, provider } = runtime;
  const chainId = provider._network?.chainId;

  // Only show for mainnet or if price oracle is configured
  if (chainId !== 1n && !config?.priceOracleInfo?.nativeTokenPrice?.ethUSDOracleAddress) {
    return null;
  }

  return (
    <RuntimeContext.Provider value={runtime}>
      <ChainInfoContext.Provider value={runtime.config.chainInfo}>
        <PriceBox />
      </ChainInfoContext.Provider>
    </RuntimeContext.Provider>
  );
};

export default memo(PriceBoxClient);
