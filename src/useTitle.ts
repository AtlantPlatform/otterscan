import { BlockTag, isHexString } from "ethers";
import { useContext } from "react";
import { RuntimeContext } from "./useRuntime";
import { commify } from "./utils/utils";

/**
 * Set the page title.
 */
export const usePageTitle = (title: string | undefined, exact?: boolean) => {
  const { config } = useContext(RuntimeContext);

  if (title === undefined) {
    return;
  }

  if (exact) {
    document.title = title;

    return;
  }

  const siteName = "Ethscan";
  // const networkTitle = config.branding?.networkTitle
  //   ? `| ${config.branding?.networkTitle} `
  //   : "";
  document.title = `${title} | ${siteName}`;
};

/**
 * Title for main block page.
 */
export const useBlockPageTitle = (blockNumber: BlockTag) => {
  let blockStr = blockNumber;
  if (!isHexString(blockNumber)) {
    blockStr = `#${commify(blockNumber)}`;
  }
  usePageTitle(`Block ${blockStr}`);
};

/**
 * Page title for 1 page of transactions results for a block.
 */
export const useBlockTransactionsPageTitle = (
  blockNumber: number,
  pageNumber: number,
  pageCount: number | undefined,
) => {
  usePageTitle(
    blockNumber === undefined
      ? undefined
      : `Block #${commify(blockNumber)} Txns | Page ${pageNumber}${
          pageCount === undefined ? "" : "/" + pageCount
        }`,
  );
};
