# SOLUTION-ARCH-001 — Suspense Level-3 Live Testnet Architecture

**Project:** SUSPENSE-001  
**Revision:** ARCH-R004 (Deployment Topology + Secret Minimum — 2026-08-09)  
**Authority:** AUTHORIZED_WITH_LIMITS + EXPAND-001 (Level-3 Live Testnet)  
**Status:** PHASE_A_B_PASS | PHASE_C_IMPLEMENTED_LOCAL_VERIFICATION_PASS | PHASE_C_LIVE_INTEGRATION_PENDING

---

## 1. Product Overview

Suspense Level-3 extends the verified static Evidence Reconstruction demo into a
two-mode product:

| Mode | Reality Class | Data Source |
|------|--------------|-------------|
| EVIDENCE HISTORY | HISTORICAL_EVIDENCE | Hardcoded canonical Gate E→F receipts |
| LIVE TESTNET | LIVE_POLICY_CHECK / LIVE_CHAIN_STATE | Fresh Monad Testnet on-chain reads + bounded writes |

The canonical product invariant is preserved in both modes:

> Cleanverse determines eligibility. Suspense owns: SUSPENDED → preserved
> entitlement → fresh eligibility recheck → RELEASED. Same allocation ID and
> amount persist.

---

## 2. Deployment Architecture

```
Vercel Project: suspense-cva
├── index.html                   Static — two-mode entry point (/)
├── demo/index.html              Static — canonical Evidence History (/demo/)  [IMMUTABLE]
├── api/
│   ├── lib/
│   │   ├── constants.js         Shared — hardcoded addresses, ABIs, cohort
│   │   ├── rpc.js               Shared — provider factory (chainId enforcement)
│   │   ├── auth.js              Phase C — session token verification
│   │   └── ratelimit.js         Phase C — instance-independent rate limit (Upstash Redis)
│   ├── status.js                Serverless — live vault balance + chain health
│   ├── eligibility.js           Serverless — canTransfer() per holder
│   ├── distribute.js            Serverless — bounded distribution (Phase D)
│   └── release.js               Serverless — bounded release (Phase E)
├── vercel.json                  Routing + headers; split CORS
└── package.json                 ethers + @upstash/redis dependencies
```

**Static serving:** Vercel static CDN. No build step.  
**Serverless runtime:** Node.js 20.x.  
**No client-side secrets.** All privileged operations in `/api/`.

---

## 3. Security Boundary

### Server-side secrets (Vercel Environment Variables only)

| Variable | Phase | Description |
|----------|-------|-------------|
| `MONAD_RPC_URL` | A | Monad Testnet RPC endpoint |
| `CLEANVERSE_API_ID` | B/E | Cleanverse API identifier |
| `CLEANVERSE_API_KEY_BASE64` | E | Cleanverse API key (base64) |
| `DEMO_SIGNER_PRIVATE_KEY` | D/E | Dedicated demo signer private key (testnet only) |
| `OPERATOR_AUTH_SECRET` | C | Pre-shared operator credential (≥32 bytes entropy) |
| `UPSTASH_REDIS_REST_URL` | C | Upstash Redis REST endpoint (instance-independent rate limit + replay) |
| `UPSTASH_REDIS_REST_TOKEN` | C | Upstash Redis REST token |

**No secret appears in:** client JavaScript, HTML, git history, API responses,
browser source, public logs, or screenshots.

`MONAD_RPC_URL` has a public default (`https://rpc.testnet.monad.xyz`) so
Phase B (read-only) deploys without requiring any secrets.

### Client trust model

- Public UI is read-only and unauthenticated.
- Write operations require a valid server-issued session cookie (see §8 Operator Auth).
- No credential is persisted in browser storage or returned to the client.
- `OPERATOR_AUTH_SECRET` never appears in client-side JS, localStorage,
  sessionStorage, or URL parameters.

---

## 4. Fixed Bounded Universe

The authorization prohibits arbitrary recipients and calldata. All operations
use the canonical demo cohort from Gate B evidence:

