import { FC, memo } from "react";
import { NavLink } from "react-router";
import ContentFrame from "../../components/ContentFrame";
import StandardScrollableTable from "../../components/StandardScrollableTable";
import StandardTBody from "../../components/StandardTBody";
import { PAGE_SIZE } from "../../params";
import ResultHeader from "../../search/ResultHeader";
import TransactionItem from "../../search/TransactionItem";
import { totalTransactionsFormatter } from "../../search/messages";
import { useFeeToggler, FeeDisplay } from "../../search/useFeeToggler";
import StandardSelectionBoundary from "../../selection/StandardSelectionBoundary";
import { ProcessedTransaction } from "../../types";
import PendingPage from "../address/PendingPage";
import TransactionLink from "../../components/TransactionLink";
import BlockLink from "../../components/BlockLink";
import MethodName from "../../components/MethodName";
import { formatEther } from "ethers";
import SimplePageControl from "../../search/SimplePageControl";

type BlockTransactionResultsProps = {
  page?: ProcessedTransaction[];
  total: number;
  pageNumber: number;
  isLoading: boolean;
};

const BlockTransactionResults: FC<BlockTransactionResultsProps> = ({
  page,
  total,
  pageNumber,
  isLoading,
}) => {
  const [feeDisplay, feeDisplayToggler] = useFeeToggler();

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
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block">
              <StandardScrollableTable isAuto={true}>
                <ResultHeader
                  feeDisplay={feeDisplay}
                  feeDisplayToggler={feeDisplayToggler}
                />
                {page ? (
                  <StandardSelectionBoundary>
                    <StandardTBody>
                      {page.map((tx) => (
                        <TransactionItem
                          key={tx.hash}
                          tx={tx}
                          feeDisplay={feeDisplay}
                        />
                      ))}
                    </StandardTBody>
                  </StandardSelectionBoundary>
                ) : null}
              </StandardScrollableTable>
            </div>

            {/* Mobile Cards */}
            <div className="block sm:hidden space-y-3">
              {page && page.map((tx) => {
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
                  <div className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {tx.to && <MethodName data={tx.data} to={tx.to} />}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Age</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200" title={formattedTime}>{formattedTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Value</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200">
                    {tx.value && tx.value > 0n ? (
                      <span>{formatEther(tx.value).substring(0, 8)} ETH</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">0 ETH</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Fee</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200">
                    {tx.fee ? (
                      <span>{formatEther(tx.fee).substring(0, 8)} ETH</span>
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
        )}
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
