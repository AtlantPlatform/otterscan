# Plan: Server-side resolution of method names and Transaction Actions

Today the action bar and method-name badges are decoded client-side after
hydration, which gives a noticeable flicker on tx pages and leaves the
resolved labels out of the SSR HTML (so crawlers see selector hex instead of
`Swap`/`transfer`/`Exec Transaction`). This document scopes the work to move
that resolution onto the backend.

## What needs to be resolved

| Lookup                        | Input            | Cacheability                    | Today                                            |
| ----------------------------- | ---------------- | ------------------------------- | ------------------------------------------------ |
| 4byte selector → method name  | `0xabcdef12`     | Immutable (forever)             | Client SWR → local mirror + live 4byte.directory |
| ERC-20 token metadata         | token address    | Very high (rarely changes)      | Client SWR → `/api/tokens/:addr`                 |
| Uniswap V2/V3 pool token0/1   | pool address     | Immutable (forever)             | Client SWR → `eth_call` via `/api/rpc`           |
| Sourcify-verified method name | contract address | High (per-contract, persistent) | Client fetch → `repo.sourcify.dev`               |
| EIP-7702 authority recovery   | signature        | Per-tx (one-shot)               | Already backend ✓                                |
| Curated address labels        | address          | Static                          | Frontend `labels.ts` (already SSR-safe)          |

Authority recovery and curated labels are already SSR-resolved. The remaining
four are async client lookups today.

## Design

Three layers, smallest first.

### 1. Pre-resolve method names in listing payloads (highest SEO win)

Listings render 25–30 txs each. Each method badge is just `selector → name`.

- New backend module `api/lookups/signatures.js` exposing
  `resolveSelector(selBareHex): Promise<string | null>`.
  - Tries an in-process LRU first.
  - Falls back to the local `/signatures/` mirror (read from disk in
    Dockerised prod, proxied to ethscan.org in dev — re-use the existing
    `ASSETS_PROXY_URL`).
  - Falls back to `https://www.4byte.directory/api/v1/signatures/`.
  - Caches positive and negative results (negative TTL ~1h so a delayed
    mirror sync eventually picks up new selectors).
  - Hard timeout per lookup (200ms) so a slow upstream can't stall the
    listing response.
- In `/api/transactions/recent` and `/api/blocks/:n/transactions`, run
  `resolveSelector` for every tx in parallel after the existing
  transformation pass, attach `methodName: string | null` to each tx
  payload.
- Same treatment for the address-tx lists (`/api/addresses/:addr/...`) if
  they exist.

Frontend:

- `src/api/client.ts` — add `methodName?: string | null` to the listing
  response types.
- `src/components/MethodName.tsx` — accept an optional `name?: string | null`
  prop. When provided, skip the `useMethodSelector` SWR call entirely and
  render the name directly. Behaviour for the existing callsites (tx detail,
  decoder) is unchanged.
- `src/pages/RecentTransactionsRest.tsx`,
  `src/components/RecentTransactionsSectionSSR.tsx`,
  `src/execution/BlockTransactionsSSR.tsx`: pass `name={tx.methodName}` to
  `<MethodName />`.

Result: method column is in the SSR HTML, no client SWR roundtrip on
listings, search engines see actual names.

### 2. Pre-resolve the Transaction Action on tx detail (kills the flicker)

The synchronous decoder (`decodeActions` + `pickPrimaryAction`) is already
pure; the slow part is the decoration with token symbols / pool tokens /
method names. Move that decoration backend-side.

- Port the decoder to a shared module — `src/execution/transaction/action/
  summarize.ts` is already pure ESM, but ships under `src/`. Either:
  - (a) Extract `summarize.ts`, `topics.ts`, and the helper pieces into a
    `shared/` directory that both `api/` and `src/` import (cleaner, but
    requires Vite ssr-externals + a small tsconfig tweak), or
  - (b) Duplicate the decoder into `api/lookups/decodeActions.js` and add a
    Jest test pinning the two against each other to prevent drift.
  - Pick (a) if we expect to add more shared logic; (b) is fine for now.
- New backend module `api/lookups/resolveAction.js`:
  - `resolveAction(tx, logs): Promise<ResolvedAction | null>`
  - Calls the shared `decodeActions` + `pickPrimaryAction`.
  - Decorates the picked action:
    - ERC-20/721 transfer + approve → `tokenMeta(token)` (symbol, decimals)
    - Swap → `poolTokens(pool)` then `tokenMeta(token0)` + `tokenMeta(token1)`
    - Implements the existing `showCallInstead` heuristic; when it fires,
      resolves the method name (4byte + Sourcify) and falls back gracefully.
- `api/lookups/tokenMeta.js`, `api/lookups/poolTokens.js`, `api/lookups/
  sourcify.js`: one file per lookup; each backed by the same LRU + TTL
  pattern as `signatures.js`. The current `/api/tokens/:address` handler
  already does the eth_calls; lift its body into `tokenMeta.js` and have the
  HTTP handler delegate, so the cache benefits both flows.
- `/api/transactions/:hash` response gains a `resolvedAction:
  ResolvedAction | null` field.

Frontend:

- New shared type `ResolvedAction` mirroring what `TransactionActionLite`
  already renders.
