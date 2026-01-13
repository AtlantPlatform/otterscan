import express from 'express';
import cors from 'cors';
import { JsonRpcProvider } from 'ethers';

const app = express();
const PORT = process.env.PORT || 3001;
const ERIGON_URL = process.env.ERIGON_URL || 'http://127.0.0.1:8545';

// Initialize Ethereum provider
// Use a generic network config to avoid auto-detection on startup
// The actual network details will be fetched on first API call
const network = {
  name: 'unknown',
  chainId: 1 // Default to mainnet, will be overridden by actual calls
};

const provider = new JsonRpcProvider(ERIGON_URL, network, {
  staticNetwork: true,
  batchMaxCount: 100, // Allow batching up to 100 RPC calls in single HTTP request
  batchMaxSize: 1024 * 1024, // 1MB max batch size
});
console.log(`Ethereum provider initialized for: ${ERIGON_URL}`);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Cache control middleware
// Real-time blockchain data should not be cached as blocks arrive every 10-30s
app.use((req, res, next) => {
  // Set cache headers based on endpoint type
  const path = req.path;

  if (path.includes('/recent') || path.includes('/latest')) {
    // Real-time endpoints: no caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else if (path.match(/\/blocks\/\d+\/transactions/)) {
    // Block transactions endpoint: no caching (like recent transactions)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else if (path.match(/\/blocks\/\d+$/) || path.match(/\/transactions\/0x[a-fA-F0-9]{64}$/)) {
    // Historical data (specific blocks/transactions): cache for longer
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    // Default: short cache for other endpoints
    res.setHeader('Cache-Control', 'public, max-age=10');
  }

  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Try to get block number with a timeout
    const blockNumber = await Promise.race([
      provider.getBlockNumber(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    ]);
    res.json({
      status: 'ok',
      rpcUrl: ERIGON_URL,
      latestBlock: blockNumber
    });
  } catch (error) {
    // Return 200 even if Erigon is down - the API server itself is healthy
    // The actual API endpoints will handle Erigon errors appropriately
    res.json({
      status: 'degraded',
      message: 'API server is running but cannot reach Erigon',
      rpcUrl: ERIGON_URL,
      error: error.message
    });
  }
});

// ============================================================================
// BLOCKS API
// ============================================================================

/**
 * GET /api/blocks/latest
 * Get the latest block number
 */
app.get('/api/blocks/latest', async (req, res) => {
  try {
    const blockNumber = await provider.getBlockNumber();
    res.json({ blockNumber });
  } catch (error) {
    console.error('Error getting latest block:', error);
    res.status(500).json({ error: 'Failed to get latest block' });
  }
});

/**
 * GET /api/blocks/recent
 * Get recent blocks with pagination using batch RPC request
 * Query params: page (default 1), limit (default 30, max 100)
 *
 * This endpoint uses a single batch JSON-RPC request to fetch multiple blocks efficiently
 */
