import { Algorithms } from '../js/algorithms.js';

const R = document.getElementById('results');
function log(msg, cls) {
  const p = document.createElement('pre');
  p.textContent = msg;
  if (cls) p.className = cls;
  R.appendChild(p);
}
function approxEq(a, b, eps = 1e-10) { return Math.abs(a - b) <= eps; }
function sum(a) { return a.reduce((x,y)=>x+y,0); }

function test(name, fn) {
  try { fn(); log(`✔ ${name}`, 'ok'); }
  catch (e) { console.error(e); log(`✘ ${name}: ${e.message}`,'fail'); }
}

// Tests

test('normalizeProbs handles zeros -> uniform', () => {
  const out = Algorithms.normalizeProbs([0,0,0]);
  if (out.length !== 3) throw new Error('length');
  if (!approxEq(out[0], 1/3)) throw new Error('uniform');
  if (!approxEq(sum(out), 1)) throw new Error('sum');
});

test('bayesUpdate basic example', () => {
  const priors = [0.6, 0.4];
  const L = [0.1, 0.7];
  const post = Algorithms.bayesUpdate(priors, L);
  // Expected ≈ [0.17647, 0.82353]
  if (!approxEq(post[0], 0.06/0.34, 1e-6)) throw new Error('posterior[0]');
  if (!approxEq(sum(post), 1, 1e-12)) throw new Error('sum');
});

test('repeatedUpdate equivalence', () => {
  const priors = [0.5, 0.5];
  const L1 = [0.2, 0.8];
  const L2 = [0.8, 0.2];
  const post1 = Algorithms.bayesUpdate(priors, L1);
  const post2 = Algorithms.bayesUpdate(post1, L2);
  const direct1 = Algorithms.repeatedUpdate(priors, L1);
  const direct2 = Algorithms.repeatedUpdate(direct1, L2);
  if (!approxEq(post2[0], direct2[0], 1e-12)) throw new Error('mismatch');
});

test('jeffreyUpdate 2-way reduces to Bayes when q matches predicted', () => {
  const current = [0.6, 0.4];
  // Suppose P(Positive|H1)=0.1, P(Positive|H2)=0.7
  const like = [ [0.1, 0.9], [0.7, 0.3] ];
  // Compute predicted P(Positive)
  const predictedPos = current[0]*0.1 + current[1]*0.7; // 0.06+0.28=0.34
  const q = [predictedPos, 1 - predictedPos];
  const out = Algorithms.jeffreyUpdate(current, like, q);
  // When q equals predicted, Jeffrey update should leave beliefs unchanged
  if (!approxEq(out[0], current[0], 1e-12)) throw new Error('should not change');
});

test('tiny numbers do not underflow to NaN', () => {
  const priors = [1e-100, 1 - 1e-100];
  const L = [1e-100, 1e-100];
  const post = Algorithms.bayesUpdate(priors, L);
  if (!Number.isFinite(post[0]) || !Number.isFinite(post[1])) throw new Error('non-finite');
  if (!approxEq(sum(post), 1, 1e-12)) throw new Error('sum');
});

test('all-zero likelihoods handled gracefully', () => {
  const priors = [0.5, 0.5];
  const L = [0, 0];
  const post = Algorithms.bayesUpdate(priors, L);
  if (!Number.isFinite(post[0]) || !Number.isFinite(post[1])) throw new Error('non-finite');
  if (!approxEq(sum(post), 1, 1e-12)) throw new Error('sum');
});

test('extreme likelihood ratios', () => {
  const priors = [0.5, 0.5];
  const L = [1e-10, 1];
  const post = Algorithms.bayesUpdate(priors, L);
  if (!Number.isFinite(post[0]) || !Number.isFinite(post[1])) throw new Error('non-finite');
  if (!approxEq(sum(post), 1, 1e-12)) throw new Error('sum');
  if (post[1] <= post[0]) throw new Error('wrong ordering');
});

test('jeffreyUpdate with extreme weights', () => {
  const current = [0.5, 0.5];
  const like = [[0.1, 0.9], [0.9, 0.1]];
  const q = [1e-10, 1 - 1e-10]; // extreme weight
  const out = Algorithms.jeffreyUpdate(current, like, q);
  if (!Number.isFinite(out[0]) || !Number.isFinite(out[1])) throw new Error('non-finite');
  if (!approxEq(sum(out), 1, 1e-12)) throw new Error('sum');
});

test('jeffreyUpdate with many categories', () => {
  const current = [0.3, 0.3, 0.4];
  const like = [
    [0.2, 0.3, 0.3, 0.2],
    [0.4, 0.2, 0.2, 0.2], 
    [0.1, 0.4, 0.4, 0.1]
  ];
  const q = [0.25, 0.25, 0.25, 0.25];
  const out = Algorithms.jeffreyUpdate(current, like, q);
  if (out.length !== 3) throw new Error('wrong length');
  if (!approxEq(sum(out), 1, 1e-12)) throw new Error('sum');
});

test('normalizeProbs with mixed valid/invalid inputs', () => {
  const out = Algorithms.normalizeProbs([0.5, NaN, 0.3, Infinity, -0.1]);
  if (out.length !== 5) throw new Error('length');
  if (!approxEq(sum(out), 1, 1e-12)) throw new Error('sum');
  // Should treat NaN, Infinity, negative as 0
  if (!approxEq(out[0], 0.5/0.8)) throw new Error('normalization');
  if (!approxEq(out[2], 0.3/0.8)) throw new Error('normalization');
});

test('repeated updates maintain consistency', () => {
  let current = [0.4, 0.6];
  const evidenceSequence = [
    [0.8, 0.2],
    [0.3, 0.7],
    [0.9, 0.1]
  ];
  
  // Apply evidence sequentially
  for (const L of evidenceSequence) {
    current = Algorithms.bayesUpdate(current, L);
    if (!approxEq(sum(current), 1, 1e-12)) throw new Error('sum after update');
  }
  
  // Should be same as single combined update using log-space
  let logPost = [Math.log(0.4), Math.log(0.6)];
  for (const L of evidenceSequence) {
    logPost[0] += Math.log(L[0]);
    logPost[1] += Math.log(L[1]);
  }
  const maxLog = Math.max(...logPost);
  const combined = logPost.map(lp => Math.exp(lp - maxLog));
  const sumCombined = sum(combined);
  const normalizedCombined = combined.map(v => v / sumCombined);
  
  if (!approxEq(current[0], normalizedCombined[0], 1e-10)) throw new Error('sequential vs combined');
});

test('scientific notation edge cases', () => {
  const priors = [1e-300, 1 - 1e-300];
  const L = [1e-300, 1e-300];
  const post = Algorithms.bayesUpdate(priors, L);
  if (!Number.isFinite(post[0]) || !Number.isFinite(post[1])) throw new Error('scientific notation failed');
});

log('All tests finished. Review any failures above.');
