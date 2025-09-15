import { faCube } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FixedNumber, formatEther } from "ethers";
import React, { useContext, useMemo } from "react";
import { useSearchParams } from "react-router";
import { Helmet } from "react-helmet-async";
import BlockLink from "../components/BlockLink";
import StandardFrame from "../components/StandardFrame";
import SimplePageControl from "../search/SimplePageControl";
import { useChainInfo } from "../useChainInfo";
import { ExtendedBlock, readBlock } from "../useErigonHooks";
import { useLatestBlockHeader } from "../useLatestBlock";
import { RuntimeContext } from "../useRuntime";
import { usePageTitle } from "../useTitle";
import { commify } from "../utils/utils";

const ELASTICITY_MULTIPLIER = 2n;
const BLOCKS_PER_PAGE = 30;

const RecentBlocks: React.FC = () => {
  const { provider } = useContext(RuntimeContext);
  const {
    nativeCurrency: { symbol },
  } = useChainInfo();
  
  const [searchParams] = useSearchParams();
  let pageNumber = 1;
  const p = searchParams.get("p");
  if (p) {
    try {
      pageNumber = parseInt(p);
    } catch (err) {}
  }

  const latestBlock = useLatestBlockHeader(provider);
  
  // Calculate which blocks to show based on page
  const [blocks, setBlocks] = React.useState<ExtendedBlock[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const totalBlocks = latestBlock?.number || 0;
  const startBlock = Math.max(0, totalBlocks - (pageNumber - 1) * BLOCKS_PER_PAGE);
  const endBlock = Math.max(0, startBlock - BLOCKS_PER_PAGE + 1);

  React.useEffect(() => {
    if (!latestBlock) return;

    const fetchBlocks = async () => {
      setIsLoading(true);
      const blockPromises = [];
      
      for (let i = startBlock; i >= endBlock; i--) {
        if (i >= 0) {
          blockPromises.push(readBlock(provider, i.toString()));
        }
      }

      const fetchedBlocks = await Promise.all(blockPromises);
      const validBlocks = fetchedBlocks.filter((block): block is ExtendedBlock => block !== null);
      setBlocks(validBlocks);
      setIsLoading(false);
    };

    fetchBlocks();
  }, [provider, latestBlock, startBlock, endBlock]);

  usePageTitle("Recent Blocks");

  const BlockRow: React.FC<{ block: ExtendedBlock }> = ({ block }) => {
    const gasTarget = block.gasLimit / ELASTICITY_MULTIPLIER;
    const burntFees = block?.baseFeePerGas && block.baseFeePerGas * block.gasUsed;
    const netFeeReward = block && block.feeReward - (burntFees ?? 0n);
    const totalReward = block.blockReward + (netFeeReward ?? 0n);

    return (
      <tr>
        <td>
          <BlockLink blockTag={block.number} />
        </td>
        <td
          className={`col-span-2 text-right ${
            block.gasUsed > gasTarget
              ? "text-emerald-500"
              : block.gasUsed < gasTarget
                ? "text-red-500"
                : ""
          }`}
        >
          {commify(block.gasUsed.toString())} (
          {block.gasUsed > gasTarget ? "+" : ""}
          {FixedNumber.fromValue(block.gasUsed)
            .subUnsafe(FixedNumber.fromValue(gasTarget))
            .mulUnsafe(FixedNumber.fromValue(100))
            .divUnsafe(FixedNumber.fromValue(gasTarget))
            .round(2)
            .toUnsafeFloat()}
          %)
        </td>
        <td className="text-right">
          <span>
            {FixedNumber.fromValue(block.baseFeePerGas ?? 0n)
              .divUnsafe(FixedNumber.fromValue(1_000_000_000n))
              .toUnsafeFloat()
              .toFixed(2)}{" "}
            Gwei
          </span>
        </td>
        <td className="col-span-2 text-right">
          {commify(formatEther(totalReward))} {symbol}
        </td>
        <td className="col-span-2 text-right text-orange-500 line-through">
          {commify(formatEther(block.gasUsed * block.baseFeePerGas!))} {symbol}
        </td>
        <td className="text-right text-gray-400" title={new Date(block.timestamp * 1000).toLocaleString()}>
          {new Date(block.timestamp * 1000).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          })}
        </td>
      </tr>
    );
  };

  return (
    <StandardFrame>
      <Helmet>
        <title>Recent Blocks | Ethereum Explorer</title>
        <meta name="description" content="Browse the latest Ethereum blocks with detailed information about gas usage, fees, and rewards." />
      </Helmet>
      
      <div className="px-9 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center space-x-3">
            <FontAwesomeIcon icon={faCube} className="text-gray-500" />
            <span>Recent Blocks</span>
          </h1>
          {!isLoading && (
            <SimplePageControl
              pageNumber={pageNumber}
              pageSize={BLOCKS_PER_PAGE}
              total={totalBlocks}
            />
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading blocks...</div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-scroll">
                <table className="w-full table-auto border-gray-200 px-2 py-2 text-left text-sm [&>*>tr]:items-baseline">
                  <thead>
                    <tr className="bg-gray-100 text-gray-500 [&>th]:truncate [&>th:first-child]:pl-2 [&>th:last-child]:pr-2 [&>th]:px-1 [&>th]:py-2">
                      <th>Block</th>
                      <th className="text-right">Gas used</th>
                      <th className="text-right">Base fee</th>
                      <th className="text-right">Rewards</th>
                      <th className="text-right">Burnt fees</th>
                      <th className="text-right">Date/Time</th>
                    </tr>
                  </thead>
                  <tbody className="[&>tr>td]:truncate [&>tr>td]:px-1 [&>tr>td:first-child]:pl-2 [&>tr>td:last-child]:pr-2 [&>tr>td]:py-3 [&>tr]:border-t [&>tr]:border-gray-200 hover:[&>tr]:bg-skin-table-hover">
                    {blocks.map((block) => (
                      <BlockRow key={block.hash} block={block} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="block sm:hidden space-y-3">
              {blocks.map((block) => {
                const gasTarget = block.gasLimit / ELASTICITY_MULTIPLIER;
                const burntFees = block?.baseFeePerGas && block.baseFeePerGas * block.gasUsed;
                const netFeeReward = block && block.feeReward - (burntFees ?? 0n);
                const totalReward = block.blockReward + (netFeeReward ?? 0n);
                const gasUsedPercent = block.gasLimit ? (Number(block.gasUsed) * 100 / Number(block.gasLimit)).toFixed(2) : "0";
                
                return (
                  <div key={block.hash} className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">Block</span>
                      <BlockLink blockTag={block.number} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Date/Time</span>
                      <span className="text-sm text-gray-800" title={new Date(block.timestamp * 1000).toLocaleString()}>
                        {new Date(block.timestamp * 1000).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Gas Used</span>
                      <div className="text-sm text-right">
                        <div className={`${
                          block.gasUsed > gasTarget
                            ? "text-emerald-500"
                            : block.gasUsed < gasTarget
                              ? "text-red-500"
                              : ""
                        }`}>
                          {commify(block.gasUsed.toString())} ({gasUsedPercent}%)
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Base Fee</span>
                      <span className="text-sm text-gray-800">
                        {(Number(block.baseFeePerGas ?? 0n) / 1_000_000_000).toFixed(2)} Gwei
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Rewards</span>
                      <span className="text-sm text-gray-800">
                        {commify(formatEther(totalReward))} {symbol}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Burnt Fees</span>
                      <span className="text-sm text-orange-500 line-through">
                        {commify(formatEther(block.gasUsed * block.baseFeePerGas!))} {symbol}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {blocks.length > 0 && (
              <div className="flex justify-center mt-6">
                <SimplePageControl
                  pageNumber={pageNumber}
                  pageSize={BLOCKS_PER_PAGE}
                  total={totalBlocks}
                />
              </div>
            )}
          </>
        )}
      </div>
    </StandardFrame>
  );
};

export default RecentBlocks;