/**
 * React hooks for fetching transaction data using REST API instead of JSON-RPC
 */
import { useEffect, useMemo, useState } from "react";
import { blocksAPI, transactionsAPI } from "./client";

/**
 * Transaction data structure from REST API block transactions endpoint
 */
export interface RestTransaction {
  hash: string;
  from: string;
  to: string;
  value: string; // hex string
  type: number;
  status: number; // 0 = failed, 1 = success
  gasUsed: number;
  fee: string; // hex string
  index: number;
}

/**
 * Extended transaction with block context (for display)
 */
export interface RestTransactionWithContext extends RestTransaction {
  blockNumber: number;
  timestamp: number;
  data: string; // For method detection
}

/**
 * Paginated transaction response
 */
export interface RestTransactionsPage {
  total: number;
  page: number;
  limit: number;
  transactions: RestTransaction[];
}

/**
 * Hook to fetch transactions from a specific block with pagination
 */
export const useBlockTransactions = (
  blockNumber: number | undefined,
  page: number = 0,
  limit: number = 25
) => {
  const [data, setData] = useState<RestTransactionsPage>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    if (blockNumber === undefined) {
      setData(undefined);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchTransactions = async () => {
      try {
        const txData = await blocksAPI.getTransactions(blockNumber, page, limit);
        if (isMounted) {
          setData(txData);
          setError(undefined);
        }
      } catch (err) {
        if (isMounted) {
          setData(undefined);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchTransactions();

    return () => {
      isMounted = false;
    };
  }, [blockNumber, page, limit]);

  return { data, isLoading, error };
};

/**
 * Hook to get recent transactions from the latest block (static snapshot)
 * Used by RecentTransactionsSection component
 */
export const useRecentTransactions = (count: number = 5) => {
  const [transactions, setTransactions] = useState<RestTransactionWithContext[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const fetchRecentTransactions = async () => {
      try {
        // Get the latest block number
        const { blockNumber: latestBlockNumber } = await blocksAPI.getLatest();

        // Fetch transactions from the latest block
        const txData = await blocksAPI.getTransactions(latestBlockNumber, 0, count);

        // Fetch full transaction details to get the 'data' field for method detection
        const txDetailsPromises = txData.transactions.map(tx =>
          transactionsAPI.getTransaction(tx.hash)
        );
        const txDetails = await Promise.all(txDetailsPromises);

        // Get block details for timestamp
        const block = await blocksAPI.getBlock(latestBlockNumber);

        if (isMounted) {
          // Combine the transaction data with block context and full details
          const enrichedTxs: RestTransactionWithContext[] = txData.transactions.map((tx, i) => ({
            ...tx,
            blockNumber: latestBlockNumber,
            timestamp: block.timestamp,
            data: txDetails[i].data,
          }));

          setTransactions(enrichedTxs);
          setError(undefined);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchRecentTransactions();

    return () => {
      isMounted = false;
    };
  }, [count]);

  return { transactions, isLoading, error };
};

/**
 * Hook to fetch a single transaction by hash
 */
export const useTransaction = (txHash: string | undefined) => {
  const [transaction, setTransaction] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    if (!txHash) {
      setTransaction(undefined);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchTransaction = async () => {
      try {
        const tx = await transactionsAPI.getTransaction(txHash);
        if (isMounted) {
          setTransaction(tx);
          setError(undefined);
        }
      } catch (err) {
        if (isMounted) {
          setTransaction(undefined);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchTransaction();

    return () => {
      isMounted = false;
    };
  }, [txHash]);

  return { transaction, isLoading, error };
};
