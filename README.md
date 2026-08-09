# SUSPENSE

**Pay what clears. Hold what doesn’t.**

Compliance-aware settlement infrastructure built with **Cleanverse CVI/CVA** on **Monad Testnet**.

Suspense lets eligible allocations settle immediately while preserving blocked payment intent as `SUSPENDED`. If eligibility later changes, the **same allocation** is checked again and can continue to `RELEASED`.

Built for the **Cleanverse Build: Trusted Assets Hackathon — RWA Track**.

## Quick links

- **Live demo:** https://suspense-cva-level3.vercel.app
- **Demo video:** https://youtu.be/9JKWNrdmHho
- **Network:** Monad Testnet (`chainId 10143`)
- **Evidence:** [`docs/evidence/level3/LEVEL3-EVIDENCE.md`](./docs/evidence/level3/LEVEL3-EVIDENCE.md)

---

## The problem

Compliance-sensitive settlement is often treated as an all-or-nothing batch.

If one recipient cannot receive an asset, teams are commonly forced to either:

1. stop the whole batch, or
2. move the blocked payment into an off-chain exception process.

Both approaches create unnecessary friction. The compliant majority is delayed, while the blocked obligation becomes harder to track and audit.

Suspense asks a different question:

> **What if the payments that are allowed could clear now, while the blocked payment remained fully accounted for until policy allows it to continue?**

---

## The Suspense model

Each allocation has its own settlement lifecycle.

```text
READY ───────────────→ PAID

READY → SUSPENDED → fresh policy recheck → RELEASED
```

`RELEASED` is intentionally **not** rewritten as `PAID`.

The distinction preserves the real settlement history: the allocation was blocked, held, re-evaluated, and then released.

### Core proof

| Moment | Result | Accounting |
|---|---|---|
| Initial distribution | **4 PAID + 1 SUSPENDED** | **5 / 5 accounted** |
| After fresh eligibility recheck | **4 PAID + 1 RELEASED** | **5 / 5 accounted** |

**Same allocation. Fresh eligibility. No lost payment intent.**

---

## How Cleanverse is integrated

Cleanverse is not a decorative compliance label in Suspense. Its policy decision directly controls settlement state transitions.

### 1. CVI / identity eligibility

The five-holder demo cohort is associated with Cleanverse identity / A-Pass records. Recipient eligibility therefore becomes an input to settlement behavior.

### 2. CVA / asset policy

The runtime asset is **SPNS03**, governed by the Cleanverse policy used by the application and settlement vault.

Before a transfer decision, Suspense evaluates the live on-chain policy through:

```text
IATokenPolicy.canTransfer(
  token,
  runtimeVault,
  recipient,
  amount
)
```

### 3. Policy result becomes settlement state

```text
ALLOWED  → settlement may proceed
BLOCKED  → allocation becomes SUSPENDED
UNKNOWN  → fail closed; never presented as compliance BLOCKED
```

This means a compliance decision changes what the settlement contract is allowed to do.

### 4. Release requires a fresh check

A suspended allocation cannot be released because it *used to* be eligible or because an operator manually overrides it.

Suspense performs a **fresh policy check**. Only a current `ALLOWED` result can advance that same allocation from `SUSPENDED` to `RELEASED`.

---

## What the verified Level-3 execution proves

The fresh SPNS03 execution was completed on Monad Testnet:

1. `5.0 SPNS03` was minted to the dedicated runtime vault.
2. One `distribute()` created five fresh allocations.
3. Holders 1–4 cleared policy and became `PAID`.
4. Holder 5 was blocked by Cleanverse and became `SUSPENDED`.
5. The blocked value remained in the vault and the allocation ID remained unchanged.
6. Holder 5 later returned to an allowed Cleanverse state.
7. Suspense performed a fresh eligibility check.
8. The **same Holder 5 allocation** advanced to `RELEASED`.
9. The runtime vault returned to zero.
10. Duplicate release protection was verified.