app.get('/api/blocks/recent', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);

    // Get the latest block number
    const latestBlockNumber = await provider.getBlockNumber();

    // Calculate block range for this page
    const startBlock = Math.max(0, latestBlockNumber - (page - 1) * limit);
    const endBlock = Math.max(0, startBlock - limit + 1);

    // Build batch JSON-RPC request for all blocks
    const batchJSON = [];
    for (let blockNum = startBlock; blockNum >= endBlock && blockNum >= 0; blockNum--) {
      const blockHex = `0x${blockNum.toString(16)}`;
      batchJSON.push({
        jsonrpc: '2.0',
        id: blockNum,
        method: 'eth_getBlockByNumber',
        params: [blockHex, false] // false = don't include full transactions
      });
    }

    // Send batch request to Erigon
    const batchResponse = await fetch(ERIGON_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchJSON)
    });

    if (!batchResponse.ok) {
      throw new Error(`Erigon returned ${batchResponse.status}`);
    }

    const rawBlocks = await batchResponse.json();

    // Transform blocks to minimal UI format
    const blocks = rawBlocks
      .filter(response => response.result && !response.error)
      .map(response => {
        const rawBlock = response.result;
        return {
          number: parseInt(rawBlock.number, 16),
          hash: rawBlock.hash,
          timestamp: parseInt(rawBlock.timestamp, 16),
          miner: rawBlock.miner,
          transactionCount: rawBlock.transactions ? rawBlock.transactions.length : 0,
          gasUsed: parseInt(rawBlock.gasUsed, 16),
          gasLimit: parseInt(rawBlock.gasLimit, 16),
          baseFeePerGas: rawBlock.baseFeePerGas ? parseInt(rawBlock.baseFeePerGas, 16) : null,
          size: parseInt(rawBlock.size, 16),
          parentHash: rawBlock.parentHash,
        };
      });

    res.json({
      total: latestBlockNumber + 1,
      page,
      limit,
      blocks
    });
  } catch (error) {
    console.error('Error getting recent blocks:', error);
    res.status(500).json({ error: 'Failed to get recent blocks' });
  }
});

/**
 * GET /api/blocks/:numberOrHash
 * Get block details by number or hash
 */
app.get('/api/blocks/:numberOrHash', async (req, res) => {
  try {
    const { numberOrHash } = req.params;

    // Fetch block without transactions
    const rawBlock = await provider.send(
      numberOrHash.startsWith('0x') && numberOrHash.length === 66
        ? 'eth_getBlockByHash'
        : 'eth_getBlockByNumber',
      [numberOrHash.startsWith('0x') && numberOrHash.length < 66 ? numberOrHash : `0x${parseInt(numberOrHash).toString(16)}`, false]
    );

    if (!rawBlock) {
      return res.status(404).json({ error: 'Block not found' });
    }

    // Return minimal fields for UI
    const block = {
      number: parseInt(rawBlock.number, 16),
      hash: rawBlock.hash,
      timestamp: parseInt(rawBlock.timestamp, 16),
      miner: rawBlock.miner,
      transactionCount: rawBlock.transactions ? rawBlock.transactions.length : 0,
      gasUsed: parseInt(rawBlock.gasUsed, 16),
      gasLimit: parseInt(rawBlock.gasLimit, 16),
      baseFeePerGas: rawBlock.baseFeePerGas ? parseInt(rawBlock.baseFeePerGas, 16) : null,
      size: parseInt(rawBlock.size, 16),
      parentHash: rawBlock.parentHash,
    };

    res.json(block);
  } catch (error) {
    console.error('Error getting block:', error);
    res.status(500).json({ error: 'Failed to get block' });
  }
});

/**
 * GET /api/blocks/:number/transactions
 * Get transactions in a block with pagination
 * Query params: page (default 0), limit (default 25)
 */
