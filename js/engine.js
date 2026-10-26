/* ============================================================
   v2 引擎 · 题库注册 / 运行时实例 / 判分 / 单题卡片渲染
   ------------------------------------------------------------
   设计原则：
   1. 判分口径**完全沿用 v1**（F.closeTo 容差、多选 hit − wrong、
      简答只记要点自评覆盖率），不重写判分逻辑。
   2. 只是把「渲染」从「页面」里拆出来，让「考试」与「刷题」两种
      模式复用同一张单题卡片。
   3. 题目元信息统一：id / type / topic / dim / layer / diff，
      后续阶段新增题目（含 topic: 'basic'、'listing'、'ads' …）
      只要往 data.js 里加对象，这里无需改动。
   ============================================================ */
(function () {
  const DATA = window.DATA, R = window.R, F = window.F;

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const KIND_LABEL = {
    correct:   { t: '正确动作',   c: 'pill-ok' },
    assistant: { t: '助理会先做', c: 'pill-dim' },
    order:     { t: '顺序不对',   c: 'pill-warn' },
    wrong:     { t: '方向不对',   c: 'pill-bad' }
  };

  const TYPE_LABEL = { fill: '填空', single: '单选', multi: '多选', short: '简答', case: '案例', sim: '模拟' };

  /* ---------- 1. 注册表 ---------- */
  const LIST = [], byId = {};

  function reg(meta) { LIST.push(meta); byId[meta.id] = meta; }

  (DATA.FILL || []).forEach(function (t, i) {
    reg({
      id: t.id || ('F' + (i + 1)), type: 'fill',
      topic: t.topic || 'metrics', dim: t.dim, layer: t.layer,
      diff: t.difficulty || 1, title: t.title, src: t
    });
  });

  (DATA.MCQ || []).forEach(function (q) {
    reg({
      id: q.id, type: q.type === 'multi' ? 'multi' : 'single',
      topic: q.topic || q.dim, dim: q.dim, layer: q.layer,
      diff: q.difficulty || (q.layer === 'base' ? 1 : 2),
      title: q.stem.length > 26 ? q.stem.slice(0, 26) + '…' : q.stem, src: q
    });
  });

  (DATA.SHORT || []).forEach(function (q) {
    reg({
      id: q.id, type: 'short',
      topic: q.topic || q.dim, dim: q.dim, layer: q.layer,
      diff: q.difficulty || 2, title: q.title, src: q
    });
  });

  (DATA.CASE || []).forEach(function (q, i) {
    reg({
      id: q.id || ('C' + (i + 1)), type: 'case',
      topic: q.topic || q.dim, dim: q.dim, layer: q.layer,
      diff: q.difficulty || 3, title: q.title || ('案例复盘 ' + (i + 1)), src: q
    });
  });

  /* ---------- 2. 运行时实例 ---------- */
  /* 填空与案例带随机参数，必须 build 一次后存进 state，刷新才能保持一致 */
  function inst(q, state) {
    if (q.type === 'fill' || q.type === 'case') {
      if (!state.inst[q.id]) state.inst[q.id] = q.src.build();
      return state.inst[q.id];
    }
    return q.src;
  }

  /* 选项顺序打乱后固定，避免刷新跳位 */
  function order(q, state) {
    if (q.type !== 'single' && q.type !== 'multi') return [];
    if (!state.ord[q.id]) state.ord[q.id] = R.shuffle(q.src.options.map(o => o.id));
    return state.ord[q.id];
  }

  /* ---------- 3. 判分（沿用 v1 口径） ---------- */
  function isAnswered(q, ans) {
    if (!ans) return false;
    if (q.type === 'fill') return Object.keys(ans).some(k => String(ans[k] || '').trim() !== '');
    if (q.type === 'single' || q.type === 'multi') return Array.isArray(ans) && ans.length > 0;
    return String(ans.text || '').trim() !== '';
  }

  function judge(q, state, ans) {
    if (q.type === 'fill') {
      const it = inst(q, state), draft = ans || {};
      const ok = []; let s = 0;
      it.blanks.forEach(function (b) {
        const good = F.closeTo(F.parseNum(draft[b.key]), b.value, b.unit);
        ok.push(good); if (good) s++;
      });
      return { score: s, max: it.blanks.length, ok: ok, auto: true, answered: isAnswered(q, ans) };
    }

    if (q.type === 'single' || q.type === 'multi') {
      const picked = Array.isArray(ans) ? ans.slice() : [], A = q.src.answer;
      const hit = picked.filter(p => A.indexOf(p) > -1).length;
      const wrong = picked.filter(p => A.indexOf(p) < 0).length;
      return { score: Math.max(0, hit - wrong), max: A.length, picked: picked, auto: true, answered: picked.length > 0 };
    }

    /* 简答 / 案例：不判语义，只记自评覆盖率 */
    const arr = (ans && ans.checked) || [];
    const cover = arr.filter(Boolean).length;
    const max = (q.src.checklist || []).length || 1;
    return { score: cover, max: max, auto: false, answered: isAnswered(q, ans) || cover > 0, cover: cover };
  }

  /* ---------- 4. 卡片渲染 ---------- */
  function layerPill(l) {
    return l === 'base'
      ? '<span class="pill pill-base">基础层</span>'
      : '<span class="pill pill-ops">运营层</span>';
  }

  function typePill(t) {
    const map = { fill: 'pill-base', single: 'pill-ops', multi: 'pill-ops', short: 'pill-dim', case: 'pill-dim' };
    return '<span class="pill ' + (map[t] || 'pill-dim') + '">' + (TYPE_LABEL[t] || t) + '</span>';
  }

  function kvBox(kv) {
    if (!kv || !kv.length) return '';
    return '<div class="data-box"><div class="kv">'
      + kv.map(p => '<span>' + esc(p[0]) + ' <b>' + esc(p[1]) + '</b></span>').join('')
      + '</div></div>';
  }

  function tableBox(tb) {
    if (!tb) return '';
    return '<table class="tb"><thead><tr>'
      + tb.head.map(h => '<th>' + esc(h) + '</th>').join('')
      + '</tr></thead><tbody>'
      + tb.rows.map(r => '<tr>' + r.map((c, k) => '<td' + (k > 0 ? ' class="num"' : '') + '>' + esc(c) + '</td>').join('') + '</tr>').join('')
      + '</tbody></table>';
  }

  /* 答错时给一个跳去知识库的回链（阶段 5 联动，不改变任何判分口径） */
  function kbLink(q, res) {
    if (!window.KB || !res || !res.auto) return '';
    if (!res.answered || res.score === res.max) return '';
    const t = window.KB.linkFor(q);
    if (!t || !t.ch) return '';
    return '<button class="kb-link" data-act="kb-go" data-ch="' + t.ch + '" data-sec="' + t.sec + '">'
      + '📖 去知识库复习此考点 →<span>' + esc(t.chTitle) + ' · ' + esc(t.secTitle) + '</span></button>';
  }

  /* --- 填空 --- */
  function cardFill(q, state, o) {
    const it = inst(q, state), ans = o.ans || {}, res = o.res, locked = o.phase !== 'input';

    let blanks = '';
    it.blanks.forEach(function (b, k) {
      const v = ans[b.key] || '';
      const cls = res ? (res.ok[k] ? ' ok' : ' bad') : '';
      const tip = (b.hint && !o.showFb)
        ? '<details class="hint-pop"><summary class="hint-toggle" title="查看公式提示" aria-label="查看公式提示">?</summary>'
          + '<span class="hint-text">' + esc(b.hint) + '</span></details>'
        : '';
      blanks += '<div class="blank-row' + cls + '">'
        + '<div class="blank-label"><span class="blank-name">' + esc(b.label) + '</span>' + tip + '</div>'
        + '<input class="blank-input" data-qid="' + q.id + '" data-blank="' + b.key + '" value="' + esc(v) + '" placeholder="—" ' + (locked ? 'disabled' : '') + '>'
        + '<span class="blank-unit">' + esc(b.unit) + '</span></div>';
    });

    let fb = '';
    if (res && o.showFb) {
      const full = res.score === res.max;
      fb = '<div class="fb ' + (full ? 'fb-ok' : 'fb-bad') + '">'
        + '<h4>' + (full ? '✓ 全部正确' : '✗ 答对 ' + res.score + '/' + res.max + ' 空') + ' ' + layerPill(q.layer) + '</h4>'
        + '<div class="steps">' + (it.steps || []).map(s => esc(s)).join('<br>') + '</div>'
        + '<div class="usage"><b>这个指标用来干什么：</b>' + esc(it.usage) + '</div>'
        + (it.caveat ? '<div class="usage" style="border-top:none;padding-top:4px"><b>口径提示：</b>' + esc(it.caveat) + '</div>' : '')
        + kbLink(q, res)
        + '</div>';
    }

    return '<div class="stem">' + esc(it.scene) + '</div>'
      + kvBox(it.kv)
      + '<div class="blank-list">' + blanks + '</div>' + fb;
  }

  /* --- 单选 / 多选 --- */
  function cardChoice(q, state, o) {
    const src = q.src, ord = order(q, state);
    const picked = Array.isArray(o.ans) ? o.ans : [], res = o.res;
    const locked = o.phase !== 'input';

    const opts = ord.map(function (id, k) {
      const op = src.options.find(x => x.id === id);
      const isRight = src.answer.indexOf(id) > -1;
      const isPicked = picked.indexOf(id) > -1;
      let cls = 'option', mark = '';
      if (res && o.showFb) {
        if (isRight) { cls += ' correct'; mark = '<span class="mark">✓ 正确</span>'; }
        else if (isPicked) { cls += ' wrongpick'; mark = '<span class="mark">✗ 你选的</span>'; }
        else cls += ' dim';
      } else if (isPicked) cls += ' sel';
      return '<button class="' + cls + '" data-act="pick" data-qid="' + q.id + '" data-id="' + id + '" ' + (locked ? 'disabled' : '') + '>'
        + '<span class="k">' + 'ABCDEF'[k] + '</span>'
        + '<span class="body">' + esc(op.text) + mark + '</span></button>';
    }).join('');

    let fb = '';
    if (res && o.showFb) {
      const full = res.score === res.max;
      const list = ord.map(function (id) {
        const op = src.options.find(x => x.id === id);
        const kd = KIND_LABEL[op.kind] || KIND_LABEL.wrong;
        const hit = src.answer.indexOf(id) > -1;
        const mis = picked.indexOf(id) > -1 && !hit;
        return '<div style="padding:8px 0;border-bottom:1px dashed rgba(0,0,0,.08)">'
          + '<span class="pill ' + kd.c + '" style="font-size:10px">' + kd.t + '</span>'
          + '<span style="margin-left:8px;font-weight:' + (hit || mis ? 650 : 400) + ';color:' + (hit ? '#0a5c45' : mis ? '#8d2a20' : 'inherit') + '">' + esc(op.text) + '</span>'
          + '<div style="color:#5b6876;font-size:12.5px;margin-top:4px">' + esc(op.note || '') + '</div></div>';
      }).join('');
      fb = '<div class="fb ' + (full ? 'fb-ok' : 'fb-bad') + '">'
        + '<h4>' + (full ? '✓ 判断正确' : '✗ 判断有偏差') + ' · 得分 ' + res.score + '/' + res.max + ' ' + layerPill(q.layer) + '</h4>'
        + '<div style="margin-bottom:6px"><b>逐项拆解：</b></div>' + list
        + '<div class="usage"><b>本题要点：</b>' + esc(src.summary) + '</div>'
        + kbLink(q, res) + '</div>';
    }

    return '<div class="stem">' + esc(src.stem) + '</div>'
      + '<div class="options">' + opts + '</div>' + fb;
  }

  /* --- 简答 --- */
  function cardShort(q, state, o) {
    const src = q.src;
    const ans = o.ans || {};
    const draft = ans.text || '';
    const checked = ans.checked || src.checklist.map(() => false);
    const cover = checked.filter(Boolean).length;
    const reveal = o.showFb;

    let body = '<div class="stem">' + esc(src.prompt) + '</div>'
      + '<textarea class="write" data-act="qtext" data-qid="' + q.id + '" placeholder="按“我的判断 → 依据 → 我会怎么做 → 我的退出条件”的结构写，4–6 句即可。" ' + (o.phase !== 'input' ? 'disabled' : '') + '>' + esc(draft) + '</textarea>';

    if (reveal) {
      const checks = src.checklist.map((c, k) => '<div class="check-item' + (checked[k] ? ' on' : '') + '" data-act="self-check" data-qid="' + q.id + '" data-k="' + k + '">'
        + '<span class="check-box">' + (checked[k] ? '✓' : '') + '</span><span>' + esc(c) + '</span></div>').join('');
      body += '<div class="section-title" style="margin-top:20px">评分要点（对照你写的，勾选实际覆盖到的）</div>'
        + '<div class="check-list">' + checks + '</div>'
        + '<div style="font-size:12.5px;color:var(--muted);margin-top:8px">自评覆盖率：<b style="color:var(--brand-2)">' + cover + '/' + src.checklist.length + '</b>（' + Math.round(cover / src.checklist.length * 100) + '%）</div>'
        + '<div class="refbox"><h4>参考答案</h4>'
        + (o.showRef
          ? '<div>' + esc(src.reference) + '</div>' + (src.pitfalls ? '<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #dfe6ee;color:#8a6414"><b>常见失分点：</b>' + esc(src.pitfalls) + '</div>' : '')
          : '<button class="btn btn-ghost btn-sm" data-act="qref" data-qid="' + q.id + '">展开参考答案</button>')
        + '</div>';
    }
    return body;
  }

  /* --- 案例复盘 --- */
  function cardCase(q, state, o) {
    const it = inst(q, state), src = q.src;
    const ans = o.ans || {};
    const draft = ans.text || '';
    const checked = ans.checked || it.checklist.map(() => false);
    const cover = checked.filter(Boolean).length;
    const reveal = o.showFb;

    let body = '<div class="stem">' + esc(it.scene) + '</div>'
      + kvBox(it.kv) + tableBox(it.table);

    if (reveal) {
      const checks = it.checklist.map((c, k) => '<div class="check-item' + (checked[k] ? ' on' : '') + '" data-act="self-check" data-qid="' + q.id + '" data-k="' + k + '">'
        + '<span class="check-box">' + (checked[k] ? '✓' : '') + '</span><span>' + esc(c) + '</span></div>').join('');
      body += '<div class="section-title" style="margin-top:18px">自评要点</div>'
        + '<div class="check-list">' + checks + '</div>'
        + '<div style="font-size:12.5px;color:var(--muted);margin-top:8px">覆盖率：<b style="color:var(--brand-2)">' + cover + '/' + it.checklist.length + '</b>（' + Math.round(cover / it.checklist.length * 100) + '%）</div>'
        + '<div class="refbox"><h4>参考答案</h4>'
        + (o.showRef ? '<div>' + esc(it.reference) + '</div>'
          : '<button class="btn btn-ghost btn-sm" data-act="qref" data-qid="' + q.id + '">展开参考答案</button>')
        + '</div>';
    }

    body += '<div class="section-title" style="margin-top:20px">你的复盘（3–5 句）</div>'
      + '<textarea class="write" data-act="qtext" data-qid="' + q.id + '" placeholder="1) 问题定位（引用具体数字 + 指出层级）2) 本周动作 3) 下周 1 个最高优先级动作" ' + (o.phase !== 'input' ? 'disabled' : '') + '>' + esc(draft) + '</textarea>';

    return body;
  }

  function card(q, state, o) {
    o = o || {};
    if (q.type === 'fill') return cardFill(q, state, o);
    if (q.type === 'single' || q.type === 'multi') return cardChoice(q, state, o);
    if (q.type === 'short') return cardShort(q, state, o);
    if (q.type === 'case') return cardCase(q, state, o);
    return '<div class="stem">该题型不支持卡片渲染。</div>';
  }

  /* ---------- 5. 对外 ---------- */
  window.QB = {
    all: () => LIST.slice(),
    get: id => byId[id],
    inst: inst,
    order: order,
    judge: judge,
    isAnswered: isAnswered,
    card: card,
    kv: kvBox,
    table: tableBox,
    esc: esc,
    layerPill: layerPill,
    typePill: typePill,
    TYPE_LABEL: TYPE_LABEL,
    KIND_LABEL: KIND_LABEL,
    DIMS: DATA.DIMS
  };
})();
