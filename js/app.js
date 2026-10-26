/* ============================================================
   v2 外壳 · 欢迎页 → 模式选择 → 考试 / 刷题
   ------------------------------------------------------------
   本文件只负责「流程与页面骨架」：
     · 路由（welcome / exam-config / exam-run / exam-result /
             quiz-config / quiz-run / quiz-stats / sim）
     · 考试倒计时（localStorage 记开始时间戳，刷新不重置）
     · 组卷、交卷、计分、结果复盘
     · 刷题即时反馈、错题本、统计
   单题卡片的渲染与判分全部在 engine.js（QB），本文件不重复实现。
   ============================================================ */
(function () {
  const R = window.R, F = window.F, QB = window.QB, DATA = window.DATA, SIMS = window.SIMS;
  const KB = window.KB;
  const KEY = 'amz-ops-v2-state';
  const esc = QB.esc;

  const LS = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { window.localStorage.removeItem(k); } catch (e) {} }
  };

  const viewport = document.getElementById('viewport');

  const TYPE_OPTIONS = [
    { id: 'fill',  name: '填空' },
    { id: 'single', name: '单选' },
    { id: 'multi', name: '多选' },
    { id: 'short', name: '简答' }
  ];

  /* ---------- 状态 ---------- */
  function fresh() {
    return {
      v: 3, seed: R.seed(), screen: 'welcome',
      inst: {}, ord: {},
      /* 全局错题本 + 做过的题（跨考试/刷题共享，阶段 5 新增） */
      book: { wrong: [], seen: {} },
      exam: {
        cfg: { count: 20, minutes: 30, types: ['fill', 'single', 'multi', 'short'] },
        items: [], idx: 0, ans: {}, refOpen: {},
        startedAt: null, endsAt: null, running: false, submitted: false
      },
      quiz: {
        module: 'all', mode: 'module', count: 20, items: [], idx: 0, ans: {}, revealed: {}, refOpen: {},
        wrong: [], started: false
      },
      sim: { idx: 0, step: 0, items: {}, ans: {}, fb: {}, done: {} },
      /* 界面实操模拟（v3-ui）：sid 为空表示在场景列表；v 按 step 存表单值，res 存逐步判分 */
      ui: { sid: '', step: 0, v: {}, res: {}, tried: {}, score: 0, log: [], done: {}, flash: null, toast: null }
    };
  }

  /* 兼容阶段 1–4 存下来的旧状态：补字段、把旧的单轮错题并入全局错题本 */
  function normalize(s) {
    if (!s) return s;
    s.book = s.book || {};
    if (!Array.isArray(s.book.wrong)) s.book.wrong = [];
    if (!s.book.seen || typeof s.book.seen !== 'object') s.book.seen = {};
    s.quiz = s.quiz || {};
    if (!s.quiz.mode) s.quiz.mode = 'module';
    (s.quiz.wrong || []).forEach(function (id) {
      if (s.book.wrong.indexOf(id) < 0) s.book.wrong.push(id);
    });
    s.ui = s.ui || {};
    if (typeof s.ui.sid !== 'string') s.ui.sid = '';
    if (typeof s.ui.step !== 'number') s.ui.step = 0;
    if (!s.ui.v || typeof s.ui.v !== 'object') s.ui.v = {};
    if (!s.ui.res || typeof s.ui.res !== 'object') s.ui.res = {};
    s.ui.tried = s.ui.tried || {};
    s.ui.log = s.ui.log || [];
    s.ui.done = s.ui.done || {};
    if (typeof s.ui.score !== 'number') s.ui.score = 0;
    delete s.ui.ans;            // 旧版字段，v2 起改用 v
    delete s.ui.wrongMark;
    delete s.ui.draftUsed;
    return s;
  }

  let state = normalize(load()) || fresh();
  /* 仅供开发期截图/测试预置状态使用，正常打开时该变量不存在 */
  if (window.__PRELOAD_STATE__) state = normalize(window.__PRELOAD_STATE__);

  function load() {
    try {
      const raw = LS.get(KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || s.v !== 3) return null;
      return s;
    } catch (e) { return null; }
  }
  function save() { LS.set(KEY, JSON.stringify(state)); }

  /* ---------- 工具 ---------- */
  const dimName = id => (DATA.DIMS.find(d => d.id === id) || {}).name || id;
  const pad2 = n => String(n).padStart(2, '0');

  function fmtClock(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return pad2(Math.floor(s / 3600)) + ':' + pad2(Math.floor((s % 3600) / 60)) + ':' + pad2(s % 60);
  }
  function fmtUsed(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(s / 60) + ' 分 ' + pad2(s % 60) + ' 秒';
  }

  /* 当前模式对应的作答容器 */
  function bucket() { return state.screen.indexOf('exam') === 0 ? state.exam.ans : state.quiz.ans; }
  function curItems() { return state.screen.indexOf('exam') === 0 ? state.exam.items : state.quiz.items; }
  function curIdx() { return state.screen.indexOf('exam') === 0 ? state.exam.idx : state.quiz.idx; }
  function curMeta() { return QB.get(curItems()[curIdx()]); }

  /* ============================================================
     0. 全局错题本 / 已答记录（阶段 5）
     ------------------------------------------------------------
     · book.wrong：所有答错的客观题（考试 + 刷题都进）
     · book.seen ：做过的每一道题（含主观题），存答案快照用于「复习已答题」
     · 只有「错题重练」模式下答对，才会自动移出错题本
     ============================================================ */
  function recordAnswer(q, ans, res, ctx) {
    const id = q.id;
    const snap = ans == null ? null : JSON.parse(JSON.stringify(ans));
    state.book.seen[id] = {
      ans: snap,
      auto: !!res.auto,
      score: res.score, max: res.max,
      type: q.type, at: Date.now()
    };
    if (!res.auto) return;                       /* 主观题不进错题本 */
    if (!res.answered) return;                   /* 没作答不算错 */

    const p = state.book.wrong.indexOf(id);
    if (res.score < res.max) {
      if (p < 0) state.book.wrong.push(id);
    } else if (p > -1 && ctx === 'retry') {
      state.book.wrong.splice(p, 1);             /* 错题重练答对 → 自动移除 */
    }
  }

  /* 把「上次作答」翻译成人话（复习模式顶部提示用） */
  function prevAnsText(q, seen) {
    const a = seen.ans;
    if (a == null) return '上次未作答';
    if (q.type === 'fill') {
      const it = QB.inst(q, state);
      return it.blanks.map(function (b) {
        const v = String(a[b.key] == null ? '' : a[b.key]).trim();
        return b.label + ' = ' + (v || '空');
      }).join('　');
    }
    if (q.type === 'single' || q.type === 'multi') {
      const picked = Array.isArray(a) ? a : [];
      if (!picked.length) return '上次未作答';
      const ord = QB.order(q, state);
      return picked.map(function (id) {
        const k = ord.indexOf(id);
        const op = q.src.options.find(function (o) { return o.id === id; });
        return ('ABCDEF'[k > -1 ? k : 0]) + ' ' + (op ? op.text : id);
      }).join('　/　');
    }
    const t = String(a.text || '');
    const cover = (a.checked || []).filter(Boolean).length;
    return t ? '上次写了 ' + t.length + ' 字，自评覆盖 ' + cover + ' 项' : '上次未作答';
  }

  function reviewNote(q, seen) {
    const ok = seen.auto ? (seen.score === seen.max) : false;
    const tag = !seen.auto ? '待自评' : ok ? '答对' : '答错';
    const cls = !seen.auto ? 'self' : ok ? 'ok' : 'bad';
    const when = seen.at ? new Date(seen.at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
    return '<div class="review-note ' + cls + '">'
      + '<div class="rn-head"><b>回顾模式</b><span class="rn-tag">上次：' + tag + '</span>'
      + (seen.auto ? '<span class="rn-score">' + seen.score + ' / ' + seen.max + '</span>' : '')
      + '<span class="spacer"></span><span class="rn-when">' + esc(when) + '</span></div>'
      + '<div class="rn-body">' + esc(prevAnsText(q, seen)) + '</div>'
      + '<div class="rn-foot">可以重新答一遍，提交后会覆盖这次记录。</div>'
      + '</div>';
  }

  /* ============================================================
     1. 欢迎页
     ============================================================ */
  function renderWelcome() {
    const total = QB.all().length;
    const byType = {};
    QB.all().forEach(q => { byType[q.type] = (byType[q.type] || 0) + 1; });

    const resumeExam = state.exam.running && !state.exam.submitted;
    const resumeQuiz = !!(state.quiz.started && state.quiz.items.length);

    viewport.innerHTML = `
      <div class="welcome">
        <div class="welcome-inner">
          <div class="welcome-tag">AMAZON OPS · 非助理岗</div>
          <h1 class="welcome-title">亚马逊运营岗<br><em>能力测评</em></h1>
          <p class="welcome-sub">
            不考定义，考判断。同一批题，两种考法：<br>
            限时考试看压力下的取舍，单项刷题看每一步能否说出「为什么」。
          </p>

          <div class="mode-cards">
            <button class="mode-card" data-act="go-exam">
              <span class="mc-icon">⏱</span>
              <span class="mc-title">模拟考试</span>
              <span class="mc-desc">限时交卷 · 交卷后统一看解析</span>
              <span class="mc-meta">10 / 20 / 30 题 · 15 / 30 / 45 分钟</span>
              ${resumeExam ? '<span class="mc-badge">有未完成的考试</span>' : ''}
            </button>
            <button class="mode-card" data-act="go-quiz">
              <span class="mc-icon">✎</span>
              <span class="mc-title">单项刷题</span>
              <span class="mc-desc">即答即看 · 每题立刻出解析</span>
              <span class="mc-meta">按题型 / 按维度筛选 · 自动收错题</span>
              ${resumeQuiz ? '<span class="mc-badge">刷题进度未清空</span>' : ''}
            </button>
            <button class="mode-card mode-card-kb" data-act="go-kb">
              <span class="mc-icon">📖</span>
              <span class="mc-title">系统知识库<em class="mc-em">先学后测</em></span>
              <span class="mc-desc">6 章考点 · 口诀 / 表格 / 快速检索</span>
              <span class="mc-meta">答错能一键跳回对应章节</span>
            </button>
          </div>

          <div class="welcome-stats">
            <span><b>${total}</b> 题在库</span>
            <span><b>${byType.fill || 0}</b> 填空</span>
            <span><b>${(byType.single || 0) + (byType.multi || 0)}</b> 选择</span>
            <span><b>${byType.short || 0}</b> 简答</span>
            <span><b>${byType.case || 0}</b> 案例</span>
            <span><b>${state.book.wrong.length}</b> 错题本</span>
          </div>

          <div class="welcome-foot">
            <button class="link-btn" data-act="go-uis">💻 界面实操模拟 · 测试版（6 个后台场景）</button>
            <span class="dot">·</span>
            <button class="link-btn" data-act="go-sim">模拟实操 · 3 组链路（即时反馈）</button>
            <span class="dot">·</span>
            <button class="link-btn" data-act="reset-all">清空本地记录</button>
          </div>

          <div class="disc" style="margin-top:26px;text-align:left">
            <span>⚠</span>
            <div><b>数据声明：</b>所有数值由随机参数生成，仅用于练习决策链路，不代表真实店铺业绩。健康区间为 3C / 杯壶类目参考值，跨类目需按本品类口径调整。</div>
          </div>

          <div class="author-block">
            <div class="author-row">
              <span class="author-k">AUTHOR</span>
              <span class="author-name">夏姬姬开摆王</span>
              <span class="author-cc">v3-ui · 测试版</span>
            </div>
            <div class="author-row">
              <span class="author-k">NOTICE</span>
              <span class="author-text">本项目仅供个人学习交流使用，完全免费，严禁用于任何商业倒卖或盈利行为。欢迎分享，但请保留原作者信息。</span>
            </div>
          </div>
        </div>
      </div>`;
  }

  /* ============================================================
     2. 考试 · 配置
     ============================================================ */
  function renderExamConfig() {
    const c = state.exam.cfg;
    const t = state.exam;
    const running = t.running && !t.submitted;

    const countBtn = n => '<button class="seg' + (c.count === n ? ' on' : '') + '" data-act="cfg-count" data-v="' + n + '">' + n + ' 题</button>';
    const minBtn = n => '<button class="seg' + (c.minutes === n ? ' on' : '') + '" data-act="cfg-minutes" data-v="' + n + '">' + n + ' 分钟</button>';
    const typeBtn = o => {
      const on = c.types.indexOf(o.id) > -1;
      const n = QB.all().filter(q => q.type === o.id).length;
      return '<button class="seg' + (on ? ' on' : '') + '" data-act="cfg-type" data-v="' + o.id + '">' + o.name + '<i>' + n + '</i></button>';
    };

    viewport.innerHTML = `
      <div class="page-head">
        <button class="link-btn" data-act="home">← 返回</button>
        <h2>模拟考试</h2>
        <p>交卷前不显示对错与解析。倒计时由开始时间戳计算，刷新页面不会重置。</p>
      </div>

      ${running ? `<div class="disc" style="border-color:#ffd9a0;background:#fff8ec">
        <span>⏱</span>
        <div><b>你有一场未交卷的考试。</b>开始于 ${new Date(t.startedAt).toLocaleTimeString('zh-CN')}，剩余 ${fmtClock(t.endsAt - Date.now())}。<br>
        <button class="btn btn-accent btn-sm" style="margin-top:8px" data-act="exam-resume">继续这场考试 →</button>
        <button class="btn btn-ghost btn-sm" style="margin-top:8px" data-act="exam-discard">放弃并重开</button></div>
      </div>` : ''}

      <div class="card">
        <div class="cfg-row"><div class="cfg-label">题量</div><div class="segs">${[10, 20, 30].map(countBtn).join('')}</div></div>
        <div class="cfg-row"><div class="cfg-label">限时</div><div class="segs">${[15, 30, 45].map(minBtn).join('')}</div></div>
        <div class="cfg-row"><div class="cfg-label">题型</div><div class="segs">${TYPE_OPTIONS.map(typeBtn).join('')}</div>
          <div class="cfg-hint">默认全选。取消全部勾选将无法组卷。</div></div>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" data-act="exam-start" ${c.types.length ? '' : 'disabled'}>开始考试</button>
        <span class="spacer"></span>
        <span style="font-size:12.5px;color:var(--muted)">题库匹配 ${examPool().length} 题，按所选题量随机抽卷</span>
      </div>`;
  }

  function examPool() {
    const types = state.exam.cfg.types;
    return QB.all().filter(q => types.indexOf(q.type) > -1);
  }

  function startExam() {
    const pool = examPool();
    if (!pool.length) { alert('所选题型下没有题目。'); return; }
    const n = Math.min(state.exam.cfg.count, pool.length);
    const picked = R.pickMany(pool.map(q => q.id), n);
    const now = Date.now();
    state.exam.items = picked;
    state.exam.idx = 0;
    state.exam.ans = {};
    state.exam.refOpen = {};
    state.exam.submitted = false;
    state.exam.running = true;
    state.exam.startedAt = now;
    state.exam.endsAt = now + state.exam.cfg.minutes * 60000;
    state.screen = 'exam-run';
    save(); render();
  }

  /* ============================================================
     3. 考试 · 答题
     ============================================================ */
  function renderExamRun() {
    const t = state.exam;
    if (!t.items.length) { state.screen = 'exam-config'; return renderExamConfig(); }
    const q = curMeta();
    const i = t.idx;
    const ans = t.ans[q.id];
    const res = t.submitted ? QB.judge(q, state, ans) : null;
    const answered = t.items.filter(id => QB.isAnswered(QB.get(id), t.ans[id])).length;

    viewport.innerHTML = `
      <div class="exambar">
        <div class="eb-left">
          <span class="eb-clock" id="cd">--:--:--</span>
          <span class="eb-sub" id="cd-sub">剩余</span>
        </div>
        <div class="eb-mid">
          <div class="eb-prog"><span>第 ${i + 1} / ${t.items.length} 题</span><span>已答 ${answered}</span></div>
          <div class="progress-bar" style="height:5px"><div class="progress-fill" style="width:${Math.round(answered / t.items.length * 100)}%"></div></div>
        </div>
        <button class="btn btn-ghost btn-sm" data-act="exam-leave">暂离</button>
        <button class="btn btn-accent btn-sm" data-act="exam-submit">交卷</button>
      </div>

      <div class="qbody">
        <div class="qmeta">
          ${QB.typePill(q.type)}
          ${QB.layerPill(q.layer)}
          <span class="qmeta-dim">${esc(dimName(q.dim))}</span>
          <span class="spacer"></span>
          <span class="qmeta-idx">${esc(q.id)}</span>
        </div>
        <div class="card">
          ${QB.card(q, state, { ans: ans, res: res, phase: 'input', showFb: false, showRef: false })}
        </div>
      </div>

      <div class="qnav">
        <button class="btn btn-ghost" data-act="exam-prev" ${i === 0 ? 'disabled' : ''}>上一题</button>
        <div class="qnav-dots">${t.items.map((id, k) =>
          '<button class="dot' + (k === i ? ' cur' : '') + (QB.isAnswered(QB.get(id), t.ans[id]) ? ' done' : '') + '" data-act="exam-jump" data-v="' + k + '">' + (k + 1) + '</button>'
        ).join('')}</div>
        <button class="btn ${i === t.items.length - 1 ? 'btn-accent' : 'btn-primary'}" data-act="${i === t.items.length - 1 ? 'exam-submit' : 'exam-next'}">${i === t.items.length - 1 ? '交卷' : '下一题'}</button>
      </div>`;
  }

  /* ---------- 倒计时 ---------- */
  let timerId = null;

  function updateClock() {
    const el = document.getElementById('cd');
    if (!el) { clearInterval(timerId); timerId = null; return; }
    const t = state.exam, left = t.endsAt - Date.now();
    el.textContent = fmtClock(left);
    const urgent = left <= 5 * 60000;
    el.classList.toggle('urgent', urgent);
    const sub = document.getElementById('cd-sub');
    if (sub) sub.textContent = urgent ? '即将交卷' : '剩余';
    if (left <= 0) { clearInterval(timerId); timerId = null; submitExam(true); }
  }

  function setupTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (state.screen === 'exam-run' && state.exam.running && !state.exam.submitted) {
      updateClock();
      timerId = setInterval(updateClock, 1000);
    }
  }

  /* ============================================================
     4. 考试 · 交卷 / 结果
     ============================================================ */
  function examResult() {
    const t = state.exam;
    let s = 0, m = 0, autoN = 0, selfN = 0, rightN = 0;
    t.items.forEach(function (id) {
      const q = QB.get(id);
      const r = QB.judge(q, state, t.ans[id]);
      s += r.score; m += r.max;
      if (r.auto) { autoN++; if (r.score === r.max) rightN++; } else selfN++;
    });
    return {
      score: m ? Math.round(s / m * 100) : 0,
      s: s, m: m, autoN: autoN, selfN: selfN, rightN: rightN,
      answered: t.items.filter(id => QB.isAnswered(QB.get(id), t.ans[id])).length
    };
  }

  function submitExam(auto) {
    const t = state.exam;
    if (!t.running) return;
    if (!auto) {
      const un = t.items.filter(id => !QB.isAnswered(QB.get(id), t.ans[id])).length;
      const msg = un ? '还有 ' + un + ' 题未作答，未作答按 0 分计。确定交卷？' : '确定交卷？交卷后不能再修改答案。';
      if (!confirm(msg)) return;
    }
    t.submitted = true;
    t.running = false;
    t.usedMs = Date.now() - t.startedAt;
    /* 交卷即入全局错题本 / 已答记录（主观题只记快照，不判错） */
    t.items.forEach(function (id) {
      const q = QB.get(id);
      if (!q) return;
      const r = QB.judge(q, state, t.ans[id]);
      if (r.answered) recordAnswer(q, t.ans[id], r, 'exam');
      /* 「待自评」必须有参照物：主观题的交卷后默认摊开参考答案 */
      if (!r.auto && !(id in t.refOpen)) t.refOpen[id] = true;
    });
    state.screen = 'exam-result';
    save(); render();
    window.scrollTo(0, 0);
  }

  function renderExamResult() {
    const t = state.exam, r = examResult();
    const total = t.items.length;
    const pct = r.score;
    const tone = pct >= 85 ? 'ok' : pct >= 70 ? 'good' : pct >= 55 ? 'mid' : 'low';
    const toneText = pct >= 85 ? '独立运营水平' : pct >= 70 ? '可带教上岗' : pct >= 55 ? '过渡期' : '基础待补';

      const review = t.items.map(function (id, k) {
      const q = QB.get(id);
      const ans = t.ans[id];
      const res = QB.judge(q, state, ans);
      const full = res.score === res.max && res.answered;
      const cls = !res.answered ? 'skip' : full ? 'right' : (res.auto ? 'wrong' : 'self');
      const label = !res.answered ? '未作答' : res.auto ? (full ? '正确' : '错误') : '待自评';
      /* 主观题交卷后默认摊开参考答案（submitExam 里已置 true），用户可点一下收起 */
      const refOpen = !!t.refOpen[id];
      return `<div class="review-item ${cls}">
        <div class="ri-head">
          <span class="ri-no">${k + 1}</span>
          ${QB.typePill(q.type)}
          <span class="ri-dim">${esc(dimName(q.dim))}</span>
          <span class="spacer"></span>
          <span class="ri-score">${res.score} / ${res.max}</span>
          <span class="ri-tag">${label}</span>
        </div>
        <div class="ri-body">
          ${QB.card(q, state, { ans: ans, res: res, phase: 'checked', showFb: true, showRef: refOpen })}
        </div>
      </div>`;
    }).join('');

    viewport.innerHTML = `
      <div class="result-hero tone-${tone}">
        <div class="rt">EXAM RESULT · ${toneText}</div>
        <div class="score">${pct}<small> / 100</small></div>
        <div class="verdict">共 ${total} 题，作答 ${r.answered} 题，客观题正确 ${r.rightN}/${r.autoN}${r.selfN ? '，主观题 ' + r.selfN + ' 题待自评' : ''}。</div>
        <div class="splits">
          <div><span>用时</span><b>${t.usedMs ? fmtUsed(t.usedMs) : '—'}</b></div>
          <div><span>限时</span><b>${state.exam.cfg.minutes} 分钟</b></div>
          <div><span>得分点</span><b>${r.s} / ${r.m}</b></div>
        </div>
      </div>

      ${r.selfN ? `<div class="disc" style="border-color:#cfe0ff;background:#f2f7ff">
        <span>✎</span><div><b>主观题需要在下方逐题自评。</b>勾选你实际覆盖到的要点，系统按覆盖率把这部分计入总分——分数是实时变动的。</div></div>` : ''}

      <div class="section-title">逐题复盘</div>
      ${review}

      <div class="result-actions">
        <button class="btn btn-primary" data-act="exam-again">再考一次</button>
        <button class="btn btn-ghost" data-act="go-quiz">转去刷题</button>
        <button class="btn btn-ghost" data-act="home">回到首页</button>
      </div>`;
  }

  /* ============================================================
     5. 刷题 · 配置
     ============================================================ */
  function quizModules() {
    const out = [{ id: 'all', name: '全部', n: QB.all().length }];
    TYPE_OPTIONS.concat([{ id: 'case', name: '案例' }]).forEach(function (o) {
      const n = QB.all().filter(q => q.type === o.id).length;
      if (n) out.push({ id: 'type:' + o.id, name: o.name, n: n });
    });
    DATA.DIMS.forEach(function (d) {
      const n = QB.all().filter(q => q.dim === d.id).length;
      if (n) out.push({ id: 'dim:' + d.id, name: d.name, n: n });
    });
    return out;
  }

  function quizPool(module) {
    const all = QB.all();
    if (!module || module === 'all') return all;
    const p = module.split(':');
    return all.filter(q => (p[0] === 'type' ? q.type === p[1] : q.dim === p[1]));
  }

  function renderQuizConfig() {
    const mods = quizModules();
    const cur = state.quiz.module || 'all';

    const modBtn = m => '<button class="seg' + (cur === m.id ? ' on' : '') + '" data-act="quiz-module" data-v="' + m.id + '">'
      + m.name + '<i>' + m.n + '</i></button>';

    viewport.innerHTML = `
      <div class="page-head">
        <button class="link-btn" data-act="home">← 返回</button>
        <h2>单项刷题</h2>
        <p>不做限时。每题提交后立刻出对错与逐项解析，答错的题会自动进错题本。</p>
      </div>

      <div class="card">
        <div class="cfg-row"><div class="cfg-label">模块</div>
          <div class="segs">${mods.filter(m => m.id.indexOf(':') < 0).map(modBtn).join('')}</div></div>
        <div class="cfg-row"><div class="cfg-label">按题型</div>
          <div class="segs">${mods.filter(m => m.id.indexOf('type:') === 0).map(modBtn).join('')}</div></div>
        <div class="cfg-row"><div class="cfg-label">按维度</div>
          <div class="segs">${mods.filter(m => m.id.indexOf('dim:') === 0).map(modBtn).join('')}</div></div>
        <div class="cfg-row"><div class="cfg-label">本轮题数</div>
          <div class="segs">${[10, 20, 999].map(n => '<button class="seg' + (state.quiz.count === n ? ' on' : '') + '" data-act="quiz-count" data-v="' + n + '">' + (n === 999 ? '全部' : n + ' 题') + '</button>').join('')}</div></div>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" data-act="quiz-start">开始刷题</button>
        <button class="btn btn-ghost wb-btn" data-act="quiz-start-wrong" ${state.book.wrong.length ? '' : 'disabled'}>
          📖 我的错题本 <b>(${state.book.wrong.length} 题)</b>
        </button>
        <button class="btn btn-ghost wb-btn" data-act="quiz-start-review" ${Object.keys(state.book.seen).length ? '' : 'disabled'}>
          📝 复习已答题 <b>(${Object.keys(state.book.seen).length} 题)</b>
        </button>
        <span class="spacer"></span>
        <span style="font-size:12.5px;color:var(--muted)">该模块 ${quizPool(cur).length} 题 · 全局错题本 ${state.book.wrong.length} 题</span>
      </div>`;
  }

  function startQuiz(mode) {
    mode = mode || 'module';
    let ids = [];

    if (mode === 'wrong') {
      /* 错题重练：不选模块，直接拉全局错题本，最近答错的排前面 */
      const seen = state.book.seen;
      ids = state.book.wrong.slice().filter(id => QB.get(id))
        .sort((a, b) => ((seen[b] && seen[b].at) || 0) - ((seen[a] && seen[a].at) || 0));
      if (!ids.length) { alert('错题本是空的，先去刷几道题。'); return; }
    } else if (mode === 'review') {
      /* 回顾模式：拉所有做过的题，最近做的排前面 */
      const seen = state.book.seen;
      ids = Object.keys(seen).filter(id => QB.get(id))
        .sort((a, b) => ((seen[b] && seen[b].at) || 0) - ((seen[a] && seen[a].at) || 0));
      if (!ids.length) { alert('还没有做过的题。'); return; }
      ids = ids.slice(0, 40);
    } else {
      const pool = quizPool(state.quiz.module);
      if (!pool.length) { alert('该模块暂无题目。'); return; }
      ids = R.pickMany(pool.map(q => q.id), Math.min(state.quiz.count, pool.length));
    }

    state.quiz.mode = mode;
    state.quiz.items = ids;
    state.quiz.idx = 0;
    state.quiz.ans = {};
    state.quiz.revealed = {};
    state.quiz.refOpen = {};
    state.quiz.wrong = [];
    state.quiz.started = true;
    state.screen = 'quiz-run';
    save(); render();
  }

  /* ============================================================
     6. 刷题 · 答题
     ============================================================ */
  function renderQuizRun() {
    const z = state.quiz;
    if (!z.items.length) { state.screen = 'quiz-config'; return renderQuizConfig(); }
    const q = curMeta();
    const i = z.idx;
    const ans = z.ans[q.id];
    const revealed = !!z.revealed[q.id];
    const res = revealed ? QB.judge(q, state, ans) : null;
    const inWrong = state.book.wrong.indexOf(q.id) > -1;
    /* 主观题（简答/案例）的答案存在 textarea 里，输入时不触发重绘，
       所以按钮不能用 isAnswered 做 disabled 判断——那会让用户写完字仍然点不动。
       改为始终可点，点击时再校验（handle 里已有 alert）。 */
    const canSubmit = (q.type === 'short' || q.type === 'case') ? true : QB.isAnswered(q, ans);
    const seen = z.mode === 'review' ? state.book.seen[q.id] : null;
    const modeTag = z.mode === 'wrong' ? '<span class="qb-tag warn">错题重练</span>'
      : z.mode === 'review' ? '<span class="qb-tag">回顾模式</span>' : '';
    /* 错题重练答对后提示「已移出错题本」 */
    const freed = z.mode === 'wrong' && revealed && res && res.auto && res.score === res.max;

    viewport.innerHTML = `
      <div class="quizbar">
        <button class="link-btn" data-act="go-quiz">← 换个模块</button>
        ${modeTag}
        <div class="qb-mid">
          <span>第 ${i + 1} / ${z.items.length} 题</span>
          <div class="progress-bar" style="height:4px"><div class="progress-fill" style="width:${Math.round((i + 1) / z.items.length * 100)}%"></div></div>
        </div>
        <button class="btn btn-ghost btn-sm" data-act="quiz-stats">统计</button>
      </div>

      <div class="qbody">
        <div class="qmeta">
          ${QB.typePill(q.type)}
          ${QB.layerPill(q.layer)}
          <span class="qmeta-dim">${esc(dimName(q.dim))}</span>
          <span class="spacer"></span>
          <span class="qmeta-idx">${esc(q.id)}</span>
        </div>
        ${seen ? reviewNote(q, seen) : ''}
        ${freed ? '<div class="disc" style="border-color:#bfe8d4;background:#f0fbf6"><span>✓</span><div><b>这题已经答对，已自动移出错题本。</b></div></div>' : ''}
        <div class="card">
          ${QB.card(q, state, { ans: ans, res: res, phase: revealed ? 'checked' : 'input', showFb: revealed, showRef: !!z.refOpen[q.id] })}
        </div>
      </div>

      <div class="qnav">
        <button class="btn btn-ghost" data-act="quiz-prev" ${i === 0 ? 'disabled' : ''}>上一题</button>
        ${revealed
          ? '<button class="btn btn-ghost" data-act="quiz-wrongbook">' + (inWrong ? '移出错题本' : '加入错题本') + '</button>'
          : '<button class="btn btn-primary" data-act="quiz-submit" ' + (canSubmit ? '' : 'disabled') + '>提交并看解析</button>'}
        <button class="btn ${i === z.items.length - 1 ? 'btn-accent' : 'btn-primary'}" data-act="${i === z.items.length - 1 ? 'quiz-stats' : 'quiz-next'}">${i === z.items.length - 1 ? '完成 · 看统计' : '下一题'}</button>
      </div>`;
  }

  /* ============================================================
     7. 刷题 · 统计 / 错题本
     ============================================================ */
  function quizStats() {
    const z = state.quiz;
    let answered = 0, autoN = 0, right = 0, selfN = 0;
    const byDim = {};
    z.items.forEach(function (id) {
      if (!z.revealed[id]) return;
      const q = QB.get(id);
      const r = QB.judge(q, state, z.ans[id]);

      /* 「已答」= 所有已提交的题（客观 + 主观）。主观题只要写了字并提交，
         就应该计入已答总数，但不进准确率的分母。 */
      answered++;

      if (!r.auto) { selfN++; return; }   /* 主观题到此为止：不算准确率、不进维度表 */

      autoN++;
      if (r.score === r.max) right++;
      byDim[q.dim] = byDim[q.dim] || { n: 0, ok: 0 };
      byDim[q.dim].n++;
      if (r.score === r.max) byDim[q.dim].ok++;
    });
    return { answered: answered, autoN: autoN, right: right, selfN: selfN, byDim: byDim };
  }

  function renderQuizStats() {
    const z = state.quiz, s = quizStats();
    const autoN = s.autoN;
    const acc = autoN ? Math.round(s.right / autoN * 100) : null;

    const dimRows = DATA.DIMS.filter(d => s.byDim[d.id]).map(function (d) {
      const v = s.byDim[d.id];
      return '<tr><td>' + esc(d.name) + '</td><td class="num">' + v.ok + ' / ' + v.n + '</td><td class="num">' + Math.round(v.ok / v.n * 100) + '%</td></tr>';
    }).join('') || '<tr><td colspan="3" style="color:var(--muted)">本轮还没有客观题作答记录</td></tr>';

    const wrongList = state.book.wrong.length ? state.book.wrong.map(function (id) {
      const q = QB.get(id);
      if (!q) return '';
      return '<div class="wrong-row"><span class="wr-id">' + esc(q.id) + '</span>'
        + QB.typePill(q.type)
        + '<span class="wr-title">' + esc(q.title) + '</span>'
        + '<span class="spacer"></span>'
        + '<button class="btn btn-ghost btn-sm" data-act="quiz-open" data-v="' + id + '">去做这题</button>'
        + '<button class="btn btn-ghost btn-sm" data-act="quiz-unwrong" data-v="' + id + '">移除</button></div>';
    }).join('') : '<div style="color:var(--muted);font-size:13.5px">错题本是空的。答错的题会自动进来。</div>';

    const modeText = z.mode === 'wrong' ? '本轮是「错题重练」' : z.mode === 'review' ? '本轮是「回顾已答题」' : '本轮是模块刷题';

    viewport.innerHTML = `
      <div class="page-head">
        <button class="link-btn" data-act="go-quiz">← 返回刷题</button>
        <h2>刷题统计</h2>
        <p>${modeText}。只统计本轮已提交的题，主观题不判语义、单独计数。</p>
      </div>

      <div class="stat-row">
        <div class="stat"><div class="n">${acc === null ? '—' : acc + '%'}</div><div class="l">客观题准确率</div></div>
        <div class="stat"><div class="n">${s.right}/${autoN}</div><div class="l">客观题 答对 / 已答</div></div>
        <div class="stat"><div class="n">${s.answered}</div><div class="l">已答题数（含主观）</div></div>
        <div class="stat"><div class="n">${s.selfN}</div><div class="l">其中主观题</div></div>
        <div class="stat"><div class="n">${state.book.wrong.length}</div><div class="l">全局错题本</div></div>
      </div>

      <div class="section-title">按维度（仅客观题）</div>
      <div class="card card-tight">
        <table class="tb"><thead><tr><th>维度</th><th class="num">答对 / 题数</th><th class="num">准确率</th></tr></thead><tbody>${dimRows}</tbody></table>
        <div style="font-size:12px;color:var(--muted);margin-top:10px">主观题不判语义，只计入「已答题数」，不进准确率与维度表。</div>
      </div>

      <div class="section-title">错题本（全局，共 ${state.book.wrong.length} 题）</div>
      <div class="card card-tight">${wrongList}</div>

      <div class="btn-row">
        <button class="btn btn-primary" data-act="quiz-restart">用同一模块再来一轮</button>
        <button class="btn btn-ghost" data-act="quiz-start-wrong" ${state.book.wrong.length ? '' : 'disabled'}>📖 错题重练（${state.book.wrong.length}）</button>
        <span class="spacer"></span>
        <button class="btn btn-ghost" data-act="home">回到首页</button>
      </div>`;
  }

  /* ============================================================
     8. 模拟实操（保留 v1 引擎，仅换外壳）
     ============================================================ */
  const SIM_KEYS = ['A', 'B', 'C'];
  const STD_PATH = {
    A: '搜索词报告 → 判断异常层级（点击 / 转化 / 成本）→ 执行对应动作（否词 / 改展示端 / 改详情页 / 降 bid）→ 报 3–7 天回落到毛利附近的预期。',
    B: '加权算日均 → 断货天数 vs 补货总时长 → 补货量公式（周期需求 + 安全库存 − 现有库存）→ 按缺口决定空运批次。',
    C: '固定成本 ÷（1 − 佣金 − 退货率）= 盈亏平衡价 → 加上广告与服务费反推目标价 → 按定价验算单件净利。'
  };

  function ensureSim(key) {
    if (!state.sim.items[key]) {
      state.sim.items[key] = SIMS[key].build();
      state.sim.ans[key] = {};
      state.sim.fb[key] = {};
      save();
    }
  }

  function simOverview(key, item) {
    const d = item.data;
    let kv = [];
    if (key === 'A') {
      kv = [
        ['活动', d.camp], ['客单价', F.money(d.price)], ['毛利率', F.pct(d.margin * 100)],
        ['上周 曝光/点击', F.comma(d.i0) + ' / ' + F.comma(d.c0)],
        ['上周 CTR/CVR', F.pct(d.c0 / d.i0 * 100) + ' / ' + F.pct(d.o0 / d.c0 * 100)],
        ['上周 花费/ACOS', F.money(d.s0) + ' / ' + F.pct(d.acos0)],
        ['本周 曝光/点击', F.comma(d.i1) + ' / ' + F.comma(d.c1)],
        ['本周 CTR/CVR', F.pct(d.c1 / d.i1 * 100) + ' / ' + F.pct(d.o1 / d.c1 * 100)],
        ['本周 花费/ACOS', F.money(d.s1) + ' / ' + F.pct(d.acos1)],
        ['本周 CPC', F.money(d.cpc1) + '（上周 ' + F.money(d.cpc0) + '）'],
        ['同账户另一条活动', d.camp2 + ' · ACOS ' + F.pct(d.acos2 * 100)]
      ];
    } else if (key === 'B') {
      kv = [
        ['近 7 天日均', d.d7 + ' 单'], ['近 30 天日均', d.d30 + ' 单'],
        ['FBA 可售', d.fba + ' 件'], ['在途', d.transit + ' 件'], ['本地仓', d.local + ' 件'],
        ['采购周期', d.lead + ' 天'], ['头程', d.ship + ' 天'], ['入仓缓冲', d.buf + ' 天'], ['安全系数', d.k],
        ['采购单价', F.money(d.cost)], ['可用资金', F.money(d.cash)]
      ];
    } else {
      kv = [
        ['出厂成本', F.money(d.cost)], ['头程', F.money(d.freight)], ['FBA 配送费', F.money(d.fbaFee)],
        ['仓储分摊', F.money(d.storage)], ['佣金率', F.pct(d.commRate * 100)],
        ['退货损耗率', F.pct(d.returnRate * 100, 1)], ['单件广告费', '按售价 ' + F.pct(d.adRate * 100) + ' 计'],
        ['运营服务费', F.money(d.opsFee)], ['目标净利率', F.pct(d.targetMargin * 100)]
      ];
    }
    const clue = (key === 'A' && d.clue)
      ? '<div style="margin-top:9px;padding-top:9px;border-top:1px dashed #dfe6ee;font-size:12.5px;color:#6b7787">现场线索：' + esc(d.clue) + '</div>'
      : '';
    return '<div class="data-box" style="margin-bottom:16px"><div class="kv">'
      + kv.map(p => '<span>' + esc(p[0]) + ' <b>' + esc(p[1]) + '</b></span>').join('')
      + '</div>' + clue + '</div>';
  }

  function renderSim() {
    const key = SIM_KEYS[state.sim.idx];
    ensureSim(key);
    const sim = SIMS[key], item = state.sim.items[key];
    const stepIdx = state.sim.step, step = item.steps[stepIdx];
    const ans = state.sim.ans[key] || {};
    const fb = (state.sim.fb[key] || {})[stepIdx];
    const totalSteps = item.steps.length;
    const finished = stepIdx >= totalSteps;

    let dots = '';
    for (let k = 0; k < totalSteps; k++) {
      let cls = 'sim-dot';
      if (k === stepIdx && !finished) cls += ' cur';
      else if (state.sim.fb[key] && state.sim.fb[key][k]) cls += state.sim.fb[key][k].status === 'ok' ? ' ok' : ' err';
      dots += '<span class="' + cls + '">' + (k + 1) + '</span>';
    }

    let body = '';
    if (finished) {
      const fbs = state.sim.fb[key] || {};
      let score = 0, max = 0;
      const rows = Object.keys(fbs).sort().map(function (k, n) {
        const f = fbs[k];
        score += f.score; max += f.max;
        return '<div class="path-item"><span class="path-idx ' + (f.status === 'ok' ? 'ok' : 'err') + '">' + (n + 1) + '</span>'
          + '<div class="txt"><b>' + esc(f.title) + '</b><span class="note">' + esc(f.text) + '</span></div></div>';
      }).join('');
      const notes = sim.debrief(item, ans) || [];
      body = '<div class="fb fb-info"><h4>路径复盘 · 得分 ' + score + '/' + max + '</h4>'
        + '<div class="path-list">' + rows + '</div>'
        + '<div class="usage"><b>标准路径：</b>' + esc(STD_PATH[key]) + '</div></div>'
        + '<div style="margin-top:14px;padding:14px 16px;background:#f7f9fb;border:1px solid var(--line-2);border-radius:10px">'
        + '<h4 style="font-size:13px;margin-bottom:8px">关键数字</h4><ul style="margin:0;padding-left:18px;font-size:13.5px;color:var(--ink-2)">'
        + notes.map(n => '<li>' + esc(n) + '</li>').join('') + '</ul></div>'
        + '<div class="btn-row">'
        + '<button class="btn btn-primary" data-act="sim-next">' + (state.sim.idx < 2 ? '进入模拟 ' + SIM_KEYS[state.sim.idx + 1] : '完成') + '</button>'
        + '<button class="btn btn-ghost btn-sm" data-act="sim-restart">用一套新数据重做</button></div>';
    } else {
      let inputArea = '';
      if (step.type === 'choice') {
        const cur = ans[step.id];
        const opts = step.options.map(function (o, k) {
          let cls = 'option';
          if (!fb && cur === o.id) cls += ' sel';
          if (fb) { cls += ' dim'; if (cur === o.id) cls = 'option ' + (fb.status === 'ok' ? 'correct' : 'wrongpick'); }
          return '<button class="' + cls + '" data-act="sim-pick" data-id="' + o.id + '" ' + (fb ? 'disabled' : '') + '>'
            + '<span class="k">' + 'ABCDE'[k] + '</span><span class="body">' + esc(o.text) + '</span></button>';
        }).join('');
        inputArea = '<div class="options">' + opts + '</div>';
      } else {
        const d = state.sim.draft && state.sim.draft[key + step.id] || {};
        inputArea = '<div class="blank-list">' + step.fields.map(f =>
          '<div class="blank-row"><div class="blank-label"><span class="blank-name">' + esc(f.label) + '</span>'
          + (f.hint && !fb
              ? '<details class="hint-pop"><summary class="hint-toggle" title="查看公式提示" aria-label="查看公式提示">?</summary><span class="hint-text">' + esc(f.hint) + '</span></details>'
              : '')
          + '</div>'
          + '<input class="blank-input" data-simfield="' + f.key + '" value="' + esc(d[f.key] || '') + '" placeholder="—" ' + (fb ? 'disabled' : '') + '>'
          + '<span class="blank-unit">' + esc(f.unit) + '</span></div>').join('') + '</div>';
      }

      let fbHtml = '';
      if (fb) {
        const cls = fb.status === 'ok' ? 'fb-ok' : fb.status === 'bad' ? 'fb-bad' : 'fb-warn';
        const icon = fb.status === 'ok' ? '✓' : fb.status === 'bad' ? '✗' : '!';
        fbHtml = '<div class="fb ' + cls + '"><h4>' + icon + ' ' + esc(fb.title) + '</h4><div>' + esc(fb.text) + '</div>'
          + (fb.steps && fb.steps.length ? '<div class="steps">' + fb.steps.map(s => esc(s)).join('<br>') + '</div>' : '')
          + (fb.detail ? '<div class="usage">' + esc(fb.detail) + '</div>' : '') + '</div>';
      }

      body = '<div class="card-head"><span class="pill pill-dim">模拟 ' + key + '</span>'
        + '<span style="font-size:13px;color:var(--muted)">' + esc(sim.tagline) + '</span>'
        + '<span class="spacer"></span><div class="sim-steps">' + dots + '</div></div>'
        + '<div class="stepline">STEP ' + (stepIdx + 1) + ' / ' + totalSteps + '<span class="arrow">›</span>' + esc(step.type === 'choice' ? '选择判断' : '数值录入') + '</div>'
        + '<div class="stem">' + esc(step.prompt.replace('{T}', item.data.lead ? (item.data.lead + item.data.ship) : '')) + '</div>'
        + inputArea + fbHtml
        + '<div class="btn-row">'
        + (fb ? '<button class="btn btn-primary" data-act="sim-go">下一步 →</button>'
              : '<button class="btn btn-primary" data-act="sim-submit">提交这一步</button>')
        + '<span class="spacer"></span><span style="font-size:12px;color:var(--muted)">每一步都会立即判分</span></div>';
    }

    viewport.innerHTML = '<div class="page-head"><button class="link-btn" data-act="home">← 返回</button>'
      + '<h2>' + esc(item.title) + '</h2><p>模拟 ' + (state.sim.idx + 1) + ' / 3 · ' + esc(dimName(item.dim)) + '</p></div>'
      + '<div class="disc"><span>⚠</span><div><b>模拟数据，用于练习决策链路，非真实业绩。</b>本组参数由种子 ' + state.seed + ' 随机生成。</div></div>'
      + '<div class="card">' + simOverview(key, item) + body + '</div>';
  }

  /* ============================================================
     9. 系统知识库（渲染交给 js/study.js，这里只做挂载）
     ============================================================ */
  function renderKB() {
    viewport.innerHTML = KB.render();
    KB.afterRender();
  }
  /* 界面实操模拟（v3-ui 测试版）：状态挂在 state.ui，渲染与判定都在 ui-sim.js */
  function renderUISim() {
    if (!window.UISIM) { viewport.innerHTML = '<div class="uis-page"><p>界面模拟模块未加载。</p></div>'; return; }
    UISIM.save = save;
    UISIM.__st = function () { return state.ui; };
    /* 让模块在不经过 app 的情况下也能局部重绘（行内操作菜单用） */
    UISIM.rerender = function () { save(); viewport.innerHTML = UISIM.render(state.ui); };
    viewport.innerHTML = UISIM.render(state.ui);
  }

  /* study.js 里的搜索框 / 目录点击会回调这里重绘 */
  window.__kbRerender = function () {
    if (state.screen === 'kb') renderKB();
  };

  /* ============================================================
     10. 渲染分发
     ============================================================ */
  function render() {
    const s = state.screen;
    if (s === 'exam-config') renderExamConfig();
    else if (s === 'exam-run') renderExamRun();
    else if (s === 'exam-result') renderExamResult();
    else if (s === 'quiz-config') renderQuizConfig();
    else if (s === 'quiz-run') renderQuizRun();
    else if (s === 'quiz-stats') renderQuizStats();
    else if (s === 'kb') renderKB();
    else if (s === 'uis') renderUISim();
    else if (s === 'sim') renderSim();
    else renderWelcome();

    /* 防伪水印：答题页 + 知识库 + 逐题解析页（结果页内容最密，最容易被截图倒卖） */
    document.body.classList.toggle('wm-on',
      s === 'exam-run' || s === 'exam-result' ||
      s === 'quiz-run' || s === 'quiz-stats' || s === 'kb' || s === 'uis');

    /* 界面模拟需要更宽的画布 */
    viewport.classList.toggle('viewport-wide', s === 'uis');

    setupTimer();
    /* 知识库要保留锚点滚动位置；界面模拟重绘频繁，也不强制回顶 */
    if (s !== 'exam-run' && s !== 'kb' && s !== 'uis') window.scrollTo(0, 0);
  }

  function go(screen) { state.screen = screen; save(); render(); }

  /* ============================================================
     10. 事件
     ============================================================ */
  document.addEventListener('click', function (e) {
    /* 点击提示气泡以外的地方，自动收起所有「?」提示 */
    if (!e.target.closest('.hint-pop')) {
      document.querySelectorAll('.hint-pop[open]').forEach(function (d) { d.open = false; });
    }

    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    const v = el.dataset.v;

    /* --- 导航 --- */
    if (act === 'home') { go('welcome'); return; }
    if (act === 'go-exam') { go('exam-config'); return; }
    if (act === 'go-quiz') { go('quiz-config'); return; }
    if (act === 'go-sim') { go('sim'); return; }
    if (act === 'go-uis') { state.ui.sid = ''; go('uis'); return; }
    /* 界面实操模拟：全部动作委托给 UISIM */
    if (act.indexOf('uis-') === 0) {
      if (window.UISIM && UISIM.act(act, el, state.ui)) { save(); render(); }
      return;
    }
    if (act === 'go-kb') { KB.jump('ch1', ''); go('kb'); return; }
    if (act === 'kb-go') { KB.jump(el.dataset.ch, el.dataset.sec); go('kb'); return; }
    if (act === 'kb-quiz') {
      state.quiz.module = el.dataset.mod || 'all';
      state.quiz.count = 10;
      startQuiz('module'); return;
    }
    if (act === 'reset-all') {
      if (confirm('将清空本地所有考试与刷题记录，确定？')) { LS.del(KEY); state = fresh(); render(); }
      return;
    }

    /* --- 考试配置 --- */
    if (act === 'cfg-count') { state.exam.cfg.count = +v; save(); render(); return; }
    if (act === 'cfg-minutes') { state.exam.cfg.minutes = +v; save(); render(); return; }
    if (act === 'cfg-type') {
      const arr = state.exam.cfg.types.slice();
      const p = arr.indexOf(v);
      if (p > -1) arr.splice(p, 1); else arr.push(v);
      state.exam.cfg.types = arr; save(); render(); return;
    }
    if (act === 'exam-start') { startExam(); return; }
    if (act === 'exam-resume') { state.screen = 'exam-run'; save(); render(); return; }
    if (act === 'exam-discard') {
      if (confirm('放弃这场考试？已作答内容会清空。')) {
        state.exam.running = false; state.exam.submitted = false;
        state.exam.items = []; state.exam.ans = {}; state.exam.idx = 0;
        save(); render();
      }
      return;
    }

    /* --- 考试作答 --- */
    if (act === 'exam-prev') { state.exam.idx = Math.max(0, state.exam.idx - 1); save(); render(); return; }
    if (act === 'exam-next') { state.exam.idx = Math.min(state.exam.items.length - 1, state.exam.idx + 1); save(); render(); return; }
    if (act === 'exam-jump') { state.exam.idx = +v; save(); render(); return; }
    if (act === 'exam-submit') { submitExam(false); return; }
    if (act === 'exam-leave') {
      if (confirm('暂离不会停止倒计时，时间照走。确定离开？')) go('welcome');
      return;
    }
    if (act === 'exam-again') {
      state.exam.submitted = false; state.exam.running = false;
      state.exam.items = []; state.exam.ans = {}; state.exam.idx = 0;
      go('exam-config'); return;
    }

    /* --- 选择题选项 --- */
    if (act === 'pick') {
      const qid = el.dataset.qid, q = QB.get(qid), id = el.dataset.id;
      const b = bucket();
      let cur = Array.isArray(b[qid]) ? b[qid].slice() : [];
      if (q.type === 'multi') {
        const p = cur.indexOf(id);
        if (p > -1) cur.splice(p, 1); else cur.push(id);
      } else {
        cur = cur[0] === id ? [] : [id];
      }
      b[qid] = cur; save(); render(); return;
    }

    /* --- 自评勾选 / 展开答案（考试与刷题共用） --- */
    if (act === 'self-check') {
      const qid = el.dataset.qid, k = +el.dataset.k, q = QB.get(qid);
      const it = QB.inst(q, state);
      const list = q.type === 'case' ? it.checklist : q.src.checklist;
      const b = bucket();
      const cur = b[qid] ? Object.assign({ text: '', checked: [] }, b[qid]) : { text: '', checked: [] };
      if (!cur.checked || !cur.checked.length) cur.checked = list.map(() => false);
      while (cur.checked.length < list.length) cur.checked.push(false);
      cur.checked[k] = !cur.checked[k];
      b[qid] = cur; save(); render(); return;
    }
    if (act === 'qref') {
      const qid = el.dataset.qid;
      const box = state.screen.indexOf('exam') === 0 ? state.exam.refOpen : state.quiz.refOpen;
      box[qid] = !box[qid]; save(); render(); return;
    }

    /* --- 刷题 --- */
    if (act === 'quiz-module') { state.quiz.module = v; save(); render(); return; }
    if (act === 'quiz-count') { state.quiz.count = +v; save(); render(); return; }
    if (act === 'quiz-start') { startQuiz('module'); return; }
    if (act === 'quiz-start-wrong') { startQuiz('wrong'); return; }
    if (act === 'quiz-start-review') { startQuiz('review'); return; }
    if (act === 'quiz-prev') { state.quiz.idx = Math.max(0, state.quiz.idx - 1); save(); render(); return; }
    if (act === 'quiz-next') { state.quiz.idx = Math.min(state.quiz.items.length - 1, state.quiz.idx + 1); save(); render(); return; }
    if (act === 'quiz-submit') {
      const q = curMeta(), id = q.id;
      const r = QB.judge(q, state, state.quiz.ans[id]);
      if (!QB.isAnswered(q, state.quiz.ans[id]) && q.type === 'short') { alert('先写几句再提交。'); return; }
      state.quiz.revealed[id] = true;
      /* 答错的客观题自动进全局错题本；错题重练模式下答对则自动移出 */
      recordAnswer(q, state.quiz.ans[id], r, state.quiz.mode === 'wrong' ? 'retry' : 'quiz');
      if (r.auto && r.score < r.max && state.quiz.wrong.indexOf(id) < 0) state.quiz.wrong.push(id);
      save(); render(); return;
    }
    if (act === 'quiz-wrongbook') {
      const id = curMeta().id;
      const p = state.book.wrong.indexOf(id);
      if (p > -1) state.book.wrong.splice(p, 1); else state.book.wrong.push(id);
      save(); render(); return;
    }
    if (act === 'quiz-unwrong') {
      const p = state.book.wrong.indexOf(v);
      if (p > -1) state.book.wrong.splice(p, 1);
      save(); render(); return;
    }
    if (act === 'quiz-open') {
      if (state.quiz.items.indexOf(v) < 0) state.quiz.items.unshift(v);
      state.quiz.idx = state.quiz.items.indexOf(v);
      state.quiz.revealed[v] = false;
      state.screen = 'quiz-run'; save(); render(); return;
    }
    if (act === 'quiz-stats') { go('quiz-stats'); return; }
    if (act === 'quiz-restart') { startQuiz('module'); return; }

    /* --- 模拟 --- */
    if (act === 'sim-pick') {
      const key = SIM_KEYS[state.sim.idx];
      const item = state.sim.items[key];
      state.sim.ans[key][item.steps[state.sim.step].id] = el.dataset.id;
      save(); render(); return;
    }
    if (act === 'sim-submit') { submitSim(); return; }
    if (act === 'sim-go') {
      const key = SIM_KEYS[state.sim.idx];
      const item = state.sim.items[key];
      state.sim.step++;
      if (state.sim.step >= item.steps.length) state.sim.done[key] = true;
      save(); render(); return;
    }
    if (act === 'sim-next') {
      if (state.sim.idx < 2) { state.sim.idx++; state.sim.step = 0; save(); render(); }
      else go('welcome');
      return;
    }
    if (act === 'sim-restart') {
      const key = SIM_KEYS[state.sim.idx];
      delete state.sim.items[key]; delete state.sim.ans[key];
      delete state.sim.fb[key]; delete state.sim.done[key];
      state.sim.step = 0; save(); render(); return;
    }
  });

  function submitSim() {
    const key = SIM_KEYS[state.sim.idx];
    const stepIdx = state.sim.step;
    const sim = SIMS[key], item = state.sim.items[key];
    const step = item.steps[stepIdx];

    if (step.type === 'choice') {
      const ans = state.sim.ans[key][step.id];
      if (!ans) return;
      state.sim.fb[key][stepIdx] = sim.judge(step, ans, item, state.sim.ans[key]);
    } else {
      state.sim.draft = state.sim.draft || {};
      const d = state.sim.draft[key + step.id] || {};
      const payload = {};
      step.fields.forEach(f => { payload[f.key] = d[f.key] || ''; });
      if (step.fields.some(f => !String(payload[f.key]).trim())) return;
      state.sim.ans[key][step.id] = payload;
      state.sim.fb[key][stepIdx] = sim.judge(step, payload, item, state.sim.ans[key]);
    }
    save(); render();
  }

  /* 输入后同步「提交并看解析」按钮的可用状态（输入不重绘，只能局部改） */
  function syncSubmitBtn() {
    const btn = document.querySelector('[data-act="quiz-submit"]');
    if (!btn) return;
    const q = curMeta();
    if (!q) return;
    if (q.type === 'short' || q.type === 'case') { btn.disabled = false; return; }
    btn.disabled = !QB.isAnswered(q, bucket()[q.id]);
  }

  /* 输入实时保存 */
  document.addEventListener('input', function (e) {
    const t = e.target;

    if (t.dataset.blank !== undefined && t.dataset.qid) {
      const b = bucket();
      b[t.dataset.qid] = Object.assign({}, b[t.dataset.qid] || {});
      b[t.dataset.qid][t.dataset.blank] = t.value;
      save(); syncSubmitBtn(); return;
    }

    if (t.dataset.act === 'qtext' && t.dataset.qid) {
      const qid = t.dataset.qid, b = bucket();
      const cur = b[qid] ? Object.assign({ text: '', checked: [] }, b[qid]) : { text: '', checked: [] };
      cur.text = t.value;
      b[qid] = cur; save(); syncSubmitBtn(); return;
    }

    if (t.dataset.simfield !== undefined) {
      const key = SIM_KEYS[state.sim.idx];
      const item = state.sim.items[key];
      const step = item.steps[state.sim.step];
      const slot = key + step.id;
      state.sim.draft = state.sim.draft || {};
      state.sim.draft[slot] = state.sim.draft[slot] || {};
      state.sim.draft[slot][t.dataset.simfield] = t.value;
      save(); return;
    }
  });

  /* 刷新后若已超时，自动交卷 */
  (function bootCheck() {
    const t = state.exam;
    if (t.running && !t.submitted && t.endsAt && Date.now() > t.endsAt) {
      t.submitted = true; t.running = false;
      t.usedMs = t.endsAt - t.startedAt;
      state.screen = 'exam-result';
      save();
    }
  })();

  render();
})();
