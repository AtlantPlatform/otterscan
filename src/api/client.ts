/**
 * REST API client for Otterscan
 * All blockchain data is fetched through REST API endpoints
 */

// For SSR, we need absolute URLs pointing to the API server directly.
// On client, relative URLs work fine (proxied by Express).
// Note: This function is called at module load time
const isServer = typeof window === 'undefined';

// Server-side: always use absolute URL to API server
// Client-side: use relative URL (proxied by Express)
const API_BASE = isServer
  ? 'http://localhost:3001/api'  // Direct API server URL for SSR
  : '/api';                       // Relative URL for browser (proxied)

if (isServer) {
  console.log('[API Client] Running on server, API base:', API_BASE);
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Block-related API calls
 */
export const blocksAPI = {
  /**
   * Get the latest block number
   */
  async getLatest(): Promise<{ blockNumber: number }> {
    return apiFetch('/blocks/latest');
  },

  /**
   * Get recent blocks with pagination (uses batch RPC request on server)
   */
  async getRecent(page: number = 1, limit: number = 30): Promise<{
    total: number;
    page: number;
    limit: number;
    blocks: Array<{
      number: number;
      hash: string;
      timestamp: number;
      miner: string;
      transactionCount: number;
      gasUsed: number;
      gasLimit: number;
      baseFeePerGas: number | null;
      size: number;
      parentHash: string;
    }>;
  }> {
    return apiFetch(`/blocks/recent?page=${page}&limit=${limit}`);
  },

  /**
   * Get block details by number or hash
   */
  async getBlock(numberOrHash: number | string): Promise<{
    number: number;
    hash: string;
    timestamp: number;
    miner: string;
    transactionCount: number;
    gasUsed: number;
    gasLimit: number;
    baseFeePerGas: number | null;
    size: number;
    parentHash: string;
  }> {
    return apiFetch(`/blocks/${numberOrHash}`);
  },

  /**
   * Get transactions in a block with pagination
   */
  async getTransactions(
    blockNumber: number,
    page = 0,
    limit = 25
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    transactions: Array<{
      hash: string;
      from: string;
      to: string;
      value: string;
      type: number;
      status: number;
      gasUsed: number;
      fee: string;
      index: number;
    }>;
  }> {
    return apiFetch(`/blocks/${blockNumber}/transactions?page=${page}&limit=${limit}`);
  },
};

/**
 * Transaction-related API calls
 */
export const transactionsAPI = {
  /**
   * Get recent transactions from multiple blocks (server-side combined)
   */
  async getRecent(page: number = 1, limit: number = 30): Promise<{
    total: number;
    page: number;
    limit: number;
    transactions: Array<{
      hash: string;
      from: string;
      to: string;
      value: string;
      type: number;
      status: number;
      gasUsed: number;
      fee: string;
      index: number;
      blockNumber: number;
      timestamp: number;
      data: string;
    }>;
  }> {
    return apiFetch(`/transactions/recent?page=${page}&limit=${limit}`);
  },

  /**
   * Get transaction details
   */
  async getTransaction(hash: string): Promise<{
    hash: string;
    from: string;
    to: string;
    value: string;
    type: number;
    gasLimit: string;
    gasPrice: string;
    nonce: number;
    data: string;
    blockNumber: number;
    blockHash: string;
    transactionIndex: number;
    status: boolean | null;
    gasUsed: string;
    fee: string;
    logs: Array<{
      address: string;
      topics: string[];
      data: string;
      logIndex: number;
    }>;
    contractAddress: string | null;
  }> {
    return apiFetch(`/transactions/${hash}`);
  },

  /**
   * Get internal operations
   */
  async getInternal(hash: string): Promise<{
    operations: Array<{
      type: number;
      from: string;
      to: string;
      value: string;
    }>;
  }> {
    return apiFetch(`/transactions/${hash}/internal`);
  },

  /**
   * Get execution trace
   */
  async getTrace(hash: string): Promise<{ trace: any }> {
    return apiFetch(`/transactions/${hash}/trace`);
  },

  /**
   * Get token transfers
   */
  async getTransfers(hash: string): Promise<{
    transfers: Array<{
      token: string;
      from: string;
      to: string;
      value: string;
    }>;
  }> {
    return apiFetch(`/transactions/${hash}/transfers`);
  },
};

/**
 * Address-related API calls
 */
export const addressesAPI = {
  /**
   * Get address information
   */
  async getAddress(address: string): Promise<{
    address: string;
    balance: string;
    isContract: boolean;
    transactionCount: number;
  }> {
    return apiFetch(`/addresses/${address}`);
  },

  /**
   * Get contract bytecode
   */
  async getCode(address: string): Promise<{
    address: string;
    code: string;
    isContract: boolean;
  }> {
    return apiFetch(`/addresses/${address}/code`);
  },

  /**
   * Get contract creator
   */
  async getCreator(address: string): Promise<{
    address: string;
    creator: string;
    transactionHash: string;
  }> {
    return apiFetch(`/addresses/${address}/creator`);
  },
};

/**
 * Token-related API calls
 */
export const tokensAPI = {
  /**
   * Get ERC20 token metadata
   */
  async getToken(address: string): Promise<{
    address: string;
    name: string;
    symbol: string;
    decimals: number;
  }> {
    return apiFetch(`/tokens/${address}`);
  },
};

/**
 * Search API
 */
export const searchAPI = {
  /**
   * Universal search
   */
  async search(query: string): Promise<
    | { type: 'transaction'; hash: string }
    | { type: 'block'; number?: number; hash?: string }
    | { type: 'address'; address: string; isContract: boolean }
  > {
    return apiFetch(`/search/${query}`);
  },
};