| Holder | Wallet | Country | cvRecord |
|--------|--------|---------|---------|
| 1 | `0x7Af35af23cD7d8555ac5Fc6DfFc13D5228D65dCf` | CA | 1894 |
| 2 | `0x067d4E3E6806c2bEd1D140574993a28259fCB85E` | CA | 1895 |
| 3 | `0xC222E51b1F456F51aDF2598ed7450A4ec6372752` | CA | 1896 |
| 4 | `0xc06Fc03A3701Ce5EFe3CE5C0052FaE6797Db69EC` | CA | 1897 |
| 5 | `0x4065D109d7A008107257113D8EED7607d965513f` | US  | 1898 |

**Fixed contracts (read-only from client, called server-side for writes):**

| Name | Address |
|------|---------|
| SPNS01 token | `0xA17EaB812000679FE3C87a0C4a29Cf8A0714A7bD` |
| SuspenseVault | `0xA94C6cF70570e0D360D668E0113132c57a6C88E0` |
| Cleanverse policy | `0x36489bE45fa84f70a0c2BDB11D824Be608CB12Dd` |
| Chain | Monad Testnet, chainId 10143 |

**Allowed write operations only:**
- `SuspenseVault.distribute(allocationIds, recipients, amounts)`
- `SuspenseVault.release(allocationId)`

No arbitrary function selector. No arbitrary target. No arbitrary calldata.

---

## 5. Token Decimals — CANONICAL VALUE

`SPNS01` is `PartnerCompliantATokenV2`, which sets `decimals()` via a constructor
parameter at deployment time.

**Canonical value:** SPNS01 decimals = **6** (established from SUSPENSE-001 project state).

```
1.0 SPNS01 = 1,000,000 raw units
oneToken(6) = 1_000_000n
Per-holder distribution amount = 1_000_000n
Total 5-holder amount = 5_000_000n
```

`TOKEN_DECIMALS_CANONICAL_HINT = 6` in `api/lib/constants.js`.

All Phase B/D/E API handlers read `token.decimals()` at request time and call
`assertDecimalsMatch(liveDecimals)` as **defense-in-depth**. If the live result
disagrees with 6, the endpoint returns `DECIMALS_MISMATCH` and refuses to proceed
(fail-closed). This guards against silent corruption if the contract is ever
redeployed with different parameters.

**Required before Phase D:** Perform a live `token.decimals()` call to **confirm**
the value of 6 on the deployed `0xA17EaB812000679FE3C87a0C4a29Cf8A0714A7bD`
(chainId 10143). This is verification of a known value, not discovery.

---

## 6. Distribution Semantics — CRITICAL

`SuspenseVault.distribute()` receives **all 5 canonical holders in a single call**.
The vault contract performs the authoritative policy check per holder:

```
for each holder:
  allocations[id] = { recipient, amount, READY }
  emit AllocationCreated(id, recipient, amount)
  
  if policy.canTransfer(token, vault, holder, amount):
    state = PAID
    token.safeTransfer(holder, amount)
    emit AllocationPaid(id, holder, amount)
  else:
    state = SUSPENDED          ← entitlement preserved, not lost
    emit AllocationSuspended(id, holder, amount, cleanverseSelector)
    ↳ no transfer
```

**The server MUST NOT filter holders out of the distribute() call based on a
preview eligibility read.** Filtering would prevent the SUSPENDED state from being
created, breaking the product thesis.

Correct server flow:
1. **Preview** (display only): `policy.canTransfer()` × 5 → show expected outcome in UI
2. **Execute**: `SuspenseVault.distribute(ALL_5_IDS, ALL_5_ADDRS, ALL_5_AMOUNTS)`
3. **Verify**: parse receipt events per holder
   - `AllocationPaid` event → holder is PAID
   - `AllocationSuspended` event → holder is SUSPENDED (entitlement preserved)

---

## 7. API Surface

### Reality class labels (precise)

| Label | Meaning |
|-------|---------|
| `LIVE_POLICY_CHECK` | On-chain `IATokenPolicy.canTransfer()` via `eth_call` |
| `FRESH_CLEANVERSE_API_CHECK` | Cleanverse REST API call (only if explicitly made) |
| `LIVE_CHAIN_STATE` | Live `eth_call` to vault/token state |
| `HISTORICAL_EVIDENCE` | Canonical Gate E→F receipts — no live RPC |

Never use `LIVE_TESTNET` alone — it is ambiguous. Use the specific subclass above.

### READ endpoints (no auth required)

