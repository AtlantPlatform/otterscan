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
      <div className="px-3 lg:px-9">
        <ContentFrame isLoading={isLoading} marginSize="none">
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
          ) : (
            <PendingPage rows={1} cols={8} />
          )}
        </StandardScrollableTable>
      </div>
      
        </ContentFrame>
      </div>

      {/* Mobile Cards */}
      <div className="block sm:hidden space-y-3 px-3">
        {page ? (
          page.map((tx) => {
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
          })
        ) : (
          <PendingPage rows={1} cols={1} />
        )}
      </div>
    </>
  );
};

export default memo(BlockTransactionResults);
