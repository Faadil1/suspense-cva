# Gate C+D Evidence

## Network

- Chain: Monad Testnet
- Chain ID: 10143
- CVA: `0xA17EaB812000679FE3C87a0C4a29Cf8A0714A7bD`
- Cleanverse Policy: `0x36489bE45fa84f70a0c2BDB11D824Be608CB12Dd`

## Gate C — Cleanverse policy enforcement

Source A-Pass holder:
`0x7Af35af23cD7d8555ac5Fc6DfFc13D5228D65dCf`

Eligible recipient:
`0x067d4E3E6806c2bEd1D140574993a28259fCB85E`

Result:
`ALLOWED | canTransfer=true`

Suspended recipient:
`0x4065D109d7A008107257113D8EED7607d965513f`

Result:
`BLOCKED | revert=0x322fde890000000000000000000000004065d109d7a008107257113d8eed7607d965513f`

Gate C: PASS

## Gate D — CVA-level transfer enforcement

Mint transaction:
`0xfe00e8f7ae0780117c7f332bba7b8ee95b1971b98708c8bfd38bec43446fb698`

Blocked transfer transaction:
`0x1917bec33ac496bffa73b30eca5e7d5a9de65c796e9f5e5f705717f74044fe3f`

Transaction status:
`0`

Balances remained unchanged:

- holder-1: `10.0 SPNS01 -> 10.0 SPNS01`
- holder-5: `0.0 SPNS01 -> 0.0 SPNS01`

Gate D: PASS

## Interpretation

Cleanverse determines whether the transfer is permitted.

Suspense will treat both `canTransfer == false` and Cleanverse policy reverts as a non-transferable allocation and preserve that entitlement as `SUSPENDED` rather than reverting the entire distribution batch.
