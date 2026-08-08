# Gate B Evidence — A-Pass Provisioning

Date: 2026-08-08
Environment: Cleanverse UAT
Chain: Monad

## Result

A-Pass provisioning succeeded for all five Suspense sandbox recipients using `POST /generate_apass`.

All five records returned Cleanverse response code `0000` and tier `50`.

| Holder | Country | Wallet | CV Record | Tier | Cleanverse txHash |
|---|---|---|---:|---:|---|
| holder-1 | CA | `0x7Af35af23cD7d8555ac5Fc6DfFc13D5228D65dCf` | 1894 | 50 | `0x4550abaa75e629e99d37d00c3544fbf833fc07b1393961cc926a8bf607ec7f0c` |
| holder-2 | CA | `0x067d4E3E6806c2bEd1D140574993a28259fCB85E` | 1895 | 50 | `0x9921a1ae52ac3abf63cacb7a209da8be94535d7f052d3694fd9ca0fa09eaedf8` |
| holder-3 | CA | `0xC222E51b1F456F51aDF2598ed7450A4ec6372752` | 1896 | 50 | `0xe1261c1593c9aa1b399145f804cf28508a34319f39045bffa13ab6d8a91cfea3` |
| holder-4 | CA | `0xc06Fc03A3701Ce5EFe3CE5C0052FaE6797Db69EC` | 1897 | 50 | `0xba986a948d8315a4bff7aaf098095a9b7b3c349f87ea58984709c87c90534f3e` |
| holder-5 | US | `0x4065D109d7A008107257113D8EED7607d965513f` | 1898 | 50 | `0xace169fd01dd759aed3a005e926f4d79489a0fe904f2c12d48fc0f7d023f18b4` |

## Intended contrast

The five wallets deliberately share the same observed Cleanverse tier (`50`). The next CVA issuance spike uses a country allow-list rule for `CA`, so the planned eligibility contrast is policy-driven:

- holder-1 through holder-4: CA → expected eligible
- holder-5: US → expected ineligible

This contrast is not yet claimed as proven. It becomes proven only after the CVA is issued and Cleanverse returns different eligibility results against the same asset/policy.

## Gate status

- Gate A — API/auth: PASS
- Gate B1 — A-Pass provisioning: PASS
- Gate B2 — same-CVA eligibility contrast: PENDING
