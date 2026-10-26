/* v3-ui 回归 B：界面实操模拟（高保真后台版）
   覆盖：模块加载 / 场景列表 / 后台骨架（深色导航·顶栏·KPI·标签页）
        6 个场景的完整正确路径 / 各场景的扣分与拦截路径 / 实时飘红 /
        批量操作与行内操作 / 持久化 / 导航 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/rng.js', 'js/data.js', 'js/bank-basic.js', 'js/bank-listing.js',
  'js/bank-ads.js', 'js/bank-interview.js', 'js/bank-ops.js', 'js/bank-extra.js',
  'js/bank-interview2.js', 'js/study.js', 'js/ui-sim.js',
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
  w.confirm = () => true; w.alert = () => {};
  if (store) Object.keys(store).forEach(k => w.localStorage.setItem(k, store[k]));
  FILES.forEach(f => {
    const s = w.document.createElement('script');
    s.textContent = fs.readFileSync(path.join(ROOT, f), 'utf8');
    w.document.body.appendChild(s);
  });
  return dom;
}
const $ = (d, s) => d.querySelector(s);
const all = (d, s) => Array.from(d.querySelectorAll(s));
const txt = (d, s) => { const e = $(d, s); return e ? e.textContent : ''; };
function click(w, sel) {
  const el = $(w.document, sel);
  if (!el) throw new Error('找不到元素: ' + sel);
  el.click();
}
function fill(w, sel, val) {
  const el = $(w.document, sel);
  if (!el) throw new Error('找不到输入框: ' + sel);
  el.value = val;
  el.dispatchEvent(new w.Event('input', { bubbles: true }));
}
function pick(w, sel, val) {
  const el = $(w.document, sel);
  if (!el) throw new Error('找不到下拉: ' + sel);
  el.value = val;
  el.dispatchEvent(new w.Event('change', { bubbles: true }));
}
const ui = w => JSON.parse(w.localStorage.getItem('amz-ops-v2-state')).ui;
function enter(w, id) {
  const d = w.document;
  if ($(d, '[data-act="go-uis"]')) click(w, '[data-act="go-uis"]');
  else if ($(d, '[data-act="uis-back"]')) click(w, '[data-act="uis-back"]');
  click(w, '[data-act="uis-open"][data-v="' + id + '"]');
}
const KW3 = ['wireless earbuds for small ears', 'bluetooth earbuds small ear tips', 'running headphones sweatproof'];

/* ============================================================
   1. 模块与入口
   ============================================================ */
console.log('\n【1】模块加载与首页入口');
{
  const dom = boot(null), w = dom.window, d = w.document;
  ok(!!w.UISIM, 'UISIM 模块已加载');
  ok(w.UISIM.list.length === 6, '内置 6 个后台场景', w.UISIM.list.length);
  const ids = w.UISIM.list.map(s => s.id).join(',');
  ok(ids === 'ad-create,negate,listing,restock,review,coupon', '场景顺序与命名固定', ids);
  ok(w.UISIM.list.every(s => s.steps.length >= 2), '每个场景至少 2 个页面');
  const scored = w.UISIM.list.reduce((n, s) => n + s.steps.filter(x => !x.ns).length, 0);
  ok(scored === 13, '判分点合计 13 个（入口页不计分）', scored);
  ok(d.querySelectorAll('.mode-card').length === 3, '欢迎页仍是三个模块卡片（未提前合并）');
  ok(/6 个后台场景/.test($(d, '[data-act="go-uis"]').textContent), '底部入口标注 6 个场景');
}

/* ============================================================
   2. 场景列表
   ============================================================ */
console.log('\n【2】场景列表');
{
  const dom = boot(null), w = dom.window, d = w.document;
  click(w, '[data-act="go-uis"]');
  ok(all(d, '.uis-card').length === 6, '列表渲染 6 张场景卡', all(d, '.uis-card').length);
  ok(/不是真实后台截图/.test(d.body.textContent), '明确标注「非真实截图」');
  ok(d.body.classList.contains('wm-on'), '模拟页开启防伪水印');
}

/* ============================================================
   3. 后台骨架：深色导航 / 顶栏 / KPI / 标签页
   ============================================================ */
