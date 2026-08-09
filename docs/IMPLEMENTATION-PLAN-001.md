# IMPLEMENTATION-PLAN-001 — Suspense Level-3 Bounded Build Plan

**Project:** SUSPENSE-001  
**Revision:** PLAN-R004 (Phase B Hardening — 2026-08-09)  
**Date:** 2026-08-09  
**Authority:** AUTHORIZED_WITH_LIMITS + EXPAND-001  
**Architecture reference:** SOLUTION-ARCH-001 (ARCH-R003)  
**Status:** PHASE-B-HARDENING-COMPLETE — Phase C implementation may begin

---

## Governing Constraints (Non-Negotiable)

- No secret in client JavaScript, HTML, git history, logs, or API responses.
- Fixed bounded universe only: canonical Gate B cohort (5 holders), 3 fixed contracts.
- Write operations require a valid server-issued session cookie (Phase C).
- Server-side `canTransfer()` recheck immediately before every distribute/release.
- Phase D gated: no write endpoint until Phase C controls verified PASS.
- Phase C is NOT verified PASS until rate limiting and replay protection are
  confirmed instance-independent (Upstash Redis).
- Canonical Evidence History (`demo/index.html`, commit `d03bb118`) is immutable.
- PROJECT_COMPLETE is permanently forbidden; terminal state is BUILD_CANDIDATE_READY.

---

## Canonical Constants

All hardcoded server-side. Never passed from client.

```
CHAIN_ID         = 10143
RPC_URL_DEFAULT  = https://rpc.testnet.monad.xyz
TOKEN            = 0xA17EaB812000679FE3C87a0C4a29Cf8A0714A7bD  (SPNS01)
VAULT            = 0xA94C6cF70570e0D360D668E0113132c57a6C88E0  (SuspenseVault)
POLICY           = 0x36489bE45fa84f70a0c2BDB11D824Be608CB12Dd  (Cleanverse IATokenPolicy)
```

Canonical cohort (Gate B evidence, immutable):

| # | Address | Country | cvRecord |
|---|---------|---------|---------|
| 1 | 0x7Af35af23cD7d8555ac5Fc6DfFc13D5228D65dCf | CA | 1894 |
| 2 | 0x067d4E3E6806c2bEd1D140574993a28259fCB85E | CA | 1895 |
| 3 | 0xC222E51b1F456F51aDF2598ed7450A4ec6372752 | CA | 1896 |
| 4 | 0xc06Fc03A3701Ce5EFe3CE5C0052FaE6797Db69EC | CA | 1897 |
| 5 | 0x4065D109d7A008107257113D8EED7607d965513f | US  | 1898 |

---

## Token Decimals — CANONICAL VALUE

SPNS01 decimals = **6** (canonical SUSPENSE-001 project state).

```
1.0 SPNS01 = 1,000,000 raw units
TOKEN_DECIMALS_CANONICAL_HINT = 6
oneToken(6) = 1_000_000n
Per-holder distribution amount = 1_000_000n raw units
Total 5-holder amount = 5_000_000n raw units
```

All API handlers read `token.decimals()` at request time and call
`assertDecimalsMatch()` as **defense-in-depth** — fail-closed with
`DECIMALS_MISMATCH` if the live result is not 6.

**Required before Phase D:** Live `token.decimals()` call on
`0xA17EaB812000679FE3C87a0C4a29Cf8A0714A7bD` (chainId 10143) — confirm value is 6.
This is verification of a known canonical value, not discovery.

---

## Phase A — Project Scaffold (No Writes)

**Goal:** Deploy-ready project root with all non-API files.

| File | Purpose |
|------|---------|
| `package.json` | Declares ethers v6 + @upstash/redis + @upstash/ratelimit; `"type": "module"` for ESM |
| `vercel.json` | Security headers; split CORS (wildcard on reads, same-origin on writes); no-store on /api/ |
| `demo/index.html` | Canonical Evidence History — MUST NOT CHANGE (commit d03bb118) |

**Gate:** `vercel.json` validated; `package.json` has correct semver; no CORS
wildcard on write endpoint paths.

---

## Phase B — Read-Only Live Integration (No Writes)

