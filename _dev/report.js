/* 生成最终统计：题型 × 维度交叉表，用于交付报告 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/rng.js', 'js/data.js', 'js/bank-basic.js', 'js/bank-listing.js', 'js/bank-ads.js',
  'js/bank-interview.js', 'js/bank-ops.js', 'js/bank-extra.js', 'js/bank-interview2.js'];

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', runScripts: 'dangerously' });
const w = dom.window;
FILES.forEach(f => {
  const s = w.document.createElement('script');
  s.textContent = fs.readFileSync(path.join(ROOT, f), 'utf8');
  w.document.body.appendChild(s);
});

const D = w.DATA;
const TYPES = [
  ['FILL', '填空'],
  ['MCQ', '选择'],
  ['SHORT', '简答'],
  ['CASE', '案例']
];
// 单选/多选都放 MCQ，按 src 判断
function kindOf(q) {
  if (q.type === 'fill') return 'FILL';
  if (q.type === 'short') return 'SHORT';
  if (q.type === 'case') return 'CASE';
  return 'MCQ';
}
const all = []
  .concat((D.FILL || []).map(q => ({ q, k: 'FILL' })))
  .concat((D.MCQ || []).map(q => ({ q, k: 'MCQ' })))
  .concat((D.SHORT || []).map(q => ({ q, k: 'SHORT' })))
  .concat((D.CASE || []).map(q => ({ q, k: 'CASE' })));

const dims = (D.DIMS || []).map(d => d.id);
const dimName = {};
(D.DIMS || []).forEach(d => { dimName[d.id] = d.name; });

// 交叉表
const cross = {};
dims.forEach(d => { cross[d] = { FILL: 0, MCQ: 0, SHORT: 0, CASE: 0 }; });
let noDim = 0;
all.forEach(it => {
  const d = it.q.dim;
  if (!cross[d]) { noDim++; return; }
  cross[d][it.k]++;
});

const order = dims.slice().sort((a, b) => {
  const ta = Object.values(cross[a]).reduce((x, y) => x + y, 0);
  const tb = Object.values(cross[b]).reduce((x, y) => x + y, 0);
  return tb - ta;
});

console.log('| 维度 | 填空 | 选择 | 简答 | 案例 | 小计 |');
console.log('|---|---|---|---|---|---|');
let sum = [0, 0, 0, 0];
order.forEach(d => {
  const c = cross[d];
  const t = c.FILL + c.MCQ + c.SHORT + c.CASE;
  sum[0] += c.FILL; sum[1] += c.MCQ; sum[2] += c.SHORT; sum[3] += c.CASE;
  console.log(`| ${dimName[d]} \`${d}\` | ${c.FILL} | ${c.MCQ} | ${c.SHORT} | ${c.CASE} | **${t}** |`);
});
console.log(`| **合计** | **${sum[0]}** | **${sum[1]}** | **${sum[2]}** | **${sum[3]}** | **${all.length}** |`);
if (noDim) console.log(`\n无维度题：${noDim}`);

// 各 bank 文件贡献
const banks = ['bank-basic', 'bank-listing', 'bank-ads', 'bank-interview', 'bank-ops', 'bank-extra', 'bank-interview2'];
console.log('\n各文件贡献：');
const seen = {};
all.forEach(it => {
  const id = it.q.id;
  let src = 'data.js';
  banks.forEach(b => {
    const txt = fs.readFileSync(path.join(ROOT, 'js', b + '.js'), 'utf8');
    if (txt.indexOf("'" + id + "'") >= 0) src = b;
  });
  seen[src] = (seen[src] || 0) + 1;
});
Object.keys(seen).forEach(k => console.log(`  ${k}: ${seen[k]}`));

// 难度分布
const diff = {};
all.forEach(it => {
  const d = it.q.difficulty || (it.q.layer === 'base' ? 1 : 2);
  diff[d] = (diff[d] || 0) + 1;
});
console.log('\n难度分布：', JSON.stringify(diff));
