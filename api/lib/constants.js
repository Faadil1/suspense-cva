/**
 * SUSPENSE-CVA — Canonical constants.
 *
 * All addresses and cohort data are hardcoded from canonical Gate B evidence.
 * These values MUST NOT be overridden by client input.
 *
 * Security: This file is server-side only. No secrets live here — secrets come
 * from Vercel environment variables (MONAD_RPC_URL, DEMO_SIGNER_PRIVATE_KEY,
 * OPERATOR_AUTH_SECRET). Those are never returned to clients.
 *
 * ── TOKEN DECIMALS ────────────────────────────────────────────────────────
 * SPNS01 is PartnerCompliantATokenV2, whose decimals() return value is set at
 * constructor time via the `decimals_` parameter — it is NOT hardcoded in the
 * contract source.
 *
 * CANONICAL VALUE: SPNS01 decimals = 6 (established from SUSPENSE-001 project
 * state). 1.0 SPNS01 = 1,000,000 raw units. oneToken(6) = 1_000_000n.
 *
 * TOKEN_DECIMALS_CANONICAL_HINT = 6 is the known correct value for the
 * deployed SPNS01 on Monad Testnet (chainId 10143).
 *
 * The API handlers still read token.decimals() at request time and call
 * assertDecimalsMatch() as defense-in-depth. If the live result disagrees
 * with the canonical value of 6, the handler returns DECIMALS_MISMATCH and
 * refuses to proceed (fail-closed). This prevents silent corruption if the
 * contract is ever redeployed with different parameters.
 *
 * REQUIRED BEFORE PHASE D: perform a live token.decimals() call to confirm
 * the canonical value of 6 on the deployed contract. This is verification
 * of a known value, not discovery of an unknown one.
 */

// ── Chain ──────────────────────────────────────────────────────────────────
export const CHAIN_ID = 10143; // Monad Testnet

// ── Contract addresses (fixed; never client-provided) ─────────────────────
export const TOKEN_ADDRESS   = '0xA17EaB812000679FE3C87a0C4a29Cf8A0714A7bD'; // SPNS01
export const VAULT_ADDRESS   = '0xA94C6cF70570e0D360D668E0113132c57a6C88E0'; // SuspenseVault
export const POLICY_ADDRESS  = '0x36489bE45fa84f70a0c2BDB11D824Be608CB12Dd'; // Cleanverse IATokenPolicy

// ── Token decimals — CANONICAL VALUE (see notice above) ───────────────────
// Canonical value: 6 — established from SUSPENSE-001 project state.
// 1.0 SPNS01 = 1,000,000 raw units. oneToken(6) = 1_000_000n.
// Runtime token.decimals() read + assertDecimalsMatch() is defense-in-depth.
// STATUS: CANONICAL — verify via live token.decimals() call before Phase D.
export const TOKEN_DECIMALS_CANONICAL_HINT = 6;

/**
 * Compute the raw representation of exactly 1.0 token unit.
 *
 * @param {number} decimals — result of token.decimals() at runtime
 * @returns {bigint} 10n ** BigInt(decimals)
 */
export function oneToken(decimals) {
  return 10n ** BigInt(decimals);
}

/**
 * Validate that the live decimals() reading matches the canonical hint.
 * Returns true if OK, throws if mismatched (fail-closed).
 *
 * @param {number} liveDecimals
 */
export function assertDecimalsMatch(liveDecimals) {
  if (Number(liveDecimals) !== TOKEN_DECIMALS_CANONICAL_HINT) {
    throw new Error(
      `DECIMALS_MISMATCH: token.decimals() returned ${liveDecimals} but ` +
      `TOKEN_DECIMALS_CANONICAL_HINT is ${TOKEN_DECIMALS_CANONICAL_HINT}. ` +
      `Update constants.js before Phase D.`
    );
  }
}

// ── Distribution per-holder cap ────────────────────────────────────────────
// 1.0 SPNS01 per holder — computed from live decimals, not hardcoded.
// Use oneToken(liveDecimals) at request time.
// Canonical value: oneToken(6) = 1_000_000n (1.0 SPNS01 with 6 decimals).
// Gate E evidence: each holder received "1.0 SPNS01" = 1,000,000 raw units.
export const DISTRIBUTION_AMOUNT_TOKENS = 1n; // 1 human-unit; multiply by oneToken(decimals)

// Maximum total allocations in a single distribute() call
export const MAX_ALLOCATIONS = 5n; // canonical cohort size

// ── Demo cohort (canonical Gate B evidence — immutable) ───────────────────
export const DEMO_COHORT = Object.freeze([
  { holder: 1, address: '0x7Af35af23cD7d8555ac5Fc6DfFc13D5228D65dCf', country: 'CA', cvRecord: 1894 },
  { holder: 2, address: '0x067d4E3E6806c2bEd1D140574993a28259fCB85E', country: 'CA', cvRecord: 1895 },
  { holder: 3, address: '0xC222E51b1F456F51aDF2598ed7450A4ec6372752', country: 'CA', cvRecord: 1896 },
  { holder: 4, address: '0xc06Fc03A3701Ce5EFe3CE5C0052FaE6797Db69EC', country: 'CA', cvRecord: 1897 },
  { holder: 5, address: '0x4065D109d7A008107257113D8EED7607d965513f', country: 'US',  cvRecord: 1898 },
]);