**Goal:** Live Monad Testnet data via `eth_call` only.

| Endpoint | File | What it reads | Reality class |
|----------|------|--------------|---------------|
| GET /api/status | `api/status.js` | `ERC20.balanceOf(vault)`, `ERC20.decimals()`, block number/timestamp, chainId | `LIVE_CHAIN_STATE` |
| GET /api/eligibility | `api/eligibility.js` | `policy.canTransfer(token, vault, holder, oneToken(6))` × 5 | `LIVE_POLICY_CHECK` |

**Security checks in every Phase B handler:**
1. Instantiate provider from `MONAD_RPC_URL` env var (server-side only; public default exists).
2. Verify `network.chainId === 10143` — reject if wrong chain.
3. Read `token.decimals()` at request time; call `assertDecimalsMatch(liveDecimals)` — fail-closed on mismatch (expect 6).
4. Use only hardcoded contract addresses. No client input touches RPC calls.
5. Return precise `realityClass` on every response.
6. No secret in response body. `MONAD_RPC_URL` never returned to client.

**Reality class note:** `/api/eligibility` calls `IATokenPolicy.canTransfer()` on-chain
via `eth_call` — this is `LIVE_POLICY_CHECK`. It is NOT a Cleanverse REST API call.

**Phase B gate:** Both endpoints return valid JSON with correct `realityClass`,
chainId=10143, live data, no secrets. `assertDecimalsMatch()` passes for decimal value 6.

---

## Phase C — Operator Auth + Rate Limiting + Replay Protection (No Writes)

**Goal:** Full write-endpoint guard layer. Phase D is BLOCKED until this is verified PASS.

### Authentication: Stateless HMAC Session Cookie

```
POST /api/auth
  Body: { "secret": "<OPERATOR_AUTH_SECRET>" }
  Response (if valid):
    Set-Cookie: session=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=600
```

Token format (stateless — no server-side store):
```
payload = base64url(JSON.stringify({ iss: "suspense-cva", exp: now+600, v: 1 }))
token   = payload + "." + base64url(HMAC-SHA256(payload, OPERATOR_AUTH_SECRET))
```

Works across Vercel instances. `OPERATOR_AUTH_SECRET` never leaves the server.
No credential in browser storage.

### Rate Limiting — Instance-Independent (Upstash Redis)

Rate limiting uses **Upstash Redis** via the `@upstash/ratelimit` package.
Upstash provides a REST-accessible Redis instance reachable from all Vercel
Function instances. This satisfies the instance-independent requirement.

| Endpoint | Limit | Window | Fail behavior |
|----------|-------|--------|---------------|
| `POST /api/auth` | 10 attempts | per 60s per IP | 429 TOO_MANY_REQUESTS |
| `POST /api/distribute` | 3 executions | per 60s per IP | 429; no transaction |
| `POST /api/release` | 3 executions | per 60s per IP | 429; no transaction |

**Fail-closed for writes:** if the Upstash Redis connection is unavailable, write
endpoints return `503 SERVICE_UNAVAILABLE` rather than proceeding without
rate-limit enforcement.

### Replay Protection — Instance-Independent (Upstash Redis)

Every write request body must include an `operationId` (UUID v4, client-generated).
The server stores each seen `operationId` in Redis with TTL = 600s (session max-age).
A second request with the same `operationId` returns `409 CONFLICT`.

This is instance-independent because it uses Redis, not process memory.

Timestamp validation (±30s) remains as defense-in-depth — NOT the sole replay control.

### CORS / Origin Security

Write endpoints (`POST /api/auth`, `/api/distribute`, `/api/release`) have no
`Access-Control-Allow-Origin` header in `vercel.json` — same-origin only. Phase C
handler also performs server-side `Origin` header validation:
- If `Origin` header is present and does not match deployment domain → `403 FORBIDDEN`
- Session cookie is `SameSite=Strict` — CSRF-immune

### Full Control Matrix

