# UI/UX Plan

The experience is simple, friendly, and accessible. All features are discoverable without reading a manual.

## 1) Core Screens

- Home / Project Picker
  - Create new project, open recent, sample projects.
- Hypotheses Setup
  - Add/edit/remove hypotheses; set priors with sliders or numeric inputs.
  - Real‑time normalization; color pickers for charts.
- Evidence (Certain)
  - Table where each row is a hypothesis and you enter P(E|H) for the current evidence.
  - Wizard mode that guides you one step at a time.
- Evidence (Uncertain: Jeffrey)
  - Define categories (e.g., Positive/Negative), enter target overall weights.
  - Enter P(category|H) per hypothesis.
- Results
  - Posterior bar chart and table.
  - Timeline chart (posteriors after each update).
  - Plain‑language explanation of why numbers moved.
- History
  - List of all updates with timestamps; undo/redo.
- Settings
  - Display options (percent/decimal), rounding, scientific notation, theme, font size.
- Import/Export
  - JSON import/export; export charts as images; export table as CSV.
- Help
  - Mini‑tutorial, glossary, links.

## 2) Navigation & Flow

- Primary nav tabs: Setup, Evidence, Results, History, Settings.
- “Add Evidence” floating button visible on relevant screens.
- Contextual tooltips next to inputs.

## 3) Visual Design

- Clean, modern layout; high contrast; generous spacing.
- Bar charts for current posteriors; line chart for evolution over time.
- Color palette supports color‑blind safe defaults.
- Dark and light themes.

## 4) Accessibility (WCAG 2.1 AA)

- Keyboard navigation for all controls.
- ARIA labels and roles for screen readers.
- Color contrast ≥ 4.5:1; non‑color indicators for important states.
- Motion reduced for users who prefer reduced motion.

## 5) Copy and Guidance

- Plain‑language labels (e.g., “How likely is this evidence if H1 is true?”).
- Inline explanations when something seems off (e.g., all zeroes, sums not 1).
- Gentle warnings and suggestions (e.g., avoid exact 0 if you mean “very unlikely”).

## 6) iPhone Considerations

- Large tap targets; bottom‑aligned primary actions.
- Works well in portrait; responsive in landscape.
- PWA install prompt and step‑by‑step “Add to Home Screen” guidance.

## 7) Example Charts

- Posterior bar chart with hypothesis labels and values.
- Timeline chart: stacked lines or small multiples for each hypothesis.
- Optional odds view (log‑scale axis).
