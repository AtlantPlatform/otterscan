import { faCube } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, memo } from "react";
import { NavLink } from "react-router";
import { PAGE_SIZE } from "../../params";
import { ProcessedTransaction } from "../../types";
import { formatEther } from "ethers";
import SimplePageControl from "../../search/SimplePageControl";
import { extract4Bytes } from "../../use4Bytes";

type BlockTransactionResultsProps = {
  page?: ProcessedTransaction[];
  total: number;
  pageNumber: number;
  isLoading: boolean;
};

// Default symbol for display
const DEFAULT_SYMBOL = "ETH";

const BlockTransactionResults: FC<BlockTransactionResultsProps> = ({
  page,
  total,
  pageNumber,
  isLoading,
}) => {
  const symbol = DEFAULT_SYMBOL;

  return (
    <>
      {/* Pagination Control - Top */}
      {!isLoading && total > PAGE_SIZE && (
        <div className="flex justify-between items-center mb-4 px-3 lg:px-9">
          <div className="text-sm text-gray-600">
            Showing {((pageNumber - 1) * PAGE_SIZE) + 1} to {Math.min(pageNumber * PAGE_SIZE, total)} of {total} transactions
          </div>
          <SimplePageControl
            pageNumber={pageNumber}
            pageSize={PAGE_SIZE}
            total={total}
          />
        </div>
      )}

      <div className="px-3 lg:px-9">
        {isLoading ? (
          <>
            {/* Desktop Skeleton */}
            <div className="hidden sm:block bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-scroll">
                <table className="w-full table-auto border-gray-200 px-2 py-2 text-left text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-500 [&>th]:truncate [&>th:first-child]:pl-2 [&>th:last-child]:pr-2 [&>th]:px-1 [&>th]:py-2">
                      <th>Transaction</th>
                      <th>Method</th>
                      <th className="w-28">Block</th>
                      <th className="w-36">Date/Time</th>
                      <th>Value</th>
                      <th>Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(PAGE_SIZE)].map((_, i) => (
                      <tr key={i} className="border-t border-gray-200">
                        <td className="px-1 py-3 pl-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                        </td>
                        <td className="px-1 py-3">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                        </td>
                        <td className="px-1 py-3">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
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
            </div>

            {/* Mobile Skeleton */}
            <div className="block sm:hidden space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                </div>
              ))}
            </div>
          </>
        ) : page && page.length > 0 ? (
          <>
            {/* Desktop Table - matching RecentTransactionsRest style */}
            <div className="hidden sm:block">
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="overflow-x-scroll">
                  <table className="w-full table-auto border-gray-200 px-2 py-2 text-left text-sm [&>*>tr]:items-baseline">
                    <thead>
                      <tr className="bg-gray-100 text-gray-500 [&>th]:truncate [&>th:first-child]:pl-2 [&>th:last-child]:pr-2 [&>th]:px-1 [&>th]:py-2">
                        <th>Transaction</th>
                        <th>Method</th>
                        <th className="w-28">Block</th>
                        <th className="w-36">Date/Time</th>
                        <th>Value</th>
                        <th>Fee</th>
                      </tr>
                    </thead>
                    <tbody className="[&>tr>td]:truncate [&>tr>td]:px-1 [&>tr>td:first-child]:pl-2 [&>tr>td:last-child]:pr-2 [&>tr>td]:py-3 [&>tr]:border-t [&>tr]:border-gray-200">
                      {page.map((tx) => {
                        const valueBigInt = tx.value ?? 0n;
                        const feeBigInt = tx.fee ?? 0n;
                        const fourBytes = extract4Bytes(tx.data);
                        const isSimpleTransfer = tx.data === "0x";
                        const methodLabel = isSimpleTransfer ? "transfer" : (fourBytes ?? "-");

                        return (
                          <tr key={tx.hash}>
                            <td className="max-w-[14.5rem]">
                              <NavLink
                                to={`/tx/${tx.hash}`}
                                className={`flex items-baseline space-x-1 font-hash text-link-blue hover:text-link-blue-hover ${tx.status === 0 ? 'line-through opacity-70' : ''}`}
                              >
                                <span className="truncate">{tx.hash}</span>
                              </NavLink>
                            </td>
                            <td className="min-w-32 max-w-32">
                              <div className="method-badge flex min-h-full max-w-max items-baseline rounded-lg px-3 py-1 text-xs">
                                <p className="truncate">{methodLabel}</p>
                              </div>
                            </td>
                            <td className="max-w-28">
                              <NavLink
                                to={`/block/${tx.blockNumber}`}
                                className="flex items-baseline space-x-1 text-link-blue hover:text-link-blue-hover font-blocknum whitespace-nowrap"
                              >
                                <span className="text-orange-500">
                                  <FontAwesomeIcon className="self-center" icon={faCube} size="1x" />
                                </span>
                                <span>{tx.blockNumber.toLocaleString()}</span>
                              </NavLink>
                            </td>
                            <td className="min-w-36 max-w-36 text-gray-600" title={new Date(tx.timestamp * 1000).toLocaleString()}>
                              {new Date(tx.timestamp * 1000).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false
                              })}
                            </td>
                            <td className="min-w-48 max-w-48">
                              {valueBigInt > 0n ? (
                                <span>{formatEther(valueBigInt).substring(0, 10)} {symbol}</span>
                              ) : (
                                <span className="text-gray-400">0 {symbol}</span>
                              )}
                            </td>
                            <td className="min-w-16 max-w-28">
                              <span className="truncate font-balance text-xs text-gray-500">
                                {feeBigInt > 0n ? formatEther(feeBigInt).substring(0, 10) : "-"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="block sm:hidden space-y-3">
              {page.map((tx) => {
                const timestamp = new Date(tx.timestamp * 1000);
                const formattedTime = timestamp.toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                });
                const valueBigInt = tx.value ?? 0n;
                const feeBigInt = tx.fee ?? 0n;
                const fourBytes = extract4Bytes(tx.data);
                const isSimpleTransfer = tx.data === "0x";
                const methodLabel = isSimpleTransfer ? "transfer" : (fourBytes ?? "-");

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
                        className="text-sm text-blue-600 dark:text-blue-400 font-mono hover:text-blue-800 dark:hover:text-blue-300 break-all max-w-[60%]"
                      >
                        {tx.hash}
                      </NavLink>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Method</span>
                      <div className="method-badge text-xs px-2 py-1 rounded">
                        {methodLabel}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Block</span>
                      <NavLink
                        to={`/block/${tx.blockNumber}`}
                        className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        <span className="text-orange-500">
                          <FontAwesomeIcon icon={faCube} size="sm" />
                        </span>
                        <span>{tx.blockNumber.toLocaleString()}</span>
                      </NavLink>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Date/Time</span>
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
          </>
        ) : null}
      </div>

      {/* Pagination Control - Bottom */}
      {!isLoading && total > PAGE_SIZE && (
        <div className="flex justify-center mt-6 px-3 lg:px-9">
          <SimplePageControl
            pageNumber={pageNumber}
            pageSize={PAGE_SIZE}
            total={total}
          />
        </div>
      )}
    </>
  );
};

export default memo(BlockTransactionResults);
