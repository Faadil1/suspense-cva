# CREATIVE DIRECTION & PRODUCT MODEL — SUSPENSE-001
## CORE-11 `creative_direction` Execution Output

```yaml
document_id: CREATIVE-DIRECTION-001
version: 1.0
skill: CORE-11 creative_direction
packs_active: [PACK-EVALUATOR-EXPERIENCE-UIUX (UX-01, UX-02, UX-04), PACK-HACKATHON-BUILDER (HACK-02)]
project_id: SUSPENSE-001
date: 2026-08-08
status: PASS
authority: AUTHORIZED_WITH_LIMITS
evidence_class: DECISION (creative direction from verified facts)
```

---

## 0. Scope and Evidence Basis

This document was produced by CORE-11 `creative_direction` from the following verified inputs:

| Source | Class | What it contributes |
|--------|-------|---------------------|
| PROJECT-BRIEF.md sections 2–5, 14–16 | FACT (inspected) | Product definition, invariants, hero demo sequence, UX truth requirements |
| docs/GATE_CD_EVIDENCE.md | FACT (inspected) | Gates C+D: Cleanverse policy enforcement, CVA transfer blocking |
| docs/GATE_EF_EVIDENCE.md | FACT (inspected) | Gates E+F: distribution results, suspended allocation ID, release tx |
| contracts/SuspenseVault.sol (partial) | FACT (inspected) | AllocationState enum, batch distribution function |
| REQUIREMENTS-LEDGER.yaml | FACT (inspected) | Protected invariants, MUST/MUST_NOT constraints |
| On-chain current state | INFERENCE | Holder-5 is RELEASED (per Gate F evidence; not live-queried this session) |

All creative decisions are grounded in verified facts. No claim in this document upgrades UNVERIFIED evidence to FACT.

---

## 1. INTENTION → EMOTION → EXPERIENCE PRINCIPLES

### Intention (what the product actually does)

Suspense preserves a holder's exact entitlement when compliance blocks asset movement, then releases the same allocation — verifiably, on-chain — when eligibility clears.

Cleanverse is the decision engine. Suspense is the memory that honors the decision.

### Target emotional response from judges

| Moment | Target emotion |
|--------|----------------|
| First impression | "This is institutional-grade. Real infrastructure." |
| Seeing the 4+1 accounting | "I can see it. Everything is accounted for." |
| Seeing SUSPENDED state | "That's not a failure — it's a promise." |
| Seeing the same allocation released | "That's the same one. That's the proof." |
| Seeing the transaction hashes | "This actually happened. On-chain." |

### Experience principles

1. **Accountability is always visible.** At any moment, 4 + 1 = 5 must be on screen.
2. **SUSPENDED is a feature, not a failure.** The amber state communicates "held carefully," not "broken."
3. **The mechanism is the design.** Every UI element serves comprehension of how Cleanverse and Suspense interlock.
4. **Real evidence is woven in, not buried.** Transaction hashes appear where the proof moment occurs — not in an appendix.
5. **The release is the climax.** The SAME allocation ID completing its journey is the hero moment.

---

## 2. CREATIVE THESIS

> **"The allocation never left. It was waiting."**

This is the emotional core of the entire product. The SUSPENDED state is not a compliance failure — it is a compliance promise. Suspense is the infrastructure of financial honesty: when law says no, the entitlement doesn't vanish. It waits. When law says yes, the same allocation moves — provably, on the same chain, with the same ID.

The product's job is to make this promise legible.

---

## 3. UX-02 POSITIONING SYSTEM

**Positioning stack for all evaluator-facing surfaces:**

```
HEADLINE:
Pay what clears. Hold what doesn't.

MECHANISM LINE:
Compliance-aware coupon distribution that preserves suspended
allocations until eligibility clears — then releases the same one.

DISTINCTION:
Not escrow. Not a batch abort. Not a generic KYC dashboard.
One blocked holder does not cancel four compliant payments.
The suspended entitlement persists, tied to its allocation ID,
until Cleanverse says yes.

PROOF SENTENCE (appears near evidence):
Four holders paid immediately. One suspended. Same allocation released.
Verified on Monad Testnet. Transactions linked below.

SPONSOR CAUSALITY (Cleanverse):
Cleanverse is the compliance engine. Suspense creates and persists
the workflow states SUSPENDED and RELEASED that Cleanverse
does not natively track.
```