console.log('\n【3】后台骨架（高保真布局）');
{
  const dom = boot(null), w = dom.window, d = w.document;
  enter(w, 'ad-create');
  ok(!!$(d, '.sc-app'), '渲染出后台容器');
  const navs = all(d, '.sc-nav-i');
  ok(navs.length === 6, '左侧导航 6 项', navs.length);
  const labels = navs.map(n => n.querySelector('b').textContent).join(',');
  ok(labels === 'Catalog,Inventory,Pricing,Advertising,Reports,Performance', '导航项与顺序符合真实后台', labels);
  ok(!!$(d, '.sc-nav-i.on') && /Advertising/.test($(d, '.sc-nav-i.on').textContent), '当前页导航高亮');
  ok(!!$(d, '.sc-rail') && !!$(d, '.sc-top') && !!$(d, '.sc-search input'), '有深色左侧导航 + 深色顶栏 + 站内搜索');
  ok(all(d, '.sc-kpi-i').length === 5, 'KPI 数据条 5 张（曝光/点击/花费/销售额/ACOS）');
  ok(/Impressions/.test(txt(d, '.sc-kpi')) && /Spend/.test(txt(d, '.sc-kpi')), 'KPI 含曝光与花费');
  ok(all(d, '.sc-tab').length === 6 && /Search terms/.test(txt(d, '.sc-tabs')), '广告页有 6 个标签页，含 Search terms');
  ok(/sellercentral/.test(txt(d, '.uis-url')), '地址栏显示模拟域名');
  ok(!!$(d, '.uis-coach'), '有训练提示条（不侵入后台界面）');
  ok(/ENTRY/.test(txt(d, '.uis-coach-n')), '入口页提示条标注 ENTRY');
  click(w, '[data-act="uis-nav"][data-v="pricing"]');
  ok(!!$(d, '.sc-toast') && /只开放当前这条路径/.test(txt(d, '.sc-toast')), '点其他导航给出「路径未开放」提示');
}

/* ============================================================
   4. 场景 1 · 正确路径（3 分）
   ============================================================ */
console.log('\n【4】场景 1 · 新建 SP 广告活动（正确路径）');
{
  const dom = boot(null), w = dom.window, d = w.document;
  enter(w, 'ad-create');
  ok(!!$(d, '.sc-btn-xl') && /Create campaign/.test(txt(d, '.sc-btn-xl')), '页面中心有醒目的 Create campaign 按钮');
  click(w, '[data-act="uis-next"]');
  ok(/Create campaign/.test(txt(d, '.sc-pghead h1')), '进入 Create campaign 页');
  ok(all(d, '.sc-card').length === 3, '广告类型渲染为 3 张单选卡');

  click(w, '[data-f="type"][data-v="sp"]');
  fill(w, '[data-uis-f="name"]', 'SP-Manual-Earbuds-BLK-1023');
  click(w, '[data-act="uis-submit"]');
  ok(/Set budget/.test(txt(d, '.sc-pghead h1')), '第 1 步通过，进入预算页');

  ok(!!$(d, '[data-uis-f="budget"]') && $(d, '[data-uis-f="bid"]').tagName === 'SELECT', '预算 input + 竞价策略 select 都是真实控件');
  fill(w, '[data-uis-f="budget"]', '20');
  ok(/次点击/.test(txt(d, '.sc-live')), '预算变化时有实时点击预估提示');
  pick(w, '[data-uis-f="bid"]', 'down');
  pick(w, '[data-uis-f="placement"]', '0');
  click(w, '[data-act="uis-submit"]');
  ok(/Add keywords/.test(txt(d, '.sc-pghead h1')), '第 2 步通过，进入关键词页');

  ok(all(d, '.sc-tb-kw tbody tr').length === 6, '关键词表 6 行');
  ok(all(d, '.sc-tb-kw select').length === 6, '每行都有匹配方式下拉');
  KW3.forEach(k => {
    click(w, '[data-act="uis-ck"][data-k="' + k + '"]');
    pick(w, '[data-uis-f="match"][data-k="' + k + '"]', 'exact');
    fill(w, '[data-uis-f="bid"][data-k="' + k + '"]', '0.65');
  });
  ok(all(d, '.sc-tb-kw tbody tr.on').length === 3, '勾选 3 个词后 3 行高亮');
  click(w, '[data-act="uis-submit"]');

  ok(!!$(d, '.uis-done'), '三步走完出现结算页');
  ok(txt(d, '.uis-done-score b') === '3', '满分 3 分', txt(d, '.uis-done-score b'));
  ok(/熟练/.test(txt(d, '.uis-done-t')), '评级为熟练');
  ok(all(d, '.uis-rv').length === 3, '结算页 3 条逐步复盘');
  ok(all(d, '.uis-rv-p').filter(e => /100%/.test(e.textContent)).length === 3, '三步都是 100%');
  ok(ui(w).done['ad-create'] === 3, '最好成绩写入本地状态');
}

