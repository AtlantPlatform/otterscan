/**
 * React hooks for fetching transaction data using REST API instead of JSON-RPC
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { blocksAPI, transactionsAPI } from "./client";

// Check if running on server
const isServer = typeof window === 'undefined';

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
 * On server: directly reads from QueryClient cache (synchronous, set by prefetchQuery)
 * On client: uses useQuery for data fetching and updates (hydrated from SSR state)
 * Used by RecentTransactionsRest page component
 */
export const usePaginatedTransactions = (page: number = 1, limit: number = 30) => {
  const queryClient = useQueryClient();
  const queryKey = ['paginatedTransactions', page, limit];

  // On server, directly read from cache (synchronous)
  // This works because prefetchQuery populates the cache before renderToString
  const cachedData = queryClient.getQueryData<{ transactions: RestTransactionWithContext[]; total: number }>(queryKey);

  // Use useQuery for client-side fetching and updates
  // On server, disable the query - we just use the cached data directly
  // On client, HydrationBoundary restores the cache before this runs,
  // so useQuery will find the prefetched data in the cache
  const { data, isLoading, isFetching } = useQuery({
    ...paginatedTransactionsQueryOptions(page, limit),
    // Disable query on server - prevents any async operations during renderToString
    enabled: !isServer,
  });

  // CRITICAL: Use same data source for both server and client initial render
  // to avoid hydration mismatch. On server, cachedData is from prefetchQuery.
  // On client during hydration, cachedData is from HydrationBoundary (same data).
  // After hydration, data from useQuery takes over for reactivity.
  const resultData = cachedData ?? data;

  return {
    transactions: (resultData?.transactions ?? []) as RestTransactionWithContext[],
    total: resultData?.total ?? 0,
    // Loading if no data available from either source
    isLoading: !resultData && (isServer ? true : (isLoading || isFetching)),
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
