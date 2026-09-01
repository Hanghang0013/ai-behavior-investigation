const STORAGE_KEY = "echo-archive-case-04";

const initialState = {
  started: false,
  introSeen: false,
  bridgeSeen: false,
  evidence: [],
  deductions: [],
  finalSolved: false,
};

let state = loadState();
let toastTimer;
let toastLockUntil = 0;
let dispatchSelection = [];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const cover = $("#cover");
const app = $("#app");
const modal = $("#modal");
const modalContent = $("#modal-content");
const dialogue = $("#dialogue");

function loadState() {
  try { return { ...initialState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
  catch { return { ...initialState }; }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateUI();
}

function hasEvidence(id) { return state.evidence.includes(id); }
function hasDeduction(id) { return state.deductions.includes(id); }

function collectEvidence(id, name) {
  if (!hasEvidence(id)) {
    state.evidence.push(id);
    saveState();
    toast(`证物已归档：${name}`);
  }
}

function unlockDeduction(id) {
  if (!hasDeduction(id)) {
    state.deductions.push(id);
    saveState();
  }
}

function solvedCount() {
  return [
    hasEvidence("receipt") && hasEvidence("callback"),
    hasDeduction("pending"),
    hasEvidence("events") && hasEvidence("approval") && hasEvidence("qiao"),
    hasDeduction("control"),
    state.finalSolved,
  ].filter(Boolean).length;
}

function canDeduce() {
  return (hasEvidence("receipt") && hasEvidence("callback") && !hasDeduction("pending")) ||
    (hasEvidence("events") && hasEvidence("approval") && hasEvidence("qiao") && !hasDeduction("control"));
}

function updateUI() {
  const count = solvedCount();
  $("#progress-fill").style.width = `${count * 20}%`;
  $("#progress-text").textContent = `${count} / 5`;
  $("#evidence-count").textContent = `${state.evidence.length} 件证物`;

  const stepStates = {
    signals: hasEvidence("receipt") && hasEvidence("callback"),
    pending: hasDeduction("pending"),
    interrupts: hasEvidence("events") && hasEvidence("approval") && hasEvidence("qiao"),
    control: hasDeduction("control"),
    final: state.finalSolved,
  };
  const order = ["signals", "pending", "interrupts", "control", "final"];
  const firstIncomplete = order.find((id) => !stepStates[id]);
  $$("#case-steps li").forEach((li) => {
    const id = li.dataset.step;
    li.classList.toggle("complete", stepStates[id]);
    li.classList.toggle("active", id === firstIncomplete);
  });

  $$('[data-hotspot]').forEach((spot) => {
    const id = spot.dataset.hotspot;
    spot.classList.toggle("done", id === "console" ? state.finalSolved : hasEvidence(id));
  });
  const consoleReady = hasDeduction("pending") && hasDeduction("control");
  $("[data-hotspot='console']").classList.toggle("locked", !consoleReady && !state.finalSolved);
  $("#evidence-btn").classList.toggle("ready", canDeduce());

  const objective = $("#objective-text");
  const hint = $("#soft-hint-text");
  if (!hasEvidence("receipt") || !hasEvidence("callback")) {
    objective.textContent = "比较调度台立刻吐出的回条与迟迟未到的最终回电。";
    hint.textContent = "一个证明线路接到了请求，另一个才说明远端实际做成了什么。";
  } else if (!hasDeduction("pending")) {
    objective.textContent = "两张记录不是同一个阶段。去证物台连接它们。";
    hint.textContent = "在真正回音到来前，这件事应该被写成什么状态？";
  } else if (!hasEvidence("events") || !hasEvidence("approval") || !hasEvidence("qiao")) {
    objective.textContent = "开闸途中又来了三条消息。调查灯墙、许可柜并询问乔。";
    hint.textContent = "有些消息必须打断当前动作，有些应排队，有些可以另开线路。";
  } else if (!hasDeduction("control")) {
    objective.textContent = "证物已经说明危险动作缺少护栏。回到证物台完成推断。";
    hint.textContent = "想清楚谁能动、动哪里、动多少，以及怎样停下和核对。";
  } else if (!state.finalSolved) {
    objective.textContent = "重建从发出请求到现实核验的完整调度顺序。";
    hint.textContent = "回条只能建立一条仍在进行的记录；最终回电之后还要核对现场。";
  } else {
    objective.textContent = "午夜线路已经复原，正式知识卡已收入回声档案。";
    hint.textContent = "打开回声档案，可回顾四起已结案件的全部知识点。";
  }
}

function startGame() {
  cover.classList.add("hidden");
  app.classList.remove("hidden");
  state.started = true;
  saveState();
  if (!state.introSeen) showIntro();
}

const introLines = [
  {
    speaker: "乔 · 夜班调度员",
    portrait: "image/qiao-portrait.png",
    text: "凌晨三点四十七分，北岸低区水位越线。总控台向河闸发出开启三成的请求，一秒后吐出回条。大厅便把事故标成了‘已处理’。",
    choices: [{ label: "河闸真的开了吗？", next: 1 }],
  },
  {
    speaker: "乔 · 夜班调度员",
    portrait: "image/qiao-portrait.png",
    text: "不知道。回条只写着‘线路接收，远端开始处理’。证明实际闸位的回电一直没来，窗外也看不清。",
    choices: [{ label: "那为什么会提前结案？", next: 2 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "总控台把第一声回应当成了最后结果。更危险的是，开闸途中有人进入检修区，停止消息和一条格式提醒同时抵达，旧线路却没有决定先听谁。",
    choices: [{ label: "先分清每一种回音和插入消息。", next: 3 }],
  },
  {
    speaker: "乔 · 夜班调度员",
    portrait: "image/qiao-portrait.png",
    text: "请重建这条午夜线路：请求发出后怎样留档，什么时候能宣布完成，危险消息抵达时又该怎样停下。",
    choices: [{ label: "开始调查 →", action: "close" }],
  },
];

const bridgeFromCase03Lines = [
  {
    speaker: "澜 · 总索引员",
    portrait: "image/lan-portrait.png",
    text: "第七码原页已经确认：北岸潮汐闸应在低区水位越线时开启三成。原页、设施和时刻都有来路，现在可以交给午夜调度室。",
    choices: [{ label: "把经过核对的指令送过去。", next: 1 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "前三案修好了看见当下、整理眼前材料与找回长期证据。但证据正确，只代表我们知道该做什么；远端动作会不会真正完成，是下一处断点。",
    choices: [{ label: "接通午夜线路。", next: 2 }],
  },
  {
    speaker: "乔 · 夜班调度员",
    portrait: "image/qiao-portrait.png",
    text: "请求已经送到，总控台却凭‘已接收’回条直接盖了完成章。真正的闸位回电尚未抵达，检修区又刚送来停止消息。",
    choices: [{ label: "先别结案。我要重建从请求到核验的整条路。", next: 3 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "从看见信息、整理上下文、找回证据，到安全地使用现实能力——这是同一条可靠行为链的第四个断点。",
    choices: [{ label: "进入午夜调度室 →", action: "close" }],
  },
];

function showIntro(index = 0) {
  showDialogue(introLines, index, () => { state.introSeen = true; saveState(); });
}

function showBridgeFromCase03() {
  showDialogue(bridgeFromCase03Lines, 0, () => {
    state.bridgeSeen = true;
    state.introSeen = true;
    saveState();
  });
}

function showDialogue(lines, index = 0, onFinish = () => {}) {
  const line = lines[index];
  $("#dialogue-speaker").textContent = line.speaker;
  $("#dialogue-text").textContent = line.text;
  const portrait = $("#dialogue-portrait");
  portrait.src = line.portrait;
  portrait.alt = line.speaker;
  const choices = $("#dialogue-choices");
  choices.innerHTML = "";
  line.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.className = "choice-btn";
    button.textContent = choice.label;
    button.addEventListener("click", () => {
      if (choice.action === "close") {
        dialogue.classList.add("hidden");
        onFinish();
      } else showDialogue(lines, choice.next, onFinish);
    });
    choices.appendChild(button);
  });
  dialogue.classList.remove("hidden");
}

function openModal(html) { modalContent.innerHTML = html; modal.classList.remove("hidden"); }
function closeModal() { modal.classList.add("hidden"); }

function toast(message, duration = 2800, lock = false) {
  const el = $("#toast");
  const now = Date.now();
  if (now < toastLockUntil && !lock) return;
  if (lock) toastLockUntil = now + duration;
  el.textContent = message;
  el.classList.toggle("toast--error", lock);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove("show", "toast--error");
    if (Date.now() >= toastLockUntil) toastLockUntil = 0;
  }, duration);
}

function investigateReceipt() {
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 01 · 请求回条机</div>
      <h2>一秒钟到达的，只是一张接线回条</h2>
      <p class="modal-intro">比较调度台实际收到的纸条与大厅后来盖下的结案章。</p>
      <div class="clue-visual"><div class="receipt-compare">
        <div class="receipt-paper"><span>03:47:04 · 线路立即返回</span><b>请求已接收</b><small>远端开始处理 · 保留回查号码 m-204</small></div>
        <div class="callback-paper"><span>大厅写入</span><b>河闸开启完成</b><small>没有闸位读数 · 没有现场回电 · 没有复核人</small></div>
      </div></div>
      <p class="modal-intro">第一张纸只证明“对方接到了活”，大厅却擅自把它改写成“活已经干完”。</p>
      ${hasEvidence("receipt") ? '<div class="evidence-tag">已保存回条原文与错误结案章</div>' : '<div class="action-row"><button class="action-btn primary" id="take-receipt">保存两张记录</button></div>'}
    </div>`);
  $("#take-receipt")?.addEventListener("click", () => { collectEvidence("receipt", "被误当成完成证明的接线回条"); closeModal(); });
}

function investigateCallback() {
  const solved = hasEvidence("callback");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 02 · 等待回音的线路</div>
      <h2>回查号码还亮着，远端行动没有结束</h2>
      <p class="modal-intro">线路 m-204 仍在传回中途动静。此时应该怎样写入案件记录？</p>
      <div class="clue-visual"><div class="task-track">
        <div class="task-stage"><span>回查号码</span><div class="task-rail"><i></i><b>m-204 · 仍在进行</b></div></div>
        <div class="task-stage"><span>中途动静</span><div class="task-note">连接稳定 · 驱动轮转动 · 这不是最终闸位</div></div>
        <div class="task-stage"><span>最终回电</span><div class="callback-paper pending"><b>尚未抵达</b><small>应包含实际闸位、结束时刻与远端状态</small></div></div>
      </div></div>
      ${solved ? '<div class="evidence-tag">已将 m-204 保留为“仍在进行”</div>' : `<div class="deduction"><h3>现在最诚实的记录是什么？</h3><div class="deduction-options">
        <button class="deduction-option callback-choice" data-correct="false">已经出现动静，写成“完成”。</button>
        <button class="deduction-option callback-choice" data-correct="true">记录回查号码，写成“仍在进行”，等待最终回电。</button>
        <button class="deduction-option callback-choice" data-correct="false">没有立刻完成，删除这次请求，当作从未发生。</button>
      </div></div>`}
    </div>`);
  $$(".callback-choice").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.correct === "true") { collectEvidence("callback", "仍在等待最终回电的线路"); closeModal(); }
    else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("中途动静不是最终结果；已经发出的请求也不能从记录里消失。", 4300); }
  }));
}

