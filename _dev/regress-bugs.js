/* 回归测试：Bug1（简答提交后不展开解析）+ Bug2（统计页已答口径） */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/rng.js', 'js/data.js', 'js/bank-basic.js', 'js/bank-listing.js',
  'js/bank-ads.js', 'js/bank-interview.js', 'js/bank-ops.js', 'js/bank-extra.js', 'js/bank-interview2.js', 'js/study.js', 'js/ui-sim.js', 'js/sims.js', 'js/engine.js', 'js/app.js'];

let pass = 0, fail = 0;
const ok = (c, label, extra) => {
  if (c) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra ? ' → ' + extra : '')); }
};

function boot(state) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true });
  const w = dom.window;
  w.confirm = () => true; w.alert = () => {};
  if (state) w.localStorage.setItem('amz-ops-v2-state', JSON.stringify(state));
  FILES.forEach(f => {
    const s = w.document.createElement('script');
    s.textContent = fs.readFileSync(path.join(ROOT, f), 'utf8');
    w.document.body.appendChild(s);
  });
  return w;
}

const stub = (_w, over) => Object.assign({
  v: 3, seed: 1, screen: 'quiz-run',
  inst: {}, ord: {},
  exam: { items: [], idx: 0, ans: {}, running: false, submitted: false },
  quiz: { items: [], idx: 0, ans: {}, revealed: {}, refOpen: {}, wrong: [], started: true, count: 20, module: 'all' },
  sim: { idx: 0, step: 0, items: {}, ans: {}, fb: {}, draft: {} }
}, over);

function typeInto(w, sel, text) {
  const el = w.document.querySelector(sel);
  if (!el) throw new Error('找不到输入框 ' + sel);
  el.value = text;
  el.dispatchEvent(new w.Event('input', { bubbles: true }));
}

console.log('\n【Bug 1】简答题：写完 → 按钮可点 → 提交后展开解析');

/* 1-a 题干里带潜台词 */
{
  const w = boot(stub(w0 => w0, { quiz: { items: ['S17'], idx: 0, ans: {}, revealed: {}, refOpen: {}, wrong: [], started: true } }));
  const d = w.document;
  ok(d.querySelector('.stem').textContent.indexOf('【潜台词】') > -1, '面试题题干含潜台词');

  /* 1-b 未输入时按钮状态 */
  const btn = d.querySelector('[data-act="quiz-submit"]');
  ok(!!btn, '存在提交按钮');
  ok(btn.disabled === false, '简答题提交按钮默认就可点（不再因未重绘卡死）');

  /* 1-c 输入后提交 */
  typeInto(w, 'textarea[data-act="qtext"]', '我先承认 92% 这个数字本身没有信息量，它只是起点，真正要回答的是剩下 8% 值不值得进。');
  const btn2 = d.querySelector('[data-act="quiz-submit"]');
  ok(btn2.disabled === false, '输入后按钮仍可点');
  btn2.click();

  const d2 = w.document;
  ok(!!d2.querySelector('.refbox'), '提交后立刻出现参考答案框');
  const checks = d2.querySelectorAll('.check-item');
  ok(checks.length >= 4, '出现可勾选的自评要点 Checklist', checks.length + ' 条');
  /* 参考答案默认折叠，点开后应有失分点 */
  const openBtn = d2.querySelector('[data-act="qref"]');
  ok(!!openBtn, '参考答案默认折叠，有「展开」按钮');
  openBtn.click();
  ok(w.document.querySelector('.refbox').textContent.indexOf('常见失分点') > -1, '展开后含失分点（踩坑答法）');

  /* 1-d 勾选自评 → 覆盖率变化 */
  const before = w.document.body.textContent.match(/自评覆盖率：\s*(\d+\/\d+)/);
  const chk = w.document.querySelectorAll('.check-item');
  chk[0].click();
  const after = w.document.body.textContent.match(/自评覆盖率：\s*(\d+\/\d+)/);
  ok(before && after && before[1] !== after[1], '勾选后自评覆盖率实时变化', (before && before[1]) + ' → ' + (after && after[1]));
}

