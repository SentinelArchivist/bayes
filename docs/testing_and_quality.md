# Testing and Quality Plan

We ensure the app is correct, stable, and accessible. This plan is readable for non‑coders.

## 1) What We Test

- Algorithms
  - Bayes updates match expected results for many scenarios.
  - Jeffrey updates behave correctly for 2‑way and multi‑way cases.
  - Probabilities always stay in [0,1] and sum to ~1 (within rounding).
  - Robustness with tiny numbers (scientific notation).
- UI
  - Inputs validate and guide the user.
  - Charts update immediately and correctly.
  - Undo/redo works across many steps.
- Accessibility
  - Keyboard navigation, screen reader labels, color contrast.
- Offline
  - Full functionality offline; no network errors.
- Performance
  - Smooth on iPhone for up to 200 hypotheses and hundreds of evidence items.

## 2) How We Test

- Unit Tests (JavaScript)
  - Pure functions for updates and normalization.
  - Edge cases: zeros, near‑zeros, conflicting inputs.
- Cross‑Checks (Python Reference)
  - A small Python script computes the same updates and compares results.
  - Acts as an independent “oracle” for numeric accuracy.
- Property‑Based Tests (optional)
  - Randomly generated inputs; assert invariants (probabilities valid, monotonic effects in simple cases).
- UI Tests
  - Scripted user flows for add hypotheses, add evidence, undo/redo, import/export.
- Accessibility Tests
  - Automated checks plus manual review with screen readers.

## 3) Acceptance Criteria (Definition of Done)

- All required user flows pass.
- Probabilities correct within tight tolerance (e.g., 1e-12 relative error where relevant).
- Offline works end‑to‑end.
- Meets WCAG 2.1 AA basics.
- No P0/P1 defects open; P2s triaged.

## 4) Quality Gates

- Code review checklist focused on clarity, simplicity, and safety.
- Numeric safety checklist (log‑space where needed, normalization, zero handling).
- Security/privacy checklist.

## 5) Observability (Local)

- In‑app debug panel (optional) shows intermediate values when enabled by the user.
- No external telemetry by default.