**Usage rules:**
- Headline appears above the fold on every evaluator-facing surface
- Mechanism line is the subtitle
- Distinction language is never shown generically — it only appears near the demo proof
- Proof sentence appears immediately adjacent to the demo/transaction panel

---

## 4. UX-04 EVALUATOR MEMORY TARGET

```yaml
memory_target:
  canonical_sentence: >
    "The one where four got paid, one couldn't legally move yet —
    but that entitlement stayed tracked — and when Cleanverse cleared
    them, the exact same allocation was released."

  mechanism_visible: "Cleanverse canTransfer() gates each holder independently"
  meaningful_difference: "Same allocation ID released, not a new one"
  outcome: "Nobody loses their entitlement; 4+1=5 always accounted"

  test:
    slogan_without_mechanism: FAIL — "Hold what doesn't clear" has no mechanism
    mechanism_visible_present: PASS — canTransfer() result determines each holder's fate
    difference_present: PASS — same allocation ID is visible in both SUSPENDED and RELEASED rows
    outcome_present: PASS — 5/5 accounting footer is always on screen
```

**This sentence drives every copy decision:** if a UI label, heading, or video line does not serve this memory, cut it.

---

## 5. HACK-02 JUDGE EVALUATOR MODEL

**Hackathon:** Cleanverse Build: Trusted Assets Hackathon — Round 2, RWA Issuance Track

**Judging dimensions and proof expectations:**

| Criterion | Judge question | Proof required | Risk of misread |
|-----------|---------------|----------------|-----------------|
| **Concept** | "Is this a real RWA use case?" | Bond coupon distribution framing; explain compliance-at-distribution-time | Judges may assume it's generic KYC. Counter: lead with the distribution scenario, not the compliance concept. |
| **CVI/CVA Integration Depth** | "Is Cleanverse load-bearing or bolted on?" | Show `canTransfer()` call per holder; show CVA transfer enforcement; show Vault A-Pass. Cleanverse must be causally necessary, not decorative. | Risk: judges miss that CVA itself enforces policy at token level. Make dual-layer visible: canTransfer() + CVA enforcement both shown. |
| **Build Quality** | "Is this real code?" | SuspenseVault.sol deployed; 6+ verifiable transactions on Monad Testnet; allocation IDs traceable | Risk: judges assume simulation. Counter: show transaction hash links inline with proof moments. |
| **UX & Demo** | "Can I understand it in 90 seconds?" | The 4+1=5 visual; SUSPENDED→RELEASED state transition; memory sentence | Risk: judges see dashboard and assume generic multisend. Counter: SUSPENDED state must look distinct, intentional, important. |
| **Scalability** | "Could this work at scale?" | Batch distribution architecture; one blocked holder doesn't abort others; any RWA distribution scenario | Risk: looks like a one-holder demo. Counter: show 5 holders explicitly; note the batch mechanism. |

**Critical judge failure modes to prevent:**

1. "This is just escrow." → Differentiate: escrow pools funds. Suspense tracks the specific allocation by ID.
2. "The SUSPENDED state is a bug." → SUSPENDED must be visually prominent as a designed, intentional state.
3. "I can't verify this is real." → Every proof moment links to an actual transaction hash.
4. "Cleanverse is just an API call." → Show CVA policy enforcement at token-transfer level (Gate D), not just canTransfer() return value.

---

## 6. VISUAL DESIGN SYSTEM

### Aesthetic concept: **"Settlement Console"**

The product looks like institutional financial infrastructure. It belongs in a bond desk or treasury operations context, not a consumer fintech app. Information is the design. Every element serves comprehension.

