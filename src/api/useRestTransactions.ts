/**
 * React hooks for fetching transaction data using REST API instead of JSON-RPC
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, queryOptions } from "@tanstack/react-query";
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
 * Query options for recent transactions - can be used for both useQuery and prefetchQuery
 * This enables SSR data prefetching
 */
export const recentTransactionsQueryOptions = (count: number = 5) =>
  queryOptions({
    queryKey: ['recentTransactions', count],
    queryFn: () => transactionsAPI.getRecent(1, count),
    staleTime: 15000, // 15 seconds
  });

/**
 * Query options for paginated recent transactions - can be used for both useQuery and prefetchQuery
 * This enables SSR data prefetching for the recent transactions page
 */
export const paginatedTransactionsQueryOptions = (page: number = 1, limit: number = 30) =>
  queryOptions({
    queryKey: ['paginatedTransactions', page, limit],
    queryFn: () => transactionsAPI.getRecent(page, limit),
    staleTime: 15000, // 15 seconds
  });

/**
 * Hook to get paginated transactions using React Query (SSR-compatible)
 * Used by RecentTransactionsRest page component
 */
export const usePaginatedTransactions = (page: number = 1, limit: number = 30) => {
  const { data, isLoading, error } = useQuery(paginatedTransactionsQueryOptions(page, limit));

  return {
    transactions: (data?.transactions ?? []) as RestTransactionWithContext[],
    total: data?.total ?? 0,
    isLoading,
    error: error as Error | undefined,
  };
};

/**
 * Hook to get recent transactions using React Query (SSR-compatible)
 * Used by RecentTransactionsSection component
 */
export const useRecentTransactions = (count: number = 5) => {
  const { data, isLoading, error } = useQuery(recentTransactionsQueryOptions(count));

  return {
    transactions: (data?.transactions ?? []) as RestTransactionWithContext[],
    isLoading,
    error: error as Error | undefined,
  };
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
