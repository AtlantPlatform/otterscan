import { FC, Suspense, lazy, useState, useEffect, useMemo } from "react";
import { useParams } from "react-router";
import { Helmet } from "react-helmet-async";
import { formatEther } from "ethers";
import HeaderSSR from "../components/HeaderSSR";
import StandardFrame from "../components/StandardFrame";
import ClientOnly from "../components/ClientOnly";
import { useSingleAddress } from "../api/useRestAddresses";
import { commify } from "../utils/utils";
import { SourcifySource } from "../sourcify/useSourcify";
import { AppConfig, AppConfigContext } from "../useAppConfig";
import { ChainInfoContext, populateChainInfo } from "../useChainInfo";
import { loadOtterscanConfig } from "../useConfig";
import { createRuntime, RuntimeContext, OtterscanRuntime } from "../useRuntime";

// Lazy load the full Address component for client-side
const AddressMainPage = lazy(() => import("./AddressMainPage"));

/**
 * SSR loading skeleton for address page
 */
const AddressLoadingSkeleton: FC = () => (
  <div className="py-6 max-w-7xl mx-auto">
    <div className="px-3 lg:px-9">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
    <div className="mx-3 lg:mx-9 mt-4">
      <div className="bg-white rounded-lg border p-4 animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  </div>
);

/**
 * AppConfig provider for the address page
 */
const AddressAppConfigProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sourcifySource, setSourcifySource] = useState<SourcifySource>(
    SourcifySource.CENTRAL_SERVER,
  );
  const appConfig = useMemo((): AppConfig => ({
    sourcifySource,
    setSourcifySource,
  }), [sourcifySource, setSourcifySource]);

  return (
    <AppConfigContext.Provider value={appConfig}>
      {children}
    </AppConfigContext.Provider>
  );
};

/**
 * RuntimeProvider for the address page.
 * Loads config and creates runtime on the client side.
 */
const AddressRuntimeProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [runtime, setRuntime] = useState<OtterscanRuntime | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const initRuntime = async () => {
      try {
        const config = loadOtterscanConfig();
        const rt = await populateChainInfo(createRuntime(config));
        if (!cancelled) {
          setRuntime(rt);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    initRuntime();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="py-6 max-w-7xl mx-auto px-3 lg:px-9">
        <div className="p-4 text-red-500 bg-red-50 rounded-lg">
          Error loading application: {error.message}
        </div>
      </div>
    );
  }

  if (!runtime) {
    return <AddressLoadingSkeleton />;
  }

  return (
    <RuntimeContext.Provider value={runtime}>
      <ChainInfoContext.Provider value={runtime.config.chainInfo}>
        {children}
      </ChainInfoContext.Provider>
    </RuntimeContext.Provider>
  );
};

/**
 * SSR-safe Address page component.
 * - During SSR: Shows SEO metadata + loading skeleton
 * - After hydration: Loads full AddressMainPage with transactions
 */
const AddressSSR: FC = () => {
  const { addressOrName } = useParams();
  const { address: addressData } = useSingleAddress(addressOrName);

  if (!addressOrName) {
    return (
      <div className="min-h-screen overflow-x-hidden">
        <HeaderSSR />
        <StandardFrame>
          <div className="py-6 max-w-7xl mx-auto px-3 lg:px-9">
            <div className="py-4 text-sm">Address is required.</div>
          </div>
        </StandardFrame>
      </div>
    );
  }

  const balance = addressData?.balance ? BigInt(addressData.balance) : 0n;
  const formattedBalance = formatEther(balance);
  const isContract = addressData?.isContract ?? false;
  const txCount = addressData?.transactionCount ?? 0;

  const description = `View Ethereum address ${addressOrName} details including current balance${addressData ? ` (${formattedBalance} ETH)` : ''}, transaction history, token holdings, and ${isContract ? 'smart contract information' : 'account activity'}.`;

  const payloadSchemaWebPage = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": `https://ethscan.org/address/${addressOrName}`,
    "name": `Ethereum Address ${addressOrName.substring(0, 10)}...`,
    "description": description,
    "mainEntity": {
      "@type": "DigitalDocument",
      "identifier": addressOrName,
      "name": `Ethereum Address`,
      "description": addressData
        ? `Ethereum ${isContract ? 'contract' : 'account'} with balance of ${formattedBalance} ETH`
        : 'Ethereum blockchain address',
    }
  });

  const payloadSchemaFaqPage = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is an Ethereum address?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "An Ethereum address is a unique 42-character hexadecimal identifier (starting with '0x') used to send and receive ETH and interact with smart contracts on the Ethereum blockchain."
        }
      },
      {
        "@type": "Question",
        "name": "How can I check the balance of an Ethereum address?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can view the balance of any Ethereum address on Ethscan by entering the address in the search bar. The balance shows the amount of ETH held by the address."
        }
      },
      {
        "@type": "Question",
        "name": "What is the difference between an EOA and a smart contract?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "An Externally Owned Account (EOA) is controlled by a private key and can initiate transactions. A smart contract is code deployed on the blockchain that executes automatically when triggered by transactions."
        }
      }
    ]
  });

  return (
    <>
      {/* SEO metadata - rendered during SSR */}
      <Helmet>
        <title>Address {addressOrName} | Ethscan</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://ethscan.org/address/${addressOrName}`} />
        <script type="application/ld+json">{payloadSchemaWebPage}</script>
        <script type="application/ld+json">{payloadSchemaFaqPage}</script>
      </Helmet>

      {/* Client-side: Full AddressMainPage with RuntimeProvider */}
      <ClientOnly
        fallback={
          <div className="min-h-screen overflow-x-hidden">
            <HeaderSSR />
            <StandardFrame>
              <AddressLoadingSkeleton />
              {/* SSR-safe SEO content */}
              {addressData && (
                <div className="px-3 lg:px-9 py-6 max-w-7xl mx-auto">
                  <div className="p-4">
                    <h2 className="text-lg font-semibold mb-2 text-gray-900">Address Summary</h2>
                    <p className="text-sm text-gray-700">
                      This Ethereum address ({addressOrName}) has a balance of {formattedBalance} ETH
                      and is {isContract ? 'a smart contract' : 'an externally owned account (EOA)'}.
                      {txCount > 0 && ` The address has been involved in ${commify(txCount.toString())} transactions.`}
                    </p>
                  </div>

                  {/* FAQ Section for SEO */}
                  <div className="mt-8 space-y-6">
                    <div className="prose prose-sm max-w-none text-gray-700">
                      <h2 className="text-2xl font-bold mb-4 text-gray-900">Frequently Asked Questions</h2>
                      <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900">What is an Ethereum address?</h3>
                      <p>An Ethereum address is a unique 42-character hexadecimal identifier (starting with '0x') used to send and receive ETH and interact with smart contracts on the Ethereum blockchain.</p>
                      <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900">How can I check the balance of an Ethereum address?</h3>
                      <p>You can view the balance of any Ethereum address on Ethscan by entering the address in the search bar. The balance shows the amount of ETH held by the address.</p>
                    </div>
                  </div>
                </div>
              )}
            </StandardFrame>
          </div>
        }
      >
        <AddressAppConfigProvider>
          <Suspense fallback={
            <div className="min-h-screen overflow-x-hidden">
              <HeaderSSR />
              <StandardFrame>
                <AddressLoadingSkeleton />
              </StandardFrame>
            </div>
          }>
            <AddressRuntimeProvider>
              <AddressMainPage />
            </AddressRuntimeProvider>
          </Suspense>
        </AddressAppConfigProvider>
      </ClientOnly>
    </>
  );
};

export default AddressSSR;