app.get('/api/blocks/:number/transactions', async (req, res) => {
  try {
    const { number } = req.params;
    const page = parseInt(req.query.page) || 0;
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);

    const blockNumberHex = `0x${parseInt(number).toString(16)}`;

    // Get block with full transactions
    const rawBlock = await provider.send('eth_getBlockByNumber', [blockNumberHex, true]);

    if (!rawBlock || !rawBlock.transactions) {
      return res.json({ total: 0, page, limit, transactions: [] });
    }

    const total = rawBlock.transactions.length;
    const start = page * limit;
    const end = Math.min(start + limit, total);
    const pageTxs = rawBlock.transactions.slice(start, end);

    // Extract block metadata
    const blockNumber = parseInt(rawBlock.number, 16);
    const blockTimestamp = parseInt(rawBlock.timestamp, 16);

    // Get receipts for the page
    const receipts = await Promise.all(
      pageTxs.map(tx => provider.send('eth_getTransactionReceipt', [tx.hash]))
    );

    // Transform to minimal UI format with block context
    const transactions = pageTxs.map((tx, i) => {
      const receipt = receipts[i];
      const gasUsed = parseInt(receipt.gasUsed, 16);
      const gasPrice = tx.gasPrice ? parseInt(tx.gasPrice, 16) :
        (tx.maxFeePerGas ? parseInt(tx.maxFeePerGas, 16) : 0);

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        type: parseInt(tx.type || '0x0', 16),
        status: parseInt(receipt.status, 16),
        gasUsed,
        fee: (gasUsed * gasPrice).toString(),
        index: start + i,
        blockNumber: blockNumber,
        timestamp: blockTimestamp,
        data: tx.data || '0x',
      };
    });

    res.json({
      total,
      page,
      limit,
      transactions,
    });
  } catch (error) {
    console.error('Error getting block transactions:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// ============================================================================
// TRANSACTIONS API
// ============================================================================

/**
 * GET /api/transactions/recent
 * Get recent transactions from the latest blocks
 * Query params: page (default 1), limit (default 30)
 *
 * This endpoint fetches transactions from multiple recent blocks to ensure
 * we have enough transactions to display, combining them server-side.
 */
app.get('/api/transactions/recent', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);

    // Get the latest block number
    const latestBlockNumber = await provider.getBlockNumber();

    // Calculate how many blocks to fetch based on page
    // We fetch from multiple blocks to ensure we have enough transactions
    const blocksToSkip = (page - 1) * 2; // Skip 2 blocks per page
    const startBlock = Math.max(0, latestBlockNumber - blocksToSkip);

    // Fetch 3-5 recent blocks to ensure we have enough transactions
    const blocksToFetch = Math.min(5, startBlock + 1);
    const allTransactions = [];

    for (let i = 0; i < blocksToFetch && (startBlock - i) >= 0; i++) {
      const blockNum = startBlock - i;
      const blockHex = `0x${blockNum.toString(16)}`;

      // Get block with full transactions
      const rawBlock = await provider.send('eth_getBlockByNumber', [blockHex, true]);

      if (!rawBlock || !rawBlock.transactions || rawBlock.transactions.length === 0) {
        continue;
      }

      const blockTimestamp = parseInt(rawBlock.timestamp, 16);

      // Get receipts for all transactions in this block
      const receipts = await Promise.all(
        rawBlock.transactions.map(tx => provider.send('eth_getTransactionReceipt', [tx.hash]))
      );

      // Transform transactions to minimal format with block context
      const blockTxs = rawBlock.transactions.map((tx, idx) => {
        const receipt = receipts[idx];
        const gasUsed = parseInt(receipt.gasUsed, 16);

        // Calculate effective gas price
        let gasPrice;
        if (tx.type === '0x2' || tx.type === '0x02') {
          // EIP-1559 transaction
          const maxFeePerGas = parseInt(tx.maxFeePerGas || '0x0', 16);
          const maxPriorityFeePerGas = parseInt(tx.maxPriorityFeePerGas || '0x0', 16);
          const baseFeePerGas = parseInt(rawBlock.baseFeePerGas || '0x0', 16);
          const tip = Math.min(maxPriorityFeePerGas, maxFeePerGas - baseFeePerGas);
          gasPrice = baseFeePerGas + tip;
        } else {
          // Legacy transaction
          gasPrice = parseInt(tx.gasPrice || '0x0', 16);
        }

        const fee = gasUsed * gasPrice;

        return {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          type: parseInt(tx.type || '0x0', 16),
          status: parseInt(receipt.status, 16),
          gasUsed,
          fee: `0x${fee.toString(16)}`,
          index: parseInt(tx.transactionIndex, 16),
          blockNumber: blockNum,
          timestamp: blockTimestamp,
          data: tx.data || '0x',
        };
      });

      allTransactions.push(...blockTxs);

      // Stop if we have enough transactions
      if (allTransactions.length >= limit * 2) {
        break;
      }
    }

    // Sort by block number (descending) then by transaction index
    allTransactions.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return b.blockNumber - a.blockNumber;
      }
      return a.index - b.index;
    });

    // Paginate the combined results
    const start = (page - 1) * limit;
    const paginatedTxs = allTransactions.slice(start, start + limit);

    // Estimate total (rough approximation based on average txs per block)
    const avgTxsPerBlock = allTransactions.length / blocksToFetch;
    const estimatedTotal = Math.floor(latestBlockNumber * avgTxsPerBlock);

    res.json({
      total: estimatedTotal,
      page,
      limit,
      transactions: paginatedTxs,
    });
  } catch (error) {
    console.error('Error getting recent transactions:', error);
    res.status(500).json({ error: 'Failed to get recent transactions' });
  }
});