- `TransactionActionLite` accepts an optional `resolvedAction` prop. When
  set, render directly (no SWR). When unset (e.g. for the still-runtime
  `TransactionAction` in `Details.tsx`), keep current behaviour.
- `TransactionSSR.tsx` passes `tx.resolvedAction` to the lite component.

Result: the action bar is in the SSR HTML with full labels — `Swap 0.00199
ETH for 983.93 STONK on Uniswap V2`, not `Swap on Uniswap V2 (0xe0A08f…)`.

### 3. Cache infrastructure

One file: `api/lookups/cache.js`.

- `lru-cache` (already a transitive dep of express-y projects, or pull it in
  fresh — small).
- One LRU per lookup, sized for the working set:
  - selectors: ~5k entries, no TTL
  - token metadata: ~5k entries, 24h TTL
  - pool tokens: ~5k entries, no TTL (immutable)
  - sourcify ABIs: ~1k entries, 24h TTL
  - negative cache: ~5k entries, 1h TTL (own LRU per lookup type)
- Optional `cache.persist()` writes the maps to a JSON file on graceful
  shutdown; `cache.load()` reads it on startup. v1 can skip and rely on
  in-memory only; revisit if cold-start latency becomes a problem.

### 4. Warmer (optional, defer)

On boot, preload:

- The 50 most common selectors (transfer, approve, swap, multicall…).
- Token metadata for every address in `src/execution/transaction/action/
  labels.ts` that is plausibly an ERC-20 (the stables + LSTs + WETH list).

Not blocking — improves cold-start request latency only.

## Schema additions

```ts
// src/api/client.ts (and the existing recent-tx types)

interface RestTransaction {
  // …existing fields…
  methodName?: string | null; // (1)
}

// New on the single-tx response:
interface SingleTx {
  // …existing fields…
  resolvedAction?: ResolvedAction | null; // (2)
}

type ResolvedAction =
  | { kind: "swap"; protocol: "Uniswap V2" | "Uniswap V3";
      pool: string;
      tokenIn: { address: string; symbol: string; decimals: number };
      tokenOut: { address: string; symbol: string; decimals: number };
      amountIn: string;  // decimal string (cannot send bigint as JSON)
      amountOut: string; }
  | { kind: "erc20-transfer";
      token: { address: string; symbol: string; decimals: number };
      from: string; to: string; value: string; }
  | { kind: "erc721-transfer";
      token: string; from: string; to: string; tokenId: string;
      isMint: boolean; }
  | { kind: "weth-wrap"  | "weth-unwrap"; weth: string;
      account: string; value: string; }
  | { kind: "approve";
      token: { address: string; symbol: string; decimals: number };
      spender: string; owner: string; value: string; }
  | { kind: "call";
      method: string; selector: string; from: string; to: string; }
  | { kind: "eip7702";
      authorizations: Array<{ authority: string | null;
                              address: string; chainId: number;
                              nonce: number }>; }
  | { kind: "native-transfer";
      from: string; to: string; value: string; };
```

Bigints crossing the JSON boundary use decimal strings; the frontend already
does `BigInt(...)` on hex values for the receipt logs, same pattern.

## Risks

- **Decoder drift between server and client.** If we duplicate
  `decodeActions`, a fix in one place must be mirrored. Mitigate by
  extracting the decoder into a shared module (option (a) above) or pinning
  with a Jest test against a fixed log set.
- **Tail latency on uncached lookups.** Sourcify and 4byte.directory can be
  slow. Each lookup must have a hard timeout (200–300ms) and a negative
  cache. The endpoint must never wait synchronously on Sourcify for a
  listing — if it can't resolve in 200ms, return `methodName: null` and let
  the client SWR layer pick up the slack.
- **Hydration mismatch.** Whatever the server resolves must be exactly what
  the client would produce given the same inputs. Use the same decoder
  module on both sides, and don't enrich the action with any
  block-state-dependent data (e.g. live USD prices).
- **Cache poisoning.** A bad signature in the local mirror or a malicious
  4byte.directory entry could mislabel txs. Mitigate by always preferring
  Sourcify's contract-specific name over the global 4byte name *when both
  exist for the same selector at that contract* (already what the current
  client code does).
- **Memory growth.** With unbounded selectors + Sourcify ABIs the LRUs are
  fine; tokens and pools are bounded by the on-chain set we actually see.
  Cap each LRU explicitly.

## Phasing & estimate

| Phase | Scope                                              | Estimate |
| ----- | -------------------------------------------------- | -------- |
| 1     | Listings get pre-resolved method names             | ~1 day   |
| 2     | Tx detail page gets pre-resolved action            | ~1.5 days |
| 3     | Backend cache module + LRUs + negative caching     | folded into 1+2 |
| 4     | Warmer + persistent cache                          | ~0.5 day, deferrable |

Phase 1 ships SEO benefit on its own. Phase 2 is the visible flicker fix.

## Non-goals

- USD price annotations (separate epic; needs historical oracle).
- A general "labels" service beyond what `labels.ts` already provides.
- Per-route React Query prefetch wiring for sub-resources. The point of
  embedding resolved data directly in the tx payload is to *avoid* that.
- Eviction-aware cache stampede protection. Not worth it for the traffic
  profile; if it becomes a problem, single-flight per key is one short add.