console.log('\n【Bug 1】填空题：输入后按钮由灰变亮 + 提交后有代入过程');
{
  const w = boot(stub(null, { quiz: { items: ['F1'], idx: 0, ans: {}, revealed: {}, refOpen: {}, wrong: [], started: true } }));
  const d = w.document;
  const btn = d.querySelector('[data-act="quiz-submit"]');
  ok(btn.disabled === true, '填空题空着时按钮是灰的');

  typeInto(w, 'input[data-blank="ctr"]', '0.42');
  const btn2 = d.querySelector('[data-act="quiz-submit"]');
  ok(btn2.disabled === false, '填了一个空后按钮变亮（不再需要刷新）');

  btn2.click();
  const d2 = w.document;
  ok(!!d2.querySelector('.fb'), '提交后出现判分与解析');
  ok(d2.querySelector('.fb').textContent.indexOf('CTR =') > -1, '解析里有公式代入过程');
}

console.log('\n【Bug 2】统计口径：已答含主观，准确率只算客观');
{
  /* 一轮：1 道客观（答对）+ 1 道主观（已提交） */
  const st = stub(null, { quiz: {
    items: ['Q18', 'S17'], idx: 1,
    ans: { Q18: ['a'], S17: { text: '先承认 92% 没信息量，再说 8% 的绝对量。', checked: [true, true, false, false, false] } },
    revealed: { Q18: true, S17: true },
    refOpen: {}, wrong: [], started: true
  } });
  const w = boot(st);
  const d = w.document;
  d.querySelector('[data-act="quiz-stats"]').click();

  const nums = [...d.querySelectorAll('.stat .n')].map(e => e.textContent.trim());
  const labels = [...d.querySelectorAll('.stat .l')].map(e => e.textContent.trim());
  console.log('    卡片：' + labels.map((l, i) => l + '=' + nums[i]).join(' / '));

  const get = (label) => nums[labels.findIndex(l => l.indexOf(label) > -1)];
  ok(get('已答题数') === '2', '已答题数 = 2（1 客观 + 1 主观）', get('已答题数'));
  ok(get('客观题 答对') === '1/1', '客观题答对/已答 = 1/1', get('客观题 答对'));
  ok(get('客观题准确率') === '100%', '准确率只按客观题算 = 100%', get('客观题准确率'));
  ok(get('其中主观题') === '1', '主观题单独计数 = 1', get('其中主观题'));

  const dimTitle = d.body.textContent;
  ok(dimTitle.indexOf('按维度（仅客观题）') > -1, '维度表标明「仅客观题」');
  const dimBody = d.querySelectorAll('.card-tight table.tb tbody tr').length;
  ok(dimBody >= 1, '维度表有行');
  ok(!/业务面试[\s\S]{0,40}0 \/ 1/.test(dimTitle), '主观题维度没有以 0/1 污染维度表');
}

console.log('\n【Bug 2】只做主观题一轮：不应该显示 0/0 却已答 1');
{
  const st = stub(null, { quiz: {
    items: ['S18'], idx: 0,
    ans: { S18: { text: '我把动作和判断分开讲。', checked: [] } },
    revealed: { S18: true }, refOpen: {}, wrong: [], started: true
  } });
  const w = boot(st);
  const d = w.document;
  d.querySelector('[data-act="quiz-stats"]').click();
  const nums = [...d.querySelectorAll('.stat .n')].map(e => e.textContent.trim());
  const labels = [...d.querySelectorAll('.stat .l')].map(e => e.textContent.trim());
  console.log('    卡片：' + labels.map((l, i) => l + '=' + nums[i]).join(' / '));
  const get = (label) => nums[labels.findIndex(l => l.indexOf(label) > -1)];
  ok(get('已答题数') === '1', '只做主观题时，已答题数 = 1（原来显示 0）');
  ok(get('客观题准确率') === '—', '没有客观题时准确率显示「—」而不是 0%');
}

console.log('\n' + (fail ? '===== 失败 ' + fail + ' 项 =====' : '===== 全部通过（' + pass + ' 项）====='));
process.exit(fail ? 1 : 0);
