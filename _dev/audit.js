/* 题库审计：数量 / 唯一 id / 答案键 / 填空可用性 / 重复题干 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/rng.js', 'js/data.js', 'js/bank-basic.js', 'js/bank-listing.js', 'js/bank-ads.js', 'js/bank-interview.js', 'js/bank-ops.js', 'js/bank-extra.js', 'js/bank-interview2.js'];

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', runScripts: 'dangerously' });
const w = dom.window;
FILES.forEach(f => {
  const s = w.document.createElement('script');
  s.textContent = fs.readFileSync(path.join(ROOT, f), 'utf8');
  w.document.body.appendChild(s);
});

const D = w.DATA, R = w.R, F = w.F;
let bad = 0;
const fail = (m) => { bad++; console.log('  ✗ ' + m); };

console.log('\n【总量】');
console.log('  填空 ' + D.FILL.length + ' · 单选 ' + D.MCQ.filter(q => q.type !== 'multi').length +
  ' · 多选 ' + D.MCQ.filter(q => q.type === 'multi').length +
  ' · 简答 ' + D.SHORT.length + ' · 案例 ' + D.CASE.length);

const ids = [];
D.FILL.forEach(q => ids.push(q.id));
D.MCQ.forEach(q => ids.push(q.id));
D.SHORT.forEach(q => ids.push(q.id));
D.CASE.forEach(q => ids.push(q.id));

console.log('\n【唯一性】');
const seen = {};
ids.forEach(id => { seen[id] = (seen[id] || 0) + 1; });
const dup = Object.keys(seen).filter(k => seen[k] > 1);
if (dup.length) fail('id 重复：' + dup.join(', ')); else console.log('  ✓ ' + ids.length + ' 个 id 全部唯一');

console.log('\n【维度覆盖】');
const dimCount = {};
[...D.FILL, ...D.MCQ, ...D.SHORT, ...D.CASE].forEach(q => {
  dimCount[q.dim] = (dimCount[q.dim] || 0) + 1;
});
D.DIMS.forEach(d => {
  const n = dimCount[d.id] || 0;
  console.log('  ' + (n ? '·' : '✗') + ' ' + d.id.padEnd(11) + ' ' + String(n).padStart(3) + ' 题  ' + d.name);
  if (!n) fail('维度 ' + d.id + ' 没有题目（会拉低雷达图）');
});
Object.keys(dimCount).forEach(k => {
  if (!D.DIMS.some(d => d.id === k)) fail('维度 ' + k + ' 未在 DIMS 中注册');
});

console.log('\n【选择题答案键】');
let mcqBad = 0;
D.MCQ.forEach(q => {
  const oids = q.options.map(o => o.id);
  if (!Array.isArray(q.answer) || !q.answer.length) { fail(q.id + ' 无 answer'); mcqBad++; return; }
  q.answer.forEach(a => { if (oids.indexOf(a) < 0) { fail(q.id + ' 答案 ' + a + ' 不在选项里'); mcqBad++; } });
  if (q.type === 'multi' && q.answer.length < 2) { fail(q.id + ' 是多选但答案只有 1 个'); mcqBad++; }
  if (q.type !== 'multi' && q.answer.length !== 1) { fail(q.id + ' 是单选但答案 ' + q.answer.length + ' 个'); mcqBad++; }
  q.options.forEach(o => { if (!o.note) { fail(q.id + ' 选项 ' + o.id + ' 缺 note 解析'); mcqBad++; } });
  if (!q.summary) { fail(q.id + ' 缺 summary'); mcqBad++; }
});
if (!mcqBad) console.log('  ✓ ' + D.MCQ.length + ' 道选择题答案键与解析齐全');

console.log('\n【填空题随机生成 200 次】');
let fillBad = 0;
const savedSeed = R.seed();
D.FILL.forEach(q => {
  for (let i = 0; i < 200; i++) {
    R.setSeed(1000 + i * 7 + q.id.charCodeAt(1));
    let it;
    try { it = q.build(); } catch (e) { fail(q.id + ' build 抛错：' + e.message); fillBad++; break; }
    if (!it.blanks || !it.blanks.length) { fail(q.id + ' 无 blanks'); fillBad++; break; }
    it.blanks.forEach(b => {
      if (!isFinite(b.value)) { fail(q.id + ' 空 ' + b.key + ' 值非数字：' + b.value); fillBad++; }
      if (!b.label) { fail(q.id + ' 空 ' + b.key + ' 缺 label'); fillBad++; }
    });
    if (!it.steps || !it.steps.length) { fail(q.id + ' 缺 steps'); fillBad++; break; }
    if (!it.usage) { fail(q.id + ' 缺 usage'); fillBad++; break; }
  }
});
R.setSeed(savedSeed);
if (!fillBad) console.log('  ✓ ' + D.FILL.length + ' 道填空 × 200 次随机生成全部有效');

console.log('\n【简答/案例要点】');
let shBad = 0;
D.SHORT.forEach(q => {
  if (!q.checklist || q.checklist.length < 3) { fail(q.id + ' 要点少于 3 条'); shBad++; }
  if (!q.reference) { fail(q.id + ' 缺参考答案'); shBad++; }
});
D.CASE.forEach(q => {
  let it;
  try { it = q.build(); } catch (e) { fail(q.id + ' build 抛错：' + e.message); shBad++; return; }
  if (!it.checklist || it.checklist.length < 3) { fail(q.id + ' 要点少于 3 条'); shBad++; }
  if (!it.reference) { fail(q.id + ' 缺参考答案'); shBad++; }
  if (!it.scene) { fail(q.id + ' 缺 scene'); shBad++; }
});
if (!shBad) console.log('  ✓ ' + D.SHORT.length + ' 简答 + ' + D.CASE.length + ' 案例要点完整');

console.log('\n【题干查重】');
const stems = {};
let dupStem = 0;
D.MCQ.forEach(q => {
  const key = q.stem.replace(/[「」""''，。：；？！\s]/g, '').slice(0, 30);
  if (stems[key]) { fail('题干疑似重复：' + q.id + ' 与 ' + stems[key]); dupStem++; }
  stems[key] = q.id;
});
if (!dupStem) console.log('  ✓ 无重复题干');

console.log('\n' + (bad ? '===== 发现 ' + bad + ' 个问题 =====' : '===== 全部通过 ====='));
process.exit(bad ? 1 : 0);