**`GET /api/status`**  
Returns: vault SPNS01 balance, token metadata, block number/timestamp, chainId.  
Source: `eth_call` to `ERC20.balanceOf(vault)` + `ERC20.decimals()`.  
Reality class: `LIVE_CHAIN_STATE`  
Does NOT return per-allocation state (requires allocationIds from Phase D).

**`GET /api/eligibility`**  
Returns: per-holder `canTransfer()` result from Cleanverse policy contract.  
Source: `eth_call` to `IATokenPolicy.canTransfer()` for each demo cohort member.  
Reality class: `LIVE_POLICY_CHECK`  
Note: This is an on-chain eth_call — not a Cleanverse REST API call.  
Display only — not authorization for writes. Server re-runs before every write.

### WRITE endpoints (Phase D/E — session auth required)

**`POST /api/auth`** (Phase C)  
Body: `{ "secret": "<OPERATOR_AUTH_SECRET>" }`  
Issues: `Set-Cookie: session=<hmac-signed-token>; HttpOnly; Secure; SameSite=Strict; Max-Age=600`  
Token is stateless HMAC-signed (no server-side session store required).  
Rate-limited: maximum 10 auth attempts per 60s per IP via Upstash Redis.

**`POST /api/distribute`** (Phase D)  
Requires: valid session cookie + operationId  
Executes: `SuspenseVault.distribute()` with all 5 canonical holders.  
Pre-conditions: see §9 Abuse Controls.

**`POST /api/release`** (Phase E)  
Requires: valid session cookie + operationId  
Body: `{ "allocationId": "0x...", "operationId": "<uuid-v4>" }` — allocationId must be canonical cohort ID.  
Pre-conditions: see §9 Abuse Controls.

---

## 8. Operator Authentication — Session Cookie Design

To avoid persisting `OPERATOR_AUTH_SECRET` in any client-side storage:

```
POST /api/auth
  ← { "secret": "<OPERATOR_AUTH_SECRET>" }
  → if valid: Set-Cookie: session=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=600
```

**Session token format (stateless — no server-side store needed):**
```
payload = base64url(JSON.stringify({iss:"suspense-cva", exp: now+600, v:1}))
token   = payload + "." + base64url(HMAC-SHA256(payload, OPERATOR_AUTH_SECRET))
```

- Server validates by re-computing HMAC on each write request.
- Token expires after 600s (10 minutes).
- Works correctly across Vercel Function instances (no shared memory needed).
- `OPERATOR_AUTH_SECRET` never leaves the server.

---

## 9. Abuse Controls

### Serverless-safe design (instance-independent)

Vercel Functions may execute across separate instances. Controls that rely solely
on process-memory (`Map`, `Set`, in-process counters) are not instance-safe and
MUST NOT be the only layer for security-critical checks.

### Rate limiting — instance-independent (Upstash Redis)