/* ============================================================
   5. 场景 1 · 拦截与扣分
   ============================================================ */
console.log('\n【5】场景 1 · 拦截与扣分');
{
  const dom = boot(null), w = dom.window, d = w.document;
  enter(w, 'ad-create');
  click(w, '[data-act="uis-next"]');

  click(w, '[data-f="type"][data-v="sb"]');
  fill(w, '[data-uis-f="name"]', 'SP-Manual-Earbuds-BLK-1023');
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.sc-fb.bad') && /品牌备案/.test(txt(d, '.sc-fb')), '选 SB 被拦下并说明原因（品牌备案）');
  ok(ui(w).step === 1, '被拦后不推进');

  click(w, '[data-f="type"][data-v="sp"]');
  fill(w, '[data-uis-f="name"]', '耳机新品活动');
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.sc-fb.warn') && /英文/.test(txt(d, '.sc-fb')), '纯中文活动名可以存但提示用英文命名');

  fill(w, '[data-uis-f="budget"]', '8');
  pick(w, '[data-uis-f="bid"]', 'updown');
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.sc-fb.warn'), '预算过低 / 策略错误 → 黄色「可以保存但会扣分」');
  ok(/只够|拿不到|推高/.test(txt(d, '.sc-fb')), '扣分理由具体（跑不出数据 / 被系统提价）');
  ok(ui(w).res.s2.pts <= 0.35, '竞价策略选错的扣分更重（≤0.35）', ui(w).res.s2.pts);

  click(w, '[data-act="uis-ck"][data-k="wireless earbuds"]');
  click(w, '[data-act="uis-ck"][data-k="phone case"]');
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.sc-fb.bad') && /多选了/.test(txt(d, '.sc-fb')), '选错关键词被拦下并指出多选了什么');
  ok(ui(w).step === 3, '拦下后停在第 3 步');

  click(w, '[data-act="uis-ck"][data-k="wireless earbuds"]');
  click(w, '[data-act="uis-ck"][data-k="phone case"]');
  KW3.forEach(k => {
    click(w, '[data-act="uis-ck"][data-k="' + k + '"]');
    fill(w, '[data-uis-f="bid"][data-k="' + k + '"]', '1.8');
  });
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.sc-fb.warn') && /0\.84|划算线/.test(txt(d, '.sc-fb')), 'bid 离谱 → 扣分并给出划算线 $0.84');
}

/* ============================================================
   6. 场景 2 · 正确路径（2 分）
   ============================================================ */
