// Algorithms for Bayesian updates with numerical stability
// Exports: Algorithms

function isFiniteProb(x) {
  return Number.isFinite(x) && x >= 0;
}

function normalize(arr) {
  const sum = arr.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(sum) || sum <= 0) {
    throw new Error('Normalization failed: sum is not positive.');
  }
  return arr.map(v => v / sum);
}

function log(x) {
  if (x <= 0 || !Number.isFinite(x)) return -Infinity;
  return Math.log(x);
}

function exp(x) {
  return Math.exp(x);
}

function logSumExp(logVals) {
  // returns log(sum_i exp(logVals[i])) stably
  const maxLog = Math.max(...logVals);
  if (!Number.isFinite(maxLog)) return -Infinity;
  let s = 0;
  for (const lv of logVals) s += Math.exp(lv - maxLog);
  return maxLog + Math.log(s);
}

export const Algorithms = {
  normalizeProbs(arr) {
    if (!Array.isArray(arr) || arr.length === 0) throw new Error('Expected non-empty array.');
    const sanitized = arr.map(v => (isFiniteProb(v) ? v : 0));
    const sum = sanitized.reduce((a, b) => a + b, 0);
    if (sum === 0) {
      // fallback to uniform
      return sanitized.map(() => 1 / sanitized.length);
    }
    return sanitized.map(v => v / sum);
  },

  bayesUpdate(priors, likelihoods) {
    // priors: array of P(H_i), likelihoods: array of P(E|H_i)
    if (priors.length !== likelihoods.length) throw new Error('Length mismatch.');
    const n = priors.length;
    const logPost = new Array(n);
    for (let i = 0; i < n; i++) {
      const lp = log(priors[i]);
      const ll = log(likelihoods[i]);
      logPost[i] = lp + ll; // unnormalized log posterior
    }
    const lz = logSumExp(logPost);
    const post = logPost.map(v => (v - lz > -745 ? exp(v - lz) : 0)); // 745 ~ exp underflow threshold
    return this.normalizeProbs(post);
  },

  repeatedUpdate(current, likelihoods) {
    return this.bayesUpdate(current, likelihoods);
  },

  jeffreyUpdate(current, likeMatrix, targetWeights) {
    // current: array P(H_i)
    // likeMatrix: nHypotheses x nCats where like[i][j] = P(E_j | H_i)
    // targetWeights: q_j (should sum to 1)
    const n = current.length;
    if (!Array.isArray(likeMatrix) || likeMatrix.length !== n) throw new Error('likeMatrix shape invalid');
    const m = likeMatrix[0].length;
    if (targetWeights.length !== m) throw new Error('targetWeights length invalid');

    const q = this.normalizeProbs(targetWeights);

    // For each category j, compute P(H_i | E_j) using Bayes, then weight by q_j
    const newBeliefs = new Array(n).fill(0);
    for (let j = 0; j < m; j++) {
      const logUnnorm = new Array(n);
      for (let i = 0; i < n; i++) {
        logUnnorm[i] = log(current[i]) + log(likeMatrix[i][j]);
      }
      const lz = logSumExp(logUnnorm);
      let pj = 0; // predicted P(E_j)
      if (Number.isFinite(lz)) pj = exp(lz);
      // Compute posterior given E_j
      let slice = logUnnorm.map(v => (Number.isFinite(lz) ? exp(v - lz) : 0));
      slice = this.normalizeProbs(slice);
      for (let i = 0; i < n; i++) newBeliefs[i] += q[j] * slice[i];
    }
    return this.normalizeProbs(newBeliefs);
  },
};
