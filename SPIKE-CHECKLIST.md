# Suspense — Cleanverse Spike Checklist

## Gate A — Connectivity / Auth
- [ ] Sandbox URL reachable
- [ ] `api-id` accepted
- [ ] No credential copied into source or Git

## Gate B — Real identity contrast
- [ ] Wallet A returns a real Cleanverse eligible outcome
- [ ] Wallet B returns a real Cleanverse ineligible outcome
- [ ] Same A-Token/CVA and policy used for both
- [ ] Raw Cleanverse responses captured

## Gate C — On-chain policy
- [ ] Real CVA/A-Token address known
- [ ] Policy contract address known
- [ ] `canTransfer` path confirmed in sandbox
- [ ] Eligible and ineligible wallets produce contrasting on-chain outcomes

## Gate D — CVA enforcement
- [ ] Eligible transfer succeeds
- [ ] Ineligible transfer is blocked by Cleanverse/CVA enforcement
- [ ] No app-side boolean is used as a substitute for the compliance decision

## Gate E — Suspense lifecycle
- [ ] One coupon batch contains 5 allocations
- [ ] 4 allocations become `PAID`
- [ ] 1 allocation becomes `SUSPENDED`
- [ ] Suspended allocation keeps the same allocation ID
- [ ] Suspended amount remains exactly preserved
- [ ] Total distribution remains fully accounted for

## Gate F — Recovery
- [ ] Fresh Cleanverse eligibility recheck performed
- [ ] Previously suspended wallet becomes eligible through a verified mechanism
- [ ] Same allocation ID becomes `RELEASED`
- [ ] Same preserved amount is transferred
- [ ] Second release attempt cannot pay twice

## Stop rule
Do not build the polished UI until Gates A and B are proven with live Cleanverse responses.

Do not claim on-chain enforcement until Gate C/D is proven in the actual sandbox environment.