console.log('\n【6】场景 2 · Search terms 否词（正确路径）');
{
  const dom = boot(null), w = dom.window, d = w.document;
  enter(w, 'negate');
  ok(/Search terms/.test(txt(d, '.sc-tab.on')), '默认停在 Search terms 标签页');
  ok(/Customer search term/.test(txt(d, '.sc-tb thead')), '表头含 Customer search term');
  ok(/Clicks/.test(txt(d, '.sc-tb thead')) && /ACOS/.test(txt(d, '.sc-tb thead')), '表头含 Clicks / Spend / Sales / ACOS');
  ok(!!$(d, '[data-uis-f="bulkact"]'), '有「选择操作」批量下拉');
  ok(/Negative exact/.test(txt(d, '.sc-bulk')) && /Negative phrase/.test(txt(d, '.sc-bulk')), '下拉含精准否定 / 词组否定');
  ok(/Move to exact/.test(txt(d, '.sc-bulk')), '下拉含「移入精准组」');

  ['earbuds for running', 'earbuds', 'phone case'].forEach(k => click(w, '[data-act="uis-sel"][data-v="' + k + '"]'));
  pick(w, '[data-uis-f="bulkact"]', 'exact');
  click(w, '[data-act="uis-apply"]');
  ok(all(d, '.sc-act.a-exact').length === 3, '批量应用后 3 行行内操作变为「精准否定」', all(d, '.sc-act.a-exact').length);

  click(w, '[data-act="uis-sel"][data-v="cheap earbuds"]');
  pick(w, '[data-uis-f="bulkact"]', 'phrase');
  click(w, '[data-act="uis-apply"]');
  pick(w, '[data-uis-f="rowact"][data-k="wireless earbuds"]', 'move');
  ok(/待处理 <b>0<\/b>/.test($(d, '.sc-bulk-n').innerHTML), '全部行处理完后「待处理 0」');

  click(w, '[data-act="uis-submit"]');
  ok(/Keywords/.test(txt(d, '.sc-pghead h1')), '全对后进入 Keywords 页');
  ok(ui(w).res.s0.pts === 1, '全对得满分 1', ui(w).res.s0.pts);

  fill(w, '[data-uis-f="bid"][data-k="wireless earbuds small ears"]', '0.85');
  fill(w, '[data-uis-f="bid"][data-k="bluetooth earbuds small ear tips"]', '0.62');
  fill(w, '[data-uis-f="bid"][data-k="wireless earbuds"]', '0.80');
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.uis-done') && txt(d, '.uis-done-score b') === '2', '否词场景可拿满分 2', txt(d, '.uis-done-score b'));
}

/* ============================================================
   7. 场景 2 · 判错反馈
   ============================================================ */
console.log('\n【7】场景 2 · 判错与守卫');
{
  const dom = boot(null), w = dom.window, d = w.document;
  enter(w, 'negate');
  click(w, '[data-act="uis-apply"]');
  ok(/先勾选/.test(txt(d, '.sc-toast')), '未勾选时提示先勾选');
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.sc-fb.bad') && /没处理/.test(txt(d, '.sc-fb')), '有行未处理时被拦下');

  /* 把该点杀的 earbuds 错判成群封 */
  click(w, '[data-act="uis-sel"][data-v="earbuds"]');
  pick(w, '[data-uis-f="bulkact"]', 'phrase');
  click(w, '[data-act="uis-apply"]');
  ['earbuds for running', 'phone case'].forEach(k => click(w, '[data-act="uis-sel"][data-v="' + k + '"]'));
  pick(w, '[data-uis-f="bulkact"]', 'exact');
  click(w, '[data-act="uis-apply"]');
  click(w, '[data-act="uis-sel"][data-v="cheap earbuds"]');
  pick(w, '[data-uis-f="bulkact"]', 'phrase');
  click(w, '[data-act="uis-apply"]');
  pick(w, '[data-uis-f="rowact"][data-k="wireless earbuds"]', 'move');
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.sc-fb.warn'), '一行判偏 → 黄色扣分而非直接拦死');
  ok(/应为精准否定/.test(txt(d, '.sc-fb')), '明确指出「应为精准否定」', txt(d, '.sc-fb').slice(0, 60));
  ok(/词组否会把自己的成交词/.test(txt(d, '.sc-fb')), '同时给出这条判断的依据');
  ok(ui(w).res.s0.pts <= 0.6, '判偏一行扣分到 ≤0.6', ui(w).res.s0.pts);
}

/* ============================================================
   8. 场景 3 · Listing 标题实时飘红
   ============================================================ */
