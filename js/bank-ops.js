/* ============================================================
   阶段 4 · 题库扩容（一）：高阶运营决策
   填空 10（F39–F48）+ 单选 25（Q114–Q138）
   覆盖：lifecycle / inventory / profit / compliance，层级 ops，难度 2–3
   来源：Day2 公式手卡 · Day4 SP 全流程 · 库存与利润口径（既有 sims）· 基础资料
   ============================================================ */
(function () {
  const DATA = window.DATA, R = window.R, F = window.F;
  if (!DATA.DIMS) return;

  /* ============================================================
     填空 10 题（F39–F48）
     ============================================================ */
  DATA.FILL.push(
    {
      id: 'F39', dim: 'inventory', layer: 'ops', title: '空运还是等海运，这笔账怎么算',
      build: function () {
        const daily = R.int(12, 40);
        const gap = R.int(8, 20);
        const airExtra = R.range(1.8, 3.6, 2);
        const margin = R.range(3.2, 6.8, 2);
        const lost = Number((margin * gap * daily).toFixed(2));
        const cost = Number((airExtra * gap * daily).toFixed(2));
        return {
          title: '空运还是等海运，这笔账怎么算', dim: 'inventory', layer: 'ops',
          scene: '海运还要 ' + gap + ' 天才到，中间会断货。日均 ' + daily + ' 单，单件毛利 ' + F.money(margin) + '。空运能提前到货，但每件多花 ' + F.money(airExtra) + '。按「只运这段时间的缺口量」算，这笔空运划不划算？',
          kv: [['预计断货天数', gap + ' 天'], ['日均销量', daily + ' 单'], ['单件毛利', F.money(margin)], ['空运单件溢价', F.money(airExtra)]],
          blanks: [
            { key: 'qty', label: '空运要补的件数', hint: '日均 × 断货天数', unit: '件', value: gap * daily },
            { key: 'lost', label: '断货损失（毛利口径）', hint: '单件毛利 × 断货天数 × 日均', unit: '$', value: lost },
            { key: 'cost', label: '空运溢价总额', hint: '单件溢价 × 空运件数', unit: '$', value: cost }
          ],
          steps: [
            '缺口件数 = ' + daily + ' × ' + gap + ' = ' + (gap * daily) + ' 件',
            '断货损失 = ' + F.money(margin) + ' × ' + gap + ' × ' + daily + ' = ' + F.money(lost) + '（只算毛利，还没算排名恢复成本）',
            '空运溢价 = ' + F.money(airExtra) + ' × ' + (gap * daily) + ' = ' + F.money(cost),
            '结论：' + (lost > cost ? '断货损失 ' + F.money(lost) + ' > 空运溢价 ' + F.money(cost) + '，空运划算' : '空运溢价 ' + F.money(cost) + ' > 断货损失 ' + F.money(lost) + '，等海运更划算')
          ],
          usage: '空运不是「贵不贵」的问题，是「贵过断货损失没有」的问题。而且这里的断货损失只算了毛利，真实的代价还要加上「排名恢复所需的广告费」，所以实际临界点比这个算式更偏向空运。',
          caveat: '本式只比较毛利损失与空运溢价。若把排名恢复成本计入（通常高于空运溢价），判定会更倾向空运；反之若产品处于清货期，断货反而是好事，不该空运。'
        };
      }
    },
    {
      id: 'F40', dim: 'inventory', layer: 'ops', title: 'IPI 不够，超仓要交多少钱',
      build: function () {
        const limit = R.int(18, 32) * 100;
        const actual = Math.round(limit * R.range(1.15, 1.45));
        const fee = R.range(0.35, 0.75, 2);
        const over = actual - limit;
        return {
          title: 'IPI 不够，超仓要交多少钱', dim: 'inventory', layer: 'ops',
          scene: '本季度 IPI 只有 ' + R.int(320, 395) + '，低于 400 的限仓线，亚马逊把库容卡到 ' + F.comma(limit) + ' 立方英尺，而你实际库存 ' + F.comma(actual) + ' 立方英尺。超出的部分按月收 $' + fee + ' / 立方英尺。',
          kv: [['IPI', '< 400（限仓线）'], ['库容上限', F.comma(limit) + ' 立方英尺'], ['实际库存体积', F.comma(actual) + ' 立方英尺'], ['超仓费率', F.money(fee) + ' / 立方英尺 / 月']],
          blanks: [
            { key: 'over', label: '超出的体积', hint: '实际 − 上限', unit: '立方英尺', value: over },
            { key: 'feeM', label: '每月超仓费', hint: '超出体积 × 费率', unit: '$', value: Number((over * fee).toFixed(2)) }
          ],
          steps: [
            '超出体积 = ' + F.comma(actual) + ' − ' + F.comma(limit) + ' = ' + F.comma(over) + ' 立方英尺',
            '每月超仓费 = ' + F.comma(over) + ' × ' + F.money(fee) + ' = ' + F.money(over * fee),
            '三个月就是 ' + F.money(over * fee * 3) + ' —— 这笔钱不会产生任何销量'
          ],
          usage: 'IPI 低不是「分数难看」，是「进不了货、还要交罚款」。它由四项构成：冗余库存比例、售出率、无在售信息库存、滞留库存。要提分只有两条路——把卖不动的清掉，把卖得动的补上。',
          caveat: 'IPI 门槛在不同站点/年份会调整（部分站点为 450 或 500），超仓费率也分淡旺季；实际以卖家平台「库存绩效」页为准。'
        };
      }
    },
    {
      id: 'F41', dim: 'inventory', layer: 'ops', title: '库龄分段与超龄仓储费',
      build: function () {
        const n1 = R.int(80, 260);
        const n2 = R.int(40, 140);
        const f1 = R.range(0.5, 1.5, 2);
        const f2 = R.range(4.0, 6.5, 2);
        return {
          title: '库龄分段与超龄仓储费', dim: 'inventory', layer: 'ops',
          scene: '某 SKU 的库龄结构：271–365 天 ' + n1 + ' 件，365 天以上 ' + n2 + ' 件。前者仓储费约 $' + f1 + ' / 件 / 月，后者是 ' + F.money(f2) + ' / 件 / 月（超龄费率）。请算清这笔钱。',
          kv: [['271–365 天', n1 + ' 件 · $' + f1 + '/件/月'], ['365 天以上', n2 + ' 件 · ' + F.money(f2) + '/件/月']],
          blanks: [
            { key: 'm1', label: '271–365 天段的月仓储费', hint: '件数 × 费率', unit: '$', value: Number((n1 * f1).toFixed(2)) },
            { key: 'm2', label: '365 天以上段的月仓储费', hint: '件数 × 超龄费率', unit: '$', value: Number((n2 * f2).toFixed(2)) },
            { key: 'total', label: '合计月仓储费', hint: '两段相加', unit: '$', value: Number((n1 * f1 + n2 * f2).toFixed(2)) }
          ],
          steps: [
            '271–365 天 = ' + n1 + ' × ' + F.money(f1) + ' = ' + F.money(n1 * f1),
            '365 天以上 = ' + n2 + ' × ' + F.money(f2) + ' = ' + F.money(n2 * f2) + '（费率是前一段的 ' + (f2 / f1).toFixed(1) + ' 倍）',
            '合计 = ' + F.money(n1 * f1 + n2 * f2) + ' / 月，一年就是 ' + F.money((n1 * f1 + n2 * f2) * 12)
          ],
          usage: '超龄库存的账要倒着算：一件货在仓里躺满一年，仓储费可能比它的毛利还高。所以「清货优先级高于多卖几个」不是态度问题，是算术问题——库龄跨过 365 天那一刻，这件货就从资产变成负债。',
          caveat: '超龄费率为示意值，实际按体积（立方英尺）而非件数计费，且各站点分段（271/181/365 天）与费率差异较大。本表按「件」简化，用于理解量级。'
        };
      }
    },
    {
      id: 'F42', dim: 'inventory', layer: 'ops', title: '库存占了你多少钱',
      build: function () {
        const qty = R.int(300, 1200);
        const unitCost = R.range(6, 16, 2);
        const dailySales = R.range(8, 30, 1);
        const capital = Number((qty * unitCost).toFixed(2));
        const days = Math.round(qty / dailySales);
        return {
          title: '库存占了你多少钱', dim: 'inventory', layer: 'ops',
          scene: '某 SKU 在仓 ' + F.comma(qty) + ' 件，单件成本（含头程）' + F.money(unitCost) + '，日均销 ' + dailySales + ' 件。请算这笔库存压住的资金和它的周转天数。',
          kv: [['库存件数', F.comma(qty) + ' 件'], ['单件成本（含头程）', F.money(unitCost)], ['日均销量', dailySales + ' 件']],
          blanks: [
            { key: 'cap', label: '库存资金占用', hint: '件数 × 单件成本', unit: '$', value: capital },
            { key: 'days', label: '库存周转天数', hint: '库存件数 ÷ 日均销量', unit: '天', value: days }
          ],
          steps: [
            '资金占用 = ' + F.comma(qty) + ' × ' + F.money(unitCost) + ' = ' + F.money(capital),
            '周转天数 = ' + F.comma(qty) + ' ÷ ' + dailySales + ' = ' + days + ' 天',
            '健康区间 30–60 天：' + (days > 60 ? '当前 ' + days + ' 天已超上限，资金效率偏低' : '当前 ' + days + ' 天在健康区间内')
          ],
          usage: '库存周转天数是「资金效率」指标，不是「卖得好不好」指标。同样是月销 1000 件，周转 30 天的人用 1 份钱做生意，周转 90 天的人要压 3 份钱——这就是为什么同样的毛利，有人赚钱有人现金流断裂。',
          caveat: '周转天数只算 FBA 可售库存时偏乐观，应把在途与本地库存一起计入；本表按「当前库存 ÷ 日均」简化。'
        };
      }
    },
    {
      id: 'F43', dim: 'lifecycle', layer: 'ops', title: '清货让利 vs 继续扛着',
      build: function () {
        const qty = R.int(400, 1000);
        const price = R.range(18, 39, 2);
        const disc = R.pick([0.3, 0.35, 0.4]);
        const hold = R.range(0.8, 2.2, 2);
        const loss = Number((qty * price * disc).toFixed(2));
        const monthHold = Number((qty * hold).toFixed(2));
        return {
          title: '清货让利 vs 继续扛着', dim: 'lifecycle', layer: 'ops',
          scene: '某 SKU 滞销 ' + F.comma(qty) + ' 件，现价 ' + F.money(price) + '，日均只出 2 单。两个选择：①一次性清货，让价 ' + F.pct(disc * 100, 0) + '；②继续原价慢慢卖，但每件每月要付 ' + F.money(hold) + ' 的仓储与资金成本。请算两边的代价。',
          kv: [['滞销件数', F.comma(qty) + ' 件'], ['现价', F.money(price)], ['清货让价', F.pct(disc * 100, 0)], ['持有成本', F.money(hold) + ' / 件 / 月']],
          blanks: [
            { key: 'loss', label: '清货总让利', hint: '件数 × 现价 × 让价比例', unit: '$', value: loss },
            { key: 'hold', label: '一个月的持有成本', hint: '件数 × 单件月成本', unit: '$', value: monthHold },
            { key: 'months', label: '持有几个月就超过清货让利（保留 1 位）', hint: '让利 ÷ 月持有成本', unit: '个月', value: Number((loss / monthHold).toFixed(1)) }
          ],
          steps: [
            '清货让利 = ' + F.comma(qty) + ' × ' + F.money(price) + ' × ' + F.pct(disc * 100, 0) + ' = ' + F.money(loss),
            '月持有成本 = ' + F.comma(qty) + ' × ' + F.money(hold) + ' = ' + F.money(monthHold),
            '临界点 = ' + F.money(loss) + ' ÷ ' + F.money(monthHold) + ' = ' + (loss / monthHold).toFixed(1) + ' 个月',
            '按日均 2 单算，' + F.comma(qty) + ' 件要卖 ' + Math.round(qty / 2) + ' 天（约 ' + (qty / 60).toFixed(1) + ' 个月）——远超过临界点，清货更划算'
          ],
          usage: '清货决策的核心不是「亏多少」，是「亏多久」。让利是一次性成本，持有成本是持续成本，而且会随着库龄跨过分段线而跳涨。只要「预计卖完的时间」超过临界月数，就该清。',
          caveat: '本式未计入超龄仓储费的跳涨（跨 365 天后费率数倍上升），实际临界点比这里算的更短，也就是说「该清得更早」。'
        };
      }
    },
    {
      id: 'F44', dim: 'lifecycle', layer: 'ops', title: '换代值不值：回本周期',
      build: function () {
        const oldNet = R.range(1.2, 3.5, 2);
        const oldQty = R.int(150, 400);
        const newNet = R.range(2.6, 5.8, 2);
        const newQty = R.int(220, 600);
        const dev = R.int(14000, 36000);
        const oldProfit = Number((oldNet * oldQty).toFixed(2));
        const newProfit = Number((newNet * newQty).toFixed(2));
        const gain = Number((newProfit - oldProfit).toFixed(2));
        return {
          title: '换代值不值：回本周期', dim: 'lifecycle', layer: 'ops',
          scene: '老品月销 ' + oldQty + ' 件、单件净利 ' + F.money(oldNet) + '，已连续 6 个月下滑。新品预计月销 ' + newQty + ' 件、单件净利 ' + F.money(newNet) + '，但开模加打样要一次性投入 $' + F.comma(dev) + '。请算换代的回本周期。',
          kv: [['老品', oldQty + ' 件/月 · ' + F.money(oldNet) + ' 净利'], ['新品', newQty + ' 件/月 · ' + F.money(newNet) + ' 净利'], ['一次性投入', '$' + F.comma(dev)]],
          blanks: [
            { key: 'old', label: '老品月净利', hint: '销量 × 单件净利', unit: '$', value: oldProfit },
            { key: 'gain', label: '换代后的月净利增量', hint: '新品月净利 − 老品月净利', unit: '$', value: gain },
            { key: 'months', label: '回本月数（保留 1 位）', hint: '一次性投入 ÷ 月增量', unit: '个月', value: gain > 0 ? Number((dev / gain).toFixed(1)) : 0 }
          ],
          steps: [
            '老品月净利 = ' + oldQty + ' × ' + F.money(oldNet) + ' = ' + F.money(oldProfit),
            '新品月净利 = ' + newQty + ' × ' + F.money(newNet) + ' = ' + F.money(newProfit),
            '月增量 = ' + F.money(newProfit) + ' − ' + F.money(oldProfit) + ' = ' + F.money(gain),
            '回本 = $' + F.comma(dev) + ' ÷ ' + F.money(gain) + ' = ' + (dev / gain).toFixed(1) + ' 个月' + (dev / gain <= 12 ? '（一年内回本，值得做）' : '（超过一年，要先确认老品还能撑多久）')
          ],
          usage: '换代不是「老品下滑了就该换」，而是「增量够不够覆盖一次性投入」。当老品净利已经接近零时，回本周期会被放大到不可接受——这时候该做的不是换代，是清货退出。',
          caveat: '回本周期只算净利增量，未计入新品推广期的额外广告投入与失败风险；实际操作里要把「新品前 3 个月的亏损」加进一次性投入再算。'
        };
      }
    },
    {
      id: 'F45', dim: 'profit', layer: 'ops', title: '全成本净利：钱到底去哪了',
      build: function () {
        const price = R.pick([29.99, 34.99, 39.99]);
        const cost = Number((price * R.range(0.20, 0.30)).toFixed(2));
        const freight = R.range(2.0, 3.8, 2);
        const fba = R.range(4.0, 6.5, 2);
        const comm = Number((price * 0.15).toFixed(2));
        const returnRate = R.range(0.03, 0.08, 3);
        const retLoss = Number((price * returnRate * 0.6).toFixed(2));
        const acos = R.range(0.18, 0.32, 2);
        const adCost = Number((price * acos).toFixed(2));
        const commission = Number((price * 0.02).toFixed(2));
        const net = Number((price - cost - freight - fba - comm - retLoss - adCost - commission).toFixed(2));
        return {
          title: '全成本净利：钱到底去哪了', dim: 'profit', layer: 'ops',
          scene: '售价 ' + F.money(price) + '。成本项：出厂 ' + F.money(cost) + '、头程 ' + F.money(freight) + '、FBA ' + F.money(fba) + '、佣金 ' + F.money(comm) + '、退货损耗 ' + F.money(retLoss) + '；再扣广告（ACOS ' + F.pct(acos * 100, 0) + '，即每单 ' + F.money(adCost) + '）与运营提成（销售额 2%，' + F.money(commission) + '）。请算真实净利。',
          kv: [['售价', F.money(price)], ['退货率', F.pct(returnRate * 100, 1)], ['ACOS', F.pct(acos * 100, 0)], ['提成', '销售额 2%']],
          table: {
            head: ['成本项', '金额'],
            rows: [
              ['出厂成本', F.money(cost)],
              ['头程', F.money(freight)],
              ['FBA 配送费', F.money(fba)],
              ['佣金（15%）', F.money(comm)],
              ['退货损耗', F.money(retLoss)],
              ['广告分摊', F.money(adCost)],
              ['运营提成', F.money(commission)]
            ]
          },
          blanks: [
            { key: 'net', label: '单件净利', hint: '售价 − 全部成本项', unit: '$', value: net },
            { key: 'rate', label: '净利率', hint: '单件净利 ÷ 售价 × 100%', unit: '%', value: net / price * 100 }
          ],
          steps: [
            '成本合计 = ' + F.money(cost) + ' + ' + F.money(freight) + ' + ' + F.money(fba) + ' + ' + F.money(comm) + ' + ' + F.money(retLoss) + ' + ' + F.money(adCost) + ' + ' + F.money(commission) + ' = ' + F.money(price - net),
            '单件净利 = ' + F.money(price) + ' − ' + F.money(price - net) + ' = ' + F.money(net),
            '净利率 = ' + F.money(net) + ' ÷ ' + F.money(price) + ' = ' + F.pct(net / price * 100),
            '对照行业底线（工贸/精品口径 ≥15%）：' + (net / price * 100 >= 15 ? '达标' : '不达标，需要重新评估选品或定价')
          ],
          usage: '「毛利率 40% 为什么不赚钱」的答案永远在这张表里：广告、退货、提成这三项是新手最容易漏掉的。漏掉它们，选品阶段就会把不该做的产品算成好生意。',
          caveat: '退货损耗按「退货率 × 售价 × 60%」估算（运费与折损不可回收部分），实际应按退货处理费与二次销售折价计算；提成比例按 2% 示例。'
        };
      }
    },
    {
      id: 'F46', dim: 'profit', layer: 'ops', title: '要保住 15% 净利，得卖多少钱',
      build: function () {
        const nonAd = R.range(14, 26, 2);
        const acos = R.range(0.15, 0.25, 2);
        const target = R.range(0.12, 0.18, 2);
        const price = Number((nonAd / (1 - acos - target)).toFixed(2));
        const suggested = Math.ceil(price) - 0.01;
        return {
          title: '要保住 15% 净利，得卖多少钱', dim: 'profit', layer: 'ops',
          scene: '某产品非广告成本合计 ' + F.money(nonAd) + '（出厂 + 头程 + FBA + 佣金 + 退货），预计广告费占售价 ' + F.pct(acos * 100, 0) + '，公司要求净利率不低于 ' + F.pct(target * 100, 0) + '。请倒推最低售价。',
          kv: [['非广告成本', F.money(nonAd)], ['广告费占售价', F.pct(acos * 100, 0)], ['目标净利率', F.pct(target * 100, 0)]],
          blanks: [
            { key: 'price', label: '最低盈亏售价（保留 2 位）', hint: '非广告成本 ÷（1 − 广告占比 − 目标净利率）', unit: '$', value: price },
            { key: 'sugg', label: '建议定价（取到 .99）', hint: '向上取整后减 0.01', unit: '$', value: Number(suggested.toFixed(2)) }
          ],
          steps: [
            '设售价为 P：P = 非广告成本 + P × 广告占比 + P × 目标净利率',
            '变形：P = ' + F.money(nonAd) + ' ÷（1 − ' + F.pct(acos * 100, 0) + ' − ' + F.pct(target * 100, 0) + '）= ' + F.money(price),
            '定价取到 .99 → ' + F.money(suggested),
            '验证：' + F.money(suggested) + ' ×（1 − ' + F.pct(acos * 100, 0) + ' − ' + F.pct(target * 100, 0) + '）= ' + F.money(suggested * (1 - acos - target)) + '，覆盖 ' + F.money(nonAd) + ' 后仍有 ' + F.money(suggested * (1 - acos - target) - nonAd) + ' 利润'
          ],
          usage: '定价不是「看竞品卖多少」，而是先算清自己的盈亏平衡价，再看这个价在价格带里站不站得住。算出来的价高于竞品价格带，说明这个产品在当前成本结构下做不了——这个结论要在选品阶段得出，不是上架后才发现。',
          caveat: '广告费按「占售价比例」简化处理；实际广告费是按单量分摊的，新品期占比会显著高于成熟期，所以新品定价应留更厚的安全垫。'
        };
      }
    },
    {
      id: 'F47', dim: 'profit', layer: 'ops', title: '两种提成方案，哪个更划算',
      build: function () {
        const qty = R.int(300, 900);
        const price = R.range(26, 42, 2);
        const rateA = 0.02;
        const rateB = 0.08;
        const gross = Number((price * R.range(0.30, 0.44, 2)).toFixed(2));
        const sales = Number((qty * price).toFixed(2));
        const a = Number((sales * rateA).toFixed(2));
        const b = Number((qty * gross * rateB).toFixed(2));
        return {
          title: '两种提成方案，哪个更划算', dim: 'profit', layer: 'ops',
          scene: '月销 ' + qty + ' 件、售价 ' + F.money(price) + '、单件毛利 ' + F.money(gross) + '。两种提成方案：A 按销售额 2%；B 按毛利 8%。请算两边金额并比较。',
          kv: [['月销量', qty + ' 件'], ['售价', F.money(price)], ['单件毛利', F.money(gross)], ['方案 A', '销售额 × 2%'], ['方案 B', '毛利 × 8%']],
          blanks: [
            { key: 'a', label: '方案 A 的提成额', hint: '销量 × 售价 × 2%', unit: '$', value: a },
            { key: 'b', label: '方案 B 的提成额', hint: '销量 × 单件毛利 × 8%', unit: '$', value: b },
            { key: 'gap', label: '两者差额（B − A）', hint: '方案 B − 方案 A', unit: '$', value: Number((b - a).toFixed(2)) }
          ],
          steps: [
            '方案 A = ' + qty + ' × ' + F.money(price) + ' × 2% = ' + F.money(a),
            '方案 B = ' + qty + ' × ' + F.money(gross) + ' × 8% = ' + F.money(b),
            '差额 = ' + F.money(b) + ' − ' + F.money(a) + ' = ' + F.money(b - a) + '（' + (b > a ? 'B 方案更高' : 'A 方案更高') + '）'
          ],
          usage: '提成结构决定运营的动作方向：按销售额提成，运营会倾向于降价冲量（销售额涨得快）；按毛利提成，运营会倾向于控广告、守价格。面试被问「你希望怎么被考核」，能讲清这个差别，比说「我都行」强得多。',
          caveat: '这里只比较金额，实际方案选择还要看风险归属：按销售额提成，运营会把利润压力留给公司；按毛利提成，运营会主动砍低效投放。'
        };
      }
    },
    {
      id: 'F48', dim: 'compliance', layer: 'ops', title: '四项绩效指标，几个越线了',
      build: function () {
        const orders = R.int(600, 1400);
        const defects = R.int(4, 14);
        const ship = R.int(180, 420);
        const late = R.int(6, 22);
        const tracked = ship - R.int(4, 16);
        const odr = defects / orders * 100;
        const lsr = late / ship * 100;
        const vtr = tracked / ship * 100;
        const over = [odr >= 1, lsr >= 4, vtr <= 95].filter(Boolean).length;
        return {
          title: '四项绩效指标，几个越线了', dim: 'compliance', layer: 'ops',
          scene: '本月数据：总订单 ' + F.comma(orders) + ' 单，缺陷订单 ' + defects + ' 单；自发货 ' + ship + ' 单，其中迟发 ' + late + ' 单、带有效追踪号 ' + tracked + ' 单。请算出 ODR、迟发率、VTR，并判断几个指标越线（红线：ODR < 1%、迟发率 < 4%、VTR > 95%）。',
          kv: [['总订单', F.comma(orders) + ' 单'], ['缺陷订单', defects + ' 单'], ['自发货', ship + ' 单'], ['迟发', late + ' 单'], ['有效追踪', tracked + ' 单']],
          blanks: [
            { key: 'odr', label: 'ODR', hint: '缺陷订单 ÷ 总订单 × 100%', unit: '%', value: odr },
            { key: 'lsr', label: '迟发率', hint: '迟发单 ÷ 自发货单 × 100%', unit: '%', value: lsr },
            { key: 'vtr', label: 'VTR 有效追踪率', hint: '有追踪单 ÷ 自发货单 × 100%', unit: '%', value: vtr },
            { key: 'over', label: '越线的指标个数', hint: '对照三条红线', unit: '个', value: over }
          ],
          steps: [
            'ODR = ' + defects + ' ÷ ' + F.comma(orders) + ' = ' + F.pct(odr) + (odr >= 1 ? ' → 越线（红线 <1%）' : ' → 未越线'),
            '迟发率 = ' + late + ' ÷ ' + ship + ' = ' + F.pct(lsr) + (lsr >= 4 ? ' → 越线（红线 <4%）' : ' → 未越线'),
            'VTR = ' + tracked + ' ÷ ' + ship + ' = ' + F.pct(vtr) + (vtr <= 95 ? ' → 越线（红线 >95%）' : ' → 未越线'),
            '结论：' + over + ' 个指标越线' + (over ? '，最先处理的是 ODR（账号级风险最高）' : '，全部在安全区，但要注意边际变化')
          ],
          usage: '三个指标的方向不一样：ODR 和迟发率是「越低越好」，VTR 是「越高越好」。面试时把方向说反，是最容易暴露「只背了数字、没做过」的细节。',
          caveat: 'ODR 统计口径为近 60 天滚动窗口，迟发率与 VTR 通常按 30 天滚动；本表按单月数据简化。红线数值在不同站点/类目可能微调。'
        };
      }
    }
  );

  /* ============================================================
     单选 25 题（Q114–Q138）
     lifecycle 7 · inventory 7 · profit 7 · compliance 4
     ============================================================ */
  DATA.MCQ.push(
    {
      id: 'Q114', dim: 'lifecycle', layer: 'ops', type: 'single',
      stem: '新品第 5 周：ACOS 从上月的 62% 降到 38%，但日均单量从 22 落到 13，自然单占比从 28% 掉到 19%，TACOS 从 24% 涨到 26%。你的判断是：',
      options: [
        { id: 'a', text: 'ACOS 降了 24 个点，说明优化成功，继续按这个方向收紧', kind: 'assistant', note: '只看 ACOS。但单量掉 40%、自然单占比在跌、TACOS 反而涨了——这不是优化，是「收缩到只剩最贵的那部分流量」。' },
        { id: 'b', text: '这不是优化成功，是过度收缩：广告在丢掉支撑排名的量，TACOS 上涨说明广告对整盘的贡献在变差', kind: 'correct', note: '正确。健康信号是「ACOS 降 + 自然单占比涨 + TACOS 降」。这里三条里两条反向，属于收缩过头。' },
        { id: 'c', text: '继续压低 bid，把 ACOS 打到 30% 以下', kind: 'wrong', note: '沿着错误方向加码。继续压价会让单量掉得更快，排名一旦瓦解，前面 5 周的投入全废。' },
        { id: 'd', text: '立刻把预算翻倍，把单量冲回来', kind: 'order', note: '方向对但动作太粗。先要定位是哪个环节收过头（否词过狠？bid 降太多？），再针对性放开。' }
      ],
      answer: ['b'],
      summary: '判断「优化成功」的三个条件必须同时成立：ACOS 降、自然单占比涨、TACOS 降。缺一条就要怀疑是不是「为了漂亮数字牺牲了规模」。'
    },
    {
      id: 'Q115', dim: 'lifecycle', layer: 'ops', type: 'single',
      stem: '一个上架 18 个月的老品：月销从 800 掉到 200，净利率还有 12%，库龄 240 天，有 3 个竞品上了同价位新款。你的决策是：',
      options: [
        { id: 'a', text: '维持，净利率 12% 还在赚钱，没必要动', kind: 'assistant', note: '只看当下利润。月销腰斩 + 3 个新款进场 + 库龄 240 天，趋势已经很清楚，维持只是把清货成本往后推。' },
        { id: 'b', text: '进入「收缩 + 准备退出」：停止补货、控制广告到只保核心词、启动清货节奏，同时评估是否有换代价值', kind: 'correct', note: '正确。净利率还没转负，是「体面退出」的最佳窗口；等到净利转负时，库龄已经过 365 天，清货成本会高得多。' },
        { id: 'c', text: '立刻清仓甩卖，止损离场', kind: 'order', note: '方向对但节奏太急。还有 12% 净利，直接甩卖等于主动放弃这段可回收的利润，应该「有序退出」而不是「恐慌清仓」。' },
        { id: 'd', text: '加大广告投入，跟新款抢回销量', kind: 'wrong', note: '用广告对抗产品力差距，是最贵的做法。老款对着新款加投，ACOS 会飙升且抢不回来。' }
      ],
      answer: ['b'],
      summary: '老品退出的判断不看「现在还赚不赚钱」，看「趋势还能撑多久」。最优退出窗口是「还有利润、但趋势已明确向下」的时候，而不是亏损之后。'
    },
    {
      id: 'Q116', dim: 'lifecycle', layer: 'ops', type: 'single',
      stem: '某 SKU 要清货，库存 900 件、日均 4 单、净利率 3%、库龄 300 天、预算几乎为零。两种方案：A 直接降价 40%；B 挂 25% Coupon + 买一送一赠品。你的选择：',
      options: [
        { id: 'a', text: '选 A，降价最直接，清得最快', kind: 'assistant', note: '降价确实快，但会永久损伤价格带（历史最低价影响后续 Deal 资格），且直接砍掉 40% 售价，清完这批以后想回原价很难。' },
        { id: 'b', text: '选 B，用 Coupon 与赠品换等效折扣，既拉动转化又不砸穿价格带，且可随时撤', kind: 'correct', note: '正确。Coupon 是可回收的折扣工具，不改变挂牌价；赠品能提升感知价值、还能顺带清配件库存。' },
        { id: 'c', text: '两个都上，折扣叠加效果最强', kind: 'wrong', note: '折扣叠加会把实际售价压到成本线以下，而且叠加后的价格会被系统记录，对后续定价更不利。' },
        { id: 'd', text: '不降价，靠站外渠道清', kind: 'order', note: '站外清货确实不伤站内价格，但周期长、折价更深，库龄 300 天等不起。可以并行做，但不能作为唯一方案。' }
      ],
      answer: ['b'],
      summary: '清货的三个工具按「可回收程度」排序：Coupon/赠品（可撤）> 秒杀（有记录）> 直接降价（不可逆）。清货要的是现金，不是最低价。'
    },
    {
      id: 'Q117', dim: 'lifecycle', layer: 'ops', type: 'single',
      stem: '对面竞品出了新款（加了防漏锁扣），你的老款还有 2000 件库存、日均 8 单、库龄 150 天。你的组合动作是：',
      options: [
        { id: 'a', text: '给老款加一个「防漏」卖点文案，正面对打新款', kind: 'assistant', note: '老款如果没有锁扣，写「防漏」属于夸大描述，会招来差评与退货，反而把仅有的转化也做没了。' },
        { id: 'b', text: '重新定位老款的场景（如「办公室桌面杯」避开户外场景），同时按 150 天库龄制定分批清货节奏', kind: 'correct', note: '正确。产品力打不过就换战场：把老款推到竞品不覆盖的场景里，用价格与场景差异换时间，同时按库龄排清货节奏。' },
        { id: 'c', text: '立刻采购新款，两条链接一起卖', kind: 'wrong', note: '2000 件老库存还没消化就上新品，等于同时压两份资金，且两条链接会互相分流评论与流量。' },
        { id: 'd', text: '维持现状，等库存自然卖完', kind: 'wrong', note: '日均 8 单卖 2000 件要 250 天，库龄会直接冲过 365 天进入超高费率区。' }
      ],
      answer: ['b'],
      summary: '被迭代时的三个选项：正面硬打（最贵）、换场景差异化（最实用）、直接清货（最干脆）。选哪个取决于库存量能撑多久、以及产品是否还有未被满足的场景。'
    },
    {
      id: 'Q118', dim: 'lifecycle', layer: 'ops', type: 'single',
      stem: '新品期预算只有 $800/月，两种打法：A 集中打 3 个核心词冲首页；B 分散到 15 个长尾词先跑转化。你的选择和理由是：',
      options: [
        { id: 'a', text: '选 A，新品必须尽快拿到核心词位置，否则没流量', kind: 'wrong', note: '$800 打 3 个核心词，每个词每天不到 $9，在竞争类目里连首页的门槛都够不着，钱花了位置也没拿到。' },
        { id: 'b', text: '选 B，用长尾词先把 CVR 与评论基数做起来，再往核心词推进', kind: 'correct', note: '正确。预算有限时，长尾词 CPC 低、竞争小，能用同样的钱换到更多转化数据；这些数据是后续打核心词的弹药。' },
        { id: 'c', text: '一半给核心词、一半给长尾，两条腿走路', kind: 'order', note: '在 $800 这个量级上平均分配，结果是两边都跑不出样本：核心词买不到位置，长尾词也凑不够数据。' },
        { id: 'd', text: '全投自动广告，让系统自己找词', kind: 'assistant', note: '自动广告是探词工具，不是起量工具。全押自动等于把预算交给算法，且无法针对性积累某个词的权重。' }
      ],
      answer: ['b'],
      summary: '预算决定打法：小预算先做「能赢的小仗」（长尾词），大预算才谈「必争的大仗」（核心词）。反过来打，钱花完了位置也没拿到。'
    },
    {
      id: 'Q119', dim: 'lifecycle', layer: 'ops', type: 'single',
      stem: '断货 15 天后补上货，回来发现核心词自然排名从第 1 页掉到第 3 页，广告曝光也少了一半。你的恢复顺序是：',
      options: [
        { id: 'a', text: '先加广告预算抢回曝光与单量，用销量把排名顶回去', kind: 'correct', note: '正确。断货后排名下滑的主因是「销量与转化数据断了」，恢复的唯一路径是重新积累销量——广告是最快的加速器。' },
        { id: 'b', text: '先改标题和主图，重新做优化', kind: 'wrong', note: '排名下滑不是「页面不够好」，是「数据断了」。此时改页面会打断重新积累的过程，还引入新的变量。' },
        { id: 'c', text: '等一下，看看自然流量会不会自己回来', kind: 'assistant', note: '断货 15 天掉到第 3 页，等自然恢复基本等于放弃这条链接。自然排名不会自己涨回来。' },
        { id: 'd', text: '直接降价 20% 冲一波销量', kind: 'wrong', note: '降价能拉单，但会永久损伤价格带，而且恢复期需要的是「持续稳定的销量曲线」，不是一波脉冲。' }
      ],
      answer: ['a'],
      summary: '断货恢复的三步：先保可售（补货到位）、再重新积累销量（广告加速）、最后才谈优化。顺序反了，就是在一条没有数据的链接上做无用功。'
    },
    {
      id: 'Q120', dim: 'lifecycle', layer: 'ops', type: 'single',
      stem: '一款圣诞礼品，去年 12 月卖了 4000 件，今年 9 月你手上还没有备货。现在最该做的是：',
      options: [
        { id: 'a', text: '按去年销量的 70%–80% 备货，9 月底前下单，10 月中入仓', kind: 'correct', note: '正确。季节性产品的窗口是死的：海运 30–35 天 + 入仓与上架，9 月底下单刚好赶上 11 月的流量爬坡，12 月才到就晚了。' },
        { id: 'b', text: '等 10 月看趋势再决定，避免压货', kind: 'wrong', note: '等趋势明朗时，货已经来不及到了。季节性产品的核心是「提前押注」，不是「看数据再动」。' },
        { id: 'c', text: '按去年销量的 120% 备货，冲一波增长', kind: 'order', note: '方向可辩，但 20% 的增量对季节性产品风险很高：卖不掉就是 365 天库龄，明年款式可能已经过时。' },
        { id: 'd', text: '改做全年通用款，避开季节性风险', kind: 'wrong', note: '这等于换了一个产品和赛道，不是当下该做的决策。' }
      ],
      answer: ['a'],
      summary: '季节性产品的三条铁律：备货提前 3 个月、备货量打 7–8 折（宁缺勿压）、卖完就收（1 月前清完尾货，否则第二年就是超龄库存）。'
    },

    {
      id: 'Q121', dim: 'inventory', layer: 'ops', type: 'single',
      stem: '两个 SKU 同时告急，可用资金只够补一个：A 日均 25 单、还剩 6 天库存、净利率 18%；B 日均 6 单、还剩 20 天、净利率 22%。你补哪个：',
      options: [
        { id: 'a', text: '补 B，净利率更高，资金效率更好', kind: 'assistant', note: '只看净利率。B 还能撑 20 天，A 只剩 6 天——A 一旦断货，损失的是排名（不可逆），B 只是晚一点补。' },
        { id: 'b', text: '补 A：6 天后就断，断货代价是排名 + 恢复期广告费；B 还有 20 天缓冲，可以排下一批资金', kind: 'correct', note: '正确。这是典型的「时间尺度」判断：紧急性优先于利润率。' },
        { id: 'c', text: '各补一半，都不断货就行', kind: 'wrong', note: '各补一半的结果是两个都补不够：A 撑不过下一批到货，B 也进入低库存状态，两个链接一起掉。' },
        { id: 'd', text: '都不补，先把 B 的库存清掉换现金再补 A', kind: 'wrong', note: 'B 还有 20 天、净利率 22%，是健康链接，清它等于杀掉一个赚钱的链接去救另一个。' }
      ],
      answer: ['b'],
      summary: '补货优先级不看净利率，看「剩余可售天数 vs 补货总时长」的缺口。缺口最大的先救，这是资金受限时唯一的硬标准。'
    },
    {
      id: 'Q122', dim: 'inventory', layer: 'ops', type: 'single',
      stem: 'IPI 掉到 380，库容被砍，新品发不进去。手上有一批 400 件的货（库龄 200 天、日均 1 单）。你的处理顺序是：',
      options: [
        { id: 'a', text: '先把这批慢动销清掉（Coupon + 站外 + 捆绑），腾出库容，同时停掉新品的发货计划', kind: 'correct', note: '正确。IPI 的核心是「冗余库存比例」与「售出率」，只有清掉卖不动的才能提分；新品硬发进去只会让超仓费更高。' },
        { id: 'b', text: '先把新品发进去，IPI 后面再说', kind: 'wrong', note: '库容是硬约束，发不进去；就算部分能进，超仓费会按体积计，成本远高于清货让利。' },
        { id: 'c', text: '开 Case 向客服申诉提高库容', kind: 'assistant', note: '申诉不是主要路径。IPI 是算出来的，不是谈出来的——除非有明确的数据错误。' },
        { id: 'd', text: '把这批货转到海外仓，绕开 FBA 库容', kind: 'order', note: '技术上可行，但会产生二次入仓费与转运成本，且治不了 IPI（冗余库存在 FBA 里没变）。可以作为并行方案，不是首选。' }
      ],
      answer: ['a'],
      summary: 'IPI 低的解法只有两条：把冗余的清掉、把畅销的补上。「申诉」和「绕道」都不改变分子分母。'
    },
    {
      id: 'Q123', dim: 'inventory', layer: 'ops', type: 'single',
      stem: '海运还要 25 天到货，当前库存只够 10 天。日均 20 单、单件毛利 $4.5、空运每件多 $2.8。你的决策是：',
      options: [
        { id: 'a', text: '空运 15 天用量的货（约 300 件）补上缺口', kind: 'correct', note: '正确。缺口 15 天 × 20 单 = 300 件。断货损失约 $4.5 × 300 = $1350，空运溢价约 $2.8 × 300 = $840，空运净赚约 $510，还没算排名恢复成本。' },
        { id: 'b', text: '不空运，断货 15 天忍过去，省下空运费', kind: 'wrong', note: '省了 $840 的运费，亏了 $1350 的毛利，还要额外付排名恢复的广告费——这笔账是负的。' },
        { id: 'c', text: '全部 25 天的量都空运，一次补足', kind: 'order', note: '方向对但过量。海运 25 天后就到，空运只需要补「海运到货前的缺口」，多运的部分等于白付溢价。' },
        { id: 'd', text: '涨价 20% 降低销量，撑到海运到货', kind: 'assistant', note: '涨价能减速，但 10 天的库存撑不到 25 天，即使日均减半也只能到 20 天，还是会断。可以作为组合动作，不能单独用。' }
      ],
      answer: ['a'],
      summary: '空运的判定标准只有一条：断货损失（毛利口径）是否大于空运溢价。而且断货损失还要加上排名恢复成本，所以实际决策会更倾向空运。'
    },
    {
      id: 'Q124', dim: 'inventory', layer: 'ops', type: 'single',
      stem: '一批货库龄 300 天、还剩 600 件，日均 2 单，净利率 4%。距离 365 天超高费率还有 65 天。你的动作：',
      options: [
        { id: 'a', text: '立刻启动清货：Coupon + 捆绑 + 站外，目标是 65 天内清空，价格可以压到成本线附近', kind: 'correct', note: '正确。65 天内按日均 2 单只能卖 130 件，剩 470 件会进入超高费率区。清货价格底线是「成本 + 已发生的仓储费」，不是原定净利率。' },
        { id: 'b', text: '继续按原价卖，4% 净利虽然薄但还在赚', kind: 'assistant', note: '按这个速度 300 天都卖不完，跨过 365 天后每件每月的超龄费可能吃掉全部毛利甚至倒贴。' },
        { id: 'c', text: '直接销毁剩余库存，止损', kind: 'wrong', note: '销毁是最后手段（有销毁费且彻底损失货值）。在还剩 65 天、货还能卖的情况下销毁，是最贵的选项。' },
        { id: 'd', text: '先把广告停掉省成本，慢慢卖', kind: 'wrong', note: '停广告会让日均从 2 单掉到更低，等于主动延长清货周期，加速掉进超高费率区。' }
      ],
      answer: ['a'],
      summary: '超龄库存的临界点是「365 天」，一旦跨过，费率会跳涨到几倍。所以清货的真正 KPI 是「在 365 天前清空」，不是「卖多少钱」。'
    },
    {
      id: 'Q125', dim: 'inventory', layer: 'ops', type: 'single',
      stem: '工厂要求起订量 3000 件，你的月销只有 400 件、周转约 45 天。你的应对是：',
      options: [
        { id: 'a', text: '咬牙订 3000 件，单价低，摊薄成本更划算', kind: 'assistant', note: '3000 件按 400/月要卖 7.5 个月，加上在途时间，库龄很快冲过 200 天，资金占用也翻了近一倍——省下的单价远不够付仓储与资金成本。' },
        { id: 'b', text: '先谈分批提货（一次 1000 件、3 个月提完），或用两个颜色合计到起订量', kind: 'correct', note: '正确。起订量是谈判项，不是硬约束：分批提货、合并 SKU 凑量、接受略高单价换小批量，都是常规解法。' },
        { id: 'c', text: '换供应商，找起订量更低的', kind: 'order', note: '可以作为备选，但换供应商有打样、验厂、品质风险，成本不一定更低。先谈再换。' },
        { id: 'd', text: '订 3000 件，然后靠降价冲量消化', kind: 'wrong', note: '为了消化库存而降价，等于用利润换周转，但库存压力并没有解决，只是把问题从「压货」变成「压货 + 低毛利」。' }
      ],
      answer: ['b'],
      summary: '起订量问题的解法优先级：谈分批 > 合并 SKU 凑量 > 接受溢价换小批 > 换供应商。直接接受大起订量，是把资金压力全扛在自己身上。'
    },
    {
      id: 'Q126', dim: 'inventory', layer: 'ops', type: 'single',
      stem: '旺季前 2 个月，去年旺季销量是平时的 3 倍，今年预计类似。平时日均 20 单，采购 25 天 + 海运 30 天 + 入仓 10 天。备货量怎么定：',
      options: [
        { id: 'a', text: '按旺季日均 60 单 ×（65 天周期 + 缓冲）算，再留 20% 弹性，但要同时准备「卖不掉就清货」的预案', kind: 'correct', note: '正确。旺季备货要按旺季日均算周期需求，同时必须预设清货方案——旺季压货是最容易变成超龄库存的场景。' },
        { id: 'b', text: '按平时日均 20 单备货，保险', kind: 'wrong', note: '按平时备货，旺季一开始就断货，等于把一年最好的销售窗口让给竞品。' },
        { id: 'c', text: '按旺季 3 倍满负荷备，越多越好', kind: 'order', note: '方向对但没有上限。旺季销量是预测，压多了就是超龄库存，且旺季过后需求断崖。' },
        { id: 'd', text: '先备一半，看 11 月数据再补', kind: 'wrong', note: '补货周期 65 天，11 月看数据、1 月才到货，旺季已经结束。' }
      ],
      answer: ['a'],
      summary: '旺季备货 = 旺季日均 × 总周期 × 弹性系数，且必须配一个清货预案。没有清货预案的旺季备货，本质是在赌预测准确。'
    },
    {
      id: 'Q127', dim: 'inventory', layer: 'ops', type: 'single',
      stem: '一批货在途（还要 20 天到），但上周销量突然翻倍（从日均 15 涨到 30）。你的动作：',
      options: [
        { id: 'a', text: '先查销量上涨的原因（促销结束？竞品断货？内容爆了？），再判断是短期脉冲还是趋势，然后决定是否追单', kind: 'correct', note: '正确。翻倍有很多种原因，只有「可持续的需求上升」才值得追单；如果是竞品临时断货带来的，追单会变成压货。' },
        { id: 'b', text: '立刻追单，趁热打铁', kind: 'assistant', note: '没归因就追单。如果是短期脉冲（比如某条内容爆了三天），20 天后货到，需求已经回落，直接变滞销。' },
        { id: 'c', text: '不追单，按原计划走', kind: 'wrong', note: '如果确实是趋势性上涨，不追单会在 20 天后断货，把增长机会让出去。' },
        { id: 'd', text: '临时涨价 15% 压住销量，等货到了再降回来', kind: 'order', note: '可以作为短期控速手段，但在需求上升期涨价会损伤转化与排名，且 20 天内反复调价对链接不友好。' }
      ],
      answer: ['a'],
      summary: '追单的前提是「归因清楚」。销量翻倍的常见原因有四种：促销、竞品缺货、内容爆发、真实需求增长——只有最后一种值得追加备货。'
    },

    {
      id: 'Q128', dim: 'profit', layer: 'ops', type: 'single',
      stem: '某 ASIN 售价 $34.99，算完净利只有 3.8%（约 $1.33）。四项成本占比：出厂 26%、FBA+佣金 26%、广告 24%、退货与杂费 20%。你最先动哪一项：',
      options: [
        { id: 'a', text: '先压广告（24%）：查高花费 0 转化的词做否定，把 ACOS 从 24% 降到 18%', kind: 'correct', note: '正确。四项里广告是唯一「可以快速、可控地压下来」的一项：否词与降 bid 一周内见效，且不损伤产品与价格。' },
        { id: 'b', text: '先压出厂成本：换更便宜的供应商', kind: 'order', note: '方向可辩，但换供应商有品质与交期风险，周期 2–3 个月，且这个产品的成本占比（26%）本身不算离谱。' },
        { id: 'c', text: '先提价 10%，净利率立刻就上去了', kind: 'wrong', note: '提价会先杀转化率，单量掉了广告占比反而更高，净利可能更差。提价必须配合转化率测试，不能直接上。' },
        { id: 'd', text: '这个产品不赚钱，直接清货淘汰', kind: 'assistant', note: '3.8% 净利还没到「必须淘汰」的程度，先试一轮成本优化，跑不动再淘汰才是正常顺序。' }
      ],
      answer: ['a'],
      summary: '净利薄时的动作优先级：先动「见效快、可控、不伤根本」的项（广告 > 退货 > 杂费），再动「周期长、有风险」的项（供应商、定价）。'
    },
    {
      id: 'Q129', dim: 'profit', layer: 'ops', type: 'single',
      stem: '竞品同款降价 15%，你的 CVR 掉了 2 个百分点，当前净利率 12%。你的决策是：',
      options: [
        { id: 'a', text: '算清跟价后的净利率，如果低于 8% 就不跟，改用 Coupon 短期对冲 + 找非价格差异', kind: 'correct', note: '正确。跟价前先算底线：降到净利率 8% 以下，等于用利润换一个不确定的单量，且对方可能继续降。' },
        { id: 'b', text: '立刻跟降 15%，把单量抢回来再说', kind: 'assistant', note: '没算底线就跟价。价格战里先跟价的一方通常输，因为你不知道对方的成本结构。' },
        { id: 'c', text: '不跟，什么都不做', kind: 'wrong', note: 'CVR 已经掉了 2 个点，不做任何应对等于把份额让出去，而且掉单会连带排名下滑。' },
        { id: 'd', text: '提价 5% 对冲，用更高毛利覆盖单量损失', kind: 'wrong', note: '在竞品降价、你已经掉转化的时候提价，是把转化率再往下推一把。' }
      ],
      answer: ['a'],
      summary: '价格战的三步：先算自己的净利底线、再用可回收手段对冲（Coupon）、最后找非价格差异。直接跟价是最后选项，不是第一反应。'
    },
    {
      id: 'Q130', dim: 'profit', layer: 'ops', type: 'single',
      stem: '某 ASIN 毛利率 32%、ACOS 25%、退货率 14%、净利率 2.1%。老板问「这个链接到底赚不赚钱」。你的回答是：',
      options: [
        { id: 'a', text: '基本不赚钱：14% 的退货率吃掉了大部分毛利，要先拆退货原因（尺码/预期/质量），解决后再谈广告优化', kind: 'correct', note: '正确。32% 毛利 − 25% 广告 = 7%，再扣 14% 退货损耗就接近零了。退货是当前的主因，不解决它，优化广告没有意义。' },
        { id: 'b', text: '赚钱，净利率还有 2.1%，说明模型成立', kind: 'assistant', note: '2.1% 的净利在任何意外（一次旺季附加费、一次退货高峰）下都会转负，这不是「成立」，是「随时会崩」。' },
        { id: 'c', text: '不赚钱，直接清货', kind: 'wrong', note: '跳过诊断。退货率高是可以修的（描述不符就改 Listing、质量问题就换供应商），直接清货等于放弃了修复价值。' },
        { id: 'd', text: '把 ACOS 从 25% 压到 15%，净利率就能到 12%', kind: 'order', note: '算错了：压 10 个点 ACOS 只能拿回 10 个点，净利到 12% 的前提是退货率不变——但退货率 14% 才是主因。' }
      ],
      answer: ['a'],
      summary: '「毛利率 32% 为什么不赚钱」这道题的答案几乎永远在退货率里。修退货（改描述、改产品）是提升净利最快的杠杆，比压广告快得多。'
    },
    {
      id: 'Q131', dim: 'profit', layer: 'ops', type: 'single',
      stem: 'FBA 配送费上涨 $0.6，你的售价 $29.99、净利率 15%。关于调价，你的做法是：',
      options: [
        { id: 'a', text: '先小幅提价 $0.5–1（约 2%–3%）并观察两周 CVR 变化，同时同步压广告与退货成本', kind: 'correct', note: '正确。$0.6 占售价 2%，提 2%–3% 能覆盖，但必须测 CVR 反应；同时用其他项省钱，避免把成本全压在价格上。' },
        { id: 'b', text: '一分不涨自己扛，保持价格竞争力', kind: 'assistant', note: '$0.6 直接吃掉 2 个点净利（15% → 13%）。如果每单都亏这笔，全年就是实打实的利润流失。' },
        { id: 'c', text: '一次涨 $2 把成本转嫁干净', kind: 'wrong', note: '涨 6.7% 在标品类目里足以让 CVR 明显下滑，而且价格排名会掉，得不偿失。' },
        { id: 'd', text: '不提价，直接降产品质量来压成本', kind: 'wrong', note: '降质会带来差评与退货，两个成本项一起恶化，比 $0.6 贵得多。' }
      ],
      answer: ['a'],
      summary: '成本上涨的应对顺序：先算占售价比例 → 小幅提价并测 CVR → 同步压其他成本项。一口气全转嫁，掉的是单量与排名。'
    },
    {
      id: 'Q132', dim: 'profit', layer: 'ops', type: 'single',
      stem: '某 SKU 毛利率 48%，净利率只有 4%。这个「钱去哪了」的诊断顺序是：',
      options: [
        { id: 'a', text: '先看广告占比，再看退货率，最后看提成与杂费', kind: 'correct', note: '正确。毛利率 48% 到净利 4%，中间差了 44 个点，广告与退货是最大的两个黑洞，按「影响量级」排序查。' },
        { id: 'b', text: '先查是不是算错了成本', kind: 'assistant', note: '先怀疑数据而不是先看结构。真算错当然可能，但概率上「广告 + 退货」吃掉毛利更常见。' },
        { id: 'c', text: '先看物流费用', kind: 'order', note: '物流（头程 + FBA）通常已计入毛利，除非毛利口径不对。它一般不是 44 个点差距的主因。' },
        { id: 'd', text: '毛利率这么高，应该没问题，净利率 4% 是阶段性的', kind: 'wrong', note: '48% 毛利只留 4% 净利，说明中间有巨额漏损，不做诊断就是放弃这 44 个点。' }
      ],
      answer: ['a'],
      summary: '毛利到净利的漏损，按量级排序几乎永远是：广告 > 退货 > 提成与杂费。诊断从最大的漏口开始，不要从最小的开始。'
    },
    {
      id: 'Q133', dim: 'profit', layer: 'ops', type: 'single',
      stem: '新品定价：竞品价格带 $24.99–$32.99，你的全成本算下来盈亏平衡价是 $26.5，目标净利率 15% 对应售价 $31.5。你的定价是：',
      options: [
        { id: 'a', text: '定 $31.99，落在价格带上沿，用「差异化卖点 + A+ 视觉」支撑，并准备 $29.99 的 Coupon 作为弹性', kind: 'correct', note: '正确。$31.99 在价格带内、接近目标净利，Coupon 提供了「标价守利润、实付有竞争力」的弹性。' },
        { id: 'b', text: '定 $24.99，贴着竞品下沿抢份额', kind: 'wrong', note: '$24.99 低于盈亏平衡价 $26.5，每单都在亏。新品期可以亏，但不能亏在定价结构上。' },
        { id: 'c', text: '定 $35.99，把利润留足', kind: 'wrong', note: '超出价格带上沿，新品没有评论和品牌背书，这个价格几乎没有转化机会。' },
        { id: 'd', text: '定 $26.99，先贴着成本卖，跑起来再涨', kind: 'order', note: '方向可以理解，但 $26.99 只比盈亏平衡高 $0.5，任何一次费用波动就转负；而且后续涨价会掉排名。' }
      ],
      answer: ['a'],
      summary: '定价三步：先算盈亏平衡价（下限）、再算目标净利价（上限）、最后看这个区间在不在竞品价格带里。在带内取上沿，用差异化支撑；不在带内，说明这个产品做不了。'
    },
    {
      id: 'Q134', dim: 'profit', layer: 'ops', type: 'single',
      stem: '做一次 20% 折扣的促销，算下来净利会变成 −2%。运营说「冲单量、拉排名，亏一点值得」。你的判断：',
      options: [
        { id: 'a', text: '先算「亏多少、换多少单、排名能撑多久」，如果总亏损可控且能换来可留存的自然排名，可以有限度做', kind: 'correct', note: '正确。亏损促销不是不能做，但必须量化：总亏损金额、预期带来的单量与排名、以及排名能在促销后维持多久。' },
        { id: 'b', text: '做，冲单量最重要，短期亏损可以接受', kind: 'assistant', note: '没有量化就承诺亏损。−2% 净利 × 促销单量 = 实亏，如果促销后排名回落，这笔钱就是纯损失。' },
        { id: 'c', text: '不做，任何负毛利的活动都不参加', kind: 'order', note: '过于绝对。清货期、新品冷启动、大促卡位，这三种场景下负毛利投放是有正当理由的。' },
        { id: 'd', text: '把折扣降到 10%，让净利刚好为正', kind: 'wrong', note: '10% 折扣在促销季里没有竞争力，等于既没拿到量也没拿到排名，还损失了 10% 的毛利。' }
      ],
      answer: ['a'],
      summary: '亏损促销的决策标准是「可量化 + 可留存」：亏多少算得清、换来的排名能维持、后续能把钱赚回来。三者缺一，就是纯烧钱。'
    },

    {
      id: 'Q135', dim: 'compliance', layer: 'ops', type: 'single',
      stem: '账户状况页显示 ODR 1.1%，已经越线。你最先做的是：',
      options: [
        { id: 'a', text: '立刻拆开这 1.1% 的来源（差评/A-to-Z/拒付各占多少），先处理正在恶化的一类，同时把所有在途订单的履约风险控住', kind: 'correct', note: '正确。ODR 是三类之和，先定位是哪一类在涨；同时要防止它继续上升（比如把发货时效改长、暂停高风险订单）。' },
        { id: 'b', text: '开 Case 向亚马逊申诉，说明是偶发情况', kind: 'assistant', note: '申诉不是第一步。ODR 是按 60 天滚动算出来的客观数据，没有可申诉的「错误」时，申诉不会改变数字。' },
        { id: 'c', text: '暂停所有广告，减少订单量来降低 ODR', kind: 'wrong', note: 'ODR 是比率不是绝对值，减少订单不会改变比率；而且停广告会让销量与排名一起掉。' },
        { id: 'd', text: '等 60 天，让旧订单滚出去', kind: 'order', note: '滚动窗口确实会自我修复，但 60 天内如果继续产生缺陷单，比率会持续上升甚至触发审核。不能只等。' }
      ],
      answer: ['a'],
      summary: 'ODR 越线的处理顺序：拆来源 → 止血（防止继续产生缺陷单）→ 处理存量（联系客户、补偿）→ 等滚动窗口过期。只等不动是最危险的。'
    },
    {
      id: 'Q136', dim: 'compliance', layer: 'ops', type: 'single',
      stem: '服务商主动联系你：「可以帮你 15 天做到 100 单，还带 5 星评价，价格很便宜。」你会：',
      options: [
        { id: 'a', text: '明确拒绝，并把这个情况同步给主管（避免团队其他人被单独接触）', kind: 'correct', note: '正确。刷单与操纵评论是封店级红线，而且这类服务商往往同时掌握你的账号信息，风险不止于刷单本身。' },
        { id: 'b', text: '先小批量试 10 单，看效果再说', kind: 'wrong', note: '刷单没有「小批量安全」这回事。10 单和 100 单在平台的判定逻辑里是同一类违规。' },
        { id: 'c', text: '不理他就行，不用上报', kind: 'order', note: '个人不理不够。要同步给团队，因为服务商通常会同时接触多个运营，团队里有人接了，账号一样受影响。' },
        { id: 'd', text: '让他先给个方案，看看他们怎么操作', kind: 'wrong', note: '索要方案等于开始接触。一旦留有沟通记录，在平台审查时反而是不利证据。' }
      ],
      answer: ['a'],
      summary: '服务商类诱惑的处理：明确拒绝 + 团队同步。个人守住不够，因为账号风险是全团队共担的。'
    },
    {
      id: 'Q137', dim: 'compliance', layer: 'ops', type: 'single',
      stem: '收到外观专利侵权投诉，链接被下架。你确认产品确实是自主开模，但确实和对方有相似之处。你的处理顺序是：',
      options: [
        { id: 'a', text: '先看投诉方专利的具体权利要求范围与申请日，比对自家开模时间与设计差异，再决定是申诉还是改款', kind: 'correct', note: '正确。外观专利看的是「整体视觉效果是否近似」和「申请日先后」，先比时间与设计差异，再决定路径。' },
        { id: 'b', text: '立刻申诉，强调是自主开模', kind: 'assistant', note: '「自主开模」不等于不侵权。外观专利保护的是视觉效果，不是谁先开模；不比对权利要求就申诉，大概率被驳回。' },
        { id: 'c', text: '直接联系投诉方私了，付授权费', kind: 'order', note: '可以作为选项之一，但在没搞清专利有效性与自身立场前就付费，等于承认侵权并放弃了抗辩空间。' },
        { id: 'd', text: '换个账号重新上架同款', kind: 'wrong', note: '这是最危险的做法：重复侵权 + 账号关联，两条红线一起踩。' }
      ],
      answer: ['a'],
      summary: '侵权投诉的处理顺序：看权利要求与申请日 → 比对设计差异 → 决定申诉/改款/授权。直接申诉或直接私了，都是跳过事实核查。'
    },
    {
      id: 'Q138', dim: 'compliance', layer: 'ops', type: 'single',
      stem: '收到「账户关联」警告，提示你与另一个店铺存在关联。你确实用同一个手机号注册过两个账号。你的处理是：',
      options: [
        { id: 'a', text: '如实准备申诉材料，说明两个账号的关系与业务独立性，同时立刻隔离所有共用信息（网络、设备、收款、联系方式）', kind: 'correct', note: '正确。关联申诉的关键是「证明两个账号独立运营、无交叉」，而不是否认关联事实——平台的数据比你的解释更硬。' },
        { id: 'b', text: '否认关联，说系统误判', kind: 'wrong', note: '同一个手机号是明确的关联证据，否认会被直接判定为不诚信，申诉通道关闭。' },
        { id: 'c', text: '立刻注销其中一个账号', kind: 'wrong', note: '在申诉期注销账号，会被视为规避审查，两个账号可能一起受限。' },
        { id: 'd', text: '等警告自动消失', kind: 'assistant', note: '关联警告不会自己消失，处理窗口有限，拖过去就是封店。' }
      ],
      answer: ['a'],
      summary: '关联申诉的核心是「承认事实 + 证明独立」：不否认关联，但要证明两个账号在运营、资金、供应链上完全独立，且已做彻底隔离。'
    }
  );

  /* ============================================================
     多选 10 题（Q139–Q148）
     lifecycle 3 · inventory 3 · profit 2 · compliance 2
     ============================================================ */
  DATA.MCQ.push(
    {
      id: 'Q139', dim: 'lifecycle', layer: 'ops', type: 'multi',
      stem: '以下哪些信号说明一个 ASIN 应该进入清货，而不是「再卖一段时间看看」？（多选）',
      options: [
        { id: 'a', text: '库龄逼近 365 天，按当前日均算卖不完，即将进入超高费率区', kind: 'correct', note: '正确。这是最硬的信号：跨过 365 天费率跳涨，持有成本会超过货值。' },
        { id: 'b', text: '连续 3 个月净利为负，且已排除了广告与定价的可优化空间', kind: 'correct', note: '正确。亏损可救才叫「优化」，试过所有可动项仍然为负，就是「亏损无救」，该清。' },
        { id: 'c', text: '产品被竞品迭代（同价位新款功能更强），你的老款还有大量库存', kind: 'correct', note: '正确。产品力差距无法靠运营弥补，库存越多越该早清。' },
        { id: 'd', text: '本月单量环比下滑 15%', kind: 'wrong', note: '错误。单月下滑可能是季节、促销节奏或偶发因素，不足以触发清货。清货是重决策，需要趋势级证据。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '清货的三个触发条件：超龄库存（时间到）、亏损无救（算过账）、被迭代（产品力出局）。单月波动不算——否则每个链接都会被清掉一轮。'
    },
    {
      id: 'Q140', dim: 'lifecycle', layer: 'ops', type: 'multi',
      stem: '成熟期老品（上架 2 年，TACOS 从 11% 升到 17%，自然单占比从 70% 降到 52%）。以下哪些动作是对的？（多选）',
      options: [
        { id: 'a', text: '剥离「广告在承接本可自然成交的词」，收缩品牌词与核心大词的投放', kind: 'correct', note: '正确。成熟期的核心矛盾是广告效率衰减，先把无效补贴剥掉。' },
        { id: 'b', text: '把预算转向竞品拦截与再营销，抢增量而不是买存量', kind: 'correct', note: '正确。守存量靠自然排名，增量才靠广告。' },
        { id: 'c', text: '检查价格带与评论是否被竞品拉开，必要时做小幅价格或内容调整', kind: 'correct', note: '正确。自然单下滑往往同时有竞争因素，不只是广告问题。' },
        { id: 'd', text: '加大广告预算抢份额，用规模把 TACOS 摊薄', kind: 'wrong', note: '错误。TACOS 已经在升，加预算只会把「补贴」放大。摊薄的前提是效率不变，而这里效率在恶化。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '成熟期的动作逻辑：先把广告从「买存量」转成「买增量」，再补产品与价格竞争力。加预算是最不该做的第一反应。'
    },
    {
      id: 'Q141', dim: 'lifecycle', layer: 'ops', type: 'multi',
      stem: '新品冷启动第 1–3 周，以下哪些做法是不该做的？（多选）',
      options: [
        { id: 'a', text: '为了把 ACOS 压到毛利率以下，把核心词 bid 降到最低', kind: 'wrong', note: '正确选项（这是不该做的）。冷启动期 ACOS 高于毛利是常态，压到毛利以下意味着放弃排名积累。' },
        { id: 'b', text: '在评论只有 2 条时大幅加预算冲首页', kind: 'wrong', note: '正确选项（这是不该做的）。评论太少，转化接不住，加预算只是把人引到一个转化不了的页面。' },
        { id: 'c', text: '同时开 SP、SB、SD、DSP 四条线覆盖全漏斗', kind: 'wrong', note: '正确选项（这是不该做的）。SB/SD 需备案、DSP 有预算门槛，且转化模型未建立时铺全漏斗是浪费。' },
        { id: 'd', text: '跑满 7 天再拉搜索词报告，不急着否定', kind: 'correct', note: '这是该做的，不是不该做的——所以不选。7 天窗口是 SP 闭环的硬要求。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '冷启动期最贵的三个错误：过早压 ACOS、评论不足就冲量、铺全漏斗。三者的共同点是「在基础不具备时追求结果」。'
    },
    {
      id: 'Q142', dim: 'inventory', layer: 'ops', type: 'multi',
      stem: '算补货量时，必须纳入计算的因素有哪些？（多选）',
      options: [
        { id: 'a', text: '加权日均销量（7 天 × 70% + 30 天 × 30%）', kind: 'correct', note: '正确。日均是公式的乘数，用错口径整个结果就错。' },
        { id: 'b', text: '采购周期 + 头程时效 + 入仓缓冲', kind: 'correct', note: '正确。这三段构成总周期，缺一段就会算少。' },
        { id: 'c', text: '安全库存（应对需求波动与到货延误）', kind: 'correct', note: '正确。没有安全库存的补货计划，遇到任何波动就断货。' },
        { id: 'd', text: '当前售价', kind: 'wrong', note: '错误。售价影响利润，不影响补多少件。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '补货量 = 日均 × 总周期 + 安全库存 − 当前总库存（含在途与本地）。三个乘数项缺一不可，售价不在其中。'
    },
    {
      id: 'Q143', dim: 'inventory', layer: 'ops', type: 'multi',
      stem: 'IPI 低于 400 被限仓，可能的原因有哪些？（多选）',
      options: [
        { id: 'a', text: '冗余库存比例高：长期卖不动的货占了大量库容', kind: 'correct', note: '正确。这是最直接的一项，清货能立刻改善。' },
        { id: 'b', text: '售出率低：同样库存卖得慢', kind: 'correct', note: '正确。售出率是 IPI 的核心项之一，提升转化或降价促销都能拉。' },
        { id: 'c', text: '存在无在售信息的库存（链接下架但货还在仓里）', kind: 'correct', note: '正确。这部分占库容且完全无法产生销售，是纯粹的分数拖累。' },
        { id: 'd', text: '广告 ACOS 偏高', kind: 'wrong', note: '错误。ACOS 影响利润，不进入 IPI 的计算。把 IPI 和广告混为一谈，说明没看过库存绩效页。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: 'IPI 四项：冗余库存比例、售出率、无在售信息库存、滞留库存。这四项里没有一项与广告直接相关。'
    },
    {
      id: 'Q144', dim: 'inventory', layer: 'ops', type: 'multi',
      stem: '断货的真实代价包含哪些？（多选）',
      options: [
        { id: 'a', text: '缺货期间的销售损失（单量 × 单件毛利）', kind: 'correct', note: '正确。这是最直观的一项，但往往只是总代价的一小部分。' },
        { id: 'b', text: '排名下滑后，重新买回位置所需的广告成本', kind: 'correct', note: '正确。断货 15 天掉到第 3 页，恢复期的广告投入通常高于缺货损失本身。' },
        { id: 'c', text: '断货期继续跑广告造成的无效花费', kind: 'correct', note: '正确。点击进来看到无货或长配送时间，转化极低，等于纯烧钱还拉低转化权重。' },
        { id: 'd', text: 'FBA 仓储费上涨', kind: 'wrong', note: '错误。断货时库存为零，仓储费只会减少不会上涨。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '断货代价 = 缺货损失 + 排名恢复成本 + 断货期的无效广告。三项里最容易被低估的是第二项，它通常最大。'
    },
    {
      id: 'Q145', dim: 'profit', layer: 'ops', type: 'multi',
      stem: '「毛利率 40% 却不赚钱」，以下哪些是常见的隐藏成本？（多选）',
      options: [
        { id: 'a', text: '退货损耗（来回运费、无法二次销售的折价、处理费）', kind: 'correct', note: '正确。退货率 10% 意味着每 10 单有 1 单要吞掉运费与折损。' },
        { id: 'b', text: '广告费用（新品期或竞争激烈时能吃掉 20%+ 的售价）', kind: 'correct', note: '正确。广告是毛利到净利之间最大的漏口。' },
        { id: 'c', text: '运营提成与服务费', kind: 'correct', note: '正确。按销售额提成的结构下，这笔钱是随销量线性增长的固定漏损。' },
        { id: 'd', text: '产品研发的一次性投入', kind: 'wrong', note: '错误。研发是沉没成本/摊销项，不进单件成本口径；把它算进单件净利会低估真实盈利能力。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '毛利到净利的三个主要漏口：退货、广告、提成。这三个不在「毛利率」里，但在「净利率」里——这就是「毛利率看着很好、年底一算没赚钱」的原因。'
    },
    {
      id: 'Q146', dim: 'profit', layer: 'ops', type: 'multi',
      stem: '给新品定价时，以下哪些是必须考虑的？（多选）',
      options: [
        { id: 'a', text: '自己的盈亏平衡售价（全成本 ÷（1 − 佣金等比例项））', kind: 'correct', note: '正确。这是定价的下限，低于它每单都在亏。' },
        { id: 'b', text: '目标净利率反推出的目标售价', kind: 'correct', note: '正确。这是定价的上限参考，决定这笔生意值不值得做。' },
        { id: 'c', text: '竞品价格带与该价格带内的评论壁垒', kind: 'correct', note: '正确。价格必须落在客户会考虑的范围里，同时要评估同价位对手的评论优势。' },
        { id: 'd', text: '自己的成本结构是否比竞品低', kind: 'wrong', note: '错误。这一点属于选品阶段的可行性判断，不是定价的输入项——定价看的是价格带与自己的盈亏线，不是对手的成本。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '定价三步：算下限（盈亏平衡）、算上限（目标净利）、看价格带能否容纳。三步走完还站不住，说明这个产品在当前成本结构下做不了。'
    },
    {
      id: 'Q147', dim: 'compliance', layer: 'ops', type: 'multi',
      stem: '以下哪些行为属于「封店级」红线？（多选）',
      options: [
        { id: 'a', text: '刷单、测评、以补偿换取好评（操纵评论）', kind: 'correct', note: '正确。平台明令禁止，处罚是账号级。' },
        { id: 'b', text: '同主体多店铺共用收款账户或网络环境，被判定关联', kind: 'correct', note: '正确。关联一旦成立，多个店铺一起受限。' },
        { id: 'c', text: '虚假发货（标记已发货但实际未发、或无有效追踪号）', kind: 'correct', note: '正确。属于欺诈类违规，同时击穿 VTR 与 ODR。' },
        { id: 'd', text: '在主图里使用纯白背景、产品占画面 85%', kind: 'wrong', note: '错误。这符合主图规范，不是违规。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '封店级红线的两类：身份问题（关联、资料造假）与行为问题（操纵评论、虚假发货）。其余多为警告级，风险量级差一个数量级。'
    },
    {
      id: 'Q148', dim: 'compliance', layer: 'ops', type: 'multi',
      stem: '选品阶段做知识产权初筛，要查哪些类型？（多选）',
      options: [
        { id: 'a', text: '商标：产品名、Logo、甚至某些外观特征是否已被注册', kind: 'correct', note: '正确。商标投诉是最快的下架路径，且申诉周期长。' },
        { id: 'b', text: '外观设计专利：整体视觉效果是否与在先专利近似', kind: 'correct', note: '正确。外观专利看「整体视觉效果」，不是逐点比对。' },
        { id: 'c', text: '发明专利/实用新型：结构、功能实现方式是否落入权利要求范围', kind: 'correct', note: '正确。这类最容易被忽略，因为看不见摸不着，但一旦命中就是致命。' },
        { id: 'd', text: '竞品是否做了品牌备案', kind: 'wrong', note: '错误。竞品有没有备案与你的侵权风险无关；你要查的是「自己是否侵犯他人的在先权利」。' }
      ],
      answer: ['a', 'b', 'c'],
      summary: '知识产权三类：商标（名字与标识）、外观专利（长什么样）、发明专利与实用新型（怎么实现）。三类都可能在选品阶段就踩到，也都可能导致链接直接消失。'
    }
  );

  /* ============================================================
     简答 5 题（S29–S33）
     ============================================================ */
  DATA.SHORT.push(
    {
      id: 'S29', dim: 'lifecycle', layer: 'ops', title: 'ACOS 达标了，但单量掉了，算优化成功吗',
      prompt: '你把一个链接的 ACOS 从 52% 压到 28%（毛利率 30%），但日均单量从 30 掉到 17，自然单占比从 32% 降到 21%。主管问：「这算优化成功吗？」请说明你的判断依据和下一步。',
      checklist: [
        '不把「ACOS 下降」直接等同于「优化成功」，先看三个配套指标',
        '指出单量掉 43%、自然单占比下滑说明广告在丢支撑排名的量',
        '给出「健康收缩」与「过度收缩」的区分标准（TACOS 与自然单占比的方向）',
        '说明下一步：定位是哪个动作收过头（否词过狠/bid 降太多/预算砍太狠），针对性放开',
        '给出可验证的观察指标与时间窗（如两周内单量回到 25、自然单占比回到 28%）'
      ],
      reference: '不能算成功，只能说「账面变好看了」。判断是否优化成功，我只看三个指标的方向是否一致：ACOS 下降、自然单占比上升、TACOS 下降。现在 ACOS 降了，但单量掉了 43%、自然单占比从 32% 掉到 21%——这说明我们砍掉的不是无效流量，而是支撑排名的有效流量。广告单占比反而从 68% 升到 79%，等于链接对广告的依赖更重了，这是反向优化。下一步我会做三件事：第一，拉这两周的搜索词报告，看是哪些词被否掉或降 bid 后直接断量，把其中「有点击、有单、只是 ACOS 略高」的词放回来；第二，把预算从「平均压」改成「集中投」，把钱给到 CVR 最高的 5–8 个词，让单量先回来；第三，设一个明确的观察线：两周内日均单量回到 25 以上、自然单占比回到 28%，如果没回到，说明砍得太狠需要恢复原来的结构。我的判断标准很简单：优化成功的标志是「花更少的钱买到同样的排名」，而不是「花更少的钱买到更少的排名」。',
      pitfalls: '踩坑答法是「ACOS 降了一半，这是很好的成绩」——只盯一个指标。主管问这句话，测的就是你会不会用漂亮的单指标掩盖规模萎缩。'
    },
    {
      id: 'S30', dim: 'inventory', layer: 'ops', title: 'IPI 掉到 380，库容被砍，怎么救',
      prompt: '季度 IPI 只有 380，库容被砍到原来的一半，新品发不进去，旺季马上到。你手上有三批货：A 库龄 320 天、日均 1 单；B 库龄 90 天、日均 12 单、但已断货；C 库龄 45 天、日均 3 单、净利率 25%。请给出你的处理顺序和货位分配。',
      checklist: [
        '先算清楚三批货的「库容占用 vs 产出」，把清货的、保的、补的分开',
        'A（超龄、慢动销）优先清货腾库容，用 Coupon/捆绑/站外，必要时接受亏损',
        'B（快动销、已断货）优先补货，它是 IPI 售出率的主要贡献者',
        'C（净利率高但动销一般）按最小批量补，控制库容占用',
        '给出提分的时间表与验证指标（下一季度 IPI 目标、冗余库存比例）'
      ],
      reference: '我先按「每立方英尺产出」把三批货排队。A 是最该处理的：库龄 320 天、日均 1 单，它占着库容却几乎不产生销售，是 IPI 的直接拖累，而且 45 天后就进超高费率区。处理方式是立刻清货——Coupon + 捆绑 C + 站外，价格压到成本线附近也可以接受，因为继续放着每件每月都在烧仓储费。B 是唯一该优先补货的：日均 12 单还在断货，它是「售出率」的主要贡献者，把 B 补上，IPI 的售出率会立刻改善。C 净利率 25%、动销一般，按最小批量补一批，不要因为毛利高就多压。库容分配上，先给 B，剩下的给 C，A 一件都不补。时间表我会这么定：两周内把 A 清掉一半，一个月内清完；B 两周内到货；下一季度 IPI 目标是 420 以上，验证指标是冗余库存比例降到 15% 以下。如果一个月后 A 还剩三成以上，我会考虑直接走站外批量清，哪怕价格更低——库容是硬约束，卡在这里新品永远发不进去。',
      pitfalls: '常见踩坑是「哪个赚钱保哪个」——C 净利率最高就猛补 C。但 IPI 看的是冗余库存与售出率，C 动销一般，压多了反而拉低分数。正确顺序是「先清拖累项、再保产出项」。'
    },
    {
      id: 'S31', dim: 'profit', layer: 'ops', title: '老板要降价 10% 冲量，这笔账怎么算',
      prompt: '老板说：「竞品卖得比我们好，你降价 10% 冲一波量。」你当前售价 $34.99、净利率 12%。请说明你会怎么算这笔账、给什么建议。',
      checklist: [
        '先算降价 10% 对单件净利的绝对影响（售价降 10% ≈ 净利降 30% 以上）',
        '算出「要卖多少单才能补回总利润」的盈亏平衡增量（降 10% 通常需要涨 40%+ 单量）',
        '指出降价可回收性差（历史最低价影响后续 Deal、价格带难回）',
        '给出替代方案：Coupon 短期对冲、捆绑提升客单、非价格差异（内容/评论/服务）',
        '给出验证方式与决策条件（什么情况下可以真降、什么时候必须停）'
      ],
      reference: '我会先算三个数。第一，降价 10% 后单件净利的变化：售价从 $34.99 降到 $31.49，少了 $3.5，而当前单件净利只有 $4.2（12%），降价后只剩 $0.7，净利率从 12% 掉到 2.2%——净利掉了 83%，不是 10%。第二，要补回原来的总利润，单量得涨多少：利润率从 12% 掉到 2.2%，需要约 5.4 倍的单量才能持平，这在任何类目都不现实。第三，降价的不可逆性：售价一旦降下去，历史最低价记录会影响后续秒杀与 Deal 资格，而且价格带掉下去很难涨回来。所以我的建议是不直接降价，改用三个替代方案：一是挂 10% Coupon，实付等效降价但挂牌价不动，随时可撤；二是做捆绑（主体 + 配件），提升客单价的同时给客户「更划算」的感知；三是把预算投到评论与内容上，补转化而不是补价格。如果老板坚持要降，我会要求设一个明确的试验条件：先降 5% 跑两周，看单量是否涨超 25%，不达标就恢复原价——用一个可回收的幅度去验证，而不是一步降到位。',
      pitfalls: '踩坑答法是「好的我去调价」，或者只算「少赚 10%」。真正的算法是「净利掉了多少倍」+「需要多少单量才补得回来」，这两个数字通常会让老板自己收回这个要求。'
    },
    {
      id: 'S32', dim: 'compliance', layer: 'ops', title: 'ODR 逼近 1%，怎么把它压回来',
      prompt: 'ODR 现在是 0.92%，红线 1%，还有一批在途订单可能延期。请说明你的止血动作和 30 天内的处理计划。',
      checklist: [
        '先说清 ODR 的三类来源（差评 / A-to-Z / 信用卡拒付），以及 60 天滚动窗口的特性',
        '止血优先：改配送时效、主动联系高风险订单客户、对可能延期的订单提前沟通',
        '处理存量：拆解已发生的缺陷单，能补救的补救（退款/补发/道歉），不能的等滚出窗口',
        '从根上降低：查差评集中的产品与描述问题，改 Listing 或产品',
        '给出 30 天的观察指标与目标（ODR 降到 0.7% 以下）'
      ],
      reference: 'ODR 是按 60 天滚动算的，0.92% 意味着已经在红线边上，任何几单新的缺陷就会越线。我的动作分三层。第一层是止血：把后台的配送时效立刻改长，让新订单不承诺兑现不了的时间；同时把这批可能延期的订单挑出来，主动联系客户说明情况给方案（补偿券或部分退款），因为客户主动开 A-to-Z 的杀伤力远大于被动等待。第二层是处理存量：把这 0.92% 拆开看是差评、A-to-Z 还是拒付。如果是差评，逐条看有没有可以联系客户解决的空间；如果是拒付，检查是不是账单描述不清导致的。能补救的补救，不能补救的就让它滚出 60 天窗口——这也是为什么「止血」比「补救」重要，因为新产生的缺陷会不断顶替旧的好数据。第三层是根因：把近 90 天的差评主题聚类，如果集中在「与描述不符」，那就改 Listing 和主图；如果是质量问题，那是产品端的事，要停投先修产品。30 天的目标是 ODR 降到 0.7% 以下，观察指标是每周新增缺陷单数，目标是压到每周 1 单以内。',
      pitfalls: '踩坑答法是「开 Case 申诉」或「等 60 天自动滚出去」。前者改变不了客观数据，后者在滚动期内继续产生新缺陷就会直接越线。正确顺序永远是：止血 → 补救 → 根因。'
    },
    {
      id: 'S33', dim: 'profit', layer: 'ops', title: '怎么向老板解释「看着赚钱、实际亏钱」',
      prompt: '一个 ASIN 后台显示毛利率 38%，看起来很健康，但你算完净利只有 2%。老板不理解：「毛利率这么高，钱去哪了？」请用一段他能听懂的话解释，并给出改进方案。',
      checklist: [
        '用「毛利率扣什么、净利率再扣什么」的结构说清差额来源',
        '列出三个主要漏口：广告费、退货损耗、运营提成/服务费',
        '给出量化的拆解（如广告吃掉 22 个点、退货吃掉 9 个点、提成 2 个点）',
        '给出改进优先级与预期效果（先压广告、再修退货）',
        '不用财务术语堆砌，用「每卖一件，钱是怎么分掉的」的说法'
      ],
      reference: '可以这样理解：毛利率算的是「卖一件，扣掉货本身和运费、平台佣金之后还剩多少」——这件卖 $35，扣完这些剩 $13.3，正好 38%。但净利率要再往下扣三笔：第一笔是广告，这件我们花了 $7.7 才卖出去，占售价 22%；第二笔是退货，退货率 11%，来回运费加上不能二次销售的折损，平均每件摊 $3.2，占 9%；第三笔是运营提成，按销售额 2%，$0.7。三笔加起来 $11.6，从 $13.3 里扣掉，剩 $1.7，也就是 2%。所以不是账算错了，是这三笔不在毛利里、只在净利里。改进上我会先动广告：把高花费 0 转化的词否掉、把 ACOS 从 22% 压到 17%，能拿回 5 个点；再修退货：如果退货原因集中在「与描述不符」，改主图和五点能压到 7%，再拿回 3–4 个点。两个动作做完，净利能从 2% 到 10% 左右。提成那 2% 是结构性的，动不了，也不用动。',
      pitfalls: '踩坑答法是甩一堆财务术语（「期间费用」「边际贡献」），老板听不懂就等于没解释。正确的说法是「每卖一件，这笔钱是怎么被分掉的」——用一件商品的视角讲，比用报表讲有效得多。'
    }
  );

  /* ============================================================
     案例 3 题（C4–C6）：带数据表格的完整周报复盘
     ============================================================ */
  DATA.CASE.push(
    {
      id: 'C4', layer: 'ops', dim: 'lifecycle',
      build: function () {
        const price = R.pick([29.99, 34.99, 39.99]);
        const acos = [R.range(0.34, 0.42, 2), R.range(0.27, 0.33, 2), R.range(0.24, 0.29, 2)];
        const tacos = [R.range(0.20, 0.24, 2), R.range(0.19, 0.23, 2), R.range(0.21, 0.26, 2)];
        const nat = [R.range(0.34, 0.42, 2), R.range(0.30, 0.38, 2), R.range(0.24, 0.30, 2)];
        const orders = [R.int(520, 640), R.int(500, 620), R.int(430, 540)];
        const row = (m, i) => [m, String(orders[i]), F.pct(acos[i] * 100), F.pct(tacos[i] * 100), F.pct(nat[i] * 100), F.pct((1 - nat[i]) * 100)];
        return {
          title: '生命周期转折判断 · 三个月趋势', dim: 'lifecycle', layer: 'ops',
          scene: '以下是同一链接连续三个月的关键数据（模拟数据，客单价 ' + F.money(price) + '，毛利率 31%）。请用 4–6 句话完成判断：现在处在什么阶段、核心矛盾是什么、下个月最高优先级的动作是什么。',
          kv: [['客单价', F.money(price)], ['毛利率', '31%']],
          table: {
            head: ['月份', '订单', 'ACOS', 'TACOS', '自然单占比', '广告单占比'],
            rows: [row('M1', 0), row('M2', 1), row('M3', 2)]
          },
          checklist: [
            '指出 ACOS 在降、但 TACOS 在升、自然单占比在降 —— 三者方向不一致',
            '明确定性问题：不是广告效率变差，是「广告在补贴本可自然成交的需求」',
            '结合毛利率 31% 判断当前 ACOS 已接近盈亏线，不能再往下压规模',
            '指出单量在持续下滑（M1→M3 约 -15%），说明自然流量基础在被侵蚀',
            '给出下个月一个最高优先级动作，且可执行、可验证（如剥离品牌词投放/查价格与评论竞争力）'
          ],
          reference: '判断：这条链接正在从「成熟期」滑向「衰退期」，核心矛盾不是广告效率，是自然流量在流失。证据链有三条：ACOS 从 ' + F.pct(acos[0] * 100) + ' 降到 ' + F.pct(acos[2] * 100) + '，看起来是优化成果；但同期 TACOS 从 ' + F.pct(tacos[0] * 100) + ' 涨到 ' + F.pct(tacos[2] * 100) + '，自然单占比从 ' + F.pct(nat[0] * 100) + ' 掉到 ' + F.pct(nat[2] * 100) + '，订单量也从 ' + orders[0] + ' 掉到 ' + orders[2] + '。这三个数字放在一起的含义是：广告花的钱占整盘的比例在上升，而广告买来的单占比也在上升——说明广告在补贴本来该自然成交的需求，广告效率的「改善」是靠砍掉有效流量换来的。毛利率 31%，当前 ACOS ' + F.pct(acos[2] * 100) + ' 已经贴着盈亏线，不能再靠压规模来改善。下个月最高优先级：做一次「投放剥离测试」——把品牌词和核心大词的广告投放暂停两周，看自然订单能不能接住这部分需求。如果自然单能接住（总订单掉幅小于 10%），说明这部分广告是纯补贴，应该永久收缩；如果掉幅超过 20%，说明自然排名已经依赖广告支撑，那要转去做价格与内容竞争力的修复，而不是继续在广告结构上打转。',
          hintMap: {
            keyword: 'ACOS 降 + TACOS 升 + 自然单占比降 = 广告在补贴自然需求，不是效率变好。',
            stage: '成熟期看 TACOS 与自然单占比，不看单周 ACOS。'
          }
        };
      }
    },
    {
      id: 'C5', layer: 'ops', dim: 'inventory',
      build: function () {
        const skus = [
          { s: 'SKU-A', stock: R.int(700, 1100), daily: R.range(0.6, 1.6, 1), age: R.int(280, 350), net: R.range(-0.02, 0.04, 2) },
          { s: 'SKU-B', stock: R.int(120, 260), daily: R.range(14, 26, 0), age: R.int(30, 70), net: R.range(0.16, 0.26, 2) },
          { s: 'SKU-C', stock: R.int(400, 700), daily: R.range(3, 7, 0), age: R.int(150, 210), net: R.range(0.08, 0.14, 2) }
        ];
        const days = skus.map(x => Math.round(x.stock / x.daily));
        return {
          title: '库存结构诊断 · 谁该清清、谁该补货', dim: 'inventory', layer: 'ops',
          scene: '季末盘点，三个 SKU 的库存与销售情况如下（模拟数据）。可用资金只够做一件事：清一批 or 补一批。请用 4–6 句话说明你的判断与动作。',
          kv: [['判断线', '周转 30–60 天 / 库龄 365 天 / IPI 400'], ['当前资金', '仅够一个动作']],
          table: {
            head: ['SKU', '在库', '日均', '可售天数', '库龄', '净利率'],
            rows: skus.map((x, i) => [x.s, String(x.stock), String(x.daily), String(days[i]), x.age + ' 天', F.pct(x.net * 100)])
          },
          checklist: [
            '算出三个 SKU 的可售天数并排序，指出谁是「卖得完」、谁是「卖不完」',
            '识别 A 的问题：库龄接近 365 天 + 可售天数远超一年 → 立刻清货，且优先级最高',
            '识别 B 的问题：周转过快（<10 天）+ 净利率最高 → 断货风险，必须补货',
            '给出取舍：资金只够一个动作时，先补 B（断货损失不可逆），A 的清货用让利不占资金',
            '给出 C 的处理：按最小批量补，控制库容占用，不因毛利中等而多压'
          ],
          reference: '三个 SKU 的性质完全不同。SKU-A 是最危险的：在库 ' + skus[0].stock + ' 件、日均 ' + skus[0].daily + ' 单，可售天数 ' + days[0] + ' 天，库龄已经 ' + skus[0].age + ' 天——再过不到三个月就进 365 天超高费率区，而按当前速度根本卖不完。它占着库容、拖着 IPI，还在每月烧仓储费，必须立刻清：Coupon + 捆绑 + 站外三管齐下，价格压到成本线附近也可以。SKU-B 是唯一该补的：日均 ' + skus[1].daily + ' 单、只够卖 ' + days[1] + ' 天，净利率 ' + F.pct(skus[1].net * 100) + ' 是三个里最高的，一旦断货损失的是排名和唯一确定赚钱的链接。SKU-C 处在灰色地带：可售 ' + days[2] + ' 天，略超 60 天，净利率 ' + F.pct(skus[2].net * 100) + ' 中等，按最小批量补，不要因为「还能赚钱」就多压。资金只够一个动作时，我选补 B——因为 A 的清货用的是让利（降价/Coupon），不需要现金投入，两件事可以同时启动。判断依据一句话：断货的损失不可逆，压货的损失可逆且有时间窗口。',
          hintMap: {
            rule: '可售天数 = 在库 ÷ 日均。超过 90 天基本等于「这一批卖不完」。',
            cash: '清货用让利，不占用资金；补货要现金。两者可以并行，不冲突。'
          }
        };
      }
    },
    {
      id: 'C6', layer: 'ops', dim: 'profit',
      build: function () {
        const price = R.pick([32.99, 34.99, 39.99]);
        const cost = Number((price * R.range(0.22, 0.28)).toFixed(2));
        const freight = R.range(2.2, 3.6, 2);
        const fba = R.range(4.2, 6.4, 2);
        const comm = Number((price * 0.15).toFixed(2));
        const retRate = R.range(0.06, 0.13, 3);
        const retLoss = Number((price * retRate * 0.6).toFixed(2));
        const acos = R.range(0.20, 0.30, 2);
        const ad = Number((price * acos).toFixed(2));
        const fee = Number((price * 0.02).toFixed(2));
        const total = Number((cost + freight + fba + comm + retLoss + ad + fee).toFixed(2));
        const net = Number((price - total).toFixed(2));
        const gp = Number((price - cost - freight - fba - comm).toFixed(2));
        return {
          title: '利润复盘 · 毛利率 40% 为什么净利只有个位数', dim: 'profit', layer: 'ops',
          scene: '某 SKU 本月经营数据如下（模拟数据）。后台显示毛利率 ' + F.pct(gp / price * 100) + '，但财务算出来的净利率只有 ' + F.pct(net / price * 100) + '。请用 4–6 句话完成复盘：钱去哪了、先动哪一项、预期能拿回多少。',
          kv: [['售价', F.money(price)], ['月销', R.int(400, 900) + ' 件'], ['退货率', F.pct(retRate * 100, 1)], ['ACOS', F.pct(acos * 100, 0)], ['提成', '销售额 2%']],
          table: {
            head: ['项目', '金额', '占售价'],
            rows: [
              ['售价', F.money(price), '100%'],
              ['出厂成本', F.money(cost), F.pct(cost / price * 100, 1)],
              ['头程', F.money(freight), F.pct(freight / price * 100, 1)],
              ['FBA 配送费', F.money(fba), F.pct(fba / price * 100, 1)],
              ['平台佣金', F.money(comm), F.pct(comm / price * 100, 1)],
              ['退货损耗', F.money(retLoss), F.pct(retLoss / price * 100, 1)],
              ['广告分摊', F.money(ad), F.pct(ad / price * 100, 1)],
              ['运营提成', F.money(fee), F.pct(fee / price * 100, 1)]
            ]
          },
          checklist: [
            '指出毛利率到净利率的差额来源：广告 + 退货 + 提成三项不在毛利口径里',
            '量化三项占比，指出广告是最大的漏口',
            '给出改进优先级：先压广告（见效快、可控），再修退货（改描述或产品）',
            '给出预期效果（如 ACOS 降 5 个点 + 退货率降 3 个点 → 净利回到 15%）',
            '说明为什么不先动出厂成本或提价（周期长/有风险）'
          ],
          reference: '差额来自三笔不在毛利口径里的费用：广告 ' + F.money(ad) + '（占售价 ' + F.pct(ad / price * 100, 1) + '）、退货损耗 ' + F.money(retLoss) + '（' + F.pct(retLoss / price * 100, 1) + '，对应退货率 ' + F.pct(retRate * 100, 1) + '）、提成 ' + F.money(fee) + '（2%）。三笔加起来 ' + F.pct((ad + retLoss + fee) / price * 100, 1) + '，正好把 ' + F.pct(gp / price * 100) + ' 的毛利吃到 ' + F.pct(net / price * 100) + '。改进顺序我按「见效速度」排：第一步压广告，ACOS 从 ' + F.pct(acos * 100, 0) + ' 降到 ' + F.pct((acos - 0.05) * 100, 0) + '，动作是否掉高花费 0 转化的词、把预算集中到 CVR 最高的 5–8 个词，两周内能看到效果，能拿回 5 个点；第二步修退货，先拆退货原因，如果是「与描述不符」就改主图和五点，如果是质量问题就要评估换供应商，这一项周期 1–2 个月，能拿回 3–4 个点；提成是结构性的，不动。两个动作做完，净利大概能回到 15% 左右，达到公司的投产底线。我不建议先动出厂成本，因为换供应商有品质与交期风险，周期 2–3 个月，而且这个产品的成本占比本身不算离谱。',
          hintMap: {
            gap: '毛利到净利的差额 = 广告 + 退货 + 提成。三项都不在毛利口径里。',
            order: '先动见效快的（广告），再动需要周期的（退货/产品），最后才动供应商。'
          }
        };
      }
    }
  );

  console.log('[bank-ops] 已加载：填空 10 · 单选 25 · 多选 10 · 简答 5 · 案例 3');
})();
