# Suspense

**Pay what clears. Hold what doesnâ€™t.**

Compliance-aware coupon distribution for Cleanverse Verified Assets.

Built for the **Cleanverse Build: Trusted Assets Hackathon â€” RWA Track**.

## Status

In development.

## Core flow

CVI / A-Pass
â†’ CVA
â†’ Cleanverse eligibility
â†’ PAID / SUSPENDED
â†’ fresh recheck
â†’ RELEASED

## Hero Demo

One tokenized bond coupon distribution.

Four holders clear Cleanverse eligibility and are paid.

One holder cannot receive the asset yet, so the exact allocation remains accounted for as `SUSPENDED`.

After a fresh Cleanverse eligibility check succeeds, the same allocation is `RELEASED`.

## Current focus

Cleanverse integration spike and live sandbox validation.

See [`SPIKE-CHECKLIST.md`](./SPIKE-CHECKLIST.md) for the current gates.

## Verified Evidence

- The production host is a real Monad Testnet deployment.
- The historical Gate E to Gate F lifecycle remains a reconstruction of verified receipts, kept distinct from the new runtime vault.
- The Level-3 runtime vault was deployed and verified separately at the new production address.
- Live `status` and `eligibility` checks resolve the configured runtime vault dynamically.
- Evidence package: [`docs/evidence/level3/LEVEL3-EVIDENCE.md`](./docs/evidence/level3/LEVEL3-EVIDENCE.md)

<!-- LEVEL3_FINAL_BEGIN -->

## Level 3 Final Status

Suspense Level 3 is fully verified on Monad Testnet.

### Final runtime

- Runtime token: **SPNS03** — `0xEE4B42402219d49Fa3Ea05562d8096A9Afa20A04`
- Runtime vault: `0x8a6EA0AeB5b65f99e0ABf077F46D5e465b33F7C4`
- Cleanverse policy: `0x36489bE45fa84f70a0c2BDB11D824Be608CB12Dd`
- Chain: Monad Testnet (`10143`)
- Production: `https://suspense-cva-level3.vercel.app`
- Production write gate: `CLOSED`

### Fresh Level-3 business replay

The fresh SPNS03 execution is complete:

1. `5.0 SPNS03` minted to the dedicated runtime vault.
2. One `distribute()` created five allocations.
3. Holders 1–4 cleared policy and became `PAID`.
4. Holder 5 was blocked by Cleanverse and became `SUSPENDED`.
5. Holder 5 was restored to an active/allowed Cleanverse state.
6. The **same Holder 5 allocation** was released.
7. Final state: **4 PAID + 1 RELEASED = 5/5 accounted**.
8. Duplicate release protection was verified.

Canonical fresh transactions:

- Mint: `0xfa522a34a7351976ffe1318b00b06451f9eceaa70a791a32647a2bbba8173314`
- Distribute: `0x1fbd3fb0cef2607ac8d4d4a7daffb82b2a8ef3d127a294ef25d643a1182f06d2`
- Release: `0x21ab0250fd0076a5036e3035f37b344acba0c91ef5234bfb51c77d40c7973f61`

Final classification:

- `LEVEL3_RUNTIME_INFRASTRUCTURE=PASS`
- `LEVEL3_FRESH_BUSINESS_REPLAY=PASS`
- `LEVEL3_PRODUCTION_RUNTIME=PASS`
- `HISTORICAL_BUSINESS_EVIDENCE=PASS`

The original SPNS01 deployment and historical SuspenseVault remain preserved strictly as historical evidence. They are not the current production runtime.

<!-- LEVEL3_FINAL_END -->