### Canonical fresh transactions

- **Mint:** `0xfa522a34a7351976ffe1318b00b06451f9eceaa70a791a32647a2bbba8173314`
- **Distribute:** `0x1fbd3fb0cef2607ac8d4d4a7daffb82b2a8ef3d127a294ef25d643a1182f06d2`
- **Release:** `0x21ab0250fd0076a5036e3035f37b344acba0c91ef5234bfb51c77d40c7973f61`

---

## Runtime

| Component | Canonical value |
|---|---|
| Network | Monad Testnet |
| Chain ID | `10143` |
| Asset | `SPNS03` |
| Token | `0xEE4B42402219d49Fa3Ea05562d8096A9Afa20A04` |
| Runtime vault | `0x8a6EA0AeB5b65f99e0ABf077F46D5e465b33F7C4` |
| Cleanverse policy | `0x36489bE45fa84f70a0c2BDB11D824Be608CB12Dd` |
| Production | https://suspense-cva-level3.vercel.app |

Final Level-3 classification:

- `LEVEL3_RUNTIME_INFRASTRUCTURE=PASS`
- `LEVEL3_FRESH_BUSINESS_REPLAY=PASS`
- `LEVEL3_PRODUCTION_RUNTIME=PASS`
- `HISTORICAL_BUSINESS_EVIDENCE=PASS`

---

## What the production UI shows

The production experience is called the **Settlement Chamber**.

It deliberately separates different kinds of truth so the viewer can tell what is happening now from what has already been verified.

### Live System

Reads current Monad Testnet state and current Cleanverse policy results.

The public surface can show the current five-holder eligibility state without claiming that those current results rewrite the verified settlement history.

### Verified Execution

Replays the already verified Level-3 lifecycle:

```text
4 PAID + 1 SUSPENDED
        ↓
fresh eligibility recheck
        ↓
4 PAID + 1 RELEASED
```

This replay is presentation-only; the underlying proof comes from the canonical on-chain transactions above.

### Execution Ledger

Surfaces the verified mint, distribute and release receipts so the settlement story can be checked against on-chain evidence.

### Operator Write Lane

The UI also contains a guarded operator surface designed around:

```text
READ → OPERATOR → ARMED WRITE
```

Controls include:

- authenticated operator sessions;
- dry-run-first simulation;
- explicit short-lived write arming;
- separate confirmation before a broadcast;
- runtime-vault and signer readiness checks;
- replay protection;
- fail-closed policy handling.

The **submission video shows this operator path as a dry run / no broadcast demonstration**. Verified blockchain execution is shown separately through the evidence ledger and the Level-3 receipts.

---

## Reality classes: what is live and what is evidence?

| Surface | Meaning |
|---|---|
| **Live policy state** | Current on-chain `canTransfer()` reads on Monad Testnet |
| **Verified execution** | Replay of the completed fresh SPNS03 Level-3 execution |
| **Execution ledger** | Canonical on-chain transaction evidence |
| **Operator dry run** | Simulation only; no signing or broadcast |
| **Historical `/demo/`** | Original SPNS01 evidence reconstruction, explicitly historical |

The original SPNS01 vault remains preserved strictly as historical evidence. It is **not** the current production runtime.

---

## Why Suspense is useful beyond the demo

The initial demo is a tokenized distribution use case, but the underlying pattern is broader.

Any workflow with individually eligible obligations can use the same model:

- payroll;
- treasury operations;
- vendor payouts;
- institutional disbursements;
- marketplace settlement;
- remittances;
- regulated asset distributions.

Instead of blocking every payment because one recipient is temporarily ineligible, the system can settle the compliant majority while keeping the exception explicit, funded and auditable.

---

## Demo in one sentence

> **Cleanverse decides whether an allocation may move. Suspense makes sure that whether it clears now or later, it never disappears from the settlement lifecycle.**

**Pay what clears. Hold what doesn’t.**