**Reference aesthetic anchors:**
- Terminal/console density with financial data precision
- Dark-primary theme (reduces visual noise, focuses attention on state)
- Minimal ornamentation: the mechanism is the visual interest

### Color system

```
BACKGROUND:    #0A0F1E   (deep navy — "the dark of serious infrastructure")
SURFACE:       #111827   (dark slate)
SURFACE-RAISED: #1C2435  (cards, panels)
BORDER:        #1E2D45   (subtle structural lines)

STATE COLORS (semantic core of the product):

  READY:     #6B7280   (neutral gray — "awaiting execution")
  PAID:      #10B981   (emerald green — "cleared and delivered")
  SUSPENDED: #F59E0B   (amber/gold — "held carefully, not lost")
  RELEASED:  #22C55E   (bright green — "the same allocation, now free")

TEXT PRIMARY:    #F9FAFB
TEXT SECONDARY:  #9CA3AF
TEXT MONO:       #94A3B8  (addresses, hashes, amounts)

ACCENT / BRAND:  #F59E0B  (amber = the signature of "held but not forgotten")
```

**Why amber for SUSPENDED?**
Amber is not red (failure/lost) and not green (clear). It is the colour of "temporarily held." This is precisely the semantic: SUSPENDED is a compliance-aware pause, not a failure. The amber allocation row must be unmistakably intentional — not an error state.

### Typography

```
UI labels, headings:   Inter (or system UI sans-serif stack)
  Weights: 400 (body), 500 (label), 600 (heading), 700 (headline)

Addresses, tx hashes,
amounts, IDs:          JetBrains Mono (or monospace stack)
  Weight: 400
  Size: scale -1 from body (conveys technical precision)

Amounts:               Tabular numerals (lnum tnum)
  Always right-aligned in columns
```

### Spacing and density

- Tight but not cramped: 8px base unit grid
- Allocation rows: 48–56px height (legible without waste)
- The accounting footer is always visible — it anchors the page

### Motion principles

- **State transitions:** allocation rows change color with a 300ms ease transition. The moment of SUSPENDED→RELEASED is the most important animation: amber → flash → bright green. Brief, unmistakable.
- **Not decorative:** no gratuitous motion. Only state changes animate.
- **The accounting counter:** 4+1=5 updates when state changes. The digit change is the motion.

---

## 7. KEY VISUAL COMPONENTS

### 7.1 The Allocation Table (hero element)

The primary visual is a 5-row allocation table. This is the product.

```
COLUMN STRUCTURE:
  Holder       | Amount   | State      | Allocation ID (truncated) | Action / Evidence
  ─────────────|──────────|────────────|──────────────────────────|─────────────────
  Holder 1     | 1.0 SPNS01 | ● PAID    | —                       | [tx]
  Holder 2     | 1.0 SPNS01 | ● PAID    | —                       | [tx]
  Holder 3     | 1.0 SPNS01 | ● PAID    | —                       | [tx]
  Holder 4     | 1.0 SPNS01 | ● PAID    | —                       | [tx]
  Holder 5     | 1.0 SPNS01 | ● SUSPENDED→RELEASED | 0x10a3...e0d4 | [tx]
```

*Note: Individual allocation IDs for PAID holders (1–4) are not documented in canonical Gate E evidence. Only the suspended allocation ID for Holder 5 (`0x10a3b35d0496c5126a0ccb2d7f09a221dc73af57f372b742ba1d90980f97e0d4`) is recorded in GATE_EF_EVIDENCE.md.*

**State badge design:**
- Colored filled dot (●) + uppercase label in matching color
- PAID: green dot + "PAID"
- SUSPENDED: amber dot + "SUSPENDED" (pulsing subtle animation during SUSPENDED state)
- RELEASED: bright green dot + "RELEASED"

**Holder 5 distinction:**
When showing the historical sequence, Holder 5's row uses an animated state badge. After transition: the row shows a subtle "same allocation" indicator — a visual link connecting the SUSPENDED state allocation ID to the RELEASED state allocation ID (same value, same position).

