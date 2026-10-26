/* ============================================================
   阶段 5 · 题库补厚（让分布均匀）
   ------------------------------------------------------------
   现有 235 题里，ads 占 30%，而 metrics / funnel / sourcing 只有个位数。
   本文件按「薄的地方补」出题，补齐到 300 题：
     填空 16（F49–F64）· 单选 34（Q149–Q182）
     多选 10（Q183–Q192）· 简答 5（S34–S38）
   全部 push 追加，不改 data.js / 判分逻辑 / 既有题目。
   ============================================================ */
(function () {
  const DATA = window.DATA, R = window.R, F = window.F;
  if (!DATA.DIMS) return;

  const P = [24.99, 26.99, 29.99, 32.99, 34.99, 39.99, 44.99];

  /* ============================================================
     填空 16 题（F49–F64）：全部可算，考口径不考记忆
     ============================================================ */
  DATA.FILL.push(
    {
      id: 'F49', dim: 'metrics', layer: 'base', title: 'CPC 的划算线到底是多少',
      build: function () {
        const price = R.pick(P), cvr = R.int(5, 12) / 100, margin = R.int(28, 46) / 100;
        const cap = price * cvr * margin, actual = cap * 1.35;
        return {
          title: 'CPC 的划算线到底是多少', dim: 'metrics', layer: 'base',
          scene: '一款 ' + F.money(price) + ' 的产品，近期 CVR 稳定在 ' + F.pct(cvr * 100, 1) + '，广告前毛利率 ' + F.pct(margin * 100, 0) + '。现在 CPC 是 ' + F.money(actual) + '，主管问你「这个出价还能撑吗」。',
          kv: [['客单价', F.money(price)], ['CVR', F.pct(cvr * 100, 1)], ['广告前毛利率', F.pct(margin * 100, 0)], ['当前 CPC', F.money(actual)]],
          blanks: [
            { key: 'cap', label: 'CPC 划算线（上限）', hint: '客单价 × CVR × 毛利率', unit: '$', value: cap },
            { key: 'gap', label: '每 100 次点击超支', hint: '(当前 CPC − 划算线) × 100', unit: '$', value: (actual - cap) * 100 }
          ],
          steps: [
            'CPC 上限 = 客单价 × CVR × 毛利率 = ' + price + ' × ' + cvr + ' × ' + margin + ' = ' + F.money(cap),
            '当前 CPC ' + F.money(actual) + ' 已高于上限，说明「每次点击的期望毛利」付不起这个点击价',
            '每 100 次点击超支 = (' + F.money(actual) + ' − ' + F.money(cap) + ') × 100 = ' + F.money((actual - cap) * 100)
          ],
          usage: '这条线是出价的物理上限：低于它，广告用毛利就能自己养活自己；高于它，就必须靠自然单的连带收益来补。面试时说出这条公式，比说「我会参考建议出价」强十倍。',
          caveat: 'CPC 划算线只算广告自身的账，不含新品期「买排名」的战略亏损。新品前 2–4 周允许越线，但要有明确的回线时间点。'
        };
      }
    },
    {
      id: 'F50', dim: 'metrics', layer: 'base', title: '盈亏平衡 ACOS 等于什么',
      build: function () {
        const price = R.pick(P), cost = price * (R.int(55, 70) / 100);
        const gross = price - cost, rate = gross / price * 100;
        return {
          title: '盈亏平衡 ACOS 等于什么', dim: 'metrics', layer: 'base',
          scene: '售价 ' + F.money(price) + '，广告之前的全部成本（采购 + 头程 + FBA 配送 + 佣金 + 仓储 + 退货损耗）合计 ' + F.money(cost) + '，还没算广告费。',
          kv: [['售价', F.money(price)], ['广告前总成本', F.money(cost)], ['广告费', '尚未计入']],
          blanks: [
            { key: 'gross', label: '广告前毛利额', hint: '售价 − 广告前总成本', unit: '$', value: gross },
            { key: 'rate', label: '广告前毛利率', hint: '毛利额 ÷ 售价 × 100%', unit: '%', value: rate },
            { key: 'be', label: '盈亏平衡 ACOS', hint: '它和广告前毛利率是同一个数', unit: '%', value: rate }
          ],
          steps: [
            '广告前毛利额 = ' + price + ' − ' + Number(cost.toFixed(2)) + ' = ' + F.money(gross),
            '广告前毛利率 = ' + F.money(gross) + ' ÷ ' + F.money(price) + ' = ' + F.pct(rate, 1),
            '盈亏平衡 ACOS = 广告前毛利率 = ' + F.pct(rate, 1) + '（ACOS 到这个数，广告刚好不赚不亏）'
          ],
          usage: '这是全系统最重要的一个等式。它把「毛利率」和「ACOS」两个数字绑在一起：毛利率 35%，ACOS 35% 就是白干，30% 才赚 5 个点。',
          caveat: '注意是「广告前毛利率」，不是「净利率」。用净利率去当盈亏线，会把广告的贡献重复扣一次，结论会偏保守。'
        };
      }
    },
    {
      id: 'F51', dim: 'metrics', layer: 'base', title: 'ROAS 与 ACOS 互为倒数',
      build: function () {
        const spend = R.int(40, 160), sales = spend * (R.int(25, 60) / 10);
        return {
          title: 'ROAS 与 ACOS 互为倒数', dim: 'metrics', layer: 'base',
          scene: '上周某活动花费 ' + F.money(spend) + '，广告带来销售额 ' + F.money(sales) + '。汇报时老板要两个数：一个看「一块钱换回多少」，一个看「每 100 块销售额花掉多少」。',
          kv: [['广告花费', F.money(spend)], ['广告销售额', F.money(sales)]],
          blanks: [
            { key: 'acos', label: 'ACOS', hint: '花费 ÷ 广告销售额 × 100%', unit: '%', value: spend / sales * 100 },
            { key: 'roas', label: 'ROAS', hint: '广告销售额 ÷ 花费', unit: '倍', value: sales / spend }
          ],
          steps: [
            'ACOS = ' + spend + ' ÷ ' + sales + ' = ' + F.pct(spend / sales * 100, 2),
            'ROAS = ' + sales + ' ÷ ' + spend + ' = ' + (sales / spend).toFixed(2) + ' 倍',
            '验证：ROAS × ACOS = 1 —— 两者是同一组数据的两个视角，永远不会打架'
          ],
          usage: '汇报时用 ROAS 讲增长（一块钱换回几块），用 ACOS 讲成本（吃掉几成销售额）。同一件事换个说法，听的人感受完全不同。',
          caveat: 'ROAS 的分母是「广告花费」，不是「总投入」；把采购成本也算进分母得到的是 ROI，不是 ROAS。这两个别混用。'
        };
      }
    },
    {
      id: 'F52', dim: 'metrics', layer: 'base', title: 'TACOS 与自然单占比一起算',
      build: function () {
        const adSales = R.int(8, 20) * 100, natural = adSales * (R.int(15, 45) / 10);
        const total = adSales + natural, spend = adSales * (R.int(15, 40) / 100);
        return {
          title: 'TACOS 与自然单占比一起算', dim: 'metrics', layer: 'base',
          scene: '上月广告销售额 ' + F.money(adSales) + '，自然单销售额 ' + F.money(natural) + '，广告花费 ' + F.money(spend) + '。老板只关心一句：广告到底有没有在「养」这个链接。',
          kv: [['广告销售额', F.money(adSales)], ['自然单销售额', F.money(natural)], ['广告花费', F.money(spend)]],
          blanks: [
            { key: 'total', label: '总销售额', hint: '广告单 + 自然单', unit: '$', value: total },
            { key: 'tacos', label: 'TACOS', hint: '广告花费 ÷ 总销售额 × 100%', unit: '%', value: spend / total * 100 },
            { key: 'nshare', label: '自然单占比', hint: '自然单销售额 ÷ 总销售额 × 100%', unit: '%', value: natural / total * 100 }
          ],
          steps: [
            '总销售额 = ' + adSales + ' + ' + Number(natural.toFixed(0)) + ' = ' + F.money(total),
            'TACOS = ' + spend + ' ÷ ' + Number(total.toFixed(0)) + ' = ' + F.pct(spend / total * 100, 2),
            '自然单占比 = ' + Number(natural.toFixed(0)) + ' ÷ ' + Number(total.toFixed(0)) + ' = ' + F.pct(natural / total * 100, 1)
          ],
          usage: 'TACOS 单看没有意义，必须配自然单占比：TACOS 降 + 自然单占比涨 = 广告在养链接；TACOS 降 + 自然单占比也降 = 整体在缩，是衰退不是健康。',
          caveat: 'ACOS 只算广告单的账，TACOS 算的是整店的账。老板问「广告占比多少」，标准答案给 TACOS，不要给 ACOS。'
        };
      }
    },
    {
      id: 'F53', dim: 'metrics', layer: 'base', title: '广告订单占比与自然单占比',
      build: function () {
        const adO = R.int(20, 90), natO = R.int(10, 80);
        const total = adO + natO;
        return {
          title: '广告订单占比与自然单占比', dim: 'metrics', layer: 'base',
          scene: '上月订单 ' + total + ' 单，其中广告带来的 ' + adO + ' 单，剩下 ' + natO + ' 单来自自然搜索与推荐位。',
          kv: [['广告订单', adO + ' 单'], ['自然订单', natO + ' 单'], ['总订单', total + ' 单']],
          blanks: [
            { key: 'adshare', label: '广告订单占比', hint: '广告单 ÷ 总订单 × 100%', unit: '%', value: adO / total * 100 },
            { key: 'natshare', label: '自然单占比', hint: '100% − 广告订单占比', unit: '%', value: natO / total * 100 }
          ],
          steps: [
            '广告订单占比 = ' + adO + ' ÷ ' + total + ' = ' + F.pct(adO / total * 100, 1),
            '自然单占比 = ' + natO + ' ÷ ' + total + ' = ' + F.pct(natO / total * 100, 1),
            '两者相加 = 100%（同一批订单的两种归因）'
          ],
          usage: '广告订单占比是「依赖度」的体温计：新品 70%–90% 正常，成熟期要压到 40% 以下。压不下来说明链接始终没长出自己的自然排名。',
          caveat: '归因窗口内「点击过广告但最终自然下单」的订单，平台通常算广告单。所以广告订单占比天然偏高，别拿它精确对账。'
        };
      }
    },
    {
      id: 'F54', dim: 'metrics', layer: 'base', title: '从目标点击倒推日预算',
      build: function () {
        const cpc = R.int(40, 120) / 100, target = R.int(15, 40);
        const price = R.pick(P), limit = R.int(25, 40) / 100;
        const budget = cpc * target;
        return {
          title: '从目标点击倒推日预算', dim: 'metrics', layer: 'base',
          scene: '新开的自动广告，CPC 约 ' + F.money(cpc) + '。你希望它每天至少跑出 ' + target + ' 次点击才够判断词的表现。产品售价 ' + F.money(price) + '，你要求 ACOS 不超过 ' + F.pct(limit * 100, 0) + '。',
          kv: [['CPC', F.money(cpc)], ['目标日点击', target + ' 次'], ['客单价', F.money(price)], ['ACOS 上限', F.pct(limit * 100, 0)]],
          blanks: [
            { key: 'budget', label: '最低日预算', hint: '目标点击 × CPC', unit: '$', value: budget },
            { key: 'perorder', label: '每单可承受广告费', hint: '客单价 × ACOS 上限', unit: '$', value: price * limit },
            { key: 'maxorders', label: '该预算能撑住的最高订单数', hint: '日预算 ÷ 每单可承受广告费（取整）', unit: '单', value: Math.floor(budget / (price * limit)) }
          ],
          steps: [
            '最低日预算 = ' + target + ' 次 × ' + F.money(cpc) + ' = ' + F.money(budget) + '（低于这个数，预算会在中午前烧完，数据不完整）',
            '每单可承受广告费 = ' + price + ' × ' + limit + ' = ' + F.money(price * limit),
            '该预算撑住的订单上限 = ' + F.money(budget) + ' ÷ ' + F.money(price * limit) + ' ≈ ' + Math.floor(budget / (price * limit)) + ' 单'
          ],
          usage: '预算不是「拍一个数」，而是从「我要多少点击才能判断」倒推出来的。助理岗最常犯的错是给 $5 日预算然后抱怨「数据太少」。',
          caveat: '预算与出价要匹配：预算给够、bid 给低，曝光依然上不去；bid 给高、预算不够，上午就烧完。两个一起调。'
        };
      }
    },

    {
      id: 'F55', dim: 'funnel', layer: 'ops', title: '漏斗逐层乘法：订单是怎么漏出来的',
      build: function () {
        const imp = R.int(3, 12) * 10000, ctr = R.int(30, 55) / 100, cvr = R.int(5, 11) / 100;
        const clicks = imp * ctr, orders = clicks * cvr;
        return {
          title: '漏斗逐层乘法：订单是怎么漏出来的', dim: 'funnel', layer: 'ops',
          scene: '某活动上周曝光 ' + F.comma(imp) + '，CTR ' + F.pct(ctr, 2) + '，CVR ' + F.pct(cvr, 1) + '。老板问「这波流量到底值不值」，你要先把漏斗拆开。',
          kv: [['曝光', F.comma(imp)], ['CTR', F.pct(ctr, 2)], ['CVR', F.pct(cvr, 1)]],
          blanks: [
            { key: 'clicks', label: '点击量', hint: '曝光 × CTR', unit: '次', value: clicks },
            { key: 'orders', label: '订单量', hint: '点击 × CVR（保留整数）', unit: '单', value: Math.round(orders) }
          ],
          steps: [
            '点击 = ' + F.comma(imp) + ' × ' + ctr + ' = ' + Math.round(clicks) + ' 次',
            '订单 = ' + Math.round(clicks) + ' × ' + cvr + ' ≈ ' + Math.round(orders) + ' 单',
            '整条漏斗的通过率 = CTR × CVR = ' + F.pct(ctr * cvr * 100, 2) + '（一万次曝光换多少单，一眼看出）'
          ],
          usage: '漏斗乘法让你能回答「曝光翻倍订单会翻倍吗」——不会，因为 CTR 和 CVR 会随流量变泛而下降。先算乘法，再谈加预算。',
          caveat: '加购（ATC）是点击与下单之间的中间层，广告后台不一定给；没有加购数据时，用 CVR 直接判断详情页，别硬拆。'
        };
      }
    },
    {
      id: 'F56', dim: 'funnel', layer: 'ops', title: '加购到下单：差在运费还是差在价格',
      build: function () {
        const atc = R.int(120, 400), orders = Math.round(atc * (R.int(18, 32) / 100));
        const target = 0.45;
        return {
          title: '加购到下单：差在运费还是差在价格', dim: 'funnel', layer: 'ops',
          scene: '近 30 天有 ' + atc + ' 次加购，最终成交 ' + orders + ' 单。行业里这个类目的「加购→下单」通常在 ' + F.pct(target * 100, 0) + ' 左右。',
          kv: [['加购次数', atc + ' 次'], ['成交订单', orders + ' 单'], ['类目参考', F.pct(target * 100, 0)]],
          blanks: [
            { key: 'rate', label: '加购转化率', hint: '订单 ÷ 加购 × 100%', unit: '%', value: orders / atc * 100 },
            { key: 'gap', label: '与参考值的差距', hint: '参考值 − 实际值（百分点）', unit: '%', value: target * 100 - orders / atc * 100 },
            { key: 'extra', label: '补齐这一差距能多出的订单', hint: '(参考转化率 × 加购) − 现有订单（取整）', unit: '单', value: Math.round(atc * target) - orders }
          ],
          steps: [
            '加购转化率 = ' + orders + ' ÷ ' + atc + ' = ' + F.pct(orders / atc * 100, 1),
            '差距 = ' + (target * 100).toFixed(0) + '% − ' + (orders / atc * 100).toFixed(1) + '% = ' + (target * 100 - orders / atc * 100).toFixed(1) + ' 个百分点',
            '若补齐到参考值：' + atc + ' × ' + target + ' ≈ ' + Math.round(atc * target) + ' 单，可多出 ' + (Math.round(atc * target) - orders) + ' 单'
          ],
          usage: '加购高、下单低，问题几乎都在「最后一公里的犹豫」：运费、到货时效、优惠力度、库存显示。这时改五点没用，改价格与运费政策才有用。',
          caveat: '加购数据来自业务报告，含未登录加购与跨设备，本身有误差。看趋势比看绝对值可靠。'
        };
      }
    },
    {
      id: 'F57', dim: 'funnel', layer: 'ops', title: '日 GMV 拆解：三个乘数动哪个',
      build: function () {
        const uv = R.int(300, 1200), cvr = R.int(4, 10) / 100, price = R.pick(P);
        const gmv = uv * cvr * price;
        return {
          title: '日 GMV 拆解：三个乘数动哪个', dim: 'funnel', layer: 'ops',
          scene: '链接日均访客 ' + F.comma(uv) + '，CVR ' + F.pct(cvr, 1) + '，客单价 ' + F.money(price) + '。主管要求下个月日 GMV 提升 30%。',
          kv: [['日均访客', F.comma(uv)], ['CVR', F.pct(cvr, 1)], ['客单价', F.money(price)], ['目标', '日 GMV +30%']],
          blanks: [
            { key: 'gmv', label: '当前日 GMV', hint: '访客 × CVR × 客单价', unit: '$', value: gmv },
            { key: 'target', label: '目标日 GMV', hint: '当前 GMV × 1.3', unit: '$', value: gmv * 1.3 },
            { key: 'cvrneed', label: '只提 CVR 需要达到多少', hint: '目标 GMV ÷ (访客 × 客单价) × 100%', unit: '%', value: gmv * 1.3 / (uv * price) * 100 }
          ],
          steps: [
            '日 GMV = ' + F.comma(uv) + ' × ' + cvr + ' × ' + price + ' = ' + F.money(gmv),
            '目标 GMV = ' + F.money(gmv) + ' × 1.3 = ' + F.money(gmv * 1.3),
            '若访客与客单价不变，CVR 要从 ' + F.pct(cvr * 100, 1) + ' 提到 ' + F.pct(cvr * 130, 1) + '（相对提升 30%，绝对提升 ' + F.pct(cvr * 30, 1) + '）'
          ],
          usage: '三个乘数里，CVR 提升 30% 往往比访客提升 30% 便宜得多——访客要花钱买，CVR 靠改详情页和价格。汇报时先算「哪个乘数最容易动」。',
          caveat: '乘数之间会互相拉扯：单靠降价拉 CVR，客单价会掉，GMV 可能不涨。拆完要回去验算一次。'
        };
      }
    },

    {
      id: 'F58', dim: 'sourcing', layer: 'ops', title: '单件净利与月利润',
      build: function () {
        const price = R.pick(P), unit = price * (R.int(30, 45) / 100);
        const adRate = R.int(8, 18) / 100, units = R.int(300, 1200);
        const allCost = unit + price * adRate, net = price - allCost;
        return {
          title: '单件净利与月利润', dim: 'sourcing', layer: 'ops',
          scene: '选品阶段的一个候选款：售价 ' + F.money(price) + '，含采购、头程、FBA、佣金、仓储、退货的总成本 ' + F.money(unit) + '，预估广告费占售价 ' + F.pct(adRate * 100, 0) + '，月销预估 ' + F.comma(units) + ' 件。',
          kv: [['售价', F.money(price)], ['全成本（不含广告）', F.money(unit)], ['广告占售价比', F.pct(adRate * 100, 0)], ['月销预估', F.comma(units) + ' 件']],
          blanks: [
            { key: 'net', label: '单件净利', hint: '售价 − 全成本 − 广告费', unit: '$', value: net },
            { key: 'netrate', label: '净利率', hint: '单件净利 ÷ 售价 × 100%', unit: '%', value: net / price * 100 },
            { key: 'month', label: '月净利', hint: '单件净利 × 月销', unit: '$', value: net * units }
          ],
          steps: [
            '广告费/件 = ' + price + ' × ' + adRate + ' = ' + F.money(price * adRate),
            '单件净利 = ' + price + ' − ' + Number(unit.toFixed(2)) + ' − ' + Number((price * adRate).toFixed(2)) + ' = ' + F.money(net),
            '净利率 = ' + F.money(net) + ' ÷ ' + price + ' = ' + F.pct(net / price * 100, 1) + '；月净利 = ' + F.money(net) + ' × ' + units + ' = ' + F.money(net * units)
          ],
          usage: '选品第一道算术题。净利率低于 10% 的款，只要广告超支几个点就归零——不是不能做，是容错空间太小。',
          caveat: '这里的月销是「预估」。做决策时要用悲观值再算一遍（月销打五折），两遍都过才算过关。'
        };
      }
    },
    {
      id: 'F59', dim: 'sourcing', layer: 'ops', title: '首批备货多久能回本',
      build: function () {
        const qty = R.int(5, 20) * 100, cost = R.int(6, 14), freight = R.int(1, 4);
        const invest = qty * (cost + freight);
        const net = R.int(4, 12), monthly = R.int(3, 9) * 100;
        const months = invest / (net * monthly);
        return {
          title: '首批备货多久能回本', dim: 'sourcing', layer: 'ops',
          scene: '首批备货 ' + F.comma(qty) + ' 件，单件采购 ' + F.money(cost) + '、头程 ' + F.money(freight) + '。单件净利约 ' + F.money(net) + '，预估月销 ' + F.comma(monthly) + ' 件。',
          kv: [['首批数量', F.comma(qty) + ' 件'], ['单件到仓成本', F.money(cost + freight)], ['单件净利', F.money(net)], ['月销预估', F.comma(monthly) + ' 件']],
          blanks: [
            { key: 'invest', label: '首批资金占用', hint: '数量 × (采购 + 头程)', unit: '$', value: invest },
            { key: 'monthprofit', label: '月净利', hint: '单件净利 × 月销', unit: '$', value: net * monthly },
            { key: 'months', label: '回本周期', hint: '资金占用 ÷ 月净利（保留 1 位小数）', unit: '个月', value: months }
          ],
          steps: [
            '首批资金占用 = ' + qty + ' × (' + cost + ' + ' + freight + ') = ' + F.money(invest),
            '月净利 = ' + net + ' × ' + monthly + ' = ' + F.money(net * monthly),
            '回本周期 = ' + F.money(invest) + ' ÷ ' + F.money(net * monthly) + ' ≈ ' + months.toFixed(1) + ' 个月'
          ],
          usage: '回本周期超过 6 个月的款，旺季一过就压成库存。面试被问「你怎么判断能不能做」，先报这个数，比说「看利润空间」具体得多。',
          caveat: '这是「卖完才回本」的口径，没算补货滚动投入。真实资金占用是滚动的，第二、三批还在往里垫钱。'
        };
      }
    },
    {
      id: 'F60', dim: 'sourcing', layer: 'ops', title: '固定投入要卖多少件才摊平',
      build: function () {
        const mold = R.int(3, 12) * 500, cert = R.int(1, 4) * 500;
        const fixed = mold + cert, net = R.int(4, 12);
        const units = Math.ceil(fixed / net);
        return {
          title: '固定投入要卖多少件才摊平', dim: 'sourcing', layer: 'ops',
          scene: '开私模花了 ' + F.money(mold) + '，认证与检测花了 ' + F.money(cert) + '。单件净利 ' + F.money(net) + '，这两笔钱要在这一款上摊完。',
          kv: [['开模费', F.money(mold)], ['认证费', F.money(cert)], ['单件净利', F.money(net)]],
          blanks: [
            { key: 'fixed', label: '固定投入合计', hint: '开模 + 认证', unit: '$', value: fixed },
            { key: 'units', label: '需要卖出的件数', hint: '固定投入 ÷ 单件净利（向上取整）', unit: '件', value: units }
          ],
          steps: [
            '固定投入 = ' + mold + ' + ' + cert + ' = ' + F.money(fixed),
            '需卖件数 = ' + F.money(fixed) + ' ÷ ' + F.money(net) + ' ≈ ' + units + ' 件',
            '按预估月销换算：这个量大约要卖几个月，超过 6 个月说明开模风险偏高'
          ],
          usage: '私模、认证、拍摄、包装设计这些一次性投入，摊不完就是纯亏。面试官听到你会算「摊平销量」，就知道你不是只会看竞品卖得好。',
          caveat: '同一私模做多个 SKU 时，固定投入要在所有 SKU 之间分摊，不能全压在第一个款上。'
        };
      }
    },
    {
      id: 'F61', dim: 'sourcing', layer: 'ops', title: '毛利率：选品的第一道闸门',
      build: function () {
        const price = R.pick(P), buy = price * (R.int(20, 30) / 100);
        const freight = R.int(2, 6), fba = R.int(4, 8), comm = price * 0.15;
        const cost = buy + freight + fba + comm, rate = (price - cost) / price * 100;
        return {
          title: '毛利率：选品的第一道闸门', dim: 'sourcing', layer: 'ops',
          scene: '候选款：售价 ' + F.money(price) + '，1688 采购价 ' + F.money(buy) + '，头程 ' + F.money(freight) + '，FBA 配送费 ' + F.money(fba) + '，佣金按 15% 计。先算毛利率，再决定要不要往下聊。',
          kv: [['售价', F.money(price)], ['采购价', F.money(buy)], ['头程', F.money(freight)], ['FBA 配送费', F.money(fba)], ['佣金率', '15%']],
          blanks: [
            { key: 'comm', label: '佣金金额', hint: '售价 × 15%', unit: '$', value: comm },
            { key: 'cost', label: '总成本（不含广告）', hint: '采购 + 头程 + FBA + 佣金', unit: '$', value: cost },
            { key: 'rate', label: '毛利率', hint: '(售价 − 总成本) ÷ 售价 × 100%', unit: '%', value: rate }
          ],
          steps: [
            '佣金 = ' + price + ' × 15% = ' + F.money(comm),
            '总成本 = ' + Number(buy.toFixed(2)) + ' + ' + freight + ' + ' + fba + ' + ' + Number(comm.toFixed(2)) + ' = ' + F.money(cost),
            '毛利率 = (' + price + ' − ' + Number(cost.toFixed(2)) + ') ÷ ' + price + ' = ' + F.pct(rate, 1)
          ],
          usage: '毛利率低于 30% 的标品，在 FBA + 广告的组合下几乎没有活路：广告吃掉 15 个点、退货吃掉 3 个点，剩下的不够覆盖任何意外。',
          caveat: '这里还没算广告、退货、仓储、提成。毛利率是及格线不是终点，真实净利要按全成本表再算一遍。'
        };
      }
    },

    {
      id: 'F62', dim: 'basic', layer: 'base', title: '标题还剩多少字符可用',
      build: function () {
        const used = R.int(60, 150), limit = 200, kw = R.int(12, 22);
        return {
          title: '标题还剩多少字符可用', dim: 'basic', layer: 'base',
          scene: '你写的标题已经占 ' + used + ' 个字符（含空格）。北美多数类目的上限是 ' + limit + ' 字符，你还想再塞 ' + kw + ' 字符的关键词。',
          kv: [['已用字符', used], ['类目上限', limit + ' 字符'], ['待加持', kw + ' 字符']],
          blanks: [
            { key: 'left', label: '剩余可用字符', hint: '上限 − 已用', unit: '个', value: limit - used },
            { key: 'after', label: '加上新词后是否超限（1 = 超限，0 = 不超）', hint: '比较 剩余 与 待加', unit: '', value: (used + kw > limit) ? 1 : 0 }
          ],
          steps: [
            '剩余 = ' + limit + ' − ' + used + ' = ' + (limit - used) + ' 个字符',
            '加上 ' + kw + ' 字符后总计 ' + (used + kw) + ' 个，' + ((used + kw > limit) ? '已超限，必须删掉等长的旧内容' : '仍在限制内'),
            '超限会被截断或直接报错，前台显示也会丢尾部卖点'
          ],
          usage: '写标题前先算字符预算：品牌 + 核心词 + 卖点 + 属性，四段分账。塞不下时优先删「看起来很美但不带流量」的形容词。',
          caveat: '部分特殊类目上限只有 75 字符，上架前务必在类目指南里确认，不要按 200 硬套。'
        };
      }
    },
    {
      id: 'F63', dim: 'basic', layer: 'base', title: '位置溢价之后的实际出价',
      build: function () {
        const bid = R.int(50, 150) / 100, tos = R.int(30, 100);
        return {
          title: '位置溢价之后的实际出价', dim: 'basic', layer: 'base',
          scene: '某手动精准活动基础出价 ' + F.money(bid) + '，你给「搜索结果顶部」加了 ' + tos + '% 溢价，其他位置不加。',
          kv: [['基础出价', F.money(bid)], ['顶部溢价', tos + '%'], ['其他位置溢价', '0%']],
          blanks: [
            { key: 'tos', label: '顶部实际出价上限', hint: '基础出价 × (1 + 溢价率)', unit: '$', value: bid * (1 + tos / 100) },
            { key: 'base', label: '其余位置出价', hint: '不加溢价就是基础出价', unit: '$', value: bid }
          ],
          steps: [
            '顶部出价 = ' + bid + ' × (1 + ' + (tos / 100).toFixed(2) + ') = ' + F.money(bid * (1 + tos / 100)),
            '其余位置 = 基础出价 ' + F.money(bid) + '（溢价只作用于指定位置）',
            '顶部 CPC 变贵，ACOS 会跟着上去——溢价前先确认 CVR 撑得住'
          ],
          usage: '新品抢首页时用溢价，但要知道它是在「加倍买同一个点击」。顶部 CVR 没比其余位置高，溢价就是纯加成本。',
          caveat: '溢价后实际成交价通常低于出价上限（平台按第二竞价结算），别拿上限当实际 CPC 去算 ACOS。'
        };
      }
    },
    {
      id: 'F64', dim: 'basic', layer: 'base', title: 'ST 后台关键词的字符预算',
      build: function () {
        const used = R.int(80, 200), limit = 250;
        const left = limit - used;
        return {
          title: 'ST 后台关键词的字符预算', dim: 'basic', layer: 'base',
          scene: '后台 Search Terms 一共 ' + limit + ' 字符上限，你已经填了 ' + used + ' 个字符（含空格）。手上还有一批长尾词要放。',
          kv: [['ST 上限', limit + ' 字符'], ['已用', used + ' 字符'], ['填写规则', '小写 · 空格分隔 · 不重复单复数']],
          blanks: [
            { key: 'left', label: '剩余字符', hint: '上限 − 已用', unit: '个', value: left },
            { key: 'words', label: '按平均 15 字符/词，还能放几个', hint: '剩余 ÷ 15（向下取整）', unit: '个', value: Math.floor(left / 15) }
          ],
          steps: [
            '剩余 = ' + limit + ' − ' + used + ' = ' + left + ' 个字符',
            '可放词数 ≈ ' + left + ' ÷ 15 ≈ ' + Math.floor(left / 15) + ' 个',
            '优先放「标题与五点没覆盖的变体词、拼写变体、西语词」，不要重复已经很靠前的核心词'
          ],
          usage: 'ST 是权重最低但成本为零的位置。它不该重复标题里的词，而该补「别人怎么搜、你没想到」的那部分。',
          caveat: 'ST 不展示给买家，但会参与匹配；塞竞品品牌词属于常见做法，塞违规功效词一样会被抓。'
        };
      }
    }
  );

  /* ============================================================
     单选 34 题（Q149–Q182）
     ============================================================ */
  DATA.MCQ.push(
    {
      id: 'Q149', dim: 'metrics', layer: 'base', type: 'single',
      stem: '主管问：「这个链接毛利率 45%，净利率只有 6%，中间那 39 个点去哪了？」你的回答应该是：',
      options: [
        { id: 'a', text: '「成本涨了，供应链那边没控制好。」', kind: 'wrong', note: '把问题推给供应链是最典型的甩锅。主管问的是「你能不能拆开算」，不是「谁的责任」。' },
        { id: 'b', text: '「我按广告、退货、仓储、提成四项拆：广告吃掉多少、退货吃掉多少，一项项对出来。」', kind: 'correct', note: '正确。毛利到净利之间的每一块都要有名字和数字，拆不出来就说明你没算过全成本。' },
        { id: 'c', text: '「毛利率和净利率口径不一样，不能直接比。」', kind: 'assistant', note: '这句话本身没错，但它是在解释「为什么不能比」，而不是回答「钱去哪了」。等于用正确的废话回避问题。' },
        { id: 'd', text: '「可能是平台扣费变多了，我去查一下账单。」', kind: 'order', note: '方向不算错，但顺序反了：先拆自己可控的四项（广告/退货/仓储/提成），再去看平台费用，否则会用「查账单」拖时间。' }
      ],
      answer: ['b'],
      summary: '毛利到净利的差额必须能逐项命名。广告、退货、仓储、提成这四项是标品最常见的水口，拆不出来就等于没做过全成本核算。'
    },
    {
      id: 'Q150', dim: 'metrics', layer: 'base', type: 'single',
      stem: '两个链接 ACOS 都是 40%，一个是新品第 3 周，一个是上架 14 个月的成熟款。关于这两个 40% 的判断，正确的是：',
      options: [
        { id: 'a', text: '两个都不健康，ACOS 40% 已经超过多数类目的毛利率', kind: 'assistant', note: '脱离毛利率和阶段谈 40% 都是空话。毛利率 55% 的产品，40% 的 ACOS 广告仍在赚钱。' },
        { id: 'b', text: '新品那个可能是健康的（买排名），成熟款那个必须查——成熟期还在 40% 说明自然流量没起来', kind: 'correct', note: '正确。同一个数字在不同阶段的含义完全相反：新品期看的是排名与自然单占比是否在长，成熟期看的是利润。' },
        { id: 'c', text: '成熟款更健康，因为它的转化率一定比新品高', kind: 'wrong', note: '转化率高不代表广告效率高。成熟款 ACOS 高通常意味着它在用广告买本该自然来的单，是最该警惕的情况。' },
        { id: 'd', text: '两个都要立刻降 bid，先把 ACOS 压下去再说', kind: 'wrong', note: '一刀降压 bid 会把新品的排名一起压掉，把成熟款的自然单也带崩。动作必须跟着阶段走。' }
      ],
      answer: ['b'],
      summary: 'ACOS 是「相对毛利率 + 阶段」才有意义的数字。面试时先问毛利率、再问阶段、最后看 TACOS 趋势，这三步走完再下结论。'
    },
    {
      id: 'Q151', dim: 'metrics', layer: 'base', type: 'single',
      stem: '某活动 CTR 0.55%（高于类目均值）、CVR 3.1%（明显偏低）、ACOS 68%。你第一步动哪里？',
      options: [
        { id: 'a', text: '降 bid，先把 CPC 压下来，ACOS 自然就降了', kind: 'wrong', note: 'CVR 3.1% 说明人点进来不买。降 bid 只是少曝光，不会让已经点进来的人更想下单，ACOS 可能不降反升。' },
        { id: 'b', text: '查详情页：价格对比、五点、评论与差评、A+ 是否有硬伤', kind: 'correct', note: '正确。CTR 正常说明流量端没问题，瓶颈在承接页。这是三通道口诀里「CVR 管详情页」的标准动作。' },
        { id: 'c', text: '再否一批词，把不精准的流量挡掉', kind: 'order', note: 'CTR 0.55% 说明词是准的（否则点都点不动）。此时否词会误杀有效流量，方向反了。' },
        { id: 'd', text: '提高预算抢首页，用更大的量把转化拉起来', kind: 'wrong', note: '承接不住还加量，等于把更多钱倒进漏水的桶。CVR 不修好之前加预算只会放大亏损。' }
      ],
      answer: ['b'],
      summary: 'CTR 正常 + CVR 低 = 详情页问题。这条判断链要在 3 秒内说出来，是运营岗和助理岗的分水岭。'
    },
    {
      id: 'Q152', dim: 'metrics', layer: 'base', type: 'single',
      stem: '同事汇报：「ACOS 用的是广告花费 ÷ 总销售额，所以我们的 ACOS 比竞品低。」你应该指出：',
      options: [
        { id: 'a', text: '没问题，用总销售额更能反映整体效率', kind: 'wrong', note: '那算出来的是 TACOS，不是 ACOS。用 TACOS 的口径冒充 ACOS，会让广告效率看起来比实际好一大截。' },
        { id: 'b', text: '分母错了：ACOS 的分母是广告销售额，总销售额那个指标叫 TACOS', kind: 'correct', note: '正确。这是被问得最多、也最容易当场翻车的口径错误，必须能立刻纠正并说清两者区别。' },
        { id: 'c', text: '两个都能叫 ACOS，看公司习惯', kind: 'wrong', note: '口径不能「看习惯」。汇报口径不统一，跨人跨月的对比全部失效。' },
        { id: 'd', text: '只要分子对，分母用哪个都行', kind: 'assistant', note: '分母换了，指标的经济含义就变了。分子分母必须成对使用。' }
      ],
      answer: ['b'],
      summary: 'ACOS 分母 = 广告销售额；TACOS 分母 = 总销售额（广告单 + 自然单）。说错一次，后面所有分析都会被质疑。'
    },
    {
      id: 'Q153', dim: 'metrics', layer: 'base', type: 'single',
      stem: '老板说「我要 ROAS 做到 4 以上」，换算成 ACOS 是多少，这句话对他的利润意味着什么？',
      options: [
        { id: 'a', text: 'ACOS 25%；只要毛利率高于 25%，广告就是赚的', kind: 'correct', note: '正确。ROAS 4 → ACOS 1/4 = 25%。是否真赚钱，取决于毛利率有没有超过 25%。' },
        { id: 'b', text: 'ACOS 400%；这个要求明显不现实', kind: 'wrong', note: '把倒数关系算反了。ROAS 4 是「花 1 块换回 4 块」，对应 ACOS 25%。' },
        { id: 'c', text: 'ACOS 40%；毛利率要 40% 才不亏', kind: 'wrong', note: '把 4 当成 40% 了。ROAS 与 ACOS 是倒数量级关系，不是简单乘以 10。' },
        { id: 'd', text: '两者没法换算，ROAS 看收入、ACOS 看成本', kind: 'wrong', note: '两者是同一组数据的两个视角，互为倒数，可以精确换算。' }
      ],
      answer: ['a'],
      summary: 'ROAS = 1 ÷ ACOS。老板说 ROAS 4，等于说 ACOS 25%——这时第一反应应该是「我们的毛利率过了 25% 吗」。'
    },
    {
      id: 'Q154', dim: 'metrics', layer: 'base', type: 'single',
      stem: '售价从 $29.99 上调到 $34.99，广告花费与点击完全没变，订单量也没变。ACOS 会怎么变？',
      options: [
        { id: 'a', text: 'ACOS 不变，因为花费和订单都没变', kind: 'wrong', note: 'ACOS 的分子是花费、分母是广告销售额。订单没变但客单价涨了，分母变大，ACOS 一定下降。' },
        { id: 'b', text: 'ACOS 下降约 14%，因为广告销售额随客单价一起涨了', kind: 'correct', note: '正确。分母从 29.99 涨到 34.99（+16.7%），分子不变，ACOS 约降到原来的 85.7%。' },
        { id: 'c', text: 'ACOS 上升，因为涨价会拉低转化率', kind: 'assistant', note: '涨价通常会拉低 CVR，但题干明确说订单量没变。按给定条件推，ACOS 是下降的。' },
        { id: 'd', text: '无法判断，需要看 TACOS', kind: 'wrong', note: '条件已经足够：分子固定、分母随客单价上升，方向是确定的。' }
      ],
      answer: ['b'],
      summary: 'ACOS 对客单价敏感：同样的广告效率，涨价会「自动」改善 ACOS。但要警惕涨价后 CVR 掉得更多，净效果需要重算。'
    },
    {
      id: 'Q155', dim: 'metrics', layer: 'base', type: 'single',
      stem: '一款产品退货率 18%，广告报表上 ACOS 是 22%。有人据此说「广告是赚的」。这个结论的问题在哪？',
      options: [
        { id: 'a', text: '没问题，ACOS 22% 低于毛利率就说明广告赚钱', kind: 'wrong', note: 'ACOS 的分母是成交时的广告销售额，退货后这部分销售额实际没留下，等于分母虚高、ACOS 被低估。' },
        { id: 'b', text: '退货会同时吃掉销售额与利润，必须把退货率还原进分母再看 ACOS', kind: 'correct', note: '正确。18% 的退货意味着约 18% 的「广告销售额」是空的，真实 ACOS 大致要按 22% ÷ 0.82 修正。' },
        { id: 'c', text: '退货算平台费用，跟广告无关', kind: 'wrong', note: '退货的运费、折损、二次销售折价都进你的成本，而且直接冲掉广告带来的那部分收入。' },
        { id: 'd', text: '提高售价把退货成本覆盖掉就行', kind: 'order', note: '方向可能有效，但没回答「结论错在哪」。先修正口径，再谈动作。' }
      ],
      answer: ['b'],
      summary: '退货率高的类目，广告报表的 ACOS 天然偏乐观。判断广告是否赚钱，要用「退货后的真实销售额」当分母。'
    },
    {
      id: 'Q156', dim: 'metrics', layer: 'base', type: 'single',
      stem: '近两周 CPC 从 $0.62 涨到 $0.78，但 ACOS 反而从 34% 降到 29%。最可能的解释是：',
      options: [
        { id: 'a', text: '数据出错了，CPC 涨 ACOS 不可能降', kind: 'wrong', note: 'ACOS = CPC ÷ (客单价 × CVR)。CPC 涨了但 CVR 涨得更多时，ACOS 会下降——完全可能。' },
        { id: 'b', text: 'CVR 提升的幅度超过了 CPC 上涨的幅度，或者客单价提高了', kind: 'correct', note: '正确。ACOS = CPC ÷ (客单价 × CVR)，分母涨得比分子快，ACOS 就降。这是拆解 ACOS 变化的标准思路。' },
        { id: 'c', text: '说明预算给少了，曝光不足导致数据波动', kind: 'assistant', note: '听起来像解释，但没回答「为什么 ACOS 降」。预算变化不会自动让 ACOS 降。' },
        { id: 'd', text: '应该立刻降 bid，把 CPC 压回 $0.62', kind: 'wrong', note: 'ACOS 已经在降，此时降 bid 可能把正在起效的转化一起掐掉。先归因，再决定动不动。' }
      ],
      answer: ['b'],
      summary: 'ACOS = CPC ÷ (客单价 × CVR)。任何 ACOS 变动都能被拆成这三个因子，拆不开就说明你还没看懂这个指标。'
    },
    {
      id: 'Q157', dim: 'metrics', layer: 'base', type: 'single',
      stem: 'ACOS 从 26% 涨到 33%，TACOS 却从 14% 降到 11%。这个组合说明：',
      options: [
        { id: 'a', text: '广告效率在恶化，必须马上降 bid', kind: 'assistant', note: '只看了 ACOS 一半信息。TACOS 在降说明整店对广告的依赖在下降，这时候压广告可能压掉增长。' },
        { id: 'b', text: '自然单增长很快，广告单占比在下降——是健康信号，先别动', kind: 'correct', note: '正确。TACOS 降 + ACOS 升，典型是自然单大涨把总盘子撑大，广告的相对权重变小。' },
        { id: 'c', text: '两个指标矛盾，说明数据有问题', kind: 'wrong', note: '不矛盾。ACOS 只看广告单，TACOS 看整店，两者完全可以反向走。' },
        { id: 'd', text: 'TACOS 才是唯一要看的指标，ACOS 可以忽略', kind: 'wrong', note: 'TACOS 看全局、ACOS 看广告自身效率，两者必须一起看。只看一个都会误判。' }
      ],
      answer: ['b'],
      summary: 'ACOS 与 TACOS 反向走，是「自然流量起来」的典型特征。判断顺序：先看 TACOS 趋势，再回头看 ACOS 是否需要修。'
    },
    {
      id: 'Q158', dim: 'metrics', layer: 'base', type: 'single',
      stem: '某活动曝光从 5 万涨到 12 万，点击量几乎没变，ACOS 恶化 6 个点。最可能发生的事是：',
      options: [
        { id: 'a', text: 'CTR 被稀释了，说明新拿到的曝光位置不精准', kind: 'correct', note: '正确。曝光翻倍而点击不变，CTR 直接腰斩——多出来的曝光来自相关性更差的位置或更泛的匹配。' },
        { id: 'b', text: '转化率下降了，需要改详情页', kind: 'wrong', note: '点击都没变，CVR 的分母没变；问题在「曝光质量」这一层，还没轮到详情页。' },
        { id: 'c', text: 'CPC 涨了，应该降 bid', kind: 'assistant', note: 'ACOS 恶化可能来自 CPC，但题干的核心异常是「曝光暴涨、点击不动」，先解释这个。' },
        { id: 'd', text: '预算给多了，应该砍预算', kind: 'wrong', note: '砍预算只是减少曝光，不会让多出来的曝光变精准。动作要针对「位置/匹配变泛」。' }
      ],
      answer: ['a'],
      summary: '曝光暴涨、点击不动 = CTR 被稀释。先查是否开了更泛的匹配、加了低价流量位，再决定是收匹配还是否词。'
    },

    {
      id: 'Q159', dim: 'funnel', layer: 'ops', type: 'single',
      stem: '一个链接的四个数字：曝光 40 万、CTR 0.45%、加购率（加购/点击）12%、CVR 6%。漏斗里最该先修的一层是：',
      options: [
        { id: 'a', text: '曝光层：40 万还不够，继续加预算', kind: 'wrong', note: 'CTR 0.45% 在健康区间，说明流量质量没问题。曝光不是瓶颈，加预算只会等比放大下游的漏损。' },
        { id: 'b', text: '点击→加购层：12% 的加购率明显偏低，详情页前三屏没接住人', kind: 'correct', note: '正确。加购率是详情页说服力的直接体现，12% 偏低而 CVR 6% 正常，说明流失发生在「心动」这一步。' },
        { id: 'c', text: '加购→下单层：CVR 6% 偏低，去降价', kind: 'assistant', note: '6% 在 3C 配件的正常区间。真正的异常是加购率，先修上游。' },
        { id: 'd', text: '全都偏低，一起改', kind: 'wrong', note: '同时改四个变量，改完不知道是哪个起的作用。漏斗排查必须一次只动一层。' }
      ],
      answer: ['b'],
      summary: '漏斗排查的原则：找到第一个明显低于参考值的层，只修那一层。同时动多处 = 永远做不出归因。'
    },
    {
      id: 'Q160', dim: 'funnel', layer: 'ops', type: 'single',
      stem: '加购转化率 8%，同类目均值 35%。点击与 CVR 都正常。最可能的原因组合是：',
      options: [
        { id: 'a', text: '关键词不精准，进店的人不是目标客群', kind: 'wrong', note: '关键词不精准会先体现在 CTR 和 CVR 上，而不是只卡在加购→下单这一步。' },
        { id: 'b', text: '运费太高、到货太慢、或结算页有额外费用', kind: 'correct', note: '正确。人都加购了，说明产品与价格初步可接受；最后放弃基本都发生在运费、时效、税费、库存这些结算环节。' },
        { id: 'c', text: '主图不够吸引人', kind: 'wrong', note: '主图影响的是点击，不是加购后的结算意愿。层级对不上。' },
        { id: 'd', text: '广告出价太低导致曝光不足', kind: 'wrong', note: '曝光不足不会造成「加购高、下单低」的结构性缺口。' }
      ],
      answer: ['b'],
      summary: '加购→下单是「最后一步犹豫」。查运费设置、Delivery 时效、Coupon 是否生效、库存显示，别去改文案。'
    },
    {
      id: 'Q161', dim: 'funnel', layer: 'ops', type: 'single',
      stem: '关于广告在漏斗里的作用边界，正确的说法是：',
      options: [
        { id: 'a', text: '广告能同时改善曝光、点击、转化三个环节', kind: 'wrong', note: '广告能买曝光和点击，但买不到转化。CVR 由详情页、价格、评论决定，加预算改变不了。' },
        { id: 'b', text: '广告主要影响曝光与点击；CVR 属于承接层，要靠 Listing 修', kind: 'correct', note: '正确。这是「广告解决流量、Listing 解决转化」的分工，也是判断「该不该加预算」的前提。' },
        { id: 'c', text: '广告能提升 CVR，因为广告流量更精准', kind: 'assistant', note: '精准关键词确实可能带来更高的 CVR，但那是「选词」的功劳，不是「加预算」的功劳。' },
        { id: 'd', text: '广告只影响曝光，点击率由主图决定，与广告无关', kind: 'wrong', note: '广告的位置与匹配方式直接影响 CTR：同一张主图在首页顶部和详情页的点击率差别很大。' }
      ],
      answer: ['b'],
      summary: '广告管「有没有人看见、愿不愿意点」，Listing 管「点进来买不买」。CVR 上不去时加预算是把钱倒进漏桶。'
    },
    {
      id: 'Q162', dim: 'funnel', layer: 'ops', type: 'single',
      stem: '自然单占比连续三个月从 45% 掉到 28%，广告花费没变、总销量没跌。你的判断是：',
      options: [
        { id: 'a', text: '正常波动，总销量没跌就行', kind: 'wrong', note: '总量没跌但结构在恶化：你正在用同样的钱买越来越多的单，自然排名在退。' },
        { id: 'b', text: '自然排名在退，广告在替自然流量买单——要查关键词排名与转化是否被竞品抢走', kind: 'correct', note: '正确。自然单占比持续下滑是「广告依赖加深」的早期信号，TACOS 迟早会跟着涨。' },
        { id: 'c', text: '说明广告效果变好了，应该加预算', kind: 'wrong', note: '广告单占比上升不是广告变好，是自然单变少。加预算只会加深依赖。' },
        { id: 'd', text: '应该立刻关掉部分广告，逼自然单回来', kind: 'wrong', note: '直接关广告会连排名一起关掉。正确做法是先查排名与竞品动作，再有节奏地收。' }
      ],
      answer: ['b'],
      summary: '自然单占比是最诚实的健康指标之一。它连续下滑时，先查核心词排名、竞品价格与评论，再谈广告结构调整。'
    },
    {
      id: 'Q163', dim: 'funnel', layer: 'ops', type: 'single',
      stem: '秒杀当天流量翻了 4 倍，CTR 提升，但 CVR 从 9% 掉到 4%，ACOS 反而变差。合理的解释是：',
      options: [
        { id: 'a', text: '秒杀流量本来就不精准，属于正常现象，不用管', kind: 'assistant', note: '「正常现象」是个结论，不是分析。秒杀流量的构成与平时不同，但掉一半 CVR 需要具体归因。' },
        { id: 'b', text: '秒杀吸引的是「逛折扣」的人群，比价与凑单比例高；同时折扣压低客单价，广告销售额没同步涨', kind: 'correct', note: '正确。折扣人群的购买意图与平时不同，且秒杀价直接压低分母，ACOS 会被动恶化。' },
        { id: 'c', text: '说明秒杀报亏了，以后不要报', kind: 'wrong', note: '秒杀的价值在排名与评论积累，不能只用当天 ACOS 衡量。用一天的数据否定整个工具是短视。' },
        { id: 'd', text: '应该把秒杀期间的广告全部关掉', kind: 'wrong', note: '秒杀期关广告会丢掉排名加权。正确做法是控制预算与出价，而不是一刀关掉。' }
      ],
      answer: ['b'],
      summary: '大促/秒杀期的漏斗会整体变形：流量结构变、客单价变、CVR 变。用平日基准去要求大促当天，结论一定错。'
    },
    {
      id: 'Q164', dim: 'funnel', layer: 'ops', type: 'single',
      stem: '新品上架第 1 周，四个指标：曝光偏低、CTR 正常、CVR 偏低、评论 0 条。最合理的动作顺序是：',
      options: [
        { id: 'a', text: '先解决曝光（加词、提高 bid），同时用 Vine 攒评论', kind: 'correct', note: '正确。新品期曝光与评论是最前的两个瓶颈：没有曝光就没有数据，没有评论 CVR 天然低。两件事可以并行。' },
        { id: 'b', text: '先降价冲 CVR，等转化好了再加预算', kind: 'order', note: '0 评论时降价对 CVR 的提升有限，还会把价格锚点打坏。顺序应该是先有评论再谈价格弹性。' },
        { id: 'c', text: '先改主图，因为 CTR 决定一切', kind: 'wrong', note: 'CTR 已经正常，改主图没有依据。把资源投在正常的指标上是浪费。' },
        { id: 'd', text: '先等两周，让数据自然稳定再动', kind: 'wrong', note: '新品期最贵的就是时间。等两周等于把冷启动窗口让给竞品。' }
      ],
      answer: ['a'],
      summary: '新品冷启动的顺序：曝光（能被人看见）→ 评论（敢不敢买）→ 转化 → 排名。跳过前两步直接谈 ACOS，全是空谈。'
    },
    {
      id: 'Q165', dim: 'funnel', layer: 'ops', type: 'single',
      stem: '某产品复购率只有 3%，同类目均值 12%。作为运营，你最先看的是：',
      options: [
        { id: 'a', text: '广告 ACOS 是不是太高', kind: 'wrong', note: '复购率低与广告效率没有直接关系。这是产品与体验层的指标。' },
        { id: 'b', text: '退货原因与差评内容：是不是产品本身有问题，或者耗材/配件不通用', kind: 'correct', note: '正确。复购率低几乎只有三种原因：产品不耐用/不好用、耗材不通用、没有复购场景。前两种都能从退货原因和差评里读到。' },
        { id: 'c', text: '主图是不是不够吸引', kind: 'wrong', note: '主图影响首购点击，与复购无关。' },
        { id: 'd', text: '要不要加大站外投放拉新', kind: 'wrong', note: '复购差还去拉新，等于用更高的成本填同一个漏桶。' }
      ],
      answer: ['b'],
      summary: '复购率是产品力的滞后指标。做运营的职责不是「把复购率做上去」，而是把退货原因和差评里的产品问题翻译给供应链。'
    },

    {
      id: 'Q166', dim: 'sourcing', layer: 'ops', type: 'single',
      stem: '选品时看到一款产品：头部 3 个竞品月销 2000+，但评论数都在 8000 条以上。你的判断是：',
      options: [
        { id: 'a', text: '市场够大，直接入场打价格战', kind: 'wrong', note: '8000 条评论是靠时间堆出来的护城河。新链接用价格战打不动评论壁垒，只会把自己打成亏损。' },
        { id: 'b', text: '需求真实但竞争壁垒高，要找这个类目下的细分长尾（材质/场景/人群）切入', kind: 'correct', note: '正确。头部验证了需求，评论数验证了壁垒。运营岗的价值在于找到「需求还在、竞争还没堆满」的细分切口。' },
        { id: 'c', text: '评论多是刷的，不用怕', kind: 'wrong', note: '无论是刷的还是真实的，前台显示的评论数就是消费者看到的信任凭证。你的判断不能建立在「假设对手违规」上。' },
        { id: 'd', text: '换个类目，这个不能做', kind: 'assistant', note: '结论下得太快。大市场里的细分切口往往比小市场更好做，直接放弃会错过机会。' }
      ],
      answer: ['b'],
      summary: '选品判断要拆成两个问题：需求真不真（看头部销量）、壁垒高不高（看评论数与品牌集中度）。两个答案组合起来才决定进不进。'
    },
    {
      id: 'Q167', dim: 'sourcing', layer: 'ops', type: 'single',
      stem: '一款候选品：客单价 $19.99，1688 采购价 ¥25，重量 800g。算下来毛利率 22%。你的建议是：',
      options: [
        { id: 'a', text: '可以做，22% 的毛利靠走量也能赚钱', kind: 'wrong', note: '低客单 + 重货的组合，FBA 配送费占比高、广告费占比更高。22% 毛利在扣掉广告和退货后基本归零。' },
        { id: 'b', text: '不做，除非能提客单价（套装/加配件）或换更轻的规格把毛利拉到 35% 以上', kind: 'correct', note: '正确。低客单重货的死穴是「固定费用占比过高」，解法只有提客单价或降重量，而不是硬扛。' },
        { id: 'c', text: '可以做，先低价冲排名再慢慢涨价', kind: 'wrong', note: '毛利只有 22% 时低价冲量是纯亏现金流。没有毛利空间就没有涨价腾挪余地。' },
        { id: 'd', text: '先做，等销量起来再跟供应商压价', kind: 'assistant', note: '压价空间通常只有几个点，救不了 22% 的结构性问题。而且起量前的现金流压力全在你这边。' }
      ],
      answer: ['b'],
      summary: '低客单重货的数学模型很残酷：配送费与广告费是「固定值」，占售价比例随客单价下降而上升。要么提客单价，要么换品。'
    },
    {
      id: 'Q168', dim: 'sourcing', layer: 'ops', type: 'single',
      stem: '一款圣诞主题产品，工厂交期 30 天、海运 35 天、上架后动销期只有 6 周。你该在什么时候下单？',
      options: [
        { id: 'a', text: '10 月下单，赶在 11 月上架就行', kind: 'wrong', note: '10 月下单 + 65 天到仓 = 12 月中，圣诞已过半，动销期被压到两周，剩余库存只能压到明年。' },
        { id: 'b', text: '最迟 8 月中下单：30 天生产 + 35 天海运 + 入仓缓冲，9 月底到仓，留足 8 周动销窗口', kind: 'correct', note: '正确。季节性品的核心是「倒推上架日」：从销售窗口起点往前减生产、海运、入仓、清关，再留缓冲。' },
        { id: 'c', text: '越早越好，6 月就下单备货', kind: 'assistant', note: '方向没错但压资金：太早到仓会产生长期仓储费，且款式可能过时。按窗口倒推比「越早越好」精确。' },
        { id: 'd', text: '用空运补，什么时候下单都能赶上', kind: 'wrong', note: '空运会吃掉季节性品本就薄的毛利，只能作为「补货救命」，不能当主运输方式。' }
      ],
      answer: ['b'],
      summary: '季节性品用「倒推法」：销售窗口起点 − 入仓缓冲 − 海运 − 生产 = 最迟下单日。错过这个日子，宁可不做。'
    },
    {
      id: 'Q169', dim: 'sourcing', layer: 'ops', type: 'single',
      stem: '两个候选品：A 客单价 $45、月销 200、净利率 8%；B 客单价 $15、月销 1500、净利率 5%。资金只够做一个，你选：',
      options: [
        { id: 'a', text: 'A：净利率高，抗风险能力强', kind: 'assistant', note: '净利率高不等于赚钱多。A 的月利润约 $720，B 约 $1125，且 B 的周转更快。' },
        { id: 'b', text: 'B：月利润更高、周转更快，虽然净利率薄但资金效率更好', kind: 'correct', note: '正确。选品不只看净利率，要看「资金周转次数 × 净利率」——这才是同样的钱一年能赚几轮。' },
        { id: 'c', text: '都不选，两个净利率都太低', kind: 'wrong', note: '8% 与 5% 在新类目里很常见。用「净利率低于 10% 就不做」一刀切，会把大部分可做的款筛掉。' },
        { id: 'd', text: '看哪个类目竞争小就选哪个', kind: 'assistant', note: '竞争度是重要维度，但题干已经给了利润与周转数据，先用手上的数算清楚。' }
      ],
      answer: ['b'],
      summary: '重资产生意的核心公式是「资金周转次数 × 净利率」。月销 1500 的款一年能滚好几轮，薄利多销在跨境里经常赢过高毛利慢周转。'
    },
    {
      id: 'Q170', dim: 'sourcing', layer: 'ops', type: 'single',
      stem: '一个候选款的外观与某知名品牌高度相似，但供应商说「没有专利，大家都在卖」。你的处理是：',
      options: [
        { id: 'a', text: '供应商说没专利就没事，直接上', kind: 'wrong', note: '供应商的「没专利」通常指「他没查过」。外观专利与商标是两套体系，且美国外观专利从申请到公开有时间差。' },
        { id: 'b', text: '先查目标站点的外观专利与商标，并评估改款成本；查不到结论就不上', kind: 'correct', note: '正确。侵权是账号级的风险，一旦被投诉，链接下架、资金冻结，前期投入全打水漂。' },
        { id: 'c', text: '先上架试水，被投诉再下架换款', kind: 'wrong', note: '侵权投诉会计入账号记录，多次之后是直接封店。「先上再说」是把账号当筹码。' },
        { id: 'd', text: '把主图改一下，避开和竞品一样的角度就行', kind: 'wrong', note: '改图不改变产品本身的外观，专利保护的是产品设计而不是图片。' }
      ],
      answer: ['b'],
      summary: '选品阶段的侵权排查是不可跳过的一步：外观专利、商标、版权（图案）三条线都要过。查不到确定结论时，宁可不做。'
    },
    {
      id: 'Q171', dim: 'sourcing', layer: 'ops', type: 'single',
      stem: '工厂起订量 3000 件，你只想先试 500 件。最有效的谈判切入点是：',
      options: [
        { id: 'a', text: '直接要求降到 500，不降就换厂', kind: 'wrong', note: '硬压起订量通常换来「涨价或换料」。没有给对方台阶的谈判，最后吃亏的是品质。' },
        { id: 'b', text: '接受更高单价换低起订量，或用「现有公模 + 贴牌」降低对方开机成本', kind: 'correct', note: '正确。起订量的本质是「开机与换线成本」，用单价补偿或复用公模，是双方都能接受的结构。' },
        { id: 'c', text: '先答应 3000 件，到时候只提 500', kind: 'wrong', note: '违约会直接断供，且行业圈子小，后续找厂会被标记。' },
        { id: 'd', text: '找贸易商拿货，反正他们愿意小批量', kind: 'assistant', note: '贸易商可以小批量，但加价 15%–30%，且改款、品控沟通都隔了一层。适合测款，不适合长期。' }
      ],
      answer: ['b'],
      summary: '小批量试款是运营的合理诉求，但要理解工厂的成本结构：用单价或公模换低起订量，比硬砍数量有效得多。'
    },
    {
      id: 'Q172', dim: 'sourcing', layer: 'ops', type: 'single',
      stem: '分析竞品 300 条差评后，发现 40% 集中在「盖子漏水」。这个信息最有价值的用法是：',
      options: [
        { id: 'a', text: '写进五点，强调「我们的盖子不漏水」', kind: 'assistant', note: '方向对但太笼统。「不漏水」是所有人都说的话，客户不会信。' },
        { id: 'b', text: '把它变成可验证的差异化：结构怎么改、怎么测、给出具体承诺（如双层硅胶圈 + 倒置 24 小时测试）', kind: 'correct', note: '正确。差评挖掘的价值在于找到「对手的确定性缺陷」，然后用结构、测试、承诺把它变成可感知的差异。' },
        { id: 'c', text: '在广告里投「漏水」相关的词', kind: 'wrong', note: '投「漏水」类词会吸引大量已经在别家踩坑、但对品类整体不信任的流量，转化通常很差。' },
        { id: 'd', text: '直接找工厂说「做一个不漏水的」', kind: 'wrong', note: '需求描述太模糊，工厂只会给你现有方案。差异化的语言必须是结构语言与测试标准。' }
      ],
      answer: ['b'],
      summary: '差评是免费的产品需求文档。但「对手哪里差」不等于「你的卖点」——中间要经过「结构怎么改 + 怎么验证」这一步。'
    },
    {
      id: 'Q173', dim: 'sourcing', layer: 'ops', type: 'single',
      stem: '同类目里，$19.99 价格带月销 5000，$29.99 价格带月销 800，$39.99 价格带月销 200。你的成本结构只支持 $29.99 以上，应该：',
      options: [
        { id: 'a', text: '咬牙降到 $19.99，先抢量再说', kind: 'wrong', note: '成本撑不住的价格带，卖得越多亏得越多。低价带是规模游戏，不是新玩家该进的战场。' },
        { id: 'b', text: '留在 $29.99 带，用差异化（材质/套装/场景）把「为什么贵 10 块」讲清楚', kind: 'correct', note: '正确。价格带由成本结构决定，你只能在自己的带里做「值这个价」的证明，而不是跨带打价格战。' },
        { id: 'c', text: '定 $39.99，毛利更高更安全', kind: 'wrong', note: '$39.99 带月销只有 200，且需要更强的品牌与评论支撑。定价不是越高越安全。' },
        { id: 'd', text: '定 $24.99，卡在中间最稳妥', kind: 'assistant', note: '中间价常常两头不靠：低价带客户嫌贵，高价带客户嫌不够好。定价要有明确的对标。' }
      ],
      answer: ['b'],
      summary: '价格带是「成本结构 + 竞争格局」共同决定的。跨带打价格战，等于用自己最薄的地方去撞对手最厚的地方。'
    },
    {
      id: 'Q174', dim: 'sourcing', layer: 'ops', type: 'single',
      stem: '用工具估算某竞品月销 1200 单，但它的 BSR 波动很大（月初 3000 名、月末 12000 名）。这个数据怎么用？',
      options: [
        { id: 'a', text: '取平均值 7500 名，按这个估月销', kind: 'wrong', note: 'BSR 与销量是非线性关系，取排名平均没有数学意义。' },
        { id: 'b', text: '说明它有明显的促销/秒杀脉冲，估月销要按「脉冲期 + 平日」分段算，不能当稳定需求', kind: 'correct', note: '正确。BSR 大幅波动通常来自秒杀、站外、Coupon，这类销量不代表自然需求基数。' },
        { id: 'c', text: 'BSR 波动大说明工具数据不准，不用参考', kind: 'assistant', note: '工具估算有误差是真的，但波动本身是有效信息——它告诉你这个竞品的销量结构。' },
        { id: 'd', text: '说明这个类目需求不稳定，不要进', kind: 'wrong', note: '结论过重。脉冲式销量可能是运营手段造成的，不代表类目需求不稳。' }
      ],
      answer: ['b'],
      summary: '看竞品销量要区分「自然基线」与「脉冲峰值」。BSR 剧烈波动 = 靠促销拉动，这类数据不能直接当市场容量。'
    },
    {
      id: 'Q175', dim: 'sourcing', layer: 'ops', type: 'single',
      stem: '供应商给了两个「差异化」方案：① 换个颜色做独家色；② 把杯盖硅胶圈从单层改双层并做倒置测试。哪个更值得投入？',
      options: [
        { id: 'a', text: '① 独家色，视觉差异最直观，转化提升快', kind: 'wrong', note: '换色门槛极低，两周内就会被跟。它带来的是短期视觉新鲜感，不是壁垒。' },
        { id: 'b', text: '② 结构改进，因为它解决了差评里的确定性问题，可以做验证、可以讲证据', kind: 'correct', note: '正确。真差异化要满足两条：解决真实痛点、可被验证。结构改进两条都满足，换色两条都不满足。' },
        { id: 'c', text: '两个都做，差异越多越好', kind: 'assistant', note: '资源有限时，把两个半成品差异堆在一起，反而讲不清主卖点。' },
        { id: 'd', text: '都不做，靠广告和价格取胜', kind: 'wrong', note: '没有产品差异的标品，最后只能打价格战，而价格战你打不过有供应链优势的对手。' }
      ],
      answer: ['b'],
      summary: '真假差异化的判据：是否解决真实痛点（差评里有证据）、是否可验证（能测、能拍、能承诺）。换色换包装属于「装饰」，不叫差异化。'
    },
    {
      id: 'Q176', dim: 'sourcing', layer: 'ops', type: 'single',
      stem: '选品时发现一款带锂电池的便携产品，需求很好、毛利可观。你最先确认的是：',
      options: [
        { id: 'a', text: '先算利润，认证的事上架前再说', kind: 'wrong', note: '带电池产品的认证与运输限制是「能不能卖」的前置条件，不是上架前的收尾工作。' },
        { id: 'b', text: '电池运输与产品认证要求（UN38.3、MSDS、目标市场的电池法规），确认能不能合规入仓', kind: 'correct', note: '正确。锂电池涉及运输、仓储、产品安全三套规则，任何一环不通，货都到不了仓。' },
        { id: 'c', text: '先看竞品有没有做，有就说明能卖', kind: 'assistant', note: '竞品能卖不代表你能卖：他们可能已有认证、或走了特殊渠道，照抄会卡在入仓环节。' },
        { id: 'd', text: '把电池拆出来单独发，主机走普货', kind: 'wrong', note: '拆发会改变产品形态，且电池单独运输同样受管制；这不是规避，是转移风险。' }
      ],
      answer: ['b'],
      summary: '带电池、带磁、液体、接触食品、儿童用品这几类，先确认合规门槛再谈利润。选品的第一问永远是「能不能合法卖出去」。'
    },

    {
      id: 'Q177', dim: 'compliance', layer: 'ops', type: 'single',
      stem: '账户状况页同时告警：ODR 1.3%、迟发率 5.2%、有效追踪率 92%、取消率 3.1%。你的处理顺序是：',
      options: [
        { id: 'a', text: '先写申诉信，把四项一起解释清楚', kind: 'wrong', note: '四项同时越线时，申诉信是最没用的第一步——你还没有「已改善」的证据，写了也会被驳回。' },
        { id: 'b', text: '先定位根因（缺货？物流商？处理时效？），止血后再写申诉，附上改善证据', kind: 'correct', note: '正确。ODR 与迟发/追踪/取消往往是同一个根因（缺货或物流崩了）的四个表现，先修根因。' },
        { id: 'c', text: '先暂停所有广告，减少订单量把比率压下来', kind: 'wrong', note: '停广告只是减少分母，已经发生的缺陷单还在窗口里。而且停广告会同时打掉排名。' },
        { id: 'd', text: '找服务商处理，他们有内部渠道', kind: 'wrong', note: '声称有内部渠道的服务商绝大多数是骗子，且「走关系」本身就是违规操作，会把问题升级为封店。' }
      ],
      answer: ['b'],
      summary: '绩效告警的处理顺序：定位根因 → 止血（补货/换物流/改处理时效）→ 观察窗口数据回落 → 再申诉。没有改善证据的申诉等于自曝其短。'
    },
    {
      id: 'Q178', dim: 'compliance', layer: 'ops', type: 'single',
      stem: '收到外观专利侵权投诉，链接被下架。你的第一反应应该是：',
      options: [
        { id: 'a', text: '立刻重新上一条一模一样的链接，把销量接回来', kind: 'wrong', note: '重复上架侵权产品是最危险的动作：第二次投诉往往直接冻结资金、限制销售权限。' },
        { id: 'b', text: '先看投诉方与专利号，评估是否真的落入保护范围；能改款就改款，不能改就放弃该款', kind: 'correct', note: '正确。专利投诉先做技术比对（权利要求/外观设计要点），再决定是申诉、改款还是弃款。' },
        { id: 'c', text: '找服务商花钱「内部撤诉」', kind: 'wrong', note: '所谓内部撤诉几乎都是骗局，且资金往来会留下把柄。' },
        { id: 'd', text: '在申诉里强调「我不知道有这个专利」', kind: 'wrong', note: '不知情不是免责理由。侵权判定看产品是否落入保护范围，与主观是否知情无关。' }
      ],
      answer: ['b'],
      summary: '侵权投诉的正确姿势：看专利号与保护范围 → 做比对 → 改款或弃款 → 必要时申诉。重复上架、花钱撤诉都是把小事做成封店。'
    },
    {
      id: 'Q179', dim: 'compliance', layer: 'ops', type: 'single',
      stem: '公司要用同一套资料开第二个店铺，让你「顺手一起管」。你的回应应该是：',
      options: [
        { id: 'a', text: '可以，反正两个店铺卖的品类不一样', kind: 'wrong', note: '关联判定看的是资料、网络、收款、设备等硬指标，与品类无关。品类不同反而更容易被交叉识别。' },
        { id: 'b', text: '必须先做隔离：独立主体资料、独立网络与设备、独立收款账户；没隔离我不接手', kind: 'correct', note: '正确。关联本身不是立刻封店，但一旦其中一个店铺违规，另一个会被连带，属于长期隐患。' },
        { id: 'c', text: '用同一个浏览器开两个账号，注意别同时登录就行', kind: 'wrong', note: '浏览器指纹、Cookie、IP 都会留痕，「不同时登录」挡不住关联识别。' },
        { id: 'd', text: '只要不卖同一个 ASIN 就不会关联', kind: 'wrong', note: '商品重叠只是关联信号之一，不是唯一判据。资料与网络才是主要依据。' }
      ],
      answer: ['b'],
      summary: '多店铺的第一原则是「物理隔离」：主体、网络、设备、收款四条线都要独立。运营可以配合，但不能替公司承担违规操作的风险。'
    },
    {
      id: 'Q180', dim: 'compliance', layer: 'ops', type: 'single',
      stem: '新品评论太少，主管暗示「可以找服务商做点评价」。你的回答应该是：',
      options: [
        { id: 'a', text: '少量做一点没关系，行业都这样', kind: 'wrong', note: '操纵评论是平台零容忍项。抓到一次轻则清评、重则封店，且会连带历史评论一起被清洗。' },
        { id: 'b', text: '明确拒绝，并给出合规替代方案：Vine、站内催评、产品体验优化、老客复购引导', kind: 'correct', note: '正确。拒绝要有替代方案，否则只是表态。Vine 是官方免费/低价获取早期评论的通道。' },
        { id: 'c', text: '不主动做，但也不阻止别人做', kind: 'assistant', note: '作为运营，你经手的就是这条链接。知情不阻在合规审查里同样是责任。' },
        { id: 'd', text: '可以做，但要求服务商用真人号、控制节奏', kind: 'wrong', note: '「真人号 + 慢节奏」只是降低被算法抓到的概率，性质没有变。平台查的是行为模式，不是账号真假。' }
      ],
      answer: ['b'],
      summary: '评论合规是底线问题，没有「少量可以」的空间。正确的做法是给出替代路径：Vine、Request a Review、产品与包装体验。'
    },
    {
      id: 'Q181', dim: 'compliance', layer: 'ops', type: 'single',
      stem: '为了快速起量，有人建议把新品挂到老品的父体下「借评论」，等评论起来再拆开。这个操作的性质是：',
      options: [
        { id: 'a', text: '聪明的运营技巧，很多人都这么干', kind: 'wrong', note: '这是典型的变体滥用：把不相关的产品合并进同一父体以共享评论，属于操纵评论的变体形式。' },
        { id: 'b', text: '变体滥用，属于操纵评论，被查到会拆分变体、清除评论甚至限制销售', kind: 'correct', note: '正确。平台明确禁止「为共享评论而合并不相关产品」，处罚包括强制拆分、删除评论、账户限制。' },
        { id: 'c', text: '只要产品是同一品牌就没问题', kind: 'assistant', note: '同品牌不等于同产品。判据是「是否为同一产品的合法变体（颜色/尺寸/容量等）」，不是品牌是否相同。' },
        { id: 'd', text: '可以合并，但不要在主图里体现差异', kind: 'wrong', note: '隐瞒差异只是让违规更难被发现，不改变违规性质，反而增加「故意规避」的判定权重。' }
      ],
      answer: ['b'],
      summary: '变体合并的合法边界是「同一产品的不同属性」。为了借评论而合并不同产品，是平台重点打击的操纵评论行为。'
    },
    {
      id: 'Q182', dim: 'compliance', layer: 'ops', type: 'single',
      stem: '一款普通不锈钢杯的文案里写了「抗菌」「防霉」。最准确的风险判断是：',
      options: [
        { id: 'a', text: '没问题，这是产品事实描述', kind: 'wrong', note: '抗菌、防霉属于功效宣称，需要检测报告与认证支撑。普通不锈钢杯没有资质就不能这样写。' },
        { id: 'b', text: '属于功效宣称类敏感词，可能被判违规下架；应改成材质与结构描述', kind: 'correct', note: '正确。Anti-Bacteria、Anti-fungal 这类词在多数类目属于受限宣称，普通日用品写了就是违规。' },
        { id: 'c', text: '只要写在五点里、不写在标题里就安全', kind: 'wrong', note: '标题、五点、详情、A+、图片文字、后台 ST 全都在审查范围内。' },
        { id: 'd', text: '中文写了没关系，前台是英文', kind: 'wrong', note: '后台文案同样会被抓取；而且前台翻译过去一样是功效宣称。' }
      ],
      answer: ['b'],
      summary: '功效宣称类词（抗菌/杀菌/防霉/防虫/消毒）需要资质支撑。没有报告就改成客观描述：材质、结构、清洁方式。'
    },

    /* ============================================================
       多选 10 题（Q183–Q192）
       ============================================================ */
    {
      id: 'Q183', dim: 'metrics', layer: 'base', type: 'multi',
      stem: '判断一个 ACOS「是否异常」，必须知道哪些信息？（多选）',
      options: [
        { id: 'a', text: '产品的广告前毛利率', kind: 'correct', note: '必须。盈亏平衡 ACOS = 广告前毛利率，没有毛利率就没有判断基准。' },
        { id: 'b', text: '产品处在生命周期的哪个阶段', kind: 'correct', note: '必须。新品期容忍高于毛利，成熟期必须低于毛利，同一数字结论相反。' },
        { id: 'c', text: 'TACOS 与自然单占比的趋势', kind: 'correct', note: '必须。TACOS 降 + 自然单涨说明广告在养链接，此时 ACOS 高未必是坏事。' },
        { id: 'd', text: '竞品的 ACOS 是多少', kind: 'wrong', note: '竞品的 ACOS 你拿不到真实数据，且不同成本结构不可比。用它当基准等于用传闻做决策。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: 'ACOS 判断三件套：毛利率（基准）、阶段（容忍度）、TACOS 趋势（是否在养链接）。缺一个就会误判。'
    },
    {
      id: 'Q184', dim: 'metrics', layer: 'base', type: 'multi',
      stem: 'TACOS 持续下降，可能意味着哪些情况？（多选）',
      options: [
        { id: 'a', text: '自然流量在增长，整店对广告的依赖下降', kind: 'correct', note: '最理想的情况：广告养出了自然排名。' },
        { id: 'b', text: '整体销售在萎缩，但广告缩得更快', kind: 'correct', note: '也要警惕这种情况：销售额掉 40%、广告费掉 50%，TACOS 同样下降，但这是衰退。' },
        { id: 'c', text: '广告预算被误关或活动停投了', kind: 'correct', note: '属于异常下降：花费骤降会拉低 TACOS，但订单很快会跟着掉。' },
        { id: 'd', text: '一定是好事，不用再查其他指标', kind: 'wrong', note: '单一指标不能定性。TACOS 下降必须配自然单占比与总销售额一起看。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: 'TACOS 下降有三种性质完全不同的原因：自然流量上涨（好）、整体萎缩（坏）、广告误关（事故）。必须配合总销售额与自然单占比确认。'
    },
    {
      id: 'Q185', dim: 'metrics', layer: 'base', type: 'multi',
      stem: '以下哪些因素会直接影响「单件净利」，但不会出现在广告报表里？（多选）',
      options: [
        { id: 'a', text: '退货率与退货处理费', kind: 'correct', note: '直接影响净利，广告报表不含。高退货类目最容易在这里翻车。' },
        { id: 'b', text: '长期仓储费与超龄库存附加费', kind: 'correct', note: '直接影响净利，尤其库龄超过 180 天后跳档上涨。' },
        { id: 'c', text: '运营提成与平台月租分摊', kind: 'correct', note: '属于固定或半变动费用，不计入广告报表，但要从净利里扣。' },
        { id: 'd', text: '关键词的搜索排名', kind: 'wrong', note: '排名影响曝光与流量，不直接进单件成本；它是间接因素。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '广告报表只算广告的账。净利要在广告之外再扣退货、仓储、提成、月租——这四项是「报表上看着赚、实际亏」的主要原因。'
    },
    {
      id: 'Q186', dim: 'metrics', layer: 'base', type: 'multi',
      stem: '关于 CPC，以下说法正确的是：（多选）',
      options: [
        { id: 'a', text: 'CPC 的划算线 = 客单价 × CVR × 毛利率', kind: 'correct', note: '正确。这是「每次点击的期望毛利」，超过它广告就付不起点击价。' },
        { id: 'b', text: 'CPC 上涨但 ACOS 下降，说明 CVR 或客单价在提升', kind: 'correct', note: '正确。ACOS = CPC ÷ (客单价 × CVR)，分母涨得更快就会出现这个组合。' },
        { id: 'c', text: 'CPC 由出价、竞争程度、相关性共同决定', kind: 'correct', note: '正确。相关性高、质量分高的广告，实际扣费通常更低。' },
        { id: 'd', text: 'CPC 越低，广告效果一定越好', kind: 'wrong', note: '低价买到的可能是最差的位置与最泛的流量。CPC 低但 CVR 崩了，ACOS 反而更高。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: 'CPC 是「买流量的单价」，不是越低越好。判断标准永远是「这个点击能不能带来覆盖它成本的订单」。'
    },
    {
      id: 'Q187', dim: 'funnel', layer: 'ops', type: 'multi',
      stem: '一个链接 CVR 明显低于同类目，可能的原因包括：（多选）',
      options: [
        { id: 'a', text: '价格高于同页面竞品，或运费额外收费', kind: 'correct', note: '最常见的两个原因，且都能在详情页上直接验证。' },
        { id: 'b', text: '评论数少、评分低、有高频差评关键词', kind: 'correct', note: '信任成本直接影响下单决策，差评里的高频词是最快的诊断入口。' },
        { id: 'c', text: '主图与五点承诺和实际产品有落差', kind: 'correct', note: '「点进来发现不是想的那样」会直接杀掉转化，还会带来退货。' },
        { id: 'd', text: '广告出价太低', kind: 'wrong', note: '出价低影响曝光量，不改变「点进来的人买不买」。层级不对。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: 'CVR 的诊断清单：价格与运费、评论与差评、图文承诺一致性、库存与配送时效。四条查完基本能定位。'
    },
    {
      id: 'Q188', dim: 'funnel', layer: 'ops', type: 'multi',
      stem: '想提升 CTR，可以动的因素有哪些？（多选）',
      options: [
        { id: 'a', text: '主图的视觉差异与卖点前置', kind: 'correct', note: 'CTR 的第一因子。移动端缩略图很小，差异必须在 1 秒内看出来。' },
        { id: 'b', text: '价格与 Coupon 标签的视觉吸引力', kind: 'correct', note: '带绿色优惠标签的搜索结果点击率通常更高，这是最便宜的一招。' },
        { id: 'c', text: '标题前 60 个字符的信息密度', kind: 'correct', note: '搜索结果里标题常常只显示前段，核心卖点必须在前 60 字符内。' },
        { id: 'd', text: '五点描述的详细程度', kind: 'wrong', note: '五点不在搜索结果页展示，影响的是点进来之后的 CVR，不是 CTR。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: 'CTR 只由「搜索结果页上能看到的东西」决定：主图、价格/优惠标签、标题前段、评分与评论数。五点与 A+ 属于转化层。'
    },
    {
      id: 'Q189', dim: 'funnel', layer: 'ops', type: 'multi',
      stem: '广告无法直接改善的漏斗环节有哪些？（多选）',
      options: [
        { id: 'a', text: '加购之后的结算体验（运费、时效、税费）', kind: 'correct', note: '广告买到的是点击，结算体验由你的配送设置与定价决定。' },
        { id: 'b', text: '详情页的说服力（五点、A+、评论内容）', kind: 'correct', note: '广告能带来更精准的人，但说服力要靠 Listing 与产品本身。' },
        { id: 'c', text: '产品本身的质量与退货率', kind: 'correct', note: '质量问题的唯一解法是供应链，任何广告手段都盖不住。' },
        { id: 'd', text: '单次曝光的获取量', kind: 'wrong', note: '这个正是广告能直接改善的：加预算、提 bid、加词都能拿到更多曝光。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '广告解决「被看见」，不解决「被相信」与「被满意」。把转化问题当成广告问题，是新手最贵的错觉。'
    },
    {
      id: 'Q190', dim: 'sourcing', layer: 'ops', type: 'multi',
      stem: '判断一个类目值不值得进，需要看哪些数据？（多选）',
      options: [
        { id: 'a', text: '头部竞品的月销与评论数（需求与壁垒）', kind: 'correct', note: '月销验证需求真伪，评论数验证进入壁垒，两个必须一起看。' },
        { id: 'b', text: '价格带分布与各带的销量占比', kind: 'correct', note: '决定你能定在哪个价位，以及那个价位有没有量。' },
        { id: 'c', text: '季节性波动与大促节点', kind: 'correct', note: '决定备货节奏与资金占用周期，纯季节性品类对新玩家极不友好。' },
        { id: 'd', text: '竞品用的是哪家物流商', kind: 'wrong', note: '属于执行细节，不构成进入决策的依据。调研阶段不必看到这个粒度。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '类目尽调三件套：需求（月销）、壁垒（评论/品牌集中度）、结构（价格带 + 季节性）。这三项决定「能不能做、做哪个价位、什么时候做」。'
    },
    {
      id: 'Q191', dim: 'sourcing', layer: 'ops', type: 'multi',
      stem: '以下哪些是「伪需求」信号？（多选）',
      options: [
        { id: 'a', text: '头部销量靠长期大额 Coupon 撑着，取消优惠就掉单', kind: 'correct', note: '靠折扣维持的销量不是真实需求，是价格弹性。你一进场就得跟着打折。' },
        { id: 'b', text: '搜索量高但转化率极低，评论里全是「买来试试」「不是我要的」', kind: 'correct', note: '有搜索没转化，说明需求表述与产品不匹配，属于典型的「看着热闹」。' },
        { id: 'c', text: '销量集中在极少数几个超低价 Listing 上', kind: 'correct', note: '价格带被锁死在成本线以下，新玩家进不去。' },
        { id: 'd', text: '类目 BSR 前 100 里有多个中国卖家', kind: 'wrong', note: '中国卖家多说明供应链成熟、可复制性强，是中性甚至偏正面的信号。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '伪需求的三个特征：靠折扣撑量、有搜索没转化、价格带被锁死。看到这三条，需求数字再漂亮也别进。'
    },
    {
      id: 'Q192', dim: 'compliance', layer: 'ops', type: 'multi',
      stem: '以下哪些行为属于平台明令禁止的「操纵评论」？（多选）',
      options: [
        { id: 'a', text: '给好评返现、送礼品卡', kind: 'correct', note: '典型的激励性评论，属于明确禁止项。' },
        { id: 'b', text: '找服务商做测评、刷单', kind: 'correct', note: '操纵评论的核心形态，处罚包括清评、限流、封店。' },
        { id: 'c', text: '把不相关产品合并到同一父体借评论', kind: 'correct', note: '变体滥用，本质是操纵评论。' },
        { id: 'd', text: '用官方 Vine 计划获取早期评论', kind: 'wrong', note: 'Vine 是平台官方渠道，合规且推荐。它不承诺好评，只提供真实评价。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '操纵评论的判定核心是「以利益换取评价」或「伪造评价来源」。Vine 之所以合规，是因为它不承诺好评、由平台撮合。'
    }
  );

  /* ============================================================
     简答 5 题（S34–S38）
     ============================================================ */
  DATA.SHORT.push(
    {
      id: 'S34', dim: 'compliance', layer: 'ops', title: '一夜之间多了 8 条一星差评',
      prompt: '早上发现链接一夜之间多了 8 条一星差评，内容都是「用了两天就坏了」，且集中出现在 4 小时内，账号评分从 4.6 掉到 4.1。主管问：「你打算怎么处理？」请说明你的判断依据、处理顺序，以及哪些动作你绝对不会做。',
      checklist: [
        '先判断是否异常：8 条同质差评 + 集中时间窗，属于高疑似恶意攻击或同批次质量问题',
        '先自查产品批次：确认近期是否有换供应商、换材料、换产线（真质量问题要认）',
        '留证：截图、订单号、时间、评论账号特征，形成可提交的材料',
        '走官方通道：通过评论举报入口提交「违反评论政策」的证据，而不是找服务商删评',
        '同步商业动作：主动联系真实受影响客户做售后，把可挽回的口碑拉回来',
        '明确不做：买好评对冲、刷好评稀释、给对手刷差评报复',
        '给出后续机制：建立差评监控与批次追溯，避免下次被动'
      ],
      reference: '第一步不是处理评论，是判断真假。8 条内容同质、集中在 4 小时内的差评，要么是有组织的攻击，要么是同一批次的真实质量事故——这两种情况的处理路径完全不同，所以先自查：近三个月有没有换供应商、换材料、换产线？如果有，先按质量问题处理，因为这时候删评也救不了复购。\n第二步留证：把评论内容、发布时间、账号特征、对应订单截图整理成材料。第三步走官方通道，用评论举报入口提交「违反评论政策」的证据，同时开 Case 说明集中异常。我不会找服务商删评，也不会买好评对冲——前者是骗局且违规，后者会把「疑似被害」变成「确实操纵评论」。\n第四步是商业动作：主动给真实受影响的客户做售后，能换就换、能退就退，把还能挽回的口碑拉回来；同时检查是不是某一批次的问题，必要时主动下架该批次。最后要留一个机制：差评监控 + 批次追溯，下次在 24 小时内就能判断是攻击还是事故。',
      pitfalls: '最常见的失分是「马上找服务商删差评」或「刷好评压下去」。这两个动作在主管听来等于「这个人的合规底线是可以商量的」。'
    },
    {
      id: 'S35', dim: 'compliance', layer: 'ops', title: 'ODR 0.92%，离 1% 只差一点',
      prompt: '账户状况页显示 ODR 0.92%（红线 1%），近 60 天有 3 单 A-to-Z。主管说「再出一单就麻烦了」。请你说明接下来两周会做什么，以及为什么是这个顺序。',
      checklist: [
        '先算清窗口：60 天滚动，3 单缺陷对应约 326 单，需要多少单才能稀释到安全区',
        '定位缺陷来源：3 单分别来自哪个 ASIN、哪类问题（破损/未收到/与描述不符）',
        '先止血：针对该 ASIN 改包装/换物流/改描述，避免同类问题继续发生',
        '主动售后：对未解决的 A-to-Z 优先退款换货，能撤回的尽量撤回',
        '用合规增量稀释分母：正常促销拉订单，而不是刷单',
        '做监控机制：每天看一次账户状况，设置内部预警线（如 0.7%）'
      ],
      reference: '先算窗口。ODR 是近 60 天滚动，0.92% 对应大约 326 单里有 3 单缺陷。要把比率压到 0.7% 以下（内部预警线），要么把分母做到 430 单以上，要么等旧缺陷单滚出窗口——两条路都要时间，所以顺序上「止血」比「稀释」更急。\n第二步定位来源：3 单 A-to-Z 分别来自哪个 ASIN、什么原因。破损就改包装，未收到就换物流，与描述不符就改文案与图片。这一步不做，稀释的速度赶不上新增的速度。\n第三步主动售后：还在处理中的 A-to-Z 优先给退款或换货，客户撤回后这一单就不计入缺陷。这是唯一能「主动减少分子」的动作，优先级高于拉订单。第四步才是用合规方式做增量：Coupon、站内促销、正常广告加预算，把分母做上来。我不会刷单——在绩效告警期刷单，等于在监控镜头下作弊。\n最后是机制：把 0.7% 设成内部预警线，每天看一次账户状况，而不是等到 0.92% 才反应过来。',
      pitfalls: '很多人一上来就说「多出单稀释」。但缺陷单还在持续产生时，稀释是往漏桶里加水；而且新人容易忽略「A-to-Z 撤回可以主动减少分子」这条。'
    },
    {
      id: 'S36', dim: 'interview', layer: 'ops', title: '「你没有亚马逊经验，我为什么要你」',
      prompt: '面试官把你的简历放下，说：「我们想招一个有经验的，你连后台都没真正操作过，我为什么要冒这个险？」请给出你的回答（4–6 句），并说明你为什么这样组织。',
      checklist: [
        '先承认事实，不辩解、不硬撑「我其实有经验」',
        '给出可验证的替代证据：作品集（广告全流程文档、周报模板、复盘案例）',
        '把「经验」翻译成能力项：数据拆解、公式口径、决策链路，而不是「操作过后台」',
        '主动降低对方风险：试用期目标、带教需求、多久能独立接手',
        '给出一个具体的、可被追问的细节，证明不是背话术',
        '结尾把选择权交回去，不卑不亢'
      ],
      reference: '您说得对，我确实没有正式操盘过店铺，这一点我不绕。我能拿出来的是三样东西：一份 SP 广告从选词到周报复盘的完整文档、一套自己在用的周报模板、还有一个 30 天的模拟复盘案例——从 ACOS 从 44% 飙到 69% 开始，我怎么分层定位、做了哪五个动作、第四周回到 21%。这些不是课程作业，是我按真实后台的逻辑自己推演出来的。\n第二，我理解您要的「经验」，本质是三件事：看到数字知道先查哪一层、知道每个动作的代价、知道什么时候不该动。这三件事我在文档里都写了判断依据，您可以随便挑一段追问。第三，风险这块我想主动说：前两周我需要人带后台操作，但选词、报表、否词这些判断我可以直接上手。如果一个月内我不能独立接手一个老品的日常维护，那是我的问题。',
      pitfalls: '最差的答法是「我学习能力很强」——这句话没有任何证据。次差的是硬编经验，被追问两层就崩。'
    },
    {
      id: 'S37', dim: 'interview', layer: 'ops', title: '上架一个月，每天只有两三单',
      prompt: '主管丢给你一个链接：「上架一个月了，每天只有两三单，广告也在跑。你给我说说，你从哪儿开始查？」请给出你的排查顺序和每一步的判断标准。',
      checklist: [
        '先要数据：曝光、点击、CTR、CVR、ACOS、自然单占比，先看漏斗哪一层断了',
        '按漏斗顺序定位：曝光不足 → 词/出价/相关性；有点不点 → 主图/价格/标题',
        '点进来不买 → 详情页（价格/五点/评论/差评/A+）',
        '都正常但单少 → 市场容量与价格带问题，或排名没起来',
        '给出 1–2 个最高优先级动作 + 验证周期（3–7 天看什么指标）',
        '说明不会先做的事（如直接降价、直接加预算）'
      ],
      reference: '我先要一周的数据，把漏斗拆开：曝光、点击、CTR、CVR、ACOS、自然单占比。每天两三单，可能是「没人看见」，也可能是「看见了不买」，这两种的处理完全相反，所以不能先猜。\n第一层看曝光：如果日均曝光只有几千，问题在词和出价——核心词没埋进去、bid 太低、或者自动广告没跑起来。第二层看 CTR：曝光够但 CTR 低于 0.3%，先查词是否精准，再看主图、价格、Coupon 有没有竞争力。第三层看 CVR：点进来不买，看价格与同页面竞品的差距、评论数与差评关键词、五点有没有答到客户的顾虑。\n如果三层都正常但单量还是低，那就是市场容量或排名的问题：这个词的搜索量本身就只有几百，或者你的排名在第三页之后。这时候要做的不是优化详情页，而是重新评估选词与推广节奏。\n我会先做一个动作、观察 3–7 天，比如先否掉高花费零转化的词并调整主图，看 CTR 有没有回到 0.35% 以上。我不会一上来就降价或加预算——在没定位之前动价格和预算，只会让后面的数据更难归因。',
      pitfalls: '最常见的失分是直接给结论（「优化 Listing」「加大广告」）。主管要听的是「你怎么知道问题在哪一层」。'
    },
    {
      id: 'S38', dim: 'interview', layer: 'ops', title: '给你一个新品，30 天怎么打',
      prompt: '「假设下个月有一个新品交给你，客单价 $29.99，毛利率 38%，竞品评论都在 1000 条以上。30 天，你怎么打？预算按每天 $20 算。」请给出分周计划，并说明每周的验证指标。',
      checklist: [
        '第 0 周准备：关键词表、Listing、图片、Vine/评论计划、库存与入仓',
        '第 1 周：自动广告四匹配跑词，目标不是出单而是拿到搜索词数据',
        '第 2 周：分词，高转化词开手动精准，高花费零转化词否定',
        '第 3 周：压 ACOS 到毛利以下，同时看自然单占比是否起来',
        '第 4 周：复盘，决定加预算/换主图/调价格，输出下月计划',
        '每周给出明确的验证指标（CTR/CVR/ACOS/自然单占比），而不是「看情况」'
      ],
      reference: '第 0 周是准备，不是推广：关键词表（核心词 3 个以上、长尾 10 个以上）、Listing 埋词、主图与 A+ 素材、Vine 报名、库存入仓。这一周没做完就开广告，等于闭眼撒钱。\n第 1 周：一个自动广告，四种匹配全开，$20 预算里给自动 30%（$6），目标是每天 10 次以上点击。这一周不看 ACOS，只看能不能跑出足够的搜索词——自动广告是选词工具，不是盈利工具。\n第 2 周：拉搜索词报告分词。高转化词开手动精准（预算给到 40%，$8），高花费零转化的词精准否定，低曝光有点击的词提 bid 10%–20%。这一周验证指标是 CTR 是否稳定在 0.35% 以上、CVR 是否在 5% 以上。\n第 3 周：把 ACOS 往毛利率 38% 以下压。动作顺序是否词 → 降 bid → 缩泛匹配预算，同时看自然单占比有没有从 0 往上走。这一周的验证指标是 ACOS 与自然单占比，两个要同时改善才算成功。\n第 4 周：复盘。如果 ACOS 已经在毛利以下、自然单占比在涨，就加预算放大；如果 CTR 一直上不去，换主图做 A/B；如果 CVR 卡在 3%，问题在价格或评论，不是广告。最后输出下个月的三件事，而不是一句「继续优化」。',
      pitfalls: '最容易失分的是「一上来就冲排名、堆预算」。30 天里前两周的任务是拿数据，不是拿销量；把顺序讲反，主管会认为你没做过冷启动。'
    }
  );

  console.log('[bank-extra] 已加载：填空 16 · 单选 34 · 多选 10 · 简答 5');
})();
