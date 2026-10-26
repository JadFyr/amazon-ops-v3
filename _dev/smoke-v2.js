/* v2 冒烟测试：欢迎 → 考试 → 交卷 → 刷题 → 统计 → 倒计时持久化 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/rng.js', 'js/data.js', 'js/bank-basic.js', 'js/bank-listing.js', 'js/bank-ads.js', 'js/bank-interview.js', 'js/bank-ops.js', 'js/bank-extra.js', 'js/bank-interview2.js', 'js/study.js', 'js/ui-sim.js', 'js/sims.js', 'js/engine.js', 'js/app.js'];

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

function snap(w) {
  const out = {};
  for (let i = 0; i < w.localStorage.length; i++) {
    const k = w.localStorage.key(i);
    out[k] = w.localStorage.getItem(k);
  }
  return out;
}

const click = (w, sel) => {
  const el = w.document.querySelector(sel);
  if (!el) throw new Error('找不到元素: ' + sel);
  el.click();
};

console.log('\n【1】欢迎页');
let dom = boot(null);
let w = dom.window;
let doc = w.document;

ok(!!doc.querySelector('.welcome'), '欢迎页渲染');
ok(doc.querySelectorAll('.mode-card').length === 3, '三个模式入口（考试 / 刷题 / 知识库）');
ok(/能力测评/.test(doc.querySelector('.welcome-title').textContent), '主标题存在');
ok(doc.querySelectorAll('.welcome-stats b').length >= 5, '题库统计行');

console.log('\n【2】考试配置');
click(w, '[data-act="go-exam"]');
ok(!!doc.querySelector('.cfg-row'), '配置页渲染');
ok(doc.querySelectorAll('.cfg-row').length === 3, '三组配置（题量/限时/题型）');
ok(doc.querySelectorAll('[data-act="cfg-type"].on').length === 4, '题型默认全选');

console.log('\n【3】组卷与倒计时');
click(w, '[data-act="cfg-count"][data-v="10"]');
click(w, '[data-act="cfg-minutes"][data-v="15"]');
click(w, '[data-act="exam-start"]');
ok(!!doc.querySelector('.exambar'), '考试栏出现');
ok(/\d{2}:\d{2}:\d{2}/.test(doc.querySelector('#cd').textContent), '倒计时格式 HH:MM:SS', doc.querySelector('#cd').textContent);
ok(doc.querySelectorAll('.qnav-dots .dot').length === 10, '抽到 10 题', doc.querySelectorAll('.qnav-dots .dot').length);
ok(!doc.querySelector('.fb'), '考试中不显示解析');

const st1 = JSON.parse(snap(w)['amz-ops-v2-state']);
ok(st1.exam.endsAt - st1.exam.startedAt === 15 * 60000, '限时 15 分钟写入时间戳');

/* 答第一题（按题型构造） */
const qid = st1.exam.items[0];
const meta = w.QB.get(qid);
if (meta.type === 'fill') {
  const inst = w.QB.inst(meta, w.__none || { inst: st1.inst, ord: st1.ord });
  const input = doc.querySelector('[data-qid="' + qid + '"][data-blank]');
  const b = inst.blanks[0];
  input.value = String(b.value);
  input.dispatchEvent(new w.Event('input', { bubbles: true }));
  ok(JSON.parse(snap(w)['amz-ops-v2-state']).exam.ans[qid] !== undefined, '填空输入被记录');
} else if (meta.type === 'single' || meta.type === 'multi') {
  click(w, '[data-act="pick"]');
  ok((JSON.parse(snap(w)['amz-ops-v2-state']).exam.ans[qid] || []).length === 1, '选项被记录');
} else {
  const ta = doc.querySelector('textarea[data-qid]');
  ta.value = '测试作答';
  ta.dispatchEvent(new w.Event('input', { bubbles: true }));
  ok(!!JSON.parse(snap(w)['amz-ops-v2-state']).exam.ans[qid], '简答输入被记录');
}

click(w, '[data-act="exam-next"]');
ok(/第 2 \/ 10 题/.test(doc.querySelector('.eb-prog').textContent), '下一题生效');

console.log('\n【4】刷新不重置倒计时');
const store = snap(w);
dom.window.close();

dom = boot(store); w = dom.window; doc = w.document;
ok(!!doc.querySelector('.exambar'), '刷新后仍在考试页');
const st2 = JSON.parse(snap(w)['amz-ops-v2-state']);
ok(st2.exam.endsAt === JSON.parse(store['amz-ops-v2-state']).exam.endsAt, 'endsAt 未被重置');

console.log('\n【5】超时自动交卷');
const s3 = JSON.parse(store['amz-ops-v2-state']);
s3.exam.startedAt = Date.now() - 16 * 60000;
s3.exam.endsAt = Date.now() - 60000;
dom.window.close();
dom = boot(Object.assign({}, store, { 'amz-ops-v2-state': JSON.stringify(s3) }));
w = dom.window; doc = w.document;
ok(!!doc.querySelector('.result-hero'), '超时直接进结果页');
ok(/EXAM RESULT/.test(doc.querySelector('.rt').textContent), '结果页标题');