### 7.2 The Accounting Footer (always visible)

```
┌─────────────────────────────────────────────────────────┐
│  DISTRIBUTION ACCOUNTING                                │
│                                                         │
│  4 PAID   +   1 SUSPENDED   =   5 / 5 accounted        │
│  ████████████████             █████  (amber)           │
│                                                         │
│  → After release:                                       │
│  4 PAID   +   1 RELEASED   =   5 / 5 accounted         │
│  ████████████████████   █████  (green + bright green)  │
└─────────────────────────────────────────────────────────┘
```

This footer is the visual proof of the invariant: **value cannot disappear from Suspense**. If 5 allocations went in, 5 must be accounted for at every state.

### 7.3 The Cleanverse Integration Panel

A collapsible but visible panel showing:
- `canTransfer()` call result per holder (PASS/REVERT)
- CVA policy enforcement note
- Vault A-Pass status
- Monad Testnet connection indicator

This makes Cleanverse integration depth visible without requiring judges to read the contract.

### 7.4 The Evidence Panel (inline, not appendix)

At the key proof moments, inline evidence chips appear:

```
[Gate E Distribution]  tx: 0xc233...3779  ↗ Monad Explorer
[Gate F Release]       tx: 0x3295...c31   ↗ Monad Explorer
[Suspended Allocation] id: 0x10a3...e0d4  (same in both events)
```

These are clickable links to the actual transactions on Monad Testnet explorer. They appear adjacent to the proof moment, not in a separate "Transactions" tab.

### 7.5 UX Truth Indicator

Because Holder-5's current on-chain state is RELEASED (not SUSPENDED), the UI must be honest:

```
┌─────────────────────────────────────────────────┐
│  VIEWING: Historical Gate E → F sequence        │
│  Latest documented state: RELEASED              │
│  (Gate F evidence; live state not re-queried    │
│  this session)                                  │
│  Evidence: Transaction receipts + chain events  │
└─────────────────────────────────────────────────┘
```

This satisfies invariant #10 (must not present historical SUSPENDED as current state) while enabling the demo to show the full sequence.

---

## 8. HERO DEMO DESIGN (CORE-10)

```yaml
hero_demo:
  id: DEMO-001
  version: "1.0"
  title: "Suspense — Bond Coupon Distribution with Compliance-Aware Suspension"
  environment: Monad Testnet (Chain ID 10143)
  reality_class: EVIDENCE_RECONSTRUCTION
  # Reason: Holder-5 is currently RELEASED on-chain.
  # Demo reconstructs historical Gate E state from actual transaction receipts,
  # then shows Gate F release using actual transaction evidence.
  # This is not simulation — it is an honest replay of verified on-chain history.
```

### Actor, Trigger, Transformation, Proof, Outcome

