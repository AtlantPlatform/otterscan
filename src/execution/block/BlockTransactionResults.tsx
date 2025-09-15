import { FC, memo } from "react";
import ContentFrame from "../../components/ContentFrame";
import StandardScrollableTable from "../../components/StandardScrollableTable";
import StandardTBody from "../../components/StandardTBody";
import { PAGE_SIZE } from "../../params";
import ResultHeader from "../../search/ResultHeader";
import SearchResultNavBar from "../../search/SearchResultNavBar";
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
    <ContentFrame isLoading={isLoading}>
      <SearchResultNavBar
        pageNumber={pageNumber}
        pageSize={PAGE_SIZE}
        total={total}
        totalFormatter={totalTransactionsFormatter}
      />
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
      
      {/* Mobile Cards */}
      <div className="block sm:hidden space-y-3">
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
              <div key={tx.hash} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Transaction Hash</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs px-1 py-0.5 rounded ${tx.status === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'}`}>
                        {tx.status === 0 ? 'Failed' : 'Success'}
                      </span>
                      <TransactionLink txHash={tx.hash} fail={tx.status === 0} />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Method</span>
                    <div className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mt-1 inline-block">
                      {tx.to && <MethodName data={tx.data} to={tx.to} />}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Block</span>
                    <div className="mt-1">
                      <BlockLink blockTag={tx.blockNumber} />
                    </div>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">From</span>
                  <div className="font-mono text-sm text-gray-800 dark:text-gray-200 mt-1">
                    {tx.from.substring(0, 10)}...{tx.from.substring(tx.from.length - 8)}
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">To</span>
                  <div className="font-mono text-sm text-gray-800 dark:text-gray-200 mt-1">
                    {tx.to ? `${tx.to.substring(0, 10)}...${tx.to.substring(tx.to.length - 8)}` : 'Contract Creation'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Value</span>
                    <div className="text-sm text-gray-800 dark:text-gray-200 mt-1">
                      {tx.value && tx.value > 0n ? (
                        <span>{formatEther(tx.value)} ETH</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">0 ETH</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {feeDisplay === FeeDisplay.TX_FEE && "Txn Fee"}
                      {feeDisplay === FeeDisplay.TX_FEE_USD && "Txn Fee (USD)"}
                      {feeDisplay === FeeDisplay.GAS_PRICE && "Gas Price"}
                    </span>
                    <div className="text-sm text-gray-800 dark:text-gray-200 mt-1">
                      {tx.fee ? (
                        <span>{formatEther(tx.fee)} ETH</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">-</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Date/Time</span>
                  <div className="text-sm text-gray-800 dark:text-gray-200 mt-1" title={formattedTime}>
                    {formattedTime}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <PendingPage rows={1} cols={1} />
        )}
      </div>
      {page && (
        <SearchResultNavBar
          pageNumber={pageNumber}
          pageSize={PAGE_SIZE}
          total={total}
          totalFormatter={totalTransactionsFormatter}
        />
      )}
    </ContentFrame>
  );
};

export default memo(BlockTransactionResults);
