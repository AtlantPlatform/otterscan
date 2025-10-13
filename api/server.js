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
  batchMaxCount: 1
});
console.log(`Ethereum provider initialized for: ${ERIGON_URL}`);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
      erigonUrl: ERIGON_URL,
      latestBlock: blockNumber
    });
  } catch (error) {
    // Return 200 even if Erigon is down - the API server itself is healthy
    // The actual API endpoints will handle Erigon errors appropriately
    res.json({
      status: 'degraded',
      message: 'API server is running but cannot reach Erigon',
      erigonUrl: ERIGON_URL,
      error: error.message
    });
  }
});

// ============================================================================
// JSON-RPC PROXY (for frontend compatibility)
// ============================================================================

/**
 * POST /api/rpc
 * JSON-RPC proxy endpoint for ethers.js compatibility
 * The frontend still uses ethers.js which expects JSON-RPC
 */
app.post('/api/rpc', async (req, res) => {
  try {
    const { jsonrpc, method, params, id } = req.body;

    // Forward the request to Erigon
    const result = await provider.send(method, params || []);

    res.json({
      jsonrpc: jsonrpc || '2.0',
      id: id || 1,
      result,
    });
  } catch (error) {
    console.error('JSON-RPC error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body.id || 1,
      error: {
        code: -32603,
        message: error.message || 'Internal error',
      },
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

    const blockNumber = `0x${parseInt(number).toString(16)}`;

    // Get block with full transactions
    const rawBlock = await provider.send('eth_getBlockByNumber', [blockNumber, true]);

    if (!rawBlock || !rawBlock.transactions) {
      return res.json({ total: 0, page, limit, transactions: [] });
    }

    const total = rawBlock.transactions.length;
    const start = page * limit;
    const end = Math.min(start + limit, total);
    const pageTxs = rawBlock.transactions.slice(start, end);

    // Get receipts for the page
    const receipts = await Promise.all(
      pageTxs.map(tx => provider.send('eth_getTransactionReceipt', [tx.hash]))
    );

    // Transform to minimal UI format
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
  console.log(`Otterscan API server running on port ${PORT}`);
  console.log(`Erigon URL: ${ERIGON_URL}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET   /health`);
  console.log(`  POST  /api/rpc                          - JSON-RPC proxy (for ethers.js)`);
  console.log(`  GET   /api/blocks/latest`);
  console.log(`  GET   /api/blocks/:numberOrHash`);
  console.log(`  GET   /api/blocks/:number/transactions`);
  console.log(`  GET   /api/transactions/:hash`);
  console.log(`  GET   /api/transactions/:hash/internal`);
  console.log(`  GET   /api/transactions/:hash/trace`);
  console.log(`  GET   /api/transactions/:hash/transfers`);
  console.log(`  GET   /api/addresses/:address`);
  console.log(`  GET   /api/addresses/:address/code`);
  console.log(`  GET   /api/addresses/:address/creator`);
  console.log(`  GET   /api/tokens/:address`);
  console.log(`  GET   /api/search/:query`);
});
