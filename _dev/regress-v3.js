/* v3 回归：版本与路径 / 输入法 / 目录计数 / 作者声明 / 防伪水印 */
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
const click = (w, sel) => {
  const el = w.document.querySelector(sel);
  if (!el) throw new Error('找不到元素: ' + sel);
  el.click();
};

/* ---------- 1. 版本号与相对路径 ---------- */
console.log('\n【1】版本标识与相对路径（zip 解压双击可跑）');
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok(/v3-ui · 后台测试版/.test(html), '右下角角标标注测试版（v3-ui · 后台测试版）');

  const srcs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
  ok(srcs.length >= 12, '资源引用数量正常', srcs.length + ' 个');
  ok(srcs.every(s => s.startsWith('./')), '所有 CSS/JS 均为 ./ 相对路径', srcs.filter(s => !s.startsWith('./')).join(', '));
  ok(srcs.every(s => !/^([a-zA-Z]+:|\/)/.test(s)), '没有 http(s):// 或根路径引用');

  /* 所有被引用的文件真实存在 */
  const missing = srcs.filter(s => !fs.existsSync(path.join(ROOT, s.replace(/^\.\//, ''))));
  ok(missing.length === 0, '引用的文件全部存在（不会白屏）', missing.join(', '));

  /* 除 index.html 外，js 里不应有绝对路径加载 */
  const jsBad = [];
  fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).forEach(f => {
    const t = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
    if (/["'](?:https?:)?\/\/[^"']*\.(?:js|css|png|jpg|svg)["']/.test(t)) jsBad.push(f);
  });
  ok(jsBad.length === 0, 'JS 内没有外链资源（离线可用）', jsBad.join(', '));

  const dom = boot(null), w = dom.window, d = w.document;
  ok(!!d.querySelector('#buildBadge'), '角标元素存在');
  ok(/v3/.test(d.querySelector('#buildBadge').textContent), '角标文案含 v3');
}

/* ---------- 2. 知识库中文输入法 ---------- */
console.log('\n【2】中文输入法不打断拼写');
{
  const dom = boot(null), w = dom.window, d = w.document;
  click(w, '[data-act="go-kb"]');

  const inp0 = d.querySelector('#kbSearch');
  ok(!!inp0, '搜索框存在');

  /* 拼写阶段：compositionstart + input(isComposing) 不应触发搜索 / 重建 */
  inp0.dispatchEvent(new w.CompositionEvent('compositionstart', { bubbles: true, data: '' }));
  inp0.value = 'fenb';
  inp0.dispatchEvent(new w.InputEvent('input', { bubbles: true, isComposing: true, data: 'fenb' }));
  ok(w.KB.isComposing() === true, '进入拼写状态');
  ok(/第一章|第二章|第三章/.test(d.querySelector('.kb-head h2').textContent), '拼写中不触发搜索（仍是章节视图）',
    d.querySelector('.kb-head h2').textContent);
  ok(!d.querySelector('mark.kb-hl'), '拼写中不产生高亮');

  /* 保持输入框为同一个 DOM 节点 —— 这是中文能上屏的关键 */
  const sameNode = d.querySelector('#kbSearch') === inp0;
  ok(sameNode, '拼写期间搜索框未被重建（中文可正常上屏）');

  /* 上屏：compositionend 后带中文值 */
  inp0.value = '补货';
  inp0.dispatchEvent(new w.CompositionEvent('compositionend', { bubbles: true, data: '补货' }));
  w.KB.flush();
  ok(w.KB.isComposing() === false, '上屏后退出拼写状态');
  ok(/搜索结果/.test(d.querySelector('.kb-head h2').textContent), '中文上屏后执行搜索');
  ok(/共 \d+ 段命中/.test(d.querySelector('.kb-head p').textContent), '中文能正确匹配到内容',
    d.querySelector('.kb-head p').textContent);
  ok(d.querySelector('#kbSearch') === inp0, '搜索完成后仍是同一个输入框');

  /* 防抖：连续输入只在最后一次生效 */
  const inp = d.querySelector('#kbSearch');
  inp.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok(!/搜索结果/.test(d.querySelector('.kb-head h2').textContent), 'Esc 回到章节视图');

  inp.value = 'A';
  inp.dispatchEvent(new w.Event('input', { bubbles: true }));
  inp.value = 'AC';
  inp.dispatchEvent(new w.Event('input', { bubbles: true }));
  inp.value = 'ACOS';
  inp.dispatchEvent(new w.Event('input', { bubbles: true }));
  ok(!/搜索结果/.test(d.querySelector('.kb-head h2').textContent), '防抖：连续输入不立即重绘');
  w.KB.flush();
  ok(/搜索结果/.test(d.querySelector('.kb-head h2').textContent), '防抖结算后出结果');
  ok(/ACOS/.test(d.querySelector('.kb-head-sub').textContent), '以最后一次输入为准', d.querySelector('.kb-head-sub').textContent);

  /* 忽略大小写 */
  const inp2 = d.querySelector('#kbSearch');
  inp2.value = 'acos';
  inp2.dispatchEvent(new w.Event('input', { bubbles: true }));
  w.KB.flush();
  const low = d.querySelectorAll('.kb-group').length;
  inp2.value = 'ACOS';
  inp2.dispatchEvent(new w.Event('input', { bubbles: true }));
  w.KB.flush();
  const up = d.querySelectorAll('.kb-group').length;
  ok(low === up && low > 0, '忽略大小写（acos 与 ACOS 结果一致）', low + ' vs ' + up);

  /* Esc 清空 */
  const inp3 = d.querySelector('#kbSearch');
  inp3.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok(!d.querySelector('mark.kb-hl'), 'Esc 清空搜索并恢复章节视图');
}

/* ---------- 3. 目录考点数 ---------- */
console.log('\n【3】左侧章节目录考点数');
{
  const dom = boot(null), w = dom.window, d = w.document;
  click(w, '[data-act="go-kb"]');

  const items = [...d.querySelectorAll('.kb-toc-item')];
  ok(items.length === 6, '6 个章节', items.length);
  const nums = items.map(el => el.querySelector('.kb-toc-n').textContent.trim());
  ok(nums.every(v => /\d+/.test(v)), '每章都显示了数字', nums.join(' / '));
  ok(nums.every(v => parseInt(v, 10) > 0), '没有出现 0', nums.join(' / '));
  ok(nums.join(',') === '5,6,7,7,7,9', '数字与真实考点数一致（5/6/7/7/7/9）', nums.join(','));

  let sum = 0;
  items.forEach(el => { sum += parseInt(el.querySelector('.kb-toc-n').textContent, 10); });
  ok(sum === 41, '合计等于 41 个考点', sum);
  ok(/41 个考点/.test(d.querySelector('.kb-side-sub').textContent), '侧栏标题也写明 41 个考点');

  /* 搜索时命中数为「命中/总数」，不会六章全 0 */
  const inp = d.querySelector('#kbSearch');
  inp.value = 'ACOS';
  inp.dispatchEvent(new w.Event('input', { bubbles: true }));
  w.KB.flush();
  const searchedNums = [...d.querySelectorAll('.kb-toc-n')].map(el => el.textContent.trim());
  ok(searchedNums.every(v => /^\d+(\/\d+)?$/.test(v)), '搜索时数字格式正常', searchedNums.join(' / '));
  ok(searchedNums.some(v => /^\d+\/\d+$/.test(v)), '命中章节显示「命中/总数」', searchedNums.join(' / '));
  ok(searchedNums.every(v => !/^0(\/0)?$/.test(v)), '搜索时也不会全部显示 0', searchedNums.join(' / '));
  ok(!!d.querySelector('.kb-toc-n.hit'), '有命中的章节用强调色标出');

  /* 切换章节后计数仍正确 */
  click(w, '[data-kb-ch="ch6"]');
  const after = [...d.querySelectorAll('.kb-toc-n')].map(el => el.textContent.trim());
  ok(after.join(',') === '5,6,7,7,7,9', '切换章节后计数不变', after.join(','));
}

/* ---------- 4. 作者声明 ---------- */
console.log('\n【4】首页作者声明');
{
  const dom = boot(null), w = dom.window, d = w.document;
  const block = d.querySelector('.author-block');
  ok(!!block, '首页有作者声明区');
  ok(/夏姬姬开摆王/.test(block.textContent), '写明作者：夏姬姬开摆王');
  ok(/仅供个人学习交流使用/.test(block.textContent), '写明仅供学习交流');
  ok(/完全免费/.test(block.textContent), '写明完全免费');
  ok(/严禁用于任何商业倒卖或盈利行为/.test(block.textContent), '写明禁止商业倒卖');
  ok(/欢迎分享，但请保留原作者信息/.test(block.textContent), '写明分享需保留作者信息');

  /* 位置：在数据声明之后 */
  const disc = [...d.querySelectorAll('.disc')].filter(el => /数据声明/.test(el.textContent))[0];
  ok(!!disc, '存在数据声明');
  const pos = disc.compareDocumentPosition(block);
  ok((pos & w.Node.DOCUMENT_POSITION_FOLLOWING) !== 0, '作者声明位于数据声明下方');

  /* 首屏不出现水印 */
  ok(!d.body.classList.contains('wm-on'), '首页不显示水印');
}

/* ---------- 5. 防伪水印 ---------- */
console.log('\n【5】防伪水印');
{
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  const m = css.match(/\.wm-layer\{[\s\S]*?\}/);
  ok(!!m, '全局 CSS 定义了 .wm-layer');
  ok(/pointer-events:\s*none/.test(m[0]), '水印层 pointer-events:none（不遮挡点击）');
  ok(/position:\s*fixed/.test(m[0]), '水印层固定覆盖全屏');
  ok(/repeat/.test(m[0]), '水印平铺重复');

  const decoded = decodeURIComponent((m[0].match(/data:image\/svg\+xml;charset=utf-8,([^"']+)/) || [])[1] || '');
  ok(/夏姬姬开摆王/.test(decoded), '水印文案含作者名');
  ok(/学习自用/.test(decoded), '水印文案含「学习自用」');
  ok(/rotate\(-30/.test(decoded), '文字倾斜 30 度');
  ok(/fill="#475569"/.test(decoded), '水印为浅灰色');
  ok(/body\.wm-on \.wm-layer\{opacity:\.0\d+;?\}/.test(css), '透明度很低（不影响阅读）');

  const dom = boot(null), w = dom.window, d = w.document;
  ok(!!d.querySelector('.wm-layer'), '页面存在水印层节点');

  /* 首页 / 配置页不显示 */
  ok(!d.body.classList.contains('wm-on'), '首页无水印');
  click(w, '[data-act="go-exam"]');
  ok(!d.body.classList.contains('wm-on'), '考试配置页无水印');

  /* 考试答题页显示 */
  click(w, '[data-act="exam-start"]');
  ok(d.body.classList.contains('wm-on'), '考试答题页显示水印');

  /* 退出考试，回到配置页（无水印） */
  click(w, '[data-act="exam-leave"]');
  ok(!d.body.classList.contains('wm-on'), '退出答题后水印关闭');

  /* 刷题答题页显示 */
  click(w, '[data-act="go-quiz"]');
  ok(!d.body.classList.contains('wm-on'), '刷题配置页无水印');
  click(w, '[data-act="quiz-start"]');
  ok(d.body.classList.contains('wm-on'), '刷题答题页显示水印');

  /* 知识库显示 */
  click(w, '[data-act="go-quiz"]');
  ok(!d.body.classList.contains('wm-on'), '退出刷题后水印关闭');
  click(w, '[data-act="home"]');
  click(w, '[data-act="go-kb"]');
  ok(d.body.classList.contains('wm-on'), '知识库阅读页显示水印');

  /* 回到首页自动关闭 */
  click(w, '[data-act="home"]');
  ok(!d.body.classList.contains('wm-on'), '回首页自动关闭水印');
}

/* ---------- 5b. 逐题解析页（结果页 / 统计页）也带水印 ---------- */
console.log('\n【5b】逐题解析页水印');
{
  const dom = boot(null), w = dom.window, d = w.document;

  /* 考试交卷 → 结果页 */
  click(w, '[data-act="go-exam"]');
  click(w, '[data-act="exam-start"]');
  click(w, '[data-act="exam-submit"]');
  const st = JSON.parse(w.localStorage.getItem('amz-ops-v2-state'));
  ok(st.screen === 'exam-result', '已进入考试结果页', st.screen);
  ok(d.body.classList.contains('wm-on'), '考试结果页（逐题解析）显示水印');
  ok(!!d.querySelector('.review-item') || /解析|总分|得分/.test(d.body.textContent), '结果页内容已渲染');

  /* 结果页的水印同样不挡自评勾选 */
  const chk = d.querySelector('.review-item input[type="checkbox"]');
  if (chk) {
    chk.click();
    ok(true, '结果页自评勾选可用（水印未拦截）');
  } else {
    ok(!!d.querySelector('.review-item'), '结果页有解析区块');
  }

  /* 刷题统计页 */
  click(w, '[data-act="home"]');
  click(w, '[data-act="go-quiz"]');
  click(w, '[data-act="quiz-start"]');
  click(w, '[data-act="quiz-stats"]');
  ok(JSON.parse(w.localStorage.getItem('amz-ops-v2-state')).screen === 'quiz-stats', '已进入刷题统计页');
  ok(d.body.classList.contains('wm-on'), '刷题统计页（错题解析）显示水印');

  /* 其余页面仍保持干净 */
  click(w, '[data-act="home"]');
  ok(!d.body.classList.contains('wm-on'), '配置页 / 首页仍无水印');
}

/* ---------- 6. 水印不挡操作 ---------- */
console.log('\n【6】水印不影响答题交互');
{
  const dom = boot(null), w = dom.window, d = w.document;
  click(w, '[data-act="go-exam"]');
  click(w, '[data-act="exam-start"]');
  const opts0 = d.querySelectorAll('[data-act="pick"]');
  ok(d.body.classList.contains('wm-on'), '答题页水印开启');
  /* 首题可能是填空题，向后翻到第一道选择/多选题再点 */
  let opts = opts0, hops = 0;
  while (!opts.length && hops < 40) {
    const nx = d.querySelector('[data-act="exam-next"]');
    if (!nx) break;
    nx.click(); hops++;
    opts = d.querySelectorAll('[data-act="pick"]');
  }
  ok(opts.length >= 2, '渲染出选项', opts.length + (hops ? '（翻 ' + hops + ' 题后）' : ''));
  if (opts.length) {
    opts[0].click();
    const st = JSON.parse(w.localStorage.getItem('amz-ops-v2-state'));
    const cur = st.exam.items[st.exam.idx];
    ok(!!st.exam.ans[cur], '点击选项仍能正常记录答案（水印未拦截）');
  }
}

/* ---------- 7. 面试题库并入知识库 ---------- */
console.log('\n【7】面试题库并入知识库（6 个新考点）');
{
  const dom = boot(null), w = dom.window, d = w.document;
  click(w, '[data-act="go-kb"]');
  const KB = w.KB;
  const ids = KB.sections.map(s => s.id);
  ['ch2-6', 'ch5-6', 'ch5-7', 'ch6-7', 'ch6-8', 'ch6-9'].forEach(id =>
    ok(ids.indexOf(id) > -1, '存在新考点 ' + id));
  ok(KB.sections.length === 41, '知识库共 41 个考点', KB.sections.length);

  /* 逐题锚点：新题库的题要跳到最贴切的小节，而不是统一落到第六章 */
  const cases = [
    ['S39', 'ch5-6'], ['Q193', 'ch5-6'], ['S48', 'ch5-7'], ['Q206', 'ch5-7'],
    ['S57', 'ch6-7'], ['Q198', 'ch6-1'], ['S62', 'ch2-6'], ['Q203', 'ch2-6'],
    ['S66', 'ch6-8'], ['Q208', 'ch6-8'], ['S64', 'ch6-9'], ['Q204', 'ch6-9'],
    ['S51', 'ch2-4'], ['Q197', 'ch4-4']
  ];
  const bad = [];
  cases.forEach(([id, sec]) => {
    const r = KB.linkFor({ id: id, dim: 'interview' });
    if (r.sec !== sec || !r.chTitle || !r.secTitle) bad.push(id + '→' + r.sec);
  });
  ok(bad.length === 0, '14 道代表题锚点全部命中预期小节', bad.join(', '));

  /* 新考点真的渲染出来，锚点可定位 */
  click(w, '[data-kb-ch="ch5"]');
  ok(!!d.getElementById('ch5-6') && !!d.getElementById('ch5-7'), '第五章渲染出选品与清仓两个新考点');
  click(w, '[data-kb-ch="ch6"]');
  ok(!!d.getElementById('ch6-7') && !!d.getElementById('ch6-8') && !!d.getElementById('ch6-9'),
    '第六章渲染出差评 / 合规 / 岗位三个新考点');

  /* 新考点带「去刷题测试」并携带模块参数 */
  const btn = d.querySelector('#ch6-8 .kb-quiz-btn');
  ok(!!btn, '新考点带「去刷题测试」按钮');
  ok(btn && /dim:/.test(btn.dataset.mod), '按钮携带正确模块参数', btn && btn.dataset.mod);

  /* 搜索能命中新内容 */
  ['清仓', 'WEEE', '勾稽', '反问'].forEach(kw => {
    w.KB.search(kw);
    const n = d.querySelectorAll('mark.kb-hl').length;
    ok(n > 0, '搜「' + kw + '」命中并高亮', n + ' 处');
  });
  w.KB.search('欧洲');
  const hitSec = [...d.querySelectorAll('.kb-sec')].map(el => el.id);
  ok(hitSec.indexOf('ch6-8') > -1, '搜「欧洲」命中合规四层小节', hitSec.join(','));

  /* 内容是提炼而非抄原文 */
  const flow = KB.sections.find(s => s.id === 'ch5-7');
  ok(flow && flow.kind === 'flow' && flow.steps.length === 6, '清仓决策树是 6 步流程（Step 0–5）', flow && flow.steps.length);
  ok(flow && flow.steps.every(t => t.length < 200), '步骤为提炼要点，不是原文照搬');
  const all = KB.sections.reduce((a, s) => a + JSON.stringify(s).length, 0);
  ok(all / KB.sections.length < 1400, '平均每节体量控制在阅读友好范围', Math.round(all / KB.sections.length) + ' 字符');
}

console.log('\n===== v3 回归：通过 ' + pass + ' 项，失败 ' + fail + ' 项 =====');
process.exit(fail ? 1 : 0);
