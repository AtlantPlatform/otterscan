import {
  faFaucetDrip,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useMemo } from "react";
import { useLocation } from "react-router";
import { Helmet } from "react-helmet-async";
import ContentFrame from "./components/ContentFrame";
import ExternalLink from "./components/ExternalLink";
import StandardFrame from "./components/StandardFrame";
import StandardSubtitle from "./components/StandardSubtitle";
import { useChainInfo } from "./useChainInfo";

// URL displayed to the user as the source of the faucet information
const faucetSourceUrl = "https://github.com/ethereum-lists/chains";

const Faucets: React.FC = () => {
  const { faucets } = useChainInfo();
  const loc = useLocation();
  const urls = useMemo(() => {
    const s = new URLSearchParams(loc.search);
    const address = s.get("address");

    const _urls: string[] = faucets.map((u) =>
      // eslint-disable-next-line no-template-curly-in-string
      address !== null ? u.replaceAll("${ADDRESS}", address) : u,
    );

    // Shuffle faucets to avoid UI bias
    for (let i = _urls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [_urls[i], _urls[j]] = [_urls[j], _urls[i]];
    }

    return _urls;
  }, [faucets, loc]);

  return (
    <StandardFrame>
      <Helmet>
        <title>Ethereum Testnet Faucets | Ethscan</title>
        <meta name="description" content="Find Ethereum testnet faucets to get free test ETH for development and testing purposes." />
        <link rel="canonical" href="https://ethscan.org/faucets" />

        {/* Open Graph meta tags */}
        <meta property="og:title" content="Ethereum Blockchain Explorer: find any Ethereum transaction | Ethscan" />
        <meta property="og:description" content="The most trusted and popular Ethereum (ETH) blockchain explorer and crypto transaction search" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ethscan.org/faucets" />
        <meta property="og:image" content="https://ethscan.org/ethscan-social-preview.jpeg" />
        <meta property="og:image:width" content="1280" />
        <meta property="og:image:height" content="640" />
        <meta property="og:site_name" content="Ethscan" />

        {/* Twitter Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Ethereum Blockchain Explorer: find any Ethereum transaction | Ethscan" />
        <meta name="twitter:description" content="The most trusted and popular Ethereum (ETH) blockchain explorer and crypto transaction search" />
        <meta name="twitter:image" content="https://ethscan.org/ethscan-social-preview.jpeg" />
        <meta name="twitter:site" content="@ethscan" />
      </Helmet>
      <StandardSubtitle>Faucets</StandardSubtitle>
      <ContentFrame>
        <div className="space-y-3 py-4">
          {urls.length > 0 && (
            <div className="flex items-baseline space-x-2 rounded bg-amber-200 px-2 py-1 font-bold text-red-800 underline">
              <FontAwesomeIcon
                className="self-center"
                icon={faTriangleExclamation}
                size="1x"
              />
              <span>
                The following external links come from{" "}
                <ExternalLink href={faucetSourceUrl}>
                  <span className="underline">{faucetSourceUrl}</span>
                </ExternalLink>{" "}
                and are *NOT* endorsed by us. Use at your own risk.
              </span>
            </div>
          )}
          {/* Display the shuffling notice only if there are 1+ faucets */}
          {urls.length > 1 && (
            <div className="flex items-baseline space-x-2 rounded bg-amber-200 px-2 py-1 text-amber-700">
              <FontAwesomeIcon
                className="self-center"
                icon={faTriangleExclamation}
                size="1x"
              />
              <span>The faucet links below are shuffled on page load.</span>
            </div>
          )}
          {urls.length > 0 ? (
            <div className="space-y-3 pt-2">
              {urls.map((url) => (
                <div className="flex items-baseline space-x-2">
                  <FontAwesomeIcon
                    className="text-gray-400"
                    icon={faFaucetDrip}
                    size="1x"
                  />
                  <ExternalLink key={url} href={url}>
                    <span>{url}</span>
                  </ExternalLink>
                </div>
              ))}
            </div>
          ) : (
            <div>There are no registered faucets.</div>
          )}
        </div>
      </ContentFrame>
    </StandardFrame>
  );
};

export default Faucets;