| Control | Mechanism | Instance-safe? |
|---------|-----------|---------------|
| Authentication | Stateless HMAC session cookie | ✅ Yes |
| Rate limiting | Upstash Redis sliding window | ✅ Yes; fail-closed |
| Replay protection | operationId stored in Redis (TTL 600s) | ✅ Yes |
| Timestamp validation | ±30s | ⚡ Defense-in-depth only |
| Idempotency (distribute) | On-chain DuplicateAllocation revert | ✅ Primary |
| Idempotency (release) | On-chain NotSuspended revert | ✅ Primary |
| Recipient allowlist | Hardcoded DEMO_COHORT | ✅ Always |
| Amount cap | 1_000_000n per holder (oneToken(6)) | ✅ Computed from verified decimals |
| Chain ID check | chainId === 10143 | ✅ Always |
| Policy recheck | Fresh canTransfer() before every write | ✅ Not cached |
| Origin check | Server-side Origin header validation | ✅ Defense-in-depth |

### Phase C Carry-Forward Requirements (Non-Negotiable — Implementation Constraints)

The following constraints are registered for Phase C implementors:

**Atomic operationId reservation (REQUIRED):**
operationId must be reserved with a single atomic Redis command:
```
SET replay:<scope>:<operationId> RESERVED NX EX 600
```
- `NX` means only set if key does not exist — prevents race between concurrent instances.
- Returns `OK` on first reservation; `null` if already seen → 409 CONFLICT.
- A GET-then-SET pattern (check then write) has a race condition: two concurrent
  requests both read "not seen", both proceed. This pattern is PROHIBITED.

**operationId lifecycle:**
```
RESERVED → SUBMITTED → CONFIRMED | FAILED
```
- Set to RESERVED at entry (atomic NX). Update to SUBMITTED when tx is sent.
- Update to CONFIRMED on receipt; FAILED on tx error (mark but do not delete — TTL handles expiry).
- On-chain idempotency guards (DuplicateAllocation, NotSuspended reverts) remain as
  defense-in-depth but are NOT the primary replay control.

**Redis unavailability:**
- If `SET NX EX` fails due to Redis connection error → return 503 SERVICE_UNAVAILABLE.
- Never proceed with a write when operationId cannot be reserved in Redis.

### Phase C Verification Checklist (all must PASS before Phase D)

- [ ] Unauthenticated POST to /api/distribute returns 401
- [ ] Wrong secret in /api/auth returns 401; no session cookie set
- [ ] Correct secret in /api/auth returns 200; `Set-Cookie: session=...; HttpOnly`
- [ ] Valid session cookie passes write auth
- [ ] Expired session token (>600s) returns 401
- [ ] Tampered session token (bad HMAC) returns 401
- [ ] Request timestamp > 30s old returns 400
- [ ] First operationId accepted; same operationId returns 409 (tested via Redis)
- [ ] Rate limit fires at 4th write request in same 60s window (confirmed via Redis)
- [ ] Rate limit failure returns 503 when Redis is unavailable (chaos test)
- [ ] Cross-origin POST to /api/auth blocked by missing CORS headers
- [ ] Origin header mismatch returns 403
- [ ] operationId reservation is atomic: second concurrent request with same operationId receives 409 (no race window)
- [ ] /api/eligibility UNKNOWN result causes distribute/release to return 503 (fail-closed, not proceed)

---

## Phase D — Bounded Distribution Endpoint (First Writes)

**Goal:** `POST /api/distribute` executes `SuspenseVault.distribute()` for **all 5 canonical
holders**, with all Phase C guards active.

### CRITICAL: Distribution Semantics

`SuspenseVault.distribute()` MUST receive all 5 canonical holders in a single batch call.
The server MUST NOT filter holders based on a preview eligibility read. The vault
creates SUSPENDED state for blocked holders — that is the product proof moment.

### SUSPENDED Scenario — Authority Status

**Required before Phase D:** Live `canTransfer()` for Holder 5.
- If BLOCKED: proceed (no expansion needed).
- If ELIGIBLE: `AUTHORITY_EXPANSION_REQUIRED_FOR_LIVE_ELIGIBILITY_MUTATION` —
  stop and request explicit authority before any A-Pass deactivation.

### Server Flow (All 5 Holders — No Filtering)

