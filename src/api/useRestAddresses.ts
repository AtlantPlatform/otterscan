/**
 * React hooks for fetching address data using REST API instead of JSON-RPC
 * SSR-compatible implementation using React Query
 */
import { useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { addressesAPI } from "./client";

// Check if running on server
const isServer = typeof window === 'undefined';

/**
 * Address data structure from REST API
 */
export interface RestAddress {
  address: string;
  balance: string;
  isContract: boolean;
  transactionCount: number;
}

/**
 * Query options for single address - can be used for both useQuery and prefetchQuery
 * This enables SSR data prefetching for address pages
 */
export const singleAddressQueryOptions = (address: string) =>
  queryOptions({
    queryKey: ['address', address.toLowerCase()],
    queryFn: () => addressesAPI.getAddress(address),
    staleTime: 30000, // 30 seconds - balance can change
  });

/**
 * Hook to get address data using React Query (SSR-compatible)
 * On server: reads from QueryClient cache (synchronous, set by prefetchQuery), query disabled
 * On client: uses useQuery for data fetching and updates (hydrated from SSR state)
 * Used by AddressSSR page component
 */
export const useSingleAddress = (address: string | undefined) => {
  const queryClient = useQueryClient();
  const normalizedAddress = address?.toLowerCase();
  const queryKey = ['address', normalizedAddress];

  // On server, directly read from cache (synchronous)
  const cachedData = normalizedAddress
    ? queryClient.getQueryData<RestAddress>(queryKey)
    : undefined;

  // Use useQuery for client-side fetching and updates
  const { data, isLoading, isFetching, error } = useQuery({
    ...singleAddressQueryOptions(normalizedAddress ?? ''),
    enabled: !isServer && !!normalizedAddress,
  });

  // Use same data source for both server and client initial render
  const resultData = cachedData ?? data;

  return {
    address: resultData ?? null,
    isLoading: !resultData && (isServer ? true : (isLoading || isFetching)),
    error: error as Error | undefined,
  };
};

/**
 * Address transaction data structure
 */
export interface AddressTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  type: number;
  status: number | null;
  gasUsed: number;
  fee: string;
  blockNumber: number;
  timestamp: number;
  data: string;
  index: number;
}

/**
 * Query options for address transactions - can be used for both useQuery and prefetchQuery
 */
export const addressTransactionsQueryOptions = (address: string, page = 1, limit = 25) =>
  queryOptions({
    queryKey: ['addressTransactions', address.toLowerCase(), page, limit],
    queryFn: () => addressesAPI.getTransactions(address, page, limit),
    staleTime: 15000, // 15 seconds - transactions can arrive frequently
  });

/**
 * Hook to get address transactions using React Query (SSR-compatible)
 */
export const useAddressTransactions = (address: string | undefined, page = 1, limit = 25) => {
  const queryClient = useQueryClient();
  const normalizedAddress = address?.toLowerCase();
  const queryKey = ['addressTransactions', normalizedAddress, page, limit];

  // On server, directly read from cache (synchronous)
  const cachedData = normalizedAddress
    ? queryClient.getQueryData<{
        total: number;
        page: number;
        limit: number;
        transactions: AddressTransaction[];
        hasMore: boolean;
      }>(queryKey)
    : undefined;

  // Debug logging
  if (!isServer) {
    console.log('[useAddressTransactions] queryKey:', queryKey, 'cachedData:', cachedData ? cachedData.transactions.length + ' txs' : 'none');
  }

  // Use useQuery for client-side fetching and updates
  const { data, isLoading, isFetching, error } = useQuery({
    ...addressTransactionsQueryOptions(normalizedAddress ?? '', page, limit),
    enabled: !isServer && !!normalizedAddress,
  });

  // Use same data source for both server and client initial render
  const resultData = cachedData ?? data;

  return {
    transactions: resultData?.transactions ?? [],
    total: resultData?.total ?? 0,
    hasMore: resultData?.hasMore ?? false,
    isLoading: !resultData && (isServer ? true : (isLoading || isFetching)),
    error: error as Error | undefined,
  };
};
