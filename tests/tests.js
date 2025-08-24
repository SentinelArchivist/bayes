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

log('All tests finished. Review any failures above.');
