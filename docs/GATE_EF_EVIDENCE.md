# Gate E+F Evidence

## Network

- Chain: Monad Testnet
- Chain ID: 10143
- CVA SPNS01: `0xA17EaB812000679FE3C87a0C4a29Cf8A0714A7bD`
- SuspenseVault: `0xA94C6cF70570e0D360D668E0113132c57a6C88E0`
- Cleanverse Policy: `0x36489bE45fa84f70a0c2BDB11D824Be608CB12Dd`

## SuspenseVault deployment

Deployment transaction:
`0x1d9c25ed32ea4666d11bd1a25589663caaaac438a6f023afde96481b3f2d8f97`

Block:
`52004194`

The vault received its own Cleanverse A-Pass:

- cvRecordId: `1929`
- tier: `50`
- A-Pass transaction: `0x473283ff7dd45974e44c0a64209b797b7410f1df6ee2314476e1aa351cfa7e53`

Cleanverse policy check from the vault:

- eligible holder: `ALLOWED | canTransfer=true`
- frozen holder-5: `BLOCKED | APassNotActive`

## Gate E — Partial compliant distribution

Vault funding transaction:
`0x5c4b58ad0725b4cac2a72a17bc588a7d3c6b3613087eb942e22f45e0f8bd070f`

Initial vault balance:
`5.0 SPNS01`

Distribution batch transaction:
`0xc233b0f462ff956d695fb81ba358c2756b9f2aee2c4ff08f4b7f7db3216a3779`

Transaction status:
`1`

Results:

- holder-1: `PAID` — `1.0 SPNS01`
- holder-2: `PAID` — `1.0 SPNS01`
- holder-3: `PAID` — `1.0 SPNS01`
- holder-4: `PAID` — `1.0 SPNS01`
- holder-5: `SUSPENDED` — `1.0 SPNS01`

Suspended allocation ID:
`0x10a3b35d0496c5126a0ccb2d7f09a221dc73af57f372b742ba1d90980f97e0d4`

Vault balance after distribution:
`1.0 SPNS01`

All five allocations remained accounted for:
`4 PAID + 1 SUSPENDED = 5`

Gate E: PASS

## Gate F — Eligibility clears and same allocation releases

Holder-5 Cleanverse A-Pass was reactivated.

Cleanverse update-status transaction:
`0xfc40f6caaf1a30a681b29e6bd691bc24dbdfee71046b99ad83236feee6ccb2d5`

Fresh Cleanverse policy recheck from SuspenseVault:
`canTransfer=true`

Release transaction:
`0x32954d2ac039c0eec8401a6efe00723e34935e94ea8feddb7cd36e4fa531cc31`

The exact same allocation ID was released:
`0x10a3b35d0496c5126a0ccb2d7f09a221dc73af57f372b742ba1d90980f97e0d4`

State transition:
`SUSPENDED (3) -> RELEASED (4)`

Balances:

- holder-5: `0.0 -> 1.0 SPNS01`
- SuspenseVault: `1.0 -> 0.0 SPNS01`

A second release attempt was rejected.

Final state:
`RELEASED (4)`

Holder-5 balance remained:
`1.0 -> 1.0 SPNS01`

Gate F: PASS

## Proven Suspense flow

`READY -> PAID`

or

`READY -> SUSPENDED -> RELEASED`

Cleanverse determines whether value may move.

Suspense preserves the exact entitlement when it cannot move, then releases that same allocation after a fresh Cleanverse eligibility check.