console.log('\n【8】场景 3 · 标题实时防雷');
{
  const dom = boot(null), w = dom.window, d = w.document;
  enter(w, 'listing');
  ok(!!$(d, '#lsTa') && !!$(d, '#lsMirror'), '渲染出输入框 + 镜像层（用于飘红）');
  ok(all(d, '.ls-rule').length === 7, '7 条合规规则逐项列出');
  const bad0 = all(d, '.ls-rule.bad').length;
  ok(bad0 >= 4, '草稿至少有 4 条不通过', bad0);
  ok(all(d, '#lsMirror mark').length >= 4, '违规词在镜像层被 <mark> 标红', all(d, '#lsMirror mark').length);
  ok(/!/i.test(txt(d, '#lsMirror')), '禁用符号被识别');

  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.sc-fb.bad') && /变狗|抑制/.test(txt(d, '.sc-fb')), '草稿直接提交被拦下，并说明后果');
  ok(ui(w).step === 0, '被拦后停在第 1 页');

  fill(w, '#lsTa', 'Wireless Earbuds best sound for small ears');
  ok(all(d, '#lsMirror mark').length === 1, '输入 best 后立刻出现 1 处飘红');
  ok(/best/i.test(txt(d, '#lsMirror mark')), '飘红的正是 best');

  fill(w, '#lsTa', 'Wireless Earbuds anti-bacteria for small ears');
  ok(all(d, '.ls-rule.bad').length >= 1 && /医疗|功效/.test(txt(d, '.ls-rules')), 'anti-bacteria 触发功效声明规则');

  fill(w, '#lsTa', 'Wireless Earbuds Owala style for small ears');
  ok(/品牌/.test(txt(d, '.ls-rules')) && all(d, '#lsMirror mark').length === 1, 'Owala 触发他人品牌词飘红');

  const good = 'Wireless Earbuds for Small Ears, Bluetooth 5.3 Running Headphones, 48H Playtime, IPX7 Waterproof, Built-in Mic, Black';
  fill(w, '#lsTa', good);
  ok(all(d, '.ls-rule.ok').length === 7, '改写后 7 条全绿', all(d, '.ls-rule.ok').length);
  ok(all(d, '#lsMirror mark').length === 0, '全绿时无飘红');
  click(w, '[data-act="uis-submit"]');
  ok(/Images/.test(txt(d, '.sc-pghead h1')), '合规标题通过，进入图片页');

  pick(w, '[data-uis-f="bg"]', 'white');
  pick(w, '[data-uis-f="size"]', '1000');
  pick(w, '[data-uis-f="wm"]', 'no');
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.sc-fb.warn') && /1600/.test(txt(d, '.sc-fb')), '1000px 被指出「不触发放大镜」');
}

/* ============================================================
   9. 场景 4 · FBA 补货
   ============================================================ */
console.log('\n【9】场景 4 · 补货计算与 IPI');
{
  const dom = boot(null), w = dom.window, d = w.document;
  enter(w, 'restock');
  ok(/Manage All Inventory/.test(txt(d, '.sc-pghead h1')), '入口是 Manage All Inventory');
  ok(!!$(d, '.sc-btn-lg') && /Replenish/.test(txt(d, '.sc-btn-lg')), '表格上方有 Send/Replenish 按钮');
  ok(all(d, '.sc-tb tbody tr').length === 3, '库存表 3 个 SKU');
  click(w, '[data-act="uis-next"]');
  ok(/Send \/ Replenish/.test(txt(d, '.sc-pghead h1')), '进入补货计算页');

  fill(w, '[data-uis-f="daily"]', '34');
  ok(/21 天/.test(txt(d, '.sc-live')), '实时算出可售 21 天');
  fill(w, '[data-uis-f="qty"]', '900');
  pick(w, '[data-uis-f="ship"]', 'sea');
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.sc-fb.bad') && /1,082/.test(txt(d, '.sc-fb')), '数量算错时给出完整算式');
  ok(/发少了|多发了/.test(txt(d, '.sc-fb')), '并指出是多发还是少发');
}

console.log('\n【9b】场景 4 · 正确路径（2 分）');
{
  const dom = boot(null), w = dom.window, d = w.document;
  enter(w, 'restock');
  click(w, '[data-act="uis-next"]');
  fill(w, '[data-uis-f="daily"]', '34');
  fill(w, '[data-uis-f="qty"]', '1082');
  pick(w, '[data-uis-f="ship"]', 'mix');
  click(w, '[data-act="uis-submit"]');
  ok(/IPI/.test(txt(d, '.sc-pghead h1')), '进入 IPI 限仓页');
  ok(/380/.test(txt(d, '.sc-ipi')), 'IPI 380 低于 400 限仓线');
  ['clear', 'sell', 'fix'].forEach(v => click(w, '[data-act="uis-toggle"][data-v="' + v + '"]'));
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.uis-done') && txt(d, '.uis-done-score b') === '2', '补货场景满分 2', txt(d, '.uis-done-score b'));
}