```
ACTOR:       Bond issuer distributing coupon payments to 5 token holders

TRIGGER:     distribute() called on SuspenseVault with 5 holders, 1 SPNS01 each

INITIAL STATE:
  - 5 allocations exist, all in READY state
  - SuspenseVault holds 5 SPNS01
  - Holder 5 has an inactive/frozen A-Pass (fails Cleanverse eligibility)

CORE TRANSFORMATION:
  Cleanverse canTransfer() is called per-holder at execution time:
  - Holders 1-4: canTransfer() → true → state: PAID, 1 SPNS01 transferred
  - Holder 5: canTransfer() → revert (Cleanverse policy) → state: SUSPENDED
  - SuspenseVault retains 1 SPNS01 for Holder 5

PROOF MOMENT 1 (Gate E):
  - Allocation table shows: 4 PAID (green) + 1 SUSPENDED (amber)
  - Accounting footer: 4 + 1 = 5 (all accounted)
  - Evidence chip: tx 0xc233...3779 → Monad Explorer
  - Vault balance: 1.0 SPNS01 (verifiable)

ELIGIBILITY CLEARS:
  - Holder 5's Cleanverse A-Pass is legitimately unfrozen
  - Evidence: tx 0xfc40...b2d5 (Cleanverse unfreeze)
  - Suspense performs fresh canTransfer() recheck → true

CORE TRANSFORMATION (release):
  release(allocationId) called with allocation ID:
  0x10a3b35d0496c5126a0ccb2d7f09a221dc73af57f372b742ba1d90980f97e0d4
  - Same allocation ID as the SUSPENDED record
  - Same amount: 1 SPNS01
  - State: SUSPENDED → RELEASED
  - Holder 5 balance: 0 → 1 SPNS01

PROOF MOMENT 2 (Gate F):
  - Allocation row: SUSPENDED (amber) → RELEASED (bright green) — animated transition
  - Allocation ID shown identically in both SUSPENDED and RELEASED records
  - Accounting footer: 4 PAID + 1 RELEASED = 5 (all accounted)
  - Evidence chip: tx 0x3295...c31 → Monad Explorer

PROOF MOMENT 3 (Duplicate protection):
  - Duplicate release(allocationId) attempt → rejected
  - UI shows: "Release attempted — ALREADY RELEASED. No duplicate permitted."

OUTCOME:
  - All 5 allocations: 4 PAID + 1 RELEASED = 5/5 accounted
  - Holder 5 received their entitlement, delayed but never lost
  - No duplicate possible
  - Full audit trail: every state transition linked to a real transaction

FINAL STATE:
  - Latest documented state: RELEASED (Gate F evidence); live current state not re-queried this session.
  - Chain ID: 10143 (Monad Testnet)
  - Vault balance: 0 SPNS01

MEMORY SENTENCE:
  "Four got paid immediately. One couldn't legally move — but that entitlement
  stayed tracked. When Cleanverse cleared them, the exact same allocation was
  released."
```

### 9-Step Sequence UI Flow

```
STEP 1: Setup
  - Show: "Bond Coupon Distribution — SPNS01"
  - 5 allocation rows, all state: READY (gray)
  - Accounting: 0 PAID + 5 READY = 5 total

STEP 2: Distribution triggered
  - Button or indicator: "distribute() called"
  - Cleanverse integration panel expands: "Checking eligibility per holder..."

STEP 3: Holders 1-4 clear
  - 4 rows animate: READY → PAID (green)
  - Accounting updates: 4 PAID + 1 READY remaining

STEP 4: Holder 5 fails eligibility
  - Row 5 animates: READY → SUSPENDED (amber pulse)
  - Integration panel: "canTransfer() → Policy revert (inactive A-Pass)"
  - Accounting: 4 PAID + 1 SUSPENDED = 5 ✓

STEP 5: Suspended state displayed
  - Gate E evidence chip appears: [tx 0xc233...3779 ↗]
  - Vault balance displayed: "SuspenseVault holds: 1.0 SPNS01"
  - UX truth banner: "Viewing historical Gate E state"

STEP 6: Eligibility clears
  - Timeline advances or "NEXT" indicator
  - "Cleanverse: Holder 5 A-Pass reactivated"
  - Evidence: [Unfreeze tx 0xfc40...b2d5 ↗]
  - Suspense recheck indicator: "Fresh canTransfer() → ALLOWED"

STEP 7: Release triggered
  - release(allocationId) called
  - Allocation ID highlighted: "0x10a3...e0d4 → RELEASING"

STEP 8: RELEASED
  - Row 5: amber → bright green flash → RELEASED
  - Same allocation ID shown in RELEASED state
  - Gate F evidence chip: [tx 0x3295...c31 ↗]
  - Accounting: 4 PAID + 1 RELEASED = 5 ✓ (all accounted)

STEP 9: Duplicate blocked
  - Attempt indicator → "REJECTED: Allocation already RELEASED"
  - Final state: 5/5 accounted for, no duplicates possible
```

### Demo Primary Path Mapping