/**
 * GET /api/transactions/:hash
 * Get transaction details
 */
app.get('/api/transactions/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    const [tx, receipt] = await Promise.all([
      provider.getTransaction(hash),
      provider.getTransactionReceipt(hash),
    ]);

    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Calculate fee
    const gasUsed = receipt ? Number(receipt.gasUsed) : 0;
    const gasPrice = Number(tx.gasPrice || 0n);
    const fee = (gasUsed * gasPrice).toString();

    const transaction = {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value.toString(),
      type: tx.type || 0,
      gasLimit: tx.gasLimit.toString(),
      gasPrice: gasPrice.toString(),
      nonce: tx.nonce,
      data: tx.data,
      blockNumber: tx.blockNumber,
      blockHash: tx.blockHash,
      transactionIndex: tx.index,
      // Confirmed data
      status: receipt ? (receipt.status === 1) : null,
      gasUsed: gasUsed.toString(),
      fee,
      logs: receipt ? receipt.logs.map(log => ({
        address: log.address,
        topics: log.topics,
        data: log.data,
        logIndex: log.index,
      })) : [],
      contractAddress: receipt?.contractAddress || null,
    };

    res.json(transaction);
  } catch (error) {
    console.error('Error getting transaction:', error);
    res.status(500).json({ error: 'Failed to get transaction' });
  }
});

/**
 * GET /api/transactions/:hash/internal
 * Get internal operations for a transaction (Otterscan-specific)
 */
app.get('/api/transactions/:hash/internal', async (req, res) => {
  try {
    const { hash } = req.params;

    const operations = await provider.send('ots_getInternalOperations', [hash]);

    if (!operations) {
      return res.json({ operations: [] });
    }

    // Transform to minimal format
    const formatted = operations.map(op => ({
      type: op.type, // 0=transfer, 1=self-destruct, 2=create, 3=create2
      from: op.from,
      to: op.to,
      value: op.value,
    }));

    res.json({ operations: formatted });
  } catch (error) {
    console.error('Error getting internal operations:', error);
    // Return empty if Otterscan API not available
    res.json({ operations: [] });
  }
});

/**
 * GET /api/transactions/:hash/trace
 * Get execution trace for a transaction (Otterscan-specific)
 */
app.get('/api/transactions/:hash/trace', async (req, res) => {
  try {
    const { hash } = req.params;

    const trace = await provider.send('ots_traceTransaction', [hash]);

    res.json({ trace: trace || [] });
  } catch (error) {
    console.error('Error getting trace:', error);
    res.json({ trace: [] });
  }
});

// ============================================================================
// ADDRESSES API
// ============================================================================

/**
 * GET /api/addresses/:address
 * Get address information
 */
app.get('/api/addresses/:address', async (req, res) => {
  try {
    const { address } = req.params;

    const [balance, code, txCount] = await Promise.all([
      provider.getBalance(address),
      provider.getCode(address),
      provider.getTransactionCount(address),
    ]);

    const isContract = code !== '0x';

    const addressInfo = {
      address,
      balance: balance.toString(),
      isContract,
      transactionCount: txCount,
    };

    res.json(addressInfo);
  } catch (error) {
    console.error('Error getting address info:', error);
    res.status(500).json({ error: 'Failed to get address info' });
  }
});

