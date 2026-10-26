/* ============================================================
   题型 4 · 随机数据模拟实操
   A 广告异常诊断 / B 补货与资金 / C 新品定价与利润
   设计原则：每步提交后立即给路径反馈，不攒到最后
   ============================================================ */
(function () {
  const R = window.R, F = window.F;

  /* ---------- 工具 ---------- */
  function cmp(user, ans, unit) {
    const n = F.parseNum(user);
    return F.closeTo(n, ans, unit);
  }
  function num(v, d) { return Number(v).toFixed(d === undefined ? 0 : d); }

  /* ============================================================
     模拟 A：广告异常诊断与处理（4 步）
     ============================================================ */
  const A = {
    key: 'A',
    title: '广告异常诊断与处理',
    dim: 'ads',
    layer: 'base',
    tagline: '看报表 → 定层级 → 出动作 → 报预期',
    build: function () {
      const dir = R.pick(['broad', 'ctr', 'cvr', 'cost']);
      const price = R.pick([24.99, 29.99, 34.99, 39.99]);
      const margin = R.range(0.24, 0.38, 2);
      const camp = {
        broad: '自动广告 · 四匹配全开',
        ctr: '手动精准 · 核心词',
        cvr: '手动精准 · 核心词',
        cost: '手动词组 · 拓词'
      }[dir];

      const i0 = R.int(22, 40) * 1000;
      const ctr0 = R.range(0.0036, 0.0046);
      const c0 = Math.round(i0 * ctr0);
      const cvr0 = R.range(0.055, 0.09);
      const o0 = Math.max(4, Math.round(c0 * cvr0));
      const cpc0 = R.range(0.50, 0.90, 2);
      const s0 = Number((c0 * cpc0).toFixed(2));
      const as0 = Number((o0 * price).toFixed(2));

      const mod = {
        broad: { i: 1.95, ctr: 0.50, cvr: 0.93, cpc: 1.00 },
        ctr:   { i: 1.01, ctr: 0.46, cvr: 1.02, cpc: 1.00 },
        cvr:   { i: 1.05, ctr: 1.00, cvr: 0.46, cpc: 1.00 },
        cost:  { i: 1.12, ctr: 1.00, cvr: 1.04, cpc: 1.68 }
      }[dir];

      const i1 = Math.round(i0 * mod.i);
      const c1 = Math.round(i1 * (c0 / i0) * mod.ctr);
      const o1 = Math.max(1, Math.round(c1 * (o0 / c0) * mod.cvr));
      const cpc1 = Number((cpc0 * mod.cpc).toFixed(2));
      const s1 = Number((c1 * cpc1).toFixed(2));
      const as1 = Number((o1 * price).toFixed(2));

      const clue = {
        broad: '上周把该活动的宽泛匹配预算上调了 40%，本周曝光明显放大。',
        ctr: '类目头部竞品本周降价 15%，主图也换成了场景图。',
        cvr: '客服反馈：近 7 天新增 9 条差评，集中在“漏水”“盖子难拧”。',
        cost: '类目进入旺季，核心词竞价整体上涨，多个词的建议出价上浮。'
      }[dir];

      /* 干扰项：账户里还有一条健康活动，不该被连带调整 */
      const camp2 = R.pick(['手动精准 · 长尾词', '手动词组 · 场景词']);
      const acos2 = R.range(0.18, 0.26, 2);

      const acos0 = s0 / as0 * 100, acos1 = s1 / as1 * 100;
      const ctrP = c1 / i1 * 100, ctrQ = c0 / i0 * 100;
      const cvrP = o1 / c1 * 100, cvrQ = o0 / c0 * 100;

      return {
        key: 'A', title: '广告异常诊断与处理', dim: 'ads', layer: 'base',
        dir: dir,
        data: { price: price, margin: margin, camp: camp, i0: i0, i1: i1, c0: c0, c1: c1,
                o0: o0, o1: o1, s0: s0, s1: s1, as0: as0, as1: as1,
                cpc0: cpc0, cpc1: cpc1, acos0: acos0, acos1: acos1, clue: clue,
                camp2: camp2, acos2: acos2 },
        steps: [
          {
            id: 'S1', type: 'choice',
            prompt: '你是这个链接的运营。周一上午拿到上周报表，第一步先拉哪个？',
            options: [
              { id: 'a', text: '搜索词报告（Search Term Report）' },
              { id: 'b', text: '投放报告（Targeting Report）' },
              { id: 'c', text: '已购买商品报告（Purchased Product Report）' },
              { id: 'd', text: '业务报告 · 流量与转化（Business Report）' }
            ]
          },
          {
            id: 'S2', type: 'choice',
            prompt: '对比上周，异常已经很明显了。你把它归到哪一层？',
            options: [
              { id: 'a', text: '曝光端：展量不够，词没跑出去' },
              { id: 'b', text: '点击端：流量质量或展示吸引力出了问题' },
              { id: 'c', text: '转化端：人进来了但没下单' },
              { id: 'd', text: '成本端：流量是对的，但点击太贵' }
            ]
          },
          {
            id: 'S3', type: 'choice',
            prompt: '基于上面的层级判断，本周你执行的第一个动作是：',
            options: [
              { id: 'a', text: '对高花费、0 转化的泛词做精准否定，同时降泛词 bid' },
              { id: 'b', text: '对高转化词降 bid 5%–10%，把预算挪到长尾精准词' },
              { id: 'c', text: '改主图 / 标题 / 价格，先把点击吸引力修好' },
              { id: 'd', text: '改详情页（五点 / 图片 / QA / 评论），修转化' },
              { id: 'e', text: '关掉这个自动广告活动止损' },
              { id: 'f', text: '继续加词扩量，先把曝光池做大' },
              { id: 'g', text: '顺手把 ACOS ' + Math.round(acos2 * 100) + '% 的另一条活动也降 bid，一起控成本' }
            ]
          },
          {
            id: 'S4', type: 'choice',
            prompt: '如果动作做对了，你对下周 ACOS 的预期是：',
            options: [
              { id: 'a', text: '回落到毛利率附近或以下（约 ' + Math.round(margin * 100) + '% 上下）' },
              { id: 'b', text: '一周内能压到 15% 以内' },
              { id: 'c', text: '不会有变化，ACOS 由市场竞争决定' },
              { id: 'd', text: '会继续上升到 90% 以上' }
            ]
          }
        ]
      };
    },
    judge: function (step, ans, d, prev) {
      const dir = d.dir, margin = d.margin;
      const m = d.data;

      const rightLevel = { broad: 'b', ctr: 'b', cvr: 'c', cost: 'd' }[dir];
      const rightAction = { broad: 'a', ctr: 'c', cvr: 'd', cost: 'b' }[dir];

      if (step.id === 'S1') {
        if (ans === 'a') {
          return { score: 1, max: 1, status: 'ok', title: '定位起点正确',
            text: '搜索词报告是唯一能看到“钱花在哪个搜索词上”的报表。任何词层面的异常（泛词涌入、词不精准、某个词烧钱不出单）都必须先从这里看。',
            detail: '顺序：搜索词报告（看词）→ 投放报告（看结构）→ 已购买商品报告（看交叉销售）。' };
        }
        const map = {
          b: '投放报告看的是“你设的投放有没有跑量”，它能告诉你哪个投放组烧钱，但看不到具体是哪个搜索词在烧——定位会停在半层。',
          c: '已购买商品报告用于分析交叉销售和关联购买，属于“优化结构”阶段，不是异常定位的第一步。',
          d: '业务报告能看出总量与转化率的变化，但它不落到词级，看完你还是不知道该动哪个词。'
        };
        return { score: 0, max: 1, status: 'warn', title: '顺序偏了一步',
          text: map[ans] || '',
          detail: '在运营岗视角下，这不是“错”，而是“没有先定位就去看汇总”——汇总数据只能告诉你出事了，搜索词报告才能告诉你出在谁身上。' };
      }

      if (step.id === 'S2') {
        const label = { a: '曝光端', b: '点击端', c: '转化端', d: '成本端' };
        if (ans === rightLevel) {
          const why = {
            broad: '曝光涨了 ' + Math.round((m.i1 / m.i0 - 1) * 100) + '%、CTR 从 ' + F.pct(m.c0 / m.i0 * 100) + ' 掉到 ' + F.pct(m.c1 / m.i1 * 100) + '——流量变多但变“泛”，是典型的点击端问题。',
            ctr: '曝光基本持平、CTR 从 ' + F.pct(m.c0 / m.i0 * 100) + ' 掉到 ' + F.pct(m.c1 / m.i1 * 100) + '、CVR 没变——人在看但不愿点，问题在展示端，仍属点击端。',
            cvr: 'CTR 稳定在 ' + F.pct(m.c1 / m.i1 * 100) + '，CVR 从 ' + F.pct(m.o0 / m.c0 * 100) + ' 掉到 ' + F.pct(m.o1 / m.c1 * 100) + '——人点进来了但不买，是转化端。',
            cost: 'CTR 与 CVR 都没问题（' + F.pct(m.c1 / m.i1 * 100) + ' / ' + F.pct(m.o1 / m.c1 * 100) + '），但 CPC 从 ' + F.money(m.cpc0) + ' 涨到 ' + F.money(m.cpc1) + '——流量是对的，只是变贵了，是成本端。'
          }[dir];
          return { score: 1, max: 1, status: 'ok', title: '分层正确', text: why,
            detail: '先分层、再动手，是这个岗位最核心的思维习惯：层级决定动作，动作决定预算。' };
        }
        return { score: 0, max: 1, status: 'warn', title: '层级判断偏了（你选了' + label[ans] + '）',
          text: '再读一遍三个数的关系：曝光 ' + F.comma(m.i0) + '→' + F.comma(m.i1) + '，CTR ' + F.pct(m.c0 / m.i0 * 100) + '→' + F.pct(m.c1 / m.i1 * 100) + '，CVR ' + F.pct(m.o0 / m.c0 * 100) + '→' + F.pct(m.o1 / m.c1 * 100) + '，CPC ' + F.money(m.cpc0) + '→' + F.money(m.cpc1) + '。',
          detail: '哪个指标变化最剧烈，问题就在那一层。选错层级不会让你“做错事”，但会让你把力气花在不该动的地方。' };
      }

      if (step.id === 'S3') {
        if (ans === rightAction) {
          const txt = {
            broad: '泛词涌入的标准动作：精准否定高花费 0 转化的词，对保留的泛词降 bid，收紧宽泛匹配。这属于“先关水龙头再拖地”。',
            ctr: '词精准但 CTR 掉，问题在展示端——主图、标题、价格、评分。改这些，不要去降 bid，也不要去否词（词没错）。',
            cvr: '转化端问题只有一条路：修详情页（价格 / 五点 / 图片 / 评论 / QA / 库存显示）。这时候降 bid 是无效动作。',
            cost: '流量质量没问题时，才轮到成本端：高转化词降 bid 保排名，0 转化词否定，预算挪到便宜的长尾精准词。'
          }[dir];
          return { score: 1, max: 1, status: 'ok', title: '动作与层级对上了', text: txt,
            detail: '检验标准：这个动作能不能直接改变那个变化的指标？改不了，就是串线。' };
        }
        if (ans === 'e') {
          return { score: 0, max: 1, status: 'bad', title: '最后手段被提前用了',
            text: '关活动是整条动作链的终点：否词 → 降 bid → 缩预算 → 换匹配 → 才轮到关。现在就关，你既没拿到可归因的结论，也丢掉了数据积累和 listing 权重。',
            detail: '在运营岗视角下，这个动作的问题不是“错”，而是“顺序不对”——它把不可逆的动作放在了最前面。' };
        }
        if (ans === 'g') {
          return { score: 0, max: 1, status: 'warn', title: '动了不该动的活动',
            text: '另一条活动（' + d.data.camp2 + '）本周 ACOS ' + F.pct(d.data.acos2 * 100) + '，在毛利率 ' + F.pct(margin * 100) + ' 的覆盖范围内，属于健康水位。连带降它的 bid，会把本来赚钱的流量一起压掉。',
            detail: '运营岗的调整原则是“定点修正”，不是“全账户一起收紧”。动之前先确认：这个活动的指标真的异常吗？' };
        }
        if (ans === 'f') {
          return { score: 0, max: 1, status: 'bad', title: '方向反了',
            text: '异常还没定位就扩量，等于把不可控的流量放大。ACOS 已经在涨，加词只会让亏损同步放大。',
            detail: '扩量是“确认模型健康之后”的动作，不是止血动作。' };
        }
        const cross = {
          a: '你选了否词，但这次的异常不在“词不精准”上。否词会误杀有效流量，也解释不了 CTR/CVR 的变化。',
          b: '你选了降 bid，但降 bid 只减少曝光，不会改变“点进来的人为什么买/不买”。这是把成本动作套在了非成本问题上。',
          c: '你选了改展示端，但这次的指标变化不是展示吸引力造成的。改图能提 CTR，救不了转化或成本问题。',
          d: '你选了改详情页，但这次的瓶颈不在详情页。详情页动作周期长（2–4 周才看得出），用错地方会白白错过窗口。'
        };
        return { score: 0, max: 1, status: 'warn', title: '动作串线了',
          text: cross[ans] || '',
          detail: '三通道口诀：CTR 管流量质量（词 + 展示）｜CVR 管详情页｜bid 管成本。三条线不能串。' };
      }

      if (step.id === 'S4') {
        if (ans === 'a') {
          return { score: 1, max: 1, status: 'ok', title: '预期合理',
            text: '动作对路的话，ACOS 应该回到毛利率附近（本场景毛利率 ' + F.pct(margin * 100) + '）。注意是“附近或以下”，不是“立刻很低”——否词和降 bid 的效果通常要 3–7 天才稳定。',
            detail: '报预期时给区间 + 时间窗，比给一个精确数字更专业。' };
        }
        if (ans === 'd') {
          return { score: 0, max: 1, status: 'warn', title: '对动作效果过于悲观',
            text: '如果定位准确、动作对路，ACOS 不会继续恶化。继续上升通常意味着你动的地方不是根因。',
            detail: '把“预期”当成检验动作对不对的标尺，是运营和助理的重要区别。' };
        }
        return { score: 0, max: 1, status: 'warn', title: '预期不现实',
          text: 'ACOS 由 CPC、CVR、客单价共同决定，一次结构调整很难让它在一周内腰斩。给不可实现的预期，下一周你要花更多时间解释。',
          detail: '合理的预期表述：“3–7 天内回到毛利率附近，2 周内稳定在毛利以下。”' };
      }
      return { score: 0, max: 1, status: 'warn', title: '', text: '' };
    },
    debrief: function (d, answers) {
      const notes = [];
      const rightLevel = { broad: 'b', ctr: 'b', cvr: 'c', cost: 'd' }[d.dir];
      const rightAction = { broad: 'a', ctr: 'c', cvr: 'd', cost: 'b' }[d.dir];
      if (answers.S1 !== 'a') notes.push('报表起点：搜索词报告是词级定位的唯一入口。');
      if (answers.S2 !== rightLevel) notes.push('层级判断：先看哪个指标变化最剧烈，再决定动不动手。');
      if (answers.S3 !== rightAction) notes.push('动作匹配：动作必须能直接改变那个变化的指标。');
      if (answers.S4 !== 'a') notes.push('预期管理：给区间 + 时间窗，别给精确数字。');
      return notes;
    }
  };

  /* ============================================================
     模拟 B：补货与资金决策（4 步）
     ============================================================ */
  const B = {
    key: 'B',
    title: '补货与资金决策',
    dim: 'inventory',
    layer: 'ops',
    tagline: '算日均 → 看断货窗口 → 定补货量 → 决定要不要空运',
    build: function () {
      const d7 = R.int(16, 56);
      const d30 = Math.round(d7 * R.range(0.87, 1.13, 2));
      const daily = 0.7 * d7 + 0.3 * d30;
      const lead = R.int(26, 42), ship = R.int(25, 36), buf = R.int(7, 14);
      const k = 1.2, cycle = lead + ship + buf;
      const fba = R.int(90, 420);
      const transit = R.int(300, 1200);
      const local = R.int(0, 400);
      const stock = fba + transit + local;
      const safety = daily * cycle * k;
      const need = daily * cycle + safety - stock;
      const cost = R.range(6.5, 13.5, 2);
      const cash = Math.round(need * cost * R.range(0.55, 1.35) / 100) * 100;
      const daysLeft = fba / daily;
      const gapDays = (lead + ship) - daysLeft;
      return {
        key: 'B', title: '补货与资金决策', dim: 'inventory', layer: 'ops',
        data: { d7: d7, d30: d30, daily: daily, lead: lead, ship: ship, buf: buf, k: k, cycle: cycle,
                fba: fba, transit: transit, local: local, stock: stock, safety: safety, need: need,
                cost: cost, cash: cash, daysLeft: daysLeft, gapDays: gapDays },
        steps: [
          { id: 'S1', type: 'number', prompt: '先算预期日均销量（保留 1 位小数）：',
            fields: [{ key: 'v', label: '预期日均销量', unit: '单/天', hint: '近7天×70% + 近30天×30%' }] },
          { id: 'S2', type: 'number', prompt: '按当前 FBA 可售库存，距离断货还有几天？（保留 1 位小数）',
            fields: [{ key: 'v', label: '距离断货', unit: '天', hint: 'FBA 可售 ÷ 预期日均' }] },
          { id: 'S3', type: 'number', prompt: '下补货单：建议补多少件？（取整）',
            fields: [{ key: 'v', label: '建议补货量', unit: '件', hint: '日均×周期 + 安全库存 − 当前总库存' }] },
          { id: 'S4', type: 'choice', prompt: '补货单提交后，这批货海运到仓需要 ' + '{T}' + ' 天。要不要同时启动空运？',
            options: [
              { id: 'a', text: '要：空运一批覆盖缺口，先把排名保住' },
              { id: 'b', text: '不要：海运能赶上，不必多花钱' },
              { id: 'c', text: '要：直接把整单都改成空运' }
            ] }
        ]
      };
    },
    judge: function (step, ans, d, prev) {
      const m = d.data, margin = 0;

      if (step.id === 'S1') {
        const v = F.parseNum(ans.v);
        if (F.closeTo(v, m.daily, '')) {
          return { score: 1, max: 1, status: 'ok', title: '日均算对了',
            text: '预期日均 = ' + m.d7 + '×70% + ' + m.d30 + '×30% = ' + num(m.daily, 1) + ' 单/天。用近 7 天加权是为了“抓近期趋势”，用近 30 天兜底是为了“防单周噪音”。',
            steps: [m.d7 + '×0.7 = ' + num(m.d7 * 0.7, 1), m.d30 + '×0.3 = ' + num(m.d30 * 0.3, 1), '合计 = ' + num(m.daily, 1)],
            detail: '如果只用近 7 天，一次促销就会让你补多；只用近 30 天，趋势下滑时你会补爆。' };
        }
        return { score: 0, max: 1, status: 'warn', title: '日均口径不对',
          text: '正确值 ' + num(m.daily, 1) + ' 单/天。常见错误是直接取近 7 天的 ' + m.d7 + ' 或近 30 天的 ' + m.d30 + '，或简单平均（会得到 ' + num((m.d7 + m.d30) / 2, 1) + '）。',
          detail: '加权平均不是数学游戏：它决定了后面所有数字的基数，错一步全盘错。' };
      }

      if (step.id === 'S2') {
        const v = F.parseNum(ans.v);
        if (F.closeTo(v, m.daysLeft, '')) {
          const risk = m.daysLeft < (m.lead + m.ship);
          return { score: 1, max: 1, status: 'ok', title: '断货窗口看清了',
            text: '距离断货 = ' + m.fba + ' ÷ ' + num(m.daily, 1) + ' = ' + num(m.daysLeft, 1) + ' 天，而采购 + 头程 = ' + (m.lead + m.ship) + ' 天。' + (risk ? '缺口约 ' + num(m.gapDays, 0) + ' 天——按现有节奏一定会在到货前断货。' : '窗口内能到货，但安全库存已经见底。'),
            steps: [m.fba + ' ÷ ' + num(m.daily, 1) + ' = ' + num(m.daysLeft, 1) + ' 天', '补货总时长 = ' + m.lead + ' + ' + m.ship + ' = ' + (m.lead + m.ship) + ' 天'],
            detail: '这个对比（剩余天数 vs 补货时长）是每周必看的红线，比看库存绝对数有用得多。' };
        }
        return { score: 0, max: 1, status: 'warn', title: '断货天数算错了',
          text: '正确值 ' + num(m.daysLeft, 1) + ' 天 = ' + m.fba + '（仅 FBA 可售）÷ ' + num(m.daily, 1) + '。',
          detail: '注意分母只能用 FBA 可售——在途和本地仓的货不能发货，算进去会严重低估风险。' };
      }

      if (step.id === 'S3') {
        const v = F.parseNum(ans.v);
        const ok = F.closeTo(v, m.need, '');
        const buy = m.need * m.cost;
        const cashNote = buy > m.cash
          ? '资金警告：按你这一单，占用 ' + F.money(buy) + '，超过可用资金 ' + F.money(m.cash) + '，需要拆成两批或谈账期。'
          : '资金校验：占用 ' + F.money(buy) + '，可用资金 ' + F.money(m.cash) + '，在安全范围内。';
        if (ok) {
          return { score: 1, max: 1, status: buy > m.cash ? 'warn' : 'ok', title: '补货量算对了',
            text: '补货量 = ' + num(m.daily, 1) + '×' + m.cycle + ' + ' + F.comma(Math.round(m.safety)) + '（安全库存）− ' + F.comma(m.stock) + '（现有总库存）= ' + F.comma(Math.round(m.need)) + ' 件。',
            steps: ['周期需求 = ' + num(m.daily, 1) + ' × ' + m.cycle + ' = ' + F.comma(Math.round(m.daily * m.cycle)),
                    '安全库存 = ' + num(m.daily, 1) + ' × ' + m.cycle + ' × ' + m.k + ' = ' + F.comma(Math.round(m.safety)),
                    '补货量 = ' + F.comma(Math.round(m.daily * m.cycle)) + ' + ' + F.comma(Math.round(m.safety)) + ' − ' + F.comma(m.stock) + ' = ' + F.comma(Math.round(m.need))],
            detail: cashNote };
        }
        return { score: 0, max: 1, status: 'warn', title: '补货量公式没走通',
          text: '正确值约 ' + F.comma(Math.round(m.need)) + ' 件。公式：日均×（采购+头程+缓冲）+ 安全库存 − 当前总库存。你的答案差了 ' + F.comma(Math.abs(Math.round(v - m.need))) + ' 件。',
          steps: [num(m.daily, 1) + '×' + m.cycle + ' = ' + Math.round(m.daily * m.cycle),
                  '+ 安全库存 ' + Math.round(m.safety),
                  '− 现有 ' + m.stock + '（FBA ' + m.fba + ' + 在途 ' + m.transit + ' + 本地 ' + m.local + '）',
                  '= ' + Math.round(m.need)],
          detail: '最常见的两个错：漏掉在途库存（补爆）、漏掉安全库存（补少）。' };
      }

      if (step.id === 'S4') {
        const risk = m.daysLeft < (m.lead + m.ship);
        const needAir = Math.max(0, Math.round(m.daily * m.gapDays));
        if (ans === 'a') {
          if (risk) {
            return { score: 1, max: 1, status: 'ok', title: '决策正确：空运止血',
              text: '缺口 ' + num(m.gapDays, 0) + ' 天，建议空运约 ' + F.comma(needAir) + ' 件（覆盖缺口的 60%–70% 即可，剩下靠提价降速和控广告）。空运溢价通常远低于排名掉下去后重新买回来的广告成本。',
              detail: '空运不是“全量空运”，是“最小止血批次”——这是运营和采购最容易吵起来的地方。' };
          }
          return { score: 0, max: 1, status: 'warn', title: '过度反应',
            text: '剩余 ' + num(m.daysLeft, 1) + ' 天 > 补货总时长 ' + (m.lead + m.ship) + ' 天，海运来得及。此时空运是纯成本增加。',
            detail: '判断空运的唯一依据：剩余可售天数 < 补货总时长。' };
        }
        if (ans === 'b') {
          if (!risk) {
            return { score: 1, max: 1, status: 'ok', title: '决策正确：不空运',
              text: '剩余 ' + num(m.daysLeft, 1) + ' 天，补货总时长 ' + (m.lead + m.ship) + ' 天，海运可以接上。省下的空运溢价可以投到广告上。',
              detail: '但要把安全库存补回来，否则下一轮又会踩线。' };
          }
          return { score: 0, max: 1, status: 'bad', title: '漏掉了断货风险',
            text: '剩余 ' + num(m.daysLeft, 1) + ' 天，但补货要 ' + (m.lead + m.ship) + ' 天，中间会断 ' + num(m.gapDays, 0) + ' 天。断货期间排名下滑，恢复所需的广告费通常高于空运差价。',
            detail: '断货的代价 = 缺货损失 + 排名恢复成本。后者经常被忽略，却是更大的一块。' };
        }
        return { score: 0, max: 1, status: 'warn', title: '整单空运不划算',
          text: '整单空运是把“止血成本”放大成了“全量成本”。正确做法是海运走主单 + 空运走缺口批次（约 ' + F.comma(needAir) + ' 件）。',
          detail: '空运只解决“窗口缺口”，不解决“长期供给”。' };
      }
      return { score: 0, max: 1, status: 'warn', title: '', text: '' };
    },
    debrief: function (d, answers) {
      const m = d.data;
      return [
        '日均口径：' + num(m.daily, 1) + ' 单/天（7 天 70% + 30 天 30%）。',
        '断货窗口：' + num(m.daysLeft, 1) + ' 天 vs 补货 ' + (m.lead + m.ship) + ' 天 → ' + (m.daysLeft < m.lead + m.ship ? '必然断货，需空运止血。' : '窗口安全，正常海运。'),
        '补货量：' + F.comma(Math.round(m.need)) + ' 件，资金占用 ' + F.money(m.need * m.cost) + '（可用 ' + F.money(m.cash) + '）。'
      ];
    }
  };

  /* ============================================================
     模拟 C：新品定价与利润测算（3 步）
     ============================================================ */
  const C = {
    key: 'C',
    title: '新品定价与利润测算',
    dim: 'profit',
    layer: 'ops',
    tagline: '算盈亏平衡价 → 定目标价 → 验算净利',
    build: function () {
      const cost = R.range(6.5, 16, 2);
      const freight = R.range(1.8, 4.2, 2);
      const fbaFee = R.range(3.6, 7.2, 2);
      const storage = R.range(0.2, 0.6, 2);
      const returnRate = R.range(0.03, 0.07, 3);
      const adRate = R.range(0.08, 0.16, 2);
      const opsFee = R.range(0.6, 1.4, 2);
      const targetMargin = 0.15;
      const commRate = 0.15;

      const fixed = cost + freight + fbaFee + storage;
      const factor = 1 - commRate - returnRate;
      const be = fixed / factor;
      const adPer = be * adRate;
      const target = (fixed + adPer + opsFee) / (factor - targetMargin);
      const lowBand = Number((target * R.range(0.82, 0.94)).toFixed(2));
      const highBand = Number((target * R.range(1.06, 1.25)).toFixed(2));

      return {
        key: 'C', title: '新品定价与利润测算', dim: 'profit', layer: 'ops',
        data: { cost: cost, freight: freight, fbaFee: fbaFee, storage: storage, returnRate: returnRate,
                adRate: adRate, opsFee: opsFee, targetMargin: targetMargin, commRate: commRate,
                fixed: fixed, factor: factor, be: be, adPer: adPer, target: target,
                low: lowBand, high: highBand },
        steps: [
          { id: 'S1', type: 'number', prompt: '先算盈亏平衡售价（毛利打平，不含广告）：',
            fields: [{ key: 'v', label: '盈亏平衡售价', unit: '$', hint: '（产品+头程+FBA+仓储）÷（1−佣金率−退货损耗率）' }] },
          { id: 'S2', type: 'number', prompt: '按目标净利率 15% 反推建议定价：',
            fields: [{ key: 'v', label: '建议定价', unit: '$', hint: '（固定成本+单件广告+服务费）÷（1−佣金−退货−15%）' }] },
          { id: 'S3', type: 'number', prompt: '按你上面定的价格，单件净利是多少？',
            fields: [{ key: 'v', label: '单件净利', unit: '$', hint: '售价×(1−佣金−退货) − 固定成本 − 广告 − 服务费' }] }
        ]
      };
    },
    judge: function (step, ans, d, prev) {
      const m = d.data;
      const p = F.parseNum(prev && prev.S2 ? prev.S2.v : 0);

      if (step.id === 'S1') {
        const v = F.parseNum(ans.v);
        if (F.closeTo(v, m.be, '$')) {
          return { score: 1, max: 1, status: 'ok', title: '盈亏平衡价算对了',
            text: '固定成本 = ' + F.money(m.cost) + ' + ' + F.money(m.freight) + ' + ' + F.money(m.fbaFee) + ' + ' + F.money(m.storage) + ' = ' + F.money(m.fixed) + '；盈亏平衡价 = ' + F.money(m.fixed) + ' ÷ (1 − 15% − ' + F.pct(m.returnRate * 100, 1) + ') = ' + F.money(m.be) + '。',
            steps: ['固定成本合计 = ' + F.money(m.fixed),
                    '可变费率 = 佣金 15% + 退货 ' + F.pct(m.returnRate * 100, 1) + ' = ' + F.pct((m.commRate + m.returnRate) * 100, 1),
                    '盈亏平衡价 = ' + F.money(m.fixed) + ' ÷ ' + num(m.factor, 3) + ' = ' + F.money(m.be)],
            detail: '低于这个价，卖一单亏一单，广告费还没算。这是定价的“地板价”。' };
        }
        const alt1 = m.cost / (1 - m.commRate);
        const alt2 = (m.cost + m.freight + m.fbaFee) / (1 - m.commRate);
        let hint = '';
        if (Math.abs(v - alt1) / alt1 < 0.05) hint = '你的答案接近“只用出厂成本 ÷ (1−佣金)”，说明漏了头程、FBA 配送费、仓储和退货损耗。';
        else if (Math.abs(v - alt2) / alt2 < 0.05) hint = '你的答案接近“只算了产品+头程+FBA”，漏了仓储分摊与退货损耗这两项。';
        else hint = '检查一下：固定成本是否把产品、头程、FBA 配送费、仓储都算进去了？可变费率是否同时减了佣金和退货损耗？';
        return { score: 0, max: 1, status: 'warn', title: '漏算成本项',
          text: hint + ' 正确值约 ' + F.money(m.be) + '。',
          detail: '漏一项成本，定价就会低一档；而定价一旦发布，再调就要用销量和评价去换。' };
      }

      if (step.id === 'S2') {
        const v = F.parseNum(ans.v);
        const ok = v >= m.target * 0.97 && v <= m.target * 1.05;
        if (ok) {
          return { score: 1, max: 1, status: 'ok', title: '定价逻辑成立',
            text: '目标价 = (' + F.money(m.fixed) + ' + 广告 ' + F.money(m.adPer) + ' + 服务费 ' + F.money(m.opsFee) + ') ÷ (1 − 15% − ' + F.pct(m.returnRate * 100, 1) + ' − 15%) = ' + F.money(m.target) + '。',
            steps: ['分子（要覆盖的钱）= ' + F.money(m.fixed + m.adPer + m.opsFee),
                    '分母（剩给净利的部分）= ' + num(m.factor - m.targetMargin, 3),
                    '目标价 = ' + F.money(m.target)],
            detail: '这个价落在你预设的价格带 ' + F.money(m.low) + '–' + F.money(m.high) + ' 里，' + (v < m.target ? '偏下沿（更容易起量，但净利缓冲区更薄）' : '偏上沿（利润更厚，但需要更强卖点支撑）') + '。' };
        }
        if (v < m.be) {
          return { score: 0, max: 1, status: 'bad', title: '定价低于盈亏平衡线',
            text: '你定的 ' + F.money(v) + ' 低于盈亏平衡价 ' + F.money(m.be) + '——这个价格下卖一单就亏一单，广告费还没算。',
            detail: '定价的第一条硬约束：不能低于盈亏平衡价，除非是明确的清货或引流策略，且有预算支撑。' };
        }
        return { score: 0, max: 1, status: 'warn', title: '定价偏离目标净利',
          text: '按你的定价 ' + F.money(v) + ' 算，净利率约 ' + F.pct(((v * m.factor - m.fixed - m.adPer - m.opsFee) / v) * 100) + '，目标是 15%。参考价 ' + F.money(m.target) + '。',
          detail: '定价不是“看竞品定”，而是“先算清自己的底线，再在价格带里选位置”。' };
      }

      if (step.id === 'S3') {
        const price = p > 0 ? p : m.target;
        const realNet = price * m.factor - m.fixed - m.adPer - m.opsFee;
        const v = F.parseNum(ans.v);
        if (F.closeTo(v, realNet, '$')) {
          return { score: 1, max: 1, status: 'ok', title: '净利验算通过',
            text: '按 ' + F.money(price) + ' 算：' + F.money(price) + ' × ' + num(m.factor, 3) + ' − ' + F.money(m.fixed) + '（固定）− ' + F.money(m.adPer) + '（广告）− ' + F.money(m.opsFee) + '（服务费）= ' + F.money(realNet) + '，净利率 ' + F.pct(realNet / price * 100) + '。',
            steps: ['售价 × (1−佣金−退货) = ' + F.money(price * m.factor),
                    '− 固定成本 ' + F.money(m.fixed),
                    '− 广告 ' + F.money(m.adPer) + ' − 服务费 ' + F.money(m.opsFee),
                    '= ' + F.money(realNet)],
            detail: realNet / price >= 0.15 ? '达到 15% 投产底线。' : '未达到 15% 底线，需要提价或压成本。' };
        }
        return { score: 0, max: 1, status: 'warn', title: '净利算错',
          text: '按你定的 ' + F.money(price) + '，正确净利约 ' + F.money(realNet) + '（净利率 ' + F.pct(realNet / price * 100) + '）。',
          detail: '常见错误：把佣金按成本价算（应按售价）、或忘了退货损耗是按售价计提的。' };
      }
      return { score: 0, max: 1, status: 'warn', title: '', text: '' };
    },
    debrief: function (d, answers) {
      const m = d.data;
      return [
        '盈亏平衡价 ' + F.money(m.be) + '（地板价，低于它必亏）。',
        '15% 净利目标价 ' + F.money(m.target) + '，落在预设价格带 ' + F.money(m.low) + '–' + F.money(m.high) + '。',
        '成本结构里最容易被漏的是：仓储分摊、退货损耗、运营服务费/提成。'
      ];
    }
  };

  window.SIMS = { A: A, B: B, C: C };
})();