| Requirement | Demo step | Evidence |
|-------------|-----------|----------|
| REQ-DEMO-001: 9-step sequence | Steps 1-9 above | Complete |
| REQ-DEMO-002: 4+1=5 unmistakable | Accounting footer, steps 4+5 | Persistent |
| REQ-PROD-001: Cleanverse determines eligibility | Step 4 (canTransfer() result shown) | Gate C+D evidence |
| REQ-PROD-002: One blocked ≠ all blocked | Steps 3+4 (4 PAID before Step 5) | Gate E tx |
| REQ-PROD-003: Suspended value accounted | Steps 4-5 (vault balance shown) | Gate E tx |
| REQ-PROD-004: Fresh recheck required | Step 6 (explicit recheck UI) | Gate F evidence |
| REQ-PROD-005: Same allocation ID released | Steps 7-8 (ID shown identically) | Gate F tx |
| REQ-PROD-006: Duplicate blocked | Step 9 | Gate F tx (implicit) |
| REQ-PROD-007: Testnet ≠ mainnet | UX truth banner (all steps) | Chain ID: 10143 |
| REQ-PROD-008: Historical SUSPENDED ≠ current | UX truth banner (step 5) | Brief section 15 |

---

## 9. DEMO VIDEO NARRATIVE

### Format and constraints

- Duration: 75–90 seconds
- Audience: Hackathon judges (technical, unfamiliar with Suspense)
- Format: Screen recording of the Hero Demo UI, voice narration, optional caption overlay
- Reality class: Evidence reconstruction (must not claim current SUSPENDED state)
- Tools available: Descript (for transcript editing / caption), Higgsfield (for audio if needed)

### Script

```
OPENING (0–8s)
[Show: headline "Pay what clears. Hold what doesn't." — Suspense logo]

NARRATION:
"When you distribute tokenized assets to multiple holders, compliance
can block some while clearing others. What happens to the one that
can't move yet?"

---

SETUP (8–20s)
[Show: 5 allocation rows, all READY — "Bond Coupon Distribution"]

NARRATION:
"Suspense runs Cleanverse eligibility checks per-holder at execution time.
Five holders. One SPNS01 coupon each."

---

DISTRIBUTION (20–35s)
[Show: 4 rows flip to PAID (green). Row 5 flips to SUSPENDED (amber)]
[Accounting footer appears: 4 PAID + 1 SUSPENDED = 5]

NARRATION:
"Four holders clear Cleanverse policy. Paid immediately.
One holder's A-Pass is inactive. Cleanverse says no.
That holder's exact allocation is marked SUSPENDED —
held in the vault. Not lost. Waiting."

---

PROOF MOMENT 1 (35–45s)
[Show: Gate E evidence chip, tx hash, vault balance "1.0 SPNS01"]

NARRATION:
"Four plus one equals five. All five are accounted for.
Every cent. The transaction is on Monad Testnet."
[Click tx hash → Monad Explorer visible]

---

ELIGIBILITY CLEARS (45–55s)
[Show: "Cleanverse: A-Pass reactivated" — fresh canTransfer() → ALLOWED]

NARRATION:
"Later, Cleanverse eligibility clears.
Suspense performs a fresh check.
The holder is now eligible."

---

RELEASE (55–68s)
[Show: Row 5 — amber → flash → bright green — RELEASED]
[Allocation ID shown: same in SUSPENDED and RELEASED]
[Accounting footer: 4 PAID + 1 RELEASED = 5]

NARRATION:
"The same allocation — the same ID, the same amount —
is now released to the holder.
Not a new allocation. The same one. Provably."
[Gate F evidence chip visible]

---

DUPLICATE BLOCKED (68–73s)
[Show: Duplicate attempt → "REJECTED: Already RELEASED"]

NARRATION:
"And that allocation can only release once."

---

CLOSE (73–82s)
[Show: 5/5 rows — 4 PAID (green) + 1 RELEASED (bright green). Accounting: 4 PAID + 1 RELEASED = 5 total. Cleanverse logo visible.]

NARRATION:
"Suspense: compliance-aware distribution that preserves every entitlement
until Cleanverse says it can move.
Pay what clears. Hold what doesn't."
```