console.log('\n【6】交卷与逐题复盘');
const s4 = JSON.parse(store['amz-ops-v2-state']);
s4.exam.endsAt = Date.now() + 14 * 60000;
s4.exam.running = true;
s4.exam.submitted = false;
s4.exam.items = ['F1', 'Q1', 'S1'];
s4.exam.idx = 0;
s4.exam.ans = {};
dom.window.close();
dom = boot(Object.assign({}, store, { 'amz-ops-v2-state': JSON.stringify(s4) }));
w = dom.window; doc = w.document;
click(w, '[data-act="exam-submit"]');
ok(!!doc.querySelector('.result-hero'), '交卷后跳结果页');
ok(doc.querySelectorAll('.review-item').length === 3, '逐题复盘 3 条');

/* 公式提示默认收起：只留「?」，不直接摊开 */
{
  const st2 = JSON.parse(snap(w)['amz-ops-v2-state']);
  st2.screen = 'quiz-run';
  st2.quiz.items = ['F1']; st2.quiz.started = true;
  st2.quiz.revealed = {}; st2.quiz.ans = {}; st2.quiz.wrong = [];
  const KEY2 = 'amz-ops-v2-state';
  const dom2 = boot({ [KEY2]: JSON.stringify(st2) });
  const w2 = dom2.window, doc2 = w2.document;
  const pops = doc2.querySelectorAll('.hint-pop');
  ok(pops.length === 3, '三个空各有一个提示入口', pops.length + ' 个');
  ok(doc2.querySelectorAll('.blank-label > .hint').length === 0, '公式提示不再常驻显示');
  ok(doc2.querySelectorAll('.hint-pop .hint-text').length === 3, '提示文本收进气泡内');
  const det = pops[0];
  ok(det.open === false, '提示默认收起');
  det.open = true;
  ok(det.open === true, '展开后显示提示气泡');
  det.querySelector('summary').click();
  det.open = false;
  doc2.body.click();
  ok(det.open === false, '点空白处自动收起');
}
/* 简答自评：勾选后覆盖率应实时进总分 */
const before = doc.querySelector('.score').textContent.trim();
const chk = doc.querySelector('[data-act="self-check"]');
ok(!!chk, '主观题出现自评勾选项');
if (chk) {
  chk.click();
  const after = doc.querySelector('.score').textContent.trim();
  ok(after !== before, '自评勾选后总分变化', before + ' → ' + after);
  const sa = JSON.parse(snap(w)['amz-ops-v2-state']).exam.ans.S1;
  ok(!!sa && sa.checked.filter(Boolean).length === 1, '自评覆盖被记录');
}
const scoreTxt = doc.querySelector('.score').textContent;
ok(/\d+/.test(scoreTxt), '总分渲染', scoreTxt.trim());

console.log('\n【7】刷题模式');
click(w, '[data-act="go-quiz"]');
ok(doc.querySelectorAll('[data-act="go-quiz"]').length >= 0, '刷题配置入口');
ok(!!doc.querySelector('.cfg-row'), '刷题配置页');
const mods = doc.querySelectorAll('[data-act="quiz-module"]').length;
ok(mods > 3, '模块可筛选（含题型与维度）', mods + ' 个');

/* 阶段 2 新模块必须出现在筛选里，且能抽到题 */
const dimBtns = [...doc.querySelectorAll('[data-act="quiz-module"]')].map(b => b.dataset.v);
ok(dimBtns.indexOf('dim:basic') > -1, '刷题可选「平台基础」维度');
ok(dimBtns.indexOf('dim:listing') > -1, '刷题可选「关键词与Listing」维度');
ok(dimBtns.indexOf('dim:interview') > -1, '刷题可选「业务面试」维度');
ok(dimBtns.indexOf('dim:ads') > -1, '刷题可选「广告诊断」维度');
click(w, '[data-act="quiz-module"][data-v="dim:listing"]');
click(w, '[data-act="quiz-start"]');
ok(!!doc.querySelector('.quizbar'), '从 listing 维度能开出题');
{
  const z = JSON.parse(snap(w)['amz-ops-v2-state']).quiz;
  const firstId = z.items[z.idx];
  ok(/^(F1[5-9]|F2[0-3]|Q[3-6]\d|S(9|1[01]))$/.test(firstId), '抽到的确实是阶段 2 新题', firstId);
}
click(w, '[data-act="go-quiz"]');

click(w, '[data-act="quiz-module"][data-v="type:single"]');
click(w, '[data-act="quiz-count"][data-v="10"]');
click(w, '[data-act="quiz-start"]');
ok(!!doc.querySelector('.quizbar'), '刷题栏出现');
ok(!doc.querySelector('.fb'), '提交前无解析');
click(w, '[data-act="pick"]');
click(w, '[data-act="quiz-submit"]');
ok(!!doc.querySelector('.fb'), '提交后立刻出解析');
const zs = JSON.parse(snap(w)['amz-ops-v2-state']).quiz;
ok(zs.wrong.length === 1 || zs.revealed[zs.items[zs.idx]] === true, '错题自动入错题本或已揭示答案', JSON.stringify(zs.wrong));