console.log('\n【9c】场景 4 · 全走海运扣分');
{
  const dom = boot(null), w = dom.window, d = w.document;
  enter(w, 'restock');
  click(w, '[data-act="uis-next"]');
  fill(w, '[data-uis-f="daily"]', '34');
  fill(w, '[data-uis-f="qty"]', '1082');
  pick(w, '[data-uis-f="ship"]', 'sea');
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.sc-fb.warn') && /断货/.test(txt(d, '.sc-fb')), '数量对了但全走海运 → 提示断货扣分');
}

/* ============================================================
   10. 场景 5 · 差评处理
   ============================================================ */
console.log('\n【10】场景 5 · 1 星差评');
{
  const dom = boot(null), w = dom.window, d = w.document;
  enter(w, 'review');
  ok(/漏水/.test(txt(d, '.sc-review')) && /★/.test(txt(d, '.sc-review')), '渲染出 1 星差评卡');
  ok(all(d, '.sc-check').length === 6, '操作面板 6 个可选动作');
  ok(/Verified/.test(txt(d, '.sc-review')), '显示 Verified Purchase 等判断信息');

  ['refund', 'brush'].forEach(v => click(w, '[data-act="uis-toggle"][data-v="' + v + '"]'));
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.sc-fb.warn') && /操纵评论|账号级违规/.test(txt(d, '.sc-fb')), '刷好评被指出是账号级违规');

  fill(w, '[data-uis-f="subject"]', 'Regarding your order');
  fill(w, '[data-uis-f="body"]', '很抱歉产品有问题，我们可以给您退款，麻烦您把好评改一下。');
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.sc-fb.bad') && /操纵评论|封店/.test(txt(d, '.sc-fb')), '消息里以补偿换好评被硬拦');
  ok(/好评|五星/.test(txt(d, '.sc-fb')), '拦截理由点明具体的违规表述');
}

console.log('\n【10b】场景 5 · 正确路径（2 分）');
{
  const dom = boot(null), w = dom.window, d = w.document;
  enter(w, 'review');
  ['refund', 'supply'].forEach(v => click(w, '[data-act="uis-toggle"][data-v="' + v + '"]'));
  click(w, '[data-act="uis-submit"]');
  ok(/Buyer-Seller/.test(txt(d, '.sc-pghead h1')), '退款+供应链通过，进入消息页');

  fill(w, '[data-uis-f="subject"]', 'Regarding your order 112-XXXXXXX');
  fill(w, '[data-uis-f="body"]', '非常抱歉这次的产品让您失望了。我们已经安排免费补发一副，并会在 24 小时内发出，物流单号会同步给您。');
  ok(all(d, '.sc-chk li.ok').length === 4, '实时检查 4 项全绿', all(d, '.sc-chk li.ok').length);
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.uis-done') && txt(d, '.uis-done-score b') === '2', '差评场景满分 2', txt(d, '.uis-done-score b'));
}

/* ============================================================
   11. 场景 6 · Coupon 与秒杀
   ============================================================ */
console.log('\n【11】场景 6 · Coupon 与 Deal');
{
  const dom = boot(null), w = dom.window, d = w.document;
  enter(w, 'coupon');
  ok(/Coupons/.test(txt(d, '.sc-pghead h1')), '入口是 Coupons 页');
  click(w, '[data-act="uis-next"]');
  ok(/Create coupon/.test(txt(d, '.sc-pghead h1')), '进入 Create coupon 页');

  pick(w, '[data-uis-f="ct"]', 'pct');
  fill(w, '[data-uis-f="pct"]', '4');
  fill(w, '[data-uis-f="budget"]', '300');
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.sc-fb.bad') && /至少 5%/.test(txt(d, '.sc-fb')), '4% 折扣被硬拦（亚马逊门槛 5%）');
  ok(ui(w).step === 1, '被拦后不推进');

  fill(w, '[data-uis-f="pct"]', '15');
  fill(w, '[data-uis-f="budget"]', '40');
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.sc-fb.warn') && /烧完/.test(txt(d, '.sc-fb')), '预算过低提示「瞬间烧完」');
  ok(/Deals/.test(txt(d, '.sc-pghead h1')), '扣分放行，进入 Deal 报名页');

  fill(w, '[data-uis-f="price"]', '35');
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.sc-fb.bad') && /20%/.test(txt(d, '.sc-fb')), '折扣不足 20% 的 Deal 价被拦');
}