/**
 * GET /api/addresses/:address/code
 * Get contract code
 */
app.get('/api/addresses/:address/code', async (req, res) => {
  try {
    const { address } = req.params;
    const code = await provider.getCode(address);

    res.json({
      address,
      code,
      isContract: code !== '0x'
    });
  } catch (error) {
    console.error('Error getting code:', error);
    res.status(500).json({ error: 'Failed to get code' });
  }
});

/**
 * GET /api/addresses/:address/creator
 * Get contract creator (Otterscan-specific)
 */
app.get('/api/addresses/:address/creator', async (req, res) => {
  try {
    const { address } = req.params;

    const creator = await provider.send('ots_getContractCreator', [address]);

    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    res.json({
      address,
      creator: creator.creator,
      transactionHash: creator.hash,
    });
  } catch (error) {
    console.error('Error getting creator:', error);
    res.status(404).json({ error: 'Creator not found or Otterscan API not available' });
  }
});

// ============================================================================
// TOKENS API
// ============================================================================

/**
 * GET /api/tokens/:address
 * Get ERC20 token metadata
 */
app.get('/api/tokens/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // ERC20 method signatures
    const NAME_SIG = '0x06fdde03';
    const SYMBOL_SIG = '0x95d89b41';
    const DECIMALS_SIG = '0x313ce567';

    const [nameData, symbolData, decimalsData] = await Promise.all([
      provider.call({ to: address, data: NAME_SIG }).catch(() => null),
      provider.call({ to: address, data: SYMBOL_SIG }).catch(() => null),
      provider.call({ to: address, data: DECIMALS_SIG }).catch(() => null),
    ]);

    if (!nameData || !symbolData) {
      return res.status(404).json({ error: 'Not an ERC20 token' });
    }

    // Decode string responses (simplified)
    const decodeName = (data) => {
      if (!data || data === '0x') return '';
      // Simple UTF-8 decode, skip ABI decoding for brevity
      return data; // In production, use proper ABI decoder
    };

    const token = {
      address,
      name: decodeName(nameData),
      symbol: decodeName(symbolData),
      decimals: decimalsData ? parseInt(decimalsData, 16) : 18,
    };

    res.json(token);
  } catch (error) {
    console.error('Error getting token metadata:', error);
    res.status(500).json({ error: 'Failed to get token metadata' });
  }
});

/**
 * GET /api/transactions/:hash/transfers
 * Get token transfers in a transaction
 */
app.get('/api/transactions/:hash/transfers', async (req, res) => {
  try {
    const { hash } = req.params;

    const receipt = await provider.getTransactionReceipt(hash);

    if (!receipt) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // ERC20 Transfer event signature
    const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

    // Filter Transfer events
    const transfers = receipt.logs
      .filter(log => log.topics.length === 3 && log.topics[0] === TRANSFER_TOPIC)
      .map(log => ({
        token: log.address,
        from: '0x' + log.topics[1].slice(26), // Remove padding
        to: '0x' + log.topics[2].slice(26),
        value: log.data,
      }));

    res.json({ transfers });
  } catch (error) {
    console.error('Error getting transfers:', error);
    res.status(500).json({ error: 'Failed to get transfers' });
  }
});

// ============================================================================
// SEARCH API
// ============================================================================

/**
 * GET /api/search/:query
 * Search for block, transaction, or address
 */
