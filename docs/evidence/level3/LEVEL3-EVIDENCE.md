# Level 3 Evidence

## A. New Verified Level-3 Infrastructure

- Production URL: `https://suspense-cva-level3.vercel.app`
- Runtime vault: `0x859Ce6E8B6BD0b5426DdA05e16c7BdF1eDD7c4e9`
- Deployment tx: `0xa0c098bcb95b0859fd31561de3d35fd04d1e859316b1772ce4075614704a885b`
- Deployment block: `52304049`
- ChainId: `10143`
- Owner: `0xE60435c0FBe928f3F8ed367Eafb65D955FCF5c06`
- Token: `0xA17EaB812000679FE3C87a0C4a29Cf8A0714A7bD`
- Policy: `0x36489bE45fa84f70a0c2BDB11D824Be608CB12Dd`
- Deployment arm: `CLOSED`
- App write gate: `CLOSED`

## B. Historical Verified Business Lifecycle Evidence

The canonical historical evidence remains distinct from the new runtime:

- Distribution tx: historical canonical evidence only
- Distribution result: `4 PAID + 1 SUSPENDED = 5/5`
- Suspended allocation ID: historical canonical evidence only
- Cleanverse eligibility transition tx: historical canonical evidence only
- Release tx: historical canonical evidence only
- Same allocation ID preserved across suspension and release
- Final historical result: `4 PAID + 1 RELEASED = 5/5`
- Duplicate protection evidence: historical canonical evidence only

## C. Level-3 Limitation

The newly deployed runtime vault was successfully deployed and verified,
but the fresh distribution/release replay was not executed because the
dedicated Level-3 signer does not possess canonical SPNS01 mint authority
or token inventory and the new runtime vault has not yet been provisioned
with the required Cleanverse eligibility state.

## Classification

- `LEVEL3_RUNTIME_INFRASTRUCTURE = PASS`
- `LEVEL3_FRESH_BUSINESS_REPLAY = ACCEPT_WITH_LIMITATIONS`
- `HISTORICAL_BUSINESS_EVIDENCE = PASS`