Rate limiting is implemented via **Upstash Redis REST API** — a durable,
instance-independent KV store accessible from all Vercel Function instances via
HTTP. The `@upstash/ratelimit` package provides sliding-window enforcement.

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/auth` | 10 attempts | per 60s per IP |
| `POST /api/distribute` | 3 executions | per 60s per IP |
| `POST /api/release` | 3 executions | per 60s per IP |

**Fail-closed for writes:** if the Redis connection is unavailable, write endpoints
return `503 SERVICE_UNAVAILABLE` rather than proceeding without rate-limit enforcement.

### Replay protection — instance-independent (Upstash Redis)

Every write request body must include a client-generated `operationId` (UUID v4).
The server stores each `operationId` in Redis with a TTL equal to the session
max-age (600s). A second request with the same `operationId` returns `409 CONFLICT`.

This determination is instance-independent because it uses Redis, not process memory.

Timestamp validation (±30s window) remains as defense-in-depth but is NOT the
sole replay control.

### Full control matrix

| Control | Mechanism | Instance-safe? |
|---------|-----------|---------------|
| Authentication | Stateless HMAC session cookie | ✅ Cryptographically verifiable |
| Rate limiting (auth) | Upstash Redis sliding window | ✅ Instance-independent |
| Rate limiting (writes) | Upstash Redis sliding window | ✅ Instance-independent; fail-closed |
| Replay protection | operationId in Redis (TTL 600s) | ✅ Instance-independent |
| Timestamp validation | ±30s window | ⚡ Defense-in-depth only |
| Idempotency (distribute) | On-chain: `DuplicateAllocation` revert | ✅ Primary; + server pre-check |
| Idempotency (release) | On-chain: `NotSuspended` revert | ✅ Primary; + server pre-check |
| Recipient allowlist | Hardcoded DEMO_COHORT; server rejects other | ✅ Always |
| Amount cap | 1.0 SPNS01 per holder (1_000_000 raw units) | ✅ Computed from verified decimals |
| Chain ID check | Every endpoint verifies chainId === 10143 | ✅ Always |
| Policy recheck | Fresh `canTransfer()` before every write | ✅ Server-side; not cached |
| Origin check | Server rejects non-same-origin on write POSTs | ✅ Defense-in-depth |
| Receipt verification | Wait for confirmation; verify events in receipt | ✅ Always |

**The contract's `DuplicateAllocation` and `NotSuspended` errors are additional
defense-in-depth, not the sole control.**

---

## 10. CORS / Same-Origin Security

Public read endpoints and privileged write endpoints use different CORS policies:

| Endpoint | CORS Policy | Rationale |
|----------|-------------|-----------|
| `GET /api/status` | `Access-Control-Allow-Origin: *` | Public read — may be embedded |
| `GET /api/eligibility` | `Access-Control-Allow-Origin: *` | Public read — may be embedded |
| `POST /api/auth` | No CORS headers — same-origin only | Privileged — auth endpoint |
| `POST /api/distribute` | No CORS headers — same-origin only | Transaction-producing |
| `POST /api/release` | No CORS headers — same-origin only | Transaction-producing |

Absence of CORS headers on write endpoints means browsers enforce same-origin
policy — cross-origin JavaScript cannot reach these endpoints.

**Additionally:** Phase C handler performs explicit server-side `Origin` header
validation as defense-in-depth. If the `Origin` header is present and does not
match the deployment domain, the request is rejected with `403 FORBIDDEN`.

Session cookie is: `HttpOnly; Secure; SameSite=Strict` — immune to cross-site
request forgery.

**`vercel.json` implementation:** CORS headers are set per-path, not via a
wildcard `/api/(.*)` rule. Write endpoint paths (`/api/auth`, `/api/distribute`,
`/api/release`) have no `Access-Control-Allow-Origin` header.

---

## 11. SUSPENDED Scenario — Current State Analysis

The Level-3 product requires at least one SUSPENDED allocation after distribute().
This requires at least one holder to be BLOCKED by `canTransfer()` at the time of
the call.

**Gate F evidence:** Holder 5's A-Pass was reactivated (`update-status` tx
`0xfc40f6caaf1a30a681b29e6bd691bc24dbdfee71046b99ad83236feee6ccb2d5`).  
**Inference:** Holder 5 is likely currently ELIGIBLE (A-Pass active post-Gate-F).

**Consequence:** A fresh distribute() would likely produce 5 PAID, 0 SUSPENDED —
not the intended demo scenario.

**To produce a SUSPENDED state for the Level-3 demo, Holder 5's A-Pass must be
deactivated before distribute() is called.**

This requires a Cleanverse status mutation (A-Pass deactivation via REST API).  
This is NOT currently in authorized scope under EXPAND-001.

**Determination:**
```
AUTHORITY_EXPANSION_REQUIRED_FOR_LIVE_ELIGIBILITY_MUTATION
```

**Required action:** User must verify current `canTransfer()` state for Holder 5
via live RPC. If already BLOCKED: proceed (no expansion needed). If ELIGIBLE:
explicit authority expansion is required before A-Pass deactivation may be
performed. Do NOT deactivate without explicit expansion.

---

## 12. Implementation Phases

| Phase | Deliverable | Write Gate |
|-------|-------------|------------|
| A | Project scaffold, vercel.json, package.json | No writes |
| B | `/api/status` + `/api/eligibility` (read-only) | No writes |
| C | `POST /api/auth` + session cookie + Upstash rate limit + replay protection + Phase C verification | No writes |
| D | `/api/distribute` — bounded distribution (ALL 5 holders) | First writes |
| E | `/api/release` — recheck + release | Writes |
| F | Two-mode UI integrated with live data + operator panel | No new writes |
| G | Local + testnet + Vercel deployment verification | Verification |

**Phase D is gated:** no write endpoint enabled until Phase C verified PASS.

Phase C is NOT verified PASS until:
- Upstash Redis connection confirmed
- Rate limiting confirmed instance-independent
- Replay protection (operationId) confirmed
- Origin validation confirmed
- Session cookie confirmed HttpOnly + Secure + SameSite=Strict

---

## 13. Non-Regression Requirements

- Canonical Evidence History demo (`demo/index.html`, commit `d03bb118`) is unchanged.
- SHA-256: `5383e00db3b6291c65d21cf11e71ca438f26e0d662ee8efefe3eecf3798c9040`
- Public URL `https://suspense-cva.vercel.app/` continues to serve the product.
- Evidence Reconstruction mode remains functional via the two-mode UI.
- All 10 protected invariants remain preserved.
- Lifecycle target: `BUILD_CANDIDATE_READY`. `PROJECT_COMPLETE` is forbidden.

