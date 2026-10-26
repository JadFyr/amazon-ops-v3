/* v3 题库扩容回归：面试题库.md + 模拟面试答题卡.md → bank-interview2.js */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/rng.js', 'js/data.js', 'js/bank-basic.js', 'js/bank-listing.js',
  'js/bank-ads.js', 'js/bank-interview.js', 'js/bank-ops.js', 'js/bank-extra.js',
  'js/bank-interview2.js', 'js/study.js', 'js/ui-sim.js', 'js/sims.js', 'js/engine.js', 'js/app.js'];

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? ' → ' + extra : '')); }
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

/* ---------- 1. 文件与接入 ---------- */
console.log('\n【1】新题库接入');
{
  ok(fs.existsSync(path.join(ROOT, 'js/bank-interview2.js')), '存在独立文件 js/bank-interview2.js');
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok(/bank-interview2\.js/.test(idx), 'index.html 已引用');
  ok(idx.indexOf('bank-interview2.js') > idx.indexOf('bank-extra.js'), '加载顺序在 bank-extra 之后');
  ok(idx.indexOf('bank-interview2.js') < idx.indexOf('engine.js'), '加载顺序在 engine 之前（注册表需要先就绪）');

  const src = fs.readFileSync(path.join(ROOT, 'js/bank-interview2.js'), 'utf8');
  ok(!/DATA\.FILL\s*\.\s*push/.test(src) || /DATA\.SHORT/.test(src), '未污染填空题');
  ok(/DATA\.SHORT\.push\(/.test(src) && /DATA\.MCQ\.push\(/.test(src), '使用 push 追加，不改底层数据');
  ok(!/DATA\.MCQ\.push\(\s*\{[^}]*id: 'S\d+/.test(src), '简答与选择分属独立 push，没有混数组');
}

/* ---------- 2. 题量与编号 ---------- */
console.log('\n【2】题量与编号');
const dom = boot(null), w = dom.window;
{
  const S = w.DATA.SHORT.filter(q => +q.id.slice(1) >= 39 && +q.id.slice(1) <= 66);
  const M = w.DATA.MCQ.filter(q => +q.id.slice(1) >= 193 && +q.id.slice(1) <= 208);
  ok(S.length === 28, '新增简答 28 题（S39–S66）', S.length);
  ok(M.length === 16, '新增选择 16 题（Q193–Q208）', M.length);
  ok(M.filter(q => q.type === 'single').length === 12, '其中单选 12', M.filter(q => q.type === 'single').length);
  ok(M.filter(q => q.type === 'multi').length === 4, '其中多选 4', M.filter(q => q.type === 'multi').length);
  ok(w.QB.all().length === 344, '题库总量 344', w.QB.all().length);

  const ids = w.QB.all().map(q => q.id);
  ok(new Set(ids).size === ids.length, 'id 全局唯一');
  ok(S.every(q => q.dim === 'interview'), '新增简答全部归入 interview 维度');
  ok(M.every(q => q.dim === 'interview'), '新增选择全部归入 interview 维度');
}

/* ---------- 3. 简答三层结构完整 ---------- */
console.log('\n【3】简答必须含潜台词 / 踩坑 / 高分框架');
{
  const S = w.DATA.SHORT.filter(q => +q.id.slice(1) >= 39 && +q.id.slice(1) <= 66);
  ok(S.every(q => /【潜台词】/.test(q.prompt)), '每题题干含【潜台词】');
  ok(S.every(q => q.pitfalls && /【普通人踩坑】/.test(q.pitfalls)), '每题含【普通人踩坑】答法');
  ok(S.every(q => q.reference && q.reference.length >= 120), '每题参考答案够长（≥120 字）',
    Math.min(...S.map(q => q.reference.length)));
  ok(S.every(q => Array.isArray(q.checklist) && q.checklist.length >= 4), '每题自评清单 ≥4 条',
    Math.min(...S.map(q => q.checklist.length)));
  ok(S.every(q => q.title && q.title.length <= 30), '标题精简（≤30 字）',
    Math.max(...S.map(q => q.title.length)));
  /* 口语化：面试时能直接复述（第一人称占比） */
  const firstPerson = S.filter(q => /我/.test(q.reference)).length;
  ok(firstPerson >= 22, '参考答案为可复述口吻（含第一人称）', firstPerson + '/28 题含「我」');
}

/* ---------- 4. 选择题选项纪律 ---------- */
console.log('\n【4】选择题选项与解析');
{
  const M = w.DATA.MCQ.filter(q => +q.id.slice(1) >= 193 && +q.id.slice(1) <= 208);
  ok(M.every(q => q.options.every(o => o.note && o.note.length >= 15)), '每个选项都有解析');
  ok(M.every(q => q.options.every(o => ['correct', 'wrong', 'order'].includes(o.kind))), 'options.kind 取值合法');
  ok(M.every(q => q.answer.length >= 1 && q.answer.every(a => q.options.some(o => o.id === a))), '答案键指向真实选项');
  ok(M.every(q => q.answer.every(a => q.options.find(o => o.id === a).kind === 'correct')), '所有正确答案标为 correct');
  ok(M.every(q => q.options.filter(o => o.kind === 'correct').length === q.answer.length), 'correct 标记数量与答案键一致');
  ok(M.every(q => q.summary && q.summary.length >= 20), '每题都有小结');
  const multi = M.filter(q => q.type === 'multi');
  ok(multi.every(q => q.answer.length >= 3), '多选题正确答案 ≥3 项', multi.map(q => q.answer.length).join('/'));
}

/* ---------- 5. 内容来源与口径一致性 ---------- */
console.log('\n【5】口径一致性（与答题卡标准答法对齐）');
{
  const all = w.QB.all().map(m => m.src)
    .map(q => [q.stem, q.prompt, q.reference, q.summary, (q.options || []).map(o => o.note).join('')].join(' '));
  const txt = all.join('\n');
  ok(/否词优先|否词永远优先|否词砍的是浪费/.test(txt), '保留「否词优先于降 bid」口径');
  ok(/单件广告成本/.test(txt) && /仓储费/.test(txt), '保留清仓判定不等式');
  ok(/10%–15%|10% 到 15%|10%-15%/.test(txt), '保留阶梯降价 10–15% 口径');
  ok(/LVD/.test(txt) && /RED/.test(txt) && /EPR/.test(txt), '欧洲合规拆到 LVD / RED / EPR');
  ok(/ACOS = CPC|CPC ÷|CPC 除以/.test(txt), '保留 ACOS 三出口公式');
  /* 红线：不得出现虚构雇佣经历 */
  ok(!/曾在.{0,6}公司任职|入职.{0,4}公司|任职于/.test(txt), '无虚构雇佣表述');
}

/* ---------- 6. 新题可正常出卷与渲染 ---------- */
console.log('\n【6】可出卷、可渲染');
{
  const dom2 = boot(null), w2 = dom2.window, d = w2.document;
  const S = w2.DATA.SHORT.filter(q => +q.id.slice(1) >= 39 && +q.id.slice(1) <= 66);
  const sample = S[0];
  const question = w2.QB.get(sample.id);
  ok(!!question, 'QB 能取到新简答', sample.id);
  const card = w2.QB.card(question, {}, { showFb: true, showRef: true, phase: 'input' });
  ok(/潜台词/.test(card), '卡片渲染出【潜台词】');
  ok(/评分要点/.test(card) && /参考答案/.test(card), '卡片含自评清单与参考答案区');
  ok(/常见失分点/.test(card), '卡片暴露踩坑答法（常见失分点）');
  const empty = w2.QB.judge(question, {});
  ok(empty.auto === false && empty.score === 0, '简答不自动判分（0 分起，等自评）');

  /* 组一套面试模块的卷子，确认新题能进入抽题池 */
  const pool = w2.QB.all().filter(q => q.dim === 'interview' && q.type === 'short');
  ok(pool.length >= 40, '面试简答题池 ≥40', pool.length);
  ok(pool.some(q => q.id === 'S39') && pool.some(q => q.id === 'S66'), '新题已进入抽题池');

  /* 首页统计与模块列表同步 */
  const d2 = w2.document;
  ok(/344/.test(d2.body.textContent), '首页显示 344 题在库');
  ok(/业务面试/.test(d2.body.textContent), '模块列表含业务面试');
}

console.log('\n===== 新题库回归：通过 ' + pass + ' 项，失败 ' + fail + ' 项 =====');
process.exit(fail ? 1 : 0);
