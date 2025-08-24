# Overview: Bayes — A Pick‑Up‑and‑Play Bayesian Reasoning App

Bayes is a simple app that helps you update your beliefs when you see new evidence. You type in your possible explanations (called “hypotheses”), your initial guesses for how likely they are (called “priors”), and how likely your evidence would be if each explanation were true (called “likelihoods”). The app does the math and shows you the updated chances (called “posteriors”).

- For anyone, not just statisticians.
- Handles many hypotheses at once.
- Lets you update repeatedly as new evidence arrives.
- Works with tiny probabilities (scientific notation like 1e-9 is fine).
- Supports uncertain evidence using Jeffrey conditionalization (when you aren’t 100% sure what the evidence means).
- Beautiful, clear charts and plain‑language explanations.
- Works fully offline on iPhone and Mac once installed as a PWA.

## What is Bayesian Reasoning (in plain language)?

- You start with a belief about how likely each explanation is before seeing some new piece of evidence. This is your “prior.”
- You consider how expected the evidence would be assuming each explanation is true. This is the “likelihood.”
- You combine priors and likelihoods to get new, updated beliefs. These are your “posteriors.”
- When new evidence appears, start again: your previous posteriors become your new priors.

## A Simple Example

Suppose you’re deciding between two explanations for a noise at night:
- H1: “It’s the wind.” Prior guess: 60%.
- H2: “It’s an animal.” Prior guess: 40%.
You hear a scratching sound (evidence). If it were the wind, you think scratching would be rare (say 10%). If it were an animal, scratching would be common (say 70%). The app takes these numbers and updates the odds for H1 vs H2. If you later find tracks on the ground (new evidence), you just add that, and the app updates again.

## Why this App?

- Many people want to reason clearly about uncertainty but don’t want to fight with formulas.
- This app guides you through a friendly, step‑by‑step workflow with guardrails, tooltips, and clear visuals.
- It’s designed to be fast, private, and available offline.

## Platforms

- Progressive Web App (PWA): installable on iPhone and Mac.
- Fully offline once installed; your data stays on your device by default.

## Where to go next

- Full specification: `docs/specification.md`
- The math and how we implement it safely: `docs/algorithms.md`
- The screens and user experience: `docs/ui_ux.md`
- Offline/PWA and iPhone details: `docs/pwa_offline.md`
- Testing and quality plan: `docs/testing_and_quality.md`
- Security and privacy: `docs/security_and_privacy.md`
- Project plan with tasks and milestones: `docs/project_plan_tasks.md`
- Glossary: `docs/glossary.md`
