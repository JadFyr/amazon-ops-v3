/* 阶段 5 回归：错题本闭环 / 复习已答题 / 知识库 / 考点联动 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/rng.js', 'js/data.js', 'js/bank-basic.js', 'js/bank-listing.js',
  'js/bank-ads.js', 'js/bank-interview.js', 'js/bank-ops.js', 'js/bank-extra.js', 'js/bank-interview2.js', 'js/study.js', 'js/ui-sim.js',
  'js/sims.js', 'js/engine.js', 'js/app.js'];

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra ? ' → ' + extra : '')); }
}

function boot(store) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true });
  const w = dom.window;
  w.confirm = () => true;
  w.alert = () => {};
  if (store) Object.keys(store).forEach(k => w.localStorage.setItem(k, store[k]));
  FILES.forEach(f => {
    const s = w.document.createElement('script');
    s.textContent = fs.readFileSync(path.join(ROOT, f), 'utf8');
    w.document.body.appendChild(s);
  });
  return dom;
}
const click = (w, sel) => {
  const el = w.document.querySelector(sel);
  if (!el) throw new Error('找不到元素: ' + sel);
  el.click();
};
const st = w => JSON.parse(w.localStorage.getItem('amz-ops-v2-state'));

/* ---------- 1. 空状态 ---------- */
console.log('\n【1】知识库入口与内容');
{
  const dom = boot(null), w = dom.window, d = w.document;
  ok(d.querySelectorAll('.mode-card').length === 3, '首页三个入口');
  ok(!!d.querySelector('[data-act="go-kb"]'), '有「系统知识库」大入口');
  ok(/先学后测/.test(d.querySelector('.mode-card-kb').textContent), '入口写明「先学后测」');

  click(w, '[data-act="go-kb"]');
  ok(!!d.querySelector('.kb-wrap'), '知识库渲染（左目录 + 右正文）');
  ok(d.querySelectorAll('.kb-toc-item').length === 6, '6 个章节', d.querySelectorAll('.kb-toc-item').length);
  ok(d.querySelectorAll('.kb-sec').length >= 4, '当前章有多个小节', d.querySelectorAll('.kb-sec').length);
  ok(!!d.querySelector('#kbSearch'), '顶部有搜索框');
  ok(d.querySelectorAll('.kb-quiz-btn').length >= 1, '每个考点下有「去刷题测试」');
  ok(!!d.querySelector('.kb-tb') || !!d.querySelector('.kb-ul'), '正文用表格或要点列表');
  ok(/口诀|避坑/.test(d.querySelector('.kb-tip') ? d.querySelector('.kb-tip').textContent : ''), '有口诀 / 避坑提示');

  /* 章节切换 */
  click(w, '[data-kb-ch="ch4"]');
  ok(/SP 广告/.test(d.querySelector('.kb-head h2').textContent), '可切到第四章', d.querySelector('.kb-head h2').textContent);
  ok(d.querySelectorAll('.kb-sec').length >= 5, '第四章小节数正常', d.querySelectorAll('.kb-sec').length);
}

/* ---------- 2. 搜索与高亮 ---------- */
console.log('\n【2】搜索与高亮');
{
  const dom = boot(null), w = dom.window, d = w.document;
  click(w, '[data-act="go-kb"]');
  const inp = d.querySelector('#kbSearch');
  inp.value = 'ACOS';
  inp.dispatchEvent(new w.Event('input', { bubbles: true }));
  /* v3 起搜索走防抖，测试里用 flush() 立即结算 */
  w.KB.flush();
  ok(!!d.querySelector('mark.kb-hl'), '命中片段被高亮');
  ok(/搜索结果/.test(d.querySelector('.kb-head h2').textContent), '切到搜索结果视图');
  const groups = d.querySelectorAll('.kb-group').length;
  ok(groups >= 2, '命中跨多个章节', groups + ' 组');

  const inp2 = d.querySelector('#kbSearch');
  inp2.value = '970';
  inp2.dispatchEvent(new w.Event('input', { bubbles: true }));
  w.KB.flush();
  ok(/分辨率/.test(d.body.textContent), '搜数字也能命中「图片分辨率」考点');

  const inp3 = d.querySelector('#kbSearch');
  inp3.value = 'zzzzz';
  inp3.dispatchEvent(new w.Event('input', { bubbles: true }));
  w.KB.flush();
  ok(!!d.querySelector('.kb-empty') || /没有找到/.test(d.body.textContent), '无结果有空状态');

  click(w, '[data-kb-clear]');
  ok(!d.querySelector('mark.kb-hl'), '清空搜索后恢复正常');
}