app.get('/api/search/:query', async (req, res) => {
  try {
    const { query } = req.params;

    // Determine query type
    if (/^0x[a-fA-F0-9]{64}$/.test(query)) {
      // Transaction hash or block hash
      try {
        const tx = await provider.getTransaction(query);
        if (tx) {
          return res.json({ type: 'transaction', hash: query });
        }
      } catch (e) {}

      try {
        const block = await provider.send('eth_getBlockByHash', [query, false]);
        if (block) {
          return res.json({ type: 'block', hash: query, number: parseInt(block.number, 16) });
        }
      } catch (e) {}

      return res.status(404).json({ error: 'Not found' });
    } else if (/^0x[a-fA-F0-9]{40}$/.test(query)) {
      // Address
      const code = await provider.getCode(query);
      return res.json({
        type: 'address',
        address: query,
        isContract: code !== '0x'
      });
    } else if (/^\d+$/.test(query)) {
      // Block number
      const blockNumber = parseInt(query);
      const latest = await provider.getBlockNumber();
      if (blockNumber <= latest) {
        return res.json({ type: 'block', number: blockNumber });
      }
      return res.status(404).json({ error: 'Block number too high' });
    }

    res.status(400).json({ error: 'Invalid query format' });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ============================================================================
// JSON-RPC PROXY (for unmigrated pages)
// ============================================================================

/**
 * POST /api/rpc
 * JSON-RPC proxy for ethers.js provider
 *
 * This endpoint is needed for pages that haven't been migrated to REST API yet.
 * The 4 migrated pages (Dashboard, Recent Blocks, Recent Transactions, Block Transactions)
 * use REST endpoints above. All other pages still use this proxy.
 *
 * Supports both single requests and batch requests.
 */
app.post('/api/rpc', async (req, res) => {
  try {
    const body = req.body;

    // Handle batch requests (array of requests)
    if (Array.isArray(body)) {
      const results = await Promise.all(
        body.map(async (request) => {
          try {
            const { jsonrpc, method, params, id } = request;

            if (!method) {
              return {
                jsonrpc: '2.0',
                id: id || null,
                error: { code: -32600, message: 'Invalid Request: method is required' }
              };
            }

            const result = await provider.send(method, params || []);
            return {
              jsonrpc: jsonrpc || '2.0',
              id: id || null,
              result
            };
          } catch (error) {
            console.error(`JSON-RPC batch error for method ${request.method}:`, error);
            return {
              jsonrpc: '2.0',
              id: request.id || null,
              error: {
                code: -32603,
                message: error.message || 'Internal error'
              }
            };
          }
        })
      );

      return res.json(results);
    }

    // Handle single request
    const { jsonrpc, method, params, id } = body;

    if (!method) {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: id || null,
        error: { code: -32600, message: 'Invalid Request: method is required' }
      });
    }

    // Forward the JSON-RPC call to Erigon
    const result = await provider.send(method, params || []);

    res.json({
      jsonrpc: jsonrpc || '2.0',
      id: id || 1,
      result
    });
  } catch (error) {
    console.error('JSON-RPC proxy error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: {
        code: -32603,
        message: error.message || 'Internal error'
      }
    });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`Otterscan REST API server running on port ${PORT}`);
  console.log(`Erigon URL: ${ERIGON_URL}`);
  console.log(`\nAvailable REST endpoints:`);
  console.log(`  GET   /health`);
  console.log(`  GET   /api/blocks/latest`);
  console.log(`  GET   /api/blocks/recent`);
  console.log(`  GET   /api/blocks/:numberOrHash`);
  console.log(`  GET   /api/blocks/:number/transactions`);
  console.log(`  GET   /api/transactions/recent`);
  console.log(`  GET   /api/transactions/:hash`);
  console.log(`  GET   /api/transactions/:hash/internal`);
  console.log(`  GET   /api/transactions/:hash/trace`);
  console.log(`  GET   /api/transactions/:hash/transfers`);
  console.log(`  GET   /api/addresses/:address`);
  console.log(`  GET   /api/addresses/:address/code`);
  console.log(`  GET   /api/addresses/:address/creator`);
  console.log(`  GET   /api/tokens/:address`);
  console.log(`  GET   /api/search/:query`);
  console.log(`  POST  /api/rpc (JSON-RPC proxy for unmigrated pages)`);
});
