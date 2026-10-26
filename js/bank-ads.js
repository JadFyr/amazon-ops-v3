/* ============================================================
   阶段 3 · 题库扩容（一）：广告与指标（上）
   填空 15（F24–F38）+ 单选 30（Q63–Q92）
   topic / dim = 'ads' / 难度 1–3
   来源：Day2 广告指标公式手卡 · Day4 SP 广告全流程文档 · 既有 sims 判分口径
   原则：全部落在「操作层」——给定数据，下一步动哪个、动多少、动完看什么
   ============================================================ */
(function () {
  const DATA = window.DATA, R = window.R, F = window.F;
  if (!DATA.DIMS) return;

  /* ============================================================
     填空 15 题（F24–F38）
     ============================================================ */
  DATA.FILL.push(
    {
      id: 'F24', dim: 'ads', layer: 'base', title: '分词四象限归类',
      build: function () {
        const rows = [
          { w: 'insulated bottle 32oz', c: R.int(30, 42), o: R.int(5, 9) },
          { w: 'water bottle', c: R.int(48, 70), o: 0 },
          { w: 'stainless steel flask', c: R.int(6, 11), o: 0 },
          { w: 'travel mug', c: R.int(26, 34), o: 0 },
          { w: 'kids bottle', c: R.int(4, 8), o: 0 },
          { w: 'thermal bottle', c: R.int(22, 30), o: R.int(2, 4) }
        ];
        R.shuffle(rows);
        const good = rows.filter(r => r.o > 0 && r.o / r.c >= 0.09).length;
        const bad = rows.filter(r => r.o === 0 && r.c >= 20).length;
        const low = rows.filter(r => r.c < 12).length;
        return {
          title: '分词四象限归类', dim: 'ads', layer: 'base',
          scene: '本周自动广告的搜索词报告如下（模拟数据）。按分词四象限归类：有单且转化率 ≥9% 的算「高转化」，0 单且点击 ≥20 的算「高花费 0 转化」，点击 <12 的算「低曝光」。请数出各类的数量。',
          kv: [['数据窗口', '近 7 天'], ['分流规则', '高转化 / 高花费0单 / 低曝光'], ['客单价', F.money(34.99)]],
          table: {
            head: ['搜索词', '点击', '订单'],
            rows: rows.map(r => [r.w, String(r.c), String(r.o)])
          },
          blanks: [
            { key: 'good', label: '高转化（该开手动精准）的词数', hint: '有单且 订单 ÷ 点击 ≥ 9%', unit: '个', value: good },
            { key: 'bad', label: '高花费 0 转化（该否定）的词数', hint: '0 单且点击 ≥ 20', unit: '个', value: bad },
            { key: 'low', label: '低曝光（该提 bid）的词数', hint: '点击 < 12', unit: '个', value: low }
          ],
          steps: [
            '逐个算转化率：' + rows.map(r => r.w + ' ' + r.o + '/' + r.c + (r.c ? '=' + (r.o / r.c * 100).toFixed(1) + '%' : '') + (r.o === 0 ? '（0 单）' : '')).join('；'),
            '高转化（有单且 ≥9%）：' + good + ' 个 → 动作是「提为手动精准，单独给预算」',
            '高花费 0 转化（≥20 点击且 0 单）：' + bad + ' 个 → 动作是「活动层级否定」',
            '低曝光（<12 点击）：' + low + ' 个 → 动作是「提 bid，先争取曝光量」'
          ],
          usage: '分词四象限是 SP 七步闭环的第 5 步，也是最容易只做一半的地方。只否定不加词，等于把预算越切越小；只加词不否定，等于持续给垃圾流量付费。四个象限要一起处理。',
          caveat: '「高转化」的门槛按本品类 CVR 4.5%–9.5% 参考，取 9% 为开手动的判断线；类目差异大时以本品类均值为准。'
        };
      }
    },
    {
      id: 'F25', dim: 'ads', layer: 'base', title: '否词纪律：两把尺同时量',
      build: function () {
        const rows = [
          { w: 'glass water bottle', c: R.int(24, 30), o: 0, s: R.range(16, 22, 2) },
          { w: 'bottle brush', c: R.int(21, 26), o: 0, s: R.range(7, 11, 2) },
          { w: 'sports bottle', c: R.int(8, 12), o: 0, s: R.range(15, 19, 2) },
          { w: 'vacuum flask 1l', c: R.int(10, 14), o: 0, s: R.range(6, 9, 2) },
          { w: 'insulated cup', c: R.int(28, 36), o: R.int(2, 4), s: R.range(20, 28, 2) },
          { w: 'bpa free bottle', c: R.int(5, 8), o: 0, s: R.range(3, 5, 2) }
        ];
        R.shuffle(rows);
        const kill = rows.filter(r => r.o === 0 && (r.c >= 20 || r.s >= 15)).length;
        return {
          title: '否词纪律：两把尺同时量', dim: 'ads', layer: 'base',
          scene: '搜索词报告如下。「该否」的门槛是两条任一成立：①点击 ≥ 20 且 0 单；②花费 ≥ $15 且 0 单。已经在出单的词一律不动。请数出该否的词数。',
          kv: [['门槛一', '点击 ≥ 20 且 0 单'], ['门槛二', '花费 ≥ $15 且 0 单'], ['否词层级', '广告活动层级']],
          table: {
            head: ['搜索词', '点击', '订单', '花费'],
            rows: rows.map(r => [r.w, String(r.c), String(r.o), F.money(r.s)])
          },
          blanks: [
            { key: 'kill', label: '本周该否掉的词数', hint: '两条门槛任一成立，且 0 单', unit: '个', value: kill },
            { key: 'keep', label: '该保留观察的词数', hint: '总词数 − 该否词数', unit: '个', value: rows.length - kill }
          ],
          steps: [
            rows.map(r => r.w + '：' + r.c + ' 点击 / ' + r.o + ' 单 / ' + F.money(r.s) +
              ' → ' + (r.o > 0 ? '出单，不动' : (r.c >= 20 ? '点击过线，否' : (r.s >= 15 ? '花费过线，否' : '两条都没过，观察')))).join('；'),
            '该否 = ' + kill + ' 个；保留 = ' + (rows.length - kill) + ' 个',
            '注意：「两条任一成立」不等于「两条都成立」。花费过线但点击很少（如 10 点击花了 $16），同样该否——贵的流量比大的流量更伤'
          ],
          usage: '两把尺子解决的是两种浪费：点击多但全是无效点击（词不精准），和点击少但每次都很贵（CPC 过高）。只用一个尺子，会漏掉另一半。',
          caveat: '20 点击 / $15 是经验门槛，与客单价强相关：客单价 $50 以上的产品，$15 只相当于 5–6 次点击，应把花费门槛提高到 $25–30。'
        };
      }
    },
    {
      id: 'F26', dim: 'ads', layer: 'base', title: '哪些词该提为手动精准',
      build: function () {
        const rows = [
          { w: 'insulated water bottle 32oz', c: R.int(28, 36), o: R.int(6, 9) },
          { w: 'stainless steel water bottle', c: R.int(24, 32), o: R.int(4, 6) },
          { w: 'water bottle', c: R.int(60, 80), o: R.int(2, 4) },
          { w: 'gym water bottle', c: R.int(14, 20), o: 0 },
          { w: 'double wall bottle', c: R.int(18, 24), o: R.int(3, 5) },
          { w: 'bottle with straw', c: R.int(9, 13), o: 0 }
        ];
        R.shuffle(rows);
        const up = rows.filter(r => r.o > 0 && r.o / r.c >= 0.15).length;
        return {
          title: '哪些词该提为手动精准', dim: 'ads', layer: 'base',
          scene: '自动广告跑出了这批词。「提为手动精准」的判断线是：有订单，且 订单 ÷ 点击 ≥ 15%。请数出该提几个词，并算出它们的合计订单数。',
          kv: [['提词门槛', '有单且 CVR ≥ 15%'], ['下一步', '单独建手动精准活动，给独立预算'], ['客单价', F.money(32.99)]],
          table: {
            head: ['搜索词', '点击', '订单', 'CVR'],
            rows: rows.map(r => [r.w, String(r.c), String(r.o), r.c ? (r.o / r.c * 100).toFixed(1) + '%' : '—'])
          },
          blanks: [
            { key: 'up', label: '该提为手动精准的词数', hint: '有单且 CVR ≥ 15%', unit: '个', value: up },
            { key: 'orders', label: '这些词的合计订单数', hint: '符合条件的词订单相加', unit: '单', value: rows.filter(r => r.o > 0 && r.o / r.c >= 0.15).reduce((a, r) => a + r.o, 0) }
          ],
          steps: [
            rows.map(r => r.w + '：' + r.o + '/' + r.c + ' = ' + (r.c ? (r.o / r.c * 100).toFixed(1) + '%' : '—') + (r.o > 0 && r.o / r.c >= 0.15 ? ' → 提为手动精准' : ' → 留在自动里跑')).join('；'),
            '该提 ' + up + ' 个，合计 ' + rows.filter(r => r.o > 0 && r.o / r.c >= 0.15).reduce((a, r) => a + r.o, 0) + ' 单',
            '提词之后要在自动活动里否定同一个词（防止自动和手动抢同一批流量、双份付费）'
          ],
          usage: '自动广告的真正价值不是出单，是「帮你找词」。找到词就要把它搬到手动精准里单独控价——留在自动里，你无法单独给它加预算，也无法单独看它的表现。',
          caveat: '15% 的提词门槛偏高（远高于本品类 CVR 均值 4.5%–9.5%），目的是只搬「确定的好词」。门槛过低会把还在测试期的词过早搬走，失去自动广告的探索功能。'
        };
      }
    },
    {
      id: 'F27', dim: 'ads', layer: 'base', title: '动态竞价「只降低」的实际出价',
      build: function () {
        const bid = R.range(0.80, 1.60, 2);
        const disc = R.pick([0.5, 0.5, 0.6]);
        const real = Number((bid * (1 - disc)).toFixed(2));
        return {
          title: '动态竞价「只降低」的实际出价', dim: 'ads', layer: 'base',
          scene: '某活动设置基础出价 ' + F.money(bid) + '，竞价策略选「动态竞价 - 只降低」。亚马逊判断这次展示不太可能成交时，会把出价打折 ' + F.pct(disc * 100, 0) + '。请算实际出价，以及按这个出价能买到多少点击。',
          kv: [['基础出价', F.money(bid)], ['竞价策略', '动态竞价 - 只降低'], ['系统折扣', F.pct(disc * 100, 0)], ['日预算', F.money(30)]],
          blanks: [
            { key: 'real', label: '低概率位置的实际出价', hint: '基础出价 ×（1 − 折扣）', unit: '$', value: real },
            { key: 'clicks', label: '日预算能买的点击上限', hint: '日预算 ÷ 实际出价，向下取整', unit: '次', value: Math.floor(30 / real) }
          ],
          steps: [
            '实际出价 = ' + F.money(bid) + ' ×（1 − ' + F.pct(disc * 100, 0) + '）= ' + F.money(real),
            '点击上限 = $30 ÷ ' + F.money(real) + ' ≈ ' + Math.floor(30 / real) + ' 次（实际会更少，因为不是每次点击都按最低价成交）',
            '「只降低」的真正含义：出价上限不变，只在低概率位置往下打折——它是省钱工具，不是提曝光工具'
          ],
          usage: '新品期首选「只降低」，因为此时最怕的是把钱花在不会成交的位置上。等 CVR 稳定、关键词排名需要冲的时候，才考虑「提高和降低」。',
          caveat: '折扣幅度由系统按成交概率动态决定，本场景取 50% / 60% 为示意值；实际无法手动指定折扣比例。'
        };
      }
    },
    {
      id: 'F28', dim: 'ads', layer: 'base', title: '广告位溢价后的实际出价',
      build: function () {
        const bid = R.range(0.60, 1.20, 2);
        const premium = R.pick([0.30, 0.50, 0.75]);
        const top = Number((bid * (1 + premium)).toFixed(2));
        const cap = 2.4;
        return {
          title: '广告位溢价后的实际出价', dim: 'ads', layer: 'base',
          scene: '某手动活动基础出价 ' + F.money(bid) + '，搜索结果顶部（首页首位）溢价 ' + F.pct(premium * 100, 0) + '。请算顶部位置的实际出价，并判断是否超过该词建议出价上限 ' + F.money(cap) + '。',
          kv: [['基础出价', F.money(bid)], ['首页顶部溢价', '+' + F.pct(premium * 100, 0)], ['建议出价上限', F.money(cap)]],
          blanks: [
            { key: 'top', label: '首页顶部的实际出价', hint: '基础出价 ×（1 + 溢价）', unit: '$', value: top },
            { key: 'over', label: '超出建议上限的金额', hint: '实际出价 − 上限，未超填 0', unit: '$', value: Number(Math.max(0, top - cap).toFixed(2)) }
          ],
          steps: [
            '顶部出价 = ' + F.money(bid) + ' ×（1 + ' + F.pct(premium * 100, 0) + '）= ' + F.money(top),
            '与上限 ' + F.money(cap) + ' 比较：' + (top > cap ? '超出 ' + F.money(top - cap) + '，属于「为位置付出溢价」' : '未超出，仍有空间'),
            '溢价不是提价，它只对指定位置生效——其余位置仍按基础出价竞争'
          ],
          usage: '位置溢价是精准的钱：你只为「首页顶部」多付，商品页面不受影响。判断该不该加，看的是「顶部位置的 CVR 比其余位置高多少」，而不是「我想排第一」。',
          caveat: '溢价上限为 900%；是否值得加，必须用「按广告位的报告」核对顶部位置的 CVR 与 ACOS，不能凭感觉。'
        };
      }
    },
    {
      id: 'F29', dim: 'ads', layer: 'base', title: 'ACOS 恶化到底怪谁',
      build: function () {
        const price = R.pick([29.99, 32.99, 34.99]);
        const cpc0 = R.range(0.70, 1.00, 2), cvr0 = R.range(0.070, 0.095, 3);
        const cpc1 = Number((cpc0 * R.range(1.15, 1.40)).toFixed(2));
        const cvr1 = Number((cvr0 * R.range(0.70, 0.86)).toFixed(3));
        const a0 = cpc0 / (cvr0 * price) * 100;
        const a1 = cpc1 / (cvr1 * price) * 100;
        const onlyCpc = cpc1 / (cvr0 * price) * 100;
        return {
          title: 'ACOS 恶化到底怪谁', dim: 'ads', layer: 'base',
          scene: '同一活动两周对比：CPC 从 ' + F.money(cpc0) + ' 涨到 ' + F.money(cpc1) + '，CVR 从 ' + F.pct(cvr0 * 100) + ' 掉到 ' + F.pct(cvr1 * 100) + '，客单价 ' + F.money(price) + ' 不变。请算两周 ACOS，并拆出「只涨 CPC」那一档，判断谁的责任更大。',
          kv: [['上周', 'CPC ' + F.money(cpc0) + ' / CVR ' + F.pct(cvr0 * 100)], ['本周', 'CPC ' + F.money(cpc1) + ' / CVR ' + F.pct(cvr1 * 100)], ['客单价', F.money(price)]],
          blanks: [
            { key: 'a0', label: '上周 ACOS', hint: 'CPC ÷（CVR × 客单价）× 100%', unit: '%', value: a0 },
            { key: 'a1', label: '本周 ACOS', hint: '同上，代入新数据', unit: '%', value: a1 },
            { key: 'onlyCpc', label: '若只有 CPC 涨、CVR 不变时的 ACOS', hint: '新 CPC ÷（旧 CVR × 客单价）', unit: '%', value: onlyCpc }
          ],
          steps: [
            '上周：' + F.money(cpc0) + ' ÷（' + F.pct(cvr0 * 100) + ' × ' + F.money(price) + '）= ' + F.pct(a0),
            '本周：' + F.money(cpc1) + ' ÷（' + F.pct(cvr1 * 100) + ' × ' + F.money(price) + '）= ' + F.pct(a1),
            '只涨 CPC：' + F.money(cpc1) + ' ÷（' + F.pct(cvr0 * 100) + ' × ' + F.money(price) + '）= ' + F.pct(onlyCpc),
            '分解：CPC 贡献 +' + (onlyCpc - a0).toFixed(1) + ' 点，CVR 贡献 +' + (a1 - onlyCpc).toFixed(1) + ' 点 → ' + ((a1 - onlyCpc) > (onlyCpc - a0) ? 'CVR 是主因，先查详情页与流量精准度' : 'CPC 是主因，先查竞价环境与投放位置')
          ],
          usage: 'ACOS = CPC ÷（CVR × 客单价）。这个恒等式是拆解工具：把变化拆成「价变贵了」和「转化变差了」，才知道该动 bid 还是该动 Listing。不拆就动手，八成修错地方。',
          caveat: '本式假设客单价不变。若有促销、变体切换或 Coupon，客单价变化也要单独拆出来，否则会把价格因素误记到 CPC 或 CVR 上。'
        };
      }
    },
    {
      id: 'F30', dim: 'ads', layer: 'base', title: '预算能买来多少数据',
      build: function () {
        const budget = R.int(20, 60);
        const cpc = R.range(0.65, 1.35, 2);
        const cvr = R.range(0.045, 0.095, 3);
        const clicks = Math.floor(budget / cpc);
        const orders = clicks * cvr;
        return {
          title: '预算能买来多少数据', dim: 'ads', layer: 'base',
          scene: '日预算 ' + F.money(budget) + '，当前 CPC ' + F.money(cpc) + '，CVR ' + F.pct(cvr * 100) + '。运营需要判断：这个预算够不够跑出可下结论的数据？',
          kv: [['日预算', F.money(budget)], ['CPC', F.money(cpc)], ['CVR', F.pct(cvr * 100)], ['结论门槛', '单日 ≥ 20 次点击才勉强可判断']],
          blanks: [
            { key: 'clicks', label: '每天能买到的点击', hint: '日预算 ÷ CPC，向下取整', unit: '次', value: clicks },
            { key: 'orders', label: '预计每天出的单（保留 1 位）', hint: '点击 × CVR', unit: '单', value: Number(orders.toFixed(1)) }
          ],
          steps: [
            '点击 = $' + budget + ' ÷ ' + F.money(cpc) + ' ≈ ' + clicks + ' 次',
            '订单 = ' + clicks + ' × ' + F.pct(cvr * 100) + ' ≈ ' + orders.toFixed(1) + ' 单/天',
            '一周累计：约 ' + (clicks * 7) + ' 次点击、' + (orders * 7).toFixed(1) + ' 单——' + (clicks * 7 >= 100 ? '样本量够，可以做否定与提词' : '样本量不足，只能看趋势不能下结论')
          ],
          usage: '预算的第一作用是「买数据」，第二才是「买订单」。预算太少时，你得到的不是「这个词不行」的结论，而是一堆统计噪音——用噪音做决策比不做决策更危险。',
          caveat: '20 点击的可判断门槛是经验值；要判断 CVR 是否显著偏离均值，通常需要 50–100 次点击以上。'
        };
      }
    },
    {
      id: 'F31', dim: 'ads', layer: 'base', title: '否掉泛词后预算怎么变',
      build: function () {
        const spend = R.int(160, 320);
        const broadShare = R.range(0.35, 0.55, 2);
        const cpc = R.range(0.7, 1.2, 2);
        const cut = Math.round(spend * broadShare);
        const left = spend - cut;
        return {
          title: '否掉泛词后预算怎么变', dim: 'ads', layer: 'base',
          scene: '本周活动花费 ' + F.money(spend) + '，其中泛词占 ' + F.pct(broadShare * 100, 0) + ' 的花费、几乎不出单。运营决定把泛词全部否定，预算总额不变。请算否定后剩下的钱能买到多少点击。',
          kv: [['本周总花费', F.money(spend)], ['泛词花费占比', F.pct(broadShare * 100, 0)], ['CPC', F.money(cpc)], ['否定层级', '活动层级']],
          blanks: [
            { key: 'cut', label: '被否掉词占用的花费', hint: '总花费 × 泛词占比', unit: '$', value: cut },
            { key: 'left', label: '否定后可用于精准词的花费', hint: '总花费 − 被否部分', unit: '$', value: left },
            { key: 'clicks', label: '这些钱能买的精准点击', hint: '剩余花费 ÷ CPC', unit: '次', value: Math.floor(left / cpc) }
          ],
          steps: [
            '泛词占用 = ' + F.money(spend) + ' × ' + F.pct(broadShare * 100, 0) + ' = ' + F.money(cut),
            '释放 = ' + F.money(spend) + ' − ' + F.money(cut) + ' = ' + F.money(left),
            '可买精准点击 = ' + F.money(left) + ' ÷ ' + F.money(cpc) + ' ≈ ' + Math.floor(left / cpc) + ' 次'
          ],
          usage: '否词不是省钱，是「把钱挪到有用的地方」。预算固定时，否掉一个高花费 0 转化的词，等于给精准词多买了 N 次点击——这才是否词的真实收益。',
          caveat: '否定后在活动层级生效，历史数据不会回溯。否定后 3 天内要复查曝光是否掉太多（否太狠会把有效流量一起切掉）。'
        };
      }
    },
    {
      id: 'F32', dim: 'ads', layer: 'base', title: '曝光份额的缺口',
      build: function () {
        const share = R.range(0.08, 0.22, 2);
        const actual = R.int(30, 90) * 1000;
        const total = Math.round(actual / share);
        return {
          title: '曝光份额的缺口', dim: 'ads', layer: 'base',
          scene: '某关键词的曝光份额（Impression Share）只有 ' + F.pct(share * 100, 1) + '，实际拿到曝光 ' + F.comma(actual) + '。请估算这个关键词的全部可用曝光，以及还差多少曝光才能做到 40% 份额。',
          kv: [['实际曝光', F.comma(actual)], ['曝光份额', F.pct(share * 100, 1)], ['目标份额', '40%']],
          blanks: [
            { key: 'total', label: '该词的全部可用曝光（估算）', hint: '实际曝光 ÷ 份额', unit: '次', value: total },
            { key: 'gap', label: '做到 40% 份额还差的曝光', hint: '总量 × 40% − 实际曝光', unit: '次', value: Math.round(total * 0.4) - actual }
          ],
          steps: [
            '可用曝光 ≈ ' + F.comma(actual) + ' ÷ ' + F.pct(share * 100, 1) + ' = ' + F.comma(total),
            '40% 份额对应 ' + F.comma(total) + ' × 40% = ' + F.comma(Math.round(total * 0.4)) + ' 次',
            '缺口 = ' + F.comma(Math.round(total * 0.4)) + ' − ' + F.comma(actual) + ' = ' + F.comma(Math.round(total * 0.4) - actual) + ' 次'
          ],
          usage: '曝光份额回答的是「这个池子有多大、我占了多少」。份额低不一定是出价低——也可能是预算不够、相关性差、或者这个词本身被头部锁死。先看份额，再决定是提价还是换词。',
          caveat: '曝光份额是平台估算值，且只对有一定数据的词展示；数据量小的词可能根本不显示。'
        };
      }
    },
    {
      id: 'F33', dim: 'ads', layer: 'base', title: '广告依赖度有多高',
      build: function () {
        const adOrders = R.int(20, 70);
        const natOrders = R.int(40, 160);
        const total = adOrders + natOrders;
        return {
          title: '广告依赖度有多高', dim: 'ads', layer: 'base',
          scene: '某 ASIN 本周共 ' + total + ' 单，其中广告单 ' + adOrders + ' 单、自然单 ' + natOrders + ' 单。请算广告订单占比，并判断这个链接的广告依赖度。',
          kv: [['总订单', total + ' 单'], ['广告单', adOrders + ' 单'], ['自然单', natOrders + ' 单']],
          blanks: [
            { key: 'pct', label: '广告订单占比', hint: '广告单 ÷ 总订单 × 100%', unit: '%', value: adOrders / total * 100 },
            { key: 'nat', label: '自然订单占比', hint: '自然单 ÷ 总订单 × 100%', unit: '%', value: natOrders / total * 100 }
          ],
          steps: [
            '广告占比 = ' + adOrders + ' ÷ ' + total + ' = ' + F.pct(adOrders / total * 100),
            '自然占比 = ' + natOrders + ' ÷ ' + total + ' = ' + F.pct(natOrders / total * 100),
            '判断：' + (adOrders / total > 0.7 ? '广告依赖度过高（>70%）——停广告就掉单，属于「买来的单量」' : (adOrders / total > 0.4 ? '处在过渡期（40%–70%）——广告在买排名，要盯自然占比是否在涨' : '自然流量为主（<40%）——广告可转向防御与拉新'))
          ],
          usage: '广告订单占比是判断「这条链接是不是真的起来了」的核心指标。占比高不代表失败，但长期不降就是问题——说明广告买来的排名没有转化成自然流量。',
          caveat: '广告单与自然单的归因窗口不同（点击后 7 天内下单通常都算广告单），跨周期对比时要注意口径一致。'
        };
      }
    },
    {
      id: 'F34', dim: 'ads', layer: 'base', title: '三个活动怎么分这笔钱',
      build: function () {
        const total = R.pick([600, 700, 900]);
        const a1 = R.range(0.55, 0.70, 2), a2 = R.range(0.25, 0.35, 2);
        const s1 = Math.round(total * a1), s2 = Math.round(total * a2), s3 = total - s1 - s2;
        const bid = 1.1;
        return {
          title: '三个活动怎么分这笔钱', dim: 'ads', layer: 'base',
          scene: '月预算 $' + total + '，要分给三个活动：①手动精准（ACOS 22%，毛利率 32%）②自动（ACOS 45%，用来拓词）③竞品 ASIN 防御（ACOS 30%）。按「先保赚钱的、再保拓词的、最后才是防御」的顺序，运营给了 65% / 25% / 10% 的比例。请算三个活动的金额，以及手动精准能买多少点击（CPC $' + bid + '）。',
          kv: [['月预算', '$' + total], ['手动精准', 'ACOS 22% / 毛利率 32%'], ['自动', 'ACOS 45% / 用于拓词'], ['竞品防御', 'ACOS 30%'], ['分配比例', '65% / 25% / 10%']],
          blanks: [
            { key: 's1', label: '手动精准的月预算', hint: '总预算 × 65%', unit: '$', value: s1 },
            { key: 's3', label: '竞品防御的月预算', hint: '总预算 × 10%', unit: '$', value: s3 },
            { key: 'clicks', label: '手动精准能买的点击', hint: '预算 ÷ CPC', unit: '次', value: Math.floor(s1 / bid) }
          ],
          steps: [
            '手动精准 = $' + total + ' × 65% = $' + s1 + '（ACOS 22% 低于毛利率 32%，是唯一确定赚钱的活动）',
            '自动 = $' + total + ' × 25% = $' + s2 + '（ACOS 45% 高于毛利，但它的任务是拓词，按「买数据」预算看待）',
            '竞品防御 = $' + total + ' × 10% = $' + s3,
            '手动精准可买点击 = $' + s1 + ' ÷ $' + bid + ' ≈ ' + Math.floor(s1 / bid) + ' 次'
          ],
          usage: '预算分配不是按「哪个 ACOS 低给哪个」，而是按「这个活动承担什么任务」。赚钱的活动保利润，拓词的活动买数据（有上限、有期限），防御的活动保份额。三者混淆，就会出现「把钱都给了 ACOS 最低的活动，然后新品永远起不来」。',
          caveat: '比例是示例。真实分配要看各活动的边际效率：当一个活动加预算后 ACOS 明显上升，说明它已经吃到了效率边界，此时再给钱就是浪费。'
        };
      }
    },
    {
      id: 'F35', dim: 'ads', layer: 'base', title: '精准与广泛，哪个更划算',
      build: function () {
        const price = R.pick([29.99, 34.99, 39.99]);
        const cpcE = R.range(1.10, 1.50, 2), cvrE = R.range(0.075, 0.11, 3);
        const cpcB = R.range(0.60, 0.90, 2), cvrB = R.range(0.025, 0.045, 3);
        const aE = cpcE / (cvrE * price) * 100;
        const aB = cpcB / (cvrB * price) * 100;
        return {
          title: '精准与广泛，哪个更划算', dim: 'ads', layer: 'base',
          scene: '同一个核心词开了两个活动：手动精准（CPC ' + F.money(cpcE) + '、CVR ' + F.pct(cvrE * 100) + '）与广泛匹配（CPC ' + F.money(cpcB) + '、CVR ' + F.pct(cvrB * 100) + '）。客单价 ' + F.money(price) + '。请各自算 ACOS。',
          kv: [['手动精准', 'CPC ' + F.money(cpcE) + ' / CVR ' + F.pct(cvrE * 100)], ['广泛匹配', 'CPC ' + F.money(cpcB) + ' / CVR ' + F.pct(cvrB * 100)], ['客单价', F.money(price)]],
          blanks: [
            { key: 'aE', label: '手动精准的 ACOS', hint: 'CPC ÷（CVR × 客单价）', unit: '%', value: aE },
            { key: 'aB', label: '广泛匹配的 ACOS', hint: '同上', unit: '%', value: aB },
            { key: 'diff', label: '两者 ACOS 差（百分点）', hint: '广泛 − 精准', unit: '%', value: aB - aE }
          ],
          steps: [
            '精准：' + F.money(cpcE) + ' ÷（' + F.pct(cvrE * 100) + ' × ' + F.money(price) + '）= ' + F.pct(aE),
            '广泛：' + F.money(cpcB) + ' ÷（' + F.pct(cvrB * 100) + ' × ' + F.money(price) + '）= ' + F.pct(aB),
            '差距 = ' + (aB - aE).toFixed(1) + ' 个百分点 → 便宜的点击不一定便宜，贵点击可能更划算'
          ],
          usage: '这是广告里最容易算错的一笔账：广泛匹配 CPC 更低，但转化率也低得多，最后 ACOS 反而更高。判断「哪个划算」必须算到 ACOS，不能停在 CPC。',
          caveat: '广泛匹配的价值不全在直接 ACOS——它还承担拓词功能，长尾词带来的订单可能归因在其他词上。纯用 ACOS 比较时要把这层考虑进去。'
        };
      }
    },
    {
      id: 'F36', dim: 'ads', layer: 'base', title: '同一个词被投了两遍',
      build: function () {
        const sp1 = R.int(50, 90), sp2 = R.int(35, 70);
        const cpc = R.range(0.8, 1.2, 2);
        return {
          title: '同一个词被投了两遍', dim: 'ads', layer: 'base',
          scene: '自查发现：核心词「insulated bottle」同时在自动活动和手动精准活动里跑，两周花了 $' + sp1 + ' 和 $' + sp2 + '。自动的那部分点击里约 60% 与手动重合。请算重复花费与浪费的点击。',
          kv: [['自动活动花费', '$' + sp1], ['手动精准花费', '$' + sp2], ['重合比例', '60%'], ['CPC', F.money(cpc)]],
          blanks: [
            { key: 'dup', label: '重合部分花掉的钱', hint: '自动花费 × 60%', unit: '$', value: Number((sp1 * 0.6).toFixed(2)) },
            { key: 'waste', label: '重复买到的点击（约）', hint: '重合花费 ÷ CPC，取整', unit: '次', value: Math.floor(sp1 * 0.6 / cpc) }
          ],
          steps: [
            '重合花费 = $' + sp1 + ' × 60% = $' + (sp1 * 0.6).toFixed(2),
            '重复点击 ≈ $' + (sp1 * 0.6).toFixed(2) + ' ÷ ' + F.money(cpc) + ' ≈ ' + Math.floor(sp1 * 0.6 / cpc) + ' 次',
            '这 ' + Math.floor(sp1 * 0.6 / cpc) + ' 次点击，本来用更低的手动出价也能拿到（手动出价可控，自动不可控）'
          ],
          usage: '自动广告跑出好词后，必须在自动里把这个词「否定」掉（精准否定），否则两个活动会抢同一批流量，而且自动那边的出价你控不住。这是 SP 七步闭环第 6 步最容易漏掉的收尾动作。',
          caveat: '重合流量并非 100% 浪费——自动广告的展示位置可能不同。但同一搜索词在两个活动里竞争，通常会让整体 CPC 上升。'
        };
      }
    },
    {
      id: 'F37', dim: 'ads', layer: 'base', title: '日均销量与花费的口径',
      build: function () {
        const d7 = R.int(60, 140);
        const d30 = R.int(50, 120);
        const spend = R.int(200, 420);
        const w = d7 * 0.7 + d30 * 0.3;
        return {
          title: '日均销量与花费的口径', dim: 'ads', layer: 'base',
          scene: '近 7 天日均 ' + d7 + ' 单，近 30 天日均 ' + d30 + ' 单。按「7 天 × 70% + 30 天 × 30%」算加权日均，再算出本周（7 天）的广告花费与单均广告成本。',
          kv: [['近 7 天日均', d7 + ' 单'], ['近 30 天日均', d30 + ' 单'], ['本周广告花费', '$' + spend], ['加权口径', '7天×70% + 30天×30%']],
          blanks: [
            { key: 'w', label: '加权日均销量（保留 1 位）', hint: d7 + '×70% + ' + d30 + '×30%', unit: '单', value: Number(w.toFixed(1)) },
            { key: 'per', label: '本周单均广告成本（保留 2 位）', hint: '花费 ÷（加权日均 × 7）', unit: '$', value: Number((spend / (w * 7)).toFixed(2)) }
          ],
          steps: [
            '加权日均 = ' + d7 + ' × 70% + ' + d30 + ' × 30% = ' + w.toFixed(1) + ' 单',
            '本周单量 ≈ ' + w.toFixed(1) + ' × 7 = ' + (w * 7).toFixed(1) + ' 单',
            '单均广告成本 = $' + spend + ' ÷ ' + (w * 7).toFixed(1) + ' = ' + F.money(spend / (w * 7))
          ],
          usage: '为什么要加权而不是简单取 30 天平均？因为促销、断货、季节波动会让 30 天均值严重滞后。7 天权重给到 70%，是为了让补货与预算决策跟得上最近的变化。',
          caveat: '加权系数（70/30）是经验口径，不同公司可能用 60/40 或简单 7 天平均；面试时报口径比报数字重要。'
        };
      }
    },
    {
      id: 'F38', dim: 'ads', layer: 'base', title: '广告位的订单集中度',
      build: function () {
        const impTop = R.int(8, 16), impRest = 100 - impTop;
        const ordTop = R.int(38, 55), ordRest = 100 - ordTop;
        return {
          title: '广告位的订单集中度', dim: 'ads', layer: 'base',
          scene: '按广告位拆分的报告：搜索结果顶部占曝光 ' + impTop + '%、占订单 ' + ordTop + '%；其余位置占曝光 ' + impRest + '%、占订单 ' + ordRest + '%。请算顶部位置的「订单集中度倍数」。',
          kv: [['顶部曝光占比', impTop + '%'], ['顶部订单占比', ordTop + '%'], ['其余位置', impRest + '% 曝光 / ' + ordRest + '% 订单']],
          blanks: [
            { key: 'mult', label: '顶部订单集中度倍数（保留 2 位）', hint: '订单占比 ÷ 曝光占比', unit: '倍', value: Number((ordTop / impTop).toFixed(2)) },
            { key: 'gapImp', label: '顶部曝光还差的份额（百分点）', hint: '订单占比 − 曝光占比', unit: '%', value: ordTop - impTop }
          ],
          steps: [
            '集中度倍数 = ' + ordTop + '% ÷ ' + impTop + '% = ' + (ordTop / impTop).toFixed(2) + ' 倍',
            '含义：顶部位置用 ' + impTop + '% 的曝光，产出了 ' + ordTop + '% 的订单',
            '曝光份额缺口 = ' + ordTop + '% − ' + impTop + '% = ' + (ordTop - impTop) + ' 个百分点 → 值得加位置溢价'
          ],
          usage: '位置溢价该不该加，就看这个倍数。倍数明显大于 1（比如 3 倍以上），说明顶部位置的人更愿意买；此时加溢价是「用更贵的点击换更高的转化」，账是算得过来的。倍数接近 1，加了只是白花钱。',
          caveat: '位置报告需要广告活动跑够数据量才有意义（建议至少 30 天或 100 次点击/位置）；样本不足时倍数波动极大，不能据此调溢价。'
        };
      }
    }
  );

  /* ============================================================
     单选 30 题（Q63–Q92）
     ============================================================ */
  DATA.MCQ.push(
    {
      id: 'Q63', dim: 'ads', layer: 'base', type: 'single',
      stem: '周一拉上周的搜索词报告，看到一个词：28 次点击、0 单、花费 $31，客单价 $34.99。同时另一个词 6 次点击、2 单。你第一步做什么：',
      options: [
        { id: 'a', text: '把两个词都调一遍 bid，一个降一个升', kind: 'assistant', note: '方向没错，但跳过了「先处理确定的浪费」。28 点击 0 单的词，$31 已经确定是沉没成本，应该先止损再谈优化。' },
        { id: 'b', text: '先在活动层级否定 28 点击 0 单的词，再把 6 点击 2 单的词提为手动精准', kind: 'correct', note: '正确。分词四象限的标准动作：高花费 0 转化→否定（止损），有单高转化→提手动（放大）。两个动作可以同一次做完。' },
        { id: 'c', text: '把 0 单的词 bid 降一半，观察一周再说', kind: 'order', note: '降 bid 只降低单次成本，这个词仍然在花预算。已经 28 次点击 0 单，数据量足够下结论，没必要再等一周。' },
        { id: 'd', text: '先优化 Listing，提高整体转化率', kind: 'wrong', note: '整体转化率是结果，不是病因。其他词在出单说明 Listing 能转化，问题在这个词本身不精准。' }
      ],
      answer: ['b'],
      summary: '分词四象限要一起做：否掉该否的（止损），提起该提的（放大）。只做一半，就会出现「预算越切越小」或「一直给垃圾流量付费」两种结果。'
    },
    {
      id: 'Q64', dim: 'ads', layer: 'base', type: 'single',
      stem: '某搜索词：9 次点击、0 单、花费 $18。按你的否词纪律，你该怎么做：',
      options: [
        { id: 'a', text: '不否，因为点击不足 20', kind: 'assistant', note: '只用了两把尺子里的一把。花费 $18 已经越过 $15 的门槛——贵的流量比大的流量更伤，9 次点击花 $18 说明 CPC 是 $2，这种词继续跑就是在烧钱。' },
        { id: 'b', text: '否掉，因为花费已越过 $15 门槛（两条尺子任一条成立即可）', kind: 'correct', note: '正确。门槛是「点击≥20 且 0 单」或「花费≥$15 且 0 单」，是「或」不是「且」。' },
        { id: 'c', text: '降到最低 bid，让它自然跑干', kind: 'order', note: '降 bid 会保留这个词，但它已经证明不转化，保留只是在拖时间。而且低价位可能跑到更差的位置，数据更没参考价值。' },
        { id: 'd', text: '把它加到手动活动里继续测试', kind: 'wrong', note: '方向完全反了——0 单的词该杀，不该加码。' }
      ],
      answer: ['b'],
      summary: '两把尺子的意义：一把量「点击多但全无效」，一把量「点击少但太贵」。只用一把，就会漏掉一半的浪费。'
    },
    {
      id: 'Q65', dim: 'ads', layer: 'base', type: 'single',
      stem: '你要否定一个跑偏的词，关于「在哪一层否」，正确的做法是：',
      options: [
        { id: 'a', text: '在广告活动层级做精准否定，让整个活动都不再匹配这个词', kind: 'correct', note: '正确。否词要在活动层级生效，这样该活动下所有广告组、所有匹配方式都不会再吃这个词。' },
        { id: 'b', text: '只在出问题的那个广告组里否，不动其他组', kind: 'order', note: '不够彻底。同一个活动下的其他组仍可能匹配到这个词，浪费还在继续。' },
        { id: 'c', text: '在账户层级否，一劳永逸', kind: 'wrong', note: '过度了。账户层级否定会把这个词从所有活动里切掉，包括那些这个词本来表现不错的活动（比如竞品 ASIN 投放）。' },
        { id: 'd', text: '不用否，把匹配方式改成精准就行', kind: 'wrong', note: '改成精准匹配不等于否定。如果用精准匹配投的还是这个词本身，它还是会跑，只是匹配范围小了。' }
      ],
      answer: ['a'],
      summary: '否词层级决定影响范围：活动层级是默认选择（够用且可控），广告组层级太窄，账户层级太宽。否完 3 天内必须复查曝光。'
    },
    {
      id: 'Q66', dim: 'ads', layer: 'base', type: 'single',
      stem: '自动广告跑出三个好词（CVR 都在 18% 以上）。你把它们提到手动精准后，自动活动该怎么处理：',
      options: [
        { id: 'a', text: '不用管，自动广告继续跑，多点曝光是好事', kind: 'wrong', note: '会造成同词双投：自动和手动抢同一批流量，整体 CPC 被推高，而且自动那边你控不住出价。' },
        { id: 'b', text: '在自动活动里对这三个词做精准否定，让流量集中到手动精准里', kind: 'correct', note: '正确。这是 SP 七步闭环第 6 步的收尾动作：词搬家之后要在源头把口子堵上。' },
        { id: 'c', text: '把自动广告关掉，只留手动', kind: 'order', note: '过度了。自动广告的价值是持续拓词，关掉等于放弃了词库的探索能力。' },
        { id: 'd', text: '把自动广告的 bid 降到最低', kind: 'assistant', note: '降 bid 不能阻止自动继续匹配这些词，只是让它的出价更低——结果可能是这些词在自动里以低价跑，反而把手动的排名往下拉。' }
      ],
      answer: ['b'],
      summary: '提词必须配否定，这是同一个动作的两半。只提不否，等于给同一个词付两遍钱。'
    },
    {
      id: 'Q67', dim: 'ads', layer: 'base', type: 'single',
      stem: '一个精准匹配的词跑了 3 天，只拿到 80 次曝光、1 次点击。你的判断和动作是：',
      options: [
        { id: 'a', text: '曝光太低，先提 bid 争取更多展示', kind: 'correct', note: '正确。低曝光就提 bid，这是分词四象限里「低曝光」象限的标准动作——问题在进不了竞价，而不是转化。' },
        { id: 'b', text: '直接否掉，3 天都没量说明没需求', kind: 'wrong', note: '80 次曝光的样本几乎等于没有数据，用「没量」判定「没需求」，是把统计噪音当成结论。' },
        { id: 'c', text: '改成广泛匹配扩大流量池', kind: 'order', note: '方向可辩（扩匹配确实能加曝光），但先要确认是「出价进不了竞价」还是「匹配太窄」。盲目放宽会让流量更不精准。' },
        { id: 'd', text: '检查详情页转化率', kind: 'wrong', note: '1 次点击谈不上转化率。此时查详情页是拿一个不存在的指标做诊断。' }
      ],
      answer: ['a'],
      summary: '低曝光先提 bid（单次 10%–20%，观察 3 天）；低 CTR 查词与主图；低 CVR 查详情页。三个症状对应三个完全不同的动作，不能混。'
    },
    {
      id: 'Q68', dim: 'ads', layer: 'base', type: 'single',
      stem: '新品上架第 1 周，要开第一个 SP 手动活动。竞价策略选哪个：',
      options: [
        { id: 'a', text: '动态竞价 - 只降低', kind: 'correct', note: '正确。新品期最怕把钱花在不会成交的位置上，「只降低」在不牺牲出价上限的前提下帮你省钱，是冷启动的默认选择。' },
        { id: 'b', text: '动态竞价 - 提高和降低', kind: 'assistant', note: '这个模式会在高概率位置提价、低概率位置降价。新品没有历史转化数据，系统判断的「高概率」并不准，容易把预算推到贵位置。' },
        { id: 'c', text: '固定竞价', kind: 'order', note: '固定竞价可控性最强，但也放弃了所有分层优化的空间；在预算紧张的冷启动期，通常不如「只降低」划算。' },
        { id: 'd', text: '先设成提高和降低，跑一周再改', kind: 'wrong', note: '第一周的数据会被这种策略污染——你看到的高点击成本可能来自策略，而不是你的词或 Listing 有问题，结论无法归因。' }
      ],
      answer: ['a'],
      summary: '竞价策略跟着阶段走：冷启动「只降低」（省钱、保守）→ 数据稳定后「提高和降低」（抢位置）→ 清货期可以「只降低」+ 低预算。'
    },
    {
      id: 'Q69', dim: 'ads', layer: 'base', type: 'single',
      stem: '某活动每天上午 10 点预算就花完了，下午完全没有曝光，ACOS 却只有 18%（毛利率 33%）。你的处理是：',
      options: [
        { id: 'a', text: '提预算，因为 ACOS 18% 远低于毛利率，这个活动明显在赚钱', kind: 'correct', note: '正确。ACOS 18% < 毛利率 33%，说明每单都在赚；预算提前烧完意味着你在放弃下午的盈利机会。这是最典型的「该加预算」信号。' },
        { id: 'b', text: '降 bid，让预算撑满全天', kind: 'assistant', note: '降 bid 会让每单更便宜，但也让这个赚钱的活动少跑很多量。用降 bid 解决「预算不够」，等于用错误工具修问题。' },
        { id: 'c', text: '设置分时投放，只在上午跑', kind: 'order', note: '把赚钱的时间段主动砍掉一半，逻辑上说不通。除非数据证明下午的 CVR 明显更差。' },
        { id: 'd', text: '关掉这个活动，换新活动重开', kind: 'wrong', note: '一个赚钱的活动没有任何理由关掉。重开还会丢掉已有的历史数据与权重。' }
      ],
      answer: ['a'],
      summary: '「预算提前花完」要分两种情况：ACOS 低于毛利率 → 加预算（在赚钱，别停）；ACOS 高于毛利率 → 降 bid 或否词（在亏钱，先控成本）。同一个现象，两种相反的解法。'
    },
    {
      id: 'Q70', dim: 'ads', layer: 'base', type: 'single',
      stem: '位置报告显示：搜索结果顶部曝光 11%、订单 42%；其余位置曝光 89%、订单 58%。你打算怎么调整：',
      options: [
        { id: 'a', text: '给顶部位置加 30%–50% 溢价，先用小幅度测试', kind: 'correct', note: '正确。顶部集中度 42/11 ≈ 3.8 倍，说明顶部位置的人更愿意买；小幅溢价测试是标准做法，加完盯曝光与 ACOS 变化。' },
        { id: 'b', text: '直接把顶部溢价加到 200%，一次抢到位', kind: 'wrong', note: '溢价是乘法。一次加太猛，CPC 会被推到盈亏线以上，ACOS 立刻失控。位置溢价要小步走。' },
        { id: 'c', text: '不加溢价，把预算全投到商品页面', kind: 'assistant', note: '方向反了：商品页面曝光多但订单少，把预算挪过去是往效率低的地方走。' },
        { id: 'd', text: '把所有位置的 bid 统一提高', kind: 'order', note: '这是「全账户一起收紧/放开」的翻版，会同时抬高低效位置的出价，钱花得更不精准。' }
      ],
      answer: ['a'],
      summary: '位置溢价是「按位置付费」的唯一工具。判断依据只有一条：这个位置的订单占比 ÷ 曝光占比 是否明显大于 1。'
    },
    {
      id: 'Q71', dim: 'ads', layer: 'base', type: 'single',
      stem: '新品开了自动广告，跑到第 7 天。按 SP 七步闭环，你下一步最先做的是：',
      options: [
        { id: 'a', text: '拉搜索词报告，做分词四象限归类', kind: 'correct', note: '正确。第 4 步就是「7 天搜索词报告」，这是把自动广告的探索结果变成可操作动作的唯一入口。' },
        { id: 'b', text: '开第二个手动活动，把预算铺开', kind: 'wrong', note: '词还没分出来就开手动，等于在没有任何依据的情况下建结构，后面全是返工。' },
        { id: 'c', text: '先看 ACOS 决定要不要继续投', kind: 'assistant', note: 'ACOS 是结果指标，不是病因。7 天的 ACOS 波动大，直接拿它做决策容易误杀。' },
        { id: 'd', text: '把自动广告的预算翻倍', kind: 'wrong', note: '数据还没分析就加预算，等于把未知的效率放大一倍。' }
      ],
      answer: ['a'],
      summary: 'SP 七步闭环：选词 → 埋词 → 自动广告 → 7 天搜索词报告 → 分词（四象限）→ 手动分层 → 周报复盘。第 4 步不做，后面全是拍脑袋。'
    },
    {
      id: 'Q72', dim: 'ads', layer: 'ops', type: 'single',
      stem: '某链接：ACOS 46%（毛利率 30%），但 CVR 9.2%（类目均值 6%）、自然单占比从 15% 涨到 34%、TACOS 从 26% 降到 18%。主管问要不要停广告：',
      options: [
        { id: 'a', text: '停掉，ACOS 46% 已经远超毛利率 30%，每单都在亏', kind: 'assistant', note: '只看 ACOS。四个指标里三个在改善（CVR 高、自然单占比涨、TACOS 降），这正是「广告买排名生效」的典型曲线，ACOS 高是特征不是缺陷。' },
        { id: 'b', text: '不停，但设观察线：盯自然单占比与 TACOS 趋势，同时把预算集中到高转化词', kind: 'correct', note: '正确。判断「买排名」是否成功，看的是 TACOS 与自然单占比的趋势，而不是单周 ACOS。' },
        { id: 'c', text: '降到最低预算，保持链接活跃就行', kind: 'wrong', note: '预算降到最低会打断正在形成的排名积累，等于前期投入白费，而且还占着一个活动的名额。' },
        { id: 'd', text: '停掉广告，但保留预算等自然单起来', kind: 'wrong', note: '广告停了，自然单的增长动力也断了——这条链接的自然单正是广告买来的排名带动的。' }
      ],
      answer: ['b'],
      summary: '「ACOS 高于毛利」有三种情况：在买排名（TACOS 降、自然单涨）、在失控（TACOS 涨、自然单不涨）、在清货（看周转不看毛利）。分不清这三种就做决定，一定会做错其中两次。'
    },
    {
      id: 'Q73', dim: 'ads', layer: 'base', type: 'single',
      stem: '某 ASIN 广告订单占比 85%，自然订单只占 15%，TACOS 28%。这个链接的诊断是：',
      options: [
        { id: 'a', text: '广告效果很好，85% 的订单都来自广告，说明投放精准', kind: 'wrong', note: '广告订单占比高不是成绩，是依赖。85% 意味着停广告基本就停单，链接没有形成自然排名。' },
        { id: 'b', text: '广告依赖度过高，说明买来的排名没有转化成自然流量，要查 Listing 转化与评论基数', kind: 'correct', note: '正确。TACOS 28% 也偏高（健康品牌通常 10%–18%），两个指标同时指向「自然流量没起来」。' },
        { id: 'c', text: '立即把广告预算砍一半，逼自然单起来', kind: 'wrong', note: '一刀砍预算会让订单直接腰斩，排名掉得更快。要先修基础，再逐步降压。' },
        { id: 'd', text: '开更多广告活动覆盖更多词', kind: 'assistant', note: '在依赖度已经 85% 的情况下加投，只会让依赖度更高、TACOS 更难看。' }
      ],
      answer: ['b'],
      summary: '广告订单占比是「链接健康度」的体温计：80% 以上是危险信号，40%–70% 是过渡期（正常），40% 以下是自然流量为主（健康）。'
    },
    {
      id: 'Q74', dim: 'ads', layer: 'base', type: 'single',
      stem: '自查发现核心词同时在自动活动和手动精准里跑，两周多花了约 $80。你的处理顺序是：',
      options: [
        { id: 'a', text: '先在自动活动里精准否定该词，再核对手动那边的出价是否合理', kind: 'correct', note: '正确。先堵住重复付费的口子（止损），再优化保留下来的那个活动（提效）。顺序不能反。' },
        { id: 'b', text: '先优化手动活动的出价，再处理自动', kind: 'order', note: '顺序反了。手动还在被自动拖着竞价，先调手动出价，等于在一个被污染的环境里做优化。' },
        { id: 'c', text: '两个都关掉，重新建一个干净的活动', kind: 'wrong', note: '关活动会丢掉历史数据与权重，而且重建后仍会遇到同样的问题（因为结构上没想清楚）。' },
        { id: 'd', text: '不用处理，两个活动都在出单，属于良性竞争', kind: 'wrong', note: '同词双投不是良性竞争，是自我抬价：两个活动抢同一个展示机会，整体 CPC 会上升。' }
      ],
      answer: ['a'],
      summary: '同词双投的解法是「留强关弱 + 源头否定」。留哪个，看哪个活动的可控性高（手动精准可控性最强）。'
    },
    {
      id: 'Q75', dim: 'ads', layer: 'base', type: 'single',
      stem: '上周否掉了 6 个泛词，本周总订单从 120 掉到 88。你的第一反应是：',
      options: [
        { id: 'a', text: '立刻把这 6 个词全部恢复', kind: 'order', note: '方向可辩，但「立刻全部恢复」是过度反应。先要确认订单下滑是否真的由否词引起（也可能是季节、竞品、库存）。' },
        { id: 'b', text: '先拉数据确认下滑是否由否词引起（对比被否词的历史订单与本周其他变动），再决定恢复哪几个', kind: 'correct', note: '正确。否词后销量掉要「立刻拉回」是纪律，但拉回之前得先确认因果——否则可能在为一个不是自己造成的问题改动作。' },
        { id: 'c', text: '继续观察两周再说', kind: 'assistant', note: '两周对一个正在掉单的链接太长。如果确实是否词造成，两周后排名已经受损。' },
        { id: 'd', text: '把预算加倍，用广告补回单量', kind: 'wrong', note: '在原因不明时加预算，等于用钱掩盖问题，而且成本会立刻体现在 ACOS 上。' }
      ],
      answer: ['b'],
      summary: '否词纪律里有一条常被忽略：否完 3 天内复查，销量明显下滑要立刻把词拉回来。但「立刻」的前提是因果清楚——先看数据再动手，不算拖延。'
    },
    {
      id: 'Q76', dim: 'ads', layer: 'base', type: 'single',
      stem: '某核心词的广告曝光没变，但自然排名从第 1 页掉到第 3 页。你的排查顺序是：',
      options: [
        { id: 'a', text: '先查转化率与近期差评，再看竞品是否上新或降价，最后才看广告', kind: 'correct', note: '正确。曝光没变说明广告还在跑，但自然排名掉了——自然排名由转化、评价、点击、竞争环境共同决定，广告不是第一嫌疑。' },
        { id: 'b', text: '加广告预算把排名买回来', kind: 'assistant', note: '在转化率可能已经下滑的情况下加预算，是把更多流量引向一个接不住的页面，排名会更差。' },
        { id: 'c', text: '提高该词的 bid，抢更多广告位', kind: 'order', note: '广告位和自然排名是两套系统。曝光没变说明广告位没问题，加 bid 解决不了自然排名。' },
        { id: 'd', text: '改标题，重新埋词', kind: 'wrong', note: '在没定位原因前改标题，可能破坏已有的相关性权重，让排名更差。' }
      ],
      answer: ['a'],
      summary: '「广告曝光正常但自然排名掉」是典型的「转化端问题」。自然排名是转化率、评价、点击率、销量的综合结果，广告只是其中一个输入。'
    },
    {
      id: 'Q77', dim: 'ads', layer: 'base', type: 'single',
      stem: '广泛匹配活动跑了两周，搜索词报告里出现了大量与产品完全无关的词（材质不符、用途不符），花费占了 40%。你的处理是：',
      options: [
        { id: 'a', text: '把不相关的词全部否定，并把广泛匹配改成词组匹配收窄范围', kind: 'correct', note: '正确。先止损（否掉已确认的浪费），再收窄匹配方式（防止新的不相关流量涌入）。两步一起做才彻底。' },
        { id: 'b', text: '只否词，匹配方式不动', kind: 'order', note: '只否词是打地鼠：本周否完，下周又冒出新的不相关词。收窄匹配方式才是从源头解决。' },
        { id: 'c', text: '直接关掉广泛匹配活动，只留精准', kind: 'wrong', note: '过度反应。广泛匹配的价值是拓词，关掉等于放弃探索；应该收窄而不是关掉。' },
        { id: 'd', text: '提高 bid，让好词拿到更多曝光盖过坏词', kind: 'wrong', note: '提高 bid 会让不相关词也拿到更多曝光和花费，问题是放大而不是缩小。' }
      ],
      answer: ['a'],
      summary: '广泛匹配跑偏的标准处理是「否词 + 收窄匹配」两步走。只否不收，等于每周重做一次同样的清理工作。'
    },
    {
      id: 'Q78', dim: 'ads', layer: 'base', type: 'single',
      stem: '一个已经验证过的核心词（CVR 12%），你打算单独给它建活动。匹配方式选哪个：',
      options: [
        { id: 'a', text: '精准匹配，单独控价与预算', kind: 'correct', note: '正确。已验证的核心词要的是「稳定拿到这个流量」，精准匹配最可控，能单独看它的表现、单独调价。' },
        { id: 'b', text: '广泛匹配，争取更多长尾流量', kind: 'assistant', note: '广泛匹配会把流量扩到不确定的方向，反而稀释了这个已验证词的效率。拓词应该另开一个活动做。' },
        { id: 'c', text: '词组匹配，兼顾精准与扩展', kind: 'order', note: '词组是折中，但在预算有限时折中往往两边都不占优。已验证的核心词应该先吃干净。' },
        { id: 'd', text: '不建新活动，留在自动里就好', kind: 'wrong', note: '留在自动里无法单独控价、无法单独看表现，等于把这个最好的词交给系统随机分配。' }
      ],
      answer: ['a'],
      summary: '已验证的好词用精准（可控、可放大），未验证的方向用广泛/自动（探索）。匹配方式是「任务分配工具」，不是「越宽越好」。'
    },
    {
      id: 'Q79', dim: 'ads', layer: 'base', type: 'single',
      stem: '新品自动广告刚开 3 天，曝光 1200、点击 6、0 单。运营群里有人说「不行，赶紧关掉」。你的判断：',
      options: [
        { id: 'a', text: '样本量太小，继续跑满 7 天再看搜索词报告', kind: 'correct', note: '正确。6 次点击的 0 单是统计噪音；SP 七步闭环明确要求「7 天搜索词报告」，3 天就下结论违背了流程。' },
        { id: 'b', text: '同意关掉，3 天没单说明产品没需求', kind: 'wrong', note: '6 次点击就判定没需求，是典型的用噪音做结论。按 7% CVR 算，6 次点击的期望订单是 0.4 单——0 单完全正常。' },
        { id: 'c', text: '马上把预算加大，冲更多点击', kind: 'order', note: '方向可以接受（加快样本积累），但「马上加大」在没看词的前提下容易把钱花在错的地方。先小幅提预算更稳。' },
        { id: 'd', text: '先换主图，CTR 只有 0.5%，图肯定有问题', kind: 'assistant', note: '0.5% 的 CTR 在 3C/杯壶口径（0.3%–0.5%）里属于正常偏上，不是问题；而且 1200 曝光的 CTR 波动极大。' }
      ],
      answer: ['a'],
      summary: '广告决策的样本门槛：判断词的好坏需要 ≥20 点击，判断 CVR 偏移需要 50–100 点击，判断 Listing 问题需要至少一周。低于门槛时，正确动作是「继续观察」，不是「动手」。'
    },
    {
      id: 'Q80', dim: 'ads', layer: 'base', type: 'single',
      stem: '某活动一周花 $300，只出 3 单，客单价 $35。算出 ACOS 约 285%。你最该先做的事：',
      options: [
        { id: 'a', text: '拉搜索词报告，找出高花费 0 转化的词先否定，同时确认 Listing 是否有硬伤', kind: 'correct', note: '正确。285% 的 ACOS 已经不是「优化」能解决的量级，先做止损（否词）与基础体检（Listing 能不能转化），再谈结构。' },
        { id: 'b', text: '把 bid 统一降 20%，等 ACOS 下来', kind: 'assistant', note: '统一降价是「全账户一起收紧」，在这类量级的问题上力度远远不够（降 20% 只能把 285% 变成 228%），而且会误伤本来正常的词。' },
        { id: 'c', text: '直接关掉活动止损', kind: 'order', note: '关掉是最后手段。在没定位原因前关掉，等于放弃了这条链接的广告，也不知道问题出在哪，重开还会重犯。' },
        { id: 'd', text: '提高客单价（涨价）来降低 ACOS', kind: 'wrong', note: '涨价会先杀转化率，CVR 掉了 ACOS 反而更高。这是把问题从一个指标转移到另一个指标。' }
      ],
      answer: ['a'],
      summary: 'ACOS 高出毛利率数倍时，先分清是「词不精准」还是「Listing 接不住」。前者靠否词，后者靠改页面——两个动作不能互相替代。'
    },
    {
      id: 'Q81', dim: 'ads', layer: 'base', type: 'single',
      stem: 'Prime Day 前两周，你的广告 ACOS 稳定在 25%、毛利率 35%。这时该怎么做：',
      options: [
        { id: 'a', text: '逐步提高预算与核心词 bid，为大促蓄量，同时提前否掉低效词腾出预算', kind: 'correct', note: '正确。大促前是「储备流量与位置」的窗口，先把低效词清掉，再把预算加到高转化词上。' },
        { id: 'b', text: '保持原样不动，等大促当天再调', kind: 'wrong', note: '大促当天的竞价环境会瞬间变贵，临时加预算往往抢不到位置。位置竞争是提前打的。' },
        { id: 'c', text: '把预算砍一半，把钱留到大促当天用', kind: 'assistant', note: '削减平时预算会让排名在蓄水期下滑，大促当天即使加钱也接不住——排名不是当天就能买的。' },
        { id: 'd', text: '把 ACOS 压到 15% 以下，多存点利润', kind: 'wrong', note: '在流量高峰期前压 ACOS，等于主动放弃增量。此时该关注的是「绝对单量与排名」，不是最低 ACOS。' }
      ],
      answer: ['a'],
      summary: '大促节奏：提前 2–3 周蓄水（清低效、加核心词、抢位置）→ 大促期间控 ACOS 下限（保证不断货、不失控）→ 大促后回落（恢复常态预算，盯排名是否守得住）。'
    },
    {
      id: 'Q82', dim: 'ads', layer: 'base', type: 'single',
      stem: '竞品突然降价 15%，你的 CVR 从 7.2% 掉到 5.1%，ACOS 从 24% 涨到 34%。你的应对是：',
      options: [
        { id: 'a', text: '不跟降价，先用 Coupon 做短期对冲，同时查详情页与评论差距，广告侧对高花费低转化词降 bid', kind: 'correct', note: '正确。降价是永久性动作，先算清自己能不能扛；Coupon 可回收、可测。同时广告侧要止损（CVR 掉了，同样的 CPC 换来的订单更少）。' },
        { id: 'b', text: '立刻跟降 15%，把 CVR 抢回来', kind: 'assistant', note: '跟降会永久损伤价格带与利润结构，而且对方可能继续降。没有算过毛利底线就跟价，是拿利润换一个不确定的结果。' },
        { id: 'c', text: '加大广告预算，用曝光弥补转化下滑', kind: 'wrong', note: 'CVR 掉的时候加预算，等于把更低的转化效率放大，亏损同步放大。' },
        { id: 'd', text: '暂停广告，等对方降完价再说', kind: 'wrong', note: '暂停会让排名掉下去，等对方恢复价格时你还要重新买排名，成本更高。' }
      ],
      answer: ['a'],
      summary: '竞品降价的应对顺序：算自己的毛利底线 → 用可回收手段（Coupon/捆绑）短期对冲 → 找非价格差异（评论、A+、场景图）→ 广告侧止损。直接跟价是最后选项。'
    },
    {
      id: 'Q83', dim: 'ads', layer: 'base', type: 'single',
      stem: '某老活动 ACOS 一直稳定在 22%，但曝光份额从 35% 掉到 18%，单量也在缓慢下滑。你的判断是：',
      options: [
        { id: 'a', text: 'ACOS 好看但份额在掉，说明是被竞品抢了位置；要查竞品出价与新进入者，考虑提 bid 保份额', kind: 'correct', note: '正确。ACOS 稳定可能只是「投得更少、但投得更准」，份额下滑说明这个池子正在被别人吃掉。' },
        { id: 'b', text: 'ACOS 没变，说明活动健康，不用管', kind: 'wrong', note: 'ACOS 是效率指标，份额是规模指标。效率稳定但规模萎缩，等于「越来越精准地输掉市场」。' },
        { id: 'c', text: '直接关掉这个活动，重开一个', kind: 'wrong', note: '老活动的历史权重是资产，关掉重建等于归零。' },
        { id: 'd', text: '降 bid 进一步优化 ACOS', kind: 'assistant', note: '降 bid 会让份额掉得更快。方向完全相反。' }
      ],
      answer: ['a'],
      summary: 'ACOS 与曝光份额要一起看：ACOS 稳、份额跌 = 在被抢市场；ACOS 涨、份额涨 = 在花钱买份额（要看阶段是否允许）；两个都跌 = 活动在萎缩。'
    },
    {
      id: 'Q84', dim: 'ads', layer: 'ops', type: 'single',
      stem: '清货期：库存 900 件、日均 4 单、库龄 300 天、净利率 3%。广告预算只剩 $200/月。你怎么投：',
      options: [
        { id: 'a', text: '只投能带来转化的精准词，容忍 ACOS 高于毛利率，目标是周转而不是利润', kind: 'correct', note: '正确。清货期的目标函数变了：把库存变成现金比保住毛利重要。此时 ACOS 的天花板是「仓储费 + 资金占用成本」，不是毛利率。' },
        { id: 'b', text: '按正常标准把 ACOS 压到毛利率以下，不赚钱就不投', kind: 'assistant', note: '套用了常规期的标准。库龄 300 天，再过 65 天就进 365 天超高费率区，那时候的仓储费远比多花的广告费贵。' },
        { id: 'c', text: '把钱全部投到品牌词，维持品牌形象', kind: 'wrong', note: '清货期要的是「清」，品牌词流量小且转化有限，用不上这笔钱。' },
        { id: 'd', text: '不投广告，靠自然流量慢慢卖', kind: 'wrong', note: '日均 4 单、900 件库存，靠自然流量要 225 天——早就进了超高费率区。' }
      ],
      answer: ['a'],
      summary: '清货期的判断标准是「周转天数」和「库龄」，不是 ACOS。可容忍的 ACOS 上限 ≈（毛利 + 避免的超龄仓储费）÷ 售价。这一条在面试里讲出来，能直接区分「只会压 ACOS 的人」和「懂阶段目标的人」。'
    },
    {
      id: 'Q85', dim: 'ads', layer: 'base', type: 'single',
      stem: '某周 TACOS 从 14% 涨到 19%，但 ACOS 稳定在 24%。最可能的解释是：',
      options: [
        { id: 'a', text: '总销售额在下降（自然单减少），广告花费没变，所以 TACOS 被推高了', kind: 'correct', note: '正确。TACOS = 花费 ÷ 总销售额。ACOS 不变说明广告自身的效率没变，TACOS 涨说明分母（总销售额）在缩水——通常是自然单在掉。' },
        { id: 'b', text: '广告花费大幅增加', kind: 'wrong', note: '花费增加会同时推高 ACOS（因为 ACOS 的分母是广告销售额，花费涨而广告销售额不同步涨的话）。ACOS 稳定说明花费与广告销售额同比例变化。' },
        { id: 'c', text: '客单价下降', kind: 'wrong', note: '客单价下降会先影响 ACOS（广告销售额变小），而不是只影响 TACOS。' },
        { id: 'd', text: '广告订单占比上升', kind: 'wrong', note: '广告订单占比上升确实会推高 TACOS，但它同时意味着广告销售额占比上升，通常 ACOS 变化更明显。' }
      ],
      answer: ['a'],
      summary: 'TACOS = 花费 ÷ 总销售额，ACOS = 花费 ÷ 广告销售额。ACOS 不变而 TACOS 涨，几乎一定是「总销售额里的自然部分在缩水」。这条推导在面试里非常好看。'
    },
    {
      id: 'Q86', dim: 'ads', layer: 'base', type: 'single',
      stem: '自动广告报告里「其他搜索词」（不展示具体词）占了 45% 的花费。你该怎么处理：',
      options: [
        { id: 'a', text: '接受它：这部分是长尾流量，无法逐个优化；重点管好能看见的那 55%', kind: 'correct', note: '正确。「其他搜索词」是平台归并的长尾，无法单独否定或调价。能做的是控该活动的整体 bid 与预算，保证整体效率在可接受范围。' },
        { id: 'b', text: '想办法把「其他搜索词」也否掉，只保留具体词', kind: 'wrong', note: '技术上做不到——你无法否定一个不显示具体内容的聚合项。' },
        { id: 'c', text: '关掉自动广告，因为 45% 的花费看不见', kind: 'wrong', note: '过度反应。看不见不等于无效，长尾流量往往是自动广告的主要价值来源。' },
        { id: 'd', text: '把自动广告的 bid 提到最高，让长尾拿到更多曝光', kind: 'wrong', note: '在无法归因的流量上加价，是把不可控的部分放大。' }
      ],
      answer: ['a'],
      summary: '「其他搜索词」是广告报告的结构性限制，不是可以优化的对象。它的正确管理方式是「控总额」（bid + 预算），而不是「控单词」。'
    },
    {
      id: 'Q87', dim: 'ads', layer: 'base', type: 'single',
      stem: '一个手动精准活动跑了 6 个月，能买的词几乎都买过了，曝光开始停滞，ACOS 很稳定但单量不涨。下一步：',
      options: [
        { id: 'a', text: '向外扩：开词组/广泛匹配或竞品 ASIN 投放，用新的流量池找增量', kind: 'correct', note: '正确。精准活动的流量池是有限的，吃到天花板后必须换池子。这也是「精准保效率、广泛找增量」的分工。' },
        { id: 'b', text: '继续提高 bid，把现有的词买到更多曝光', kind: 'assistant', note: '在需求已饱和的词上加价，只是为同样的曝光付更多钱，ACOS 会先恶化。' },
        { id: 'c', text: '把预算翻倍', kind: 'wrong', note: '池子就这么大，预算加一倍也花不出去（或者花在更差的位置），只会拉低效率。' },
        { id: 'd', text: '关掉活动，重新建一个', kind: 'wrong', note: '活动本身没问题，是流量池到顶了。关掉重建不解决天花板问题。' }
      ],
      answer: ['a'],
      summary: '精准匹配吃的是「已知的确定性」，天花板来得快。到了天花板就要换池子（词组/广泛/竞品 ASIN/关联流量），这是增长的必要动作。'
    },
    {
      id: 'Q88', dim: 'ads', layer: 'base', type: 'single',
      stem: '新品第 1 周，品牌还没备案。关于要不要开 SB（品牌推广），你的判断是：',
      options: [
        { id: 'a', text: '开不了：SB 需要品牌备案，这是硬前提', kind: 'correct', note: '正确。SB 与 SD 的品牌相关功能需要品牌备案，没有备案在后台根本投不了——这属于前提条件，不是取舍问题。' },
        { id: 'b', text: '能开，SB 只是不能投品牌词', kind: 'wrong', note: '前提就不是「能不能投品牌词」，而是「有没有备案」。没备案连入口都没有。' },
        { id: 'c', text: '能开，先小额测试', kind: 'wrong', note: '不存在「小额测试」这个选项——功能本身不可用。' },
        { id: 'd', text: '开不了，但可以先投 DSP', kind: 'wrong', note: 'DSP 有最低预算门槛（通常远高于新品预算），且需要品牌与账户资质，不适合新品牌做冷启动。' }
      ],
      answer: ['a'],
      summary: '广告类型的门槛要背清：SP 无门槛；SB / SD 需品牌备案；DSP 有预算与资质门槛。把「前提不满足」当成「策略选择」，是面试里很常见的失分点。'
    },
    {
      id: 'Q89', dim: 'ads', layer: 'base', type: 'single',
      stem: '关于广告活动结构（一个活动放多个词 vs 一词一活动），预算 $600/月时你的选择是：',
      options: [
        { id: 'a', text: '按「同层级、同目标」分组：核心精准词一个活动，拓词一个活动，不要一词一活动', kind: 'correct', note: '正确。一词一活动会让每个活动拿不到足够预算（<$1/天），数据全成噪音；按层级分组既能控预算，又能看清层级表现。' },
        { id: 'b', text: '一词一活动，方便精确控制每个词', kind: 'assistant', note: '控制粒度最细，但 $600 分给 30 个词就是每词 $20/月，一天不到 1 美元，连 20 次点击都买不到——精确控制了一个没有数据的词，没有意义。' },
        { id: 'c', text: '全部塞进一个活动，最省事', kind: 'wrong', note: '一个活动里混着核心词和拓词，无法给不同目标分配不同预算，也没法看出哪类词在赚钱。' },
        { id: 'd', text: '按上架时间分组，先上架的放一个活动', kind: 'wrong', note: '上架时间与广告效率无关，这个维度分不出有效信息。' }
      ],
      answer: ['a'],
      summary: '活动结构的分组维度应该是「任务」：核心词保效率、拓词买数据、防御占份额。按任务分组，预算才能按任务分配。'
    },
    {
      id: 'Q90', dim: 'ads', layer: 'base', type: 'single',
      stem: '一个词 ACOS 62%，毛利率 33%，你打算降 bid。合适的幅度与观察期是：',
      options: [
        { id: 'a', text: '单次降 10%–20%，观察 3 天再决定是否继续', kind: 'correct', note: '正确。单次 10%–20%、观察 3 天，是能看清效果又不至于一次调过头的节奏。' },
        { id: 'b', text: '一次降 50%，快速把 ACOS 压下来', kind: 'wrong', note: '降太多会直接掉出竞价，曝光和订单断崖式下滑，ACOS 可能因为单量太少而失真。' },
        { id: 'c', text: '一次只降 1%，慢慢磨', kind: 'assistant', note: '1% 的调整在数据噪音范围内，看不出效果，等于白调。' },
        { id: 'd', text: '不调 bid，直接否掉这个词', kind: 'order', note: 'ACOS 62% 不代表这个词该杀——它可能在出单，只是贵。先降 bid 保流量，比直接否掉更稳。' }
      ],
      answer: ['a'],
      summary: '调价纪律：单次 10%–20%，观察 3 天。幅度太小看不出效果，太大则直接破坏数据连续性。'
    },
    {
      id: 'Q91', dim: 'ads', layer: 'ops', type: 'single',
      stem: '老板说「预算砍一半，但排名必须保住」。你的排兵布阵是：',
      options: [
        { id: 'a', text: '先砍拓词与低效长尾，把预算集中到已验证的高转化精准词；用位置溢价保核心词首页位；接受单量下降但排名不掉', kind: 'correct', note: '正确。保排名的本质是「保住核心词的成交与点击」，不是「保住总花费」。砍掉探索性预算，把钱集中在决定排名的少数词上。' },
        { id: 'b', text: '所有活动 bid 统一降 50%，等比例收缩', kind: 'assistant', note: '等比例收缩会把核心词的曝光也砍掉一半，排名直接掉。砍预算要砍结构，不能砍平均。' },
        { id: 'c', text: '砍掉核心词的广告，靠自然单撑排名', kind: 'wrong', note: '核心词正是排名的来源，砍掉它等于主动放弃排名。' },
        { id: 'd', text: '把预算全投品牌词，看起来 ACOS 最低', kind: 'wrong', note: '品牌词 ACOS 低是因为流量本来就精准，但它不产生新客，也不支撑核心词排名。' }
      ],
      answer: ['a'],
      summary: '「降预算但保排名」的唯一解法是「结构性收缩」：砍探索、保核心、用溢价代替广撒网。平均削减一定失败，因为排名只看核心词的表现。'
    },
    {
      id: 'Q92', dim: 'ads', layer: 'base', type: 'single',
      stem: '淡季来临，单量下滑 40%，广告 ACOS 从 26% 涨到 41%。最合理的做法是：',
      options: [
        { id: 'a', text: '按淡季重新设 ACOS 目标（接受阶段性偏高），同时收缩到高转化词、暂停拓词，保住位置等旺季', kind: 'correct', note: '正确。淡季的转化率整体下滑，ACOS 上升是结构性的；此时该做的是「降规模、保位置」，而不是硬压 ACOS 把排名也一起丢掉。' },
        { id: 'b', text: '继续按 26% 的 ACOS 目标压，压不住就关活动', kind: 'wrong', note: '淡季压 ACOS 会同时失去排名，等旺季回来还要重新买位置，成本更高。' },
        { id: 'c', text: '加大预算冲单量，用规模摊薄成本', kind: 'wrong', note: '淡季需求整体下滑，加预算只会买到更贵的流量，ACOS 会更高。' },
        { id: 'd', text: '全部暂停广告，等旺季再开', kind: 'wrong', note: '停广告会让排名掉到谷底，旺季重开等于从零开始，而且旺季竞价更贵。' }
      ],
      answer: ['a'],
      summary: '淡季策略：降规模、保位置、调目标。ACOS 目标要随季节调整，「去年同期 26%、今年淡季 41%」是可以向主管解释的，但排名掉了就解释不了。'
    }
  );

  /* ============================================================
     多选 15 题（Q93–Q107）
     ============================================================ */
  DATA.MCQ.push(
    {
      id: 'Q93', dim: 'ads', layer: 'base', type: 'multi',
      stem: '分词四象限里，每一类对应一个动作。以下哪些映射是正确的？（多选）',
      options: [
        { id: 'a', text: '高转化（有单且 CVR 高）→ 提为手动精准，单独给预算', kind: 'correct', note: '正确。好词要搬到可控的位置上放大。' },
        { id: 'b', text: '高花费 0 转化 → 在活动层级精准否定', kind: 'correct', note: '正确。已经确定浪费的钱先止损。' },
        { id: 'c', text: '低曝光 → 提 bid 争取更多展示', kind: 'correct', note: '正确。低曝光是「进不了竞价」，不是「转化不好」，所以动作是提价而不是改页面。' },
        { id: 'd', text: '中间地带（有点击、有少量单）→ 立即提为手动精准', kind: 'wrong', note: '错误。中间地带应该留在原活动继续观察，数据量够了再决定搬走还是否掉。过早搬走会打断探索。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '四象限四动作：提词、否定、提价、观察。关键是「一件事只对应一个动作」，不要把所有词都丢进「加预算」这一个筐里。'
    },
    {
      id: 'Q94', dim: 'ads', layer: 'base', type: 'multi',
      stem: '关于否词纪律，以下哪些做法是对的？（多选）',
      options: [
        { id: 'a', text: '点击 ≥20 且 0 单，或花费 ≥$15 且 0 单，任一成立即可否', kind: 'correct', note: '正确。两条门槛是「或」的关系，分别管「量大」和「贵」两种浪费。' },
        { id: 'b', text: '否词在广告活动层级生效，一次覆盖该活动下所有广告组', kind: 'correct', note: '正确。活动层级是默认粒度，够用且不会误伤其他活动。' },
        { id: 'c', text: '否定后 3 天内复查曝光，销量明显下滑要立刻把词拉回来', kind: 'correct', note: '正确。否太狠会切掉有效流量，复查是必须的收尾动作。' },
        { id: 'd', text: '只要 0 单就否，不必等数据量', kind: 'wrong', note: '错误。2 次点击 0 单是统计噪音，否掉可能杀掉一个未来的好词。前提是「有相关性、只是数据不足」。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '否词的四条纪律：双门槛、活动层级、3 天复查、销量掉就拉回。加上一条例外：语义完全不相关的词可以不看数据直接否。'
    },
    {
      id: 'Q95', dim: 'ads', layer: 'base', type: 'multi',
      stem: 'SP 广告七步闭环包含以下哪些环节？（多选）',
      options: [
        { id: 'a', text: '选词与埋词（标题/五点/ST）', kind: 'correct', note: '正确。这是闭环的第 1、2 步，没有词就没有广告。' },
        { id: 'b', text: '开自动广告跑 7 天，再拉搜索词报告', kind: 'correct', note: '正确。第 3、4 步：自动广告是探针，7 天报告是结果。' },
        { id: 'c', text: '分词四象限后做手动分层（精准/广泛）', kind: 'correct', note: '正确。第 5、6 步：把词按类型分到不同结构里。' },
        { id: 'd', text: '每周开一个新活动扩大覆盖面', kind: 'wrong', note: '错误。七步闭环的最后一步是「周报复盘」，不是无脑开新活动。活动数量增长应该由数据驱动，不是按周递增。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '七步：选词 → 埋词 → 自动广告 → 7 天搜索词报告 → 分词四象限 → 手动分层 → 周报复盘。这条链是面试必问，要能一口气讲完并说出每步的产出物。'
    },
    {
      id: 'Q96', dim: 'ads', layer: 'base', type: 'multi',
      stem: '某词 CTR 只有 0.18%（曝光充足），CVR 正常。以下哪些是该查的方向？（多选）',
      options: [
        { id: 'a', text: '这个词本身是否精准（搜它的人想买的是不是这个东西）', kind: 'correct', note: '正确。CTR 低的第一嫌疑是词不准——流量进来了但不相关，看到就不点。' },
        { id: 'b', text: '主图在搜索结果页的吸引力（对比同屏竞品）', kind: 'correct', note: '正确。CTR 是「同一屏里点哪个」的竞争结果，主图是第一决定因素。' },
        { id: 'c', text: '价格与促销标识（Coupon/折扣标）在搜索结果页的展示', kind: 'correct', note: '正确。促销标识直接影响点击决策，属于点击端因素。' },
        { id: 'd', text: '详情页五点的说服力', kind: 'wrong', note: '错误。五点在点进来之后才看得到，它影响 CVR 不影响 CTR。这是最典型的通道串线。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: 'CTR 的三个杠杆：词的精准度、主图、价格与促销标识。详情页与五点属于 CVR 的杠杆，两边不能混。'
    },
    {
      id: 'Q97', dim: 'ads', layer: 'base', type: 'multi',
      stem: '某词 CVR 从 7% 掉到 3.8%，CTR 与曝光都正常。以下哪些是该查的方向？（多选）',
      options: [
        { id: 'a', text: '近期差评与 QA 是否出现集中的负面主题', kind: 'correct', note: '正确。「点进来了不买」最常见的原因就是评论里出现了劝退信息。' },
        { id: 'b', text: '价格带是否被竞品拉开（同屏对比是否有明显价差）', kind: 'correct', note: '正确。CVR 对价格高度敏感，尤其是标品。' },
        { id: 'c', text: '库存与配送时效是否出现变化（缺货/长配送会直接劝退）', kind: 'correct', note: '正确。配送时间变长会显著压低转化，这是很多人忽略的一项。' },
        { id: 'd', text: '提高该词的 bid 抢更好的位置', kind: 'wrong', note: '错误。CVR 掉的时候提 bid 只会让更多人以同样的低转化率进来，成本上升而转化不改善。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: 'CVR 的检查清单：差评与 QA、价格竞争力、库存与配送、A+/五点/主图第 2–3 张、以及「流量是否变了」（同词不同期，流量结构可能已经变了）。'
    },
    {
      id: 'Q98', dim: 'ads', layer: 'ops', type: 'multi',
      stem: 'ACOS 高于毛利率，可能是以下哪些情况？（多选）',
      options: [
        { id: 'a', text: '在买排名：TACOS 在降、自然单占比在涨，属于有期限的投资', kind: 'correct', note: '正确。冷启动期的正常曲线，判断标准是趋势而不是单周 ACOS。' },
        { id: 'b', text: '在失控：TACOS 也在涨、自然单不涨，纯粹的效率恶化', kind: 'correct', note: '正确。这是要立刻收紧的信号。' },
        { id: 'c', text: '在清货：目标从利润变成周转，可容忍 ACOS 上探到「仓储费 + 资金成本」为限', kind: 'correct', note: '正确。清货期看库龄与周转天数，不看毛利率。' },
        { id: 'd', text: '只要 ACOS 高于毛利率，就一定是亏损，没有例外', kind: 'wrong', note: '错误。这句话把「账面负毛利」直接等同于「决策错误」，忽略了阶段目标。面试时说这句会被追问到答不上来。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '同一个数字三种含义，取决于阶段与趋势。能把「买排名 / 失控 / 清货」这三种情况讲清楚，是运营岗与助理岗最明显的分水岭。'
    },
    {
      id: 'Q99', dim: 'ads', layer: 'base', type: 'multi',
      stem: '关于动态竞价的三种模式，以下理解正确的是？（多选）',
      options: [
        { id: 'a', text: '「只降低」：出价上限不变，在低概率位置往下打折，是省钱工具', kind: 'correct', note: '正确。它不会让你的出价超过设定值，只会少花。' },
        { id: 'b', text: '「提高和降低」：在高概率位置可能出价高于基础 bid，冲位置能力强但成本不可控', kind: 'correct', note: '正确。适合数据成熟、明确要抢位置的时候。' },
        { id: 'c', text: '「固定竞价」：所有位置都按设定出价竞争，可控性最强但放弃了分层优化', kind: 'correct', note: '正确。它是最「笨」但也最可预测的模式。' },
        { id: 'd', text: '「只降低」会让出价高于基础 bid，所以新品期不能用', kind: 'wrong', note: '错误。方向完全反了——「只降低」永远不会高于基础 bid，正因为如此它才适合新品期。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '三种模式的本质区别是「出价能否超过设定值」：只降低（不能）、提高和降低（能）、固定（不调）。新品期选只降低，是控制不确定性的标准做法。'
    },
    {
      id: 'Q100', dim: 'ads', layer: 'ops', type: 'multi',
      stem: '新品冷启动第 1–2 周，以下哪些广告动作是合适的？（多选）',
      options: [
        { id: 'a', text: '开一个自动广告，用「只降低」策略，预算控制在能买够 20 次点击/天的水平', kind: 'correct', note: '正确。自动广告的作用是探词，预算要够买样本。' },
        { id: 'b', text: '给 5–10 个核心精准词建手动活动，小预算跑着，积累转化数据', kind: 'correct', note: '正确。核心词必须从一开始就有独立的数据通道。' },
        { id: 'c', text: '容忍阶段性高 ACOS，盯的是 TACOS 与自然单占比的趋势', kind: 'correct', note: '正确。冷启动的目标是买数据、买排名，不是买利润。' },
        { id: 'd', text: '立即上 SB 和 SD，做全漏斗覆盖', kind: 'wrong', note: '错误。SB/SD 需要品牌备案（前提），且冷启动阶段转化模型还没建立，铺全漏斗是浪费预算。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '冷启动的三件事：探词（自动）、打点（核心词手动）、看趋势（TACOS/自然单占比）。前提条件不满足的广告类型（SB/SD/DSP）一律不碰。'
    },
    {
      id: 'Q101', dim: 'ads', layer: 'base', type: 'multi',
      stem: '拉搜索词报告时，以下哪些字段/维度是判断时必看的？（多选）',
      options: [
        { id: 'a', text: '每个词的花费与订单（算 CVR 与 ACOS）', kind: 'correct', note: '正确。没有这两个字段就无法判断效率。' },
        { id: 'b', text: '每个词的点击量（判断数据量够不够下结论）', kind: 'correct', note: '正确。点击量决定「这个结论是数据还是噪音」。' },
        { id: 'c', text: '词与产品的相关性（材质/用途/人群是否匹配）', kind: 'correct', note: '正确。先验不相关的词不必等数据量，可以立即否。' },
        { id: 'd', text: '每个词的展示位置（顶部/商品页/其余）', kind: 'wrong', note: '错误。位置数据在「按广告位」的报告里，不在搜索词报告里。搜索词报告看的是「哪个词」，不是「哪个位置」。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '搜索词报告的读法：先看相关性（能否直接否），再看数据量（够不够判断），最后看效率（花费/订单）。三步顺序不能颠倒。'
    },
    {
      id: 'Q102', dim: 'ads', layer: 'ops', type: 'multi',
      stem: '广告预算被砍一半，但要求保住排名。以下哪些动作是对的？（多选）',
      options: [
        { id: 'a', text: '砍掉拓词与低效长尾的预算，把它集中到已验证的核心精准词', kind: 'correct', note: '正确。排名由核心词的表现决定，钱要花在决定排名的地方。' },
        { id: 'b', text: '用位置溢价保住核心词的首页顶部，而不是全面提 bid', kind: 'correct', note: '正确。溢价只对特定位置生效，比全面提价精准得多。' },
        { id: 'c', text: '接受单量下降，把「排名不掉」作为唯一硬指标', kind: 'correct', note: '正确。预算减半必然牺牲单量，明确取舍比什么都想要更专业。' },
        { id: 'd', text: '所有活动等比例降 50%', kind: 'wrong', note: '错误。等比例收缩会让核心词的曝光也砍半，排名直接掉。砍预算必须砍结构。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '预算减半的正确姿势是「结构性收缩」：保核心、砍探索、用溢价代替广撒网。等比例削减是最省事也最失败的做法。'
    },
    {
      id: 'Q103', dim: 'ads', layer: 'base', type: 'multi',
      stem: '关于关键词匹配方式的选择，以下判断正确的是？（多选）',
      options: [
        { id: 'a', text: '已验证的高转化词用精准匹配，单独控价', kind: 'correct', note: '正确。已知的好词要「稳定拿到」，精准最可控。' },
        { id: 'b', text: '需要拓词、找新流量时用广泛匹配，但要配合否词', kind: 'correct', note: '正确。广泛的价值是探索，代价是噪音，所以必须配否词。' },
        { id: 'c', text: '词组匹配适合「核心词 + 限定修饰」的场景，比广泛可控', kind: 'correct', note: '正确。词组要求包含完整词序，是精准与广泛之间的折中。' },
        { id: 'd', text: '广泛匹配的 CPC 更低，所以一定比精准更划算', kind: 'wrong', note: '错误。CPC 低不代表划算——广泛匹配的 CVR 也低，ACOS 往往更高。必须算到 ACOS 才能比较。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '匹配方式是任务分配工具：精准保效率、词组保结构、广泛找增量。判断哪个划算，唯一标准是 ACOS，不是 CPC。'
    },
    {
      id: 'Q104', dim: 'ads', layer: 'ops', type: 'multi',
      stem: '预算 $600/月时，广告活动结构应该怎么设计？（多选）',
      options: [
        { id: 'a', text: '按任务分组：核心精准一个活动、拓词一个活动、防御一个活动', kind: 'correct', note: '正确。任务分组才能按任务分配预算、按任务看表现。' },
        { id: 'b', text: '每个活动都要有足够预算（至少每天能买到 20 次点击），否则数据是噪音', kind: 'correct', note: '正确。这是判断结构是否过细的硬标准。' },
        { id: 'c', text: '同一批词不要重复投放在多个活动里，避免自我抬价', kind: 'correct', note: '正确。同词双投会让整体 CPC 上升，还会让归因变乱。' },
        { id: 'd', text: '一个词一个活动，控制粒度最细', kind: 'wrong', note: '错误。$600 分给 30 个词就是每词每天不到 1 美元，谁也跑不出数据。粒度越细，每个活动越没有意义。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '活动结构的两条硬约束：按任务分组、每个活动预算够买到样本。违反第二条，结构再漂亮也只是空架子。'
    },
    {
      id: 'Q105', dim: 'ads', layer: 'ops', type: 'multi',
      stem: 'TACOS 与 ACOS 出现背离，可能的原因有哪些？（多选）',
      options: [
        { id: 'a', text: '自然流量转化增多，总销售额变大，TACOS 被摊薄（好事）', kind: 'correct', note: '正确。这是广告买排名生效后的正常现象。' },
        { id: 'b', text: '自然单在减少，总销售额缩水，TACOS 被动抬高（坏事）', kind: 'correct', note: '正确。ACOS 不变而 TACOS 涨，通常就是分母缩水。' },
        { id: 'c', text: '广告点击大量来自非购买意图流量，广告效率变差但总盘还在', kind: 'correct', note: '正确。这类情况 ACOS 会先恶化，TACOS 随后跟上。' },
        { id: 'd', text: '两个指标背离一定是好消息，说明自然流量起来了', kind: 'wrong', note: '错误。背离只是「两个分母变化不同步」的信号，方向要结合自然单占比判断。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '背离本身不是结论，只是提示「分母在变」。看到背离要立刻拆：总销售额变了多少、广告销售额变了多少、自然单占比往哪走。'
    },
    {
      id: 'Q106', dim: 'ads', layer: 'base', type: 'multi',
      stem: '以下哪些情况应该暂停或关停广告？（多选）',
      options: [
        { id: 'a', text: '产品断货或即将断货（点击进来买不到，转化权重会被拉低）', kind: 'correct', note: '正确。断货期跑广告是纯烧钱，还会拉低 listing 的转化权重。' },
        { id: 'b', text: 'Listing 出现严重问题（被下架、主图违规、评分骤降）', kind: 'correct', note: '正确。广告把人引向一个不能买或不值得买的页面，是加速恶化。' },
        { id: 'c', text: 'ACOS 连续多周远超盈亏线，且 TACOS 也在涨、自然单不涨', kind: 'correct', note: '正确。这是「失控」的典型组合，需要收缩而不是硬撑。' },
        { id: 'd', text: '某个词这周 ACOS 到 55%，高于毛利率', kind: 'wrong', note: '错误。单词单周的 ACOS 波动很大，处理方式是降 bid 或否词，不是关停整个广告。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '关停是「最后手段」，触发条件只有三个：买不到（断货）、不能买（Listing 问题）、持续亏（多周失控）。单词短期高 ACOS 不在其中。'
    },
    {
      id: 'Q107', dim: 'ads', layer: 'base', type: 'multi',
      stem: '关于广告数据的观察周期与样本门槛，以下说法正确的是？（多选）',
      options: [
        { id: 'a', text: '判断一个词的好坏，至少要 20 次点击（本系统否词门槛）', kind: 'correct', note: '正确。低于这个量，CVR 的波动完全在噪音范围内。' },
        { id: 'b', text: '判断 CVR 是否显著偏离均值，通常需要 50–100 次点击', kind: 'correct', note: '正确。样本越小，越容易把随机波动当成趋势。' },
        { id: 'c', text: '自动广告至少跑满 7 天才拉搜索词报告（SP 七步闭环的要求）', kind: 'correct', note: '正确。7 天是为了跨过工作日与周末的周期差异。' },
        { id: 'd', text: '当天调整、当天看效果，反应越快越好', kind: 'wrong', note: '错误。调整后需要 3 天观察期，当天就看效果只会看到噪音，导致反复调价、越调越乱。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '广告优化最反直觉的一点：手快不是优点。改完要看 3 天，跑词要满 7 天，判断词要 20 次点击——节奏对了，结论才有意义。'
    }
  );

  /* ============================================================
     简答 5 题（S12–S16）
     ============================================================ */
  DATA.SHORT.push(
    {
      id: 'S12', dim: 'ads', layer: 'base', title: '把 SP 七步闭环讲一遍',
      prompt: '面试官说：「别背概念，你就讲一遍，一个新链接从 0 到有稳定广告结构，你每一步做什么、产出什么。」请用 6–8 句话讲完整个闭环。',
      checklist: [
        '第 1–2 步：选词与埋词（关键词库分级后埋进标题/五点/ST）',
        '第 3–4 步：开自动广告跑 7 天，再拉搜索词报告',
        '第 5 步：分词四象限（高转化提手动 / 高花费0单否定 / 低曝光提 bid / 中间观察）',
        '第 6 步：手动分层（精准控核心词、广泛或词组拓增量），并在自动里否定已搬走的词',
        '第 7 步：周报复盘（看 ACOS/TACOS/自然单占比/曝光份额）并制定下周动作'
      ],
      reference: '第一步选词：用工具反查竞品加词根统计，先做减法剔掉不相关，再按流量占比或搜索排名分级，选出一级词 3–5 个。第二步埋词：按标题 > 五点 > 详情 > ST 的权重分配，一级词进标题前段和手动精准，长尾只放 ST。第三步开自动广告：用「只降低」策略、小预算，目的是探词而不是出单。第四步跑满 7 天拉搜索词报告——这一步不能省，3 天的数据全是噪音。第五步分词四象限：有单且转化高的提为手动精准，高花费 0 转化的在活动层级否定，低曝光的提 bid，中间地带留着继续观察。第六步手动分层：核心词单独建精准活动控价，拓量的词放广泛，同时一定要在自动活动里把已经搬走的词否定掉，否则两个活动抢同一批流量。第七步每周复盘：看 ACOS 和 TACOS 的趋势、自然单占比有没有涨、曝光份额有没有掉，然后定下周唯一的最高优先级动作。这七步不是一次做完就结束，是每周循环一次。',
      pitfalls: '最常见的答法是只讲「开广告 → 看数据 → 优化」三步，中间的分词和分层全跳过。主管一听就知道你没真正跑过完整流程——因为分词四象限才是这个闭环里唯一需要判断力的地方。'
    },
    {
      id: 'S13', dim: 'ads', layer: 'ops', title: 'ACOS 高于毛利率，为什么还敢继续投',
      prompt: '面试官追问：「你说 ACOS 20% 是盈利的，如果我们退货率 15%，你还敢这么说吗？」请说明你会怎么重算这条线，以及在什么条件下仍然可以继续投。',
      checklist: [
        '承认退货率会重算盈亏线：退货损失要从毛利里扣，盈亏平衡 ACOS 会明显下移',
        '给出重算逻辑：广告前毛利 − 退货损耗（退货率 × 单件损失）→ 新的可接受 ACOS',
        '说明「继续投」的条件：TACOS 在降、自然单占比在涨、有明确时间窗与退出线',
        '给出止损动作：否词、控预算上限、降 bid，证明不是放任烧钱',
        '区分「退货由产品问题导致」与「退货由尺码/预期不符导致」，前者要先修产品'
      ],
      reference: '会，但我要先把这条线重算一遍。ACOS 20% 对应的是「毛利率大于 20%」，如果退货率 15%，每单要摊的退货损失包括来回运费、无法二次销售的损耗、以及 FBA 退货处理费，保守估计会吃掉 8–12 个点的毛利，那盈亏平衡线就从 30% 掉到 18–22%——也就是说 20% 的 ACOS 已经贴线，不能再往下走。所以我会先做两件事：一是把退货原因拆开看，如果是尺码或预期不符，那是 Listing 描述问题，改图片和五点就能压下来；如果是产品本身质量，那要停投先修产品，因为退货率不解决，投得越多亏得越多。二是在退货率改善之前，把可接受 ACOS 目标下调到 15%，用否词和降 bid 控住成本。至于还要不要继续投，我的判断不是看 ACOS，是看 TACOS 和自然单占比：如果这两个在改善，说明广告在买排名，可以再给一个 4 周窗口；如果没改善，我主动砍。',
      pitfalls: '踩坑答法是硬撑：「退货是行业普遍现象，不影响结论」。面试官问这个问题就是在测你会不会被自己的数字打脸——正确姿势是当场把线重算，并给出重算后的结论。'
    },
    {
      id: 'S14', dim: 'ads', layer: 'base', title: '给你一份搜索词报告，你怎么用',
      prompt: '面试官把一份假想的搜索词报告推到你面前：「假设这里面有 40 个词，你今天只有一小时，你按什么顺序过、最后交出什么东西？」请说清你的操作顺序和产出物。',
      checklist: [
        '先按花费排序，把预算占用最大的前 10 个词拎出来（二八原则）',
        '先筛相关性：材质/用途/人群完全不符的直接标否，不看数据量',
        '再按数据量筛：点击 ≥20 且 0 单、或花费 ≥$15 且 0 单的标否',
        '有单且 CVR 明显高于均值的标「提手动」，并说明要在自动里同步否定',
        '产出物：一份「否词清单 + 提词清单 + 提价清单」三列的动作表，每条带数据依据'
      ],
      reference: '一小时我会按「花费 → 相关性 → 数据量 → 效率」四道筛子过。第一道按花费降序，把占预算最多的 10 个词拎出来，因为 40 个词里通常这 10 个占了七八成的钱。第二道看相关性：材质不符（我是不锈钢杯，出现 plastic、glass）、用途不符（bottle brush）、人群不符（kids/baby）的，直接标否，这类不用看数据量，它永远不可能成交。第三道看数据量：剩下的词里，点击 ≥20 且 0 单、或者花费 ≥$15 且 0 单的，标否。第四道看效率：有单且 CVR 明显高于类目均值的，标「提手动精准」，同时记一笔「要在自动活动里同步否定这个词」。最后交出来的是一张三条清单的动作表：否词清单（带点击/花费）、提词清单（带 CVR）、提价清单（曝光不足的词），每一条后面都跟着数据依据，这样我下周复盘时能回溯每一个动作的理由。',
      pitfalls: '很多人会说「看看哪些词表现好、哪些不好」——这不是动作。面试官要的是「动作清单 + 判断依据」，因为运营岗的产出形式就是决策，不是观察。'
    },
    {
      id: 'S15', dim: 'ads', layer: 'ops', title: '预算砍一半，排名不能掉',
      prompt: '主管当面说：「下个月广告预算砍一半，但核心词的排名不能掉，你自己想办法。」请现场给出你的排兵布阵和取舍。',
      checklist: [
        '先明确矛盾：预算减半必然牺牲单量，要确认「排名不掉」的判定标准（哪个词、第几位）',
        '结构性收缩：砍拓词/低效长尾/防御性投放，把钱集中到决定排名的核心精准词',
        '用位置溢价保核心词首页位，而不是全面提 bid',
        '同步做非广告动作：价格/Coupon/评论/A+ 提升自然转化，降低对付费流量的依赖',
        '给出可量化的承诺与风险提示（如单量预计降 X%，若排名仍掉则需恢复预算）'
      ],
      reference: '我先确认一件事：排名不掉的判定标准是哪个词、第几位、看广告位还是自然位——因为这三个不一样，保法也不同。假设是保核心词的自然排名，我的做法是结构性收缩，不是等比例砍。具体三步：第一，把拓词活动（自动和广泛）预算砍掉 60% 以上，这些是探索性投入，短期不影响核心词排名；低效长尾和竞品防御也压到最低。第二，把手动精准里那 3–5 个决定排名的核心词保住，不但不砍，还用位置溢价把首页顶部守住——溢价只对顶部生效，比全面提 bid 精准得多。第三，同步做不花钱的动作：把 Coupon 挂上、优化 A+ 第一屏、把差评集中的问题在五点里回应掉，用自然转化率补一部分付费流量的缺口。我会给主管一个明确的预期：这样调整后单量大概会降 15%–20%，但核心词排名能守住；如果四周后排名还是掉了，说明这个预算水平撑不住当前的位置，需要恢复预算或者接受排名下滑，这个判断我会提前说清楚，不会等到掉完了再报告。',
      pitfalls: '踩坑答法是「我会优化投放效率，用更少的钱做更多的事」——这是空话。主管要听的是「砍哪一块、保哪一块、预期代价是多少」，含糊其辞会被认为没有真正的取舍能力。'
    },
    {
      id: 'S16', dim: 'ads', layer: 'base', title: '一周广告复盘怎么写',
      prompt: '面试官问：「你每周的广告复盘报告长什么样？如果只能放三行，你放什么？」请说明你的复盘结构和选择这三行的理由。',
      checklist: [
        '第一行：本周最关键的单一变化（某个指标从 X 到 Y），带归因',
        '第二行：本周做的一个动作及其结果（动作 → 数据反馈）',
        '第三行：下周唯一的最高优先级动作，可执行、可验证',
        '说明为什么只放三行：决策导向，不是数据罗列',
        '提到会附完整数据表作为支撑，但结论先行'
      ],
      reference: '我的复盘结构是「一个变化、一个动作、一个决定」，结论先行，数据表附在后面。第一行写本周最关键的变化：比如「ACOS 从 24% 涨到 34%，拆解后是 CPC 涨了 22%、CVR 持平，主因是竞价环境而不是我们的词或页面」。第二行写本周做了什么、结果如何：「周二否掉了 6 个高花费 0 转化的泛词，释放 $180 预算，精准词点击量增加 34%，ACOS 在周四回落到 29%」。第三行写下周唯一的最高优先级动作：「下周只做一件事——把首页顶部溢价从 0 加到 30%，验证顶部位置的 CVR 是否真的比其余位置高 3 倍」。只放三行的理由很简单：主管看报告是为了做决定，不是为了看你拉了多少数据。如果三行讲不清，说明我自己也没想清楚这周到底发生了什么。完整的数据表我会附在下面，但那是证据，不是结论。',
      pitfalls: '最差的复盘是流水账：曝光多少、点击多少、花费多少、ACOS 多少——全是在复述后台数字。复盘的价值在于「归因」和「下一步」，没有这两样，写多少行都没用。'
    }
  );

  console.log('[bank-ads] 已加载：填空 15 · 单选 30 · 多选 15 · 简答 5');
})();