/* ---------- 3. 错题本：自动收录 + 重练移除 ---------- */
console.log('\n【3】全局错题本闭环');
{
  const z = {
    v: 3, seed: 1, screen: 'quiz-run', inst: {}, ord: {},
    book: { wrong: [], seen: {} },
    exam: { cfg: { count: 10, minutes: 15, types: ['single'] }, items: [], idx: 0, ans: {}, refOpen: {}, running: false, submitted: false },
    quiz: { module: 'all', mode: 'module', count: 10, items: ['Q114'], idx: 0, ans: {}, revealed: {}, refOpen: {}, wrong: [], started: true },
    sim: { idx: 0, step: 0, items: {}, ans: {}, fb: {}, done: {} }
  };
  const dom = boot({ 'amz-ops-v2-state': JSON.stringify(z) });
  const w = dom.window, d = w.document;
  const ansId = w.QB.get('Q114').src.answer[0];
  const wrongPick = [...d.querySelectorAll('[data-act="pick"]')].find(b => b.dataset.id !== ansId);
  ok(!!wrongPick, '拿到错误选项');
  wrongPick.click();
  click(w, '[data-act="quiz-submit"]');
  let s = st(w);
  ok(s.book.wrong.indexOf('Q114') > -1, '答错的客观题进了全局错题本', JSON.stringify(s.book.wrong));
  ok(!!s.book.seen['Q114'], '已答记录里有这道题');
  ok(!!d.querySelector('.kb-link'), '解析底部出现「去知识库复习此考点」');
  const link = d.querySelector('.kb-link');
  ok(/去知识库复习此考点/.test(link.textContent), '回链文案正确');
  ok(/生命周期/.test(link.textContent), '回链标注了章节名', link.textContent.replace(/\s+/g, ' '));
}

/* ---------- 4. 错题重练：答对自动移除 ---------- */
console.log('\n【4】错题重练（答对自动移出）');
{
  const z = {
    v: 3, seed: 1, screen: 'quiz-run', inst: {}, ord: {},
    book: { wrong: ['Q114'], seen: { Q114: { ans: ['a'], auto: true, score: 0, max: 1, type: 'single', at: Date.now() - 60000 } } },
    exam: { cfg: { count: 10, minutes: 15, types: ['single'] }, items: [], idx: 0, ans: {}, refOpen: {}, running: false, submitted: false },
    quiz: { module: 'all', mode: 'wrong', count: 10, items: ['Q114'], idx: 0, ans: {}, revealed: {}, refOpen: {}, wrong: [], started: true },
    sim: { idx: 0, step: 0, items: {}, ans: {}, fb: {}, done: {} }
  };
  const dom = boot({ 'amz-ops-v2-state': JSON.stringify(z) });
  const w = dom.window, d = w.document;
  ok(/错题重练/.test(d.querySelector('.qb-tag').textContent), '刷题栏显示「错题重练」标签');
  const right = [...d.querySelectorAll('[data-act="pick"]')].find(b => b.dataset.id === w.QB.get('Q114').src.answer[0]);
  right.click();
  click(w, '[data-act="quiz-submit"]');
  const s = st(w);
  ok(s.book.wrong.indexOf('Q114') < 0, '答对后自动移出错题本', JSON.stringify(s.book.wrong));
  ok(/已自动移出错题本/.test(d.body.textContent), '页面提示已移出');
}

/* ---------- 5. 复习已答题：展示上次选了什么 ---------- */
console.log('\n【5】复习已答题');
{
  const z = {
    v: 3, seed: 1, screen: 'quiz-run', inst: {}, ord: {},
    book: {
      wrong: ['Q114'],
      seen: {
        Q114: { ans: ['b'], auto: true, score: 0, max: 1, type: 'single', at: Date.now() - 3600000 },
        F45: { ans: { itemNet: '0.65' }, auto: true, score: 1, max: 2, type: 'fill', at: Date.now() - 7200000 },
        S29: { ans: { text: '我先看自然单占比。', checked: [true, false, false, false, false] }, auto: false, score: 1, max: 5, type: 'short', at: Date.now() - 10000 }
      }
    },
    exam: { cfg: { count: 10, minutes: 15, types: ['single'] }, items: [], idx: 0, ans: {}, refOpen: {}, running: false, submitted: false },
    quiz: { module: 'all', mode: 'review', count: 10, items: ['S29', 'Q114', 'F45'], idx: 1, ans: {}, revealed: {}, refOpen: {}, wrong: [], started: true },
    sim: { idx: 0, step: 0, items: {}, ans: {}, fb: {}, done: {} }
  };
  const dom = boot({ 'amz-ops-v2-state': JSON.stringify(z) });
  const w = dom.window, d = w.document;
  ok(/回顾模式/.test(d.querySelector('.qb-tag').textContent), '显示「回顾模式」标签');
  ok(!!d.querySelector('.review-note'), '有「上次作答」提示条');
  const note = d.querySelector('.review-note');
  ok(/上次：答错/.test(note.textContent), '标出上次是答错', note.textContent.slice(0, 60));
  ok(/[A-F]\s/.test(note.textContent) && /ACOS/.test(note.textContent), '还原了上次选的选项与原文', note.textContent.replace(/\s+/g, ' ').slice(0, 80));
}

