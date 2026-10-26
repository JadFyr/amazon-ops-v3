/* ============================================================
   题库 + 随机参数配置
   基础层（base）：来自《Day2 广告指标公式手卡》《Day4 SP 广告全流程文档》
   运营层（ops） ：全生命周期 / 全漏斗 / 库存资金 / 利润定价 / 选品 / 合规
   说明：所有 build() 返回纯数据对象，可 JSON 序列化后存入 state
   ============================================================ */
(function () {
  const R = window.R, F = window.F;

  const DIMS = [
    { id: 'metrics',    name: '指标口径',   layer: 'base' },
    { id: 'ads',        name: '广告诊断',   layer: 'base' },
    { id: 'funnel',     name: '全漏斗组合', layer: 'ops'  },
    { id: 'lifecycle',  name: '生命周期',   layer: 'ops'  },
    { id: 'inventory',  name: '库存与资金', layer: 'ops'  },
    { id: 'profit',     name: '利润与定价', layer: 'ops'  },
    { id: 'sourcing',   name: '选品判断',   layer: 'ops'  },
    { id: 'compliance', name: '账号合规',   layer: 'ops'  }
  ];

  const PRICES = [24.99, 26.99, 29.99, 32.99, 34.99, 39.99, 44.99];

  /* ============================================================
     题型 1 · 填空（公式与核心口径）
     每题 2–3 空，判分后给：正确答案 + 代入过程 + 决策用途
     ============================================================ */
  const FILL = [
    {
      id: 'F1', dim: 'metrics', layer: 'base', title: '五核心指标拆解',
      build: function () {
        const impr = R.int(36, 86) * 1000;
        const clicks = Math.round(impr * R.range(0.0030, 0.0048));
        const orders = Math.max(3, Math.round(clicks * R.range(0.045, 0.095)));
        const cpc = R.range(0.45, 1.35, 2);
        const spend = Number((clicks * cpc).toFixed(2));
        const price = R.pick(PRICES);
        const adSales = Number((orders * price).toFixed(2));
        const total = Number((adSales / (1 - R.range(0.25, 0.45))).toFixed(2));
        const CTR = clicks / impr * 100, CVR = orders / clicks * 100, ACOS = spend / adSales * 100;
        return {
          title: '五核心指标拆解', dim: 'metrics', layer: 'base',
          scene: '某 SP 活动上周数据如下（模拟数据）。请算出三个最常被追问的比率指标，保留 2 位小数。',
          kv: [['曝光', F.comma(impr)], ['点击', F.comma(clicks)], ['订单', orders + ' 单'],
               ['广告花费', F.money(spend)], ['客单价', F.money(price)], ['广告销售额', F.money(adSales)],
               ['店铺总销售额', F.money(total)]],
          blanks: [
            { key: 'ctr', label: 'CTR 点击率', hint: '点击 ÷ 曝光', unit: '%', value: CTR },
            { key: 'cvr', label: 'CVR 转化率', hint: '订单 ÷ 点击', unit: '%', value: CVR },
            { key: 'acos', label: 'ACOS', hint: '广告花费 ÷ 广告销售额', unit: '%', value: ACOS }
          ],
          steps: [
            'CTR = ' + F.comma(clicks) + ' ÷ ' + F.comma(impr) + ' × 100% = ' + F.pct(CTR),
            'CVR = ' + orders + ' ÷ ' + F.comma(clicks) + ' × 100% = ' + F.pct(CVR),
            'ACOS = ' + F.money(spend) + ' ÷ ' + F.money(adSales) + ' × 100% = ' + F.pct(ACOS),
            '（对照）TACOS = ' + F.money(spend) + ' ÷ ' + F.money(total) + ' = ' + F.pct(spend / total * 100)
          ],
          usage: 'CTR 判断“流量质量（词准不准 + 主图吸不吸引）”，CVR 判断“详情页能不能接住人”，ACOS 判断“这门广告生意本身赚不赚”。三者必须分开看，串线就会开错药。',
          caveat: 'CTR 健康区间按 3C/杯壶口径为 0.3%–0.5%，家居、服饰等类目差异较大，面试时说“本品类参考值”更稳。'
        };
      }
    },
    {
      id: 'F2', dim: 'ads', layer: 'base', title: 'CPC 划算线与出价空间',
      build: function () {
        const price = R.pick(PRICES);
        const cvr = R.range(0.05, 0.11, 3);
        const margin = R.range(0.22, 0.42, 2);
        const beCPC = price * cvr * margin;
        const actual = Number((beCPC * R.range(0.7, 1.75)).toFixed(2));
        const gap = Number((actual - beCPC).toFixed(2));
        return {
          title: 'CPC 划算线与出价空间', dim: 'ads', layer: 'base',
          scene: '运营在调出价前先算“这笔点击最多能花多少钱”。已知客单价、CVR、毛利率，求盈亏平衡 CPC，并算出当前实际 CPC 与之的差额（正数=已超标，负数=还有空间）。',
          kv: [['客单价', F.money(price)], ['CVR', F.pct(cvr * 100)], ['毛利率', F.pct(margin * 100)],
               ['实际 CPC', F.money(actual)]],
          blanks: [
            { key: 'be', label: '盈亏平衡 CPC', hint: '客单价 × CVR × 毛利率', unit: '$', value: beCPC },
            { key: 'gap', label: '实际 CPC − 划算线', hint: '正数代表每单已经亏广告费', unit: '$', value: gap }
          ],
          steps: [
            '盈亏平衡 CPC = ' + F.money(price) + ' × ' + F.pct(cvr * 100) + ' × ' + F.pct(margin * 100) + ' = ' + F.money(beCPC),
            '实际 CPC − 划算线 = ' + F.money(actual) + ' − ' + F.money(beCPC) + ' = ' + F.money(gap),
            gap > 0 ? '→ 每次点击的广告成本已超过它能带来的毛利，属于“越点越亏”，优先降 bid 或提 CVR。'
                    : '→ 出价仍在毛利覆盖范围内，可以小幅提 bid 抢更靠前的位置。'
          ],
          usage: '这是“出价能不能提”的唯一硬标准。助理看建议出价，运营看这个公式——因为在 CVR 不变的前提下，CPC 每涨 $0.1，ACOS 就按比例上涨。',
          caveat: '该式假设广告单毛利 = 客单价 × 毛利率。若你的毛利率已扣广告费，需换成“广告前毛利率”。'
        };
      }
    },
    {
      id: 'F3', dim: 'inventory', layer: 'ops', title: '补货量测算（双计口径）',
      build: function () {
        const d7 = R.int(14, 58);
        const d30 = Math.round(d7 * R.range(0.86, 1.14, 2));
        const daily = 0.7 * d7 + 0.3 * d30;
        const lead = R.int(25, 45), ship = R.int(24, 40), buf = R.int(7, 14);
        const k = 1.2, cycle = lead + ship + buf;
        const fba = R.int(200, 900), transit = R.int(300, 1500), local = R.int(0, 600);
        const stock = fba + transit + local;
        const safety = daily * cycle * k;
        const need = daily * cycle + safety - stock;
        return {
          title: '补货量测算', dim: 'inventory', layer: 'ops',
          scene: '一个稳定出单的 SKU 准备下补货单。请按公式算出预期日均销量、安全库存和建议补货量（取整）。',
          kv: [['近 7 天日均', d7 + ' 单'], ['近 30 天日均', d30 + ' 单'],
               ['采购周期', lead + ' 天'], ['头程时效', ship + ' 天'], ['入仓安全缓冲', buf + ' 天'],
               ['安全系数', k], ['FBA 可售', fba + ' 件'], ['在途', transit + ' 件'], ['本地仓', local + ' 件']],
          blanks: [
            { key: 'daily', label: '预期日均销量', hint: '近7天×70% + 近30天×30%', unit: '单/天', value: daily },
            { key: 'safety', label: '安全库存', hint: '日均 ×（采购+头程+缓冲）× 安全系数', unit: '件', value: safety },
            { key: 'need', label: '建议补货量', hint: '日均×周期 + 安全库存 − 当前总库存', unit: '件', value: need }
          ],
          steps: [
            '预期日均 = ' + d7 + '×70% + ' + d30 + '×30% = ' + F.num(daily, 1) + ' 单/天',
            '安全库存 = ' + F.num(daily, 1) + ' × (' + lead + '+' + ship + '+' + buf + ') × ' + k + ' = ' + F.comma(Math.round(safety)) + ' 件',
            '补货量 = ' + F.num(daily, 1) + '×' + cycle + ' + ' + F.comma(Math.round(safety)) + ' − ' + F.comma(stock) + ' = ' + F.comma(Math.round(need)) + ' 件'
          ],
          usage: '补货量决定“资金占用 + 断货风险”这条跷跷板。算多了压现金、涨仓储费，算少了断货掉排名——补货是运营岗少数几个“算错就要用钱补”的动作。',
          caveat: '本系统按你提供的口径做“周期需求 + 安全库存”双计；若公司用 k 系数单一口径（只算一次周期再乘系数），结果会低约 20%。面试时说明你用的口径即可，不必争论对错。'
        };
      }
    },
    {
      id: 'F4', dim: 'profit', layer: 'ops', title: '单件毛利与净利拆解',
      build: function () {
        const price = R.pick(PRICES);
        const cost = Number((price * R.range(0.22, 0.34)).toFixed(2));
        const freight = R.range(1.8, 4.6, 2);
        const fbaFee = R.range(3.6, 7.4, 2);
        const comm = Number((price * 0.15).toFixed(2));
        const storage = R.range(0.18, 0.62, 2);
        const retLoss = Number((price * R.range(0.02, 0.06, 3)).toFixed(2));
        const adPer = Number((price * R.range(0.09, 0.17)).toFixed(2));
        const opsFee = R.range(0.5, 1.5, 2);
        const gross = price - cost - freight - fbaFee - comm - storage - retLoss;
        const net = gross - adPer - opsFee;
        const netRate = net / price * 100;
        return {
          title: '单件毛利与净利拆解', dim: 'profit', layer: 'ops',
          scene: '新品定价评审，财务口径要求“扣完所有成本后”的数字。请算出单件毛利、单件净利与净利率（金额保留 2 位小数，净利率保留 2 位）。',
          kv: [['售价', F.money(price)], ['出厂成本', F.money(cost)], ['头程', F.money(freight)],
               ['FBA 配送费', F.money(fbaFee)], ['佣金 15%', F.money(comm)], ['月均仓储分摊', F.money(storage)],
               ['退货损耗', F.money(retLoss)], ['单件广告费', F.money(adPer)], ['运营服务费/提成', F.money(opsFee)]],
          blanks: [
            { key: 'gross', label: '单件毛利', hint: '售价 − 产品 − 头程 − FBA − 佣金 − 仓储 − 退货', unit: '$', value: gross },
            { key: 'net', label: '单件净利润', hint: '毛利 − 广告费 − 运营服务费', unit: '$', value: net },
            { key: 'rate', label: '净利率', hint: '净利 ÷ 售价', unit: '%', value: netRate }
          ],
          steps: [
            '毛利 = ' + F.money(price) + ' − ' + F.money(cost) + ' − ' + F.money(freight) + ' − ' + F.money(fbaFee) + ' − ' + F.money(comm) + ' − ' + F.money(storage) + ' − ' + F.money(retLoss) + ' = ' + F.money(gross),
            '净利 = ' + F.money(gross) + ' − ' + F.money(adPer) + ' − ' + F.money(opsFee) + ' = ' + F.money(net),
            '净利率 = ' + F.money(net) + ' ÷ ' + F.money(price) + ' = ' + F.pct(netRate),
            netRate >= 15 ? '→ 达到精品/工贸口径 15% 的投产底线。' : '→ 低于 15% 的投产底线，需要提价、降成本或换包装规格，而不是“先卖起来再说”。'
          ],
          usage: '这张表是定价的地基。面试被问“这个品能不能做”，能现场把这七项拆开算，比说“毛利大概 30%”高一个层级。',
          caveat: '退货损耗按售价比例粗算；严格口径应按“退货率 ×（来回运费 + 不可售报废）”。'
        };
      }
    },
    {
      id: 'F5', dim: 'profit', layer: 'ops', title: '盈亏平衡 ACOS 与单件广告盈亏',
      build: function () {
        const price = R.pick([27.99, 29.99, 34.99, 39.99]);
        const cost = Number((price * R.range(0.24, 0.36)).toFixed(2));
        const freight = R.range(2.0, 4.4, 2);
        const fbaFee = R.range(3.8, 7.0, 2);
        const comm = Number((price * 0.15).toFixed(2));
        const storage = R.range(0.2, 0.6, 2);
        const retLoss = Number((price * R.range(0.02, 0.05, 3)).toFixed(2));
        const nonAd = cost + freight + fbaFee + comm + storage + retLoss;
        const gp = price - nonAd;
        const marginRate = gp / price * 100;
        const actual = R.range(0.30, 0.56, 2);
        const perUnit = Number((price * (marginRate / 100 - actual)).toFixed(2));
        return {
          title: '盈亏平衡 ACOS', dim: 'profit', layer: 'ops',
          scene: '主管问：“这个链接 ACOS 打到多少就不该再投了？”请先算广告前毛利率，再换算成盈亏平衡 ACOS，并算出按当前 ACOS 投放时每单的广告盈亏。',
          kv: [['售价', F.money(price)], ['出厂成本', F.money(cost)], ['头程', F.money(freight)],
               ['FBA 配送费', F.money(fbaFee)], ['佣金', F.money(comm)], ['仓储分摊', F.money(storage)],
               ['退货损耗', F.money(retLoss)], ['当前 ACOS', F.pct(actual * 100)]],
          blanks: [
            { key: 'rate', label: '广告前毛利率', hint: '（售价 − 非广告成本）÷ 售价', unit: '%', value: marginRate },
            { key: 'be', label: '盈亏平衡 ACOS', hint: '广告前毛利率 = 盈亏线', unit: '%', value: marginRate },
            { key: 'per', label: '每单广告盈亏', hint: '售价 ×（毛利率 − 当前ACOS），负数=亏', unit: '$', value: perUnit }
          ],
          steps: [
            '非广告成本合计 = ' + F.money(cost) + ' + ' + F.money(freight) + ' + ' + F.money(fbaFee) + ' + ' + F.money(comm) + ' + ' + F.money(storage) + ' + ' + F.money(retLoss) + ' = ' + F.money(nonAd),
            '广告前毛利率 = (' + F.money(price) + ' − ' + F.money(nonAd) + ') ÷ ' + F.money(price) + ' = ' + F.pct(marginRate),
            '盈亏平衡 ACOS = 广告前毛利率 = ' + F.pct(marginRate) + '（ACOS 低于它，广告自身盈利）',
            '每单广告盈亏 = ' + F.money(price) + ' × (' + F.pct(marginRate) + ' − ' + F.pct(actual * 100) + ') = ' + F.money(perUnit)
          ],
          usage: '这条线决定“要不要为排名亏钱”。ACOS 低于盈亏线是赚钱的广告；略高于它是买排名（有期限、有条件的亏损）；远超它就是在给别人交学费。',
          caveat: '盈亏平衡 ACOS ≈ 毛利率，前提是毛利率里没有摊销广告费。若公司给你的是“已扣广告的净利率”，这条线要重算。'
        };
      }
    },
    {
      id: 'F6', dim: 'inventory', layer: 'ops', title: '库存周转天数',
      build: function () {
        const begin = R.int(1200, 3600), end = R.int(900, 3000), units = R.int(700, 2400);
        const avg = (begin + end) / 2;
        const daily = units / 30;
        const days = avg / daily;
        return {
          title: '库存周转天数', dim: 'inventory', layer: 'ops',
          scene: '月会上要汇报“这个 SKU 的库存转得快不快”。请算平均库存、日均销量与库存周转天数（天数取整）。',
          kv: [['期初库存', F.comma(begin) + ' 件'], ['期末库存', F.comma(end) + ' 件'], ['本月销量', F.comma(units) + ' 件']],
          blanks: [
            { key: 'avg', label: '平均库存', hint: '(期初 + 期末) ÷ 2', unit: '件', value: avg },
            { key: 'daily', label: '日均销量', hint: '月销量 ÷ 30', unit: '单/天', value: daily },
            { key: 'days', label: '库存周转天数', hint: '平均库存 ÷ 日均销量', unit: '天', value: days }
          ],
          steps: [
            '平均库存 = (' + F.comma(begin) + ' + ' + F.comma(end) + ') ÷ 2 = ' + F.comma(Math.round(avg)) + ' 件',
            '日均销量 = ' + F.comma(units) + ' ÷ 30 = ' + F.num(daily, 1) + ' 单/天',
            '周转天数 = ' + F.comma(Math.round(avg)) + ' ÷ ' + F.num(daily, 1) + ' = ' + F.num(days, 0) + ' 天',
            days > 60 ? '→ 超过 60 天健康上限，资金被压在货上，清货优先级应高于“再多卖几个”。' : '→ 落在 30–60 天的健康区间。'
          ],
          usage: '周转天数 = 资金效率。它和 IPI 限仓、超龄库存费直接挂钩；也是判断“该补货还是该清货”的第一道闸门。',
          caveat: '不同公司用“30 天/90 天”口径不同，汇报时说明周期长度，避免数字对不上。'
        };
      }
    },
    {
      id: 'F7', dim: 'metrics', layer: 'base', title: 'ACOS / TACOS / 自然单占比',
      build: function () {
        const spend = R.int(180, 900);
        const price = R.pick([24.99, 29.99, 34.99]);
        const adOrders = R.int(20, 90);
        const adSales = Number((adOrders * price).toFixed(2));
        const natShare = R.range(0.35, 0.70);
        const total = Number((adSales / (1 - natShare)).toFixed(2));
        const ACOS = spend / adSales * 100, TACOS = spend / total * 100;
        const natPct = (total - adSales) / total * 100;
        return {
          title: 'ACOS / TACOS / 自然单占比', dim: 'metrics', layer: 'base',
          scene: '这两个指标分母不同，是面试最容易翻车的地方。请分别算出 ACOS、TACOS 与自然单销售额占比。',
          kv: [['广告花费', F.money(spend)], ['广告销售额', F.money(adSales)], ['店铺总销售额', F.money(total)]],
          blanks: [
            { key: 'acos', label: 'ACOS', hint: '花费 ÷ 广告销售额', unit: '%', value: ACOS },
            { key: 'tacos', label: 'TACOS', hint: '花费 ÷ 总销售额', unit: '%', value: TACOS },
            { key: 'nat', label: '自然单销售额占比', hint: '(总销售额 − 广告销售额) ÷ 总销售额', unit: '%', value: natPct }
          ],
          steps: [
            'ACOS = ' + F.money(spend) + ' ÷ ' + F.money(adSales) + ' = ' + F.pct(ACOS),
            'TACOS = ' + F.money(spend) + ' ÷ ' + F.money(total) + ' = ' + F.pct(TACOS),
            '自然单占比 = (' + F.money(total) + ' − ' + F.money(adSales) + ') ÷ ' + F.money(total) + ' = ' + F.pct(natPct)
          ],
          usage: 'ACOS 衡量“广告自己赚不赚”，TACOS 衡量“广告对整盘生意贵不贵”。TACOS 下降 + 自然单占比上升 = 广告买来的排名正在变成免费流量，这才是新品期该盯的曲线。',
          caveat: 'TACOS 健康区间 10%–18%（成长期到成熟期）视类目与阶段浮动，趋势比绝对值更重要。'
        };
      }
    },
    {
      id: 'F8', dim: 'inventory', layer: 'ops', title: '安全库存与断货倒计时',
      build: function () {
        const daily = R.range(9, 42, 1);
        const lead = R.int(25, 45), ship = R.int(24, 38), buf = R.int(7, 14);
        const k = R.pick([1.2, 1.2, 1.1]);
        const safety = daily * (lead + ship + buf) * k;
        const fba = R.int(60, 520);
        const daysLeft = fba / daily;
        return {
          title: '安全库存与断货倒计时', dim: 'inventory', layer: 'ops',
          scene: 'FBA 可售库存已经不多了。请算安全库存，以及“什么都不做的话，几天后断货”。',
          kv: [['日均销量', F.num(daily, 1) + ' 单'], ['采购周期', lead + ' 天'], ['头程', ship + ' 天'],
               ['入仓缓冲', buf + ' 天'], ['安全系数', k], ['FBA 可售', fba + ' 件']],
          blanks: [
            { key: 'safety', label: '安全库存', hint: '日均 ×（采购+头程+缓冲）× 系数', unit: '件', value: safety },
            { key: 'days', label: '距离断货', hint: 'FBA 可售 ÷ 日均销量', unit: '天', value: daysLeft }
          ],
          steps: [
            '安全库存 = ' + F.num(daily, 1) + ' × (' + lead + '+' + ship + '+' + buf + ') × ' + k + ' = ' + F.comma(Math.round(safety)) + ' 件',
            '距离断货 = ' + fba + ' ÷ ' + F.num(daily, 1) + ' = ' + F.num(daysLeft, 1) + ' 天',
            daysLeft < (lead + ship) ? '→ 剩余天数 < 采购+头程，海运已经来不及，只能空运/调拨/控广告消耗三选一。'
                                     : '→ 还有窗口，按正常海运排产即可。'
          ],
          usage: '断货的真实代价不只是少卖的几天，还有排名掉下去之后重新爬回来的广告费。所以“距离断货天数 vs 补货总时长”是每周必看的红线对比。',
          caveat: '安全系数按海运 1.2、空运 1.0–1.1 取；旺季或新链接建议上浮。'
        };
      }
    }
  ];

  /* ============================================================
     题型 2 · 单选 / 多选（场景下的“下一步动作”）
     选项 kind：correct 正确动作 / assistant 助理会先做 / order 顺序错 / wrong 方向错
     ============================================================ */
  const MCQ = [
    {
      id: 'Q1', dim: 'ads', layer: 'base', type: 'single',
      stem: 'W3 数据：ACOS 从 40% 升到 68%，CTR 从 0.38% 降到 0.21%，CVR 从 5% 降到 4%，曝光涨了 90%。作为运营，你的第一步是：',
      options: [
        { id: 'a', text: '直接把所有活动 bid 降 20%，先把 ACOS 压下来', kind: 'order', note: '跳过了定位直接动手。曝光涨 90% + CTR 腰斩，说明进来的流量变“泛”了，此时降 bid 只是让泛词少花点钱，根因还在。' },
        { id: 'b', text: '先拉搜索词报告，看泛词占比是否异常，再决定否词还是降 bid', kind: 'correct', note: '正确。异常特征指向“点击端 + 流量质量”，第一步必须是定位：是词变泛了，还是展示端不行了。' },
        { id: 'c', text: '关掉自动广告止损', kind: 'assistant', note: '最后手段被提前使用。关掉会同时丢掉数据积累和 listing 权重，且你还没确定问题出在自动活动上。' },
        { id: 'd', text: '先换主图把 CTR 拉回来', kind: 'order', note: '如果症结是泛词涌入，主图再好也没用——看的人根本不是目标客群。顺序应该是“先验词，再改图”。' }
      ],
      answer: ['b'],
      summary: '运营岗的判断顺序固定为：先分层定位（点击端/转化端/成本端）→ 再选动作。ACOS 是结果指标，不能拿它当病因。'
    },
    {
      id: 'Q2', dim: 'ads', layer: 'base', type: 'single',
      stem: '某手动精准活动：CTR 0.42%（正常），CVR 从 4.1% 掉到 2.6%，ACOS 52%，毛利率 33%。你下一步：',
      options: [
        { id: 'a', text: '降 bid 15%，先把 ACOS 压到 35% 以下', kind: 'assistant', note: '把转化问题当成本问题。降 bid 只会减少曝光，不会让点进来的人更愿意下单，ACOS 反而可能更难看。' },
        { id: 'b', text: '查详情页（价格/五点/评论/QA/近期差评）并对比竞品价格带', kind: 'correct', note: '正确。CTR 正常说明流量是对的，CVR 掉说明“人进来了但没买”——问题在详情页或价格竞争力。' },
        { id: 'c', text: '否掉所有低转化词，重新打词', kind: 'order', note: 'CTR 正常已说明词基本精准。此时大规模否词会误杀有效流量，属于“用大力气修错地方”。' },
        { id: 'd', text: '加预算冲一波排名，用单量摊薄成本', kind: 'wrong', note: 'CVR 在跌的时候加预算，等于把同样低的转化效率放大，亏损同步放大。' }
      ],
      answer: ['b'],
      summary: '三通道口诀：CTR 管流量质量、CVR 管详情页、bid 管成本。三条线不许串——CVR 低却去动 bid，是最典型的串线。'
    },
    {
      id: 'Q3', dim: 'lifecycle', layer: 'ops', type: 'single',
      stem: '新品上架第 18 天：ACOS 62%，毛利率 30%，CVR 8.5%（高于类目均值），自然单占比从 12% 涨到 28%，TACOS 从 24% 降到 17%。主管问你“这广告还投不投”，你怎么答：',
      options: [
        { id: 'a', text: '立刻把 ACOS 压到 30% 以下，否则就是失控', kind: 'assistant', note: '只盯单指标。ACOS 高于毛利，但 CVR 高、自然单占比在涨、TACOS 在降——这正是“广告买排名”生效的典型曲线。' },
        { id: 'b', text: '维持结构继续投，但把预算集中到已验证的高转化词，并用 TACOS 与自然单占比设观察线', kind: 'correct', note: '正确。冷启动阶段的目标是买数据、买排名，不是买利润；判断标准是 TACOS 趋势与自然单占比，而不是单看 ACOS。' },
        { id: 'c', text: '关掉自动广告，只留手动精准控制成本', kind: 'wrong', note: '自动广告此时还在拓词，关掉等于切断新品最重要的流量来源，且会丢掉词库积累。' },
        { id: 'd', text: '全线提 bid 抢首页，把单量再冲高', kind: 'wrong', note: '方向对但幅度失控。冷启动阶段预算有限，全线提价会让 TACOS 掉头向上，反而破坏了正在形成的健康曲线。' }
      ],
      answer: ['b'],
      summary: '“容忍高 ACOS”有明确条件：CVR 健康、自然单占比在涨、TACOS 在降、且处在毛利可承受的时间窗内（通常前 2–4 周）。四个条件缺一个，就该收紧。'
    },
    {
      id: 'Q4', dim: 'lifecycle', layer: 'ops', type: 'single',
      stem: '成熟期老品（上架 14 个月）：TACOS 从 11% 升到 18%，自然单占比从 70% 降到 52%，ACOS 22%（毛利率 28%），单量与去年持平。你判断：',
      options: [
        { id: 'a', text: '加大预算抢份额，单量不能掉', kind: 'wrong', note: '单量没掉、广告占比却在涨，说明广告在“补贴本该自然成交的需求”，加预算等于加大补贴。' },
        { id: 'b', text: '查流量结构：是否广告在承接本可自然成交的词，收缩品牌词/核心大词投放，预算转向竞品拦截与防守', kind: 'correct', note: '正确。成熟期的核心矛盾是“广告效率衰减”，要先剥离无效补贴，再谈增长。' },
        { id: 'c', text: '直接降价 10% 换单量', kind: 'order', note: '降价能提 CVR，但会永久损伤价格带与利润结构，且没解决“广告吃自然流量”的问题。' },
        { id: 'd', text: '先关掉 SD，看 TACOS 会不会降', kind: 'assistant', note: '用关活动代替诊断。SD 只占一部分花费，盲关会丢掉再营销流量，也得不到可归因的结论。' }
      ],
      answer: ['b'],
      summary: '成熟期的健康信号是 TACOS 稳或降、自然单占比稳或升。两者反向走，说明广告效率在衰减，先做“流量结构剥离”，再谈加投放。'
    },
    {
      id: 'Q5', dim: 'funnel', layer: 'ops', type: 'single',
      stem: '新店、无品牌备案、月广告预算 $600、产品处于冷启动第 2 周。你的投放组合应该是：',
      options: [
        { id: 'a', text: 'SP 为主（约 80%），SD 小预算做竞品 ASIN 防御，SB 因无备案暂不可投，DSP 不碰', kind: 'correct', note: '正确。SP 是基本盘且无门槛；SB 必须品牌备案；DSP 有预算门槛，冷启动阶段投它是浪费。' },
        { id: 'b', text: 'SP / SB / SD 三等分，全漏斗一起铺开', kind: 'assistant', note: 'SB 的前提条件不满足，方案直接落不了地；预算被摊薄后每个活动都拿不到足够点击（<10 次/天），数据全是噪音。' },
        { id: 'c', text: '先投 DSP 做上层种草，把品牌认知打出来', kind: 'wrong', note: '顺序倒置。DSP 解决的是“有认知之后的放大”，新品连转化数据都没有，种草无处落地。' },
        { id: 'd', text: '只投 SB 抢搜索结果顶部品牌位', kind: 'wrong', note: '无备案不能投；即便能投，SB 也不承担“从 0 拿关键词排名”的任务。' }
      ],
      answer: ['a'],
      summary: '组合优先级由“阶段 + 预算 + 前提条件”三者共同决定。SP 打排名、SB 做品牌词防御与品类拦截、SD 做再营销与竞品防御、DSP 做上层与召回——顺序不能颠倒。'
    },
    {
      id: 'Q6', dim: 'inventory', layer: 'ops', type: 'single',
      stem: '两个 SKU 同时告急：A 已断货第 6 天（日均 18 单，海运还要 25 天到）；B 滞销 800 件（库龄 210 天，日均 2 单，净利率 3%）。今天只能先做一件事：',
      options: [
        { id: 'a', text: '先处理 B 的清货，因为超龄库存费更贵', kind: 'assistant', note: 'B 还有 210 天库龄，没到 365 天的超高费率区；A 每断一天都在掉排名，损失是复利。' },
        { id: 'b', text: '先救 A：空运一小批止血，同时控广告消耗与提价减少流失；B 排清货计划', kind: 'correct', note: '正确。断货的代价 = 缺货损失 + 排名恢复所需的广告费，通常远高于空运溢价。' },
        { id: 'c', text: '两个一起降价，先把现金流拉回来', kind: 'wrong', note: 'A 断货降价没有意义（没货可卖），B 降价会进一步压毛利，两个动作都不解决核心矛盾。' },
        { id: 'd', text: '给 A 加广告冲排名，等货到了直接接上', kind: 'order', note: '断货期加广告是纯烧钱：点击进来看到无货/长配送时间，转化极低，还会拉低 listing 的转化权重。' }
      ],
      answer: ['b'],
      summary: '资源冲突时的排序原则：先救“不可逆的损失”（排名、账户），再处理“可逆的损失”（库存、利润）。断货属于前者。'
    },
    {
      id: 'Q7', dim: 'profit', layer: 'ops', type: 'single',
      stem: '某 ASIN 月销 420 单，净利率只有 5%，TACOS 26%，自然单占比 30%，评分 4.2，退货率 12%（类目均值 6%）。你的建议是：',
      options: [
        { id: 'a', text: '直接清货，5% 净利不值得做', kind: 'assistant', note: '还没验证是否可救。高退货率往往意味着“产品缺陷或预期错位”，改对了可能是 20% 净利的品。' },
        { id: 'b', text: '先拆退货原因与差评结构，判断是产品缺陷还是预期错位，同时测算提价/降成本后的净利，再定迭代或清货', kind: 'correct', note: '正确。5% 净利是结果，退货率 12% 是线索——先定位利润漏在哪，再决定救不救。' },
        { id: 'c', text: '维持现状，有量就有现金流', kind: 'wrong', note: '5% 净利经不起一次广告涨价或一次退货率上浮，本质是在用现金换库存周转。' },
        { id: 'd', text: '加大广告把单量冲上去，摊薄固定成本', kind: 'order', note: 'TACOS 已经 26%，加大广告会先吃掉那 5% 的净利；且退货率高的情况下，单量越大亏损越大。' }
      ],
      answer: ['b'],
      summary: '判断“迭代 / 清货 / 维持”的三步：① 利润漏在哪（退货、广告、成本）；② 修好后的理论净利是多少；③ 修复成本与时间是否可接受。三步走完再下结论。'
    },
    {
      id: 'Q8', dim: 'sourcing', layer: 'ops', type: 'single',
      stem: '三个候选品：① 月搜 8 万，Top10 全是品牌，均价 $19，你的成本结构做不进 $22；② 月搜 1.2 万，竞争中等，测算净利 22%，但外观专利未查；③ 月搜 3 万，竞争激烈，净利 12%，回本要 6 个月。你选：',
      options: [
        { id: 'a', text: '选①，需求最大，先占坑再优化成本', kind: 'wrong', note: '“有销量但没利润”——成本结构注定打不过，进场就是陪跑。' },
        { id: 'b', text: '倾向②，但必须先做专利/商标初筛，结论不明确就放弃', kind: 'correct', note: '正确。②的需求、竞争、利润三项都过线，唯一没验证的是合规——而合规是“1”，过不了这一关，后面全是 0。' },
        { id: 'c', text: '选③，竞争激烈说明市场被验证过，稳妥', kind: 'assistant', note: '“有利润但做不大”：12% 净利 + 6 个月回本，在广告与价格战下几乎没有容错空间。' },
        { id: 'd', text: '三个都不做，继续找更好的', kind: 'wrong', note: '完美主义也是一种成本。②已经接近可立项标准，正确做法是“带条件推进”，不是无限期等待。' }
      ],
      answer: ['b'],
      summary: '选品验证三件事：需求是否持续、竞争是否可进入、利润是否扛得住全成本。三件事中合规是前置门槛，不是“以后再说”的项。'
    },
    {
      id: 'Q9', dim: 'inventory', layer: 'ops', type: 'single',
      stem: '库存周转 95 天，IPI 382（限仓线 400），库龄 300 天以上库存占 40%，日均销量还在下滑。本周优先级最高的动作是：',
      options: [
        { id: 'a', text: '加大广告把销量拉起来，用销量降周转', kind: 'order', note: '逻辑没错但周期太长。IPI 已经低于限仓线，等广告起量时可能已经被限仓，反而更被动。' },
        { id: 'b', text: '启动清货（Coupon/BD/捆绑/站外）+ 暂停补货，先把周转与库龄拉回阈值', kind: 'correct', note: '正确。IPI 低于 400 会直接限制补货能力，此时“止损”优先于“增长”，先恢复账户的运作空间。' },
        { id: 'c', text: '直接弃置超龄库存，一次性出清', kind: 'assistant', note: '亏损最大化。弃置前应先跑清货渠道，多数情况下打折清货的回收额高于弃置（还能回收部分成本并保住 listing 权重）。' },
        { id: 'd', text: '什么都不做，等旺季自然消化', kind: 'wrong', note: '库龄在走、IPI 在跌，等待只会让超龄仓储费与限仓同时发生。' }
      ],
      answer: ['b'],
      summary: '库存类决策有一条铁律：先看 IPI 与库龄这两个“硬阈值”，再看利润。阈值失守时，清货优先级高于“再多卖几个”。'
    },
    {
      id: 'Q10', dim: 'compliance', layer: 'ops', type: 'single',
      stem: '供应商推荐一款“和大牌几乎同款外观”的产品，价格优势明显，样品质感很好。你的处理是：',
      options: [
        { id: 'a', text: '先小批量试卖，被投诉再下架', kind: 'wrong', note: '外观侵权一旦被投诉，链接下架是轻的，账户停用是重的；届时库存、广告投入、账号全部归零。' },
        { id: 'b', text: '立项前做外观专利与商标初筛，拿不到明确结论就不做', kind: 'correct', note: '正确。选品阶段做 IP 初筛的成本最低，越往后（已备货、已投广告）退出成本越高。' },
        { id: 'c', text: '换个颜色/改个 logo 规避', kind: 'assistant', note: '外观专利保护的是整体视觉效果，换色通常不构成规避；这种“技术性规避”在投诉面前站不住。' },
        { id: 'd', text: '只在站外渠道卖，不进亚马逊', kind: 'wrong', note: '规避平台不等于规避法律责任，且站外同样会被品牌方追责。' }
      ],
      answer: ['b'],
      summary: '知识产权分商标、版权、专利三类，任一类踩线都可能直接下架或停用账户。运营岗在选品阶段就要把这道闸门关上。'
    },
    {
      id: 'Q11', dim: 'ads', layer: 'base', type: 'multi',
      stem: '某活动 CTR 正常、CVR 正常，但 ACOS 62%（毛利率 30%），花费集中在 3 个大词上。以下哪些动作本周可以“同时”推进？',
      options: [
        { id: 'a', text: '对高花费、0 转化的搜索词做精准否定', kind: 'correct', note: '可以立即做。它只切断无效流量，不改变其他变量的观察条件。' },
        { id: 'b', text: '对高转化但 CPC 偏贵的词降 bid 5–10%', kind: 'correct', note: '可以同时做。属于成本端的独立调整，与否定词不冲突。' },
        { id: 'c', text: '同时把该活动日预算翻倍', kind: 'wrong', note: '在 ACOS 超标时加预算，等于放大亏损；且与 A/B 同时执行会导致无法归因。' },
        { id: 'd', text: '同时改主图、改价格，并把所有词 bid 降 20%', kind: 'wrong', note: '多变量同时动，一周后你无法判断是哪个动作起了作用——这是复盘失效的最常见原因。' }
      ],
      answer: ['a', 'b'],
      summary: '并行与串行的分界：不改变彼此观察条件的动作可以并行（否词 / 单个 bid 微调）；会互相污染归因的动作必须串行（改价 + 改图 + 全量降 bid）。'
    },
    {
      id: 'Q12', dim: 'ads', layer: 'base', type: 'multi',
      stem: '新品冷启动第 1 周，开自动广告之前必须完成/确认的事项有哪些？',
      options: [
        { id: 'a', text: '建好关键词表（核心词 ≥3、长尾词 ≥10）并完成 Listing 埋词', kind: 'correct', note: '必须。没有词表就开广告等于闭眼撒钱；埋词不到位，广告跑出来的词也带不动自然权重。' },
        { id: 'b', text: '确认日预算能支撑每个活动 ≥10 次点击', kind: 'correct', note: '必须。点击太少，7 天后的搜索词报告全是噪音，分词结论不可信。' },
        { id: 'c', text: '先把 ACOS 目标设到 15% 以内', kind: 'wrong', note: '新品期不现实。冷启动是买数据阶段，用成熟期指标设 KPI 会导致过早砍掉有效流量。' },
        { id: 'd', text: '竞价策略设为“动态竞价—只降低”', kind: 'correct', note: '推荐。新品期控 ACOS 的首选，避免系统在你不确定的时候自动加价。' }
      ],
      answer: ['a', 'b', 'd'],
      summary: '冷启动的四个前置条件：词表、埋词、预算够跑出样本、竞价策略保守。缺任何一个，7 天后的复盘都没有意义。'
    },
    {
      id: 'Q13', dim: 'lifecycle', layer: 'ops', type: 'multi',
      stem: '哪些信号出现时，应该启动“清货”而不是继续投入？',
      options: [
        { id: 'a', text: '库龄 > 365 天的库存占比超过 20%', kind: 'correct', note: '正确。超龄库存仓储费是阶梯式惩罚，此时清货的现金回收优于继续持有。' },
        { id: 'b', text: '净利为负且连续 8 周没有可执行的改善路径', kind: 'correct', note: '正确。“能救”的前提是存在明确的修复动作；没有路径的亏损只是在延长失血。' },
        { id: 'c', text: '某一周 ACOS 突然冲到 55%', kind: 'wrong', note: '单周波动不足以判断生命周期。先按决策树定位，多半是词或展示端问题。' },
        { id: 'd', text: '迭代款已上线，老款自然单占比持续下滑', kind: 'correct', note: '正确。老款进入“被自己替代”阶段，继续投广告是内部左右手互搏。' }
      ],
      answer: ['a', 'b', 'd'],
      summary: '清货的三个触发条件：库存时间成本失控、亏损无修复路径、被自家迭代款替代。单周指标波动永远不是清货理由。'
    },
    {
      id: 'Q14', dim: 'compliance', layer: 'ops', type: 'multi',
      stem: '以下哪些属于必须每周盯住的账号健康 / 库存绩效红线？',
      options: [
        { id: 'a', text: 'ODR（订单缺陷率）< 1%', kind: 'correct', note: '正确。ODR 超标会触发账户审核，是最硬的红线之一。' },
        { id: 'b', text: 'LSR（迟发率）< 4%', kind: 'correct', note: '正确。物流时效类指标直接关联账户健康评级。' },
        { id: 'c', text: 'VTR（有效追踪率）> 95%', kind: 'correct', note: '正确。追踪率不足会影响自发货权限。' },
        { id: 'd', text: 'ACOS < 20%', kind: 'wrong', note: 'ACOS 是经营指标，不是平台考核指标。把它当“红线”会导致新品期做出错误决策。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '账户安全是“1”，增长是后面的“0”。ODR/LSR/VTR 是平台口径的硬指标，ACOS 是你自己的经营口径，两者不能混为一谈。'
    },
    {
      id: 'Q15', dim: 'funnel', layer: 'ops', type: 'multi',
      stem: '关于 TACOS 的理解，下列哪些说法成立？',
      options: [
        { id: 'a', text: 'TACOS = 广告花费 ÷ 总销售额（广告单 + 自然单）', kind: 'correct', note: '正确。分母包含自然单，这是它与 ACOS 的根本区别。' },
        { id: 'b', text: 'TACOS 持续下降，通常意味着自然流量在承接广告买来的排名', kind: 'correct', note: '正确。同样的花费撬动了更大的总销售，说明广告的外溢效应在显现。' },
        { id: 'c', text: '健康品牌 TACOS 常在 10%–18%，趋势比绝对值更重要', kind: 'correct', note: '正确。绝对值受类目与阶段影响大，趋势才是判断依据。' },
        { id: 'd', text: '只要 ACOS 达标，TACOS 就可以不看', kind: 'wrong', note: 'ACOS 达标但 TACOS 上升，说明广告在补贴本该自然成交的需求——广告“看起来健康”，生意却在变贵。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: 'ACOS 看“广告这门生意”，TACOS 看“整盘生意”。只看 ACOS 会漏掉最重要的一件事：广告到底有没有把排名沉淀成免费流量。'
    },
    {
      id: 'Q16', dim: 'profit', layer: 'ops', type: 'multi',
      stem: '测算单件净利润时，哪些项必须计入（漏一项就会高估利润）？',
      options: [
        { id: 'a', text: 'FBA 配送费与平台佣金', kind: 'correct', note: '必须。这两项通常占售价的 25%–40%，是最大的一块硬成本。' },
        { id: 'b', text: '头程物流与仓储费', kind: 'correct', note: '必须。头程按件摊，仓储按体积/时间摊，旺季差异很大。' },
        { id: 'c', text: '退货损耗', kind: 'correct', note: '必须。退货率从 6% 涨到 12%，可能直接把 15% 的净利吃掉一半。' },
        { id: 'd', text: '竞品当前售价', kind: 'wrong', note: '竞品售价是“定价参考”，不是你的成本项。把它写进成本表是概念混淆。' },
        { id: 'e', text: '广告费用与运营服务费/提成', kind: 'correct', note: '必须。广告费按单件摊销，提成按销售额或毛利计提，都是真实支出。' }
      ],
      answer: ['a', 'b', 'c', 'e'],
      summary: '七项成本缺一不可：产品、头程、FBA、佣金、仓储、退货、广告（+ 提成）。面试时能把这七项报出来，比“毛利 30%”有说服力得多。'
    },
    {
      id: 'Q17', dim: 'compliance', layer: 'ops', type: 'single',
      stem: '某服务商报价很低，承诺“7 天冲首页 + 送 50 条评论”，并表示“出问题我们兜”。你的判断：',
      options: [
        { id: 'a', text: '先在一条清货链接上试试水，风险可控', kind: 'wrong', note: '账号级处罚不看链接数量。一次操纵评论被判定，可能是评论清零、销售权限暂停，甚至关联到同主体其他店铺。' },
        { id: 'b', text: '直接拒绝：操纵评论与异常流量属于平台零容忍项，账户安全不可交易', kind: 'correct', note: '正确。“兜底”承诺在平台处罚面前没有执行力，风险由账户持有人承担。' },
        { id: 'c', text: '让对方把“风险兜底”写进合同再合作', kind: 'assistant', note: '合同约束的是服务商，约束不了平台。处罚落地时，合同只能帮你追偿，救不回账户。' },
        { id: 'd', text: '只用他们“送评”的部分，不用刷单部分', kind: 'wrong', note: '两者都是操纵评论/评价，性质相同，没有“只用一半”的安全区。' }
      ],
      answer: ['b'],
      summary: '合规判断的标准不是“会不会被抓”，而是“一旦被抓，损失是否不可承受”。账户属于后者时，唯一正确答案是拒绝。'
    }
  ];

  /* ============================================================
     题型 3 · 简答（决策依据 + 取舍）
     不自动判分语义，给评分要点 checklist + 参考答案，记录自评覆盖率
     ============================================================ */
  const SHORT = [
    {
      id: 'S1', dim: 'lifecycle', layer: 'ops', title: '新品期 ACOS 高于毛利，怎么向主管解释',
      prompt: '新品上架第 3 周，ACOS 58%，毛利率 30%。主管在会上问：“这不算亏损吗？”请用 4–6 句话说明你的判断依据和你会给出的承诺。',
      checklist: [
        '先说清 ACOS 的分母与盈亏线的概念（ACOS 与毛利率比较，58% > 30% 确实是负毛利投放）',
        '给出“这是买排名”的证据链：CVR 是否健康、自然单占比是否在涨、TACOS 是否在降',
        '明确时间窗与退出条件（如第 4–6 周必须把 ACOS 压到毛利以下，或设定自然单占比目标）',
        '说明这期间的止损动作（否词、降 bid、控预算上限），证明不是“放任烧钱”',
        '给出可量化的承诺指标（TACOS 目标、自然单占比目标、单量目标）'
      ],
      reference: '“58% 对 30% 的毛利，单看广告确实是负毛利，这点我不回避。但判断它是亏损还是投资，要看三个证据：一是 CVR 现在 8.2%，高于类目 6% 的均值，说明流量是精准的；二是自然单占比从 12% 涨到 28%，TACOS 从 24% 降到 17%，说明广告买来的排名正在转成免费流量；三是我们还在第 3 周，属于冷启动窗口。所以我的建议是继续投，但加三个约束：预算封顶、每周做一次否词、第 6 周前把 ACOS 压到 30% 以下。到第 6 周如果 TACOS 没降、自然单占比没涨，我主动砍预算，不等你来问。”',
      pitfalls: '最差的答法是“新品都这样”或者“看长期”。主管要的不是解释，是可验证的假设 + 明确的退出条件。'
    },
    {
      id: 'S2', dim: 'funnel', layer: 'ops', title: '预算有限时 SP / SB / SD 的投放顺序',
      prompt: '月预算只有 $600，产品是一个已有 40 条评论的成长期链接，品牌已备案。请说明你会怎么分配 SP / SB / SD，以及为什么是这个顺序。',
      checklist: [
        '明确 SP 为基本盘（占比最高），理由是承担关键词排名与转化的主任务',
        '说明 SB 的定位是品牌词防御 + 品类拦截，且需品牌备案这一前提',
        '说明 SD 的定位是再营销与竞品 ASIN 防御，适合有流量基础后开启',
        '提到 DSP 属于上层种草/流失召回，有预算门槛，当前阶段不投',
        '给出具体比例或金额，并说明按周/按数据反馈调整的机制'
      ],
      reference: '我会按 SP 70%（约 $420）、SB 15%（$90）、SD 15%（$90）来分。SP 是基本盘，它决定这个词能不能排上去、转化能不能起来，所以必须先吃饱；SB 用来守品牌词和拦截品类大词，前提是已备案，成长期开刚好能吃到 SP 打出来的认知；SD 用来做再营销和竞品详情页防御，需要一定流量基数才有意义，$90 只做一两个高相关竞品 ASIN 的小额测试。DSP 现在不投——它有最低预算门槛，且解决的是“认知放大”，我们连转化模型都还没稳住。三周后按数据调：如果 SB 的品牌词 ACOS 明显低于 SP，就把预算往 SB 挪。',
      pitfalls: '不要平均分配。平均分配的结果是每个活动每天拿不到 10 次点击，数据全是噪音，等于三份钱都没花出结论。'
    },
    {
      id: 'S3', dim: 'inventory', layer: 'ops', title: '断货和滞销同时存在，先救哪个',
      prompt: 'A 链接断货第 5 天（日均 20 单，海运 28 天到）；B 链接滞销 900 件（库龄 180 天，日均 2 单，净利率 3%）。可用资金只够做一件事。你先做哪个？为什么？',
      checklist: [
        '明确优先级：先救 A（断货损失不可逆，排名掉下去要花钱买回来）',
        '量化对比两类损失：A 的缺货损失 + 排名恢复广告成本 vs B 的仓储费与资金占用',
        '给出 A 的具体止血方案（空运小批量/提价降速/控广告消耗/调拨），并说明成本',
        '给出 B 的清货路径（Coupon/BD/捆绑/站外），并说明为什么不急在这一周',
        '说明判断用的阈值（库龄 365 天、IPI 400、周转 60 天）'
      ],
      reference: '先救 A。A 断货 5 天，日均 20 单，光缺货损失一周就是 140 单；更贵的是排名——掉下去之后要靠广告重新买回来，这笔钱通常远高于空运溢价。所以 A 的动作是：空运 7–10 天用量的止血批次，同时把价格上调 5%–8% 降低消耗速度，广告只保留高转化词、暂停拓词。B 还有 180 天库龄，没到 365 天的超高费率区，这一周不动不会致命；下周排清货计划，用 Coupon + 捆绑先把动销拉起来，同时暂停补货。判断依据很简单：A 的损失不可逆，B 的损失可逆且有时间窗口。',
      pitfalls: '很多人会选 B，理由是“仓储费贵”。但 180 天库龄离 365 天还有半年，而 A 的排名每天都在掉——这是典型的时间尺度误判。'
    },
    {
      id: 'S4', dim: 'profit', layer: 'ops', title: '净利只有 5% 的 ASIN：迭代、清货还是维持',
      prompt: '月销 420 单，净利率 5%，TACOS 26%，退货率 12%（类目 6%），评分 4.2。请给出你的判断路径和结论。',
      checklist: [
        '先拆利润漏点：退货损耗、广告占比、采购/头程成本分别吃掉多少',
        '分析退货率偏高的原因（产品缺陷 / 尺寸预期错位 / 描述不符），并关联差评内容',
        '测算修复后的理论净利（如退货率降到 6%、TACOS 降到 18% 后的净利率）',
        '给出明确结论（迭代 / 清货 / 维持）并说明触发条件与时间点',
        '提到评分 4.2 对转化的影响，以及修复评价的动作'
      ],
      reference: '先定位再决策。5% 净利 + 12% 退货率，最大的嫌疑是退货损耗：退货率比类目高 6 个点，按售价算就是 6 个点的净利被吃掉，这一项修好净利就能到 11%。第二步看 TACOS 26%，明显偏高，说明自然单没接住，广告在补贴需求。第三步看 4.2 分，评分偏低会持续压制 CVR，形成负循环。所以我的结论是“有条件迭代”：先用 4 周做三件事——拆差评定位退货主因、改五点与尺寸图降低预期错位、把 TACOS 压到 18%。如果 4 周后净利能到 12% 以上就继续做；到不了，说明产品定义本身有问题，转清货。',
      pitfalls: '直接清货是助理思维（看结果下结论），直接加广告是赌徒思维。运营要做的是“算清楚能修到多少，再决定修不修”。'
    },
    {
      id: 'S5', dim: 'sourcing', layer: 'ops', title: '差评痛点如何转化为 Listing 与广告动作',
      prompt: '你负责的品近 30 天新增 40 条差评，集中在“漏水”“盖子难拧”“比想象中小”。请说明你会怎么把这三类痛点转成具体的 Listing 和广告动作。',
      checklist: [
        '先做痛点归因分类：产品缺陷（漏水/难拧）vs 预期错位（比想象中小）',
        '产品缺陷类 → 反馈供应链改进或增加质检，同时在 Listing 前置说明使用方式',
        '预期错位类 → 用尺寸对比图、场景图、五点里的具体尺寸数字校正预期',
        '广告端：把痛点词/疑虑词做成否定词或反向选词（如 easy to clean、leak proof 作为卖点词）',
        '提到 QA 与 A+ 内容承接，以及改完后 2–4 周复查退货率与差评率'
      ],
      reference: '先分类：漏水和盖子难拧是产品/结构问题，靠文案修不好，要同步给供应链做密封圈与螺纹的改进，同时在前台用使用说明和 QA 降低误用率；“比想象中小”是预期错位，属于纯 Listing 问题。Listing 侧我会做三件事：主图加一张带尺寸标注的对比图（和常见杯子/手掌对比）、五点第一条直接写容量与实物尺寸、A+ 增加场景图说明适用场景。广告侧：把 leak proof、easy to open 这类“疑虑词”做成手动精准的卖点词去打，同时在自动里否定掉规格不匹配的长尾词（比如 40oz 相关词）。改完 2–4 周复查退货率和差评关键词，用数据确认是否真的修好了。',
      pitfalls: '只改文案不改产品，漏水问题会持续产生差评；只改产品不改文案，预期错位会持续产生退货。两条线要同时走。'
    },
    {
      id: 'S6', dim: 'lifecycle', layer: 'ops', title: '老品的迭代 / 清货 / 淘汰触发条件',
      prompt: '你手上有一个上架 3 年的老品，曾贡献 40% 的利润，现在单量年降 30%、TACOS 上升、库存还有 1200 件。请说明你会用什么条件判断“迭代、清货还是淘汰”。',
      checklist: [
        '先看需求端：搜索量趋势、类目新品占比、自身自然单占比是否结构性下滑',
        '看利润端：当前净利率与“迭代后”的理论净利率对比',
        '看库存端：库龄结构、清货所需时间与现金回收率',
        '给出三类判断的明确触发条件（什么情况下迭代/清货/淘汰）',
        '说明决策节奏（如 60 天观察窗 + 阶段性止损点）'
      ],
      reference: '我分三条线看。第一，需求是不是结构性下滑——如果是整个类目搜索量在跌，迭代也没用，那是淘汰信号；如果是类目还在长、只是我们的份额在丢，那是迭代信号。第二，算迭代的经济性：改模具/改包装要投多少钱，改完理论净利能到多少，多久回本。第三，库存 1200 件是最硬的约束——按现在的动销，清完要多久？如果超过 90 天，清货必须先启动，迭代方案要能消化这批库存（比如换包装不换主体）。我的触发条件是：类目需求还在 + 迭代后净利 ≥ 15% + 回本 < 6 个月 → 迭代；需求下滑 + 库存周转 > 90 天 → 先清货再评估；需求结构性消失 → 淘汰，不再投入任何模具费。',
      pitfalls: '“曾经贡献 40% 利润”是最危险的情感锚点。老品的判断只看未来现金流，不看历史功劳。'
    }
  ];

  /* ============================================================
     题型 5 · 案例复盘（随机周报数据 + 三通道口诀提示）
     ============================================================ */
  const CASE = [
    {
      id: 'C1', layer: 'ops', dim: 'ads',
      build: function () {
        const dir = R.pick(['broad', 'ctr', 'cvr', 'cost']);
        const price = R.pick([24.99, 29.99, 34.99]);
        const margin = R.range(0.24, 0.38, 2);

        const i0 = R.int(24, 42) * 1000;
        const c0 = Math.round(i0 * R.range(0.0036, 0.0046));
        const o0 = Math.max(4, Math.round(c0 * R.range(0.055, 0.09)));
        const p0 = R.range(0.5, 0.95, 2);
        const s0 = Number((c0 * p0).toFixed(2));
        const as0 = Number((o0 * price).toFixed(2));
        const t0 = Number((as0 / (1 - R.range(0.32, 0.48))).toFixed(2));

        const mod = {
          broad: { i: 1.95, ctr: 0.52, cvr: 0.94, cpc: 1.02 },
          ctr:   { i: 1.02, ctr: 0.50, cvr: 1.02, cpc: 1.00 },
          cvr:   { i: 1.06, ctr: 1.00, cvr: 0.48, cpc: 1.00 },
          cost:  { i: 1.10, ctr: 1.00, cvr: 1.05, cpc: 1.62 }
        }[dir];

        const i1 = Math.round(i0 * mod.i);
        const c1 = Math.round(i1 * (c0 / i0) * mod.ctr);
        const o1 = Math.max(1, Math.round(c1 * (o0 / c0) * mod.cvr));
        const p1 = Number((p0 * mod.cpc).toFixed(2));
        const s1 = Number((c1 * p1).toFixed(2));
        const as1 = Number((o1 * price).toFixed(2));
        const t1 = Number((as1 / (1 - R.range(0.36, 0.56))).toFixed(2));

        const row = function (w, i, c, o, s, as, t) {
          return [w, F.comma(i), F.comma(c), F.pct(c / i * 100), o,
                  F.pct(o / c * 100), F.money(s), F.money(as), F.pct(s / as * 100), F.money(t)];
        };

        const refs = {
          broad: '问题定位：曝光涨 95%、CTR 腰斩、CPC 基本不变、ACOS 大幅上行 → 泛词涌入导致流量质量下降，问题在点击端。本周动作：拉搜索词报告，对高花费 0 转化的泛词做精准否定，对保留的宽泛匹配降 bid 10%–15%，同时收紧自动活动的宽泛匹配。下周最高优先级：把 W4 的 CTR 拉回 0.30% 以上，同时观察 ACOS 是否回落到毛利率附近。',
          ctr: '问题定位：曝光基本持平、CTR 腰斩、CVR 基本持平 → 不是词的问题，是展示端（主图/标题/价格/评分）吸引力下降，问题在点击端。本周动作：先查搜索词报告确认词仍精准，再测主图（A/B 或换首图 3–5 天），同时看竞品是否降价或上活动。下周最高优先级：只改一个变量（主图），观察 CTR 是否回到 0.35% 以上，不要同时动价格。',
          cvr: '问题定位：曝光与 CTR 正常、CVR 接近腰斩、ACOS 上行 → 流量进来但没买，问题在转化端（详情页/价格/评论/库存状态）。本周动作：查近期差评与 QA、对比竞品价格带、检查配送时效与库存显示，改五点与主图第 2–3 张（卖点/场景）。下周最高优先级：修一个最可能的主因（价格或差评问题），CVR 不回到 6% 以上就不动广告结构。',
          cost: '问题定位：曝光/CTR/CVR 都正常，CPC 涨了 60%，ACOS 上行 → 流量质量没问题，是“好流量太贵”，问题在成本端。本周动作：对高转化词降 bid 5%–10% 保排名，对高花费 0 转化词精准否定，把预算往长尾精准词挪。下周最高优先级：把 CPC 压回原水平，同时守住 CVR 不掉——如果降 bid 后曝光掉太多，改用位置溢价而不是继续压价。'
        };

        return {
          title: '周报复盘 · ' + ({ broad: '泛词涌入型', ctr: '点击端失守型', cvr: '转化端失守型', cost: '成本端失守型' }[dir]),
          dim: 'ads', layer: 'ops', dir: dir,
          scene: '以下是某 SP 活动连续两周的周报摘要（模拟数据）。请用 3–5 句话完成复盘：问题定位 → 本周动作 → 下周 1 个优先级最高的动作。',
          kv: [['客单价', F.money(price)], ['毛利率', F.pct(margin * 100)]],
          table: {
            head: ['周次', '曝光', '点击', 'CTR', '订单', 'CVR', '花费', '广告销售额', 'ACOS', '总销售额'],
            rows: [
              row('W3', i0, c0, o0, s0, as0, t0),
              row('W4', i1, c1, o1, s1, as1, t1)
            ]
          },
          checklist: [
            '引用了具体指标数字定位（而不是“数据变差了”）',
            '明确指出了问题所在的层级（点击端 / 转化端 / 成本端）',
            '本周动作与该层级对应，没有串线（CVR 问题去改 bid 算串线）',
            '给出了下周 1 个最高优先级动作，且可执行、可验证',
            '判断 ACOS 是否异常时考虑了毛利率与产品阶段'
          ],
          reference: refs[dir],
          hintMap: {
            broad: 'CTR 管流量质量：先怀疑词变泛，不是先改图。',
            ctr: 'CTR 管流量质量：词若精准，问题在展示端（主图/价格/标题）。',
            cvr: 'CVR 管详情页：人进来了没买，广告端大动是无效动作。',
            cost: 'bid 管成本：流量质量没问题时，才轮到调价。'
          }
        };
      }
    },
    {
      id: 'C2', layer: 'ops', dim: 'lifecycle',
      build: function () {
        const stage = R.pick(['launch', 'growth', 'mature']);
        const price = R.pick([26.99, 29.99, 34.99]);
        const margin = R.range(0.25, 0.40, 2);
        const base = {
          launch: { w: '第 2 周', acos: R.range(0.55, 0.78, 2), tacos: R.range(0.22, 0.30, 2), nat: R.range(0.10, 0.20, 2), trend: 'up' },
          growth: { w: '第 9 周', acos: R.range(0.24, 0.34, 2), tacos: R.range(0.15, 0.20, 2), nat: R.range(0.35, 0.48, 2), trend: 'up' },
          mature: { w: '第 60 周', acos: R.range(0.18, 0.26, 2), tacos: R.range(0.13, 0.19, 2), nat: R.range(0.45, 0.58, 2), trend: 'down' }
        }[stage];
        const prev = { acos: base.acos - R.range(0.03, 0.09) * (stage === 'mature' ? -1 : 1), tacos: base.tacos - R.range(0.01, 0.03) * (stage === 'mature' ? -1 : 1), nat: base.nat - 0.05 * (stage === 'mature' ? -1 : 1) };
        const refs = {
          launch: '问题定位：ACOS 偏高但在冷启动窗口内，CVR 与自然单占比在改善，TACOS 在降 → 属于“买排名”阶段，不是失控。本周动作：把预算集中到已验证的高转化词，否掉高花费 0 转化词，控制单日预算上限。下周最高优先级：盯自然单占比是否继续上升（目标 +5 个百分点），而不是盯 ACOS。',
          growth: '问题定位：ACOS 已进入毛利区间附近、TACOS 稳、自然单占比过半 → 进入放量期，关键是控 ACOS 上限而不是继续抢量。本周动作：对 ACOS 高于毛利率的词降 bid 5%–10%，把预算挪到长尾精准词和竞品 ASIN 防御。下周最高优先级：把 ACOS 压到毛利率以下 5 个点，同时保住单量。',
          mature: '问题定位：ACOS 尚可但 TACOS 在升、自然单占比在跌 → 广告在补贴本该自然成交的需求，属于效率衰减。本周动作：剥离品牌词与核心大词的无效投放，把预算转到竞品拦截与再营销。下周最高优先级：验证 TACOS 能否回到 15% 以内，回不去就缩总预算。'
        };
        return {
          title: '生命周期判断 · ' + ({ launch: '冷启动期', growth: '放量期', mature: '成熟期' }[stage]),
          dim: 'lifecycle', layer: 'ops',
          scene: '以下是某链接本周的关键数据（模拟数据）。请判断它处在哪个阶段、当前最该做什么、最不该做什么。',
          kv: [['阶段', base.w], ['客单价', F.money(price)], ['毛利率', F.pct(margin * 100)],
               ['ACOS', F.pct(base.acos * 100) + '（上周 ' + F.pct(prev.acos * 100) + '）'],
               ['TACOS', F.pct(base.tacos * 100) + '（上周 ' + F.pct(prev.tacos * 100) + '）'],
               ['自然单占比', F.pct(base.nat * 100) + '（上周 ' + F.pct(prev.nat * 100) + '）']],
          checklist: [
            '明确判断所处阶段（冷启动/放量/维稳/衰退）并给出依据',
            '把 ACOS 与毛利率对比，判断广告本身是否盈利',
            '结合 TACOS 趋势与自然单占比趋势，而不是只看单周 ACOS',
            '给出该阶段的目标（买数据/控 ACOS/保利润/看周转）',
            '指出这个阶段“最不该做”的动作并说明原因'
          ],
          reference: refs[stage],
          hintMap: {
            launch: '冷启动买数据：容忍高 ACOS 的前提是 CVR 健康 + 自然单在涨 + TACOS 在降。',
            growth: '放量控 ACOS：此时才轮到把 ACOS 压到毛利以下，但仍要给排名留预算。',
            mature: '维稳保利润：TACOS 上升 + 自然单下滑 = 广告在补贴自然需求。'
          }
        };
      }
    },
    {
      id: 'C3', layer: 'ops', dim: 'inventory',
      build: function () {
        const daily = R.range(11, 34, 1);
        const fba = R.int(120, 480);
        const transit = R.int(200, 900);
        const lead = R.int(26, 42), ship = R.int(26, 36);
        const daysLeft = fba / daily;
        const arrival = lead + ship;
        const gap = arrival - daysLeft;
        const price = R.pick([24.99, 29.99, 34.99]);
        const margin = R.range(0.26, 0.38, 2);
        return {
          title: '库存与资金复盘 · 补货窗口',
          dim: 'inventory', layer: 'ops',
          scene: '本周库存会上要回答一个问题：这个 SKU 会不会断货。请判断风险、给出本周动作，并说明最不该做的一件事。',
          kv: [['日均销量', F.num(daily, 1) + ' 单'], ['FBA 可售', fba + ' 件'],
               ['在途', transit + ' 件'], ['采购周期', lead + ' 天'], ['头程', ship + ' 天'],
               ['客单价', F.money(price)], ['毛利率', F.pct(margin * 100)]],
          checklist: [
            '算出距离断货天数（FBA 可售 ÷ 日均销量）并与补货总时长对比',
            '明确风险结论（是否会在到货前断货）以及缺口天数',
            '给出分层动作（空运/调拨/提价降速/控广告）并说明优先级',
            '考虑断货的隐性成本（排名恢复需要额外广告费）',
            '指出最不该做的动作（如断货期加广告冲排名）'
          ],
          reference: '距离断货 ' + F.num(daysLeft, 1) + ' 天，补货总时长 ' + arrival + ' 天，缺口约 ' + F.num(Math.max(gap, 0), 0) + ' 天——' + (gap > 0 ? '按现有节奏一定会在到货前断货。本周动作：先空运 ' + Math.round(daily * gap * 0.6) + ' 件覆盖缺口的主要部分（成本换排名），同时把售价上调 5%–8% 降低消耗速度，广告只保留高转化词、暂停拓词。' : '窗口内能到货，但安全库存已经见底，本周动作是把补货单提前锁定，同时提价 3%–5% 降速，观察两周。') + '最不该做的是断货期加广告冲排名——点击进来无货可买，转化极低，还会拉低 listing 权重，钱花了排名反而更差。',
          hintMap: {
            launch: '',
            growth: '',
            mature: ''
          }
        };
      }
    }
  ];

  window.DATA = { DIMS, FILL, MCQ, SHORT, CASE, PRICES };
})();