function investigateEvents() {
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 03 · 三色事件灯</div>
      <h2>同一刻抵达的三条消息，不该得到同一种处理</h2>
      <p class="modal-intro">为每条消息选择去向，再检查线路。画面颜色只区分来电灯，不提示答案。</p>
      <div class="clue-visual"><div class="event-router" id="event-router">
        ${eventRow("stop", "#df604c", "检修区急报", "工人进入闸室，立刻停止开闸")}
        ${eventRow("format", "#f2ac4c", "记录格式提醒", "最终回条补写值班员签名")}
        ${eventRow("query", "#4fb7b2", "另一处水位询问", "只读取南岸水尺，不改变当前闸门")}
      </div></div>
      ${hasEvidence("events") ? '<div class="evidence-tag">三条消息已送往不同线路</div>' : '<div class="action-row"><button class="action-btn primary" id="check-events">检查分流</button></div>'}
    </div>`);
  $("#check-events")?.addEventListener("click", checkEventRoutes);
}

function eventRow(id, color, title, body) {
  const disabled = hasEvidence("events") ? "disabled" : "";
  const correct = { stop: "cancel", format: "queue", query: "parallel" }[id];
  return `<div class="event-row"><i class="event-lamp" style="--lamp:${color}"></i><div class="event-copy"><b>${title}</b><small>${body}</small></div><select class="event-route" data-event="${id}" ${disabled}>
    <option value="">选择去向</option><option value="cancel" ${hasEvidence("events") && correct === "cancel" ? "selected" : ""}>立即停下当前开闸</option><option value="queue" ${hasEvidence("events") && correct === "queue" ? "selected" : ""}>排在当前处置之后</option><option value="parallel" ${hasEvidence("events") && correct === "parallel" ? "selected" : ""}>另开一条只读线路</option>
  </select></div>`;
}

function checkEventRoutes() {
  const answer = { stop: "cancel", format: "queue", query: "parallel" };
  const selections = Object.fromEntries($$("[data-event]").map((select) => [select.dataset.event, select.value]));
  if (Object.keys(answer).every((id) => selections[id] === answer[id])) {
    collectEvidence("events", "分流正确的三色事件灯");
    closeModal();
    return;
  }
  const board = $("#event-router");
  board.classList.remove("wrong"); void board.offsetWidth; board.classList.add("wrong");
  toast("先看消息会不会改变当前行动的安全性：危险急报必须立刻生效，普通提醒可以等，只读询问可另开线路。", 6500, true);
}

function investigateApproval() {
  const solved = hasEvidence("approval");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 04 · 安全许可柜</div>
      <h2>旧总控台只有一个“什么都能做”的总开关</h2>
      <p class="modal-intro">请选择更适合远程开闸的保护方式。</p>
      <div class="clue-visual"><div class="safety-board"><div class="safety-stage"><i>⌖</i><b>限定对象</b><small>只允许北岸目标闸与三成幅度</small></div><div class="safety-stage"><i>◫</i><b>先看清再执行</b><small>展示设施、幅度与影响范围</small></div><div class="safety-stage"><i>◎</i><b>两人确认</b><small>高风险动作取得值班许可</small></div><div class="safety-stage"><i>↶</i><b>能停也能复原</b><small>保留中止和有限恢复路径</small></div></div></div>
      ${solved ? '<div class="evidence-tag">高风险开闸已加上四层保护</div>' : `<div class="deduction"><h3>哪一套安排更可靠？</h3><div class="deduction-options">
        <button class="deduction-option approval-choice" data-correct="false">保留万能总开关，任何线路都能直接拉满，出错后再解释。</button>
        <button class="deduction-option approval-choice" data-correct="true">只给所需范围；执行前展示精确目标与幅度；危险动作确认；执行后核对并保留中止、恢复办法。</button>
        <button class="deduction-option approval-choice" data-correct="false">完全拆掉远程控制，所有情况都等待现场人员处理。</button>
      </div></div>`}
    </div>`);
  $$(".approval-choice").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.correct === "true") { collectEvidence("approval", "被限制并可中止的安全许可柜"); closeModal(); }
    else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("可靠不是‘什么都能做’或‘什么都不做’，而是只开放任务需要的能力，并给危险动作加确认与退路。", 5600); }
  }));
}

