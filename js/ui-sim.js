/* ============================================================
   界面操作模拟模块 · 高保真重构版（v3-ui 阶段 9）
   ------------------------------------------------------------
   性质说明：本模块是对卖家后台（Seller Central）界面布局与操作
   路径的**示意还原**，用于练习「在哪个页面、点哪个按钮、填什么
   数、按什么规则校验」。不是真实后台截图，不连接任何账号，所有
   数值与数据均为模拟。
   ------------------------------------------------------------
   结构：
     SCENES[]  6 个场景，每个场景由若干「屏幕（step）」组成
     每个 step 描述一个真实后台页面：左导航高亮 / 面包屑 / 页面
     标题 / 标签页 / KPI 条 / 表单或表格 / 底部操作条。
   ------------------------------------------------------------
   对外接口：window.UISIM = { list, render, act, ... }
   状态由 app.js 的 state.ui 承载，本文件不直接读写 localStorage。
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     0. 工具
     ============================================================ */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function num(x) {
    const n = parseFloat(String(x == null ? '' : x).replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  function money(n) { return '$' + (Math.round(n * 100) / 100).toFixed(2); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function setEq(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return b.every(function (x) { return a.indexOf(x) > -1; });
  }
  function has(hay, x) { return String(hay || '').toLowerCase().indexOf(String(x).toLowerCase()) > -1; }

  /* 沙盒里的「今天」，固定值保证判分可复现 */
  const TODAY = '2026-10-23';
  function days(a, b) {
    const t1 = Date.parse(a + 'T00:00:00'), t2 = Date.parse(b + 'T00:00:00');
    if (isNaN(t1) || isNaN(t2)) return 0;
    return Math.round((t2 - t1) / 86400000);
  }

  /* 左侧一级导航（按用户给定顺序） */
  const NAV = [
    { id: 'catalog', label: 'Catalog', cn: '商品目录', g: '▦' },
    { id: 'inventory', label: 'Inventory', cn: '库存', g: '▥' },
    { id: 'pricing', label: 'Pricing', cn: '定价', g: '$' },
    { id: 'advertising', label: 'Advertising', cn: '广告', g: '◉' },
    { id: 'reports', label: 'Reports', cn: '报告', g: '▤' },
    { id: 'performance', label: 'Performance', cn: '绩效', g: '✓' }
  ];
  const AD_TABS = ['Campaigns', 'Ad groups', 'Keywords', 'Negative keywords', 'Search terms', 'Placements'];

  /* ============================================================
     1. Listing 标题合规规则（实时飘红与提交校验共用）
     ============================================================ */
  const BAD_SYMBOLS = /[!$?_{}^¬¦~]/g;
  const ABUSE_WORDS = ['best', 'no.1', 'no 1', '#1', 'top rated', '100%', 'guaranteed', 'perfect'];
  const MED_WORDS = ['anti-bacteria', 'anti-bacterial', 'antibacterial', 'antibiotic', 'sterilize', 'sterilise', 'cure', 'fda', 'medical grade'];
  const BRAND_WORDS = ['owala', 'hydro flask', 'hydroflask', 'stanley', 'yeti', 'dyson', 'nespresso'];
  const CORE_KW = 'wireless earbuds';

  /* 在字符串里找词（大小写不敏感 + 前后边界判断），返回 [start,end] 区间 */
  function scanWords(s, list) {
    const lo = s.toLowerCase(), out = [];
    list.forEach(function (w) {
      let from = 0, i;
      while ((i = lo.indexOf(w, from)) > -1) {
        const before = i === 0 ? ' ' : lo.charAt(i - 1);
        const after = lo.charAt(i + w.length) || ' ';
        const wordish = /[a-z0-9]/.test(w.charAt(0)) && /[a-z0-9]/.test(w.charAt(w.length - 1));
        const okBefore = !wordish || !/[a-z0-9]/.test(before);
        const okAfter = !wordish || !/[a-z0-9]/.test(after);
        if (okBefore && okAfter) out.push([i, i + w.length, w]);
        from = i + w.length;
      }
    });
    return out;
  }

  /* 逐项检测：返回规则数组，带 ranges 供飘红 */
  function titleCheck(s) {
    const str = String(s || '');
    const lower = str.toLowerCase();
    const sym = [];
    let m;
    BAD_SYMBOLS.lastIndex = 0;
    while ((m = BAD_SYMBOLS.exec(str))) sym.push([m.index, m.index + 1, m[0]]);
    const abs = scanWords(str, ABUSE_WORDS);
    const med = scanWords(str, MED_WORDS);
    const brd = scanWords(str, BRAND_WORDS);
    const dup = (lower.match(/earbuds/g) || []).length;
    const pos = lower.indexOf(CORE_KW);
    return [
      { k: 'len', ok: str.length > 0 && str.length <= 200, ranges: [], label: '长度 ' + str.length + ' / 200 字符' },
      {
        k: 'sym', ok: sym.length === 0, ranges: sym,
        label: sym.length ? '含禁用符号 ' + sym.map(function (x) { return x[2]; }).join(' ') : '无禁用符号'
      },
      {
        k: 'abs', ok: abs.length === 0, ranges: abs,
        label: abs.length ? '绝对化用语 ' + abs.map(function (x) { return x[2]; }).join(' / ') : '无绝对化用语'
      },
      {
        k: 'med', ok: med.length === 0, ranges: med,
        label: med.length ? '医疗/功效声明 ' + med.map(function (x) { return x[2]; }).join(' / ') : '无功效声明'
      },
      {
        k: 'brand', ok: brd.length === 0, ranges: brd,
        label: brd.length ? '他人品牌词 ' + brd.map(function (x) { return x[2]; }).join(' / ') : '无他人品牌词'
      },
      {
        k: 'pos', ok: pos > -1 && pos < 80, ranges: [],
        label: pos > -1 ? '核心词位置 ' + pos + '（需 < 80）' : '缺核心词 wireless earbuds'
      },
      { k: 'dup', ok: dup <= 2, ranges: [], label: 'earbuds 出现 ' + dup + ' 次（≤ 2）' }
    ];
  }

  /* 把违规区间合并后渲染成带 <mark> 的 HTML */
  function markTitle(s) {
    const str = String(s || '');
    if (!str) return '<span class="ls-ph">在下方输入框里改写标题，违规处会即时标红…</span>';
    const rs = titleCheck(str).reduce(function (a, r) { return a.concat(r.ranges); }, []);
    if (!rs.length) return esc(str);
    rs.sort(function (a, b) { return a[0] - b[0]; });
    const merged = [rs[0].slice(0, 2)];
    for (let i = 1; i < rs.length; i++) {
      const last = merged[merged.length - 1];
      if (rs[i][0] <= last[1]) last[1] = Math.max(last[1], rs[i][1]);
      else merged.push(rs[i].slice(0, 2));
    }
    let out = '', at = 0;
    merged.forEach(function (r) {
      out += esc(str.slice(at, r[0]));
      out += '<mark>' + esc(str.slice(r[0], r[1])) + '</mark>';
      at = r[1];
    });
    return out + esc(str.slice(at));
  }

  /* ============================================================
     2. 场景数据
     ============================================================ */
  const SCENES = [

    /* ══════════ 场景 1 · 新建 SP 广告活动 ══════════ */
    {
      id: 'ad-create', icon: '📣', tag: '广告', title: '新建 SP 广告活动',
      goal: '从 Campaign Manager 走完一次真实的 Create campaign：选类型 → 命名 → 预算与竞价策略 → 加词与出价。',
      brief: '新品上架第 5 天，0 评论，客单价 $39.99，毛利率 35%。今天要把第一支手动精准活动建起来。',
      data: [['客单价', '$39.99'], ['毛利率', '35%'], ['类目 CPC', '$0.42 – $0.78'], ['CVR 参考', '6%'], ['上架天数', '第 5 天 · 0 评论']],
      steps: [
        {
          id: 's0', ns: true, nav: 'advertising',
          page: 'Campaign Manager', crumb: ['Advertising', 'Campaign Manager'],
          coach: '先进入 Campaign Manager，点 Create campaign 新建一支活动',
          tabs: { items: AD_TABS, active: 0 },
          kpi: [['Impressions', '42,180'], ['Clicks', '128'], ['Spend', '$71.30'], ['Sales', '$186.40'], ['ACOS', '38.3%']],
          primary: [{ t: 'Create campaign', act: 'uis-next', lg: true }],
          body: {
            t: 'table', noCk: true,
            cols: ['Campaign name', 'Targeting', 'Status', 'Daily budget', 'Spend', 'Sales', 'ACOS'],
            rows: [{ k: 'auto', cells: ['SP-Auto-Earbuds-0912', 'Auto · Close match', '<span class="sc-pill on">Active</span>', '$20.00', '$71.30', '$186.40', '38.3%'] }]
          },
          below: {
            h: 'Create your first Sponsored Products campaign',
            p: '自动活动只能跑出搜索词，跑不出可控的关键词。手动精准活动要在同一个广告账号下单独建一支。',
            btn: 'Create campaign'
          },
          why: '广告结构从一级入口进：Advertising → Campaign Manager → Create campaign。'
        },
        {
          id: 's1', nav: 'advertising',
          page: 'Create campaign', crumb: ['Advertising', 'Campaign Manager', 'Create campaign'],
          coach: '选择广告类型，并给活动起一个能被同事看懂的名字',
          tabs: { items: AD_TABS, active: 0 },
          body: {
            t: 'form',
            fields: [
              {
                k: 'type', label: 'Advertising type', kind: 'cards',
                opts: [
                  { v: 'sp', label: 'Sponsored Products', desc: '按关键词或商品定向，出现在搜索结果页与详情页', note: '无需品牌备案' },
                  { v: 'sb', label: 'Sponsored Brands', desc: '品牌旗舰横幅，出现在搜索结果页顶部', note: '需品牌备案' },
                  { v: 'sd', label: 'Sponsored Display', desc: '站内外再营销，按人群或商品定向', note: '需品牌备案' }
                ]
              },
              { k: 'name', label: 'Campaign name', kind: 'text', ph: '例如 SP-Manual-Earbuds-BLK-1023', hint: '建议含「投放方式 + 主推词 + 颜色/站点 + 日期」，方便后面看报表时一眼分清', full: true }
            ]
          },
          check: function (v) {
            if (v.type !== 'sp') {
              return {
                ok: false, level: 'bad',
                msg: v.type === 'sb' || v.type === 'sd'
                  ? 'SB / SD 都需要品牌备案才能创建，这个店铺还没备案——后台会直接灰掉这两个选项。新品起量从 Sponsored Products 开始。'
                  : '先选一个广告类型。'
              };
            }
            const n = String(v.name || '').trim();
            if (!n) return { ok: false, level: 'bad', msg: '活动名不能为空——亚马逊要求同一账号下活动名唯一。' };
            if (n.length > 128) return { ok: false, level: 'bad', msg: '活动名超过 128 字符，后台会报错。' };
            if (/[!@#$%^&*]/.test(n)) return { ok: false, level: 'bad', msg: '活动名不能含 ! @ # $ % ^ & * 这类特殊符号。' };
            if (!/[a-zA-Z]/.test(n)) return { ok: true, level: 'warn', pts: 0.5, msg: '纯中文/纯数字能存，但广告报表导出后中文容易乱码，跨人交接也分不清。建议英文 + 日期。' };
            if (!/\d/.test(n)) return { ok: true, level: 'warn', pts: 0.7, msg: '名字能存。但没有日期，三个月后回看这张表就分不清是哪一版了——建议带上 1023 这样的日期后缀。' };
            return { ok: true, msg: '类型和命名都没问题，可以进预算设置。' };
          },
          why: '没有品牌备案只能开 SP。活动名是后面所有报表的分组维度，命名规则要在建第一支活动时就定下来。'
        },
        {
          id: 's2', nav: 'advertising',
          page: 'Create campaign · Set budget', crumb: ['Advertising', 'Campaign Manager', 'Create campaign', 'Budget'],
          coach: '设置日预算与竞价策略（这两个数决定这支活动会不会烧钱）',
          body: {
            t: 'form',
            above: '<div class="sc-note"><b>Cost per click 参考：</b>$0.42 – $0.78 · <b>预估触达：</b>约 2.6 万次曝光/周</div>',
            fields: [
              { k: 'budget', label: 'Daily budget', kind: 'num', unit: '$', ph: '0.00', hint: '低于 $15 跑不出可判断的数据；新品期也别超过 $40' },
              {
                k: 'bid', label: 'Bidding strategy', kind: 'select',
                opts: [
                  { v: 'down', label: 'Dynamic bids — down only（动态竞价 · 仅降低）' },
                  { v: 'updown', label: 'Dynamic bids — up and down（动态竞价 · 提高和降低）' },
                  { v: 'fixed', label: 'Fixed bids（固定竞价）' }
                ],
                hint: '0 评论、没历史转化数据时，系统没有依据去提价'
              },
              { k: 'placement', label: 'Top of search adjustment', kind: 'select', opts: [
                { v: '0', label: '0%（不溢价）' }, { v: '30', label: '+30%' }, { v: '50', label: '+50%' }
              ], hint: '新品期先不开首页溢价' }
            ],
            live: function (v) {
              const b = num(v.budget);
              if (!b) return '';
              const clicks = Math.round(b / 0.6);
              return '<div class="sc-live-row">按 CPC $0.60 估算：日预算 ' + money(b) + ' ≈ <b>' + clicks + ' 次点击 / 天</b>'
                + (clicks < 25 ? ' · <span class="s-bad">低于 25 次，7 天也跑不出统计意义</span>' : '') + '</div>';
            }
          },
          check: function (v) {
            const b = num(v.budget), s = v.bid, pl = v.placement;
            if (!b) return { ok: false, level: 'bad', msg: '日预算必须填。' };
            if (b < 5) return { ok: false, level: 'bad', msg: '日预算 $' + r1(b) + ' 低于亚马逊单日最低门槛，保存会报错。' };
            let pts = 1; const note = [];
            if (b < 15) { pts = Math.min(pts, 0.4); note.push('日预算 ' + money(b) + ' 按 CPC $0.60 只够 ' + Math.round(b / 0.6) + ' 次点击/天，7 天拿不到可判断的转化数据'); }
            else if (b > 40) { pts = Math.min(pts, 0.6); note.push('新品期日预算 ' + money(b) + ' 太激进，容易在没有转化的情况下把预算烧在泛词上'); }
            if (s === 'updown') { pts = Math.min(pts, 0.35); note.push('动态竞价「提高和降低」会在 0 评论阶段被系统推高成交价，最多上浮 100%'); }
            else if (s === 'fixed') { pts = Math.min(pts, 0.65); note.push('固定竞价在竞争高峰顶不住、低谷又浪费，缺少自动收敛'); }
            else if (s !== 'down') { return { ok: false, level: 'bad', msg: '竞价策略没选。' }; }
            if (pl !== '0') { pts = Math.min(pts, 0.8); note.push('首页溢价会进一步抬高 CPC，新品期先不开'); }
            if (pts >= 0.999) {
              return { ok: true, msg: '预算 ' + money(b) + ' + 仅降低竞价：既能跑出数据，又不会在没转化时被系统提价。' };
            }
            return { ok: true, level: 'warn', pts: pts, msg: note.join('；') + '。（设置能保存，但这一档会直接吃掉后面的利润空间）' };
          },
          why: '划算线 = 客单价 × CVR × 毛利率 = 39.99 × 6% × 35% ≈ $0.84。日预算的意义不是「花多少」，而是「几天能跑出可判断的样本」。新品期用「仅降低」把成本上限锁死。'
        },
        {
          id: 's3', nav: 'advertising',
          page: 'Create campaign · Add keywords', crumb: ['Advertising', 'Campaign Manager', 'Create campaign', 'Keywords'],
          coach: '勾选要投的词，选匹配方式，逐个填 Bid（不要照抄建议竞价）',
          body: {
            t: 'kw',
            hint: '建议竞价是类目平均值，不是你的划算线。',
            cols: ['Keyword', '月搜索量', '相关性', '建议竞价', '匹配方式', 'Your bid'],
            rows: [
              { k: 'wireless earbuds', vol: '902,000', rel: '泛词', sug: '1.65', pick: false },
              { k: 'wireless earbuds for small ears', vol: '18,400', rel: '精准', sug: '0.72', pick: true },
              { k: 'bluetooth earbuds small ear tips', vol: '9,100', rel: '精准', sug: '0.61', pick: true },
              { k: 'earbuds', vol: '1,480,000', rel: '极泛', sug: '1.92', pick: false },
              { k: 'running headphones sweatproof', vol: '12,600', rel: '相关', sug: '0.68', pick: true },
              { k: 'phone case', vol: '2,100,000', rel: '不相关', sug: '1.20', pick: false }
            ]
          },
          check: function (v) {
            const rows = SC_BY('ad-create').steps[3].body.rows;
            const pick = v.pick || {}, match = v.match || {}, bid = v.bid || {};
            const got = rows.filter(function (r) { return pick[r.k]; }).map(function (r) { return r.k; });
            const want = rows.filter(function (r) { return r.pick; }).map(function (r) { return r.k; });
            if (!got.length) return { ok: false, level: 'bad', msg: '一个词都没选，广告投不出去。' };
            if (!setEq(got, want)) {
              const extra = got.filter(function (x) { return want.indexOf(x) < 0; });
              const miss = want.filter(function (x) { return got.indexOf(x) < 0; });
              const p = [];
              if (extra.length) p.push('多选了 ' + extra.join('、') + '（泛词/不相关词，$1.65–$1.92 的竞价配 0 评论只有曝光没有转化）');
              if (miss.length) p.push('漏了 ' + miss.join('、') + '（CPC 低、相关性强，是新品期最该先跑的词）');
              return { ok: false, level: 'bad', msg: p.join('；') + '。' };
            }
            let pts = 1; const note = [];
            const noBid = got.filter(function (k) { return !String(bid[k] || '').trim(); });
            if (noBid.length) return { ok: false, level: 'bad', msg: '有 ' + noBid.length + ' 个词没填 bid：' + noBid.join('、') + '。' };
            const high = got.filter(function (k) { return num(bid[k]) > 0.85; });
            const low = got.filter(function (k) { return num(bid[k]) < 0.45; });
            if (high.length) { pts = Math.min(pts, 0.35); note.push(high.map(function (k) { return k + ' 出了 $' + num(bid[k]); }).join('、') + '，高于划算线 $0.84——这一档买进来就是负毛利'); }
            if (low.length) { pts = Math.min(pts, 0.6); note.push(low.map(function (k) { return k + ' 只出 $' + num(bid[k]); }).join('、') + '，低于类目下限 $0.42–$0.78，拿不到曝光'); }
            const wrongMatch = got.filter(function (k) { return (match[k] || 'broad') !== 'exact'; });
            if (wrongMatch.length) { pts = Math.min(pts, 0.55); note.push('这 ' + wrongMatch.length + ' 个词用了宽泛/词组匹配，新品期没有否词库兜底，会被扩出大量无关搜索词'); }
            if (pts >= 0.999) return { ok: true, msg: '3 个精准长尾词 + 精准匹配 + bid 压在 $0.84 划算线以内，这支活动可以起跑了。' };
            return { ok: true, level: 'warn', pts: pts, msg: note.join('；') + '。' };
          },
          why: '新品期的出价上限是「划算线」，不是「建议竞价」。0 评论的阶段用宽泛匹配，等于把预算交给系统的猜词能力。'
        }
      ]
    },

    /* ══════════ 场景 2 · Search terms 报告否词 ══════════ */
    {
      id: 'negate', icon: '🚫', tag: '广告', title: 'Search terms 报告 · 否词',
      goal: '在 Search terms 页逐行判断：点杀（精准否定）、群封（词组否定）、移入精准组，还是不动。',
      brief: '活动跑了 7 天，花费 $71.30，销售额 $186.40。判定门槛：点击 ≥ 20 或花费 ≥ $15 且 0 订单 → 处理；有单且 ACOS < 35%（毛利率）→ 不动。',
      data: [['活动花费', '$71.30'], ['销售额', '$186.40'], ['ACOS', '38.3%'], ['毛利率', '35%'], ['否词门槛', '点击≥20 或 花费≥$15 且 0 单']],
      steps: [
        {
          id: 's0', nav: 'advertising',
          page: 'Campaign Manager', crumb: ['Advertising', 'Campaign Manager', 'Search terms'],
          coach: '切到 Search terms 标签页，勾选要处理的搜索词，选一个操作，点「应用到已选」',
          tabs: { items: AD_TABS, active: 4 },
          kpi: [['Impressions', '42,180'], ['Clicks', '128'], ['Spend', '$71.30'], ['Sales', '$186.40'], ['ACOS', '38.3%']],
          body: {
            t: 'st',
            cols: ['Customer search term', 'Match type', 'Clicks', 'Spend', 'Sales', 'Orders', 'ACOS'],
            rows: [
              { k: 'earbuds for running', cells: ['earbuds for running', 'Broad', '32', '$18.60', '$0.00', '0', '—'], ans: 'exact',
                note: '具体长尾、0 单、点击 32 ≥ 20' },
              { k: 'cheap earbuds', cells: ['cheap earbuds', 'Broad', '28', '$15.20', '$0.00', '0', '—'], ans: 'phrase',
                note: 'cheap 是价格导向词根，会继续扩到 cheap xxx' },
              { k: 'wireless earbuds small ears', cells: ['wireless earbuds small ears', 'Exact', '22', '$12.40', '$39.99', '1', '28%'], ans: 'none',
                note: '有单且 ACOS 28% < 毛利 35%' },
              { k: 'earbuds', cells: ['earbuds', 'Broad', '45', '$9.10', '$0.00', '0', '—'], ans: 'exact',
                note: '裸词要「点杀」：词组否会把自己的成交词一起封死' },
              { k: 'bluetooth earbuds small ear tips', cells: ['bluetooth earbuds small ear tips', 'Exact', '18', '$5.00', '$79.98', '2', '19%'], ans: 'none',
                note: '2 单、ACOS 19%，最好的词' },
              { k: 'phone case', cells: ['phone case', 'Broad', '21', '$1.20', '$0.00', '0', '—'], ans: 'exact',
                note: '完全不相关，直接否掉' },
              { k: 'wireless earbuds', cells: ['wireless earbuds', 'Phrase', '60', '$48.00', '$119.97', '3', '62%'], ans: 'move',
                note: '有单但 ACOS 62% 远超毛利 35%，不能否、要剥离成精准单独控价' }
            ],
            acts: [
              { v: 'exact', label: 'Negative exact（精准否定）' },
              { v: 'phrase', label: 'Negative phrase（词组否定）' },
              { v: 'move', label: 'Move to exact group（移入精准组）' }
            ]
          },
          check: function (v) {
            const rows = SC_BY('negate').steps[0].body.rows;
            const ap = v.applied || {};
            const done = rows.filter(function (r) { return ap[r.k] || r.ans === 'none'; });
            if (done.length < rows.length) {
              return { ok: false, level: 'bad', msg: '还有 ' + (rows.length - done.length) + ' 行没处理。每一行都要给结论——包括判断为「不动」的行，不处理也请在操作里明确。' };
            }
            const wrong = rows.filter(function (r) { return (ap[r.k] || 'none') !== r.ans; });
            if (!wrong.length) return { ok: true, msg: '7 行全部判对：该点杀的没群封，该保的没误杀。' };
            const detail = wrong.slice(0, 3).map(function (r) {
              return '「' + r.k + '」你选 ' + ACT_CN(ap[r.k] || 'none') + '，应为' + ACT_CN(r.ans) + '（' + r.note + '）';
            }).join('；');
            const pts = wrong.length === 1 ? 0.6 : wrong.length === 2 ? 0.4 : 0.2;
            return { ok: true, level: 'warn', pts: pts, msg: '有 ' + wrong.length + ' 行判偏：' + detail + '。' };
          },
          why: '否词的三分法：具体长尾 0 单 → 精准否定（点杀，只否这一个词）；泛词根正在扩散 → 词组否定（群封）；有单但 ACOS 超标 → 移入精准组（保住转化、单独控价）。裸词 earbuds 只能点杀——一旦词组否，你自己的成交词会被一起屏蔽。'
        },
        {
          id: 's1', nav: 'advertising',
          page: 'Keywords · Bid adjustment', crumb: ['Advertising', 'Campaign Manager', 'Keywords'],
          coach: '按每个词近 14 天的 ACOS 调整 bid：低于毛利线可加价，超标要降价',
          tabs: { items: AD_TABS, active: 2 },
          kpi: [['Clicks', '128'], ['Spend', '$71.30'], ['Sales', '$186.40'], ['ACOS', '38.3%'], ['目标 ACOS', '≤ 35%']],
          body: {
            t: 'bid',
            cols: ['Keyword', 'Match', 'Orders', 'ACOS', 'Current bid', 'New bid'],
            rows: [
              { k: 'wireless earbuds small ears', m: 'Exact', orders: '1', acos: '28%', cur: '0.72', lo: 0.78, hi: 0.92, tip: 'ACOS 28% < 毛利 35%，还有加价空间，往上提 10–25% 抢更多曝光' },
              { k: 'bluetooth earbuds small ear tips', m: 'Exact', orders: '2', acos: '19%', cur: '0.61', lo: 0.55, hi: 0.70, tip: 'ACOS 19% 很健康，保持或微调，别追高' },
              { k: 'wireless earbuds', m: 'Exact', orders: '3', acos: '62%', cur: '1.20', lo: 0.72, hi: 0.90, tip: 'ACOS 62% 远超毛利，bid 必须降到划算线附近' }
            ]
          },
          check: function (v) {
            const rows = SC_BY('negate').steps[1].body.rows;
            const bid = v.bid || {};
            const empty = rows.filter(function (r) { return !String(bid[r.k] || '').trim(); });
            if (empty.length) return { ok: false, level: 'bad', msg: '有 ' + empty.length + ' 个词没填新 bid。' };
            const bad = rows.filter(function (r) { const b = num(bid[r.k]); return b < r.lo || b > r.hi; });
            if (!bad.length) return { ok: true, msg: '三个词的 bid 都落在合理区间：健康的加价、超标的压回划算线。' };
            const detail = bad.map(function (r) {
              return '「' + r.k + '」填了 $' + num(bid[r.k]) + '，合理区间 $' + r.lo.toFixed(2) + '–$' + r.hi.toFixed(2) + '（' + r.tip + '）';
            }).join('；');
            return { ok: true, level: 'warn', pts: bad.length === 1 ? 0.6 : 0.3, msg: detail + '。' };
          },
          why: '调 bid 只有一个锚：毛利率。ACOS 明显低于毛利 → 有加价空间（但仍受 $0.84 划算线约束）；接近毛利 → 保持；超过毛利 → 先降价再谈优化。'
        }
      ]
    },

    /* ══════════ 场景 3 · Listing 标题改写 ══════════ */
    {
      id: 'listing', icon: '✏️', tag: 'Listing', title: 'Listing 标题改写 + 实时防雷',
      goal: '把一条满是雷的草稿标题改成可提交的版本，违规处会即时飘红。',
      brief: '这条草稿标题里有禁用符号、绝对化用语、功效声明和他人品牌词。改到 7 条规则全绿才能提交。',
      data: [['字符上限', '≤ 200'], ['禁用符号', '! $ ? _ { } ^ ¬ ¦ ~'], ['核心词位置', '前 80 字符'], ['重复上限', 'earbuds ≤ 2 次'], ['主图规格', '≥ 1000px，纯白底']],
      steps: [
        {
          id: 's0', nav: 'catalog',
          page: 'Edit listing · Title', crumb: ['Catalog', 'Manage Inventory', 'B0CXXXX1', 'Edit'],
          coach: '修改标题，让右侧 7 条规则全部变绿后保存',
          body: {
            t: 'title',
            draft: '【2026 New】Wireless Earbuds, Bluetooth 5.3 Headphones with 48H Playtime! Best Sound_IPX7 Waterproof, Anti-bacteria Earbuds for Small Ears, Owala Style, Compatible with iPhone, Black',
            def: '【2026 New】Wireless Earbuds, Bluetooth 5.3 Headphones with 48H Playtime! Best Sound_IPX7 Waterproof, Anti-bacteria Earbuds for Small Ears, Owala Style, Compatible with iPhone, Black'
          },
          check: function (v) {
            const s = String(v.title || '').trim();
            if (s.length < 20) return { ok: false, level: 'bad', msg: '太短了：标题至少要讲清「是什么 + 给谁用 + 关键参数」。' };
            const rs = titleCheck(s);
            const bad = rs.filter(function (r) { return !r.ok; });
            if (!bad.length) return { ok: true, msg: '7 条规则全过：' + s.length + ' 字符，可以提交。' };
            const why = {
              len: '超过 200 字符会被截断，移动端只显示前 70 字符左右',
              sym: '特殊符号会触发合规审核，部分字符直接被系统过滤',
              abs: '「best / #1 / 100%」属夸大宣传，可能被判 listing suppressed（变狗）',
              med: '耳机写抗菌/医疗功效属未经认证声明，会连带触发合规审核',
              brand: '写别人品牌词（Owala 等）会招来侵权投诉，严重时账号受限',
              pos: '核心词不在前 80 字符，移动端首屏看不到，相关性也会掉',
              dup: '同一词堆 3 次以上会被判关键词滥用，反而降权'
            };
            return {
              ok: false, level: 'bad',
              msg: '还有 ' + bad.length + ' 条没过：' + bad.map(function (r) { return r.label + '（' + why[r.k] + '）'; }).join('；')
            };
          },
          why: '标题的第一责任是「合规」，第二才是「埋词」。禁用符号 → 审核；绝对化用语/功效声明 → 抑制或下架；他人品牌词 → 侵权。三者任一命中，前面所有运营动作都白做。'
        },
        {
          id: 's1', nav: 'catalog',
          page: 'Edit listing · Images', crumb: ['Catalog', 'Manage Inventory', 'B0CXXXX1', 'Edit', 'Images'],
          coach: '设置主图规格——主图错了，点击率会先崩',
          body: {
            t: 'form',
            above: '<div class="sc-slots">' + [1, 2, 3, 4, 5, 6, 7].map(function (i) {
              return '<div class="sc-slot' + (i === 1 ? ' main' : '') + '"><span>' + (i === 1 ? 'MAIN' : i) + '</span></div>';
            }).join('') + '</div>',
            fields: [
              {
                k: 'bg', label: '主图背景', kind: 'select', opts: [
                  { v: 'white', label: '纯白 RGB(255,255,255)' },
                  { v: 'scene', label: '浅灰场景背景' },
                  { v: 'badge', label: '带促销文字角标' }
                ]
              },
              {
                k: 'size', label: '主图长边', kind: 'select', opts: [
                  { v: '1000', label: '1000 px' }, { v: '1600', label: '1600 px' }, { v: '2000', label: '2000 px' }
                ]
              },
              {
                k: 'wm', label: '主图是否加 logo / 水印', kind: 'select', opts: [
                  { v: 'no', label: '不加' }, { v: 'yes', label: '加在角落' }
                ]
              }
            ],
            live: function (v) {
              const p = [];
              if (v.bg && v.bg !== 'white') p.push('主图必须纯白底，否则不符合主图规范');
              if (v.size === '1000') p.push('1000px 只是最低线，不到 1600px 不触发放大镜');
              if (v.wm === 'yes') p.push('主图禁止任何 logo / 水印 / 文字');
              return p.length ? '<div class="sc-live-row s-bad">' + p.join('；') + '</div>'
                : '<div class="sc-live-row s-ok">主图规格符合要求</div>';
            }
          },
          check: function (v) {
            const bad = [];
            if (v.bg !== 'white') bad.push('主图背景必须是纯白 RGB(255,255,255)，场景图/角标会被判违规');
            if (v.size !== '1600') bad.push(v.size === '1000' ? '1000px 只是最低要求，长边 ≥ 1600px 才触发放大镜（移动端转化差别很明显）' : '2000px 体积太大，移动端首屏加载会拖慢');
            if (v.wm === 'yes') bad.push('主图禁止 logo / 水印 / 促销文字');
            if (!bad.length) return { ok: true, msg: '纯白底 + 1600px + 无水印：符合主图规范，也兼顾了移动端加载。' };
            return { ok: true, level: 'warn', pts: bad.length === 1 ? 0.6 : 0.3, msg: bad.join('；') + '。' };
          },
          why: '主图三件事：纯白底（合规）、长边 ≥ 1600px（触发放大镜）、无水印文字（合规）。规格错了，再好的标题也换不来点击。'
        }
      ]
    },

    /* ══════════ 场景 4 · FBA 补货 ══════════ */
    {
      id: 'restock', icon: '📦', tag: '库存', title: 'FBA 补货与库容',
      goal: '从 Manage All Inventory 进 Send/Replenish，按日均与周期算出该发多少，再处理 IPI 限仓。',
      brief: '主推 SKU 可售 420、在途 300，近 30 天卖 1,020 件。采购 + 头程 25 天，安全库存 14 天，海运 35 天到仓。',
      data: [['近 30 天销量', '1,020 件'], ['当前可售', '420 件'], ['在途', '300 件'], ['采购 + 头程', '25 天'], ['安全库存', '14 天'], ['海运到仓', '35 天'], ['空运到仓', '7 天']],
      steps: [
        {
          id: 's0', ns: true, nav: 'inventory',
          page: 'Manage All Inventory', crumb: ['Inventory', 'Manage All Inventory'],
          coach: '在 Manage All Inventory 找到主推 SKU，点 Send/Replenish 进入补货',
          primary: [{ t: 'Send / Replenish', act: 'uis-next', lg: true }],
          body: {
            t: 'table', noCk: true,
            cols: ['SKU', 'ASIN', 'Fulfillable', 'Inbound', 'Units sold (30d)', 'Avg / day', 'Age', 'Status'],
            rows: [
              { k: 'a', cells: ['SKU-EW-BLK', 'B0CXXXX1', '420', '300', '1,020', '34.0', '62 天', '<span class="sc-pill on">Active</span>'] },
              { k: 'b', cells: ['SKU-EW-WHT', 'B0CXXXX2', '96', '0', '310', '10.3', '118 天', '<span class="sc-pill warn">Low stock</span>'] },
              { k: 'c', cells: ['SKU-EW-CASE', 'B0CXXXX3', '1,240', '0', '60', '2.0', '245 天', '<span class="sc-pill bad">Aged</span>'] }
            ]
          },
          below: {
            h: 'Send / Replenish · SKU-EW-BLK',
            p: '可售 420 + 在途 300，合计 720 件；按日均 34 件只够 21 天，而海运要 35 天。',
            btn: 'Send / Replenish'
          },
          why: '补货入口在 Inventory → Manage All Inventory → Send/Replenish，判断依据是「可售天数 vs 到仓天数」，不是「卖得好就多备」。'
        },
        {
          id: 's1', nav: 'inventory',
          page: 'Send / Replenish', crumb: ['Inventory', 'Manage All Inventory', 'Send / Replenish'],
          coach: '算出日均与本次发货量，并选运输方式组合',
          body: {
            t: 'form',
            above: '<div class="sc-note"><b>SKU-EW-BLK</b> · 可售 420 · 在途 300 · 近 30 天 1,020 件 · 采购+头程 25 天 · 安全库存 14 天</div>',
            fields: [
              { k: 'daily', label: '日均销量', kind: 'num', unit: '件', ph: '0', hint: '用近 30 天口径，别用 90 天' },
              { k: 'qty', label: '发货数量', kind: 'num', unit: '件', ph: '0', hint: '日均 ×（采购+头程+安全天数）+ 安全库存 −（可售+在途）' },
              {
                k: 'ship', label: '运输方式', kind: 'select', opts: [
                  { v: 'sea', label: '全部海运（35 天到仓）' },
                  { v: 'air', label: '全部空运（7 天到仓，成本约 4 倍）' },
                  { v: 'mix', label: '空运小批 + 海运大批' }
                ]
              }
            ],
            live: function (v) {
              const d = num(v.daily);
              if (!d) return '';
              const cover = Math.floor(720 / d);
              return '<div class="sc-live-row">按日均 ' + r1(d) + ' 件：现有 720 件可售 <b>' + cover + ' 天</b>'
                + (cover < 35 ? ' · <span class="s-bad">少于海运 35 天，全走海运必断货</span>' : '') + '</div>';
            }
          },
          check: function (v) {
            const d = num(v.daily), q = num(v.qty), s = v.ship;
            if (!d || !q) return { ok: false, level: 'bad', msg: '日均和发货量都要填。' };
            if (Math.abs(d - 34) > 0.6) return { ok: false, level: 'bad', msg: '日均口径不对：1,020 ÷ 30 天 = 34 件/天。用 90 天口径或含退货会把日均算低，直接导致补货不足。' };
            const target = 34 * (25 + 14) + 476 - 720;
            if (Math.abs(q - target) > target * 0.03) {
              return {
                ok: false, level: 'bad',
                msg: '发货量按公式 = 34 ×（25 + 14）+ 476 −（420 + 300）= 34×39 + 476 − 720 = 1,082 件。你填的是 ' + q + ' 件（' + (q > target ? '多发了，会压库存' : '发少了，海运到仓前必断货') + '）。'
              };
            }
            if (s !== 'mix') {
              return { ok: true, level: 'warn', pts: s === 'sea' ? 0.4 : 0.5, msg: s === 'sea' ? '数量算对了，但全走海运 35 天到仓，而可售只剩 21 天——中间 14 天断货，排名会掉。' : '全走空运能接上货架，但 4 倍运费会把这一批的毛利吃光。' };
            }
            return { ok: true, msg: '1,082 件 + 空运小批接货架 + 海运大批补成本：既不亏运费也不掉排名。' };
          },
          why: '补货量 = 日均 ×（采购 + 头程 + 安全天数）+ 安全库存 −（可售 + 在途）。少减在途会超发压货，少算安全库存会断货。运输方式看的是「可售天数 vs 到仓天数」，不是运费单价。'
        },
        {
          id: 's2', nav: 'inventory',
          page: 'Inventory Performance · IPI', crumb: ['Inventory', 'Inventory Planning', 'Performance'],
          coach: 'IPI 380 已经低于 400 限仓线，勾选能真正把分数拉回来的动作',
          body: {
            t: 'form',
            above: '<div class="sc-ipi"><div class="sc-ipi-n"><b>380</b><span>/ 400 限仓线</span></div>'
              + '<div class="sc-ipi-t">IPI 低于 400，下个季度库容会被砍到当前用量的 60%。<br>四项指标：冗余库存 / 售出率 / 无在售信息库存 / 有库存售出率。</div></div>'
              + '<div class="sc-note">库龄结构：0–90 天 62% · 91–180 天 18% · 181–270 天 15% · 271 天以上 5%（SKU-EW-CASE 已 245 天）</div>',
            fields: [
              {
                k: 'act', label: '选择动作（可多选）', kind: 'checks', full: true,
                opts: [
                  { v: 'clear', label: '清滞销：对 SKU-EW-CASE 做降价 + Outlet 清货', hint: '直接压冗余库存占比' },
                  { v: 'sell', label: '提售出率：主推款上 Coupon / 秒杀，把周转天数压下来', hint: '售出率是 IPI 权重最大的一项' },
                  { v: 'fix', label: '修复无在售信息的库存（补 listing / 转 FBM）', hint: '这项是纯扣分项，修好立刻回分' },
                  { v: 'raise', label: '全线涨价 10% 保利润', hint: '涨价会降售出率，越涨分数越低' },
                  { v: 'shipmore', label: '按原计划继续大量发货', hint: '限仓期硬发会被拒收，还会加重冗余' },
                  { v: 'wait', label: '什么都不做，等下一个考核周期', hint: 'IPI 每周更新，不动就一直是 380' }
                ]
              }
            ]
          },
          check: function (v) {
            const a = Array.isArray(v.act) ? v.act : [];
            if (!a.length) return { ok: false, level: 'bad', msg: '至少选一项动作。' };
            const right = ['clear', 'sell', 'fix'];
            const miss = right.filter(function (x) { return a.indexOf(x) < 0; });
            const extra = a.filter(function (x) { return right.indexOf(x) < 0; });
            if (!miss.length && !extra.length) return { ok: true, msg: '清滞销 + 提售出率 + 修复无在售信息：三项正好对应 IPI 的三个扣分口。' };
            const p = [];
            if (miss.length) p.push('漏了 ' + miss.map(function (x) { return CHECK_CN(x); }).join('、'));
            if (extra.length) p.push('多选了 ' + extra.map(function (x) { return CHECK_CN(x); }).join('、') + '（只会让 IPI 更低或被拒收）');
            return { ok: true, level: 'warn', pts: extra.length ? 0.35 : 0.6, msg: p.join('；') + '。' };
          },
          why: 'IPI 不是「卖得多就高」，而是看冗余、售出率、无在售信息、有库存售出率四项。限仓时正确动作是清滞销 + 提售出率 + 修 listing，硬发只会被拒收。'
        }
      ]
    },

    /* ══════════ 场景 5 · 差评处理 ══════════ */
    {
      id: 'review', icon: '⭐', tag: '绩效', title: '1 星差评处理',
      goal: '判断这条差评该走哪条路径（合规联系 / 举报 / 供应链），再写一封不违规的买家消息。',
      brief: '一条 1 星差评：「用了两周就漏水，质量太差」，Verified Purchase。店铺评分从 4.5 掉到 4.3。',
      data: [['当前评分', '4.3（42 条）'], ['差评类型', '产品质量'], ['是否 Verified', '是'], ['毛利率', '35%'], ['客单价', '$39.99']],
      steps: [
        {
          id: 's0', nav: 'performance',
          page: 'Voice of the Customer', crumb: ['Performance', 'Voice of the Customer', 'Reviews'],
          coach: '先判断这条差评的性质，再勾选处理动作（可多选）',
          body: {
            t: 'form',
            above: '<div class="sc-review">'
              + '<div class="sc-rv-top"><span class="sc-stars">★☆☆☆☆</span><b>1.0</b><span class="sc-rv-meta">Verified Purchase · 2026-10-18 · B0CXXXX1</span></div>'
              + '<p class="sc-rv-t">用了两周就漏水，质量太差</p>'
              + '<div class="sc-rv-sub">By J***n · 该买家历史评价 12 条，无异常</div>'
              + '</div>'
              + '<div class="sc-note"><b>判断要点：</b>漏水属于产品缺陷，不是恶意攻击；买家没有提出威胁、没有索要补偿。</div>',
            fields: [
              {
                k: 'act', label: '处理动作（可多选）', kind: 'checks', full: true,
                opts: [
                  { v: 'refund', label: '通过 Buyer-Seller Messaging 合规联系买家：退款或补发', hint: '产品缺陷的标准动作' },
                  { v: 'supply', label: '开质量问题工单，反馈供应链/质检（含供应商索赔）', hint: '防下一批再漏' },
                  { v: 'abuse', label: '以「恶意差评」提交品牌保护举报', hint: '需要证据；这条没有任何恶意迹象' },
                  { v: 'reply', label: '在评论区公开回复，质疑买家的使用方法', hint: '公开争辩会被判不当沟通' },
                  { v: 'delete', label: '开 Case 要求亚马逊删除这条差评', hint: '产品缺陷属真实体验，不会删' },
                  { v: 'brush', label: '安排朋友下单刷好评对冲', hint: '操纵评论＝账号级违规' }
                ]
              }
            ]
          },
          check: function (v) {
            const a = Array.isArray(v.act) ? v.act : [];
            if (!a.length) return { ok: false, level: 'bad', msg: '至少选一项动作。' };
            const right = ['refund', 'supply'];
            const miss = right.filter(function (x) { return a.indexOf(x) < 0; });
            const extra = a.filter(function (x) { return right.indexOf(x) < 0; });
            if (!miss.length && !extra.length) return { ok: true, msg: '退款/补发 + 供应链反馈：一条修客户、一条修产品，这是产品缺陷差评的标准双线。' };
            const p = [];
            if (extra.length) {
              p.push('「' + extra.map(function (x) { return ACT_CN2(x); }).join('、') + '」属于高风险动作'
                + (extra.indexOf('brush') > -1 ? '，操纵评论是账号级违规' : extra.indexOf('abuse') > -1 ? '，没有恶意证据的举报会被驳回，还可能反过来影响账号' : extra.indexOf('delete') > -1 ? '，产品缺陷是真实体验，亚马逊不会删' : '，公开争辩会被判不当沟通'));
            }
            if (miss.length) p.push('漏了「' + miss.map(function (x) { return ACT_CN2(x); }).join('、') + '」，客户和产品两头都没修');
            return { ok: true, level: 'warn', pts: extra.length ? 0.3 : 0.6, msg: p.join('；') + '。' };
          },
          why: '差评分三类：产品缺陷（退款/补发 + 供应链）、物流问题（联系买家 + 换承运商）、恶意/违规评论（品牌保护举报）。判断错类型，动作全错。'
        },
        {
          id: 's1', nav: 'performance',
          page: 'Buyer-Seller Messages · New message', crumb: ['Performance', 'Buyer-Seller Messages', 'Compose'],
          coach: '给买家写一条合规的处理消息：道歉 + 方案 + 时效，且绝对不能提评价',
          body: {
            t: 'form',
            above: '<div class="sc-note"><b>收件人：</b>J***n · 订单 112-XXXXXXX-1234567 · <b>渠道：</b>Buyer-Seller Messaging（站内信，平台留痕）</div>',
            aside: true,
            fields: [
              { k: 'subject', label: 'Subject', kind: 'text', ph: 'Regarding your order 112-XXXXXXX', full: true },
              { k: 'body', label: 'Message', kind: 'textarea', rows: 6, full: true, ph: '在这里写给买家…' }
            ],
            live: function (v) {
              const t = String(v.body || '') + ' ' + String(v.subject || '');
              const chk = [
                { ok: /抱歉|对不起|很遗憾|理解|sorry/i.test(t), t: '先致歉并表达共情' },
                { ok: /退款|补发|换新|refund|replace|replacement/i.test(t), t: '给出明确方案（退款 / 补发）' },
                { ok: /24 ?小时|48 ?小时|尽快|today|尽快处理|今天/i.test(t), t: '给出处理时效' },
                { ok: !/好评|五星|5 ?星|review|评价|删评|改评/i.test(t), t: '不提评价、不以补偿换好评' }
              ];
              return '<div class="sc-chk-h">消息合规检查（实时）</div><ul class="sc-chk">' + chk.map(function (c) {
                return '<li class="' + (c.ok ? 'ok' : '') + '"><i>' + (c.ok ? '✓' : '○') + '</i>' + c.t + '</li>';
              }).join('') + '</ul>';
            }
          },
          check: function (v) {
            const t = (String(v.body || '') + ' ' + String(v.subject || '')).trim();
            if (t.replace(/\s/g, '').length < 20) return { ok: false, level: 'bad', msg: '正文太短，至少要说明「抱歉 + 方案 + 时效」。' };
            const taboo = /好评|五星|5 ?星|删评|改评|review/i.test(t);
            if (taboo) return { ok: false, level: 'bad', msg: '消息里出现「好评 / 五星 / 删评 / review」——以补偿换评价属于操纵评论，是账号级违规，可能直接封店。删掉这句再发。' };
            const chk = [
              { ok: /抱歉|对不起|很遗憾|理解|sorry/i.test(t), t: '先致歉并表达共情' },
              { ok: /退款|补发|换新|refund|replace|replacement/i.test(t), t: '给出明确方案（退款 / 补发）' },
              { ok: /24 ?小时|48 ?小时|尽快|today|今天/i.test(t), t: '给出处理时效' }
            ];
            const miss = chk.filter(function (c) { return !c.ok; });
            if (!miss.length) return { ok: true, msg: '致歉 + 方案 + 时效齐全，且没有提评价：这封消息可以直接发。' };
            return { ok: true, level: 'warn', pts: miss.length === 1 ? 0.65 : 0.4, msg: '还缺：' + miss.map(function (c) { return c.t; }).join('、') + '。' };
          },
          why: '站内信是唯一合规的买家沟通渠道，且平台全程留痕。内容三件套：致歉、方案、时效。任何「好评换补偿」的表述都是操纵评论——这是最容易被忽视、后果最重的一条红线。'
        }
      ]
    },

    /* ══════════ 场景 6 · Coupon 与秒杀 ══════════ */
    {
      id: 'coupon', icon: '🎟️', tag: '促销', title: 'Coupon 与秒杀配置',
      goal: '按亚马逊的硬门槛配一次 Coupon，再给 Prime Day Deal 报一个能过审的价格。',
      brief: '主推款 $39.99、毛利率 35%。Coupon 折扣低于 5% 系统直接拒绝；Deal 要求至少 20% off，且不得高于近 30 天最低价。',
      data: [['售价', '$39.99'], ['毛利率', '35%'], ['成本', '$11.99'], ['30 天最低价', '$35.99'], ['Coupon 门槛', '≥ 5%'], ['Deal 门槛', '≥ 20% off']],
      steps: [
        {
          id: 's0', ns: true, nav: 'advertising',
          page: 'Coupons', crumb: ['Advertising', 'Coupons'],
          coach: '进入 Coupons 页，点 Create coupon 新建一张',
          primary: [{ t: 'Create coupon', act: 'uis-next', lg: true }],
          body: {
            t: 'table', noCk: true,
            cols: ['Coupon name', 'Discount', 'Budget', 'Clipped', 'Redeemed', 'Status'],
            rows: [{ k: 'c1', cells: ['EW-BLK-5off-0920', '5%', '$120.00', '86', '21', '<span class="sc-pill off">Ended</span>'] }]
          },
          below: { h: 'Create a coupon', p: 'Coupon 会出现在搜索结果页的绿色标签上，直接影响点击率。折扣力度和预算都要按毛利算。', btn: 'Create coupon' }
        },
        {
          id: 's1', nav: 'advertising',
          page: 'Create coupon', crumb: ['Advertising', 'Coupons', 'Create coupon'],
          coach: '填写折扣与预算：低于 5% 会被系统直接拦下，预算太低会瞬间烧完',
          body: {
            t: 'form',
            above: '<div class="sc-note"><b>成本结构：</b>售价 $39.99 · 毛利 35%（单件毛利 $14.00）· 折扣超过 35% 即单件亏钱</div>',
            fields: [
              { k: 'ct', label: 'Discount type', kind: 'select', def: 'pct', opts: [
                { v: 'pct', label: 'Percentage off（百分比折扣）' }, { v: 'amt', label: 'Amount off（固定金额折扣）' }
              ] },
              { k: 'pct', label: 'Discount', kind: 'num', unit: '%', ph: '0', hint: '亚马逊硬门槛：≥ 5%' },
              { k: 'budget', label: 'Budget', kind: 'num', unit: '$', ph: '0', full: true, hint: '按折扣额 × 预估单量估，别只填个起步价' },
              { k: 'start', label: 'Start date', kind: 'date', def: '2026-10-25' },
              { k: 'end', label: 'End date', kind: 'date', def: '2026-11-08' }
            ],
            live: function (v) {
              const p = num(v.pct), b = num(v.budget), d = days(String(v.start || ''), String(v.end || ''));
              const out = [];
              if (p && p < 5) out.push('<span class="s-bad">折扣 ' + p + '% 低于 5%，系统会直接报错，无法创建</span>');
              if (p > 35) out.push('<span class="s-bad">折扣 ' + p + '% 已超过毛利率 35%，每单亏 $' + (39.99 * p / 100 - 14).toFixed(2) + '</span>');
              if (p >= 5 && p <= 35) out.push('单件让利 $' + (39.99 * p / 100).toFixed(2) + '，单件仍剩毛利 $' + (14 - 39.99 * p / 100).toFixed(2));
              if (b && p) {
                const unit = 39.99 * p / 100;
                const n = Math.floor(b / unit);
                out.push('预算 ' + money(b) + ' ≈ ' + n + ' 单就会烧完' + (n < 15 ? '（<span class="s-bad">太少了，活动还没起量就结束</span>）' : ''));
              }
              if (d > 0) out.push('活动时长 ' + d + ' 天' + (d > 90 ? '（<span class="s-bad">超过 90 天上限</span>）' : ''));
              return out.length ? '<div class="sc-live-row">' + out.join(' · ') + '</div>' : '';
            }
          },
          check: function (v) {
            const p = num(v.pct), b = num(v.budget);
            const d = days(String(v.start || ''), String(v.end || ''));
            if (!p) return { ok: false, level: 'bad', msg: '折扣力度必须填。' };
            if (p < 5) return { ok: false, level: 'bad', msg: '亚马逊要求 Coupon 折扣至少 5%，' + p + '% 会被系统直接拒绝创建。' };
            if (p > 90) return { ok: false, level: 'bad', msg: '折扣不能超过 90%。' };
            if (!b) return { ok: false, level: 'bad', msg: '预算必须填，否则无法上线。' };
            if (d <= 0) return { ok: false, level: 'bad', msg: '结束日期必须晚于开始日期。' };
            if (d > 90) return { ok: false, level: 'bad', msg: '活动时长 ' + d + ' 天，超过 90 天上限，保存会报错。' };
            const note = []; let pts = 1;
            if (p > 35) { pts = 0.35; note.push('折扣 ' + p + '% 超过毛利率 35%，每单亏 $' + (39.99 * p / 100 - 14).toFixed(2)); }
            else if (p > 28) { pts = 0.7; note.push('折扣 ' + p + '% 把毛利压到 $' + (14 - 39.99 * p / 100).toFixed(2) + '，只适合清库存'); }
            else if (p < 8) { pts = 0.6; note.push('折扣 ' + p + '% 只让利 $' + (39.99 * p / 100).toFixed(2) + '，买家感知不到，撬不动点击'); }
            const unit = 39.99 * p / 100;
            const n = Math.floor(b / unit);
            if (n < 15) { pts = Math.min(pts, 0.55); note.push('预算 ' + money(b) + ' 只够 ' + n + ' 单就烧完，跑不出效果'); }
            if (d > 30) { pts = Math.min(pts, 0.8); note.push('时长 ' + d + ' 天偏长，新品期建议 2 周一轮'); }
            if (pts >= 0.999) return { ok: true, msg: '折扣 ' + p + '%（让利 $' + unit.toFixed(2) + '）+ 预算 ' + money(b) + ' + ' + d + ' 天：在毛利线以内，预算也够跑出数据。' };
            return { ok: true, level: 'warn', pts: pts, msg: note.join('；') + '。' };
          },
          why: 'Coupon 三算：折扣 ≤ 毛利率（否则每单亏）、预算 ≥ 折扣额 × 目标单量（否则瞬间烧完）、时长 ≤ 90 天。5% 是亚马逊的硬门槛，不是建议值。'
        },
        {
          id: 's2', nav: 'advertising',
          page: 'Deals · Prime Day', crumb: ['Advertising', 'Deals', 'Prime Day'],
          coach: '报 Prime Day Deal：价格必须同时满足「≥ 20% off」和「不高于近 30 天最低价」',
          body: {
            t: 'form',
            above: '<div class="sc-note"><b>Deal 硬规则：</b>折扣 ≥ 20% · 报名价 ≤ 近 30 天最低价 $35.99 · 库存需覆盖预估单量</div>',
            fields: [
              { k: 'dt', label: 'Deal type', kind: 'select', def: 'pd', opts: [
                { v: 'pd', label: 'Prime Day Deal（4 天）' }, { v: 'ld', label: 'Lightning Deal（4 小时）' }, { v: 'sd', label: '7-Day Deal' }
              ] },
              { k: 'price', label: 'Deal price', kind: 'num', unit: '$', ph: '0.00', hint: '售价 $39.99，20% off = $31.99' },
              { k: 'stock', label: '报名库存', kind: 'num', unit: '件', ph: '0' },
              { k: 'stack', label: '是否与 Coupon 叠加', kind: 'select', opts: [
                { v: 'no', label: '不叠加' }, { v: 'yes', label: '叠加（Coupon 同时生效）' }
              ] }
            ],
            live: function (v) {
              const p = num(v.price);
              if (!p) return '';
              const off = (1 - p / 39.99) * 100;
              const out = ['折扣 ' + r1(off) + '%'];
              if (off < 20) out.push('<span class="s-bad">不足 20%，不符合 Deal 报名条件</span>');
              if (p > 35.99) out.push('<span class="s-bad">高于近 30 天最低价 $35.99，会被系统驳回</span>');
              if (p < 11.99) out.push('<span class="s-bad">低于成本 $11.99，卖一单亏一单</span>');
              return '<div class="sc-live-row">' + out.join(' · ') + '</div>';
            }
          },
          check: function (v) {
            const p = num(v.price), s = num(v.stock), st = v.stack;
            if (!p) return { ok: false, level: 'bad', msg: 'Deal 价必须填。' };
            const off = (1 - p / 39.99) * 100;
            if (off < 20) return { ok: false, level: 'bad', msg: 'Deal 价 $' + p.toFixed(2) + ' 只相当于 ' + r1(off) + '% off，Prime Day 要求至少 20%（即 ≤ $31.99），提交会被驳回。' };
            if (p > 35.99) return { ok: false, level: 'bad', msg: 'Deal 价不能高于近 30 天最低价 $35.99，这是防止「先涨价再打折」的规则。' };
            if (!s) return { ok: false, level: 'bad', msg: '报名库存必须填。' };
            const note = []; let pts = 1;
            if (s < 100) { pts = Math.min(pts, 0.55); note.push('库存 ' + s + ' 件撑不住 4 天 Deal（日均 34 件 × 4 ≈ 136 件），中途断货会被取消资格'); }
            if (p < 11.99) { pts = Math.min(pts, 0.3); note.push('Deal 价 $' + p.toFixed(2) + ' 已低于成本 $11.99'); }
            if (st === 'yes') { pts = Math.min(pts, 0.6); note.push('再叠加 Coupon 会二次击穿价格（' + (p * 0.9).toFixed(2) + ' 左右），要么提价、要么取消叠加'); }
            if (pts >= 0.999) return { ok: true, msg: 'Deal 价 $' + p.toFixed(2) + '（' + r1(off) + '% off）+ 库存 ' + s + ' 件 + 不叠加：符合报名条件，也不会亏。' };
            return { ok: true, level: 'warn', pts: pts, msg: note.join('；') + '。' };
          },
          why: 'Deal 的价格上限由两条线共同决定：20% 折扣线（$31.99）和近 30 天最低价（$35.99），取更低的那条。库存要覆盖 Deal 期间的日均销量，否则中途断货会被取消资格。'
        }
      ]
    }
  ];

  /* 循环引用取场景（用于 check 里读回同场景数据） */
  function SC_BY(id) {
    for (let i = 0; i < SCENES.length; i++) if (SCENES[i].id === id) return SCENES[i];
    return null;
  }

  const ACT_CN = function (v) {
    return ({ exact: '精准否定', phrase: '词组否定', move: '移入精准组', none: '不处理' })[v] || v;
  };
  const ACT_CN2 = function (v) {
    return ({
      refund: '合规联系买家退款/补发', supply: '反馈供应链', abuse: '按恶意差评举报',
      reply: '公开回复质疑买家', delete: '开 Case 要求删评', brush: '刷好评对冲'
    })[v] || v;
  };
  const CHECK_CN = function (v) {
    return ({
      clear: '清滞销', sell: '提售出率', fix: '修复无在售信息库存',
      raise: '全线涨价', shipmore: '继续大量发货', wait: '等下个周期'
    })[v] || v;
  };

  /* ============================================================
     3. 渲染：通用零件
     ============================================================ */
  function kpiBar(kpi) {
    if (!kpi) return '';
    return '<div class="sc-kpi">' + kpi.map(function (k) {
      return '<div class="sc-kpi-i"><span>' + esc(k[0]) + '</span><b>' + esc(k[1]) + '</b></div>';
    }).join('') + '</div>';
  }

  function tabBar(tabs) {
    if (!tabs) return '';
    return '<div class="sc-tabs">' + tabs.items.map(function (t, i) {
      return '<button class="sc-tab' + (i === tabs.active ? ' on' : '') + '" data-act="uis-tab" data-v="' + i + '">' + esc(t) + '</button>';
    }).join('') + '</div>';
  }

  function rail(active) {
    return '<aside class="sc-rail">'
      + '<div class="sc-brand"><b>amazon</b><span>seller central</span></div>'
      + '<div class="sc-store">店铺 <b>US</b> · 北美站</div>'
      + '<nav class="sc-nav">' + NAV.map(function (n) {
        return '<button class="sc-nav-i' + (n.id === active ? ' on' : '') + '" data-act="uis-nav" data-v="' + n.id + '">'
          + '<i>' + n.g + '</i><span><b>' + n.label + '</b><em>' + n.cn + '</em></span></button>';
      }).join('') + '</nav>'
      + '<div class="sc-rail-foot"><span class="sc-dot-live"></span>模拟环境 · 非真实账号</div>'
      + '</aside>';
  }

  function topBar() {
    return '<header class="sc-top">'
      + '<span class="sc-burger">☰</span>'
      + '<div class="sc-search"><i>⌕</i><input readonly value="" placeholder="Search Amazon Seller Central"></div>'
      + '<div class="sc-topr">'
      + '<span class="sc-toplink">Help</span>'
      + '<span class="sc-toplink">Settings</span>'
      + '<img class="sc-avatar" src="./assets/avatar.jpg" alt="账号头像" title="模拟账号">'
      + '</div></header>';
  }

  /* 表单控件 */
  function field(f, v, st) {
    const cls = 'sc-field' + (f.full || f.kind === 'cards' || f.kind === 'checks' ? ' sc-full' : '');
    let ctrl = '';
    if (f.kind === 'cards') {
      ctrl = '<div class="sc-cards">' + f.opts.map(function (o) {
        const on = v[f.k] === o.v;
        return '<button class="sc-card' + (on ? ' on' : '') + '" data-act="uis-set" data-f="' + f.k + '" data-v="' + o.v + '">'
          + '<span class="sc-radio"></span>'
          + '<span class="sc-card-b"><b>' + esc(o.label) + '</b><em>' + esc(o.desc) + '</em></span>'
          + (o.note ? '<span class="sc-card-n">' + esc(o.note) + '</span>' : '')
          + '</button>';
      }).join('') + '</div>';
    } else if (f.kind === 'checks') {
      const arr = Array.isArray(v[f.k]) ? v[f.k] : [];
      ctrl = '<div class="sc-checks">' + f.opts.map(function (o) {
        const on = arr.indexOf(o.v) > -1;
        return '<button class="sc-check' + (on ? ' on' : '') + '" data-act="uis-toggle" data-f="' + f.k + '" data-v="' + o.v + '">'
          + '<span class="sc-cbox"></span>'
          + '<span class="sc-check-b"><b>' + esc(o.label) + '</b>' + (o.hint ? '<em>' + esc(o.hint) + '</em>' : '') + '</span>'
          + '</button>';
      }).join('') + '</div>';
    } else if (f.kind === 'select') {
      const cur = v[f.k] == null ? '' : v[f.k];
      ctrl = '<select class="sc-input sc-select" data-uis-f="' + f.k + '">'
        + '<option value=""' + (cur === '' ? ' selected' : '') + '>请选择…</option>'
        + f.opts.map(function (o) {
          return '<option value="' + o.v + '"' + (cur === o.v ? ' selected' : '') + '>' + esc(o.label) + '</option>';
        }).join('') + '</select>';
    } else if (f.kind === 'textarea') {
      ctrl = '<textarea class="sc-input sc-ta" rows="' + (f.rows || 5) + '" data-uis-f="' + f.k + '" placeholder="' + esc(f.ph || '') + '">' + esc(v[f.k] || '') + '</textarea>';
    } else if (f.kind === 'date') {
      ctrl = '<input class="sc-input" type="date" data-uis-f="' + f.k + '" value="' + esc(v[f.k] == null ? (f.def || '') : v[f.k]) + '">';
    } else if (f.kind === 'num') {
      ctrl = '<span class="sc-iw">' + (f.unit === '$' ? '<i>$</i>' : '')
        + '<input class="sc-input" type="text" inputmode="decimal" data-uis-f="' + f.k + '" value="' + esc(v[f.k] == null ? '' : v[f.k]) + '" placeholder="' + esc(f.ph || '') + '">'
        + (f.unit && f.unit !== '$' ? '<i class="suf">' + esc(f.unit) + '</i>' : '') + '</span>';
    } else {
      ctrl = '<input class="sc-input" type="text" data-uis-f="' + f.k + '" value="' + esc(v[f.k] == null ? '' : v[f.k]) + '" placeholder="' + esc(f.ph || '') + '">';
    }
    return '<div class="' + cls + '"><label class="sc-flabel">' + esc(f.label) + '</label>'
      + ctrl + (f.hint ? '<div class="sc-fhint">' + esc(f.hint) + '</div>' : '') + '</div>';
  }

  function tableHead(cols, ck) {
    return '<tr>' + (ck ? '<th class="sc-ckc"><span class="sc-cbox all" data-act="uis-all"></span></th>' : '')
      + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr>';
  }

  /* ============================================================
     4. 渲染：各类 body
     ============================================================ */
  function bodyForm(step, v) {
    const hasAside = !!step.body.aside;
    return '<div class="sc-formwrap' + (hasAside ? ' many' : '') + '">'
      + '<div class="sc-form">' + step.body.fields.map(function (f) { return field(f, v, step); }).join('') + '</div>'
      + (hasAside ? '<aside class="sc-formside" id="uisLive">' + (step.body.live ? step.body.live(v) : '') + '</aside>'
        : (step.body.live ? '<div id="uisLive" class="sc-live">' + step.body.live(v) + '</div>' : ''))
      + '</div>';
  }

  function bodyTable(step, v) {
    const b = step.body;
    const rows = b.rows.map(function (r) {
      return '<tr>' + (b.noCk ? '' : '<td class="sc-ckc"><span class="sc-cbox"></span></td>')
        + r.cells.map(function (c, i) {
          return '<td' + (i === 0 ? ' class="sc-cell-k"' : '') + '>' + (i === 0 ? esc(c) : c) + '</td>';
        }).join('') + '</tr>';
    }).join('');
    return '<div class="sc-tbwrap"><table class="sc-tb"><thead>' + tableHead(b.cols, !b.noCk) + '</thead><tbody>' + rows + '</tbody></table></div>';
  }

  /* 搜索词报告：勾选 + 批量操作 / 行内操作 */
  function bodySt(step, v) {
    const b = step.body;
    const sel = Array.isArray(v.sel) ? v.sel : [];
    const ap = v.applied || {};
    const rows = b.rows.map(function (r) {
      const on = sel.indexOf(r.k) > -1;
      const applied = ap[r.k];
      const wrong = v.wrongMark && v.wrongMark[r.k];
      return '<tr class="' + (on ? 'on' : '') + (wrong ? ' bad' : '') + '">'
        + '<td class="sc-ckc"><span class="sc-cbox' + (on ? ' on' : '') + '" data-act="uis-sel" data-v="' + esc(r.k) + '"></span></td>'
        + r.cells.map(function (c, i) { return '<td' + (i === 0 ? ' class="sc-cell-k"' : '') + '>' + (i === 0 ? esc(c) : c) + '</td>'; }).join('')
        + '<td class="sc-actcell"><select class="sc-input sc-select sc-mini sc-act ' + (applied ? 'a-' + applied : '') + '" '
        + 'data-uis-f="rowact" data-k="' + esc(r.k) + '">'
        + '<option value="">操作…</option>'
        + b.acts.map(function (a) {
          return '<option value="' + a.v + '"' + (applied === a.v ? ' selected' : '') + '>' + ACT_CN(a.v) + '</option>';
        }).join('')
        + '</select></td>'
        + '</tr>';
    }).join('');
    const left = b.rows.length - b.rows.filter(function (r) { return ap[r.k] || r.ans === 'none'; }).length;
    return '<div class="sc-bulk">'
      + '<span class="sc-bulk-n">已选 <b>' + sel.length + '</b> 项 · 待处理 <b>' + left + '</b> 行</span>'
      + '<select class="sc-input sc-select sc-bulk-sel" data-uis-f="bulkact">'
      + '<option value="">选择操作…</option>'
      + b.acts.map(function (a) { return '<option value="' + a.v + '"' + (v.bulkact === a.v ? ' selected' : '') + '>' + esc(a.label) + '</option>'; }).join('')
      + '</select>'
      + '<button class="sc-btn-sec" data-act="uis-apply">应用到已选</button>'
      + '<span class="sc-bulk-tip">可以批量处理，也可以在右侧逐行选择</span>'
      + '</div>'
      + '<div class="sc-tbwrap"><table class="sc-tb sc-tb-st"><thead>' + tableHead(b.cols.concat(['操作']), true) + '</thead><tbody>' + rows + '</tbody></table></div>';
  }

  /* 建关键词：勾选 + 匹配方式 + bid */
  function bodyKw(step, v) {
    const b = step.body;
    const pick = v.pick || {}, match = v.match || {}, bid = v.bid || {};
    const rows = b.rows.map(function (r) {
      const on = !!pick[r.k];
      return '<tr class="' + (on ? 'on' : '') + '">'
        + '<td class="sc-ckc"><span class="sc-cbox' + (on ? ' on' : '') + '" data-act="uis-ck" data-k="' + esc(r.k) + '"></span></td>'
        + '<td class="sc-cell-k">' + esc(r.k) + '</td>'
        + '<td>' + r.vol + '</td><td>' + r.rel + '</td><td>$' + r.sug + '</td>'
        + '<td><select class="sc-input sc-select sc-mini" data-uis-f="match" data-k="' + esc(r.k) + '">'
        + [['exact', '精准 Exact'], ['phrase', '词组 Phrase'], ['broad', '宽泛 Broad']].map(function (m) {
          return '<option value="' + m[0] + '"' + ((match[r.k] || 'broad') === m[0] ? ' selected' : '') + '>' + m[1] + '</option>';
        }).join('') + '</select></td>'
        + '<td><span class="sc-iw sc-iw-s"><i>$</i><input class="sc-input" type="text" inputmode="decimal" data-uis-f="bid" data-k="' + esc(r.k) + '" value="' + esc(bid[r.k] == null ? '' : bid[r.k]) + '" placeholder="' + r.sug + '"></span></td>'
        + '</tr>';
    }).join('');
    return '<div class="sc-tbwrap"><table class="sc-tb sc-tb-kw"><thead>' + tableHead(b.cols, true) + '</thead><tbody>' + rows + '</tbody></table></div>'
      + '<div class="sc-tbhint">已选 ' + Object.keys(pick).filter(function (k) { return pick[k]; }).length + ' 个词 · ' + esc(b.hint || '') + '</div>';
  }

  /* 调 bid 表 */
  function bodyBid(step, v) {
    const b = step.body;
    const bid = v.bid || {};
    const rows = b.rows.map(function (r) {
      return '<tr>'
        + '<td class="sc-cell-k">' + esc(r.k) + '</td><td>' + r.m + '</td><td>' + r.orders + '</td>'
        + '<td class="' + (parseFloat(r.acos) > 35 ? 's-bad' : 's-ok') + '">' + r.acos + '</td>'
        + '<td>$' + r.cur + '</td>'
        + '<td><span class="sc-iw sc-iw-s"><i>$</i><input class="sc-input" type="text" inputmode="decimal" data-uis-f="bid" data-k="' + esc(r.k) + '" value="' + esc(bid[r.k] == null ? '' : bid[r.k]) + '" placeholder="' + r.cur + '"></span></td>'
        + '</tr>';
    }).join('');
    return '<div class="sc-tbwrap"><table class="sc-tb"><thead><tr>' + b.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>'
      + '<div class="sc-tbhint">参照：目标 ACOS ≤ 35%（毛利率）。低于目标可加价，高于目标必须降价。</div>';
  }

  /* 标题编辑器：输入框 + 实时飘红 + 规则清单 */
  function bodyTitle(step, v) {
    const b = step.body;
    const t = v.title == null ? b.def : v.title;
    const rs = titleCheck(t);
    return '<div class="ls-wrap">'
      + '<div class="ls-lbl"><span>Product title</span><span class="ls-count" id="lsCount">' + String(t).length + ' / 200</span></div>'
      + '<div class="ls-box">'
      + '<div class="ls-mir" id="lsMirror" aria-hidden="true">' + markTitle(t) + '</div>'
      + '<textarea class="ls-ta" id="lsTa" data-uis-f="title" spellcheck="false" maxlength="260">' + esc(t) + '</textarea>'
      + '</div>'
      + '<div class="ls-tip">输入时实时检测：违规词会立即标红，无需提交</div>'
      + '</div>'
      + '<div class="ls-rules" id="lsRules">' + rs.map(function (r) {
        return '<div class="ls-rule ' + (r.ok ? 'ok' : 'bad') + '" data-rule="' + r.k + '"><i>' + (r.ok ? '✓' : '!') + '</i><span>' + esc(r.label) + '</span></div>';
      }).join('') + '</div>';
  }

  function bodyCta(step) {
    const c = step.below;
    return '<div class="sc-empty">'
      + '<div class="sc-empty-ico">✦</div>'
      + '<h3>' + esc(c.h) + '</h3><p>' + esc(c.p) + '</p>'
      + '<button class="sc-btn-pri sc-btn-xl" data-act="uis-next">' + esc(c.btn) + '</button>'
      + '</div>';
  }

  function renderBody(step, v) {
    const t = step.body ? step.body.t : 'cta';
    let html = '';
    if (t === 'form') html = (step.body.above || '') + bodyForm(step, v);
    else if (t === 'table') html = bodyTable(step, v);
    else if (t === 'st') html = bodySt(step, v);
    else if (t === 'kw') html = bodyKw(step, v);
    else if (t === 'bid') html = bodyBid(step, v);
    else if (t === 'title') html = bodyTitle(step, v);
    if (step.below) html += bodyCta(step);
    return html;
  }

  /* ============================================================
     5. 渲染：整页
     ============================================================ */
  function findSc(id) {
    for (let i = 0; i < SCENES.length; i++) if (SCENES[i].id === id) return SCENES[i];
    return null;
  }
  function scoredMax(sc) { return sc.steps.filter(function (s) { return !s.ns; }).length; }

  function renderList(st) {
    const cards = SCENES.map(function (sc) {
      const best = st.done[sc.id];
      const max = scoredMax(sc);
      const badge = best === undefined
        ? '<span class="uis-badge">未开始</span>'
        : '<span class="uis-badge ' + (best >= max * 0.95 ? 'ok' : best >= max * 0.7 ? 'warn' : 'bad') + '">最好成绩 ' + r1(best) + ' / ' + max + '</span>';
      return '<button class="uis-card" data-act="uis-open" data-v="' + sc.id + '">'
        + '<span class="uis-card-top"><span class="uis-card-icon">' + sc.icon + '</span>'
        + '<span class="uis-tag">' + esc(sc.tag) + '</span></span>'
        + '<span class="uis-card-t">' + esc(sc.title) + '</span>'
        + '<span class="uis-card-d">' + esc(sc.goal) + '</span>'
        + '<span class="uis-card-foot">' + badge
        + '<span class="uis-stepnum">' + max + ' 个判分点</span></span>'
        + '</button>';
    }).join('');

    return '<div class="uis-page">'
      + '<div class="uis-intro">'
      + '<h1 class="uis-intro-h">💻 界面实操模拟</h1>'
      + '<p class="uis-intro-p">按真实卖家后台的路径走：左侧导航 → 页面 → 标签页 → 表格/表单 → 保存。填错数字会当场给原因，判断偏了会指出偏在哪。</p>'
      + '<div class="uis-note">⚠ 界面为布局示意还原（深色导航 / KPI 条 / 表单结构），用于练习操作路径与判断顺序；不是真实后台截图，不连接任何账号，所有数值为模拟。</div>'
      + '</div>'
      + '<div class="uis-grid">' + cards + '</div>'
      + '<div class="uis-back-row"><button class="link-btn" data-act="home">← 回首页</button></div>'
      + '</div>';
  }

  function renderRun(st) {
    const sc = findSc(st.sid);
    if (!sc) return renderList(st);
    const max = scoredMax(sc);
    const total = sc.steps.length;
    if (st.step >= total) return renderDone(sc, st);

    const step = sc.steps[st.step];
    const v = st.v[step.id] || (st.v[step.id] = {});
    /* 带默认值的字段（如日期、标题草稿）在首次渲染时写进状态，保证判分读到同一份数据 */
    if (step.body && step.body.fields) {
      step.body.fields.forEach(function (f) {
        if (f.def != null && v[f.k] == null) v[f.k] = f.def;
      });
    }
    if (step.body && step.body.t === 'title' && v.title == null) v.title = step.body.def;
    const idxNo = sc.steps.slice(0, st.step + 1).filter(function (s) { return !s.ns; }).length;
    const scoredSoFar = sc.steps.slice(0, st.step).filter(function (s) { return !s.ns; }).length + (step.ns ? 0 : 1);

    const head = '<div class="uis-runhead">'
      + '<button class="uis-back" data-act="uis-back">← 场景列表</button>'
      + '<div class="uis-runhead-t"><span>' + sc.icon + '</span>' + esc(sc.title) + '</div>'
      + '<div class="uis-runhead-p">'
      + '<span class="uis-mini-dots">' + sc.steps.map(function (s, i) {
        return '<i class="' + (i < st.step ? 'done' : i === st.step ? 'on' : '') + (s.ns ? ' ns' : '') + '"></i>';
      }).join('') + '</span>'
      + '<span class="uis-score">得分 <b>' + r1(st.score) + '</b> / ' + max + '</span>'
      + '</div></div>';

    const bar = '<div class="uis-coach">'
      + '<span class="uis-coach-n">' + (step.ns ? 'ENTRY' : '任务 ' + Math.min(idxNo, max) + ' / ' + max) + '</span>'
      + '<span class="uis-coach-t">' + esc(step.coach) + '</span>'
      + (st.flash ? '<span class="uis-coach-fb ' + (st.flash.level || 'ok') + '">' + esc(st.flash.short || '') + '</span>' : '')
      + '</div>';

    const prim = (step.primary || []).map(function (p) {
      return '<button class="sc-btn-pri' + (p.lg ? ' sc-btn-lg' : '') + '" data-act="' + (p.act || 'uis-next') + '">' + esc(p.t) + '</button>';
    }).join('');

    const fb = st.flash && st.flash.level && st.flash.level !== 'ok'
      ? '<div class="sc-fb ' + st.flash.level + '"><b>' + (st.flash.level === 'bad' ? '未通过' : '可以保存，但会扣分') + '</b><span>' + esc(st.flash.msg) + '</span></div>'
      : '';

    const barActions = step.ns ? '' : '<div class="sc-bar">'
      + '<div class="sc-bar-l">' + (st.tried[step.id] ? '<span class="sc-retry">这一步已经试过一次，通过后按 50% 计分</span>' : '') + '</div>'
      + '<div class="sc-bar-r">'
      + '<button class="sc-btn-ghost" data-act="uis-back">Cancel</button>'
      + '<button class="sc-btn-pri" data-act="uis-submit">Save and continue</button>'
      + '</div></div>';

    const app = '<div class="sc-app">'
      + rail(step.nav)
      + '<div class="sc-main">'
      + topBar()
      + '<div class="sc-content">'
      + '<div class="sc-crumb">' + step.crumb.map(function (c, i) {
        return (i ? '<i>›</i>' : '') + '<span>' + esc(c) + '</span>';
      }).join('') + '</div>'
      + '<div class="sc-pghead"><div><h1>' + esc(step.page) + '</h1>'
      + '<p class="sc-pgsub">' + esc(sc.title) + '</p></div>'
      + '<div class="sc-pgbtns">' + prim + '</div></div>'
      + tabBar(step.tabs)
      + kpiBar(step.kpi)
      + '<div class="sc-bodyarea">' + renderBody(step, v) + '</div>'
      + fb + barActions
      + '</div></div>'
      + (st.toast ? '<div class="sc-toast">' + esc(st.toast) + '</div>' : '')
      + '</div>';

    const side = '<aside class="uis-side">'
      + '<div class="uis-box"><div class="uis-box-h">当前任务</div><p>' + esc(step.coach) + '</p></div>'
      + '<div class="uis-box"><div class="uis-box-h">场景背景</div><p>' + esc(sc.brief) + '</p></div>'
      + '<div class="uis-box"><div class="uis-box-h">参考数据</div>'
      + sc.data.map(function (d) {
        return '<div class="uis-kv"><span>' + esc(d[0]) + '</span><b>' + esc(d[1]) + '</b></div>';
      }).join('') + '</div>'
      + '<div class="uis-box"><div class="uis-box-h">操作记录</div>'
      + (st.log.length
        ? '<ul class="uis-log">' + st.log.slice(-8).map(function (l) {
          return '<li class="' + l.t + '"><i>' + (l.t === 'ok' ? '✓' : l.t === 'warn' ? '△' : '✕') + '</i>' + esc(l.text) + '</li>';
        }).join('') + '</ul>'
        : '<div class="uis-empty">还没有操作</div>')
      + '</div>'
      + '</aside>';

    return '<div class="uis-page">' + head + bar
      + '<div class="uis-shell">'
      + '<div class="uis-win"><div class="uis-chrome">'
      + '<span class="uis-dots"><i></i><i></i><i></i></span>'
      + '<span class="uis-url"><i class="uis-lock">◆</i>sellercentral.amazon.com/' + esc(String(step.page).toLowerCase().replace(/[^a-z0-9]+/g, '-')) + '</span>'
      + '<span class="uis-live"><b></b>模拟环境</span>'
      + '</div>' + app + '</div>'
      + side
      + '</div></div>';
  }

  function renderDone(sc, st) {
    const max = scoredMax(sc);
    const p = max ? st.score / max : 0;
    const grade = p >= 0.95 ? '熟练' : p >= 0.7 ? '基本合格' : '需要重练';
    const cls = p >= 0.95 ? 'ok' : p >= 0.7 ? 'warn' : 'bad';
    const rows = sc.steps.filter(function (s) { return !s.ns; }).map(function (s, i) {
      const r = st.res[s.id] || { pts: 0, level: 'bad', msg: '' };
      const lv = r.pts >= 0.99 ? 'ok' : r.pts >= 0.5 ? 'warn' : 'bad';
      return '<div class="uis-rv ' + lv + '">'
        + '<span class="uis-rv-n">' + (i + 1) + '</span>'
        + '<div class="uis-rv-b"><div class="uis-rv-h"><b>' + esc(s.page) + '</b>'
        + '<span class="uis-rv-p ' + lv + '">' + r1(r.pts * 100) + '%</span></div>'
        + '<p class="uis-rv-msg">' + esc(r.msg || '') + '</p>'
        + '<p class="uis-rv-why">' + esc(s.why) + '</p></div></div>';
    }).join('');

    return '<div class="uis-page">'
      + '<div class="uis-runhead"><button class="uis-back" data-act="uis-back">← 场景列表</button>'
      + '<div class="uis-runhead-t"><span>' + sc.icon + '</span>' + esc(sc.title) + '</div>'
      + '<div class="uis-runhead-p"><span class="uis-score">最终得分 <b>' + r1(st.score) + '</b> / ' + max + '</span></div></div>'
      + '<div class="uis-shell">'
      + '<div class="uis-win"><div class="uis-chrome"><span class="uis-dots"><i></i><i></i><i></i></span>'
      + '<span class="uis-url"><i class="uis-lock">◆</i>sellercentral.amazon.com/</span><span class="uis-live"><b></b>模拟环境</span></div>'
      + '<div class="sc-app"><div class="sc-main" style="grid-column:1/-1">'
      + '<div class="sc-content sc-donearea">'
      + (st.flash && st.flash.level === 'warn'
        ? '<div class="sc-fb warn"><b>最后一步：通过，但扣分了</b><span>' + esc(st.flash.msg) + '</span></div>' : '')
      + '<div class="uis-done ' + cls + '">'
      + '<div class="uis-done-score"><b>' + r1(st.score) + '</b><span>/ ' + max + '</span></div>'
      + '<div class="uis-done-t">' + grade + '</div>'
      + '<div class="uis-done-d">' + (p >= 0.95 ? '操作路径和数值都没走偏，这套流程可以在真实后台直接上手。'
        : p >= 0.7 ? '大方向对，有个别步骤是靠试出来的——带百分比的几条重做一遍。'
          : '建议先回知识库对应章节过一遍，再回来重做。')
      + '</div></div>'
      + '<div class="uis-review"><div class="uis-box-h">逐步复盘（含正确依据）</div>' + rows + '</div>'
      + '<div class="uis-actions">'
      + '<button class="sc-btn-pri" data-act="uis-again">Retry this scenario</button>'
      + '<button class="sc-btn-sec" data-act="uis-nextsc">下一个场景 →</button>'
      + '</div></div></div></div></div>'
      + '<aside class="uis-side">'
      + '<div class="uis-box"><div class="uis-box-h">这个场景练到了什么</div><p>' + esc(sc.goal) + '</p></div>'
      + '<div class="uis-box"><div class="uis-box-h">参考数据</div>'
      + sc.data.map(function (d) { return '<div class="uis-kv"><span>' + esc(d[0]) + '</span><b>' + esc(d[1]) + '</b></div>'; }).join('')
      + '</div></aside>'
      + '</div></div>';
  }

  function render(st) {
    return st.sid ? renderRun(st) : renderList(st);
  }

  /* ============================================================
     6. 交互
     ============================================================ */
  function resetStep(st) {
    st.step = 0; st.score = 0; st.tried = {}; st.res = {}; st.log = [];
    st.flash = null; st.toast = null;
  }

  function act(action, el, st) {
    const sc = findSc(st.sid);
    const step = sc && st.step < sc.steps.length ? sc.steps[st.step] : null;

    if (action === 'uis-open') {
      st.sid = el.dataset.v; st.v = {}; resetStep(st);
      return true;
    }
    if (action === 'uis-back') {
      st.sid = ''; st.v = {}; resetStep(st);
      return true;
    }
    if (action === 'uis-again') {
      st.v = {}; resetStep(st);
      return true;
    }
    if (action === 'uis-nextsc') {
      const i = SCENES.map(function (s) { return s.id; }).indexOf(st.sid);
      st.sid = SCENES[(i + 1) % SCENES.length].id;
      st.v = {}; resetStep(st);
      return true;
    }
    if (!sc || !step) return false;

    /* 装饰性导航：给出提示，不伪造页面 */
    if (action === 'uis-nav' || action === 'uis-tab') {
      const want = action === 'uis-nav'
        ? (NAV.filter(function (n) { return n.id === el.dataset.v; })[0] || {}).label
        : (step.tabs ? step.tabs.items[+el.dataset.v] : '');
      if (action === 'uis-nav' && el.dataset.v === step.nav) { st.toast = '已经在当前页面了'; return true; }
      st.toast = '本练习只开放当前这条路径（' + (want || '该页面') + ' 是灰的）';
      return true;
    }

    /* 进入下一步（入口步骤无判分） */
    if (action === 'uis-next') {
      st.toast = null;
      st.step += 1;
      return true;
    }

    const v = st.v[step.id] || (st.v[step.id] = {});

    if (action === 'uis-set') {
      v[el.dataset.f] = el.dataset.v;
      st.toast = null;
      return true;
    }
    if (action === 'uis-toggle') {
      const f = el.dataset.f, k = el.dataset.v;
      const arr = Array.isArray(v[f]) ? v[f].slice() : [];
      const i = arr.indexOf(k);
      if (i > -1) arr.splice(i, 1); else arr.push(k);
      v[f] = arr;
      return true;
    }
    if (action === 'uis-ck') {
      const k = el.dataset.k;
      v.pick = v.pick || {};
      v.pick[k] = !v.pick[k];
      return true;
    }
    if (action === 'uis-sel') {
      const k = el.dataset.v;
      const arr = Array.isArray(v.sel) ? v.sel.slice() : [];
      const i = arr.indexOf(k);
      if (i > -1) arr.splice(i, 1); else arr.push(k);
      v.sel = arr;
      return true;
    }
    if (action === 'uis-all') {
      const all = step.body.rows.map(function (r) { return r.k; });
      v.sel = (Array.isArray(v.sel) && v.sel.length === all.length) ? [] : all;
      return true;
    }
    if (action === 'uis-apply') {
      const sel = Array.isArray(v.sel) ? v.sel : [];
      if (!sel.length) { st.toast = '先勾选要处理的搜索词'; return true; }
      if (!v.bulkact) { st.toast = '先在「选择操作」里选一个动作'; return true; }
      v.applied = v.applied || {};
      sel.forEach(function (k) { v.applied[k] = v.bulkact; });
      v.sel = [];
      st.toast = '已对 ' + sel.length + ' 行应用「' + ACT_CN(v.bulkact) + '」';
      return true;
    }

    if (action === 'uis-submit') {
      st.toast = null;
      let res;
      try { res = step.check ? step.check(v) : { ok: true, msg: '' }; }
      catch (e) { res = { ok: false, level: 'bad', msg: '判分异常：' + e.message }; }

      if (res.ok) {
        let pts = res.pts == null ? 1 : res.pts;
        if (st.tried[step.id]) pts = Math.min(pts, 0.5);
        pts = Math.max(0, Math.min(1, pts));
        st.res[step.id] = { pts: pts, level: res.level || 'ok', msg: res.msg || '' };
        st.score += pts;
        st.log.push({
          t: (res.level === 'warn' ? 'warn' : 'ok'),
          text: step.page + '：' + (pts >= 0.99 ? '通过' : '通过 · ' + Math.round(pts * 100) + '%')
        });
        st.flash = { level: res.level || 'ok', msg: res.msg || '', short: res.level === 'warn' ? '通过，但扣分' : '通过' };
        st.step += 1;
        if (st.step >= sc.steps.length) {
          const prev = st.done[sc.id];
          st.done[sc.id] = Math.max(prev === undefined ? 0 : prev, st.score);
          /* 最后一步如果只是「通过但扣分」，把原因带到结算页，别让它一闪而过 */
          if (st.flash && st.flash.level === 'ok') st.flash = null;
        }
      } else {
        st.tried[step.id] = true;
        st.flash = { level: 'bad', msg: res.msg || '还没通过', short: '未通过' };
        st.log.push({ t: 'bad', text: step.page + '：被拦下' });
        if (res.field) st.badField = res.field;
        /* 搜索词表：把判错的行标红 */
        if (step.body && step.body.t === 'st') {
          const ap = v.applied || {};
          const wrong = {};
          step.body.rows.forEach(function (r) { if ((ap[r.k] || 'none') !== r.ans) wrong[r.k] = 1; });
          v.wrongMark = wrong;
        }
      }
      return true;
    }
    return false;
  }

  /* ============================================================
     7. 输入：只局部刷新，不整页重绘（保住光标与下拉状态）
     ============================================================ */
  function currentStep() {
    const st = window.UISIM && window.UISIM.__st && window.UISIM.__st();
    if (!st || !st.sid) return null;
    const sc = findSc(st.sid);
    if (!sc || st.step >= sc.steps.length) return null;
    return { st: st, sc: sc, step: sc.steps[st.step], v: st.v[sc.steps[st.step].id] || (st.v[sc.steps[st.step].id] = {}) };
  }

  function paintTitle(str) {
    const mir = document.getElementById('lsMirror');
    if (mir) mir.innerHTML = markTitle(str);
    const cnt = document.getElementById('lsCount');
    if (cnt) cnt.textContent = String(str).length + ' / 200';
    const box = document.getElementById('lsRules');
    if (box) {
      box.innerHTML = titleCheck(str).map(function (r) {
        return '<div class="ls-rule ' + (r.ok ? 'ok' : 'bad') + '" data-rule="' + r.k + '"><i>' + (r.ok ? '✓' : '!') + '</i><span>' + esc(r.label) + '</span></div>';
      }).join('');
    }
  }

  function onEdit(e) {
    const t = e.target;
    if (!t || !t.getAttribute) return;
    const f = t.getAttribute('data-uis-f');
    if (!f) return;
    const cur = currentStep();
    if (!cur) return;
    const v = cur.v, step = cur.step;
    const k = t.getAttribute('data-k');

    if (k) {
      v[f] = v[f] || {};
      v[f][k] = t.value;
    } else {
      v[f] = t.value;
    }

    /* 局部刷新：标题飘红 / 表单实时提示 */
    if (step.body && step.body.t === 'title') paintTitle(v.title == null ? '' : v.title);
    const live = document.getElementById('uisLive');
    if (live && step.body && step.body.live) live.innerHTML = step.body.live(v) || '';

    /* 搜索词表：单行操作立即生效（等同于后台的行内操作菜单） */
    if (f === 'rowact' && k) {
      const val = String(t.value || '');
      v.applied = v.applied || {};
      if (val) v.applied[k] = val; else delete v.applied[k];
      if (window.UISIM.rerender) window.UISIM.rerender();
      return;
    }

    if (window.UISIM.save) window.UISIM.save();
  }

  document.addEventListener('input', onEdit);
  document.addEventListener('change', onEdit);

  /* 标题编辑器：镜像层跟随滚动 */
  document.addEventListener('scroll', function (e) {
    const t = e.target;
    if (!t || !t.classList || !t.classList.contains('ls-ta')) return;
    const mir = document.getElementById('lsMirror');
    if (mir) mir.scrollTop = t.scrollTop;
  }, true);

  /* ============================================================
     8. 导出
     ============================================================ */
  window.UISIM = {
    list: SCENES,
    render: render,
    act: act,
    titleCheck: titleCheck,
    markTitle: markTitle
  };
})();