---

## 14. Deployment Topology — Two-Project Model

Level-3 uses a **two-project** Vercel deployment to preserve the canonical
Evidence History deployment while independently verifying Phase C/D/E live
functionality.

### Project A — Historical (Frozen)

| Field | Value |
|-------|-------|
| Name | `suspense-cva` |
| Root Directory | `demo/` — **DO NOT CHANGE** |
| URL | `https://suspense-cva.vercel.app/` |
| Purpose | Canonical Evidence History deployment — judge-facing |

This project and its URL are permanently frozen. Its Root Directory must
**never** change from `demo/`. Existing evaluators continue to see the
canonical Evidence History demo at the unchanged URL.

### Project B — Level-3 (Phase C verification and beyond)

| Field | Value |
|-------|-------|
| Name | `suspense-cva-level3` |
| Repository | `Faadil1/suspense-cva` |
| Root Directory | **repository root** (not `demo/`) |
| Framework | Other |
| Build Command | none |
| Output Directory | default / none |
| Purpose | Two-mode Level-3 application + serverless API |

**Routes:**

| Path | Serves |
|------|--------|
| `/` | Level-3 two-mode `index.html` |
| `/api/status` | Phase B — read-only chain state |
| `/api/eligibility` | Phase B — read-only policy check |
| `/api/auth` | Phase C — HMAC session cookie issuance |
| `/api/distribute` | Phase D — not yet implemented |
| `/api/release` | Phase E — not yet implemented |
| `/demo/` | Canonical historical demo (from `demo/` subfolder) |

**Environment variables required (set directly in Vercel — never in files or chat):**

| Variable | Purpose |
|----------|---------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `OPERATOR_AUTH_SECRET` | ≥32 UTF-8 bytes entropy; pre-shared operator credential |
| `ALLOWED_ORIGIN` | Full deployment origin of Project B (e.g. `https://suspense-cva-level3.vercel.app`) |

**Lifecycle gate:** Create and deploy `suspense-cva-level3` for bounded Phase C
live verification. Transaction-producing functionality (`/api/distribute`,
`/api/release`) remains disabled until Phase C live integration PASS is obtained.

---

## 15. Open Items Before Phase D

1. **Create `suspense-cva-level3`** — separate Vercel project with repository-root Root Directory; configure Phase-C-only environment variables; deploy Phase A/B/C endpoints.
2. **Execute PL-01..PL-15** — 15 live integration tests against deployed `suspense-cva-level3`; all must PASS for Phase C live integration PASS.
3. **Token decimals** — verify `token.decimals()` confirms value of 6 on chainId 10143.
4. **SUSPENDED scenario authority** — verify current `canTransfer()` for Holder 5; if ELIGIBLE, explicit authority expansion required before A-Pass deactivation.
5. **DEMO_SIGNER_PRIVATE_KEY** — dedicated testnet-only key; set in Vercel; never a personal wallet.
6. **OPERATOR_AUTH_SECRET** — ≥32 UTF-8 bytes entropy; set in Vercel directly; never paste into Cowork/chat.
7. **UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN** — Upstash Redis instance required; set in Vercel.
8. **SuspenseVault.owner() === demo signer address** — verify before Phase D.
9. **Vault funded with ≥5.0 SPNS01** — required before distribute() can execute.
