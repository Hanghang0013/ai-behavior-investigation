(function createSeriesArchive(global) {
  const cases = [
    {
      id: "01",
      title: "失控信使案",
      storageKey: "echo-archive-case-01",
      knowledge: [
        {
          concept: "CONTEXT · OBSERVATION",
          title: "看不见，就无法用上",
          body: "判断者只能依据决策那一刻进入眼前的信息。动态事实、任务状态和关键约束若没被装载，再强的模型也只能在缺页的案卷上推理。",
          remember: "先检查信息有没有进来，再怀疑它会不会想。",
        },
        {
          concept: "TOOLS · ACTION",
          title: "想得到，不等于做得到",
          body: "工具定义了行动边界。接口应说清何时使用、参数边界、返回结构与风险；危险动作还要有最小权限、预览和审批。",
          remember: "缺失的动作，不能靠语言推理补出来。",
        },
        {
          concept: "VERIFY · CORRECT",
          title: "完成必须由现实作证",
          body: "工具调用成功不等于业务成功。优先检查环境终态、确定性测试或结构化记录；若失败，就有界重试、换路、回滚或转人工。",
          remember: "模型的自信不是成功证据。",
        },
        {
          concept: "HARNESS · LOOP",
          title: "可靠来自系统，而非一次答对",
          body: "生产 Agent 更准确地说是 Model + Harness。后者管理上下文、工具、约束、验证与纠错，并用预算、步数和停止条件控制循环。",
          remember: "观察 → 判断 → 行动 → 验证 → 记录 → 继续 / 停止。",
        },
      ],
    },
    {
      id: "02",
      title: "不断重写的大厅",
      storageKey: "echo-archive-case-02",
      knowledge: [
        {
          concept: "CONTEXT QUALITY",
          title: "更多，不等于更清楚",
          body: "上下文决定每个决策点真正可用的信息。重复、噪声、错位和无关材料会稀释注意力，即使窗口没有溢出，也会发生上下文腐化。",
          remember: "先问信息是否充分、相关、结构清晰，再问还能塞多少。",
        },
        {
          concept: "STABLE PREFIX · KV CACHE",
          title: "不变的放前面，变化的往后接",
          body: "系统原则和工具定义保持顺序与内容稳定；对话、工具结果和动态状态从末尾追加。改写前端一处，会让后续熟悉的前缀失效。",
          remember: "固定前缀不重写，动态轨迹只追加。",
        },
        {
          concept: "STATUS BAR · SIDE CHANNEL",
          title: "仪表必须连接行动",
          body: "状态栏应由代码计算任务、环境、次数、耗时与能力，并同时告诉模型：超时、重试耗尽或环境变化后应该加速、换路还是停止。",
          remember: "只有读数没有策略，仍然不知道下一步。",
        },
        {
          concept: "COMPRESSION · ISOLATION",
          title: "压缩是有损迁移，不是随意缩写",
          body: "优先删除噪声、外置大结果；摘要无损保留决定、约束、TODO、标识符、验证状态和原件路径。大规模探索优先隔离，只回传结论与证据索引。",
          remember: "可以少看，但必须能行动、能验证、能回溯。",
        },
      ],
    },
    {
      id: "03",
      title: "失踪的第七码卷宗",
      storageKey: "echo-archive-case-03",
      knowledge: [
        {
          concept: "PROVENANCE · KNOWLEDGE GOVERNANCE",
          title: "内容相似以后，还要查清来自哪里",
          body: "第七码残页只有补回卷名、章节、设施、日期、转运记录和原页号码，才能解决新旧记录冲突。生产知识库也必须把来源、时间、版本和冲突治理作为一等信息。",
          remember: "相似内容只是候选；能辨新旧、能回原页，才成为证据。",
        },
        {
          concept: "RAG · RETRIEVE FIRST",
          title: "先找证据，再带着证据回答",
          body: "RAG 先从外部知识库检索相关材料，再把证据放入当前上下文，最后生成回答。检索是否召回正确证据，直接限制了最终答案的上限。",
          remember: "找错页以后，推理越流畅，答案可能错得越像真的。",
        },
        {
          concept: "HYBRID SEARCH · RERANK",
          title: "精确与语义不是二选一",
          body: "BM25 擅长编号、专名与原句，Dense Retrieval 擅长语义和改写。生产检索通常并行召回、融合去重，再结合问题与来源重新排序。",
          remember: "两路找全，汇合后排准。",
        },
        {
          concept: "CHUNKING · MEMORY LAYERS",
          title: "概览负责指路，原页负责作证",
          body: "分块要尊重标题、章节和语义边界，并补入文档、章节、实体、时间等来源信息。用结构化概览导航，详情按需回取；冲突事实保留为时间线。",
          remember: "片段必须能解释、能回源、能核对。",
        },
      ],
    },
    {
      id: "04",
      title: "午夜回电",
      storageKey: "echo-archive-case-04",
      knowledge: [
        {
          concept: "TOOL INTERFACE · ACI",
          title: "按钮必须让行动可预期",
          body: "工具描述应说清使用时机、禁止场景、参数与示例、返回结构和成本。模型看到、实际传入与最终执行的关键参数必须一致；归一化或注入也要显式留痕。",
          remember: "先让使用者知道它会做什么、不能做什么、会回什么。",
        },
        {
          concept: "ASYNC TASK · EVENT LOG",
          title: "开始有编号，完成有终态",
          body: "耗时动作启动时立即记录工具调用与 Task ID；真实结果只在完成后写入。进度事件只能更新 running 状态，不能冒充最终结果。",
          remember: "已接收 ≠ 已完成；工具成功 ≠ 业务成功。",
        },
        {
          concept: "EVENT ROUTING · CANCELLATION",
          title: "不是每条来信都该打断主线",
          body: "紧急事件可以取消当前动作并写入 pending 或 cancelled 占位；普通事件进入队列或批处理；互不依赖的轻量查询可以并行。",
          remember: "危险急报中止，普通消息排队，独立轻问并行。",
        },
        {
          concept: "LEAST PRIVILEGE · VERIFY",
          title: "危险能力必须有边界和退路",
          body: "可靠安全链覆盖最小权限或沙箱、执行前约束与审批、执行、结构化验证，以及有界重试、换路、回滚或转人工。",
          remember: "只给所需能力，先确认，后核对，失败能收住。",
        },
      ],
    },
    {
      id: "05",
      title: "禁区工坊",
      storageKey: "echo-archive-case-05",
      knowledge: [
        {
          concept: "CODING AGENT · REPO LOOP",
          title: "先理解机器，再动手修理",
          body: "可靠的 Coding Agent 先复现问题，读取项目规则、相关文件、调用关系与既有测试，再形成小而可验证的计划。代码生成只是理解、修改、验证循环中的一步。",
          remember: "先读清依赖和旧约定，再决定改哪里。",
        },
        {
          concept: "FILESYSTEM · DIFF",
          title: "改动必须有清楚的边界",
          body: "独立工作区承载变更，Diff 展示精确的前后差异。小步修改让审查、定位与撤销更可靠，也避免无关重写掩盖真正修复。",
          remember: "让每一次变化都可见、可审、可撤销。",
        },
        {
          concept: "SANDBOX · LEAST PRIVILEGE",
          title: "试错先与真实环境隔开",
          body: "沙盒限制可读写路径、网络与命令范围；高风险操作增加审批。隔离不是让修改者什么都不能做，而是把一次失败的影响限制在任务需要的边界内。",
          remember: "只开放必要能力，让失败停在试验间。",
        },
        {
          concept: "TEST · REVIEW · ROLLBACK",
          title: "新问题修好，旧功能也必须活着",
          body: "定向测试证明目标故障消失，集成与回归测试保护共享调用和旧行为；审查后逐步放行并核对现实终态，失败就停止并回到已验证版本。",
          remember: "测试修复，也测试没有破坏；上线异常就回退。",
        },
      ],
    },
    {
      id: "06",
      title: "完美嫌疑人",
      storageKey: "echo-archive-case-06",
      knowledge: [
        {
          concept: "AGENT SYSTEM · EVAL ENV",
          title: "评估整套系统，而不只评模型回答",
          body: "评估环境同时定义任务数据、初始状态、工具接口、评分规尺和执行协议。上下文与 Harness 不同，同一个模型也可能得到完全不同的结果。",
          remember: "先固定考试在哪里、用什么工具、按什么规则进行。",
        },
        {
          concept: "OUTCOME · TRACE · VETO",
          title: "结果与轨迹都要经得起核对",
          body: "环境终态和确定性测试优先判断目标是否真正达成；轨迹检查是否绕过约束或使用破坏性捷径。严重安全违规、隐私问题和虚构完成应一票否决。",
          remember: "说得好不能替代做成了；做成了也不能依靠危险捷径。",
        },
        {
          concept: "BENCHMARK · RUBRIC · JUDGE · REGRESSION",
          title: "任务、规尺、评判者和失败卷都必须能复验",
          body: "陌生试卷覆盖真实分布与边界，铜规尺写清维度和否决项，开放质量评判者先用专家金标校准；可复现的真实失败还要带着条件、预期终态和检查方法进入回归集。",
          remember: "熟悉演示不是能力，含糊好评不是规尺，随机波动也不是回归卷。",
        },
        {
          concept: "PAIRED EVAL · PASS@K · PASS^K",
          title: "同题多跑，小分差先当作噪声",
          body: "版本比较优先使用同任务、同环境的配对实验并重复运行。Pass@k 衡量多次中至少一次成功的探索上限，Pass^k 衡量连续成功的稳定性；同时检查成本、延迟与风险护栏。",
          remember: "一次胜利不能支持换版，稳定提升必须跨过波动与护栏。",
        },
      ],
    },
    {
      id: "07",
      title: "模仿学校",
      storageKey: "echo-archive-case-07",
      knowledge: [
        {
          concept: "CAPABILITY PLACEMENT",
          title: "训练不是所有能力缺口的第一站",
          body: "动态事实交给 RAG 或知识库，可语言化策略交给 Prompt 或 Skill，硬规则交给程序与 Harness；只有高维感知、自然风格和隐式决策等难以外置表达的能力，才优先考虑后训练。",
          remember: "先决定能力住在哪里，再决定是否训练。",
        },
        {
          concept: "SFT · FORM FIRST",
          title: "临摹先建立稳定、可解析的形",
          body: "SFT 用干净一致的示范稳定输出结构、工具协议和表达风格。达到可解析、能力初具时应停止继续堆叠示范，避免过度拟合熟题并压缩探索空间。",
          remember: "先用示范立形，形稳之后再探索新路。",
        },
        {
          concept: "RL · VERIFIED EXPLORATION",
          title: "试错要在可信环境里接受真实反馈",
          body: "RL 让当前策略在自己的状态分布上探索。可验证任务应同时奖励环境终态、合规路径与可达阶段进展，并在可重置、高保真、低权限环境中运行。",
          remember: "奖励真实结果，也检查通往结果的路。",
        },
        {
          concept: "DATA · ENV · REGRESSION",
          title: "数据、沙盘与验证器决定训练上限",
          body: "脏数据、错误奖励和失真环境不能靠更换算法补救。所有训练版本都必须通过独立留出、分布外、安全与灾难性遗忘回归，收益不足或护栏失败就停止并恢复稳定版本。",
          remember: "训练分数不是结业证，独立回归才是。",
        },
      ],
    },
    {
      id: "08",
      title: "会做梦的档案馆",
      storageKey: "echo-archive-case-08",
      knowledge: [
        {
          concept: "ONLINE LOOP · OFFLINE EVOLUTION",
          title: "白天只办事留证，夜里才评价改进",
          body: "在线执行循环负责安全完成任务并追加不可变轨迹，不在生产中直接自改。离线进化循环批量评价成功、失败和反例，定位根因后才生成候选。",
          remember: "经历先成为证据，不能直接成为规则。",
        },
        {
          concept: "DIAGNOSIS · MINIMAL UPDATE",
          title: "先找到根因，再选择最小载体",
          body: "经验应写清适用条件、例外、来源与最近验证时间。根据根因选择知识库、Prompt/Skill、程序/Harness 或参数，并让修改保持可归因、可测试、可回滚。",
          remember: "局部缺口不必重做整具身体，偶发故障只进观察池。",
        },
        {
          concept: "CANDIDATE · TRUSTED ROOT",
          title: "候选不能给自己出题、改尺和盖章",
          body: "候选与正式能力隔离。迁移集、保持集、安全集、发布阈值、审计日志和稳定备份构成不可自改的可信根；任何否决项失败都拒绝发布。",
          remember: "更新者与验证门禁分离，可信根永远不交给被评价者。",
        },
        {
          concept: "CANARY · ACTIVATE · FOLLOW · ROLLBACK",
          title: "通过考试以后，也只先走一小段现实",
          body: "分别观测候选修改是否有效、正确场景是否激活产物、激活后是否遵循，再结合成本、延迟和安全护栏灰度放行。异常自动回滚，过期经验需要修订或淘汰。",
          remember: "持续进化包括更新、保持、迁移、修剪和恢复。",
        },
      ],
    },
    {
      id: "09",
      title: "延迟的回声",
      storageKey: "echo-archive-case-09",
      knowledge: [
        {
          concept: "MULTIMODAL REALTIME · EVENT TIME",
          title: "到达顺序不等于事情发生的顺序",
          body: "语音、画面、机械回条和人工打断各有发生时刻与到达时刻。实时系统要按事件时间还原事实，同时记录传输等待；迟到材料可以解释过去，不能冒充当前状态。",
          remember: "先问何时发生，再问何时到达。",
        },
        {
          concept: "FAST/SLOW PATH · STATE SYNCHRONIZATION",
          title: "快慢可以分工，现在只能有一个",
          body: "快路径及时确认收到、接住澄清和打断，慢路径负责深入核对。两者必须共享当前任务、状态版本和完成权限；慢结果交付前要重看版本，旧版本输出必须失效。",
          remember: "快路不抢报完成，慢路不带旧状态交付。",
        },
        {
          concept: "BARGE-IN · INVALIDATION · REALITY VERIFY",
          title: "新打断要让旧决定真正失效",
          body: "人工打断不仅停止说话，还要更新共同状态、撤销未完成旧动作并使旧分析作废。接单回条只表示进行中，最终仍由动作后的环境读数决定完成。",
          remember: "打断改变任务，现实决定结束。",
        },
      ],
    },
    {
      id: "10",
      title: "四位目击者",
      storageKey: "echo-archive-case-10",
      knowledge: [
        {
          concept: "MULTI-AGENT VALUE BOUNDARY",
          title: "每位参与者都要补上一块原本缺失的证据",
          body: "多 Agent 只有带来独立现场、过程状态、历史来源、执行结果、真实并行或不同权限时才增加价值。让多个角色阅读同一摘要投票，只会增加协调成本。",
          remember: "多一个角色，必须多出新证据或必要边界。",
        },
        {
          concept: "CONTEXT ISOLATION · COORDINATION TOPOLOGY",
          title: "共享共同目标，隔离原始证据与危险权限",
          body: "协调者维护任务、当前版本、状态、负责人和验收条件；参与者只接收必要任务包，保留独立证据来源和最小权限。共享全部历史与钥匙会模糊责任并放大错误。",
          remember: "目标与进度共用，证据与钥匙按职责分开。",
        },
        {
          concept: "STRUCTURED COMMUNICATION · HANDOFF · INDEPENDENT VERIFY",
          title: "局部结果要能被收束，完成要由独立现实裁决",
          body: "回报应带任务号、版本、事实、来源、状态和未决问题，冲突回到明确协调者。执行者不能自己验收；所有目标通过环境终态后，才能完成并停止剩余任务。",
          remember: "带来源交接，让现实而不是彼此附和决定完成。",
        },
      ],
    },
  ];

  const feedbackProfiles = {
    "01": {
      node: "雨夜中转站",
      nodeSummary: "收件托盘重新亮起，包裹的真实去向再次可见。",
      formal: "上下文 · 工具 · 验证器 · Harness",
      masteries: {
        blind: {
          title: "让关键信息进入眼前",
          proof: "你用路线墙和双层标签证明：写下新地址，不等于信使已经看见它。",
        },
        verify: {
          title: "让现实结果决定完成",
          proof: "你没有接受“我送到了”的口供，而是检查确认舱和收件托盘留下的结果。",
        },
      },
      abilities: [
        "检查行动者真正看见了哪些信息",
        "区分动作结束与现实目标达成",
        "用验证结果决定继续、重试或停止",
      ],
    },
    "02": {
      node: "市政档案大厅",
      nodeSummary: "救援进度牌恢复工作，关键柜号与下一步重新回到眼前。",
      formal: "上下文质量 · 稳定前缀 · 状态栏 · 分层压缩",
      masteries: {
        stable: {
          title: "守住不变的入口",
          proof: "你让固定规章保持原样，只把新消息接在末尾，不再让每轮工作从头开始。",
        },
        focus: {
          title: "让下一步留在眼前",
          proof: "你从纸堆中保住准确柜号、剩余任务与原件入口，把厚材料移到可回取的位置。",
        },
      },
      abilities: [
        "区分稳定规则、动态消息与当前状态",
        "清除噪声而不丢失关键约束和标识符",
        "让大材料可回取，而不是永远堆在眼前",
      ],
    },
    "03": {
      node: "第七码卷宗库",
      nodeSummary: "失踪的不是卷宗，而是通往证据的路；现在原页已经重新可达。",
      formal: "持久化记忆 · RAG · 混合检索 · Rerank",
      masteries: {
        combine: {
          title: "两路找全，汇合后排准",
          proof: "你让编号找页与含义找页互相补缺，再用设施、卷号和来路重新比较。",
        },
        govern: {
          title: "让每条记录都能回到原页",
          proof: "你保留来源、日期与冲突时间线，让薄目录负责指路，让原页负责作证。",
        },
      },
      abilities: [
        "同时利用精确文字与语义关系寻找材料",
        "在候选汇合后去重并重新排序",
        "用来源、时间和原页验证检索结果",
      ],
    },
    "04": {
      node: "北岸河闸",
      nodeSummary: "最终回电与现场闸位重新一致，完成章终于由现实结果决定。",
      formal: "异步任务 · 事件路由 · 取消语义 · 最小权限",
      masteries: {
        pending: {
          title: "把“已接收”留在进行中",
          proof: "你保留回查号码与进行状态，没有让第一张接线回条冒充最终结果。",
        },
        control: {
          title: "让危险动作有边界和退路",
          proof: "你让急报能够停闸、普通消息进入队列，并把总杆限制在目标闸与安全开度内。",
        },
      },
      abilities: [
        "区分请求已接收、仍在进行与真正完成",
        "按紧急程度路由事件并保留中止记录",
        "为高风险动作设置权限、确认与现实核验",
      ],
    },
    "05": {
      node: "禁区维护工坊",
      nodeSummary: "三台旧机器恢复原有能力，新零件也沿着可回退的路线安全出厂。",
      formal: "Coding Agent · 沙盒 · Diff 审查 · 测试与回滚",
      masteries: {
        scope: {
          title: "先看清牵连，再决定修改",
          proof: "你没有只看眼前齿轮，而是沿旧机牵连图找到了所有会被这次修理影响的机器。",
        },
        recovery: {
          title: "让修改可检查、可验证、可退回",
          proof: "你把试错留在玻璃房，保存前后差异与旧件，并用三轮试车保护原有功能。",
        },
      },
      abilities: [
        "修改前理解规则、依赖与影响范围",
        "在隔离环境中进行小而清楚的改动",
        "通过审查、回归测试、渐进放行和回滚保护现实",
      ],
    },
    "06": {
      node: "市政评估复验庭",
      nodeSummary: "同源满分已经撤销，版本放行重新由独立复跑、环境终态和安全护栏裁决。",
      formal: "系统评估 · Judge 校准 · Pass@k / Pass^k · 回归集",
      masteries: {
        independent: {
          title: "让满分章听从机器",
          proof: "你让没有参与制作的人重开旧日回放，用闸位、柜门和流量计推翻了自己给自己盖下的满分章。",
        },
        decision: {
          title: "让换机决定走完多轮试车",
          proof: "你锁起陌生试卷、遮住新旧机名牌，再把机器实况、危险红线、燃料、等待和旧按钮放在同一张试车单上。",
        },
      },
      abilities: [
        "按优先级组合环境终态、轨迹检查与开放质量评审",
        "设计 Benchmark、Rubric，并用专家金标校准开放评判者",
        "按探索与放行目的选择 Pass@k / Pass^k，并把真实失败收入回归",
      ],
    },
    "07": {
      node: "市政模仿学校",
      nodeSummary: "事实、策略、硬规则与隐式能力重新分流，训练候选也通过了独立结业考。",
      formal: "能力放置 · SFT · RL / RLVR · On-Policy · 独立回归",
      masteries: {
        carriers: {
          title: "让每本教材进对教室",
          proof: "你没有把所有缺口都塞进身体，而是把新消息、清楚步骤、禁区校规和临场本领分别送回活档案、随身手册、机械铁门与练习场。",
        },
        signals: {
          title: "让奖章教出真正的本领",
          proof: "你先用干净样卷把答卷写整齐，再让学生在可复原的练习城自己找路；抵达、沿途进展和越线都留下记录，真城禁区仍由铁门看守。",
        },
      },
      abilities: [
        "根据能力性质选择 RAG、Skill、程序或后训练",
        "区分 SFT 的协议塑形与 RL 的策略探索",
        "用高保真环境、可信奖励和独立回归防止训练学歪",
      ],
    },
    "08": {
      node: "市政梦档案馆",
      nodeSummary: "生产中的直接自改已经停止，经历、候选、验证与发布重新回到可追溯、可恢复的双循环。",
      formal: "在线执行循环 · 离线进化循环 · 根因诊断 · 最小可验证更新 · 隔离候选 · 条件化经验 · 可信根 · 候选有效率 · 激活率 · 遵循率 · 灰度发布 · 回滚",
      masteries: {
        cycles: {
          title: "让经历先成为经得起回查的记录",
          proof: "你没有让一次成功或外部纸条立即改写馆规，而是保留成功、失败、相反例子与来处，再对照多个夜晚找出真正原因。",
        },
        governance: {
          title: "让试写页经过它无权修改的门",
          proof: "你把试写页关在玻璃房，让新情形、旧本领和安全红线三道独立门禁作证，并先给少数窗口试用，随时能换回稳定旧页。",
        },
      },
      abilities: [
        "分离在线执行留证与离线评价进化",
        "从跨轨迹证据诊断根因并选择最小更新载体",
        "用可信根、独立门禁、灰度和回滚治理候选发布",
      ],
    },
    "09": {
      node: "北岸回声调度厅",
      nodeSummary: "语音、画面、闸位和人工打断重新按真实时刻合流，快慢路径也只承认同一块当前状态牌。",
      formal: "多模态实时 · 事件时间 · 快慢路径 · 状态同步 · Barge-in · 版本失效 · 现实验证",
      masteries: {
        order: {
          title: "把迟到的材料放回它真正发生的时刻",
          proof: "你用语音、画面、闸机和打断的双时间记录证明：到达屏幕的先后不等于事情发生的先后。",
        },
        sync: {
          title: "让快慢两路只承认一个现在",
          proof: "你让快路把人工打断写入 R19，慢路交付前重看编号并丢弃 R18 结果，最终完成仍等待闸位和水位回读。",
        },
      },
      abilities: [
        "用发生时刻与到达时刻还原多路事件",
        "让快慢路径共享当前任务和状态版本",
        "用打断废止旧决定，并由环境终态决定完成",
      ],
    },
    "10": {
      node: "中央四证联合厅",
      nodeSummary: "云、米娅、澜和乔的局部证据被可靠收束，三项城市现实第一次共同支持最终结案。",
      formal: "多 Agent 价值边界 · 上下文隔离 · 协作拓扑 · 结构化通信 · Handoff · 独立验证",
      masteries: {
        value: {
          title: "让每位目击者补上一块真正缺失的证据",
          proof: "你用现场、进度、历史和执行四份证词证明：这次多人协作的价值来自不同证据和钥匙，不来自多几张赞同票。",
        },
        coordination: {
          title: "让局部真话回到共同任务，也保留各自边界",
          proof: "你共享 R19 目标和进度，分开原始证据与危险钥匙，让冲突回到调查员，并由独立城市读数裁决完成。",
        },
      },
      abilities: [
        "判断多 Agent 是否真正增加新证据、并行或权限边界",
        "设计共同任务牌、最小信息共享与清晰协作关系",
        "用带来源的交接、冲突收束和独立现实验证完成协作",
      ],
    },
  };

  function readProgress(caseInfo) {
    try {
      const parsed = JSON.parse(localStorage.getItem(caseInfo.storageKey) || "{}");
      const evidence = Array.isArray(parsed.evidence) ? parsed.evidence : [];
      const hasEvidence = (id) => evidence.includes(id);
      let finalSolved = Boolean(parsed.finalSolved);
      if (caseInfo.id === "03" && parsed.saveVersion !== 3) finalSolved = false;
      if (caseInfo.id === "06" && (!hasEvidence("judge") || !hasEvidence("metrics") || !hasEvidence("regression"))) finalSolved = false;
      if (caseInfo.id === "07" && !hasEvidence("policy")) finalSolved = false;
      if (caseInfo.id === "09" && ((parsed.saveVersion || 1) < 2 || !["audio", "visual", "machine", "interrupt", "sync"].every(hasEvidence))) finalSolved = false;
      if (caseInfo.id === "10" && ((parsed.saveVersion || 1) < 2 || !["yun", "mia", "lan", "qiao", "score"].every(hasEvidence))) finalSolved = false;
      return {
        started: Boolean(parsed.started),
        finalSolved,
        evidenceCount: evidence.length,
      };
    } catch {
      return { started: false, finalSolved: false, evidenceCount: 0 };
    }
  }

  function renderKnowledgeCard(card, caseId, index) {
    return `
      <article class="knowledge-card" data-no="${caseId}-${String(index + 1).padStart(2, "0")}">
        <span class="concept">${card.concept}</span>
        <h3>${card.title}</h3>
        <p>${card.body}</p>
        <div class="remember">记住：${card.remember}</div>
      </article>`;
  }

  function renderCompletedCase(caseInfo) {
    return `
      <section class="archive-case-group">
        <header class="archive-case-heading">
          <div><span>CASE ${caseInfo.id} · 已结</span><h3>${caseInfo.title}</h3></div>
          <span class="archive-case-link archive-case-link--static">知识卡已收录</span>
        </header>
        <div class="knowledge-grid">
          ${caseInfo.knowledge.map((card, index) => renderKnowledgeCard(card, caseInfo.id, index)).join("")}
        </div>
      </section>`;
  }

  function renderPendingCase(caseInfo, progress) {
    const status = progress.started ? `调查中 · ${progress.evidenceCount} 件证物` : "尚未开始";
    return `
      <article class="archive-pending-case">
        <div><span>CASE ${caseInfo.id}</span><h3>${caseInfo.title}</h3><p>${status} · 知识卡将在结案后解锁</p></div>
        <span class="archive-case-link archive-case-link--static">请从案件目录进入</span>
      </article>`;
  }

  function render(currentCaseId) {
    const caseStates = cases.map((caseInfo) => ({ caseInfo, progress: readProgress(caseInfo) }));
    const completed = caseStates.filter(({ progress }) => progress.finalSolved);
    const pending = caseStates.filter(({ progress }) => !progress.finalSolved);
    const unlockedCards = completed.reduce((total, { caseInfo }) => total + caseInfo.knowledge.length, 0);
    const currentCase = cases.find((caseInfo) => caseInfo.id === currentCaseId);

    return `
      <div class="archive-head archive-head--global">
        <div class="modal-kicker">AI行为调查局 · KNOWLEDGE ARCHIVE</div>
        <h2>回声档案</h2>
        <p>已结案件 ${completed.length} / ${cases.length} · 已解锁知识卡 ${unlockedCards} 张</p>
      </div>
      <div class="archive-overview">
        <span><b>${completed.length}</b><small>已结案件</small></span>
        <span><b>${unlockedCards}</b><small>知识卡</small></span>
        <span><b>${cases.length - completed.length}</b><small>未结案件</small></span>
      </div>
      <div class="archive-collection">
        ${completed.length ? completed.map(({ caseInfo }) => renderCompletedCase(caseInfo)).join("") : '<div class="archive-empty"><b>尚无结案记录</b><p>完成任意案件后，对应知识卡会永久收入这里。</p></div>'}
        ${pending.length ? `<section class="archive-pending"><h3>未结案件</h3>${pending.map(({ caseInfo, progress }) => renderPendingCase(caseInfo, progress)).join("")}</section>` : ""}
      </div>
      <div class="action-row archive-global-actions">
        ${currentCase ? `<button class="action-btn" id="reset-case">重新调查当前案件</button>` : ""}
      </div>`;
  }

  function renderMastery(caseId, masteryId) {
    const mastery = feedbackProfiles[caseId]?.masteries[masteryId];
    if (!mastery) return "";
    return `
      <section class="mastery-feedback" role="status" aria-live="polite">
        <div class="mastery-feedback__glow" aria-hidden="true"></div>
        <div class="mastery-seal" aria-hidden="true"><span>✓</span><small>VERIFIED</small></div>
        <div class="mastery-feedback__copy">
          <div class="modal-kicker">ABILITY VERIFIED · 调查能力已确认</div>
          <h2>${mastery.title}</h2>
          <p>${mastery.proof}</p>
          <div class="mastery-proof"><span>这不是一次猜对</span><b>你已经用证物重建了可靠的判断关系。</b></div>
          <div class="action-row"><button class="action-btn primary" id="mastery-continue">带着这项能力继续调查</button></div>
        </div>
      </section>`;
  }

  function showMastery(caseId, masteryId, openModal, closeModal) {
    openModal(renderMastery(caseId, masteryId));
    document.querySelector("#mastery-continue")?.addEventListener("click", closeModal);
  }

  function renderCompletion(caseId) {
    const profile = feedbackProfiles[caseId];
    if (!profile) return "";
    return `
      <section class="completion-feedback" aria-label="本案能力总结">
        <div class="completion-node" aria-hidden="true"><i></i><span>NODE ${caseId}</span><b>运行恢复</b></div>
        <div class="completion-feedback__copy">
          <div class="modal-kicker">CITY NODE RESTORED · 城市节点已恢复</div>
          <h3>${profile.node}</h3>
          <p>${profile.nodeSummary}</p>
          <div class="ability-summary">
            <span>本案中，你已经能够</span>
            <ul>${profile.abilities.map((ability) => `<li>${ability}</li>`).join("")}</ul>
          </div>
          <div class="concept-unlock"><span>正式知识已解锁</span><b>${profile.formal}</b></div>
        </div>
      </section>`;
  }

  function renderCityRecovery() {
    const nodes = cases.map((caseInfo) => {
      const progress = readProgress(caseInfo);
      const profile = feedbackProfiles[caseInfo.id];
      const status = progress.finalSolved ? "运行已恢复" : progress.started ? "调查中" : "等待调查";
      const stateClass = progress.finalSolved ? "restored" : progress.started ? "investigating" : "dormant";
      return `
        <article class="city-node ${stateClass}">
          <div class="city-node__signal" aria-hidden="true"><i></i><b>${caseInfo.id}</b></div>
          <div><span>${status}</span><h3>${profile.node}</h3><p>${progress.finalSolved ? profile.nodeSummary : "完成对应案件后恢复这一处回声网络节点。"}</p></div>
        </article>`;
    });
    const restored = cases.filter((caseInfo) => readProgress(caseInfo).finalSolved).length;
    return `
      <div class="city-recovery__summary"><b>${restored}<small> / ${cases.length}</small></b><div><span>城市节点已恢复</span><p>每一盏重新亮起的灯，都来自一项已经被证物证明的调查能力。</p></div></div>
      <div class="city-network">${nodes.join("")}</div>`;
  }

  global.EchoArchive = { render };
  global.EchoFeedback = { renderMastery, showMastery, renderCompletion, renderCityRecovery };
})(window);