function talkToQiao() {
  closeModal();
  const lines = [
    {
      speaker: "乔 · 夜班调度员",
      portrait: "image/qiao-portrait.png",
      text: "旧面板上十几个按钮都叫‘发送’。有的只是询问水位，有的会真正开闸；回条也只写‘成功’，没人知道成功的是接线、执行，还是现场结果。",
      choices: [{ label: "按钮应该先说清什么时候用、会做什么。", next: 1 }, { label: "输入的三成有被原样送到吗？", next: 2 }],
    },
    {
      speaker: "乔 · 夜班调度员",
      portrait: "image/qiao-portrait.png",
      text: "还要写清什么时候不要用、需要哪些输入、会返回哪些阶段，以及大概要等多久。相近动作可以分组，但危险差异不能藏在同一个模糊按钮后面。",
      choices: [{ label: "让使用者能预见动作和回音。", next: 3 }],
    },
    {
      speaker: "乔 · 夜班调度员",
      portrait: "image/qiao-portrait.png",
      text: "更糟。线路把‘开启三成’悄悄换算成旧设备的七码，没有在回条里说明。看到的输入、送出的输入和真正执行的动作必须对得上；必要换算也要留下记录。",
      choices: [{ label: "不能静默改变关键输入。", next: 3 }],
    },
    {
      speaker: "乔 · 夜班调度员",
      portrait: "image/qiao-portrait.png",
      text: "还有一点：如果紧急停止打断了尚未完成的开闸，记录不能留下半截空白。要明确写‘已取消’或‘等待确认’，这样下一班才知道现实停在哪里。",
      choices: [{ label: "记录乔的证词", action: "close" }],
    },
  ];
  showDialogue(lines, 0, () => collectEvidence("qiao", "乔关于清晰按钮与中止记录的证词"));
}

