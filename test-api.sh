#!/bin/bash

# REST API test script for Otterscan
# Usage: ./test-api.sh [API_URL]

API_URL=${1:-http://localhost:3001}

echo "Testing Otterscan REST API at $API_URL"
echo "========================================"
echo ""

# Test 1: Health check
echo "Test 1: Health Check"
echo "-------------------"
curl -s "${API_URL}/health" | jq '.'
echo ""
echo ""

# Test 2: Get latest block number
echo "Test 2: Get Latest Block"
echo "------------------------"
curl -s "${API_URL}/api/blocks/latest" | jq '.'
echo ""
echo ""

# Get the latest block number for subsequent tests
LATEST_BLOCK=$(curl -s "${API_URL}/api/blocks/latest" | jq -r '.blockNumber')
echo "Latest block number: $LATEST_BLOCK"
echo ""

# Test 3: Get block details
echo "Test 3: Get Block Details"
echo "-------------------------"
if [ ! -z "$LATEST_BLOCK" ] && [ "$LATEST_BLOCK" != "null" ]; then
  curl -s "${API_URL}/api/blocks/${LATEST_BLOCK}" | jq '.'
else
  echo "Skipped: Could not get latest block number"
fi
echo ""
echo ""

# Test 4: Get block transactions (first page)
echo "Test 4: Get Block Transactions (page 0, limit 5)"
echo "------------------------------------------------"
if [ ! -z "$LATEST_BLOCK" ] && [ "$LATEST_BLOCK" != "null" ]; then
  curl -s "${API_URL}/api/blocks/${LATEST_BLOCK}/transactions?page=0&limit=5" | jq '.'
else
  echo "Skipped: Could not get latest block number"
fi
echo ""
echo ""

# Test 5: Search (try searching for the latest block)
echo "Test 5: Search for Block Number"
echo "--------------------------------"
if [ ! -z "$LATEST_BLOCK" ] && [ "$LATEST_BLOCK" != "null" ]; then
  curl -s "${API_URL}/api/search/${LATEST_BLOCK}" | jq '.'
else
  echo "Skipped: Could not get latest block number"
fi
echo ""
echo ""

# Test 6: Get address info (using zero address)
echo "Test 6: Get Address Info (Zero Address)"
echo "---------------------------------------"
curl -s "${API_URL}/api/addresses/0x0000000000000000000000000000000000000000" | jq '.'
echo ""
echo ""

# Test 7: Error handling (invalid block)
echo "Test 7: Error Handling (Invalid Block)"
echo "---------------------------------------"
curl -s -w "\nHTTP Status: %{http_code}\n" "${API_URL}/api/blocks/999999999999999" | jq '.'
echo ""
echo ""

echo "Tests completed!"
echo ""
echo "Note: Some tests may fail if Erigon is not accessible or"
echo "      if the latest block has no transactions."
