import { faAngleRight, faCheckCircle, faExchangeAlt, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { formatEther } from "ethers";
import React, { useContext } from "react";
import { NavLink } from "react-router";
import { useChainInfo } from "../useChainInfo";
import { useRecentTransactionsStatic } from "../useRecentData";
import { RuntimeContext } from "../useRuntime";
import { commify } from "../utils/utils";
import MethodName from "./MethodName";
import TransactionLink from "./TransactionLink";

const RecentTransactionsSection: React.FC = () => {
  const { provider } = useContext(RuntimeContext);
  const recentTransactions = useRecentTransactionsStatic(provider, 5);
  const {
    nativeCurrency: { symbol },
  } = useChainInfo();

  if (recentTransactions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <FontAwesomeIcon icon={faExchangeAlt} className="text-gray-500" />
          <span>Latest Transactions</span>
        </h2>
        <div className="text-gray-500 text-center py-8">Loading...</div>
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
                <tr key={tx.hash}>
                  <td>
                    <div className="flex items-center space-x-2">
                      <FontAwesomeIcon 
                        icon={tx.status === 0 ? faTimesCircle : faCheckCircle} 
                        className={`text-xs ${tx.status === 0 ? 'text-red-500' : 'text-green-500'}`}
                        title={tx.status === 0 ? 'Failed' : 'Success'}
                      />
                      <TransactionLink
                        txHash={tx.hash}
                        fail={tx.status === 0}
                      />
                    </div>
                  </td>
                  <td>
                    <div className="text-xs bg-gray-100 px-2 py-1 rounded inline-block">
                      {tx.to && <MethodName data={tx.data} to={tx.to} />}
                    </div>
                  </td>
                  <td className="text-gray-600" title={formattedTime}>
                    {formattedTime}
                  </td>
                  <td>
                    {tx.value && tx.value > 0n ? (
                      <span>{formatEther(tx.value).substring(0, 8)} {symbol}</span>
                    ) : (
                      <span className="text-gray-400">0 {symbol}</span>
                    )}
                  </td>
                  <td className="text-gray-600">
                    {tx.fee ? (
                      <span className="text-xs">
                        {formatEther(tx.fee).substring(0, 8)} {symbol}
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
                    <span>{formatEther(tx.value).substring(0, 8)} {symbol}</span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-600">0 {symbol}</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Fee</span>
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  {tx.fee ? (
                    <span>{formatEther(tx.fee).substring(0, 8)} {symbol}</span>
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

export default RecentTransactionsSection;