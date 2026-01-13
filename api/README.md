# Otterscan REST API

A REST API server that provides simplified blockchain data for the Otterscan frontend. All Ethereum-specific logic and naming is handled server-side, returning minimal JSON responses optimized for the UI.

## Features

- **RESTful Design**: Standard HTTP methods and resource-based URLs
- **Minimal Payloads**: Returns only fields needed by the UI
- **Pagination Support**: Built-in pagination for list endpoints
- **Type Transformation**: Converts Ethereum types (hex, BigInt) to JSON-friendly formats
- **Error Handling**: Standard HTTP status codes
- **CORS Enabled**: Ready for frontend access

## Quick Start

```bash
# Install dependencies
npm install

# Set environment variable
export ERIGON_URL=http://your-erigon-node:8545

# Start server
npm start
```

Server runs on port 3001 by default.

## API Endpoints

### Health Check

#### `GET /health`

Check API server status and connectivity to Erigon.

**Response:**
```json
{
  "status": "ok",
  "erigonUrl": "http://localhost:8545",
  "latestBlock": 18500000
}
```

---

### Blocks

#### `GET /api/blocks/latest`

Get the latest block number.

**Response:**
```json
{
  "blockNumber": 18500000
}
```

#### `GET /api/blocks/:numberOrHash`

Get block details by number or hash.

**Parameters:**
- `numberOrHash`: Block number (e.g., `18500000`) or block hash (0x...)

**Response:**
```json
{
  "number": 18500000,
  "hash": "0x...",
  "timestamp": 1699564800,
  "miner": "0x...",
  "transactionCount": 150,
  "gasUsed": 15000000,
  "gasLimit": 30000000,
  "baseFeePerGas": 25000000000,
  "size": 50000,
  "parentHash": "0x..."
}
```

#### `GET /api/blocks/:number/transactions`

Get transactions in a block with pagination.

**Parameters:**
- `number`: Block number
- `page`: Page number (default: 0)
- `limit`: Items per page (default: 25, max: 100)

**Example:** `GET /api/blocks/18500000/transactions?page=0&limit=25`

**Response:**
```json
{
  "total": 150,
  "page": 0,
  "limit": 25,
  "transactions": [
    {
      "hash": "0x...",
      "from": "0x...",
      "to": "0x...",
      "value": "1000000000000000000",
      "type": 2,
      "status": 1,
      "gasUsed": 21000,
      "fee": "525000000000000",
      "index": 0
    }
  ]
}
```

---

### Transactions

#### `GET /api/transactions/:hash`

Get transaction details.

**Parameters:**
- `hash`: Transaction hash

**Response:**
```json
{
  "hash": "0x...",
  "from": "0x...",
  "to": "0x...",
  "value": "1000000000000000000",
  "type": 2,
  "gasLimit": "21000",
  "gasPrice": "25000000000",
  "nonce": 5,
  "data": "0x",
  "blockNumber": 18500000,
  "blockHash": "0x...",
  "transactionIndex": 0,
  "status": true,
  "gasUsed": "21000",
  "fee": "525000000000000",
  "logs": [],
  "contractAddress": null
}
```

#### `GET /api/transactions/:hash/internal`

Get internal operations (Otterscan-specific).

**Response:**
```json
{
  "operations": [
    {
      "type": 0,
      "from": "0x...",
      "to": "0x...",
      "value": "0x..."
    }
  ]
}
```

**Operation Types:**
- `0`: Transfer
- `1`: Self-destruct
- `2`: Create
- `3`: Create2
- `4`: EOF Create

#### `GET /api/transactions/:hash/trace`

Get execution trace (Otterscan-specific).

**Response:**
```json
{
  "trace": [...]
}
```

#### `GET /api/transactions/:hash/transfers`

Get ERC20 token transfers in a transaction.

**Response:**
```json
{
  "transfers": [
    {
      "token": "0x...",
      "from": "0x...",
      "to": "0x...",
      "value": "0x..."
    }
  ]
}
```

---

### Addresses

#### `GET /api/addresses/:address`

Get address information.

**Parameters:**
- `address`: Ethereum address

