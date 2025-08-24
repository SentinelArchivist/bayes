# Project Plan and Task List

This is the step‑by‑step plan from concept to fully functional PWA, written for non‑coders. Each task includes a clear outcome. Check items off as we finish them.

## Milestone 1 — Foundations and Design

- [ ] Define product scope and success criteria (this spec).
- [ ] Finalize UI wireframes and user flows.
- [ ] Define data model (IndexedDB schema) and versioning plan.
- [ ] Decide rounding/display defaults and accessibility targets.

Deliverable: Updated docs and clickable mockups.

## Milestone 2 — Core Algorithms (JS) + Reference (Python)

- [ ] Implement discrete Bayes update in JS with log‑space and normalization.
- [ ] Implement repeated updates (state pipeline) and history snapshots.
- [ ] Implement Jeffrey conditionalization (2‑way, then multi‑way) in JS.
- [ ] Create Python reference scripts to cross‑check results.
- [ ] Unit tests covering edge cases (zeros, tiny numbers, scientific notation).

Deliverable: Tested JS algorithm module with passing tests and Python cross‑checks.

## Milestone 3 — Local Storage and Project Management

- [ ] Implement IndexedDB layer (projects, hypotheses, evidence, history).
- [ ] Autosave with debounce; versioned migrations.
- [ ] Import/export JSON; CSV export for tables; image export for charts.

Deliverable: Reliable offline data storage and backups.

## Milestone 4 — UI Screens and Interaction

- [ ] Build app shell (navigation, theming, settings).
- [ ] Hypotheses setup screen (add/edit/reorder, priors inputs).
- [ ] Evidence (certain) table + wizard.
- [ ] Evidence (Jeffrey) categories + inputs.
- [ ] Results screen (bar chart + table) and timeline chart.
- [ ] History with undo/redo.
- [ ] Help and onboarding tutorial.

Deliverable: Usable app with full core flows.

## Milestone 5 — PWA and Offline Excellence

- [ ] Add manifest.json, icons, iOS meta tags.
- [ ] Implement service worker (pre‑cache app shell, runtime caching, update flow).
- [ ] Offline fallback; cache versioning and cleanup.
- [ ] iPhone Add‑to‑Home‑Screen guidance.

Deliverable: Installable PWA that works fully offline on iPhone and Mac.

## Milestone 6 — Quality, Accessibility, and Performance

- [ ] Expand unit tests; add property tests.
- [ ] UI tests for main flows; manual accessibility audit (WCAG 2.1 AA).
- [ ] Performance profiling; ensure smooth behavior with large scenarios.
- [ ] In‑app debug panel (optional) hidden behind a toggle.

Deliverable: High‑quality, accessible app.

## Milestone 7 — Security/Privacy Hardening (Local‑First)

- [ ] Set CSP; audit inputs; sanitize rendered text.
- [ ] Update docs on local backups and privacy design.
- [ ] If planning future sync: draft backend spec with RLS, rate‑limits, CAPTCHA, WAF.

Deliverable: Security‑hardened PWA and future‑proofed plan.

## Milestone 8 — Release Preparation

- [ ] Versioning and changelog.
- [ ] Finalize examples and tutorials.
- [ ] Public website/readme polish; how‑to‑install guide for iPhone.

Deliverable: v1.0 ready for users.

---

## Detailed Task Breakdown

- Algorithms
  - [ ] Bayes update: multiply priors × likelihoods, normalize, log‑space.
  - [ ] Jeffrey update: compute current partition probs p_j, apply target q_j, adjust and normalize.
  - [ ] Robust zero/near‑zero handling and warnings.
  - [ ] Numeric utilities: log‑sum‑exp, safe parsing of scientific notation.
- Data Layer
  - [ ] IndexedDB wrapper; schema v1; migrations framework.
  - [ ] Entities: Project, Hypothesis, Evidence, State, History.
  - [ ] Import/export; conflict handling; backups.
- UI/UX
  - [ ] Components: Hypothesis list, Priors inputs (slider + numeric), Likelihoods table, Jeffrey categories editor, Charts, History panel, Settings.
  - [ ] Accessibility: keyboard focus order, ARIA labels, color contrast.
  - [ ] Charts: bar (current), line (timeline), odds/log scale option.
- PWA
  - [ ] Manifest, icons, iOS meta.
  - [ ] Service worker: pre‑cache, runtime caching, update prompt, offline fallback.
- Testing
  - [ ] JS unit tests; Python cross‑checks.
  - [ ] Property tests (optional); UI test scripts.
  - [ ] Performance tests with large inputs.
- Security/Privacy
  - [ ] CSP; input validation; sanitize user text.
  - [ ] Document privacy posture; export guidance.
  - [ ] Future backend (optional): RLS, rate limiting, CAPTCHA, WAF.

## Risks and Mitigations

- Tiny probabilities cause numerical errors → Use log‑space + strong tests.
- iOS storage eviction clears data → Encourage regular exports; small app size.
- Users confused by zeros → Provide coaching text and warnings.

## Definition of Done (Project)

- App installs as a PWA on iPhone and Mac; works offline.
- Core flows complete and tested; probabilities correct and stable.
- Accessibility and performance targets met.
- Security and privacy checks passed.
