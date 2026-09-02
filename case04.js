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
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      ...initialState,
      ...parsed,
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      deductions: Array.isArray(parsed.deductions) ? parsed.deductions : [],
    };
  }
  catch { return { ...initialState, evidence: [], deductions: [] }; }
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
    hint.textContent = "一张只说远处接到了活，另一张才会告诉你闸门最后停在哪儿。";
  } else if (!hasDeduction("pending")) {
    objective.textContent = "两张纸说的不是同一件事。去证物台把它们放在一起。";
    hint.textContent = "真正的回电还没来，这一栏该写‘完成’，还是‘还在做’？";
  } else if (!hasEvidence("events") || !hasEvidence("approval") || !hasEvidence("qiao")) {
    objective.textContent = "开闸途中又来了三条消息。调查灯墙、许可柜并询问乔。";
    hint.textContent = "有人闯进闸室必须马上停；补签名可以等；问另一把水尺不用碰当前闸门。";
  } else if (!hasDeduction("control")) {
    objective.textContent = "证物已经说明万能总杆太危险。回证物台想出更稳妥的开闸办法。";
    hint.textContent = "想清楚谁能动、动哪里、动多少，以及怎样停下和核对。";
  } else if (!state.finalSolved) {
    objective.textContent = "把开闸命令、途中来信和最终回电重新接成一条完整线路。";
    hint.textContent = "接线回条只能写‘还在做’；最终回电到了，还要去现场看一眼。";
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
    text: "凌晨三点四十七分，北岸低区水位越线。总控台命令河闸开启三成，一秒后就吐出回条。大厅随即把事故标成了‘已处理’。",
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
    text: "总控台把第一声回应当成了最后结果。更危险的是，开闸途中有人闯进检修区；‘立刻停闸’和‘回条别忘签名’两封来信同时亮起，旧线路却不知道该先听谁。",
    choices: [{ label: "先分清哪些来信必须立刻处理。", next: 3 }],
  },
  {
    speaker: "乔 · 夜班调度员",
    portrait: "image/qiao-portrait.png",
    text: "请重接这条午夜线路：命令发出后怎样留在值班簿里，什么时候能宣布完成，危险来信抵达时又该怎样停下。",
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
    text: "码头、救援大厅和第七码库已经把正确指令送到了这里。但纸上写对了，只说明我们知道该做什么；几十里外的闸门有没有真的动，还得等它自己回话。",
    choices: [{ label: "接通午夜线路。", next: 2 }],
  },
  {
    speaker: "乔 · 夜班调度员",
    portrait: "image/qiao-portrait.png",
    text: "开闸命令已经送到，总控台却凭‘已接收’回条直接盖了完成章。真正的闸位回电还没来，检修区又刚送来停闸急报。",
    choices: [{ label: "先别盖章。我要查清命令发出以后发生了什么。", next: 3 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "前三处故障让人看错、找乱、翻错卷；这一处会直接推动河闸。越能改变现实的机关，越不能只凭一张‘已接收’回条放心。",
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

function openModal(html) {
  modalContent.innerHTML = html;
  modal.classList.remove("hidden");
  const card = modal.querySelector(".modal__card");
  card.scrollTop = 0;
  modalContent.setAttribute("tabindex", "-1");
  requestAnimationFrame(() => {
    card.scrollTop = 0;
    modalContent.focus({ preventScroll: true });
  });
}
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
      <div class="modal-kicker">调查点 01 · 接线回条机</div>
      <h2>一秒钟到达的，只是一张接线回条</h2>
      <p class="modal-intro">比较调度台实际收到的纸条与大厅后来盖下的结案章。</p>
      <div class="clue-visual"><div class="receipt-compare">
        <div class="receipt-paper"><span>03:47:04 · 线路立即返回</span><b>开闸命令已收到</b><small>远处开始转动 · 保留回查号码 m-204</small></div>
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
        <div class="task-stage"><span>最终回电</span><div class="callback-paper pending"><b>尚未抵达</b><small>应写明实际闸位、结束时刻，以及机器是否正常停下</small></div></div>
      </div></div>
      ${solved ? '<div class="evidence-tag">已将 m-204 保留为“仍在进行”</div>' : `<div class="deduction"><h3>现在最诚实的记录是什么？</h3><div class="deduction-options">
        <button class="deduction-option callback-choice" data-correct="false">已经出现动静，写成“完成”。</button>
        <button class="deduction-option callback-choice" data-correct="true">记录回查号码，写成“仍在进行”，等待最终回电。</button>
        <button class="deduction-option callback-choice" data-correct="false">没有立刻完成，就删掉这次命令，当作从未发出。</button>
      </div></div>`}
    </div>`);
  $$(".callback-choice").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.correct === "true") { collectEvidence("callback", "仍在等待最终回电的线路"); closeModal(); }
    else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("中途的齿轮声不是最终结果；已经发出的开闸命令也不能从值班簿里消失。", 4700); }
  }));
}

const eventRouteOptions = [
  { value: "queue", text: "先放进待办夹，开闸后处理" },
  { value: "parallel", text: "交给另一名值班员单独抄水尺" },
  { value: "cancel", text: "立即停下当前开闸" },
];

function investigateEvents() {
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 03 · 三色来信灯</div>
      <h2>同一刻亮起的三封来信，不能一股脑塞进同一根管子</h2>
      <p class="modal-intro">替每封来信选一个去处，每个去处只能使用一次。灯的颜色只方便分辨，不会替你决定先后。</p>
      <div class="clue-visual"><div class="event-router" id="event-router">
        ${eventRow("stop", "#df604c", "检修区急报", "工人进入闸室，立刻停止开闸")}
        ${eventRow("format", "#f2ac4c", "补签提醒", "最终回条别忘补上值班员签名")}
        ${eventRow("query", "#4fb7b2", "另一处水位询问", "只读取南岸水尺，不改变当前闸门")}
      </div></div>
      ${hasEvidence("events") ? '<div class="evidence-tag">三封来信已经各自去往正确位置</div>' : '<div class="action-row"><button class="action-btn primary" id="check-events">检查来信去向</button></div>'}
    </div>`);
  const routeSelects = $$('[data-event]');
  routeSelects.forEach((select) => select.addEventListener("change", syncEventRouteAvailability));
  syncEventRouteAvailability();
  $("#check-events")?.addEventListener("click", checkEventRoutes);
}

function eventRow(id, color, title, body) {
  const disabled = hasEvidence("events") ? "disabled" : "";
  const correct = { stop: "cancel", format: "queue", query: "parallel" }[id];
  return `<div class="event-row"><i class="event-lamp" style="--lamp:${color}"></i><div class="event-copy"><b>${title}</b><small>${body}</small></div><select class="event-route" data-event="${id}" ${disabled}>
    <option value="">选择去向</option>${eventRouteOptions.map((option) => `<option value="${option.value}" ${hasEvidence("events") && correct === option.value ? "selected" : ""}>${option.text}</option>`).join("")}
  </select></div>`;
}

function syncEventRouteAvailability() {
  const selects = $$('[data-event]');
  const selectedRoutes = new Set(selects.map((select) => select.value).filter(Boolean));
  selects.forEach((select) => {
    $$('option[value]', select).forEach((option) => {
      if (!option.value) return;
      option.disabled = option.value !== select.value && selectedRoutes.has(option.value);
    });
  });
}

function checkEventRoutes() {
  const answer = { stop: "cancel", format: "queue", query: "parallel" };
  const selections = Object.fromEntries($$("[data-event]").map((select) => [select.dataset.event, select.value]));
  if (Object.keys(answer).every((id) => selections[id] === answer[id])) {
    collectEvidence("events", "各有去处的三封来信");
    closeModal();
    return;
  }
  const board = $("#event-router");
  board.classList.remove("wrong"); void board.offsetWidth; board.classList.add("wrong");
  toast("先问哪封信会让眼前的开闸变危险：有人进入闸室必须马上停；签名可以等；南岸水尺可以交给另一名值班员抄。", 7000, true);
}

function investigateApproval() {
  const solved = hasEvidence("approval");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 04 · 安全许可柜</div>
      <h2>旧总控台只有一根“什么都能拉”的万能总杆</h2>
      <p class="modal-intro">选出更适合远程开闸的一套规矩。</p>
      <div class="clue-visual"><div class="safety-board"><div class="safety-stage"><i>⌖</i><b>只接目标闸</b><small>只能动北岸这把闸，最多三成</small></div><div class="safety-stage"><i>◫</i><b>拉杆前再读一遍</b><small>把闸门名称和开度摆在眼前</small></div><div class="safety-stage"><i>◎</i><b>两名值班员确认</b><small>危险动作不能一人说了算</small></div><div class="safety-stage"><i>↶</i><b>半路能停</b><small>保留停闸和呼叫现场人员的办法</small></div></div></div>
      ${solved ? '<div class="evidence-tag">远程开闸已经加上四道门闩</div>' : `<div class="deduction"><h3>哪一套规矩更可靠？</h3><div class="deduction-options">
        <button class="deduction-option approval-choice" data-correct="false">保留万能总开关，任何线路都能直接拉满，出错后再解释。</button>
        <button class="deduction-option approval-choice" data-correct="true">总杆只接北岸目标闸，最多三成；拉下前再读一遍名称和开度，并由两人确认；途中能停，最后去现场核对。</button>
        <button class="deduction-option approval-choice" data-correct="false">完全拆掉远程控制，所有情况都等待现场人员处理。</button>
      </div></div>`}
    </div>`);
  $$(".approval-choice").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.correct === "true") { collectEvidence("approval", "给万能总杆加上的四道门闩"); closeModal(); }
    else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("稳妥不是让总杆什么都能拉，也不是把它拆掉。它应该只接目标闸、限制开度，并在危险时停得下来。", 6200); }
  }));
}

function talkToQiao() {
  closeModal();
  const lines = [
    {
      speaker: "乔 · 夜班调度员",
      portrait: "image/qiao-portrait.png",
      text: "旧面板上十几个按钮都叫‘发送’。有的只是问水位，有的会真的拉动闸门；回条又都只写‘成功’，没人知道究竟是电线接通了、齿轮开始转了，还是闸门已经到位。",
      choices: [{ label: "每个按钮应该直接写清会发生什么。", next: 1 }, { label: "纸上写的三成，真的原样送到了吗？", next: 2 }],
    },
    {
      speaker: "乔 · 夜班调度员",
      portrait: "image/qiao-portrait.png",
      text: "还得写明什么时候不能按、按之前要填什么、先后会收到几张回条、大概要等多久。问水位和开闸看着相近，却绝不能藏在同一个含糊按钮后面。",
      choices: [{ label: "让值班员按下去前就知道会发生什么。", next: 3 }],
    },
    {
      speaker: "乔 · 夜班调度员",
      portrait: "image/qiao-portrait.png",
      text: "没有。旧线路悄悄把‘开启三成’换成了老闸盘上的七码，回条上却一个字没写。值班员写了什么、线路送了什么、闸盘最后照什么转，三处必须对得上；换过刻度也要写在纸上。",
      choices: [{ label: "不能悄悄改掉开闸的关键数字。", next: 3 }],
    },
    {
      speaker: "乔 · 夜班调度员",
      portrait: "image/qiao-portrait.png",
      text: "还有一点：如果紧急停闸打断了尚未完成的动作，值班簿不能留下半截空白。要写清‘已经停下’或‘还等现场确认’，下一班才知道闸门究竟停在哪里。",
      choices: [{ label: "记录乔的证词", action: "close" }],
    },
  ];
  showDialogue(lines, 0, () => collectEvidence("qiao", "乔关于按钮名称、刻度和停闸记录的证词"));
}

const evidenceInfo = {
  receipt: ["01", "被误读的接线回条", "它证明远处收到了开闸命令，并给出回查号码；没有证明河闸已经到位。"],
  callback: ["02", "仍在等待的最终回电", "线路虽然传来齿轮转动声，却还没说闸门最后停在哪儿；值班簿只能写‘还在做’。"],
  events: ["03", "各有去处的三封来信", "闯入闸室的急报马上停闸；补签名放进待办夹；南岸水尺交给另一名值班员。"],
  approval: ["04", "万能总杆的四道门闩", "只接北岸目标闸、限制三成、拉下前两人确认，途中能停，最后去现场看。"],
  qiao: ["05", "乔的线路证词", "按钮要写清会发生什么；三成不能被悄悄换成七码，停闸以后也必须写清停在哪里。"],
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
  return `<div class="deduction"><h3>连接 01 + 02：命令送出后，什么时候才能盖“完成”章？</h3><div class="deduction-options">
    <button class="deduction-option" data-deduction="pending" data-correct="false">线路没有报错，就立刻完成。</button>
    <button class="deduction-option" data-deduction="pending" data-correct="true">先抄下命令和回查号码，在值班簿写“还在做”；等最终回电到来，再去现场核对闸门。</button>
    <button class="deduction-option" data-deduction="pending" data-correct="false">一直等待，不留下号码，也不处理其他事情。</button>
  </div></div>`;
}

function controlDeductionHTML() {
  return `<div class="deduction"><h3>连接 03 + 04 + 05：开闸途中，三封来信和万能总杆该怎样管？</h3><div class="deduction-options">
    <button class="deduction-option" data-deduction="control" data-correct="false">每来一条消息都立刻打断当前动作，之后从头再来。</button>
    <button class="deduction-option" data-deduction="control" data-correct="false">动作一旦开始就不再听外界消息，直到它自行结束。</button>
    <button class="deduction-option" data-deduction="control" data-correct="true">有人进入闸室就马上停闸并写进值班簿；补签名放进待办夹；南岸水尺交给别人抄。总杆只接目标闸、限制三成，拉下前两人确认，最后看现场。</button>
  </div></div>`;
}

function handleDeduction(event) {
  const button = event.currentTarget;
  if (button.dataset.correct === "true") {
    unlockDeduction(button.dataset.deduction);
    window.EchoFeedback.showMastery("04", button.dataset.deduction, openModal, closeModal);
  } else {
    button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong");
    toast("这套做法能同时回答‘现在做到哪一步、危险时怎样停、最后怎样证明’吗？", 4400);
  }
}

function deductionSummary() {
  const items = [];
  if (hasDeduction("pending")) items.push("回电规矩：接线回条只证明远处接到了活；最终回电到来后，还要去现场看闸门。");
  if (hasDeduction("control")) items.push("值班规矩：闯入闸室的急报马上停闸，补签名等候，另一把水尺交给别人；总杆只接目标闸，拉下前确认，途中能停。");
  return items.length ? items.join("<br>") : "收集成组证物后，才能建立可靠联系。";
}

const dispatchPieces = [
  { id: "request", text: "发出只准北岸目标闸开启三成的命令" },
  { id: "running", text: "抄下回查号码，在值班簿写“还在做”" },
  { id: "route", text: "补签名先等候；有人进闸室就立即停闸并记下" },
  { id: "final", text: "等到写明实际闸位的最终回电" },
  { id: "verify", text: "请现场值班员核对闸位与人员安全" },
  { id: "close", text: "现场相符才盖章；不符就停下、复原或请人接手" },
];

function isValidDispatchOrder(order) {
  return order.join(",") === "request,running,route,final,verify,close";
}

function shuffledDispatchPieces() {
  const pieces = [...dispatchPieces];
  for (let index = pieces.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pieces[index], pieces[swapIndex]] = [pieces[swapIndex], pieces[index]];
  }
  if (isValidDispatchOrder(pieces.map((piece) => piece.id))) {
    [pieces[0], pieces[pieces.length - 1]] = [pieces[pieces.length - 1], pieces[0]];
  }
  return pieces;
}

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
  const displayPieces = shuffledDispatchPieces();
  openModal(`
    <div class="modal-body"><div class="modal-kicker">FINAL ROUTE · 午夜总控台</div>
      <h2>从一纸开闸命令，走到一枚经得起检查的完成章</h2>
      <p class="modal-intro">按先后点击六张步骤卡。现场没有回答之前，完成章不能提前落下。</p>
      <div class="dispatch-board" id="dispatch-board"><div class="dispatch-instruction" id="dispatch-instruction">从“发出限定开闸命令”开始</div>
        <div class="dispatch-slots">${dispatchPieces.map((_, index) => `<div class="dispatch-slot" data-dispatch-slot="${index}">${String(index + 1).padStart(2, "0")}</div>`).join("")}</div>
        <div class="dispatch-pieces">${displayPieces.map((piece) => `<button class="dispatch-piece" data-dispatch-piece="${piece.id}">${piece.text}</button>`).join("")}</div>
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
  $("#dispatch-instruction").textContent = "从“发出限定开闸命令”开始";
  $("#dispatch-board").classList.remove("wrong");
}

function submitDispatch() {
  if (dispatchSelection.length < dispatchPieces.length) { toast("线路还没有接完。六个步骤缺一不可。", 6500, true); return; }
  if (!isValidDispatchOrder(dispatchSelection)) {
    const board = $("#dispatch-board"); board.classList.remove("wrong"); void board.offsetWidth; board.classList.add("wrong");
    toast("总控台拒绝盖章：命令送出后先留下回查号码；途中急报要能停闸；最终回电到了，还要请现场值班员亲眼看过。", 8200, true);
    return;
  }
  state.finalSolved = true;
  saveState();
  showReveal();
}

function showReveal() {
  openModal(`
    <div class="reveal-hero"><div class="modal-kicker">CASE CLOSED · 真相已解锁</div><h2>提前落下的是完成章，不是河闸</h2>
      <p>你没有把另一句“成功”写回记录，而是分清了命令、接收、进行、取消和完成。现在沿着回条、回电和三色来信重建整条调度链。</p>
      <p class="next-case-hook"><b>新增待查线索：</b>最终回电纸带末尾留着一枚没人复查过的维护签名——“禁区工坊 · patch-b7”。它没有改变本案最后的闸位，却说明河闸内部曾被工坊动过。</p></div>
    ${window.EchoFeedback.renderCompletion("04")}
    <div class="case-reconstruction">
      <section class="reconstruction-block">
        <div class="reconstruction-heading"><span>1</span><h3>关键证物重新作证</h3></div>
        <div class="evidence-replay">
          <article class="replay-card"><span>证物 01 + 02</span><b>接线回条只证明接到命令，最终回电才报告闸位</b><p>m-204 在回条出现时仍处于进行中；没有回电和现场读数，不能盖完成章。</p></article>
          <article class="replay-card"><span>证物 03 + 04 + 05</span><b>三封来信性质不同，万能总杆却没有边界</b><p>闯入闸室需要立即停闸，补签名可以排队，南岸水尺可以另行处理；高风险总杆还需要限闸、限幅、复述、双人确认和中途停止。</p></article>
        </div>
        <p class="player-proof"><b>你作出的判断：</b>启动、进展、完成和取消必须分别记录；新事件不能一律打断或一律忽略，高风险动作也不能只靠操作者自觉。</p>
      </section>
      <section class="reconstruction-block">
        <div class="reconstruction-heading"><span>2</span><h3>错误完成章是怎样落下的</h3></div>
        <div class="causal-chain"><div class="causal-node">回条被误读成最终结果</div><i class="causal-arrow">→</i><div class="causal-node">running 被提前写成 completed</div><i class="causal-arrow">→</i><div class="causal-node">不同来信挤进同一处理管道</div><i class="causal-arrow">→</i><div class="causal-node">万能总杆缺少权限和停止边界</div><i class="causal-arrow">→</i><div class="causal-node">记录与真实闸位分离</div></div>
      </section>
      <section class="reconstruction-block">
        <div class="reconstruction-heading"><span>3</span><h3>你重接的午夜线路</h3></div>
        <div class="repair-chain"><div class="causal-node">发出限定命令</div><i class="causal-arrow">→</i><div class="causal-node">保存 Task ID 与 running</div><i class="causal-arrow">→</i><div class="causal-node">急报取消、普通排队、独立分流</div><i class="causal-arrow">→</i><div class="causal-node">接收最终回电</div><i class="causal-arrow">→</i><div class="causal-node">现场核对后完成或恢复</div></div>
      </section>
    </div>
    <div class="term-map">
      <h3 class="term-map__title">现在，给你重接的线路命名</h3>
      <p class="term-map__intro">每个状态和安全边界，都来自你在总控台实际保留的一步。</p>
      <div class="term-row"><span class="plain">限定北岸目标闸、三成开度并复述</span><span class="arrow">→</span><div><b>工具接口与 ACI 设计</b><small>你让动作的使用时机、目标、参数边界和返回状态都变得明确，并让实际执行与操作者看到的命令一致。</small></div></div>
      <div class="term-row"><span class="plain">回条保存 m-204，记录“仍在进行”</span><span class="arrow">→</span><div><b>异步任务、Task ID 与事件日志</b><small>启动只返回可回查编号；进展更新状态，只有最终回电到达后才能写入真实结果。</small></div></div>
      <div class="term-row"><span class="plain">急报停闸、补签排队、水尺分流</span><span class="arrow">→</span><div><b>事件路由、取消语义与并行执行</b><small>你按紧急度与独立性分别选择取消、排队和另行处理，而不是让每封来信都破坏主线。</small></div></div>
      <div class="term-row"><span class="plain">限闸限幅、双人确认、中途能停、现场核对</span><span class="arrow">→</span><div><b>最小权限、审批、结构化验证与有界恢复</b><small>这些门闩共同构成执行前约束、执行中控制、执行后验证和失败恢复；任何一层都不能由一句“请小心”替代。</small></div></div>
      <div class="formula"><b>本案完整映射：</b>限定动作 → 记录 Task ID / running → 路由事件 → 接收最终结果 → 验证环境终态 → 完成 / 有界恢复<br><small>回条、进度、回电和现场读数属于不同证据；只有最后两项足以支持完成章。</small></div>
      <div class="action-row"><a class="action-btn primary" href="case05.html?from=case04">追查维护签名：进入下一案 →</a><a class="action-btn" href="cases.html">返回案件目录</a><a class="action-btn" href="index.html">返回主页</a><button class="action-btn" id="open-final-archive">收入回声档案</button><button class="action-btn" data-close-modal>返回调度室</button></div>
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
      state = { ...initialState, evidence: [], deductions: [], started: true };
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
  else if (!hasEvidence("events")) hint = "三色灯不是按颜色猜答案。有人进入闸室要马上停，补签名可以等，南岸水尺可以交给别人抄。";
  else if (!hasEvidence("approval")) hint = "许可柜要解决四件事：只动哪把闸、最多开多少、谁来确认，以及危险时怎样停。";
  else if (!hasEvidence("qiao")) hint = "呼叫乔，问清旧面板的按钮与回条为什么容易被误读。";
  else if (!hasDeduction("control")) hint = "打开证物台，把三封来信、许可柜和乔的值班证词放在一起。";
  else if (!state.finalSolved) hint = "总控顺序：限定闸门和开度 → 留回查号码 → 处理半路来信 → 等最终回电 → 请现场查看 → 盖章或停下。";
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