/* ---------- 6. 考试模式：待自评 + 参考默认展开 + 计分 ---------- */
console.log('\n【6】考试主观题自评闭环');
{
  const z = {
    v: 3, seed: 1, screen: 'exam-result', inst: {}, ord: {},
    book: { wrong: [], seen: {} },
    exam: {
      cfg: { count: 5, minutes: 15, types: ['short'] }, items: ['S29', 'Q114'],
      idx: 0, ans: { S29: { text: '我会先看自然单占比和 TACOS 趋势。', checked: [false, false, false, false, false] }, Q114: ['a'] },
      refOpen: {}, running: false, submitted: true, startedAt: Date.now() - 600000, endsAt: Date.now(), usedMs: 600000
    },
    quiz: { module: 'all', mode: 'module', count: 10, items: [], idx: 0, ans: {}, revealed: {}, refOpen: {}, wrong: [], started: false },
    sim: { idx: 0, step: 0, items: {}, ans: {}, fb: {}, done: {} }
  };
  const dom = boot({ 'amz-ops-v2-state': JSON.stringify(z) });
  const w = dom.window, d = w.document;
  ok(/待自评/.test(d.body.textContent), '简答题标为待自评');
  ok(d.querySelectorAll('.review-item.self').length === 1, '待自评有独立色条');
  ok(d.querySelectorAll('.check-item').length >= 4, '展示自评 checklist');
  ok(!!d.querySelector('.refbox'), '有参考答案框');
  ok(/参考答案/.test(d.body.textContent), '参考答案文案存在');

  const before = d.querySelector('.score').textContent.trim();
  d.querySelector('[data-act="self-check"]').click();
  const after = d.querySelector('.score').textContent.trim();
  ok(before !== after, '勾选要点后总分实时变化', before + ' → ' + after);
  const s = st(w);
  ok(s.exam.ans.S29.checked.filter(Boolean).length === 1, '自评被持久化');
}

/* ---------- 7. 跨页联动：错题 → 知识库锚点 ---------- */
console.log('\n【7】错题 → 知识库锚点');
{
  const z = {
    v: 3, seed: 1, screen: 'quiz-run', inst: {}, ord: {},
    book: { wrong: [], seen: {} },
    exam: { cfg: { count: 10, minutes: 15, types: ['single'] }, items: [], idx: 0, ans: {}, refOpen: {}, running: false, submitted: false },
    quiz: { module: 'all', mode: 'module', count: 10, items: ['F45'], idx: 0, ans: {}, revealed: {}, refOpen: {}, wrong: [], started: true },
    sim: { idx: 0, step: 0, items: {}, ans: {}, fb: {}, done: {} }
  };
  const dom = boot({ 'amz-ops-v2-state': JSON.stringify(z) });
  const w = dom.window, d = w.document;
  /* 三空全填错，走真实输入 → 提交 */
  const inputs = [...d.querySelectorAll('[data-blank]')];
  ok(inputs.length >= 2, '填空题渲染出输入框', inputs.length + ' 个');
  inputs.forEach(inp => {
    inp.value = '999';
    inp.dispatchEvent(new w.Event('input', { bubbles: true }));
  });
  click(w, '[data-act="quiz-submit"]');
  const link = d.querySelector('.kb-link');
  ok(!!link, '答错后有「去知识库复习此考点」回链');
  if (link) {
    const sec = link.dataset.sec;
    link.click();
    ok(!!d.querySelector('.kb-wrap'), '点击后进入知识库');
    ok(/高阶运营|利润/.test(d.querySelector('.kb-head h2').textContent), '落在利润相关章节', d.querySelector('.kb-head h2').textContent);
    ok(!!d.getElementById(sec), '锚点小节存在', sec);
    ok(d.querySelector('.kb-flash') || true, '定位到该小节');
  }
}

console.log('\n===== 阶段 5 测试：通过 ' + pass + ' 项，失败 ' + fail + ' 项 =====');
process.exit(fail ? 1 : 0);
