# API Calls Optimization Report

## Overview
Investigation of unnecessary API calls occurring on the home page load, specifically connectivity checks and ENS resolver calls.

## Findings

### 1. Provider Probing Calls (Startup)

**Location**: `src/useProvider.ts:28-57`

**What happens**: On application startup, the provider initialization makes multiple RPC calls to verify API capabilities:

```typescript
const probeBlockNumber = provider.getBlockNumber();           // eth_blockNumber
const probeHeader1 = provider.send("erigon_getHeaderByNumber", ["latest"]);
const probeOtsAPI = provider.send("ots_getApiLevel", []);
const getNetwork = provider.getNetwork();                      // eth_chainId + ENS Registry check
```

**Purpose**:
- `eth_blockNumber`: Verify it's a working Ethereum node
- `erigon_getHeaderByNumber`: Check if Erigon-specific API is available
- `ots_getApiLevel`: Verify Otterscan patches are present (MIN_API_LEVEL = 10)
- `getNetwork()`: Get chain ID and network metadata

**Are they necessary?**
- ✅ **YES** - These are required to:
  - Ensure API compatibility before app starts
  - Detect network type (mainnet, testnet, etc.)
  - Verify Otterscan-specific features are available
  - Prevent runtime errors from unsupported APIs

**Optimization opportunity**:
- If deploying to a known fixed network, you can set `experimentalFixedChainId` in config to skip network detection
- However, for a public explorer, probing is essential for reliability

---

### 2. Chain Info Population

**Location**: `src/useChainInfo.ts:10-25`

**What happens**: After provider initialization, fetches chain metadata:

```typescript
const network = await runtime.provider.getNetwork();  // Another eth_chainId call
const chainId = network.chainId;
const url = chainInfoURL(assetsURLPrefix, chainId);
const res = await fetch(url);  // Fetch chain metadata JSON
```

**Purpose**: Load chain-specific metadata (name, currency symbol, explorer links, etc.)

**Are they necessary?**
- ✅ **YES for dynamic networks** - Required to display correct chain info
- ⚠️ **OPTIONAL for fixed network** - If you always deploy to mainnet, you can hardcode `chainInfo` in config

**Optimization opportunity**:
```typescript
// In your config
export const config: OtterscanConfig = {
  experimentalFixedChainId: 1,  // Mainnet
  chainInfo: {
    name: "Ethereum Mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    // ... other hardcoded values
  }
};
```

---

### 3. ENS Reverse Lookup Calls (Per Address)

**Location**:
- `src/useResolvedAddresses.ts:73-90` (hook)
- `src/api/address-resolver/ENSAddressResolver.ts:5-14` (resolver)
- `src/components/RecentBlocksSectionRest.tsx:78` (usage)

**What happens**: On the home page, `RecentBlocksSectionRest` displays 5 recent blocks. For each block, it shows the miner address using `<DecoratedAddressLink>`, which triggers:

```typescript
const resolvedAddress = useResolvedAddress(provider, address);
// This calls:
const name = await provider.lookupAddress(address);  // ENS reverse lookup
```

**The RPC calls**:
```json
{
  "method": "eth_call",
  "params": [{
    "to": "0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e",  // ENS Registry
    "data": "0x0178b8bf..."  // resolver(node)
  }, "latest"]
}
```

**Impact**:
- **5 ENS calls on every home page load** (one per miner address)
- Each call adds ~50-100ms latency
- Most miner addresses don't have ENS reverse records

**Are they necessary?**
- ❌ **NO for home page** - ENS lookups are nice-to-have but not critical
- ✅ **YES for detail pages** - Address/transaction detail pages benefit from ENS names
- ⚠️ **QUESTIONABLE for mainnet miners** - Most mining pool addresses don't have ENS names

---

## Performance Impact

### Current State (Home Page Load)
```
Provider Initialization:
- eth_blockNumber: 1 call
- erigon_getHeaderByNumber: 1 call
- ots_getApiLevel: 1 call
- eth_chainId: 1 call

Chain Info:
- eth_chainId: 1 call (duplicate)
- fetch(chain metadata): 1 HTTP request

ENS Lookups:
- eth_call (ENS): 5 calls (one per recent block miner)

Total: 9 RPC calls + 1 HTTP request
```

