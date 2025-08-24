# Product Specification

This document defines what the app must do and the quality bar it must meet. It is written in plain language for non‑coders.

## 1) Problem and Goals

- Help users apply Bayesian reasoning to any question without doing the math by hand.
- Keep the experience easy, visual, and trustworthy.
- Work fully offline on iPhone and Mac once installed as a PWA.

## 2) Users and Use Cases

- Students learning probability.
- Professionals making decisions (medicine, diagnostics, forecasting, risk, operations).
- Everyday decision makers (which explanation best fits the signs I see?).

Common tasks:
- Enter several competing explanations (hypotheses).
- Set initial chances (priors).
- Enter one or more pieces of evidence, each with likelihoods for every hypothesis.
- Update repeatedly as new evidence arrives.
- Handle uncertain or partial evidence (Jeffrey conditionalization).
- Save, export, and share projects.

## 3) Functional Requirements

- Hypotheses Management
  - Add, edit, remove, reorder any number of hypotheses.
  - Names, optional descriptions, optional color for charts.
- Priors
  - Enter priors as percentages, decimals, fractions, or scientific notation (e.g., 1e-6).
  - App normalizes automatically (they sum to 100%).
- Evidence Input (Certain)
  - For each evidence item, enter likelihood of seeing that evidence if each hypothesis were true.
  - Accepts the same number formats as priors.
  - Supports batch input (table view) and step‑by‑step wizard.
- Evidence Input (Uncertain: Jeffrey)
  - Allow user to express uncertainty about what the evidence means via target overall probabilities for evidence outcomes (e.g., “I’m 70% confident this test is positive”).
  - Support 2‑way and multi‑way partitions (e.g., Positive/Negative, or Multiple categories).
- Updating
  - Compute posteriors safely using numerically stable methods.
  - Support repeated conditionalization: each new evidence item updates the current beliefs.
  - History list with undo/redo.
- Results & Visualization
  - Show current posterior probabilities in bar chart and table.
  - Show a timeline chart of beliefs after each evidence update.
  - Provide plain‑language explanation of why values changed.
  - Optional odds‑form view.
- Projects and Storage (Offline First)
  - Create, name, duplicate, archive, delete projects.
  - Autosave locally on the device.
  - Import/Export projects as JSON; export charts as images/CSV.
- Guidance & Onboarding
  - Built‑in tutorial and examples.
  - Tooltips for key terms (hover/tap).
  - Validation and friendly error messages.
- Settings
  - Number format (percent vs decimal), rounding, scientific notation display.
  - Dark mode, font size, accessibility preferences.

## 4) Non‑Functional Requirements

- Performance
  - Instant updates for up to 200 hypotheses and hundreds of evidence items.
  - Memory‑efficient and responsive on mid‑range iPhones.
- Numeric Accuracy & Stability
  - Use log‑space and careful normalization to avoid underflow/overflow.
  - Clear handling of zeros and near‑zeros with warnings.
- Reliability
  - Autosave and crash‑safe storage.
  - Versioned local database with safe migrations.
- Usability & Accessibility
  - WCAG 2.1 AA contrast, keyboard navigation, screen reader labels.
  - Simple language, no unnecessary jargon.
- Privacy & Security
  - Local‑first: no data leaves device without explicit export.
  - If optional sync is added later, require encryption in transit, rate‑limiting, CAPTCHA on auth routes, and row‑level security (RLS) on the database.
  - Never hardcode secrets; use environment variables for any future backend.
- Offline
  - Full functionality offline after first install; app shell and data pre‑cached.
- Internationalization (Future)
  - Language packs structure planned; shipped in English first.

## 5) Constraints

- Tech stack: HTML/CSS/JS for the PWA UI and storage. Python may be used for reference algorithm tests/tools, not for the shipped app.
- Must install and function as a PWA on iPhone and Mac, fully offline.
- No server required for core features.

## 6) Out of Scope (v1)

- Continuous distributions and complex Bayesian networks.
- Automatic estimation of likelihoods from raw datasets.
- Cloud sync, accounts, or collaboration (may be added later with strict security controls).

## 7) Data Model (Local)

- Project
  - id, name, createdAt, updatedAt, settings
- Hypothesis
  - id, projectId, label, description?, color?, sortIndex
- State (a belief snapshot)
  - id, projectId, index (0 = initial), priors[], posteriors[]
- Evidence Item
  - id, projectId, type (certain | jeffrey), createdAt
  - For certain: likelihoods[] (per hypothesis)
  - For jeffrey: partition labels[], target partition weights[]
- History
  - sequence of (state, evidence) pairs; supports undo/redo

Stored locally in IndexedDB; export/import as JSON.

## 8) Error Handling & Validation

- Validate numeric inputs (type, range, sum to 1 for partitions).
- Protect against all‑zero priors or likelihoods.
- Friendly explanations when inputs imply impossibility.
- Undo any update that produces NaN/Infinity; show guidance.

## 9) Documentation & Help

- In‑app walkthrough; examples with filled‑in values.
- Glossary with simple definitions.
- Links to deeper reading for motivated users.
