# API Quick Reference

## Base URL

```
http://localhost:3001
```

## Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/blocks/latest` | Latest block number |
| GET | `/api/blocks/:numberOrHash` | Block details |
| GET | `/api/blocks/:number/transactions?page=0&limit=25` | Block transactions (paginated) |
| GET | `/api/transactions/:hash` | Transaction details |
| GET | `/api/transactions/:hash/internal` | Internal operations |
| GET | `/api/transactions/:hash/trace` | Execution trace |
| GET | `/api/transactions/:hash/transfers` | Token transfers |
| GET | `/api/addresses/:address` | Address info |
| GET | `/api/addresses/:address/code` | Contract bytecode |
| GET | `/api/addresses/:address/creator` | Contract creator |
| GET | `/api/tokens/:address` | Token metadata |
| GET | `/api/search/:query` | Search |

## Examples

### Get Latest Block

```bash
curl http://localhost:3001/api/blocks/latest
```

### Get Block Details

```bash
curl http://localhost:3001/api/blocks/18500000
```

### Get Block Transactions (Page 2, 50 per page)

```bash
curl "http://localhost:3001/api/blocks/18500000/transactions?page=1&limit=50"
```

### Get Transaction

```bash
curl http://localhost:3001/api/transactions/0xabc...
```

### Get Address Info

```bash
curl http://localhost:3001/api/addresses/0x123...
```

### Search

```bash
# Block number
curl http://localhost:3001/api/search/18500000

# Transaction hash
curl http://localhost:3001/api/search/0xabc...

# Address
curl http://localhost:3001/api/search/0x123...
```

## Response Examples

### Block

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

### Transaction

```json
{
  "hash": "0x...",
  "from": "0x...",
  "to": "0x...",
  "value": "1000000000000000000",
  "type": 2,
  "status": true,
  "gasUsed": "21000",
  "fee": "525000000000000",
  "blockNumber": 18500000
}
```

### Address

```json
{
  "address": "0x...",
  "balance": "1000000000000000000",
  "isContract": false,
  "transactionCount": 42
}
```

## Error Responses

```json
{
  "error": "Block not found"
}
```

Status codes: 400, 404, 500, 503