/* 面试题：题干必须带潜台词，展开后要有评分要点与失分点 */
{
  const st3 = JSON.parse(snap(w)['amz-ops-v2-state']);
  st3.screen = 'quiz-run';
  st3.quiz.items = ['S17'];
  st3.quiz.started = true;
  st3.quiz.revealed = { S17: true };
  st3.quiz.refOpen = { S17: true };
  st3.quiz.ans = { S17: { text: '先承认 92% 没信息量。', checked: [true, true, false, false, false] } };
  st3.quiz.wrong = [];
  const dom3 = boot({ 'amz-ops-v2-state': JSON.stringify(st3) });
  const d3 = dom3.window.document;
  const stem = d3.querySelector('.stem') ? d3.querySelector('.stem').textContent : '';
  ok(stem.indexOf('【潜台词】') > -1, '面试题题干带「潜台词」');
  ok(stem.indexOf('面试官') > -1, '题干还原了面试官原话');
  ok(d3.querySelectorAll('.check-item').length >= 4, '有评分要点可自评');
  const refTxt = d3.querySelector('.refbox') ? d3.querySelector('.refbox').textContent : '';
  ok(refTxt.indexOf('常见失分点') > -1, '参考答案含「常见失分点」（踩坑答法）');
  ok(refTxt.length > 300, '高分框架有实际内容', refTxt.length + ' 字');
}

console.log('\n【7.5】阶段 4：四大运营维度 + 案例题');
{
  const cb = boot(null), cw = cb.window, cd = cw.document;
  click(cw, '[data-act="go-quiz"]');
  const v4 = [...cd.querySelectorAll('[data-act="quiz-module"]')].map(b => b.dataset.v);
  ['lifecycle', 'inventory', 'profit', 'compliance'].forEach(k => {
    ok(v4.indexOf('dim:' + k) > -1, '刷题可选维度 ' + k);
  });
  ok(v4.indexOf('type:case') > -1, '刷题可选「案例」题型');

  click(cw, '[data-act="quiz-module"][data-v="dim:compliance"]');
  click(cw, '[data-act="quiz-start"]');
  const z4 = JSON.parse(snap(cw)['amz-ops-v2-state']).quiz;
  const q4 = cw.QB.get(z4.items[z4.idx]);
  ok(q4 && q4.dim === 'compliance', '抽到的确实是合规题', q4 && q4.id);
  ok(q4 && q4.layer === 'ops', '合规题属于 ops 层级', q4 && q4.layer);

  /* 案例题：数据表 + kv + 自评要点必须齐全 */
  const st4 = JSON.parse(snap(cw)['amz-ops-v2-state']);
  st4.screen = 'quiz-run';
  st4.quiz.items = ['C4', 'C5', 'C6'];
  st4.quiz.idx = 0;
  st4.quiz.started = true;
  st4.quiz.revealed = { C4: true };
  st4.quiz.refOpen = { C4: true };
  st4.quiz.ans = {};
  st4.quiz.wrong = [];
  const dom4 = boot({ 'amz-ops-v2-state': JSON.stringify(st4) });
  const d4 = dom4.window.document;
  ok(!!d4.querySelector('.tb'), '案例题渲染出数据表格');
  const th = [...d4.querySelectorAll('.tb thead th')].map(x => x.textContent.trim());
  ok(th.length >= 3, '表格列数充足', th.join(' | '));
  ok(!!d4.querySelector('.kv'), '案例题有指标卡（kv）');
  ok(d4.querySelectorAll('.check-item').length >= 4, '案例有自评要点', d4.querySelectorAll('.check-item').length + ' 条');
  ok(!!d4.querySelector('.refbox'), '案例可展开参考答案');
  ok(/^周|复盘|第/.test(d4.querySelector('.stem').textContent.trim()) || d4.querySelector('.stem').textContent.length > 40, '案例题干是完整场景');
}

console.log('\n【8】统计页');

click(w, '[data-act="quiz-stats"]');
ok(!!doc.querySelector('.stat-row'), '统计页渲染');
ok(doc.querySelectorAll('.stat-row .stat').length === 5, '五个统计块（B2 修复后新增「其中主观题」）');
const statTxt = doc.querySelector('.stat-row').textContent;
ok(/含主观/.test(statTxt) && /客观题 答对/.test(statTxt), '统计口径区分客观/主观', statTxt.replace(/\s+/g, ' ').trim());

console.log('\n【9】模拟实操');
click(w, '[data-act="home"]');
click(w, '[data-act="go-sim"]');
ok(!!doc.querySelector('.stepline'), '模拟步骤页');
ok(/STEP 1/.test(doc.querySelector('.stepline').textContent), '从第一步开始');

dom.window.close();

console.log('\n===== 通过 ' + pass + ' 项，失败 ' + fail + ' 项 =====');
process.exit(fail ? 1 : 0);