Pre-conditions verified server-side (in order) before transaction:
1. Phase C auth: session cookie present, HMAC valid, not expired.
2. Phase C rate limit: Upstash Redis check passes; 503 if Redis unavailable.
3. Phase C replay: `operationId` not seen in Redis; store with TTL 600s.
4. Request timestamp within ±30s window (defense-in-depth).
5. Origin header validated.
6. Schema: body is `{ "operationId": "<uuid>" }` — no client-provided recipients/amounts.
7. ChainId === 10143.
8. Read `token.decimals()` → `assertDecimalsMatch(6)` → `perHolderAmount = oneToken(6) = 1_000_000n`.
9. `ERC20.balanceOf(vault)` >= `perHolderAmount * 5n = 5_000_000n`.
10. Compute deterministic allocationId per holder: `keccak256(abi.encode(VAULT, holder, DEMO_DISTRIBUTION_NONCE))`.
    Pre-check `vault.allocations(id).state !== NONE` → if already allocated, return `ALREADY_DISTRIBUTED`.
11. **Execute:** `SuspenseVault.distribute(allIds_5, allAddrs_5, allAmounts_5)` via `DEMO_SIGNER_PRIVATE_KEY`.
    All 5 canonical holders. No filtering.
12. Wait for 1 confirmation. Parse receipt events:
    - `AllocationPaid` → PAID
    - `AllocationSuspended` → SUSPENDED (entitlement preserved)
13. Return: tx hash, per-holder outcomes, allocationIds.

**Amount cap:** 1_000_000n raw units (1.0 SPNS01) per holder; 5 allocations total.

**Phase D gate:** Tx confirmed on Monad Testnet. AllocationCreated for all 5.
Per-holder events confirm PAID/SUSPENDED outcomes.

---

## Phase E — Recheck + Release Endpoint (Writes)

**Goal:** `POST /api/release` executes `SuspenseVault.release()` for a suspended allocation.

**Pre-conditions verified server-side:**
1. Phase C auth: session cookie present, HMAC valid, not expired.
2. Phase C rate limit: Upstash Redis check passes; 503 if unavailable.
3. Phase C replay: `operationId` not seen in Redis; store with TTL 600s.
4. Timestamp ±30s window (defense-in-depth).
5. Origin header validated.
6. Body: `{ "allocationId": "0x...", "operationId": "<uuid>" }` — validated as hex bytes32.
7. `allocationId` must be one of the 5 canonical deterministic allocationIds.
8. On-chain: `vault.allocations(allocationId).state === SUSPENDED(3)`.
9. Fresh `canTransfer(token, vault, holder, 1_000_000n)` → must return `true`.
10. All pass → `SuspenseVault.release(allocationId)` via `DEMO_SIGNER_PRIVATE_KEY`.
11. Wait for receipt. Verify `AllocationReleased` event.
12. Return: tx hash, allocationId, final state `RELEASED(4)`.

**Invariant:** same allocationId and amount persist across SUSPENDED → RELEASED.

**Phase E gate:** Tx confirmed. AllocationReleased event present. State SUSPENDED(3) → RELEASED(4).

---

## Phase F — Two-Mode UI (No New Writes)

| Feature | Details |
|---------|---------|
| Mode toggle | `[ LIVE TESTNET ]` / `[ EVIDENCE HISTORY ]` — tab buttons at top |
| LIVE TESTNET view | Fetches /api/status + /api/eligibility on load; auto-refresh |
| Reality labels | `LIVE_POLICY_CHECK` for eligibility results; `LIVE_CHAIN_STATE` for vault/block data |
| No secrets | All data from /api/ endpoints. No RPC URLs or keys in client JS. |
| Operator panel | Auth form POSTs to /api/auth (same-origin). Server sets HttpOnly cookie. No secret in browser. |
| Distribute button | Phase D — posts operationId (UUID v4, generated client-side); no recipients/amounts |
| Release button | Phase E — posts allocationId + operationId |

---

## Phase G — Verification (No New Writes)