console.log('\n【11b】场景 6 · 正确路径（2 分）');
{
  const dom = boot(null), w = dom.window, d = w.document;
  enter(w, 'coupon');
  click(w, '[data-act="uis-next"]');
  pick(w, '[data-uis-f="ct"]', 'pct');
  fill(w, '[data-uis-f="pct"]', '15');
  fill(w, '[data-uis-f="budget"]', '300');
  click(w, '[data-act="uis-submit"]');
  ok(/Deals/.test(txt(d, '.sc-pghead h1')), 'Coupon 参数合规，进入 Deal 页');
  fill(w, '[data-uis-f="price"]', '29.99');
  fill(w, '[data-uis-f="stock"]', '200');
  pick(w, '[data-uis-f="stack"]', 'no');
  click(w, '[data-act="uis-submit"]');
  ok(!!$(d, '.uis-done') && txt(d, '.uis-done-score b') === '2', '促销场景满分 2', txt(d, '.uis-done-score b'));
}

/* ============================================================
   12. 持久化与导航
   ============================================================ */
console.log('\n【12】持久化与导航');
{
  const dom1 = boot(null), w1 = dom1.window;
  enter(w1, 'listing');
  fill(w1, '#lsTa', 'Wireless Earbuds 测试标题 for small ears');
  const saved = w1.localStorage.getItem('amz-ops-v2-state');
  ok(!!saved && JSON.parse(saved).ui.sid === 'listing', '场景进度写入 localStorage');
  ok(JSON.parse(saved).ui.v.s0.title.indexOf('测试标题') > -1, '输入内容逐字存盘（刷新不丢）');

  const dom2 = boot({ 'amz-ops-v2-state': saved }), w2 = dom2.window, d2 = w2.document;
  ok(!!$(d2, '#lsTa') && /测试标题/.test($(d2, '#lsTa').value), '重开后输入内容恢复');

  const old = JSON.stringify({
    v: 3, seed: 1, screen: 'welcome', inst: {}, ord: {}, exam: {}, quiz: {},
    ui: { sid: 'ad-create', step: 0, ans: { type: 'sp' }, wrongMark: {}, draftUsed: true }
  });
  const dom3 = boot({ 'amz-ops-v2-state': old }), w3 = dom3.window, d3 = w3.document;
  ok(!!$(d3, '[data-act="go-uis"]'), '旧存档兼容：首页正常渲染');
  click(w3, '[data-act="go-uis"]');
  ok(all(d3, '.uis-card').length === 6, '旧存档进入模拟页不崩（落到场景列表）');

  enter(w1, 'review');
  click(w1, '[data-act="uis-back"]');
  ok(all(w1.document, '.uis-card').length === 6, '返回场景列表');
  click(w1, '[data-act="uis-open"][data-v="review"]');
  click(w1, '[data-act="uis-toggle"][data-v="refund"]');
  click(w1, '[data-act="uis-toggle"][data-v="supply"]');
  click(w1, '[data-act="uis-submit"]');
  fill(w1, '[data-uis-f="body"]', '很抱歉，我们会尽快为您补发一副，24 小时内发出。');
  click(w1, '[data-act="uis-submit"]');
  ok(!!$(w1.document, '.uis-done'), '走完场景');
  click(w1, '[data-act="uis-again"]');
  ok(ui(w1).step === 0, '「Retry」重置到第 1 个页面');
  ok(w1.document.querySelectorAll('.sc-check.on').length === 0, '重置后选项清空');
}

console.log('\n===== v3-ui 回归 B：通过 ' + pass + ' 项，失败 ' + fail + ' 项 =====');
process.exit(fail ? 1 : 0);
