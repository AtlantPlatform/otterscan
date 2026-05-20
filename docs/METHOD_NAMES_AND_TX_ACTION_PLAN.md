# Method Names & Transaction Action — Implementation Plan

Two related gaps in how ethscan.org displays transaction semantics, and the work to close them.

## Problem 1 — Method column shows "Transfer" for everything

### Root causes (three layers)

1. **Backend bug** (`api/server.js`). JSON-RPC `eth_getBlockByNumber` returns each tx's calldata in the field `input`, not `data`. Three endpoints map it as `data: tx.data || '0x'`, which is always falsy, so every tx ships to the frontend with `data: "0x"`. Verified live against `/api/transactions/recent`: a USDT call returns `"data":"0x"`.
   - Lines 281, 377, 459.
   - Line 652 already has the correct fallback `tx.input || tx.data || '0x'` — use that pattern.

2. **Frontend signature lookup gutted** (`src/use4Bytes.ts`). `use4Bytes()` was stubbed to `return null` (line 101) — the SWR fetcher just above it (`fourBytesFetcher`, lines 41–82) is intact but unused. So even when `data` arrives, no name resolution happens.

3. **Pages bypass `<MethodName/>`** (`src/pages/RecentTransactionsRest.tsx:205–207`, `src/components/RecentTransactionsSectionSSR.tsx:28–41`). Both inline a `isSimpleTransfer ? "transfer" : rawSelector` simplification instead of using the shared `<MethodName/>` component. So even if `use4Bytes` worked, these two pages wouldn't benefit.

### Fix

- **Backend**: change `tx.data` → `tx.input || tx.data` in the three offending mappers. Restart the API server.
- **`use4Bytes.ts`**: replace the stub body of `use4Bytes()` with a real `useSWRImmutable` call against `fourBytesFetcher`, keyed by `["4bytes", rawFourBytes]`. Use `assetsURLPrefix` from `RuntimeContext` (same pattern the fetcher factory already expects).
- **Pages**: in `RecentTransactionsRest.tsx`, replace the inline `methodLabel` block with `<MethodName data={tx.data} to={tx.to} />`. In `RecentTransactionsSectionSSR.tsx`, replace `getMethodDisplay` similarly — *but* this is an SSR component, so it must render synchronously without `useSWRImmutable` suspension. Options:
  - (a) Keep the SSR component minimal (just `"Transfer"` / selector hex), and let client-side hydration upgrade it via a separate non-SSR variant.
  - (b) Render `<MethodName/>` only after hydration via a `useIsClient` guard; show selector hex during SSR.
  - **Decision**: (b). Avoids extra components and keeps the SSR HTML stable.

### Out of scope for v1

- Sourcify-verified-contract ABI lookup to produce labels like "Mint Public" or "Exec Transaction" (Etherscan's richer naming). The 4byte directory gives lowercase function names (`mintPublic`, `execTransaction`). Good enough for v1; revisit if needed.

---

## Problem 2 — No "Transaction Action" summary

Etherscan shows a one-line semantic summary at the top of each tx page, e.g. *"Swap 0.0057 ETH ($12.20) for 1,139.12 ENX ($12.43) on Uniswap V2"*. We render none.

### Approach

A pure function `summarizeTx(txData, tokenMeta) → Action[]` over the tx's receipt logs, plus a `<TransactionAction/>` component placed above the existing details grid in `src/execution/transaction/Details.tsx`.

### v1 decoder coverage

Limit scope to the highest-volume cases. Each decoder is ~30 lines.

1. **ERC-20 transfer** — `Transfer(address,address,uint256)` log on a token contract. Symbol/decimals from existing token metadata hooks.
2. **ERC-721 transfer / mint** — same topic, but indexed `tokenId` (3 topics). Mint when `from == 0x0`.
3. **WETH wrap / unwrap** — `Deposit(address,uint256)` and `Withdrawal(address,uint256)` on the canonical WETH contract.
4. **Uniswap V2 swap** — `Swap(sender, amount0In, amount1In, amount0Out, amount1Out, to)` on a UniV2-style pair. Look up token0/token1 from the pair contract (cached). Normalize WETH↔ETH.
5. **Uniswap V3 swap** — `Swap(sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick)` on a UniV3 pool.

Pick the *primary* action per tx (e.g. a swap dominates the dozen Transfer logs it emits). Heuristic: prefer Swap > WETH wrap/unwrap > ERC-721 mint > ERC-20 transfer > nothing.

### Out of scope for v1

- USD prices. Etherscan's `($12.20)` annotations need a historical price oracle per token. Defer.
- Curve, Aave, Seaport, Safe multisig, ENS, etc. Add later as the framework proves out.
- Router identification ("on Uniswap V2") — v1 hardcodes the dex name from which decoder matched; no router-address resolution.

### File layout

```
src/execution/transaction/action/
  TransactionAction.tsx          # presentation
  summarize.ts                   # pure summarizeTx()
  decoders/
    erc20Transfer.ts
    erc721Transfer.ts
    wethWrap.ts
    uniV2Swap.ts
    uniV3Swap.ts
  topics.ts                      # event-topic constants
```

### Integration point

`src/execution/transaction/Details.tsx`: render `<TransactionAction txData={txData} />` immediately above the existing `<ContentFrame>`/grid. Component returns `null` when no action matches — no visual regression.

---

## Implementation order

1. Backend `tx.input` fix (1 file, 3 lines). Smallest, unblocks everything else.
2. `use4Bytes` un-stub.
3. Swap inline method rendering for `<MethodName/>` in the two listing pages.
4. Manual verify: `/txs` and homepage now show varied method names.
5. `TransactionAction` scaffolding + ERC-20 decoder + render in Details.
6. Add Uniswap V2/V3 swap decoders, then WETH, then ERC-721.
7. Manual verify on the screenshot's example tx (`0xdfb309…74951e`, a UniV2 swap).

## Non-goals (explicit)

- USD prices anywhere.
- Sourcify ABI-based method labels (will use plain 4byte names).
- Per-protocol router branding beyond the five v1 decoders.
- Backwards compatibility with the inline `methodLabel` code — replace it outright.
