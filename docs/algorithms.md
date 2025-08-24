# Algorithms and Numerical Safety (Plain Language)

This explains how the math is done safely, without expecting the user to know formulas.

## 1) Bayes’ Theorem for Several Hypotheses

- You have H1, H2, …, Hn (possible explanations).
- You start with priors P(H_i).
- You see evidence E. For each hypothesis, estimate likelihood P(E | H_i).
- Updated belief: P(H_i | E) ∝ P(H_i) × P(E | H_i).
- The symbol ∝ means “proportional to.” To get actual probabilities that sum to 1, we normalize (divide by the total across all hypotheses).

Plain‑language steps:
1) Multiply each prior by its corresponding likelihood.
2) Add up all these products.
3) Divide each product by the total so they sum to 100%.

## 2) Repeated Conditionalization (Multiple Evidence Items)

- After the first update, the posteriors become your new priors.
- Add the next evidence item and repeat the same steps.

## 3) Uncertain Evidence (Jeffrey Conditionalization)

Sometimes you are not sure which way to classify the evidence. Example: a test result looks “probably positive,” not definitely positive.

- Think of evidence as a set of categories that cover all possibilities (a partition): E1, E2, …, Em (e.g., Positive vs Negative; or Low/Medium/High).
- You provide your target overall weights for these categories after seeing the ambiguous evidence (e.g., 70% Positive, 30% Negative). Call these q_j.
- The app computes what your current belief predicted for those categories before adjustment, call these p_j.
- Jeffrey update rule (in words): each hypothesis gets adjusted by how much each category’s weight changed, weighted by how expected that category is if the hypothesis were true.

Implementation outline (no formulas required to use it):
1) From your current beliefs, compute p_j = current overall chance for each evidence category E_j.
2) For each hypothesis H_i, compute an adjustment factor that blends how E_j changes from p_j to q_j and how compatible H_i is with E_j.
3) Normalize the adjusted values to sum to 1. The result is your new belief after uncertain evidence.

Notes:
- Two‑way case (e.g., Positive vs Negative) is a special case of the multi‑way rule.
- If q_j equals p_j for all j, beliefs don’t change (as expected).

## 4) Numerical Stability and Tiny Numbers

We protect against numerical issues (like underflow) by:
- Working in log‑space when multiplying many small numbers: we add logs instead of multiplying raw numbers.
- Using a safe “log‑sum‑exp” method when normalizing to avoid overflow/underflow.
- Accepting scientific notation (e.g., 1e-12) and converting precisely.
- Detecting zero or near‑zero inputs and warning when they imply impossible combinations.
- Avoiding divide‑by‑zero by adding tiny epsilons only when mathematically justified and with clear user warnings.

## 5) Zeros and Impossible Events

- If a prior is exactly 0, that hypothesis cannot recover unless the user changes it.
- If a likelihood is 0 for the observed evidence, that hypothesis is ruled out for that update.
- The app explains these cases clearly and suggests options (e.g., use a very small number instead of exact 0 if appropriate).

## 6) Rounding and Display

- Internally: high precision floating‑point with log‑space.
- Display: configurable rounding (e.g., 2–6 decimal places), optional scientific notation.
- All displays always re‑normalize to 100% to avoid confusion.

## 7) Worked Example (Sketch)

- Priors: H1 = 60%, H2 = 40%.
- Likelihoods for scratching sound: P(E|H1) = 10%, P(E|H2) = 70%.
- Multiply: H1 → 0.6×0.1=0.06; H2 → 0.4×0.7=0.28.
- Normalize total 0.34: Posteriors → H1 ≈ 17.6%, H2 ≈ 82.4%.
- Add new evidence similarly, using the latest posteriors as your new priors.

Jeffrey example (two categories Positive/Negative):
- Current beliefs predict Positive with p = 40% overall; you assess q = 70%.
- The app gently shifts beliefs toward hypotheses that more strongly predict Positive, in proportion to the p→q change, then re‑normalizes.

## 8) Verification

- A Python reference implementation (not shipped) cross‑checks numeric results for thousands of random cases.
- Property tests ensure probabilities always sum to 1 and remain within [0,1].
