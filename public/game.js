const STORAGE_KEY = "echo-archive-case-01";

const initialState = {
  started: false,
  introSeen: false,
  evidence: [],
  deductions: [],
  finalSolved: false,
};

let state = loadState();
let wireAnswer = [];
let toastTimer;
let toastLockUntil = 0;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const cover = $("#cover");
const app = $("#app");
const modal = $("#modal");
const modalContent = $("#modal-content");
const dialogue = $("#dialogue");

function loadState() {
  try {
    return { ...initialState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return { ...initialState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateUI();
}

function hasEvidence(id) { return state.evidence.includes(id); }
function hasDeduction(id) { return state.deductions.includes(id); }

function collectEvidence(id, message) {
  if (!hasEvidence(id)) {
    state.evidence.push(id);
    saveState();
    toast(`证物已归档：${message}`);
  }
}

function unlockDeduction(id) {
  if (!hasDeduction(id)) {
    state.deductions.push(id);
    saveState();
  }
}

function solvedCount() {
  return [hasEvidence("map") && hasEvidence("scanner"), hasDeduction("blind"), hasEvidence("gate") && hasEvidence("echo"), hasDeduction("verify"), state.finalSolved].filter(Boolean).length;
}

function updateUI() {
  const count = solvedCount();
  $("#progress-fill").style.width = `${count * 20}%`;
  $("#progress-text").textContent = `${count} / 5`;
  $("#evidence-count").textContent = `${state.evidence.length} 件证物`;

  const stepStates = {
    map: hasEvidence("map") && hasEvidence("scanner"),
    blind: hasDeduction("blind"),
    gate: hasEvidence("gate") && hasEvidence("echo"),
    verify: hasDeduction("verify"),
    final: state.finalSolved,
  };
  const order = ["map", "blind", "gate", "verify", "final"];
  const firstIncomplete = order.find((id) => !stepStates[id]);
  $$("#case-steps li").forEach((li) => {
    const id = li.dataset.step;
    li.classList.toggle("complete", stepStates[id]);
    li.classList.toggle("active", id === firstIncomplete);
  });

  $$(".hotspot").forEach((spot) => {
    const id = spot.dataset.hotspot;
    const done = id === "cabinet" ? state.finalSolved : hasEvidence(id);
    spot.classList.toggle("done", done);
  });

  const cabinet = $("[data-hotspot='cabinet']");
  const cabinetReady = hasDeduction("blind") && hasDeduction("verify");
  cabinet.classList.toggle("locked", !cabinetReady && !state.finalSolved);
  $("#evidence-btn").classList.toggle("ready", canDeduce());

  const objective = $("#objective-text");
  const hint = $("#soft-hint p");
  if (!hasEvidence("map") || !hasEvidence("scanner")) {
    objective.textContent = "调查路线墙与扫描台，弄清它出发时掌握了哪些消息。";
    hint.textContent = "先看路线墙，再检查中央扫描台上的包裹。";
  } else if (!hasDeduction("blind")) {
    objective.textContent = "两件证物似乎在说同一件事。去证物台建立联系。";
    hint.textContent = "新地址明明存在，为什么信使仍去了旧地址？";
  } else if (!hasEvidence("gate") || !hasEvidence("echo")) {
    objective.textContent = "检查交付确认舱的收件侧，再问问回声七号为何认定任务结束。";
    hint.textContent = "不要只看信使做完了什么，要看收件端最终得到了什么。";
  } else if (!hasDeduction("verify")) {
    objective.textContent = "信使证词与收件侧记录相互冲突。回到证物台判断谁更可信。";
    hint.textContent = "不要问谁说得更肯定，要问谁真正碰得到收件托盘。";
  } else if (!state.finalSolved) {
    objective.textContent = "两个断点已经找到。红色机柜现在可以打开了。";
    hint.textContent = "一次正确投递，要先读对门牌；写进值班簿前，还要看收件托盘是不是有重量。";
  } else {
    objective.textContent = "案件已结。所有知识卡已收入回声档案。";
    hint.textContent = "打开回声档案，可以按“现象—原因—工程概念”回顾本案。";
  }
}

function canDeduce() {
  return (hasEvidence("map") && hasEvidence("scanner") && !hasDeduction("blind")) ||
    (hasEvidence("gate") && hasEvidence("echo") && !hasDeduction("verify"));
}

function startGame() {
  cover.classList.add("hidden");
  app.classList.remove("hidden");
  state.started = true;
  saveState();
  if (!state.introSeen) showIntro();
}

function returnHome(event) {
  event?.preventDefault();
  closeModal();
  dialogue.classList.add("hidden");
  app.classList.add("hidden");
  cover.classList.remove("hidden");
}

const introLines = [
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "凌晨两点，回声七号报告：十二件包裹，全部送达。可门外的投诉灯，一盏接一盏亮了起来。",
    choices: [{ label: "它在撒谎？", next: 1 }, { label: "也许它真的以为自己完成了。", next: 2 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "机器未必会撒谎。更常见的是——它只能依照眼前的东西作判断，却不知道自己漏看了什么。",
    choices: [{ label: "从它出发时看到的东西查起。", next: 3 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "这正是我叫你来的原因。别先问它聪不聪明，先查它当时看见了什么、能碰什么、又由谁确认。",
    choices: [{ label: "开始调查", next: 3 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "现场已封锁。五个调查点都标出来了。记住：信使说得再肯定，也不如路线灯、地址标签和收件托盘留下的痕迹。",
    choices: [{ label: "进入现场 →", action: "close" }],
  },
];

function showIntro(index = 0) {
  showDialogue(introLines, index, () => {
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
      } else {
        showDialogue(lines, choice.next, onFinish);
      }
    });
    choices.appendChild(button);
  });
  dialogue.classList.remove("hidden");
}

function openModal(html, wide = false) {
  modalContent.innerHTML = html;
  modal.classList.remove("hidden");
  modal.querySelector(".modal__card").classList.toggle("wide", wide);
}

function closeModal() { modal.classList.add("hidden"); }

function toast(message, duration = 2400, lockAgainstClicks = false) {
  const el = $("#toast");
  const now = Date.now();
  if (now < toastLockUntil && !lockAgainstClicks) return;
  if (lockAgainstClicks) toastLockUntil = now + duration;
  el.textContent = message;
  el.classList.toggle("toast--error", lockAgainstClicks);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove("show", "toast--error");
    if (Date.now() >= toastLockUntil) toastLockUntil = 0;
  }, duration);
}

function investigateMap() {
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 01 · 路线墙</div>
      <h2>被改过的终点</h2>
      <p class="modal-intro">三盏灯记录了这件包裹的路线。最后一盏在信使出发后才亮起，但墙上的纸质路线仍指向旧门牌。</p>
      <div class="clue-visual">
        <div class="route-visual">
          <div class="route-stop">
            <div class="route-node"><span class="wire-icon">□</span></div>
            <span class="route-time">21:48 · 收件</span>
          </div>
          <div class="route-line"></div>
          <div class="route-stop">
            <div class="route-node"><span class="wire-icon">→</span></div>
            <span class="route-time">21:52 · 出发</span>
          </div>
          <div class="route-line"></div>
          <div class="route-stop route-stop--alert">
            <div class="route-node"><span class="wire-icon">⌂</span></div>
            <span class="route-time">22:10 · 改址</span>
          </div>
        </div>
      </div>
      <p class="modal-intro">关键痕迹：<b>新终点出现得更晚，而且没有回到信使眼前。</b></p>
      ${hasEvidence("map") ? '<div class="evidence-tag">已收入证物袋</div>' : '<div class="action-row"><button class="action-btn primary" id="take-map">收下路线记录</button></div>'}
    </div>`);
  $("#take-map")?.addEventListener("click", () => {
    collectEvidence("map", "滞后的路线墙"); closeModal();
  });
}

function investigateScanner() {
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 02 · 扫描台</div>
      <h2>同一个包裹，两份去处</h2>
      <p class="modal-intro">扫描光束掠过包裹，标签下方又浮出一层旧痕。重要的是比较两次留下的结果。</p>
      <div class="clue-visual scan-visual">
        <div class="parcel-scan-stage" aria-label="扫描光束正在包裹表面往返">
          <div class="parcel-box"></div>
          <div class="scan-beam" aria-hidden="true"></div>
          <span class="scan-caption">扫描范围</span>
        </div>
        <div class="scan-readout">
          <span>取件时 <b>白塔巷 18</b></span>
          <span class="changed">改址后 <b>白塔巷 81</b></span>
          <span>信使读取 <b>旧标签</b></span>
        </div>
      </div>
      <p class="modal-intro">扫描台知道新地址；信使出发时拿到的，仍是旧地址。</p>
      ${hasEvidence("scanner") ? '<div class="evidence-tag">已收入证物袋</div>' : '<div class="action-row"><button class="action-btn primary" id="take-scanner">封存双层标签</button></div>'}
    </div>`);
  $("#take-scanner")?.addEventListener("click", () => {
    collectEvidence("scanner", "被覆盖的双层标签"); closeModal();
  });
}

function investigateGate() {
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 03 · 交付确认舱</div>
      <h2>收件端仍是空的</h2>
      <p class="modal-intro">这里不是普通出口。包裹必须穿过中间的小门，真正落到另一侧托盘，收件机才会吐出回执。信使可以推动包裹，却碰不到托盘的称重针，也改不了收件机里的纸条。</p>
      <div class="clue-visual handoff-visual">
        <div class="handoff-path">
          <div class="handoff-zone handoff-zone--courier">
            <span class="handoff-zone__label">信使侧</span>
            <div class="parcel-symbol" aria-hidden="true"></div>
            <small>包裹停在小门前</small>
          </div>
          <div class="transfer-node">
            <div class="mini-gate" aria-hidden="true"></div>
            <small>收件小门</small>
          </div>
          <div class="handoff-zone handoff-zone--receiver">
            <span class="handoff-zone__label">收件侧</span>
            <div class="receiver-device" aria-label="收件托盘重量为零">
              <div class="receiver-tray" aria-hidden="true"></div>
              <span class="receiver-weight">0 kg</span>
            </div>
            <small>托盘仍为空</small>
          </div>
        </div>
        <div class="handoff-status">
          <span><i class="status-dot status-dot--amber"></i>推杆动作<b>已结束</b></span>
          <span><i class="status-dot status-dot--coral"></i>包裹穿过<b>0 次</b></span>
          <span><i class="status-dot status-dot--coral"></i>收件确认<b>未触发</b></span>
        </div>
      </div>
      <p class="modal-intro">关键区别：<b>“推动动作结束”描述信使做了什么；“托盘有重量、回执被触发”才说明对方真正收到了什么。</b></p>
      ${hasEvidence("gate") ? '<div class="evidence-tag">已收入证物袋</div>' : '<div class="action-row"><button class="action-btn primary" id="take-gate">保存收件侧记录</button></div>'}
    </div>`);
  $("#take-gate")?.addEventListener("click", () => {
    collectEvidence("gate", "收件端的空托盘"); closeModal();
  });
}

function talkToEcho() {
  closeModal();
  const lines = [
    {
      speaker: "回声七号 · 自动信使",
      portrait: "image/echo7-portrait.png",
      text: "任务回报：包裹已推至终点。机械臂停止。任务完成。",
      choices: [{ label: "你确认包裹到达收件侧了吗？", next: 1 }, { label: "谁告诉你“机械臂停止”就算对方收到？", next: 2 }],
    },
    {
      speaker: "回声七号 · 自动信使",
      portrait: "image/echo7-portrait.png",
      text: "我没有读取收件侧的重量和回执。我的最后一步是推动包裹；手臂停止后，我就写下“完成”。",
      choices: [{ label: "所以你根本没看收件托盘。", next: 3 }],
    },
    {
      speaker: "回声七号 · 自动信使",
      portrait: "image/echo7-portrait.png",
      text: "旧规程只有三行：读取地址、推动包裹、手臂停止。没有要求我确认收件端。",
      choices: [{ label: "缺少的第四行，应该是“确认对方收到”。", next: 3 }],
    },
    {
      speaker: "回声七号 · 自动信使",
      portrait: "image/echo7-portrait.png",
      text: "推断成立。我把动作结束，当成了事情成功。二者并不相同。",
      choices: [{ label: "记录这段证词", action: "close" }],
    },
  ];
  showDialogue(lines, 0, () => collectEvidence("echo", "信使的完成判定"));
}

function investigateCabinet() {
  if (state.finalSolved) { showReveal(); return; }
  if (!hasDeduction("blind") || !hasDeduction("verify")) {
    toast("机柜需要两枚断点印记。先完成证物台上的推断。");
    return;
  }
  showWirePuzzle();
}

const evidenceInfo = {
  map: ["01", "滞后的路线墙", "改址发生在信使出发之后，墙面路线没有同步。"],
  scanner: ["02", "被覆盖的双层标签", "扫描台存着新地址，但信使实际读取的是旧标签。"],
  gate: ["03", "收件端的空托盘", "独立感应显示收件侧重量没有增加，也没有生成收件回执。"],
  echo: ["04", "信使的完成判定", "它把“机械臂停止”直接写成“任务完成”，没有确认收件端。"],
};

function evidenceCard(id) {
  const info = evidenceInfo[id];
  if (!hasEvidence(id)) return `<div class="evidence-card locked-card"><span class="card-no">未发现</span><h3>空证物袋</h3><p>继续调查现场。</p></div>`;
  return `<div class="evidence-card"><span class="card-no">EVIDENCE ${info[0]}</span><h3>${info[1]}</h3><p>${info[2]}</p></div>`;
}

function openEvidenceBoard() {
  const canBlind = hasEvidence("map") && hasEvidence("scanner") && !hasDeduction("blind");
  const canVerify = hasEvidence("gate") && hasEvidence("echo") && !hasDeduction("verify");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">EVIDENCE BOARD</div>
      <h2>证物台</h2>
      <p class="modal-intro">证物不会自己变成答案。把同时指向一个原因的痕迹连起来。</p>
      <div class="evidence-grid">${["map","scanner","gate","echo"].map(evidenceCard).join("")}</div>
      ${canBlind ? blindDeductionHTML() : ""}
      ${canVerify ? verifyDeductionHTML() : ""}
      ${!canBlind && !canVerify ? `<div class="deduction"><h3>${hasDeduction("blind") || hasDeduction("verify") ? "已建立的联系" : "暂时无法推断"}</h3><p class="modal-intro">${deductionSummary()}</p></div>` : ""}
    </div>`);
  $$(".deduction-option").forEach((button) => button.addEventListener("click", handleDeduction));
}

function blindDeductionHTML() {
  return `<div class="deduction"><h3>连接 01 + 02：新地址存在，为什么仍然送错？</h3><div class="deduction-options">
    <button class="deduction-option" data-deduction="blind" data-correct="false">信使不够聪明，所以没有猜出门牌颠倒了。</button>
    <button class="deduction-option" data-deduction="blind" data-correct="true">新地址一直留在扫描台，没有送到信使眼前；它再认真也只能照旧标签走。</button>
    <button class="deduction-option" data-deduction="blind" data-correct="false">扫描台和路线墙都坏了，所以没有任何地址。</button>
  </div></div>`;
}

function verifyDeductionHTML() {
  return `<div class="deduction"><h3>连接 03 + 04：谁更能证明包裹送达？</h3><div class="deduction-options">
    <button class="deduction-option" data-deduction="verify" data-correct="false">信使。它能完整说出自己的动作，而且语气肯定。</button>
    <button class="deduction-option" data-deduction="verify" data-correct="false">两者一样可信，挑一个更方便的结论就好。</button>
    <button class="deduction-option" data-deduction="verify" data-correct="true">收件端的独立记录。它直接反映对方是否获得包裹；动作结束不能替代收件结果。</button>
  </div></div>`;
}

function handleDeduction(event) {
  const button = event.currentTarget;
  if (button.dataset.correct === "true") {
    unlockDeduction(button.dataset.deduction);
    window.EchoFeedback.showMastery("01", button.dataset.deduction, openModal, closeModal);
  } else {
    button.classList.remove("wrong");
    void button.offsetWidth;
    button.classList.add("wrong");
    toast("这能解释现象吗？再比较两件证物。 ");
  }
}

function deductionSummary() {
  const items = [];
  if (hasDeduction("blind")) items.push("断点一：新地址明明已经写下，却没有送到信使眼前。");
  if (hasDeduction("verify")) items.push("断点二：动作停下后没有查看现实结果，错误被当成了成功。");
  return items.length ? items.join("<br>") : "至少找到成对证物后，才能建立可靠联系。";
}

const wirePieces = [
  { id: "see", icon: "◉", label: "核对路线与包裹标签（看见现场）" },
  { id: "decide", icon: "◇", label: "确认包裹的新门牌（作出判断）" },
  { id: "act", icon: "↗", label: "把包裹送入交付确认舱（动手改变）" },
  { id: "verify", icon: "✓", label: "确认收件侧得到包裹（查看结果）" },
  { id: "record", icon: "▤", label: "把真正的投递结果写进值班簿" },
];

function isValidWireOrder(order) {
  return order.join("|") === "see|decide|act|verify|record";
}

function shuffledWirePieces() {
  const pieces = [...wirePieces];
  for (let index = pieces.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pieces[index], pieces[swapIndex]] = [pieces[swapIndex], pieces[index]];
  }
  if (isValidWireOrder(pieces.map((piece) => piece.id))) {
    [pieces[0], pieces[pieces.length - 1]] = [pieces[pieces.length - 1], pieces[0]];
  }
  return pieces;
}

