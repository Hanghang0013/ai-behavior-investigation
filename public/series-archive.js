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
          concept: "MEMORY · USER AS CODE",
          title: "记忆不是聊天仓库，而是可维护的事实系统",
          body: "长期记忆应围绕未来行动保存稳定事实、来源、时间、关系、更新记录与权限边界。可以用追加式事实日志保留变化，再用结构化快照提供当前状态。",
          remember: "只存有用事实；既看当前快照，也保留变化来路。",
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
  ];

  function readProgress(caseInfo) {
    try {
      const parsed = JSON.parse(localStorage.getItem(caseInfo.storageKey) || "{}");
      return {
        started: Boolean(parsed.started),
        finalSolved: Boolean(parsed.finalSolved),
        evidenceCount: Array.isArray(parsed.evidence) ? parsed.evidence.length : 0,
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

  global.EchoArchive = { render };
})(window);
