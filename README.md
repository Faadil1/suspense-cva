# Suspense

**Pay what clears. Hold what doesn’t.**

Compliance-aware coupon distribution for Cleanverse Verified Assets.

Built for the **Cleanverse Build: Trusted Assets Hackathon — RWA Track**.

## Status

In development.

## Core flow

CVI / A-Pass
→ CVA
→ Cleanverse eligibility
→ PAID / SUSPENDED
→ fresh recheck
→ RELEASED

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
- Fresh distribution and release replay is limited because the signer lacks canonical SPNS01 mint authority or token inventory and the new runtime vault has not yet been provisioned with the required Cleanverse eligibility state.
- Evidence package: [`docs/evidence/level3/LEVEL3-EVIDENCE.md`](./docs/evidence/level3/LEVEL3-EVIDENCE.md)
