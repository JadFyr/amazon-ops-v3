/* 全库渲染巡检：99 道题逐一渲染 + 判分，检查 undefined / NaN / 报错 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/rng.js', 'js/data.js', 'js/bank-basic.js', 'js/bank-listing.js', 'js/bank-ads.js', 'js/bank-interview.js', 'js/bank-ops.js', 'js/bank-extra.js', 'js/bank-interview2.js', 'js/study.js', 'js/ui-sim.js', 'js/sims.js', 'js/engine.js'];

const dom = new JSDOM('<!doctype html><html><body><main id="viewport"></main></body></html>', { url: 'http://localhost/', runScripts: 'dangerously' });
const w = dom.window;
FILES.forEach(f => {
  const s = w.document.createElement('script');
  s.textContent = fs.readFileSync(path.join(ROOT, f), 'utf8');
  w.document.body.appendChild(s);
});

const QB = w.QB, R = w.R;
let bad = 0, n = 0;
const fail = (m) => { bad++; console.log('  ✗ ' + m); };

const all = QB.all();
console.log('\n全库 ' + all.length + ' 题\n');

const state = { inst: {}, ord: {}, exam: {}, quiz: {}, sim: {} };

all.forEach(function (q) {
  n++;
  let html = '', res, fb = '';
  try {
    html = QB.card(q, state, { ans: null, res: null, phase: 'input', showFb: false });
  } catch (e) {
    fail(q.id + ' 渲染抛错：' + e.message);
    return;
  }
  ['undefined', 'NaN', '[object Object]', 'null'].forEach(function (token) {
    if (html.indexOf('>' + token) > -1 || html.indexOf(token + '<') > -1) {
      fail(q.id + ' 渲染出 ' + token);
    }
  });

  /* 判分（空答案 + 一个伪造答案） */
  try {
    res = QB.judge(q, state, {});
    if (!res || !isFinite(res.score) || !isFinite(res.max)) fail(q.id + ' 判分返回异常');
    if (res.max <= 0) fail(q.id + ' max 分数为 ' + res.max);
    if (res.score > res.max) fail(q.id + ' 得分超过满分');
  } catch (e) {
    fail(q.id + ' 判分抛错：' + e.message);
    return;
  }

  /* 解析区渲染 */
  try {
    fb = QB.card(q, state, { ans: {}, res: res, phase: 'checked', showFb: true, showRef: true });
    if (fb.indexOf('undefined') > -1) fail(q.id + ' 解析区出现 undefined');
  } catch (e) {
    fail(q.id + ' 解析渲染抛错：' + e.message);
  }

  if (!q.title || !String(q.title).trim()) fail(q.id + ' 缺标题');
  if (!q.dim) fail(q.id + ' 缺 dim');
  if (q.layer !== 'base' && q.layer !== 'ops') fail(q.id + ' layer 异常：' + q.layer);
});

console.log('\n【按题型抽样判分】');
/* 用正确答案喂填空题，验证满分路径 */
let fullOk = 0, fullBad = 0;
w.DATA.FILL.forEach(function (t) {
  R.setSeed(77 + t.id.charCodeAt(1));
  const q = QB.get(t.id);
  const it = QB.inst(q, state);
  const ans = {};
  it.blanks.forEach(b => { ans[b.key] = String(b.value); });
  const r = QB.judge(q, state, ans);
  if (r.score === r.max) fullOk++; else { fullBad++; fail(t.id + ' 正确答案未满分：' + r.score + '/' + r.max); }
});
console.log('  填空满分路径：' + fullOk + ' / ' + w.DATA.FILL.length);

let mcOk = 0, mcBad = 0;
w.DATA.MCQ.forEach(function (q) {
  const r = QB.judge(QB.get(q.id), state, q.answer.slice());
  if (r.score === r.max) mcOk++; else { mcBad++; fail(q.id + ' 正确答案未满分：' + r.score + '/' + r.max); }
});
console.log('  选择满分路径：' + mcOk + ' / ' + w.DATA.MCQ.length);

console.log('\n' + (bad ? '===== ' + bad + ' 个问题 =====' : '===== 全库巡检通过（' + n + ' 题）====='));
process.exit(bad ? 1 : 0);