// ── Distribution semantics — CRITICAL ─────────────────────────────────────
//
// SuspenseVault.distribute() receives ALL canonical holders in a single batch.
// The contract (not the server) performs the authoritative policy check per holder:
//
//   for each holder:
//     emit AllocationCreated
//     if policy.canTransfer(...) → state = PAID; transfer token
//     else                       → state = SUSPENDED; no transfer
//
// The server MAY preview eligibility (for display/UX) but MUST NOT filter
// holders out of the distribute() call based on that preview. Doing so would
// prevent the SUSPENDED entitlement from being created — breaking the product.
//
// Correct flow:
//   1. preview: call policy.canTransfer() × 5 (for UI display only)
//   2. execute: call SuspenseVault.distribute(ALL_5_IDS, ALL_5_RECIPIENTS, ALL_5_AMOUNTS)
//   3. verify:  parse receipt events for actual per-holder outcome
//      • AllocationPaid      → PAID
//      • AllocationSuspended → SUSPENDED
//
// DO NOT FILTER OUT ineligible holders before calling distribute().

// ── Allocation state enum (mirrors SuspenseVault.AllocationState) ─────────
export const AllocationState = Object.freeze({
  NONE:      0,
  READY:     1,
  PAID:      2,
  SUSPENDED: 3,
  RELEASED:  4,
});

export const ALLOCATION_STATE_LABEL = Object.freeze({
  0: 'NONE',
  1: 'READY',
  2: 'PAID',
  3: 'SUSPENDED',
  4: 'RELEASED',
});

// ── Reality classes ────────────────────────────────────────────────────────
// Use precisely. Do not conflate on-chain reads with Cleanverse REST API calls.
export const REALITY = Object.freeze({
  // Live read of the on-chain IATokenPolicy.canTransfer() function.
  // This is what Phase B eligibility endpoint implements.
  LIVE_POLICY_CHECK: 'LIVE_POLICY_CHECK',

  // Live Cleanverse REST API call (POST /canTransfer or equivalent).
  // Phase B does NOT make this call. Only used if REST API is directly queried.
  FRESH_CLEANVERSE_API_CHECK: 'FRESH_CLEANVERSE_API_CHECK',

  // Fresh read of on-chain SuspenseVault state and ERC20 balance.
  LIVE_CHAIN_STATE: 'LIVE_CHAIN_STATE',

  // Canonical Gate E→F on-chain receipts — no live RPC.
  HISTORICAL_EVIDENCE: 'HISTORICAL_EVIDENCE',
});

// ── Monad explorer base URL ────────────────────────────────────────────────
export const EXPLORER_BASE = 'https://testnet.monadscan.com/tx/';

// ── ABIs — verified against canonical SuspenseVault.sol source ────────────
//
// AllocationSuspended includes `bytes4 cleanverseSelector` — the first 4 bytes
// of the Cleanverse policy revert reason (e.g. APassNotActive selector).
// AllocationCreated, AllocationPaid, AllocationReleased all include
// `address indexed recipient` and `uint256 amount` (non-indexed).

export const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)',
];

export const VAULT_ABI = [
  // Public state readers
  'function token() view returns (address)',
  'function policy() view returns (address)',
  'function owner() view returns (address)',
  'function allocations(bytes32 allocationId) view returns (address recipient, uint256 amount, uint8 state)',

  // Write functions (onlyOwner)
  'function distribute(bytes32[] calldata allocationIds, address[] calldata recipients, uint256[] calldata amounts)',
  'function release(bytes32 allocationId)',

  // Events — exact signatures from SuspenseVault.sol source
  'event AllocationCreated(bytes32 indexed allocationId, address indexed recipient, uint256 amount)',
  'event AllocationPaid(bytes32 indexed allocationId, address indexed recipient, uint256 amount)',
  'event AllocationSuspended(bytes32 indexed allocationId, address indexed recipient, uint256 amount, bytes4 cleanverseSelector)',
  'event AllocationReleased(bytes32 indexed allocationId, address indexed recipient, uint256 amount)',

  // Custom errors — for decoding reverts in Phase D/E
  'error InvalidArrayLengths()',
  'error InvalidAllocation()',
  'error DuplicateAllocation(bytes32 allocationId)',
  'error InsufficientFunding(uint256 required, uint256 available)',
  'error NotSuspended(bytes32 allocationId)',
  'error StillBlocked(bytes32 allocationId, bytes4 cleanverseSelector)',
];

export const POLICY_ABI = [
  // Phase B: called as canTransfer(TOKEN_ADDRESS, VAULT_ADDRESS, holder, amount)
  // Mirrors SuspenseVault._policyAllows() exactly.
  'function canTransfer(address token, address from, address to, uint256 amount) view returns (bool)',
];