**Response:**
```json
{
  "address": "0x...",
  "balance": "1000000000000000000",
  "isContract": false,
  "transactionCount": 42
}
```

#### `GET /api/addresses/:address/code`

Get contract bytecode.

**Response:**
```json
{
  "address": "0x...",
  "code": "0x60806040...",
  "isContract": true
}
```

#### `GET /api/addresses/:address/creator`

Get contract creator info (Otterscan-specific).

**Response:**
```json
{
  "address": "0x...",
  "creator": "0x...",
  "transactionHash": "0x..."
}
```

---

### Tokens

#### `GET /api/tokens/:address`

Get ERC20 token metadata.

**Parameters:**
- `address`: Token contract address

**Response:**
```json
{
  "address": "0x...",
  "name": "Wrapped Ether",
  "symbol": "WETH",
  "decimals": 18
}
```

---

### Search

#### `GET /api/search/:query`

Search for block, transaction, or address.

**Parameters:**
- `query`: Block number, block hash, transaction hash, or address

**Response (Transaction):**
```json
{
  "type": "transaction",
  "hash": "0x..."
}
```

**Response (Block):**
```json
{
  "type": "block",
  "number": 18500000,
  "hash": "0x..."
}
```

**Response (Address):**
```json
{
  "type": "address",
  "address": "0x...",
  "isContract": false
}
```

---

## Response Format

### Success

All successful responses return JSON with relevant data and HTTP 200 status.

### Errors

Errors return JSON with an `error` field:

```json
{
  "error": "Block not found"
}
```

**Status Codes:**
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `404`: Not Found
- `500`: Internal Server Error
- `503`: Service Unavailable (Erigon connection issue)

---

## Data Types

### Numbers

All numeric values are returned as:
- **Integers**: Native JSON numbers
- **Large integers** (wei, etc.): Strings to prevent precision loss

**Example:**
```json
{
  "blockNumber": 18500000,
  "balance": "1000000000000000000",
  "fee": "525000000000000"
}
```

### Addresses

Always lowercase, checksummed format: `0x...`

### Hashes

Always lowercase, prefixed with `0x`

### Timestamps

Unix timestamps (seconds since epoch) as integers.

---

## Environment Variables

- `ERIGON_URL`: Erigon JSON-RPC endpoint (required)
  - Example: `http://localhost:8545`
- `PORT`: API server port (optional, default: 3001)

---

## Comparison: REST vs JSON-RPC

### Before (JSON-RPC)

Browser makes raw Ethereum JSON-RPC calls:

```javascript
// Browser code
const block = await provider.send("eth_getBlockByNumber", ["0x11a3230", false]);
// Returns: { number: "0x11a3230", gasUsed: "0xe4e1c0", ... }
// Browser must parse hex, convert types, etc.
```

### After (REST)

Browser makes simple HTTP requests:

```javascript
// Browser code
const response = await fetch('/api/blocks/18500000');
const block = await response.json();
// Returns: { number: 18500000, gasUsed: 15000000, ... }
// Data is pre-processed and ready to use
```

**Benefits:**
- ✅ No hex parsing needed
- ✅ No BigInt handling in browser
- ✅ Standard HTTP semantics
- ✅ Easier caching
- ✅ Simpler error handling

---

## Development

```bash
# Start with auto-reload
npm run dev

# Test endpoint
curl http://localhost:3001/health

# Test with pretty print
curl http://localhost:3001/api/blocks/latest | jq
```

---

## Production Deployment

See main `DEPLOYMENT.md` for Docker and Kubernetes deployment instructions.

**Quick Docker:**
```bash
docker build -t otterscan-api .
docker run -p 3001:3001 -e ERIGON_URL=http://erigon:8545 otterscan-api
```

---

## Architecture

```
Browser --> REST API (this service) --> Erigon (JSON-RPC)
```

This API layer:
1. Accepts REST requests from browser
2. Translates to Ethereum JSON-RPC calls
3. Calls Erigon node
4. Transforms responses to minimal JSON
5. Returns to browser

All Ethereum-specific logic (hex conversion, BigInt handling, gas calculations) happens server-side.