| Check | Method |
|-------|--------|
| GET /api/status returns `LIVE_CHAIN_STATE`, chainId 10143 | curl |
| GET /api/eligibility returns `LIVE_POLICY_CHECK`, 5 holders, decimals=6 | curl |
| POST /api/auth correct secret → HttpOnly cookie | curl -v |
| POST /api/distribute without cookie → 401 | curl |
| POST /api/distribute same operationId twice → 409 | curl |
| 4th write in 60s → 429 | curl |
| Redis unavailable → 503 on write (not proceed) | chaos test |
| Cross-origin POST /api/auth blocked (no CORS header) | browser devtools |
| POST /api/distribute with valid session, all 5 holders | curl + receipt |
| Receipt: AllocationPaid/Suspended for all 5 | event parse |
| POST /api/release with SUSPENDED allocationId | curl + receipt |
| demo/index.html SHA-256 matches canonical | sha256sum |
| No `LIVE_TESTNET` label in API responses | grep |
| No secret in any /api/ response body | grep |
| index.html: no RPC URL, private key, auth secret | grep |
| oneToken(6) = 1_000_000n confirmed in test | node eval |
| No 1e18 in runtime amount computation | grep |
| Eligibility UNKNOWN holder → response includes hasUnknownResults: true | curl |
| UNKNOWN eligibility result causes distribute/release → 503 fail-closed | test |

---

## Open Items — Sequenced by Phase Gate

### Before Phase C Code Implementation
*(No external actions required — Phase B hardening PASS is sufficient.)*

- Phase B hardening: PASS ✅

Phase C code implementation may begin immediately.

---

### Before Phase C Live Integration Verification
*(Set these in Vercel before running the Phase C verification checklist.)*

1. **Upstash Redis** — Provision Upstash Redis instance; set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in Vercel.
2. **OPERATOR_AUTH_SECRET** — Generate ≥32 bytes entropy; set in Vercel Environment Variables. **Do not paste value into chat.**

---

### Before Phase D Writes Can Execute
*(All of the following must be confirmed before any `distribute()` or `release()` call.)*

3. **Token decimals** — Live `token.decimals()` call on `0xA17EaB812000679FE3C87a0C4a29Cf8A0714A7bD` (chainId 10143) to confirm value = 6. Verification of known canonical value.
4. **SUSPENDED scenario authority** — Live `canTransfer()` for Holder 5. If BLOCKED: proceed. If ELIGIBLE: `AUTHORITY_EXPANSION_REQUIRED_FOR_LIVE_ELIGIBILITY_MUTATION` — stop and request explicit authority.
5. **DEMO_SIGNER_PRIVATE_KEY** — Dedicated testnet-only signer key; set in Vercel Environment Variables. **Never reuse a personal wallet. Do not paste value into chat.**
6. **SuspenseVault.owner() === demo signer address** — Verify on-chain before Phase D.
7. **Vault funded with ≥5.0 SPNS01** (5,000,000 raw units) — Required for distribute() to succeed.
8. **Vercel Root Directory** — Change from `demo/` to repo root at Level-3 deployment time.

---

## File Delivery Plan

| File | Phase | Status |
|------|-------|--------|
| `docs/SOLUTION-ARCH-001.md` | A | CORRECTED (ARCH-R003) |
| `docs/IMPLEMENTATION-PLAN-001.md` | A | CORRECTED (PLAN-R003) |
| `package.json` | A | DONE (ethers + @upstash/redis + @upstash/ratelimit declared) |
| `vercel.json` | A | CORRECTED (split CORS) |
| `api/lib/constants.js` | B | CORRECTED (TOKEN_DECIMALS_CANONICAL_HINT = 6) |
| `api/lib/rpc.js` | B | DONE (unchanged) |
| `api/status.js` | B | CORRECTED (Phase B hardening — log sanitization; assertDecimalsMatch; LIVE_CHAIN_STATE label) |
| `api/eligibility.js` | B | CORRECTED (Phase B hardening — 4-class error model; UNKNOWN/hasUnknownResults; log sanitization; LIVE_POLICY_CHECK label) |
| `index.html` | B+F | DONE (unchanged — precise reality banner) |
| `api/auth.js` | C | NOT YET — stateless HMAC session cookie |
| `api/lib/ratelimit.js` | C | NOT YET — Upstash Redis sliding window |
| `api/distribute.js` | D | NOT YET — gated on Phase C PASS |
| `api/release.js` | E | NOT YET — gated on Phase D PASS |