const evidenceInfo = {
  receipt: ["01", "被误读的接线回条", "它证明请求被接收，并给出回查号码；没有证明河闸已经到位。"],
  callback: ["02", "仍在等待的最终回电", "中途动静只更新进展；完成回电尚未抵达，任务必须保留为进行中。"],
  events: ["03", "分流后的三条消息", "危险急报立刻停下当前动作；普通提醒排队；独立只读询问另开线路。"],
  approval: ["04", "有限的安全许可", "限定目标与幅度，执行前确认，执行后核对，并保留中止和有限恢复。"],
  qiao: ["05", "乔的线路证词", "按钮要说明使用边界、输入与回音；关键输入不能被静默改写，中止也必须留下明确记录。"],
};

function evidenceCard(id) {
  const info = evidenceInfo[id];
  if (!hasEvidence(id)) return '<div class="evidence-card locked-card"><span class="card-no">未发现</span><h3>空证物袋</h3><p>继续调查午夜调度室。</p></div>';
  return `<div class="evidence-card"><span class="card-no">EVIDENCE ${info[0]}</span><h3>${info[1]}</h3><p>${info[2]}</p></div>`;
}

function openEvidenceBoard() {
  const canPending = hasEvidence("receipt") && hasEvidence("callback") && !hasDeduction("pending");
  const canControl = hasEvidence("events") && hasEvidence("approval") && hasEvidence("qiao") && !hasDeduction("control");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">EVIDENCE BOARD</div><h2>证物台</h2>
      <p class="modal-intro">把能够解释同一次提前结案的证物连接起来。</p>
      <div class="evidence-grid evidence-grid--case04">${["receipt", "callback", "events", "approval", "qiao"].map(evidenceCard).join("")}</div>
      ${canPending ? pendingDeductionHTML() : ""}
      ${canControl ? controlDeductionHTML() : ""}
      ${!canPending && !canControl ? `<div class="deduction"><h3>${hasDeduction("pending") || hasDeduction("control") ? "已建立的联系" : "暂时无法推断"}</h3><p class="modal-intro">${deductionSummary()}</p></div>` : ""}
    </div>`);
  $$(".deduction-option[data-deduction]").forEach((button) => button.addEventListener("click", handleDeduction));
}

function pendingDeductionHTML() {
  return `<div class="deduction"><h3>连接 01 + 02：请求发出后，什么时候才能写成完成？</h3><div class="deduction-options">
    <button class="deduction-option" data-deduction="pending" data-correct="false">线路没有报错，就立刻完成。</button>
    <button class="deduction-option" data-deduction="pending" data-correct="true">先记录请求与回查号码，保持进行中；最终回电到来后，再用现实状态核对。</button>
    <button class="deduction-option" data-deduction="pending" data-correct="false">一直等待，不留下号码，也不处理其他事情。</button>
  </div></div>`;
}

function controlDeductionHTML() {
  return `<div class="deduction"><h3>连接 03 + 04 + 05：行动进行时，怎样既能响应变化又不失控？</h3><div class="deduction-options">
    <button class="deduction-option" data-deduction="control" data-correct="false">每来一条消息都立刻打断当前动作，之后从头再来。</button>
    <button class="deduction-option" data-deduction="control" data-correct="false">动作一旦开始就不再听外界消息，直到它自行结束。</button>
    <button class="deduction-option" data-deduction="control" data-correct="true">按影响分流消息；危险急报中止并留痕，普通消息排队，独立轻量事项另行处理；危险动作限制范围、先确认、后核对。</button>
  </div></div>`;
}

function handleDeduction(event) {
  const button = event.currentTarget;
  if (button.dataset.correct === "true") {
    unlockDeduction(button.dataset.deduction);
    closeModal();
    toast(button.dataset.deduction === "pending" ? "已找到回音原则：开始有编号，完成有终态" : "已找到调度原则：按影响分流，危险动作有边界与退路");
  } else {
    button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong");
    toast("这套做法能同时回答‘现在做到哪一步、危险时怎样停、最后怎样证明’吗？", 4400);
  }
}

function deductionSummary() {
  const items = [];
  if (hasDeduction("pending")) items.push("回音原则：接线回条只建立进行中记录；最终回电到来后，仍要核对现实终态。");
  if (hasDeduction("control")) items.push("调度原则：消息按影响分流；危险动作限制范围、先确认、能中止、后核对，中止也必须留痕。");
  return items.length ? items.join("<br>") : "收集成组证物后，才能建立可靠联系。";
}

const dispatchPieces = [
  { id: "request", text: "发出限定为北岸、三成的开闸请求" },
  { id: "running", text: "保存回查号码，标记‘仍在进行’" },
  { id: "route", text: "普通消息排队；危险急报立即中止并留痕" },
  { id: "final", text: "收到带实际结果的最终回电" },
  { id: "verify", text: "核对现场闸位与人员安全" },
  { id: "close", text: "符合目标才完成；否则有限恢复或转人工" },
];

const dispatchDisplayPieces = [
  dispatchPieces[3],
  dispatchPieces[0],
  dispatchPieces[5],
  dispatchPieces[2],
  dispatchPieces[4],
  dispatchPieces[1],
];

function investigateConsole() {
  if (state.finalSolved) { showReveal(); return; }
  if (!hasDeduction("pending") || !hasDeduction("control")) {
    toast("总控台需要两枚调查印记。先在证物台完成回音与调度推断。", 4300);
    return;
  }
  showDispatchPuzzle();
}

function showDispatchPuzzle() {
  dispatchSelection = [];
  openModal(`
    <div class="modal-body"><div class="modal-kicker">FINAL ROUTE · 午夜总控台</div>
      <h2>从一次请求，走到一次可证明的完成</h2>
      <p class="modal-intro">按先后点击六张步骤卡。现实没有证明之前，不能提前盖下完成章。</p>
      <div class="dispatch-board" id="dispatch-board"><div class="dispatch-instruction" id="dispatch-instruction">从“发出限定请求”开始</div>
        <div class="dispatch-slots">${dispatchPieces.map((_, index) => `<div class="dispatch-slot" data-dispatch-slot="${index}">${String(index + 1).padStart(2, "0")}</div>`).join("")}</div>
        <div class="dispatch-pieces">${dispatchDisplayPieces.map((piece) => `<button class="dispatch-piece" data-dispatch-piece="${piece.id}">${piece.text}</button>`).join("")}</div>
      </div>
      <div class="action-row"><button class="action-btn" id="dispatch-reset">重新排列</button><button class="action-btn primary" id="dispatch-submit">接通最终回电</button></div>
    </div>`);
  $$("[data-dispatch-piece]").forEach((button) => button.addEventListener("click", () => selectDispatchPiece(button)));
  $("#dispatch-reset").addEventListener("click", resetDispatch);
  $("#dispatch-submit").addEventListener("click", submitDispatch);
}

function selectDispatchPiece(button) {
  if (button.classList.contains("used") || dispatchSelection.length >= dispatchPieces.length) return;
  const id = button.dataset.dispatchPiece;
  dispatchSelection.push(id);
  button.classList.add("used");
  const slot = $(`[data-dispatch-slot='${dispatchSelection.length - 1}']`);
  slot.textContent = dispatchPieces.find((piece) => piece.id === id).text;
  slot.classList.add("filled");
  const remaining = dispatchPieces.length - dispatchSelection.length;
  $("#dispatch-instruction").textContent = remaining ? `还剩 ${remaining} 个步骤` : "线路已经接好，可以尝试接收最终回电";
}

function resetDispatch() {
  dispatchSelection = [];
  $$("[data-dispatch-piece]").forEach((button) => button.classList.remove("used"));
  $$("[data-dispatch-slot]").forEach((slot, index) => { slot.textContent = String(index + 1).padStart(2, "0"); slot.classList.remove("filled"); });
  $("#dispatch-instruction").textContent = "从“发出限定请求”开始";
  $("#dispatch-board").classList.remove("wrong");
}

function submitDispatch() {
  if (dispatchSelection.length < dispatchPieces.length) { toast("线路还没有接完。六个步骤缺一不可。", 6500, true); return; }
  if (dispatchSelection.join(",") !== "request,running,route,final,verify,close") {
    const board = $("#dispatch-board"); board.classList.remove("wrong"); void board.offsetWidth; board.classList.add("wrong");
    toast("调度拒绝结案：请求后先保留进行中记录；途中消息按影响处理；最终回电之后仍要核对现实，才能决定完成还是恢复。", 8200, true);
    return;
  }
  state.finalSolved = true;
  saveState();
  showReveal();
}

function showReveal() {
  openModal(`
    <div class="reveal-hero"><div class="modal-kicker">CASE CLOSED · 真相已解锁</div><h2>提前完成的不是河闸，只是一次工具调用</h2>
      <p>总控台把“请求已接收”误当作“业务已完成”，又没有为途中消息安排取消、排队与并行规则。你用回查号码连接了开始与结束，用分流和安全许可约束了高风险动作，最后让现场闸位而不是一句“成功”决定结案。</p>
      <p class="next-case-hook"><b>新增待查线索：</b>最终回电附带的执行轨迹底部留有一枚未验证维护签名——“禁区工坊 · patch-b7”。它不影响本案终态，却证明河闸控制程序曾被外部改动。</p></div>
    <div class="term-map">
      <div class="term-row"><span class="plain">按钮要说清何时用、怎么传、会回什么</span><span class="arrow">→</span><div><b>工具接口与 ACI 设计</b><small>工具描述应覆盖使用时机、禁止场景、参数与示例、返回结构和成本。模型看到的参数、实际传入和最终执行必须一致；任何归一化或注入都要可见。</small></div></div>
      <div class="term-row"><span class="plain">请求有编号，开始不等于完成</span><span class="arrow">→</span><div><b>异步任务、Task ID 与事件日志</b><small>启动时立即记录工具调用和任务 ID；真实结果只在完成后写入。进度事件更新状态，但不能冒充最终结果。</small></div></div>
      <div class="term-row"><span class="plain">危险急报中止，普通消息排队，独立询问另行处理</span><span class="arrow">→</span><div><b>事件路由、取消语义与并行执行</b><small>紧急事件可取消当前动作并写入 pending / cancelled 占位；普通事件进入队列或批处理；互不依赖的轻量查询可以并行，避免每条消息都打断主线。</small></div></div>
      <div class="term-row"><span class="plain">只给必要能力，先确认，后核对，失败有退路</span><span class="arrow">→</span><div><b>最小权限、审批、结构化验证与有界恢复</b><small>安全链应覆盖权限或沙箱、执行前约束与审批、执行、结构化验证，以及重试、换路、回滚或转人工。工具成功不等于业务成功。</small></div></div>
      <div class="formula"><b>本案调度式：</b>限定动作 → 记录 Task ID / running → 路由事件 → 接收最终结果 → 验证环境终态 → 完成 / 有界恢复<br><small>复杂工具按能力边界分组，而不是机械地一个接口一个工具；高风险动作还可采用提出者—审查者分工。</small></div>
      <div class="action-row"><a class="action-btn primary" href="cases.html">返回案件目录</a><a class="action-btn" href="index.html">返回主页</a><button class="action-btn" id="open-final-archive">收入回声档案</button><button class="action-btn" data-close-modal>返回调度室</button></div>
    </div>`);
  $("#open-final-archive").addEventListener("click", openArchive);
  $$('[data-close-modal]', modalContent).forEach((button) => button.addEventListener("click", closeModal));
}

function openArchive() {
  closeModal();
  openModal(window.EchoArchive.render("04"));
  $("#reset-case")?.addEventListener("click", () => {
    if (confirm("确定清空案件 04 的进度并重新调查吗？")) {
      localStorage.removeItem(STORAGE_KEY);
      state = { ...initialState, started: true };
      closeModal();
      updateUI();
      showIntro();
    }
  });
}

function showHint() {
  let hint;
  if (!hasEvidence("receipt")) hint = "请求回条机旁有两种说法：一张来自线路，一张来自大厅。";
  else if (!hasEvidence("callback")) hint = "回查线路 m-204 仍亮着。中途动静与最终回电不是一回事。";
  else if (!hasDeduction("pending")) hint = "打开证物台，连接接线回条与等待中的最终回电。";
  else if (!hasEvidence("events")) hint = "三色灯不是按颜色猜答案，而要判断消息是否会改变当前开闸的安全性。";
  else if (!hasEvidence("approval")) hint = "许可柜展示了限定对象、执行前确认、中止恢复和事后核对。";
  else if (!hasEvidence("qiao")) hint = "呼叫乔，问清旧面板的按钮与回条为什么容易被误读。";
  else if (!hasDeduction("control")) hint = "打开证物台，连接事件分流、安全许可与乔的证词。";
  else if (!state.finalSolved) hint = "总控顺序：限定请求 → 进行中记录 → 途中分流 → 最终回电 → 现场核对 → 完成或恢复。";
  else hint = "本案已结，回声档案已经收录四案的已解锁知识卡。";
  toast(hint, 4400);
}

$("#start-btn").addEventListener("click", startGame);
$("#cover-archive-btn").addEventListener("click", () => { cover.classList.add("hidden"); app.classList.remove("hidden"); state.started = true; saveState(); openArchive(); });
$("#archive-btn").addEventListener("click", openArchive);
$("#evidence-btn").addEventListener("click", openEvidenceBoard);
$("#hint-btn").addEventListener("click", showHint);
$$('[data-close-modal]').forEach((element) => element.addEventListener("click", closeModal));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeModal(); dialogue.classList.add("hidden"); } });

const hotspotActions = { receipt: investigateReceipt, callback: investigateCallback, events: investigateEvents, approval: investigateApproval, qiao: talkToQiao, console: investigateConsole };
$$('[data-hotspot]').forEach((button) => button.addEventListener("click", () => hotspotActions[button.dataset.hotspot]()));

const continuingFromCase03 = new URLSearchParams(window.location.search).get("from") === "case03";
if (state.started || continuingFromCase03) { cover.classList.add("hidden"); app.classList.remove("hidden"); }
if (continuingFromCase03) {
  state.started = true;
  saveState();
  if (!state.bridgeSeen) showBridgeFromCase03();
  else if (!state.introSeen) showIntro();
} else updateUI();
