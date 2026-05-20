import { faAngleRight, faCheckCircle, faExchangeAlt, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { formatEther } from "ethers";
import React from "react";
import { NavLink } from "react-router";
import { useRecentTransactions } from "../api/useRestTransactions";
import { commify } from "../utils/utils";
import { useTimezone } from "../useTimezone";
import { formatTimestamp } from "../utils/timestamp";
import MethodName from "./MethodName";

/**
 * SSR-safe version of RecentTransactionsSection.
 * Does not use RuntimeContext or ChainInfoContext.
 * Uses hardcoded ETH symbol for display (works for most chains).
 */
const RecentTransactionsSectionSSR: React.FC = () => {
  const { transactions: recentTransactions, isLoading } = useRecentTransactions(5);
  const timeZone = useTimezone();
  const symbol = "ETH"; // Default symbol for SSR

  // Truncate hash for display
  const truncateHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  if (isLoading || recentTransactions.length === 0) {
    return (
      <div className="bg-white sm:rounded-lg sm:shadow-md overflow-hidden">
        <div className="flex items-center mb-4 px-3 lg:px-9 sm:px-6 pt-6">
          <h2 className="text-lg font-semibold flex items-center space-x-2">
            <FontAwesomeIcon icon={faExchangeAlt} className="text-gray-500" />
            <span>Latest Transactions</span>
          </h2>
        </div>

        {/* Desktop Skeleton */}
        <div className="hidden sm:block overflow-x-scroll px-6 pb-6">
          <table className="w-full table-auto border-gray-200 px-2 py-2 text-left text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-500 [&>th]:truncate [&>th:first-child]:pl-2 [&>th:last-child]:pr-2 [&>th]:px-1 [&>th]:py-2">
                <th>Transaction</th>
                <th>Method</th>
                <th className="w-36">Age</th>
                <th>Value</th>
                <th>Fee</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-t border-gray-200">
                  <td className="px-1 py-3 pl-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                  </td>
                  <td className="px-1 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                  </td>
                  <td className="px-1 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  </td>
                  <td className="px-1 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                  </td>
                  <td className="px-1 py-3 pr-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
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
          <FontAwesomeIcon icon={faExchangeAlt} className="text-gray-500" />
          <span>Latest Transactions</span>
        </h2>
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-scroll px-6 pb-6">
        <table className="w-full table-auto border-gray-200 px-2 py-2 text-left text-sm [&>*>tr]:items-baseline">
          <thead>
            <tr className="bg-gray-100 text-gray-500 [&>th]:truncate [&>th:first-child]:pl-2 [&>th:last-child]:pr-2 [&>th]:px-1 [&>th]:py-2">
              <th>Transaction</th>
              <th>Method</th>
              <th className="w-36">Age</th>
              <th>Value</th>
              <th>Fee</th>
            </tr>
          </thead>
          <tbody className="[&>tr>td]:truncate [&>tr>td]:px-1 [&>tr>td:first-child]:pl-2 [&>tr>td:last-child]:pr-2 [&>tr>td]:py-3 [&>tr]:border-t [&>tr]:border-gray-200">
            {recentTransactions.map((tx) => {
              const formattedTime = formatTimestamp(tx.timestamp, timeZone);

              const valueBigInt = BigInt(tx.value);
              const feeBigInt = BigInt(tx.fee);

              return (
                <tr key={tx.hash}>
                  <td>
                    <div className="flex items-center space-x-2">
                      <FontAwesomeIcon
                        icon={tx.status === 0 ? faTimesCircle : faCheckCircle}
                        className={`text-xs ${tx.status === 0 ? 'text-red-500' : 'text-green-500'}`}
                        title={tx.status === 0 ? 'Failed' : 'Success'}
                      />
                      <NavLink
                        to={`/tx/${tx.hash}`}
                        className="text-blue-600 hover:text-blue-800 font-mono"
                      >
                        {tx.hash}
                      </NavLink>
                    </div>
                  </td>
                  <td>
                    <MethodName data={tx.data} to={tx.to} />
                  </td>
                  <td className="text-gray-600" title={formattedTime}>
                    {formattedTime}
                  </td>
                  <td>
                    {valueBigInt > 0n ? (
                      <span>{formatEther(valueBigInt).substring(0, 8)} {symbol}</span>
                    ) : (
                      <span className="text-gray-400">0 {symbol}</span>
                    )}
                  </td>
                  <td className="text-gray-600">
                    {feeBigInt > 0n ? (
                      <span className="text-xs">
                        {formatEther(feeBigInt).substring(0, 8)} {symbol}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="block sm:hidden space-y-3 px-3">
        {recentTransactions.map((tx) => {
          const formattedTime = formatTimestamp(tx.timestamp, timeZone);

          const valueBigInt = BigInt(tx.value);
          const feeBigInt = BigInt(tx.fee);

          return (
            <div key={tx.hash} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-3 min-w-0">
              <div className="flex justify-between items-start">
                <div className="flex flex-col space-y-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Transaction</span>
                  <span className={`text-xs px-1 py-0.5 rounded self-start ${
                    tx.status === 0
                      ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  }`}>
                    {tx.status === 0 ? 'Failed' : 'Success'}
                  </span>
                </div>
                <NavLink
                  to={`/tx/${tx.hash}`}
                  className="text-sm text-blue-600 dark:text-blue-400 font-mono hover:text-blue-800 dark:hover:text-blue-300"
                  title={tx.hash}
                >
                  {truncateHash(tx.hash)}
                </NavLink>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Method</span>
                <MethodName data={tx.data} to={tx.to} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Age</span>
                <span className="text-sm text-gray-800 dark:text-gray-200" title={formattedTime}>{formattedTime}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Value</span>
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  {valueBigInt > 0n ? (
                    <span>{formatEther(valueBigInt).substring(0, 8)} {symbol}</span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-600">0 {symbol}</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Fee</span>
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  {feeBigInt > 0n ? (
                    <span>{formatEther(feeBigInt).substring(0, 8)} {symbol}</span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-600">-</span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* View More Button at Bottom */}
      <div className="flex justify-center mt-4 px-3 lg:px-9 sm:px-6 pb-6">
        <NavLink
          to="/tx/recent"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1 px-4 py-2 border border-blue-600 rounded"
        >
          <span>View more transactions</span>
          <FontAwesomeIcon icon={faAngleRight} className="text-xs" />
        </NavLink>
      </div>
    </div>
  );
};

export default RecentTransactionsSectionSSR;
