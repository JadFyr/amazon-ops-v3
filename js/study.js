/* ============================================================
   v2 · 系统知识库（先学后测）
   ------------------------------------------------------------
   独立模块，不改动任何题库与判分逻辑：
     · DATA：6 章 / 30 个小节，全部由 materials 目录的资料提炼
       （要点列表 / 口诀 / 表格，不抄原文段落）
     · 渲染：左侧章节目录 + 右侧正文，支持跨章节搜索与高亮
     · 对外：window.KB = { chapters, render, jump, linkFor, ... }
       供 app.js 路由与 engine.js 的「去知识库复习此考点」使用
   ============================================================ */
(function () {
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ---------- 维度 → 章节 的考点映射（错题跳转用） ---------- */
  const DIM_MAP = {
    basic:      ['ch1', 'ch1-2'],
    listing:    ['ch3', 'ch3-2'],
    metrics:    ['ch2', 'ch2-2'],
    funnel:     ['ch2', 'ch2-1'],
    ads:        ['ch4', 'ch4-1'],
    lifecycle:  ['ch5', 'ch5-1'],
    inventory:  ['ch5', 'ch5-3'],
    profit:     ['ch5', 'ch5-2'],
    sourcing:   ['ch1', 'ch1-5'],
    compliance: ['ch6', 'ch6-1'],
    interview:  ['ch6', 'ch6-4']
  };

  /* 逐题覆盖：新并入的面试题库直接跳到最贴切的小节，优先于上面的维度映射 */
  const Q_MAP = {};
  (function () {
    function set(ids, sec) {
      String(ids).split(/\s+/).forEach(function (id) { if (id) Q_MAP[id] = sec; });
    }
    set('S39 S40 S41 S42 S43 S44 S45 S46 S47 Q193 Q200', 'ch5-6'); // 选品与定价的四个数字
    set('S48 S49 S50 Q194 Q195 Q206', 'ch5-7');                     // 清仓决策树
    set('S51 S52 Q202', 'ch2-4');                                   // 这个 ACOS 该不该降
    set('Q196 Q205', 'ch2-2');                                      // ACOS 公式与三个出口
    set('Q197', 'ch4-4');                                           // 否词优先于降 bid
    set('S53 S61', 'ch5-5');                                        // 断货与恢复动作
    set('S54', 'ch4-2');                                            // 新品不抢大词 → 分词四象限
    set('S55', 'ch2-3');                                            // CVR 低先改哪里 → 三通道
    set('S56', 'ch4-6');                                            // 架构与预算
    set('S57 S58 Q199 Q207', 'ch6-7');                              // 差评四层排查
    set('S60 Q198', 'ch6-1');                                       // 前台不可售 → 先看账户状况
    set('S62 S63 Q203', 'ch2-6');                                   // 报表勾稽
    set('S64 S65 Q201 Q204', 'ch6-9');                              // 岗位定性与反问
    set('S66 Q208', 'ch6-8');                                       // 欧洲 3C 合规四层
  })();

  /* ============================================================
     1. 内容
     ============================================================ */
  const CH = [
    /* ---------------- 第一章 ---------------- */
    {
      id: 'ch1', no: '第一章', title: '平台基础',
      sub: 'SKU · FBA · 购物车 · 关联',
      intro: '这一章只解决一件事：把行业黑话翻译成人话。面试官问「ASIN 和 SKU 有什么区别」，答错就等于告诉他你没上过架。',
      secs: [
        {
          id: 'ch1-1', title: '五个编码：谁编的、给谁看',
          kind: 'table',
          head: ['编码', '谁生成', '干什么用', '面试一句话'],
          rows: [
            ['SKU', '卖家自己编', '内部库存单位，1 个子体对应 1 个 SKU', '我自己定的货号，方便我管库存'],
            ['ASIN', '亚马逊分配', '前台唯一商品编号，10 位，上架后生成', '平台给商品的身份证'],
            ['FNSKU', '后台下载', 'FBA 仓库扫码用，贴在每件外包装上', '仓里扫的就是这个，不是 UPC'],
            ['UPC / EAN', ' GS1 等机构', '商品条形码，无品牌备案时上架要提供', '进商超的那套条码'],
            ['父体 / 子体', '卖家建', '父体是虚拟壳无库存，子体才是可售链接', '父体不能卖，只用来捆评论']
          ],
          tip: '口诀：SK 自己编，AS 平台发，FN 仓里扫，UP 上架用。',
          quiz: 'dim:basic'
        },
        {
          id: 'ch1-2', title: 'FBA 与 FBM：不是好坏，是取舍',
          kind: 'table',
          head: ['维度', 'FBA（亚马逊配送）', 'FBM（自发货）'],
          rows: [
            ['履约方', '平台打包、发货、客服、退货', '自己管仓储物流售后'],
            ['前台标识', 'Ships from Amazon + Prime 标', 'Ships from 卖家名'],
            ['权重与转化', '高，Prime 标明显拉转化', '低，物流时效拖后腿'],
            ['成本结构', '配送费 + 仓储费 + 长期仓储费', '头程 + 海外仓/直发 + 退件'],
            ['适合', '标品、周转快、体积小', '大件、低周转、定制、测款']
          ],
          tip: '口诀：轻小快走 FBA，大慢贵走 FBM；FBA 买的是转化率，FBM 买的是灵活性。',
          quiz: 'dim:basic'
        },
        {
          id: 'ch1-3', title: '购物车（Buy Box）：丢了等于断了单',
          kind: 'list',
          items: [
            '它是什么：详情页右侧那个 Add to Cart / Buy Now。没有它，买家只能点「See all buying options」，转化断崖。',
            '为什么重要：广告能不能跑、促销能不能报、秒杀能不能上，都跟有没有购物车挂钩。',
            '五大影响因素：价格是否有竞争力、配送方式（FBA 优先）、库存是否稳定、账户绩效（ODR 等）、是否被跟卖。',
            '丢了先查四件事：价格是不是高于同类、库存是不是断了、绩效有没有掉线、有没有第三方跟卖。',
            '常见误判：「我价格最低为什么还没购物车」——新链接、绩效差、FBM 都会压过价格因素。'
          ],
          quiz: 'dim:basic'
        },
        {
          id: 'ch1-4', title: '广告账户的树形结构（别把层级说错）',
          kind: 'flow',
          steps: [
            '广告组合 Portfolio：多个活动的集合，可设总预算上限，看整体表现',
            '广告活动 Campaign：预算与广告类型（SP/SB/SD）在这一层设置',
            '广告组 Ad Group：具体的商品、关键词、匹配方式在这一层',
            '关键词 / 商品投放：真正花钱的最小单位'
          ],
          tip: '口诀：组合管钱、活动管类型、广告组管词、关键词管出价。一个产品配一个活动一个组，最不容易内耗。',
          quiz: 'dim:basic'
        },
        {
          id: 'ch1-5', title: '关联流量与跟卖：链接之外的战场',
          kind: 'list',
          items: [
            '关联流量三大来源：自己详情页的广告位、Frequently Bought Together（捆绑推荐）、看了又看/相似商品。',
            '跟卖的本质：同款共享一个 Listing，链接归平台不归你。跟卖带来的差评留在你链接上。',
            '防跟卖三板斧：品牌备案（透明计划/零计划）、差异化包装与配件、自跟卖占位（FBM 兜底防断货）。',
            '被跟卖时的正确顺序：先取证截图 → 开 Case/品牌工具投诉 → 不要自己买空对方库存（会被判操纵）。'
          ],
          quiz: 'dim:sourcing'
        }
      ]
    },

    /* ---------------- 第二章 ---------------- */
    {
      id: 'ch2', no: '第二章', title: '五核心指标与漏斗',
      sub: '公式 · 健康范围 · 三通道口诀',
      intro: '这是被问得最多、也最容易当场翻车的一章。ACOS 的分母说错一次，前面讲得再漂亮都会被扣分。',
      secs: [
        {
          id: 'ch2-1', title: '转化漏斗：指标的作用是定位漏在哪一层',
          kind: 'flow',
          steps: [
            '曝光 Impressions —— 有没有人看见（词够不够、出价够不够、相关性够不够）',
            '点击 Clicks —— 看见了愿不愿意点（主图 / 价格 / 标题 / 评论数）',
            '加购 Add to Cart —— 点进来有没有心动（五点 / 价格 / 评论 / A+）',
            '下单 Orders —— 心动有没有变成行动（运费 / 时效 / 优惠 / 库存）',
            '复购 / 好评 —— 买完愿不愿意再来（产品质量 / 售后）'
          ],
          tip: '口诀：上一层的问题，不要在下一层动手。曝光不够却去改五点，是白改。',
          quiz: 'dim:funnel'
        },
        {
          id: 'ch2-2', title: '五个公式 + 健康范围 + 异常先查什么',
          kind: 'table',
          head: ['指标', '公式', '健康范围（3C / 杯壶参考）', '异常先查什么'],
          rows: [
            ['CTR 点击率', '点击量 ÷ 曝光量', '均值 0.3%–0.5%，低于 0.3% 偏差', '词是否精准 → 主图 / 价格 / 标题'],
            ['CVR 转化率', '订单量 ÷ 点击量', '类目均值 9%–12%，3C 配件 5%–10%', '五点 / 价格 / 评论 / 差评 / A+'],
            ['CPC 单次点击成本', '广告花费 ÷ 点击量', '划算线：CPC < 客单价 × CVR × 毛利率', '出价与竞争程度，分层调 bid'],
            ['ACOS', '广告花费 ÷ 广告销售额', '基准 = 毛利率；新品前 2–4 周可容忍偏高', '走决策树：先否词、降 bid，关广告是最后手段'],
            ['TACOS', '广告花费 ÷ 总销售额（广告单+自然单）', '成熟期 10%–15%，趋势下降 = 健康', '看自然单占比是否在涨']
          ],
          tip: '口诀：ACOS 分母是「广告销售额」，TACOS 分母是「总销售额」。ROAS = 1 ÷ ACOS。',
          quiz: 'dim:metrics'
        },
        {
          id: 'ch2-3', title: '三通道口诀：一个指标只通一条道',
          kind: 'list',
          items: [
            'CTR 管流量质量 —— 词不精准就否词；展示端不吸引就改主图/价格/标题。',
            'CVR 管详情页 —— 价格、五点、评论、差评、A+。降 bid 不会让点进来的人更想买。',
            'bid 管成本（ACOS） —— 词太贵就降 bid、换匹配方式、拓长尾。',
            '最容易犯的错：CVR 低却去降 bid。降 bid 只是少曝光，转化率不会因此变好。',
            '判断顺序永远是：先分层（曝光→CTR→CVR→ACOS），再动手。'
          ],
          quiz: 'dim:metrics'
        },
        {
          id: 'ch2-4', title: 'ACOS 高了，先问自己三个问题',
          kind: 'list',
          items: [
            '① 毛利率是多少？—— 盈亏平衡 ACOS = 广告前毛利率。毛利率 35%，ACOS 20% 广告自身是赚的；ACOS 60% 就是在亏钱买量。',
            '② 处在新品期还是成熟期？—— 新品前 2–4 周是买排名阶段，ACOS 高于毛利可接受，但第 4 周起必须往毛利以下走。',
            '③ TACOS 趋势在升还是降？—— TACOS 降、自然单占比涨，说明广告在养自然流量；TACOS 也涨才是真失控。',
            '反例：只盯 ACOS 一个数字就下结论，是被问「你怎么判断广告健康」时最常见的失分点。'
          ],
          quiz: 'dim:metrics'
        },
        {
          id: 'ch2-5', title: '一道算例：面试可能让你现场算',
          kind: 'table',
          head: ['项', '数值', '算法'],
          rows: [
            ['曝光 / 点击 / 订单', '50,000 / 200 / 12', '给定'],
            ['花费 / 客单价', '$96 / $40', '给定'],
            ['CTR', '0.40%', '200 ÷ 50,000（临界，偏低）'],
            ['CVR', '6.0%', '12 ÷ 200（3C 区间偏下）'],
            ['CPC', '$0.48', '96 ÷ 200；划算线 = 40 × 6% × 35% = $0.84 → 出价还有空间'],
            ['ACOS', '20%', '96 ÷ (12 × 40) = 96 ÷ 480'],
            ['TACOS', '4.8%', '96 ÷ 2,000（总销售额）']
          ],
          tip: '这道题结论：ACOS 20% < 毛利率 35%，广告自身盈利；真正要动的是 CTR 0.40%（临界）——先查词精准度与主图。',
          quiz: 'dim:metrics'
        },
        {
          id: 'ch2-6', title: '报表勾稽：三个数对不上，先查哪里',
          kind: 'table',
          head: ['勾稽关系', '它保证什么', '对不上说明什么'],
          rows: [
            ['销量 × 客单价 = 销售额', '规模自洽', '客单价口径混用（含税 / 不含税、含不含运费），或退款没扣干净'],
            ['广告花费 ÷ **广告销售额** = ACOS', '分母口径唯一', '拿总销售额当分母，ACOS 会凭空变小——这是被追问「你 ACOS 的分母是什么」时最常见的翻车点'],
            ['CPC ÷（CVR × 客单价）= ACOS', '三出口拆解', '三边都正常但 ACOS 异常 → 两份报表时区不同（广告报表常按站点时区结算）'],
            ['Sessions × CVR = 订单数', '漏斗自洽', '父子体 / 变体归因错，或站外流量没计入 Sessions'],
            ['期初库存 + 入库 − 销量 = 期末库存', '货值自洽', '调拨、移除、不可售库存没有入账，库龄与仓储费就会算错'],
            ['评分跌 → CVR 跌 → ACOS 涨', '因果链', '只看到 ACOS 涨就去降 bid，是在治标；根因在评价端']
          ],
          tip: '面试答法：业务报表、广告报表、库存报表的时区与统计口径都不一样，先对齐时间窗再对数。能讲出勾稽关系，比会拖透视表值域加分十倍。',
          quiz: 'dim:metrics'
        }
      ]
    },

    /* ---------------- 第三章 ---------------- */
    {
      id: 'ch3', no: '第三章', title: 'Listing 优化与图文策略',
      sub: '埋词公式 · 图片分辨率避坑',
      intro: 'Listing 是运营的地基。这一章的重点不是「写得好」，而是「知道权重在哪、坑在哪」。',
      secs: [
        {
          id: 'ch3-1', title: '关键词库：三种分级逻辑',
          kind: 'table',
          head: ['分级方式', '适用类目', '怎么分', '注意'],
          rows: [
            ['按搜索排名', '竞争大、词量多', '5 万名内为一级，5–10 万为二级', '分级没有统一标准，看运营习惯'],
            ['按流量占比', '词量只有二三百个的小类目', '30%–10% 为一级，10%–1% 为二级', '一二级之间常有断崖（21%/15%/12% → 5%）'],
            ['竞品交叉共性', '头部集中类目', '多个头部竞品词表做交集', '找共性词，别照抄单一竞品']
          ],
          tip: '反常识：流量比核心词更大的词不一定是好词。「厨房用品」流量大于「砧板」，但投它会把砧板推到锅碗瓢盆里，不精准。',
          quiz: 'dim:listing'
        },
        {
          id: 'ch3-2', title: '埋词：权重顺序与标题公式',
          kind: 'list',
          items: [
            '权重大小：标题 ＞ 五点 ＞ 详情 ＞ 后台 ST（Search Terms）。',
            '标题公式：品牌 + 产品名/型号 + 核心关键词 + 适用范围（用途/卖点）+ 属性（颜色/尺寸）。',
            '标题至少埋 3 个关键词 + 3 个卖点，但不要为堆词牺牲通顺与本地表达习惯。',
            '埋词三条：重要词放前面（标题开头、每条五点开头）；语句通顺符合目标国阅读习惯；条件允许时自然多次出现。',
            'ST 规则：全部小写、空格分隔、不重复单复数、不写品牌词、不写 on/the 这类虚词，总字符 ≤250。',
            '验证有没有埋进去：前台搜「ASIN + 空格 + 关键词」，能搜到自己才算生效。'
          ],
          tip: '口诀：重要的往前放，通顺优先，重复有度。',
          quiz: 'dim:listing'
        },
        {
          id: 'ch3-3', title: '五点描述：前三条决定生死',
          kind: 'list',
          items: [
            '排序：把最打动客户的 3 个卖点放前 3 条。不确定就扒 10 个相似竞品的前 3 条，按出现频次排序。',
            '篇幅：5 条为宜，单条别写成「老太太的裹脚布」，客户会跳读。',
            '视角：站在客户顾虑上写——他担心什么，你就先答什么，而不是罗列你有的参数。',
            '四条自检：有没有解答购买顾虑、表达是否简洁、是否可读、关键词有没有埋进去。'
          ],
          quiz: 'dim:listing'
        },
        {
          id: 'ch3-4', title: '图片分辨率：最常见的「玄学」其实是常识',
          kind: 'table',
          head: ['位置', '推荐尺寸 / 格式', '为什么'],
          rows: [
            ['主图', '1600 × 1600，JPG', '白底、占比约 85%，支持放大镜'],
            ['移动端主图比例', '按 1600×1600 换算成 1:1.2 或 3:4', '手机端占屏更大，别让主图被裁掉卖点'],
            ['A+ 标准图（带文字）', '最低 970 × 600', '按最低像素上传，前端显示最清晰'],
            ['A+ 强行放大', '放大 3–5 倍无用', '前端仍按 970×600 渲染，文件越大加载越慢、噪点越多']
          ],
          tip: '避坑结论：不是设计给的图不清晰，是像素给大了。按亚马逊建议的最低像素出图，前端反而最清楚。图里少放字、多放局部特写。',
          quiz: 'dim:listing'
        },
        {
          id: 'ch3-5', title: '手机端还是电脑端优先？用数据决定',
          kind: 'list',
          items: [
            '路径：业务报告 → SKU 绩效 → 对比「会话 - 移动应用」与「会话 - 浏览器」。',
            '手机端会话更高 → 优先优化手机端，主图用 1:1.2 或 3:4。',
            '电脑端占优 → 主图可用 1:1。',
            '经验判断：低货值标品优先手机端；高货值、需要反复比较的产品（婴儿车、仪器）优先电脑端。',
            '首图核心指标是点击率，建议以 1 个月为周期做 A/B 测试。'
          ],
          quiz: 'dim:listing'
        },
        {
          id: 'ch3-6', title: '标题合规红线（写错会被限流）',
          kind: 'list',
          items: [
            '字符：多数类目 ≤200 字符（含空格），部分特殊类目 ≤75。',
            '禁用符号：! $ ? _ { } ^ ¬ ¦ 等（除非是品牌名的一部分）；~ # < > * 只能在编码、测量值等特定场景用。',
            '禁促销语：free shipping、christmas、best seller 之类一律不行。',
            '禁他人品牌词：写了就是侵权风险。',
            '禁同词组重复 2 次以上：容易被判堆砌而限流甚至下架。',
            '写法：用最短最准的信息描述「是什么」，首字母大写（介词除外），用数字不用拼写（1 而不是 one）。'
          ],
          quiz: 'dim:listing'
        },
        {
          id: 'ch3-7', title: 'A+ 与非 A+：两种完全不同的写法',
          kind: 'table',
          head: ['场景', '详情页主要任务', '做法'],
          rows: [
            ['有 A+', '客户看不到文字长描述，详情页转为埋词用', 'AI 多生成几版再人工理顺，保证通顺，不写竞品品牌'],
            ['无 A+', '详情页要承接五点继续说服客户', '展开细节、功能、参数，重点打消购买顾虑，不以埋词为主'],
            ['A+ 排版', '总—分—总', '首模块品牌/产品总览，再按客户关注点展开（材质？功率？）']
          ],
          tip: '别编数字：A+ 能提升转化的方向是对的，但不要张口就说「提升 8%」这种具体百分比，被追问来源会很难看。',
          quiz: 'dim:listing'
        }
      ]
    },

    /* ---------------- 第四章 ---------------- */
    {
      id: 'ch4', no: '第四章', title: 'SP 广告实操闭环',
      sub: '七步闭环 · 分词四象限 · 否定词纪律',
      intro: '面试官真正想确认的是：你能不能白纸画出这七步，并且知道每一步「判断标准」是什么。',
      secs: [
        {
          id: 'ch4-1', title: '七步闭环（要能默画）',
          kind: 'flow',
          steps: [
            '① 反查关键词 —— 前台下拉词 + 竞品 Listing + 评论区；输出核心词 ≥3、长尾词 ≥10',
            '② 埋词进 Listing —— 标题前部核心词、五点核心+长尾+痛点、ST 放变体词',
            '③ 开自动广告 —— 四种匹配全开，预算给到每天 ≥10 次点击（CPC $0.6 → 日预算 ≥$6）',
            '④ 跑 7 天（最好 14 天）再拉搜索词报告 —— 数据量不够时的结论都是噪音',
            '⑤ 分词（唯一需要判断的一步）—— 按四象限处理',
            '⑥ 开手动广告 + 分层管理 —— 精准/词组/广泛三个活动，配位置溢价（TOS 高、PP 中、详情页低）',
            '⑦ 周报复盘 → 回到第 ① 步 —— 本周的否定词决定下周的报告长什么样'
          ],
          tip: '口诀：反查→埋词→自动→七天→分词→手动→复盘。自动广告是「选词工具」，不是「盈利工具」。',
          quiz: 'dim:ads'
        },
        {
          id: 'ch4-2', title: '分词四象限：这张表要背下来',
          kind: 'table',
          head: ['词的表现', '判断', '动作'],
          rows: [
            ['高转化、ACOS 低于毛利率', '好词', '开手动精准，逐步提 bid 抢首页，加预算'],
            ['高点击、0 转化、花费高', '垃圾流量词', '精准否定，立即执行'],
            ['低曝光、有点击', '有潜力但排不上去', '提 bid 10%–20%，观察 3 天'],
            ['高转化但 CPC 贵、ACOS 高', '好词但太贵', '降 bid 5%–10% 保排名，或改投词组拓便宜流量']
          ],
          quiz: 'dim:ads'
        },
        {
          id: 'ch4-3', title: '四种匹配方式',
          kind: 'table',
          head: ['匹配', '逻辑', '流量特征', '什么时候用'],
          rows: [
            ['紧密匹配', '语义接近，含单复数/变体/语序颠倒', '精准、量中等', '主力跑数据'],
            ['宽泛匹配', '相关但不完全一致，可夹带其他词', '泛、量大、杂', '拓词期用，必须配否定兜底'],
            ['同类商品', '投到互补品详情页（杯子→杯套）', '精准、量小', '有明确互补品时'],
            ['关联商品', '投到竞品详情页（杯子→别的杯子）', '精准、竞争强', '蹭竞品流量，配位置溢价']
          ],
          quiz: 'dim:ads'
        },
        {
          id: 'ch4-4', title: '否定词 SOP 与两条纪律',
          kind: 'table',
          head: ['判定条件', '动作'],
          rows: [
            ['点击 ≥20 次、0 订单', '立即精准否定'],
            ['花费 ≥$15、0 订单', '立即精准否定（不等点击量）'],
            ['点击 ≥10、ACOS > 毛利率 ×2', '先降 bid 20%，观察 3 天仍差再否'],
            ['词与产品无关（塑料杯投不锈钢杯）', '立即否定，不看数据'],
            ['竞品品牌词', '手动精准可小额投；自动层里否定掉']
          ],
          tip: '纪律一：数据量不够不否词（点 3 次 0 单就否 = 误杀潜力词）。纪律二：否词在活动层级做，不在广告组层级做，否完 3 天再拉一次报告确认。',
          quiz: 'dim:ads'
        },
        {
          id: 'ch4-5', title: '异常决策树（主管面必考）',
          kind: 'flow',
          steps: [
            '曝光低 → 词不够 / 出价太低 / 相关性差 → 加词、提 bid 10–20%、查埋词',
            '曝光够、CTR 低 → 词不精准就否词；主图/价格/标题不行就改展示端',
            'CTR 正常、CVR 低 → 详情页问题（价格/五点/评论/差评）→ 广告端不用大动',
            'CTR、CVR 都正常、ACOS 高 → 高转化词降 bid 5–10% 保排名；0 转化词否定；拓长尾',
            'ACOS 高但 CVR 高、自然单在涨 → 看 TACOS，新品期可能是健康的',
            '总原则：先否词和降 bid，关广告 / 停活动是最后手段'
          ],
          quiz: 'dim:ads'
        },
        {
          id: 'ch4-6', title: '预算、竞价与调价节奏',
          kind: 'table',
          head: ['项目', '新品 30 天示例', '说明'],
          rows: [
            ['自动广告（四匹配）', '30%（$6）', '选词、拓流量，预算需 ≥10 次点击/天'],
            ['手动精准（高转化词）', '40%（$8）', '盈利主力，保排名'],
            ['手动词组/广泛', '20%（$4）', '拓词、捡便宜流量'],
            ['关联/同类商品', '10%（$2）', '蹭竞品详情页'],
            ['动态竞价 - 只降低', '新品期首选', '不加价只降价，控 ACOS'],
            ['动态竞价 - 提高和降低', '转化稳定的成熟活动', '可能加价最多 100%'],
            ['固定竞价', '测试期 / 精确控成本', '完全按你的出价']
          ],
          tip: '调 bid 铁律：单次幅度 10%–20%，不要翻倍或腰斩；每次调整后观察 3 天。天天调 = 永远不知道是哪个动作起的作用。提 bid 先提有转化的词，绝不给 0 转化词提价。',
          quiz: 'dim:ads'
        },
        {
          id: 'ch4-7', title: '周报五件事（周一固定动作）',
          kind: 'list',
          items: [
            '拉三个报表：搜索词报告、投放报告、已购买商品报告。',
            '填五项指标并**按活动拆分**：曝光、点击、CTR、CVR、CPC、ACOS、TACOS。',
            '分词：新出现的高转化词加手动精准；高花费 0 转化词否定。',
            '看自然单占比趋势（ACOS 与 TACOS 的差额在扩大还是收窄）。',
            '输出下周 3 个动作，写进周报「下周计划」——没有动作的周报等于没做。'
          ],
          quiz: 'dim:ads'
        }
      ]
    },

    /* ---------------- 第五章 ---------------- */
    {
      id: 'ch5', no: '第五章', title: '高阶运营与库存',
      sub: '盈亏平衡 · 补货公式 · 生命周期',
      intro: '助理岗考执行，运营岗考取舍。这一章的每个知识点都是主管面的追问点：你凭什么这么定？',
      secs: [
        {
          id: 'ch5-1', title: '生命周期：同一个 ACOS，不同阶段不同结论',
          kind: 'table',
          head: ['阶段', '看的核心', 'ACOS 容忍度', '典型动作'],
          rows: [
            ['新品期（0–4 周）', '排名与评价', '可高于毛利率，买排名', '自动广告跑词、Vine 积累评价、长尾词切入'],
            ['成长期（1–3 月）', '自然单占比', '逐步压到毛利以下', '高转化词转手动精准，否掉泛词'],
            ['成熟期', '利润与 TACOS', '必须低于毛利率', '控 ACOS、抢首页、维护评论、报秒杀'],
            ['衰退期', '库存与资金', '不再投，尽快回收', '清货（降价/奥特莱斯/站外），转新品']
          ],
          tip: '关键判断：ACOS 从 62% 降到 38%，但日均单量 22→13、自然单占比 28%→19%、TACOS 24%→26%，这不是优化，是「过度收缩」——广告在丢掉支撑排名的量。',
          quiz: 'dim:lifecycle'
        },
        {
          id: 'ch5-2', title: '全成本与盈亏平衡：别拿毛利当净利',
          kind: 'list',
          items: [
            '真实净利 = 售价 − 出厂 − 头程 − FBA 配送费 − 佣金 − 仓储 − 退货损耗 − 广告费 − 运营提成。',
            '盈亏平衡 ACOS = 广告前毛利率。广告前毛利率 35% → ACOS 35% 时广告刚好不赚不亏。',
            '毛利率 48% 但净利只有 4%？去拆：广告吃掉多少、退货吃掉多少、仓储和提成吃掉多少，别笼统说「成本高」。',
            '定价三法：按目标利润率定（新品/自研）、按市场价定（跟随）、低价推广定（前期换流量，往往保不住本）。',
            '提成方案比较时，先算「卖多少件才能拿到同样的钱」，再算「哪套方案会诱导刷单式冲量」。'
          ],
          quiz: 'dim:profit'
        },
        {
          id: 'ch5-3', title: '补货公式：一个数字都不能少',
          kind: 'list',
          items: [
            '补货量 = 日均销量 × 总周期 + 安全库存 − 当前总库存。',
            '总周期 = 采购周期 + 头程 + 入仓上架缓冲（不是只有海运天数）。',
            '当前总库存 = FBA 可售 + 在途 + 本地仓（漏掉在途必然补多）。',
            '安全库存 = 日均 × 安全系数（应对旺季波动、船期延误）。',
            '日均要用加权：近 7 天与近 30 天按 6:4 或 7:3 加权，纯用最近 7 天会被一次活动带偏。',
            '缺口的判断顺序：先算会不会断货（当前库存 ÷ 日均 = 可售天数），再决定要不要空运补一批。'
          ],
          tip: '空运的账：空运多花的运费 ÷ 断货少赚的毛利 = 回本天数。回本天数小于断货天数，空运才划算。',
          quiz: 'dim:inventory'
        },
        {
          id: 'ch5-4', title: 'IPI 与库容：被砍仓之后先做什么',
          kind: 'list',
          items: [
            'IPI 低于 400 会被限仓，旺季前尤其致命。',
            '拉升 IPI 的四件事：清滞销（减少冗余库存比）、提高售出率（促销/降价）、修好无在售信息的库存、别再无脑补货。',
            '库龄分段仓储费：181 天以上开始跳档，365 天以上最贵——清货的最佳时点是「还没到下一档」之前。',
            '清货工具优先级：站内降价/优惠券 → 奥特莱斯 → 站外折扣 → 批量清货（只能拿回 5%–10%）→ 弃置/移仓。'
          ],
          quiz: 'dim:inventory'
        },
        {
          id: 'ch5-5', title: '断货的代价比你想的贵',
          kind: 'list',
          items: [
            '排名掉：断货期间权重下滑，恢复供货后要重新买流量，ACOS 会比断货前更高。',
            '广告白烧：断货时广告还在跑（或被迫关停），历史数据断档，重新起量成本更高。',
            '购物车与跟卖风险：断货给别人让位，容易被跟卖或竞品抢词。',
            '恢复顺序：先补 FBA 库存到位 → 恢复广告（先精准后自动）→ 观察 3–7 天 CTR/CVR → 再考虑加预算。'
          ],
          quiz: 'dim:inventory'
        },
        {
          id: 'ch5-6', title: '选品定价：四个数字必须张口就来',
          kind: 'table',
          head: ['数字', '怎么算', '面试官为什么问它'],
          rows: [
            ['类目价格中位数', '抓 BSR Top100 的售价排序后取中位', '证明你看的是价格分布，不是一个标价'],
            ['Top10 均价', '头部 10 个 ASIN 的售价均值', '头部锚定在哪里，决定你有没有高价切入的空间'],
            ['保本价', 'COGS + 头程 + FBA 配送费 + 佣金（约 15%）+ 广告预算占比', '定价与清仓的共同起点；不算账就定价，一问成本结构就穿帮'],
            ['目标毛利价', '保本价 ÷（1 − 目标毛利率）', '反推售价，而不是先定价再凑利润']
          ],
          tip: '顺序必须是：先算保本价 → 再看价格带 → 最后才定价。反过来先拍一个 29.99 再倒推成本，是最容易被追问穿的一步。「头部 3 个品牌占 92%」这类数字还要能说清口径：是销售额占比，还是 Top100 的 SKU 数量占比。',
          quiz: 'dim:sourcing'
        },
        {
          id: 'ch5-7', title: '清仓决策树 Step 0–5',
          kind: 'flow',
          steps: [
            'Step 0 算账（跳过则后面全错）：保本价 = COGS + 头程 + FBA 配送费 + 佣金 + 广告预算占比；可接受亏损下限 = 月度仓储费 + 资金占用成本（货值 × 利率 × 时间）→ 得出「最低可卖价」与「最长可持有时长」',
            'Step 1 分类：不把 5000 件一锅端——有动销 / 完全滞销 / 可合并父子体 / 可调拨其他站点；能调拨的先调拨，别在单站点硬降',
            'Step 2 价格阶梯：单次降幅 10–15%，观察 3–5 天 CVR 再降下一步；切忌一步降到底（价格历史会影响后续恢复定价与 Buy Box）',
            'Step 3 促销工具按资格与成本排序：Outlet（长期在、无费用、流量差）> 秒杀 LD/BD（有排期有费用、需历史折扣、流量大）> 优惠券 > 专享折扣。急回款选秒杀，慢清选 Outlet，快断货选移除',
            'Step 4 广告清仓：只投精准长尾词，设预算硬上限 + 限时（如 30 天）；判定条件 = 单件广告成本 < 单件月仓储费，否则越投越亏',
            'Step 5 止损线（最易被忽略）：设明确时限（如 45 天）与明确动作——无改善则移除到第三方海外仓 / 站外 deal / 弃置；并把决策过程留成记录'
          ],
          tip: '四个常见扣分点：没算账就降价、一次降到底、没有止损线、只会降价 + 广告两条路。若「最低可卖价」比当前售价还高 20%，说明结构性问题，正确动作是止损而不是硬清。',
          quiz: 'dim:inventory'
        }
      ]
    },

    /* ---------------- 第六章 ---------------- */
    {
      id: 'ch6', no: '第六章', title: '面试避坑与合规红线',
      sub: '敏感词 · 恶意差评 · 话术结构',
      intro: '这一章分两半：一半是平台的线不能踩，一半是面试的坑不能跳。',
      secs: [
        {
          id: 'ch6-1', title: '账户绩效四条红线',
          kind: 'table',
          head: ['指标', '红线', '算的是什么', '越线先做什么'],
          rows: [
            ['ODR 订单缺陷率', '< 1%', '（差评 + 索赔 + 信用卡拒付）÷ 总订单', '定位到具体 ASIN，先止血再申诉'],
            ['迟发率 LSR', '< 4%', '未按承诺时间发货的订单占比', '查库存同步与处理时效'],
            ['有效追踪率 VTR', '> 95%', '有有效追踪号的发货占比', '换物流商 / 补录追踪号'],
            ['取消率', '< 2.5%', '卖家原因取消的订单占比', '多数是缺货导致，回到库存管理']
          ],
          tip: '口诀：ODR 1、迟发 4、追踪 95、取消 2.5。四条线任何一条踩了，先自救再申诉，别先写申诉信。',
          quiz: 'dim:compliance'
        },
        {
          id: 'ch6-2', title: '敏感词：不是"违规词"，是"功效宣称"',
          kind: 'list',
          items: [
            '高风险类型：杀菌/抗菌/防霉/杀虫/消毒类（Anti-Bacteria、Sterilize、Anti-fungal、Sanitize、Insect prevention…）。',
            '功能性绝对化描述：Non-slip、Heat-resistant、Wear-resisting、Not easy to fade、Easy cleaning 这类在部分类目会被判违规。',
            '为什么被杀：这些属于需要认证或测试报告支撑的功效宣称，普通日用品没有资质就不能写。',
            '处理思路：换成客观描述（材质、结构、尺寸）而不是功效承诺；不确定就先查类目指南再上架。',
            '连带风险：标题、五点、A+、图片文字、后台 ST 都算，改一个地方不算改完。'
          ],
          quiz: 'dim:compliance'
        },
        {
          id: 'ch6-3', title: '恶意差评与竞对手段：正确应对姿势',
          kind: 'list',
          items: [
            '常见竞对手段：差评、恶意点赞、刷好评栽赃、敏感词投诉、邮件轰炸、买断库存、跟卖、改类目、虚假投诉、虚假 QA、盗用商标。',
            '错误反应：找人删差评、买评论对冲、给对手也刷差评——这三件事任何一件都能让账号直接死。',
            '正确顺序：留证（截图/订单号/时间）→ 判断是否违反评论政策 → 走官方举报与开 Case → 同步做好产品与服务本身。',
            '恶意差评能不能删：只有违反政策（含侮辱、隐私、无关内容）才可能被移除；单纯「不好用」的差评删不掉，只能靠后续好评稀释。',
            '面对主管追问时，一定要说出「我不会用服务商刷单」这句底线。'
          ],
          quiz: 'dim:compliance'
        },
        {
          id: 'ch6-4', title: '三个必答的追问（主管面）',
          kind: 'table',
          head: ['追问', '答题骨架', '不要这样说'],
          rows: [
            ['「ACOS 飙到 60%、CTR 只有 0.2%，你怎么排查？」', '先分层：CTR 0.2% 说明问题在点击端 → 拉搜索词报告看是否泛词 → 同时查主图/价格/标题 → 点击端修完再走成本层', '「先降 bid」——CTR 问题降 bid 无效'],
            ['「什么时候该关广告？」', '关广告是最后手段：否词 → 降 bid → 缩预算 → 换匹配 → 才关；直接关会丢数据积累、掉权重', '「ACOS 太高就关掉」'],
            ['「新品期 ACOS 多高算正常？」', '看毛利率。前 2–4 周买排名可高于毛利，只要 TACOS 在降、自然单占比在涨；第 4 周起必须往毛利以下走', '「20% 以内都正常」——脱离毛利率的数字没有意义']
          ],
          quiz: 'dim:interview'
        },
        {
          id: 'ch6-5', title: '被质疑时的四段话术结构',
          kind: 'flow',
          steps: [
            '先承认事实，不辩解：「这个数字确实不好看，我先说结论。」',
            '给出你的判断口径：「我的判断标准是毛利率 35%，所以 60% 的 ACOS 是在亏钱买量。」',
            '给出动作与优先级：「我会先分层——CTR 0.2% 说明问题在点击端。」',
            '给出验证点与时间：「3 天后 CTR 回到 0.3% 以上，再看 ACOS 是否回落到 40% 以内。」'
          ],
          tip: '口诀：承认 → 口径 → 动作 → 验证。四段齐全，即使答案不完美也像做过事的人。',
          quiz: 'dim:interview'
        },
        {
          id: 'ch6-6', title: '这些话一出口就扣分',
          kind: 'list',
          items: [
            '「我不会，但我可以学」——空话。改成「这块我没实操过，我的理解是…，如果是您会怎么排优先级？」',
            '编数据：编一个「我做过月销 30 万美金」的店铺，追问两次供应链细节就崩。',
            '甩锅：「这是设计/供应链/老板的问题」——主管要的是你能控制的那部分。',
            '把助理岗说成打杂：「就是上架、改价、发邮件」——要说清每个动作背后的判断。',
            '贬低竞品或前公司——面试官会默认你以后也这样说他们。'
          ],
          quiz: 'dim:interview'
        },
        {
          id: 'ch6-7', title: '差评排查四层：先事实，后需求',
          kind: 'flow',
          steps: [
            '① 批次与规格差异：是不是同一批货——欧规 / 美规、电压、PD / QC 协议、SKU 与批次是否不同',
            '② Listing 有没有讲清：是否写明「需搭配快充头才能实现快充」，翻译件最容易漏掉这类限定',
            '③ 竞品在同站点怎么写：是否被竞品抬高了用户预期（参数、场景描述、宣称）',
            '④ 最后才谈需求差异，且必须用搜索词 / 退货原因数据验证，不能凭国籍和印象下结论'
          ],
          tip: '第一性原理：差评里 90% 的「慢 / 不好用」是期望管理失败，不是需求差异。开场就说「德国人对充电速度要求更高」——这正是模拟面试里拿 3/10 的那句。',
          quiz: 'dim:compliance'
        },
        {
          id: 'ch6-8', title: '欧洲 3C 合规四层（VAT / EPR / CE / 主体责任）',
          kind: 'table',
          head: ['层', '具体项', '缺了会怎样'],
          rows: [
            ['① 税', 'VAT：按国别注册与申报，有仓储的国家必须有税号', '资金冻结，比下架更严重'],
            ['② 回收', 'EPR：包装法 + 电子废弃物（WEEE），注册号必须填进后台', '缺一个就可能被下架'],
            ['③ 产品', 'CE 是总称，实际拆 LVD 低电压 / EMC 电磁兼容 / RED 无线（带蓝牙或无线充必做 RED）；带锂电池另有电池法规与运输要求', '海关扣货、平台安全通报'],
            ['④ 主体责任', '欧盟负责人信息可查 + 召回机制', '出安全问题无法追溯，账号风险最高']
          ],
          tip: '别把 CE 说成「一张证书」，它按产品类型拆成不同指令；VAT / EPR / CE 任何一项缺失都能让链接下架。实操上做成一张表，每个 ASIN 上市前逐项打勾，缺项不上架——这类问题一旦触发，处理成本远高于提前办证。',
          quiz: 'dim:compliance'
        },
        {
          id: 'ch6-9', title: '岗位定性与反问：判断这家公司值不值得去',
          kind: 'table',
          head: ['JD 里的信号', '指向的模式'],
          rows: [
            ['精品、Listing 打造、爆款、精细化、深耕类目、自然位', '精品（单品深度）'],
            ['ACOS / 广告架构 / 关键词调研 / ABA / 否词', '精品·广告向'],
            ['数据选品、利润优先、库存周转、多店铺', '精铺'],
            ['大量上架、SKU 数量、ERP 批量采集', '铺货'],
            ['品牌备案、A+ / 旗舰店、站外 / 红人 / 社媒', '品牌型'],
            ['账号安全、绩效 / 申诉 / 防关联', '账号管理向']
          ],
          tip: '一句话判断法：JD 里「广告 / Listing / 类目」的出现频率压倒「上架 / SKU / 店铺」，才是精品。反问四连：主力 ASIN 几个、广告预算谁定、清仓占我多少工时（超 30% 就是清库存岗）、转正后考核什么。',
          quiz: 'dim:interview'
        }
      ]
    }
  ];

  /* ============================================================
     2. 检索与渲染
     ============================================================ */
  let curCh = 'ch1', curQ = '', pendingSec = '';

  const allSecs = () => CH.reduce((a, c) => a.concat(c.secs.map(s => Object.assign({ ch: c.id, chNo: c.no, chTitle: c.title }, s))), []);

  /* 每段的纯文本，用于搜索与命中判断 */
  function secText(s) {
    const bits = [s.title];
    if (s.kind === 'table') { bits.push((s.head || []).join(' ')); (s.rows || []).forEach(r => bits.push(r.join(' '))); }
    if (s.kind === 'list') (s.items || []).forEach(x => bits.push(x));
    if (s.kind === 'flow') (s.steps || []).forEach(x => bits.push(x));
    if (s.tip) bits.push(s.tip);
    return bits.join(' ');
  }

  /* 高亮：先转义，再按查询串加 <mark> */
  function mk(text) {
    const raw = String(text == null ? '' : text);
    const s = esc(raw);
    const qq = String(curQ || '').trim();
    if (!qq) return s;
    const q = qq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      return s.replace(new RegExp('(' + q + ')', 'gi'), '<mark class="kb-hl">$1</mark>');
    } catch (e) { return s; }
  }

  function quizBtn(s) {
    if (!s.quiz) return '';
    return '<button class="kb-quiz-btn" data-act="kb-quiz" data-mod="' + s.quiz + '">去刷题测试 →</button>';
  }

  function renderSec(s, showCh) {
    let body = '';
    if (s.kind === 'table') {
      body = '<table class="kb-tb"><thead><tr>' + (s.head || []).map(h => '<th>' + mk(h) + '</th>').join('') + '</tr></thead><tbody>'
        + (s.rows || []).map(r => '<tr>' + r.map((c, k) => '<td' + (k === 0 ? ' class="kb-td-k"' : '') + '>' + mk(c) + '</td>').join('') + '</tr>').join('')
        + '</tbody></table>';
    } else if (s.kind === 'list') {
      body = '<ul class="kb-ul">' + (s.items || []).map(x => '<li>' + mk(x) + '</li>').join('') + '</ul>';
    } else if (s.kind === 'flow') {
      body = '<ol class="kb-flow">' + (s.steps || []).map((x, i) => '<li><span class="kb-step">' + (i + 1) + '</span><span>' + mk(x) + '</span></li>').join('') + '</ol>';
    }
    const tip = s.tip ? '<div class="kb-tip"><b>口诀 / 避坑</b><span>' + mk(s.tip) + '</span></div>' : '';
    return '<article class="kb-sec" id="' + s.id + '">'
      + '<h3 class="kb-h3">' + (showCh ? '<span class="kb-chtag">' + esc(showCh) + '</span>' : '') + mk(s.title) + '</h3>'
      + body + tip
      + '<div class="kb-sec-foot">' + quizBtn(s) + '</div>'
      + '</article>';
  }

  /* 目录右侧计数：平时显示该章考点总数；搜索时显示「命中/总数」，永远不会六章全 0 */
  function tocCount(c, hit, searching) {
    const total = c.secs.length;
    if (searching) {
      if (hit > 0) return '<span class="kb-toc-n hit">' + hit + '/' + total + '</span>';
      return '<span class="kb-toc-n">' + total + '</span>';
    }
    return '<span class="kb-toc-n">' + total + '</span>';
  }

  function renderToc(hitMap) {
    const searching = !!hitMap;
    return CH.map(function (c) {
      const hit = searching ? (hitMap[c.id] || 0) : 0;
      const on = !searching && c.id === curCh;
      return '<button class="kb-toc-item' + (on ? ' on' : '') + (searching && !hit ? ' dim' : '') + '" data-kb-ch="' + c.id + '">'
        + '<span class="kb-toc-no">' + esc(c.no) + '</span>'
        + '<span class="kb-toc-t">' + esc(c.title) + '</span>'
        + tocCount(c, hit, searching)
        + '</button>';
    }).join('');
  }

  /* 计算当前视图的所有可变片段（刻意不含搜索框，便于局部刷新） */
  function buildView() {
    const q = String(curQ || '').trim();
    let hitMap = null, bodyHtml = '', headTitle = '', headSub = '', headIntro = '', n = 0;

    if (q) {
      /* 跨章节搜索结果 */
      hitMap = {};
      const groups = [];
      const needle = q.toLowerCase();
      CH.forEach(function (c) {
        const hits = c.secs.filter(s => secText(s).toLowerCase().indexOf(needle) > -1);
        if (hits.length) {
          hitMap[c.id] = hits.length;
          groups.push('<div class="kb-group"><div class="kb-group-h">' + esc(c.no) + ' · ' + esc(c.title) + '<span>' + hits.length + ' 段命中</span></div>'
            + hits.map(s => renderSec(s, c.title)).join('') + '</div>');
        }
      });
      n = Object.keys(hitMap).reduce((a, k) => a + hitMap[k], 0);
      headTitle = '搜索结果';
      headSub = q;
      headIntro = n ? '共 ' + n + ' 段命中，黄色高亮为命中位置。点左侧章节可退出搜索。'
                   : '没有找到「' + q + '」。试试更短的关键词：ACOS、分辨率、补货、否定、ODR。';
      bodyHtml = groups.join('') || '<div class="kb-empty">没有匹配内容。</div>';
    } else {
      const c = CH.find(x => x.id === curCh) || CH[0];
      headTitle = c.no + ' · ' + c.title;
      headSub = c.sub;
      headIntro = c.intro;
      bodyHtml = c.secs.map(s => renderSec(s, '')).join('');
    }

    return {
      q: q,
      n: n,
      tocHtml: renderToc(hitMap),
      headHtml: '<div class="kb-head-sub">' + esc(headSub) + '</div>'
        + '<h2>' + esc(headTitle) + '</h2><p>' + esc(headIntro) + '</p>',
      bodyHtml: bodyHtml,
      countText: q ? ('搜索中 · ' + n + ' 段命中') : ('全部 ' + CH.length + ' 章')
    };
  }

  function render() {
    const v = buildView();
    return '<div class="kb-wrap">'
      + '<div class="kb-side">'
        + '<div class="kb-side-h">📖 系统知识库</div>'
        + '<div class="kb-side-sub">' + CH.length + ' 章 · ' + allSecs().length + ' 个考点 · 先学后测</div>'
        + '<div class="kb-toc">' + v.tocHtml + '</div>'
        + '<div class="kb-side-foot"><button class="link-btn" data-act="go-quiz">✎ 去做题</button><span class="dot">·</span><button class="link-btn" data-act="home">首页</button></div>'
      + '</div>'
      + '<div class="kb-main">'
        + '<div class="kb-topbar">'
          + '<div class="kb-search' + (v.q ? ' has-q' : '') + '"><span>🔍</span>'
            + '<input id="kbSearch" type="text" placeholder="搜索考点：ACOS / 分辨率 / 补货 / 否定 / ODR" value="' + esc(v.q) + '" autocomplete="off" spellcheck="false">'
            + '<button class="kb-clear" data-kb-clear="1" aria-label="清空搜索">×</button>'
          + '</div>'
          + '<span class="kb-count">' + esc(v.countText) + '</span>'
        + '</div>'
        + '<div class="kb-head">' + v.headHtml + '</div>'
        + '<div class="kb-body" id="kbBody">' + v.bodyHtml + '</div>'
      + '</div>'
    + '</div>';
  }

  /* 局部刷新：只换目录 / 标题 / 正文 / 计数，搜索框本身保持不动
     —— 一旦重建 input，中文输入法的拼写会话会被打断，表现为字母重复、中文上不了屏 */
  function paint() {
    const v = buildView();
    const toc = document.querySelector('.kb-toc');
    if (toc) toc.innerHTML = v.tocHtml;
    const head = document.querySelector('.kb-head');
    if (head) head.innerHTML = v.headHtml;
    const body = document.getElementById('kbBody');
    if (body) body.innerHTML = v.bodyHtml;
    const cnt = document.querySelector('.kb-count');
    if (cnt) cnt.textContent = v.countText;
    const box = document.querySelector('.kb-search');
    if (box) box.classList.toggle('has-q', !!v.q);
    return !!body;
  }

  /* 绑定：搜索框、目录、清空（一次性事件委托） */
  /* 输入法状态与防抖计时器 */
  let composing = false, debTimer = null;

  function stopDebounce() {
    if (debTimer) { clearTimeout(debTimer); debTimer = null; }
  }

  /* 防抖执行搜索：delay 毫秒内的连续输入只跑最后一次 */
  function scheduleSearch(val, delay) {
    stopDebounce();
    const wait = (delay == null ? 180 : delay);
    debTimer = setTimeout(function () {
      debTimer = null;
      /* 还在拼写中就先不搜，等 compositionend 再触发一次 */
      if (composing) return;
      const next = String(val == null ? '' : val);
      if (next.trim() === String(curQ || '').trim()) return;   /* 没有实质变化，不重绘 */
      curQ = next;
      paint();
    }, wait);
  }

  function bind() {
    /* ① 中文输入法：拼写期间绝不触发搜索 */
    document.addEventListener('compositionstart', function (e) {
      if (e.target && e.target.id === 'kbSearch') composing = true;
    });
    document.addEventListener('compositionend', function (e) {
      if (!e.target || e.target.id !== 'kbSearch') return;
      composing = false;
      /* 中文上屏后才检索 */
      scheduleSearch(e.target.value, 60);
    });

    /* ② 普通输入（含拼音转成的英文字母）：防抖 */
    document.addEventListener('input', function (e) {
      if (!e.target || e.target.id !== 'kbSearch') return;
      if (composing || e.isComposing || e.target.isComposing) return;
      scheduleSearch(e.target.value);
    });

    /* ③ 回车立即检索 / Esc 清空 */
    document.addEventListener('keydown', function (e) {
      if (!e.target || e.target.id !== 'kbSearch') return;
      if (e.key === 'Enter') {
        composing = false;
        scheduleSearch(e.target.value, 0);
      } else if (e.key === 'Escape') {
        composing = false;
        stopDebounce();
        curQ = '';
        e.target.value = '';
        paint();
      }
    });

    /* ④ 目录切换 / 清空按钮 —— 走局部刷新，不重建搜索框 */
    document.addEventListener('click', function (e) {
      const chBtn = e.target.closest('[data-kb-ch]');
      if (chBtn) {
        curCh = chBtn.dataset.kbCh;
        curQ = '';
        stopDebounce();
        const inp = document.getElementById('kbSearch');
        if (inp) inp.value = '';
        paint();
        window.scrollTo(0, 0);
        return;
      }
      if (e.target.closest('[data-kb-clear]')) {
        curQ = '';
        stopDebounce();
        const inp = document.getElementById('kbSearch');
        if (inp) { inp.value = ''; inp.focus(); }
        paint();
        return;
      }
    });
  }

  function scrollToPending() {
    if (!pendingSec) return;
    const el = document.getElementById(pendingSec);
    if (el) {
      el.scrollIntoView({ block: 'start' });
      el.classList.add('kb-flash');
      setTimeout(() => el.classList.remove('kb-flash'), 1600);
    }
    pendingSec = '';
  }

  window.KB = {
    chapters: CH,
    sections: allSecs(),
    /* 供 engine.js 使用：这道题对应的章节与锚点 */
    linkFor: function (q) {
      let chId, secId;
      const ov = Q_MAP[q.id];
      if (ov) {
        secId = ov;
        const owner = CH.find(c => c.secs.some(s => s.id === secId));
        chId = owner ? owner.id : (DIM_MAP[q.dim] || DIM_MAP.basic)[0];
      } else {
        const m = DIM_MAP[q.dim] || DIM_MAP.basic;
        chId = m[0];
        secId = m[1];
      }
      const ch = CH.find(c => c.id === chId);
      const sec = ch && ch.secs.find(s => s.id === secId);
      return { ch: chId, sec: secId, chTitle: ch ? ch.title : '', secTitle: sec ? sec.title : '' };
    },
    jump: function (ch, sec) { curCh = ch || 'ch1'; curQ = ''; pendingSec = sec || ''; },
    search: function (q) {
      stopDebounce();
      curQ = String(q == null ? '' : q);
      const inp = document.getElementById('kbSearch');
      if (inp) inp.value = curQ;
      paint();
    },
    /* 立即结算挂起的防抖搜索（跳过等待）：测试与程序化调用用 */
    flush: function () {
      composing = false;
      stopDebounce();
      const inp = document.getElementById('kbSearch');
      if (inp) curQ = inp.value;
      return paint();
    },
    /* 当前是否处于中文拼写状态 */
    isComposing: function () { return composing; },
    render: function () { const html = render(); return html; },
    afterRender: function () { scrollToPending(); },
    state: function () { return { ch: curCh, q: curQ }; },
    bind: bind
  };

  bind();
})();
