import { JsonRpcProvider, type Block, type TransactionResponse } from 'ethers';
import type { BlockInfo, TransactionInfo } from './types.js';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const BATCH_SIZE = 100;

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        await sleep(RETRY_DELAY_MS * Math.pow(2, i));
      }
    }
  }
  throw lastError;
}

/**
 * Client for fetching blockchain data from Erigon RPC
 */
export class ErigonClient {
  private provider: JsonRpcProvider;

  constructor(rpcUrl: string) {
    this.provider = new JsonRpcProvider(rpcUrl);
  }

  /**
   * Get the latest block number
   */
  async getLatestBlockNumber(): Promise<number> {
    return withRetry(async () => {
      const blockNumber = await this.provider.getBlockNumber();
      return blockNumber;
    });
  }

  /**
   * Fetch blocks in a specified range with batching
   * Returns block info sorted by block number descending
   */
  async getBlocksInRange(startBlock: number, endBlock: number): Promise<BlockInfo[]> {
    const results: BlockInfo[] = [];

    // Process in batches
    for (let batchStart = startBlock; batchStart <= endBlock; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, endBlock);
      const blockNumbers = Array.from(
        { length: batchEnd - batchStart + 1 },
        (_, i) => batchStart + i
      );

      const batchResults = await withRetry(async () => {
        const blocks = await Promise.all(
          blockNumbers.map((n) => this.provider.getBlock(n))
        );
        return blocks;
      });

      for (const block of batchResults) {
        if (block) {
          results.push({
            number: block.number,
            timestamp: block.timestamp,
          });
        }
      }
    }

    // Sort by block number descending (most recent first)
    return results.sort((a, b) => b.number - a.number);
  }

  /**
   * Fetch recent transactions up to a limit or max age
   * Returns transactions sorted by timestamp descending
   */
  async getRecentTransactions(
    maxCount: number,
    maxAgeDays: number
  ): Promise<TransactionInfo[]> {
    const results: TransactionInfo[] = [];
    const latestBlockNumber = await this.getLatestBlockNumber();
    const cutoffTimestamp = Math.floor(Date.now() / 1000) - maxAgeDays * 24 * 60 * 60;

    let currentBlock = latestBlockNumber;

    while (results.length < maxCount && currentBlock > 0) {
      // Fetch blocks in batches
      const batchStart = Math.max(currentBlock - BATCH_SIZE + 1, 0);
      const batchEnd = currentBlock;

      const blocks = await withRetry(async () => {
        const blockNumbers = Array.from(
          { length: batchEnd - batchStart + 1 },
          (_, i) => batchStart + i
        );
        return Promise.all(blockNumbers.map((n) => this.provider.getBlock(n, true)));
      });

      for (const block of blocks.sort((a, b) => (b?.number ?? 0) - (a?.number ?? 0))) {
        if (!block) continue;

        // Check if we've reached the age cutoff
        if (block.timestamp < cutoffTimestamp) {
          return results;
        }

        // Add transactions from this block
        // prefetchedTransactions gives us TransactionResponse[] when we fetch with prefetch=true
        const txs = block.prefetchedTransactions;
        for (const tx of txs) {
          if (results.length >= maxCount) {
            return results;
          }
          results.push({
            hash: tx.hash,
            timestamp: block.timestamp,
          });
        }
      }

      currentBlock = batchStart - 1;
    }

    return results;
  }

  /**
   * Check if the RPC connection is working
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.provider.getBlockNumber();
      return true;
    } catch {
      return false;
    }
  }
}
