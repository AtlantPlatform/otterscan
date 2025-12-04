import { faAngleRight, faCube } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { NavLink } from "react-router";
import { useRecentBlocks } from "../api/useRestBlocks";
import { commify } from "../utils/utils";

/**
 * SSR-safe version of RecentBlocksSection.
 * Does not use RuntimeContext or DecoratedAddressLink.
 * Renders miner addresses as simple truncated strings.
 */
const RecentBlocksSectionSSR: React.FC = () => {
  const { blocks: recentBlocks, isLoading } = useRecentBlocks(5);

  // Truncate address for display
  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading || recentBlocks.length === 0) {
    return (
      <div className="bg-white sm:rounded-lg sm:shadow-md overflow-hidden">
        <div className="flex items-center mb-4 px-3 lg:px-9 sm:px-6 pt-6">
          <h2 className="text-lg font-semibold flex items-center space-x-2">
            <FontAwesomeIcon icon={faCube} className="text-gray-500" />
            <span>Latest Blocks</span>
          </h2>
        </div>

        {/* Desktop Skeleton */}
        <div className="hidden sm:block overflow-x-scroll px-6 pb-6">
          <table className="w-full table-auto border-gray-200 px-2 py-2 text-left text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-500 [&>th]:truncate [&>th:first-child]:pl-2 [&>th:last-child]:pr-2 [&>th]:px-1 [&>th]:py-2">
                <th>Block</th>
                <th className="w-36">Age</th>
                <th>Txns</th>
                <th>Miner</th>
                <th>Gas Used</th>
                <th>Gas Limit</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-t border-gray-200">
                  <td className="px-1 py-3 pl-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                  </td>
                  <td className="px-1 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  </td>
                  <td className="px-1 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-12"></div>
                  </td>
                  <td className="px-1 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                  </td>
                  <td className="px-1 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  </td>
                  <td className="px-1 py-3 pr-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Skeleton */}
        <div className="block sm:hidden space-y-3 px-3 pb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
            </div>
          ))}
        </div>

        {/* View More Button */}
        <div className="flex justify-center mt-4 px-3 lg:px-9 sm:px-6 pb-6">
          <div className="h-10 bg-gray-200 rounded animate-pulse w-48"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white sm:rounded-lg sm:shadow-md overflow-hidden">
      <div className="flex items-center mb-4 px-3 lg:px-9 sm:px-6 pt-6">
        <h2 className="text-lg font-semibold flex items-center space-x-2">
          <FontAwesomeIcon icon={faCube} className="text-gray-500" />
          <span>Latest Blocks</span>
        </h2>
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-scroll px-6 pb-6">
        <table className="w-full table-auto border-gray-200 px-2 py-2 text-left text-sm [&>*>tr]:items-baseline">
          <thead>
            <tr className="bg-gray-100 text-gray-500 [&>th]:truncate [&>th:first-child]:pl-2 [&>th:last-child]:pr-2 [&>th]:px-1 [&>th]:py-2">
              <th>Block</th>
              <th className="w-36">Age</th>
              <th>Txns</th>
              <th>Miner</th>
              <th>Gas Used</th>
              <th>Gas Limit</th>
            </tr>
          </thead>
          <tbody className="[&>tr>td]:truncate [&>tr>td]:px-1 [&>tr>td:first-child]:pl-2 [&>tr>td:last-child]:pr-2 [&>tr>td]:py-3 [&>tr]:border-t [&>tr]:border-gray-200">
            {recentBlocks.map((block) => {
              const gasUsedPercent = block.gasLimit ? (block.gasUsed * 100 / block.gasLimit).toFixed(2) : "0";
              const timestamp = new Date(block.timestamp * 1000);
              const formattedTime = timestamp.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              });

              return (
                <tr key={block.hash}>
                  <td>
                    <NavLink
                      to={`/block/${block.number}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {commify(block.number)}
                    </NavLink>
                  </td>
                  <td className="text-gray-600" title={formattedTime}>
                    {formattedTime}
                  </td>
                  <td>
                    <NavLink
                      to={`/block/${block.number}/txs`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {commify(block.transactionCount)}
                    </NavLink>
                  </td>
                  <td>
                    <NavLink
                      to={`/address/${block.miner}`}
                      className="text-blue-600 hover:text-blue-800 font-mono text-xs"
                      title={block.miner}
                    >
                      {truncateAddress(block.miner)}
                    </NavLink>
                  </td>
                  <td>
                    <div className="flex items-center space-x-1">
                      <span>{commify(block.gasUsed.toString())}</span>
                      <span className="text-xs text-gray-500">({gasUsedPercent}%)</span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-600">
                    {commify(block.gasLimit.toString())}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="block sm:hidden space-y-3 px-3">
        {recentBlocks.map((block) => {
          const gasUsedPercent = block.gasLimit ? (block.gasUsed * 100 / block.gasLimit).toFixed(2) : "0";
          const gasTarget = block.gasLimit / 2;
          const timestamp = new Date(block.timestamp * 1000);
          const formattedTime = timestamp.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });

          return (
            <div key={block.hash} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-3 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Block</span>
                <NavLink
                  to={`/block/${block.number}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {commify(block.number)}
                </NavLink>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Date/Time</span>
                <span className="text-sm text-gray-800 dark:text-gray-200" title={formattedTime}>{formattedTime}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Txns</span>
                <NavLink
                  to={`/block/${block.number}/txs`}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  {commify(block.transactionCount)}
                </NavLink>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Gas Used</span>
                <div className="text-sm text-right min-w-0">
                  <div className={`break-words ${
                    block.gasUsed > gasTarget
                      ? "text-emerald-500"
                      : block.gasUsed < gasTarget
                        ? "text-red-500"
                        : "text-gray-800 dark:text-gray-200"
                  }`}>
                    {commify(block.gasUsed.toString())} ({gasUsedPercent}%)
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Base Fee</span>
                <span className="text-sm text-gray-800 dark:text-gray-200 break-words min-w-0">
                  {block.baseFeePerGas ? (block.baseFeePerGas / 1_000_000_000).toFixed(2) : '0'} Gwei
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* View More Button at Bottom */}
      <div className="flex justify-center mt-4 px-3 lg:px-9 sm:px-6 pb-6">
        <NavLink
          to="/blocks/recent"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1 px-4 py-2 border border-blue-600 rounded"
        >
          <span>View more blocks</span>
          <FontAwesomeIcon icon={faAngleRight} className="text-xs" />
        </NavLink>
      </div>
    </div>
  );
};

export default RecentBlocksSectionSSR;