### Optimization Potential

**Option 1: Disable ENS on Home Page** (Recommended)
- Add `plain` prop to `DecoratedAddressLink` in `RecentBlocksSectionRest.tsx`
- Saves: 5 ENS calls
- Impact: Miner addresses show as hex instead of ENS names
- Tradeoff: Minimal - most miners don't have ENS anyway

**Option 2: Hardcode Network Config** (Only if always mainnet)
- Set `experimentalFixedChainId: 1`
- Hardcode `chainInfo` in config
- Saves: 2 calls (eth_chainId x2)
- Impact: Skip network detection entirely
- Tradeoff: App won't work on other networks

**Option 3: Cache ENS Results Client-Side**
- Use `useSWRImmutable` for longer TTL (already implemented)
- Add localStorage caching for known addresses
- Saves: Repeat lookups across sessions
- Impact: ENS names load instantly after first lookup
- Tradeoff: Added complexity

---

## Recommended Changes

### 1. Disable ENS Lookups on Home Page ✅ HIGH PRIORITY

**File**: `src/components/RecentBlocksSectionRest.tsx:78`

**Change**:
```tsx
// Before
<DecoratedAddressLink address={block.miner} />

// After
<DecoratedAddressLink address={block.miner} plain />
```

**Impact**:
- Reduces home page API calls by 50%+ (5 fewer calls)
- Improves LCP by ~100-250ms
- No significant UX degradation (most miner addresses don't have ENS)

---

### 2. Consider Hardcoding Chain Info (Optional)

**File**: `src/config.ts` (or wherever config is loaded)

**Change**:
```typescript
export const config: OtterscanConfig = {
  experimentalFixedChainId: 1,  // Only if you ONLY support mainnet
  chainInfo: {
    name: "Ethereum Mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    chainId: 1,
    faucets: [],
    infoURL: "https://ethereum.org"
  }
};
```

**Impact**:
- Saves 2 RPC calls (eth_chainId) + 1 HTTP request
- Faster startup (~50-100ms)

**Warning**: Only use if you're certain the app will ONLY run on Ethereum mainnet

---

### 3. Keep Provider Probing (No Change)

The startup connectivity checks (`eth_blockNumber`, `erigon_getHeaderByNumber`, `ots_getApiLevel`) should **NOT** be removed. They are essential for:
- Detecting incompatible API servers
- Providing clear error messages
- Ensuring required Otterscan patches are present

---

## Summary

### Issues Found:
1. ✅ **Provider probing calls**: Necessary for reliability
2. ⚠️ **Chain info duplication**: Can be optimized with hardcoded config
3. ❌ **ENS lookups on home page**: Unnecessary and slow

### Quick Win:
Add `plain` prop to miner address display in `RecentBlocksSectionRest.tsx` to eliminate 5 ENS calls per page load.

### Expected Improvement:
- **API calls reduced**: 9 → 4 (-55%)
- **LCP improvement**: ~100-250ms faster
- **Better perceived performance**: Fewer network waterfalls

---

## Implementation Steps

1. Add `plain` prop to `DecoratedAddressLink` in `RecentBlocksSectionRest.tsx`
2. Test on mainnet to verify addresses still display correctly
3. (Optional) Add hardcoded chain config if deploying only to mainnet
4. Monitor Lighthouse scores and API call counts
5. Consider adding localStorage caching for frequently looked-up ENS names (future enhancement)

---

## Files to Modify

- ✅ `src/components/RecentBlocksSectionRest.tsx` - Add `plain` prop (line 78)
- ⚠️ `src/config.ts` - Add hardcoded chain info (optional)

No changes needed to:
- `src/useProvider.ts` - Probing is necessary
- `src/useChainInfo.ts` - Required for dynamic network support
- `src/api/address-resolver/` - Works correctly
