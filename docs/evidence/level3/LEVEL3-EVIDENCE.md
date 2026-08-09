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
That original SPNS01 limitation is historical and superseded. The final SPNS03 runtime completed the full fresh Level-3 business replay.

## D. Fresh Level-3 Business Replay

The earlier SPNS01 runtime limitations are superseded by the final SPNS03
execution path.

### Final runtime infrastructure

- Token: `SPNS03`
- Token address: `0xEE4B42402219d49Fa3Ea05562d8096A9Afa20A04`
- Token decimals: `6`
- Runtime vault: `0x8a6EA0AeB5b65f99e0ABf077F46D5e465b33F7C4`
- Cleanverse policy: `0x36489bE45fa84f70a0c2BDB11D824Be608CB12Dd`
- Runtime owner/admin: `0xc8D2A86a4C7Abb08B7328E2cB67d3A8C18E02049`
- Chain ID: `10143`

SPNS03 issuance:

- Request ID: `IA20260810034513479160`
- Issuance transaction:
  `0xb6b10c69b9d664c81f890d8742fd2e36282dfbf5e625abfdad3db40ed3d8d3ac`

MINTER_ROLE grant:

- Transaction:
  `0xdd84f3bb13e429c63099486b6ca881f4e43b1ca4ebf302e59680b925efd8d5ba`

Final SuspenseVault deployment:

- Transaction:
  `0x4d1186c66ad0d2129442f47c3db22edb5031f4f08f80f902c7063f8bcf9dc807`
- Block: `52322353`

### Cleanverse preparation

The final SPNS03 token used two whitelist country rules:

- Canada
- United States

US-rule transaction:

`0x6405591916e6933501cfaf7838ca93bbaab80d74a34d531b510674fe73eddd9b`

The final runtime vault received an active Cleanverse A-Pass before the
fresh token execution.

Holder 5 was then temporarily changed from active/allowed to blocked for
the suspension proof, and subsequently restored to active/allowed before
release.

### Fresh mint

Exactly `5,000,000` raw SPNS03 units (`5.0 SPNS03`) were minted to the
final runtime vault.

Transaction:

`0xfa522a34a7351976ffe1318b00b06451f9eceaa70a791a32647a2bbba8173314`

After mint:

- total supply: `5,000,000`
- vault balance: `5,000,000`
- holder balances: `0`

### Fresh distribution

Exactly one `distribute()` transaction was submitted for five allocations:

`0x1fbd3fb0cef2607ac8d4d4a7daffb82b2a8ef3d127a294ef25d643a1182f06d2`

Block:

`52324424`

Result:

- Holder 1: `PAID`
- Holder 2: `PAID`
- Holder 3: `PAID`
- Holder 4: `PAID`
- Holder 5: `SUSPENDED`

Accounting:

- `PAID_COUNT=4`
- `SUSPENDED_COUNT=1`
- `ACCOUNTED_COUNT=5`
- Hero state: `4_PAID_PLUS_1_SUSPENDED`

Holder 5 canonical allocation ID:

`0x7de001baef2d6e212462ac732bd84c1fbaa19f3a6ef63a376010332aa88c1856`

### Fresh release

After Holder 5 returned to an active/allowed Cleanverse state, the same
suspended allocation was released exactly once.

Transaction:

`0x21ab0250fd0076a5036e3035f37b344acba0c91ef5234bfb51c77d40c7973f61`

Block:

`52324821`

Final allocation states:

- Holder 1: `PAID`
- Holder 2: `PAID`
- Holder 3: `PAID`
- Holder 4: `PAID`
- Holder 5: `RELEASED`

Final balances:

- runtime vault: `0`
- Holder 1: `1,000,000`
- Holder 2: `1,000,000`
- Holder 3: `1,000,000`
- Holder 4: `1,000,000`
- Holder 5: `1,000,000`

Final accounting:

- `PAID_COUNT=4`
- `RELEASED_COUNT=1`
- `SUSPENDED_COUNT=0`
- `ACCOUNTED_COUNT=5`
- Hero final state: `4_PAID_PLUS_1_RELEASED`
- Duplicate release protection: `PASS`
- Fresh business replay: `PASS`

No additional mint, distribute, or release transaction is required.

## Classification

- `LEVEL3_RUNTIME_INFRASTRUCTURE = PASS`
- `LEVEL3_FRESH_BUSINESS_REPLAY = PASS`
- `HISTORICAL_BUSINESS_EVIDENCE = PASS`

<!-- LEVEL3_FINAL_PRODUCTION_BEGIN -->

## Final Production Runtime

The verified SPNS03 runtime was promoted to the canonical production
deployment after staged validation.

Vercel deployment:

- Deployment ID:
  `dpl_A6cUCTu1i47NvSNGSDs5k1jTrzE1`
- Immutable deployment URL:
  `https://suspense-cva-level3-oxfc4oe8q-faadil1s-projects.vercel.app`
- Canonical production domain:
  `https://suspense-cva-level3.vercel.app`

Production verification:

- `/api/status`: `PASS`
- `/api/eligibility`: `PASS`
- root page: `PASS`
- chain ID: `10143`
- runtime symbol: `SPNS03`
- runtime token:
  `0xEE4B42402219d49Fa3Ea05562d8096A9Afa20A04`
- runtime vault:
  `0x8a6EA0AeB5b65f99e0ABf077F46D5e465b33F7C4`
- vault balance: `0`
- Holder 1 eligibility: `ALLOWED`
- Holder 2 eligibility: `ALLOWED`
- Holder 3 eligibility: `ALLOWED`
- Holder 4 eligibility: `ALLOWED`
- Holder 5 eligibility: `ALLOWED`
- production write gate: `CLOSED`

The historical SPNS01 token and historical vault remain preserved as
historical evidence only and are not represented as the current runtime.

### Final Level-3 classification

`LEVEL3_RUNTIME_INFRASTRUCTURE=PASS`

`LEVEL3_FRESH_BUSINESS_REPLAY=PASS`

`LEVEL3_PRODUCTION_RUNTIME=PASS`

`HISTORICAL_BUSINESS_EVIDENCE=PASS`

<!-- LEVEL3_FINAL_PRODUCTION_END -->
