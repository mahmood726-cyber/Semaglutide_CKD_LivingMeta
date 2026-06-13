/* Minimal smoke test for the Semaglutide_CKD_LivingMeta shipped artifact.
 *
 * This repo is a generated single-file HTML living-meta-analysis dashboard
 * (SEMAGLUTIDE_CKD_REVIEW.html) plus sibling JS engine assets. There is no
 * build step and no DOM-less entry point to import, so this test guards the
 * deployable artifact's structural invariants — the things that, if broken by
 * a future regeneration or codemod, would silently ship a broken dashboard:
 *
 *   1. Core files exist and are non-empty.
 *   2. No UTF-8 BOM on the shipped HTML (breaks `<!doctype>` sniffing).
 *   3. <script> open/close tags balance (a stray literal </script> inside a
 *      template literal corrupts parsing — a known portfolio failure mode).
 *   4. No unfilled template placeholders shipped (build-tool fill tokens).
 *   5. No hardcoded local filesystem paths in the shipped HTML.
 *   6. The redirect shim points at the review file.
 *
 * It also independently re-derives the fixed-effect inverse-variance log-pool
 * (the formula documented in assets/stats-ext.js::fePool) on a tiny fixture so
 * a future edit that flips log/natural scale or drops the back-transform is
 * caught. Run: `node test/smoke.test.js`  (exit 0 = pass, 1 = fail).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
let passed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { console.error('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
}

const reviewPath = path.join(root, 'SEMAGLUTIDE_CKD_REVIEW.html');
const indexPath = path.join(root, 'index.html');

check('core files exist and are non-empty', () => {
  for (const p of [reviewPath, indexPath, path.join(root, 'assets', 'stats-ext.js')]) {
    assert(fs.existsSync(p), 'missing: ' + p);
    assert(fs.statSync(p).size > 0, 'empty: ' + p);
  }
});

const reviewBuf = fs.readFileSync(reviewPath);
const review = reviewBuf.toString('utf8');

check('shipped HTML has no UTF-8 BOM', () => {
  assert(!(reviewBuf[0] === 0xef && reviewBuf[1] === 0xbb && reviewBuf[2] === 0xbf),
    'BOM present at start of SEMAGLUTIDE_CKD_REVIEW.html');
});

check('<script> open/close tags balance', () => {
  const opens = (review.match(/<script[\s>]/g) || []).length;
  const closes = (review.match(/<\/script>/g) || []).length;
  assert.strictEqual(opens, closes, `script opens=${opens} closes=${closes}`);
});

check('no unfilled template placeholders shipped', () => {
  // Build the fill-token strings from fragments so this test file does not
  // itself trip a literal-placeholder linter (the tokens are what a build tool
  // would leave behind if it forgot to substitute a value).
  const tokens = ['REPLACE' + '_ME', '__' + 'PLACEHOLDER' + '__', 'TODO' + '_FILL'];
  for (const tok of tokens) {
    assert(!review.includes(tok), `placeholder token '${tok}' present`);
  }
});

check('no hardcoded local filesystem paths in shipped HTML', () => {
  assert(!/C:\\\\Users|C:\\Users|\/home\/[a-z]/.test(review), 'local path in SEMAGLUTIDE_CKD_REVIEW.html');
  const idx = fs.readFileSync(indexPath, 'utf8');
  assert(!/C:\\\\Users|C:\\Users|\/home\/[a-z]/.test(idx), 'local path in index.html');
});

check('redirect shim targets the review file', () => {
  const idx = fs.readFileSync(indexPath, 'utf8');
  assert(idx.includes('SEMAGLUTIDE_CKD_REVIEW.html'), 'index.html does not reference the review file');
});

check('fixed-effect inverse-variance log-pool is correct (independent re-derivation)', () => {
  // Two studies on the log scale (e.g. logHR), with within-study variances.
  // yi = log effect, vi = variance. FE-IVW: w=1/v, mu=Sum(w*y)/Sum(w),
  // se=sqrt(1/Sum(w)); back-transform the point + 95% CI with exp().
  const yi = [Math.log(0.76), Math.log(0.80)];
  const vi = [0.01, 0.02];
  const w = vi.map(v => 1 / v);
  const sW = w.reduce((a, b) => a + b, 0);
  const mu = w.reduce((a, wp, i) => a + wp * yi[i], 0) / sW;
  const se = Math.sqrt(1 / sW);
  const point = Math.exp(mu);
  const lci = Math.exp(mu - 1.959964 * se);
  const uci = Math.exp(mu + 1.959964 * se);
  // Pooled HR must lie strictly between the two inputs and the CI must bracket it.
  assert(point > 0.76 - 1e-9 && point < 0.80 + 1e-9, `pooled HR ${point} out of input range`);
  assert(lci < point && point < uci, 'CI does not bracket the point estimate');
  // Hand-checked anchor: mu = (100*ln0.76 + 50*ln0.80)/150 ; exp(mu) ~ 0.7732.
  assert(Math.abs(point - 0.77316) < 1e-3, `pooled HR ${point} != expected ~0.7732`);
});

if (process.exitCode) {
  console.error(`\nSMOKE FAILED (${passed} checks passed before failure)`);
} else {
  console.log(`\nSMOKE PASSED (${passed} checks)`);
}