function showWirePuzzle() {
  wireAnswer = [];
  const displayPieces = shuffledWirePieces();
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">FINAL LOCK · 红色机柜</div>
      <h2>把断掉的行动链接回来</h2>
      <p class="modal-intro">按照本案中一次正确投递应有的顺序，依次点选五块铜片。想一想：若最后发现事情没有成功，下一轮应该从哪里重新开始？</p>
      <div class="wire-board">
        <div class="wire-slots" id="wire-slots">${wirePieces.map((_, i) => `<div class="wire-slot" data-index="${i}"><span class="wire-icon">${i + 1}</span><span class="wire-label">待接入</span></div>`).join('<span class="wire-arrow">→</span>')}</div>
        <div class="wire-pieces">${displayPieces.map((p) => `<button class="wire-piece" data-wire="${p.id}"><span class="wire-icon">${p.icon}</span><span class="wire-label">${p.label}</span></button>`).join("")}</div>
        <p class="board-note">接错可以清空重来；这条线路必须在发现没送到时知道回头再查。</p>
      </div>
      <div class="action-row"><button class="action-btn" id="wire-reset">清空</button><button class="action-btn primary" id="wire-submit">启动机柜</button></div>
    </div>`);
  $$("[data-wire]").forEach((button) => button.addEventListener("click", () => selectWire(button)));
  $("#wire-reset").addEventListener("click", resetWires);
  $("#wire-submit").addEventListener("click", submitWires);
}

function selectWire(button) {
  if (wireAnswer.length >= 5 || button.classList.contains("used")) return;
  const id = button.dataset.wire;
  const piece = wirePieces.find((p) => p.id === id);
  wireAnswer.push(id);
  button.classList.add("used");
  const slot = $(`.wire-slot[data-index='${wireAnswer.length - 1}']`);
  slot.classList.add("filled");
  slot.innerHTML = `<span class="wire-icon">${piece.icon}</span><span class="wire-label">${piece.label}</span>`;
}

function resetWires() {
  wireAnswer = [];
  $$("[data-wire]").forEach((button) => button.classList.remove("used"));
  $$(".wire-slot").forEach((slot, index) => {
    slot.classList.remove("filled");
    slot.innerHTML = `<span class="wire-icon">${index + 1}</span><span class="wire-label">待接入</span>`;
  });
}

function submitWires() {
  if (wireAnswer.length < 5) {
    toast("还有铜片没有接入。请接满五块铜片后再启动机柜。", 7000, true);
    return;
  }
  if (!isValidWireOrder(wireAnswer)) {
    $(".wire-board").classList.remove("wrong");
    void $(".wire-board").offsetWidth;
    $(".wire-board").classList.add("wrong");
    toast("机柜没有启动：信使必须先读对门牌，推动包裹以后还要看收件托盘，才能把结果写进值班簿。", 7200, true);
    resetWires();
    return;
  }
  state.finalSolved = true;
  saveState();
  showReveal();
}

function showReveal() {
  openModal(`
    <div class="reveal-hero">
      <div class="modal-kicker">CASE CLOSED · 真相已解锁</div>
      <h2>真正失控的不是信使</h2>
      <p>你已经找到两个断点。现在沿着自己取得的证物和亲手接回的线路，把失败怎样发生、修复为什么有效完整重建一次。</p>
    </div>
    ${window.EchoFeedback.renderCompletion("01")}
    <div class="case-reconstruction">
      <section class="reconstruction-block">
        <div class="reconstruction-heading"><span>1</span><h3>关键证物重新作证</h3></div>
        <div class="evidence-replay">
          <article class="replay-card"><span>证物 01 + 02</span><b>路线墙已经换新，包裹仍贴旧址</b><p>新门牌在信使出发前已经生效，但扫描台证明它拿到的仍是旧标签。</p></article>
          <article class="replay-card"><span>证物 03 + 04</span><b>推杆已经停下，收件托盘仍为空</b><p>信使只能证明自己执行过动作；接收端没有重量、签收或包裹痕迹。</p></article>
        </div>
        <p class="player-proof"><b>你作出的判断：</b>第一次连接证明它不是“想错了”，而是没有看见新地址；第二次连接证明“动作结束”不能代替“对方收到”。</p>
      </section>
      <section class="reconstruction-block">
        <div class="reconstruction-heading"><span>2</span><h3>失败是怎样一步步发生的</h3></div>
        <div class="causal-chain"><div class="causal-node">新门牌没有进入信使眼前</div><i class="causal-arrow">→</i><div class="causal-node">它只能按旧地址判断</div><i class="causal-arrow">→</i><div class="causal-node">推杆把包裹送到错误位置</div><i class="causal-arrow">→</i><div class="causal-node">中转站没有检查收件端</div><i class="causal-arrow">→</i><div class="causal-node">错误结果被写成“完成”</div></div>
      </section>
      <section class="reconstruction-block">
        <div class="reconstruction-heading"><span>3</span><h3>你接回的可靠行动链</h3></div>
        <div class="repair-chain"><div class="causal-node">读取新门牌</div><i class="causal-arrow">→</i><div class="causal-node">判断正确地址</div><i class="causal-arrow">→</i><div class="causal-node">推动包裹</div><i class="causal-arrow">→</i><div class="causal-node">检查收件托盘</div><i class="causal-arrow">→</i><div class="causal-node">按现实记录或纠正</div></div>
      </section>
    </div>
    <div class="term-map">
      <h3 class="term-map__title">现在，给你刚才修复的节点命名</h3>
      <p class="term-map__intro">术语不是新的答案，只是工程中对你刚才使用过的证据和动作的正式称呼。</p>
      <div class="term-row"><span class="plain">路线墙 → 信使眼前</span><span class="arrow">→</span><div><b>上下文 / 观察空间</b><small>你已经证明：没进入决策现场的新门牌，对行动者来说就等于不存在。</small></div></div>
      <div class="term-row"><span class="plain">扫描、推杆与收件检查</span><span class="arrow">→</span><div><b>工具 / 动作空间</b><small>这些机关限定了信使能观察和改变什么；缺失的动作不能靠语言推理补出来。</small></div></div>
      <div class="term-row"><span class="plain">选择托盘而非口供结案</span><span class="arrow">→</span><div><b>验证器</b><small>你用接收端的现实状态判断交付，而没有接受行动者自己的“已完成”。</small></div></div>
      <div class="term-row"><span class="plain">接回五步并允许纠错</span><span class="arrow">→</span><div><b>Harness</b><small>负责装载事实、暴露工具、限制行动、验证结果，并在失败后继续、换路或停止。</small></div></div>
      <div class="formula"><b>本案完整映射：</b>观察 → 判断 → 行动 → 验证 → 记录 → 继续 / 停止<br><small>这正是你在红色机柜中接回的链。没有新的环境观测，循环只是在重复旧猜测。</small></div>
      <section class="transfer-check" data-transfer-check data-success="判断成立：路线计算只是中间动作，只有医院接收端的真实状态才能证明救援完成。" data-failure="再看一次本案的第二个断点：执行过一个动作，不能直接证明接收方已经得到结果。">
        <span class="transfer-check__kicker">TRANSFER CHECK · 换一个现场</span>
        <h3>这次还能认出同一个问题吗？</h3>
        <p>急救车取得任务编号，导航系统显示“路线计算成功”，但医院还没有患者接收记录。现在应该怎样登记？</p>
        <div class="transfer-options">
          <button class="transfer-option" data-transfer-option>登记“救援完成”，因为导航工具已经成功返回。</button>
          <button class="transfer-option" data-transfer-option data-correct="true">登记“仍在进行”，等待医院接收端留下真实记录。</button>
          <button class="transfer-option" data-transfer-option>删除任务记录，假装这次调度没有发生。</button>
        </div>
        <p class="transfer-feedback" aria-live="polite">选择一项，检验你是否能把这条规则带到新现场。</p>
      </section>
      <div class="action-row"><a class="action-btn primary" href="case02.html?from=case01">追踪包裹去向：进入下一案 →</a><a class="action-btn" href="index.html">返回主页</a><button class="action-btn" id="open-final-archive">收入回声档案</button><button class="action-btn" data-close-modal>返回现场</button></div>
    </div>`);
  $("#open-final-archive").addEventListener("click", openArchive);
  window.EchoFeedback.bindTransfer(modalContent);
  $$('[data-close-modal]', modalContent).forEach((button) => button.addEventListener("click", closeModal));
}

function openArchive() {
  closeModal();
  openModal(window.EchoArchive.render("01"));
  $("#reset-case")?.addEventListener("click", () => {
    if (confirm("确定清空本案进度并重新调查吗？")) {
      localStorage.removeItem(STORAGE_KEY);
      state = { ...initialState, started: true };
      closeModal(); updateUI(); showIntro();
    }
  });
}

function showHint() {
  const hints = [];
  if (!hasEvidence("map")) hints.push("路线墙的灯记录了地址改变的时间。");
  else if (!hasEvidence("scanner")) hints.push("扫描台上的包裹有两层地址。");
  else if (!hasDeduction("blind")) hints.push("打开证物台，把路线墙与双层标签连起来。");
  else if (!hasEvidence("gate")) hints.push("交付确认舱的另一侧，保留着不受信使控制的收件记录。");
  else if (!hasEvidence("echo")) hints.push("右下角的记录器能接通信使，问它如何判断“完成”。");
  else if (!hasDeduction("verify")) hints.push("打开证物台，比较信使的动作描述和收件端的结果记录谁更接近现实。");
  else if (!state.finalSolved) hints.push("去红色机柜，顺序从“看见”开始，在“记录”后再继续下一轮。");
  else hints.push("案件已结。打开回声档案回顾术语与关系。");
  toast(hints[0]);
}

$("#start-btn").addEventListener("click", startGame);
$("#cover-archive-btn").addEventListener("click", () => {
  cover.classList.add("hidden");
  app.classList.remove("hidden");
  state.started = true;
  saveState();
  openArchive();
});
$("#archive-btn").addEventListener("click", openArchive);
$("#evidence-btn").addEventListener("click", openEvidenceBoard);
$("#hint-btn").addEventListener("click", showHint);
$$('[data-close-modal]').forEach((el) => el.addEventListener("click", closeModal));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeModal(); dialogue.classList.add("hidden"); } });

const hotspotActions = {
  map: investigateMap,
  scanner: investigateScanner,
  gate: investigateGate,
  echo: talkToEcho,
  cabinet: investigateCabinet,
};
$$('[data-hotspot]').forEach((button) => button.addEventListener("click", () => hotspotActions[button.dataset.hotspot]()));

if (state.started) {
  cover.classList.add("hidden");
  app.classList.remove("hidden");
}
updateUI();