### Video production notes

- No AI-generated presenter face (risk: generic/distracting)
- Screen capture of working UI is the primary visual
- Narration: calm, institutional tone (not consumer-app enthusiasm)
- Captions recommended for sound-off viewing
- The accounting footer (4+1=5) must be visible in at least 3 scenes
- Each transaction hash must be readable (pause on it for ≥ 2 seconds)
- Avoid zooming on empty/decorative UI elements — always zoom on data

---

## 10. AUTHENTIC ON-CHAIN EVIDENCE PRESENTATION

Evidence integration strategy (grounded in invariants #9 and #10):

### What to show inline

| Evidence item | Where shown | Reality class |
|---------------|-------------|---------------|
| Gate E tx: 0xc233...3779 | After distribution step, below allocation table | FACT (tx receipt inspected) |
| Gate F tx: 0x3295...c31 | After release step, below allocation table | FACT (tx receipt inspected) |
| Suspended allocation ID: 0x10a3...e0d4 | In SUSPENDED row AND in RELEASED row | FACT (both events documented) |
| Vault balance 1.0 SPNS01 | After step 5, Cleanverse integration panel | INFERENCE (from Gate E event; not live-queried this session) |
| Holder 5 balance 0→1 SPNS01 | After RELEASED | FACT (Gate F evidence shows this) |
| Duplicate rejection | Step 9 UI element | FACT (Gate F evidence documents this) |

### What NOT to show as live

- Current SUSPENDED balance (on-chain state is RELEASED — invariant #10)
- Claimed live Cleanverse API response (not re-queried in this session)
- "Live" indicator on any data not freshly queried at demo time

### Evidence disclosure approach

A small persistent badge on the demo:
```
[Historical Evidence Mode]
Replaying verified on-chain sequence.
Transactions linked. Latest documented state: RELEASED (Gate F evidence).
```

This is not a disclaimer — it is a credibility statement. Judges who understand blockchains will appreciate that the demo is honest about state.

---

## 11. CANONICAL SKILL OUTPUT

```yaml
status: PASS

summary: >
  CORE-11 creative_direction complete for SUSPENSE-001.
  Creative thesis established: "The allocation never left. It was waiting."
  Full visual system, positioning stack, evaluator memory target, judge model,
  Hero Demo design (9-step sequence), and demo video script produced.
  All outputs grounded in verified project facts.
  No protected invariants modified. No evidence class upgraded.
  No unauthorized actions taken.

artifact: CREATIVE-DIRECTION-001.md

decisions:
  - "Creative thesis: 'The allocation never left. It was waiting.'"
  - "Aesthetic concept: Settlement Console (institutional, information-dense, dark-primary)"
  - "Amber (#F59E0B) as SUSPENDED state color: signals careful hold, not failure"
  - "Accounting footer (4+1=5) is persistent, non-collapsible — invariant anchor"
  - "Evidence chips appear inline at proof moments, not in separate transactions tab"
  - "Demo is 'Evidence Reconstruction' class: shows historical sequence using actual tx receipts; current state banner confirms RELEASED"
  - "Demo video: 75-90s, screen capture + narration, no AI presenter"
  - "Evaluator memory target: 'Four got paid immediately. One couldn't legally move — but that entitlement stayed tracked. When Cleanverse cleared them, the exact same allocation was released.'"

evidence:
  - source: docs/GATE_CD_EVIDENCE.md
    class: FACT (inspected)
    contribution: Cleanverse policy call results, CVA transfer blocking — used in Step 4 design
  - source: docs/GATE_EF_EVIDENCE.md
    class: FACT (inspected)
    contribution: Distribution results, allocation ID, release tx, duplicate rejection — used in Steps 5-9
  - source: PROJECT-BRIEF.md sections 2-5, 14-16
    class: FACT (inspected)
    contribution: Product definition, invariants, hero demo sequence, UX truth requirements

assumptions:
  - "On-chain state of Holder-5 is RELEASED (per Gate F evidence; not re-verified via live query this session)"
  - "Monad Testnet explorer provides publicly accessible tx hash links"
  - "Font stack (Inter + JetBrains Mono) available via CDN or system fallback"
  - "Demo video will be produced after frontend implementation is complete"

limitations:
  - "Visual design is direction, not final implementation spec — pixel-level decisions belong to frontend phase"
  - "Demo video script assumes working UI exists; production blocked until frontend is built"
  - "On-chain live query of current allocation state not performed — current state is INFERENCE from Gate F evidence"
  - "Color values are design decisions; WCAG contrast must be verified in frontend phase"
  - "Hackathon judging criteria sourced from PROJECT-BRIEF.md section 17 — no live rubric document inspected this session"

blockers: []

state_delta:
  - file: PROJECT-STATE.yaml
    field: primary_path.status
    old: ROUTING_COMPLETE
    new: CREATIVE_DIRECTION_COMPLETE
  - file: ARTIFACT-MANIFEST.yaml
    action: REGISTER
    artifact_id: ART-CD-001
    name: Creative Direction & Product Model
    path: ".pbpd/work/CREATIVE-DIRECTION-001.md"
    type: CREATIVE_DIRECTION
    status: PRODUCED
  - file: DECISION-LOG.yaml
    action: REGISTER
    decisions:
      - "Creative thesis established"
      - "Settlement Console aesthetic adopted"
      - "Color system defined: PAID=green, SUSPENDED=amber, RELEASED=bright-green"
      - "Hero Demo is Evidence Reconstruction class"
      - "Demo video script produced"
  - file: ACTIVITY-TRACE.yaml
    action: REGISTER
    entry: ACT-013 CREATIVE_DIRECTION_EXECUTED

recommended_next_action: >
  Route to Design & UI/UX Specialist (pbpd-builder:specialist-design-uiux)
  for frontend component architecture and HTML/CSS/JS implementation of
  the Suspense Hero Demo — using this creative direction document as the
  authoritative brief. Scope: allocation table with state badges, accounting
  footer, Cleanverse integration panel, evidence chips, UX truth banner,
  9-step demo sequence, and responsive layout. Do not begin until this
  creative direction document is committed to the project repository.
```

---

## 12. PROTECTED INVARIANT COMPLIANCE CHECK

| Invariant | Status | Note |
|-----------|--------|------|
| 1. Cleanverse determines eligibility | ✓ PRESERVED | canTransfer() result drives all state transitions in demo |
| 2. Suspense preserves entitlement when blocked | ✓ PRESERVED | SUSPENDED state is the product's identity |
| 3. One blocked ≠ all blocked | ✓ PRESERVED | Steps 3+4 show 4 PAID before Holder 5 is SUSPENDED |
| 4. Suspended value fully accounted | ✓ PRESERVED | Accounting footer is always on screen |
| 5. Release requires fresh Cleanverse recheck | ✓ PRESERVED | Step 6 makes recheck explicit and visible |
| 6. Same allocation ID and amount released | ✓ PRESERVED | Allocation ID shown identically in SUSPENDED and RELEASED |
| 7. Duplicate release impossible | ✓ PRESERVED | Step 9 demonstrates rejection |
| 8. Verified A-F evidence remains canonical | ✓ PRESERVED | All evidence chips reference canonical Gate evidence |
| 9. Testnet ≠ mainnet | ✓ PRESERVED | Chain ID 10143 shown; UX truth banner indicates Monad Testnet |
| 10. Historical SUSPENDED ≠ current state after RELEASED | ✓ PRESERVED | UX truth banner "Historical Evidence Mode" + "Current state: RELEASED" |

**All 10 protected invariants preserved. No escalation required.**

---

*End of CREATIVE-DIRECTION-001 — CORE-11 creative_direction execution output*
*Document class: DECISION (creative direction from verified facts)*
*Authority: AUTHORIZED_WITH_LIMITS*
*Terminal boundary: BUILD_CANDIDATE_READY (not PROJECT_COMPLETE)*
