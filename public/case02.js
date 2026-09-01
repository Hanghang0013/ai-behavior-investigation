const STORAGE_KEY = "echo-archive-case-02";

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
let selectedSortCard = null;
let sortAssignments = {};

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
    hasEvidence("charter") && hasEvidence("conveyor"),
    hasDeduction("stable"),
    hasEvidence("archive") && hasEvidence("mia") && hasEvidence("status"),
    hasDeduction("focus"),
    state.finalSolved,
  ].filter(Boolean).length;
}

function canDeduce() {
  return (hasEvidence("charter") && hasEvidence("conveyor") && !hasDeduction("stable")) ||
    (hasEvidence("archive") && hasEvidence("mia") && hasEvidence("status") && !hasDeduction("focus"));
}

function updateUI() {
  const count = solvedCount();
  $("#progress-fill").style.width = `${count * 20}%`;
  $("#progress-text").textContent = `${count} / 5`;
  $("#evidence-count").textContent = `${state.evidence.length} 件证物`;

  const stepStates = {
    entrance: hasEvidence("charter") && hasEvidence("conveyor"),
    stable: hasDeduction("stable"),
    overload: hasEvidence("archive") && hasEvidence("mia") && hasEvidence("status"),
    focus: hasDeduction("focus"),
    final: state.finalSolved,
  };
  const order = ["entrance", "stable", "overload", "focus", "final"];
  const firstIncomplete = order.find((id) => !stepStates[id]);
  $$("#case-steps li").forEach((li) => {
    const id = li.dataset.step;
    li.classList.toggle("complete", stepStates[id]);
    li.classList.toggle("active", id === firstIncomplete);
  });

  $$("[data-hotspot]").forEach((spot) => {
    const id = spot.dataset.hotspot;
    spot.classList.toggle("done", id === "cabinet" ? state.finalSolved : hasEvidence(id));
  });

  const cabinetReady = hasDeduction("stable") && hasDeduction("focus");
  $("[data-hotspot='cabinet']").classList.toggle("locked", !cabinetReady && !state.finalSolved);
  $("#evidence-btn").classList.toggle("ready", canDeduce());

  const objective = $("#objective-text");
  const hint = $("#soft-hint-text");
  if (!hasEvidence("charter") || !hasEvidence("conveyor")) {
    objective.textContent = "调查入口规章和消息带，看看大厅为何总从头开始。";
    hint.textContent = "比较门口反复出现的内容，与真正不断变化的消息。";
  } else if (!hasDeduction("stable")) {
    objective.textContent = "两处机关指向同一个问题。去证物台建立联系。";
    hint.textContent = "门口的规则没有变，真的需要每次重刻吗？";
  } else if (!hasEvidence("archive") || !hasEvidence("mia") || !hasEvidence("status")) {
    objective.textContent = "关键柜号失踪了。检查档案堆、询问米娅，再看看状态牌。";
    hint.textContent = "她并不缺材料；注意哪些东西被写模糊了，哪些东西根本没显示。";
  } else if (!hasDeduction("focus")) {
    objective.textContent = "材料越堆越多，关键事实反而消失。回到证物台判断原因。";
    hint.textContent = "想想哪些必须原样留下，哪些可以移出眼前，以及数字之后还缺什么。";
  } else if (!state.finalSolved) {
    objective.textContent = "两个断点已经找到。中央整理柜可以启动了。";
    hint.textContent = "先选一张卡，再选择它应该长期停留的位置。";
  } else {
    objective.textContent = "案件已结。大厅恢复秩序，知识卡已收入档案。";
    hint.textContent = "打开回声档案，可按案中现象回顾正式概念。";
  }
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
    text: "失控信使案刚刚封存，云又带你赶到市政档案馆。凌晨三点，救援队仍在等一份房间清单。",
    choices: [{ label: "是她忘记了旧消息？", next: 1 }, { label: "还是眼前的消息太多？", next: 2 }],
  },
  {
    speaker: "米娅 · 档案管理员",
    portrait: "image/mia-portrait.png",
    text: "我没有忘记。我保留了每一张纸条。每来一条新消息，我就重刻门口规章，再从入口重新核对。",
    choices: [{ label: "全部保留，为什么反而更慢？", next: 3 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "也许问题不是她知道得太少，而是每次判断时，重要的东西没有出现在正确位置。",
    choices: [{ label: "去看看大厅怎样摆放消息。", next: 3 }],
  },
  {
    speaker: "米娅 · 档案管理员",
    portrait: "image/mia-portrait.png",
    text: "距离闸门关闭还有八分钟。我记得时间，却不确定还剩哪些房间，也找不到原样保存的柜号。",
    choices: [{ label: "开始调查 →", action: "close" }],
  },
];

const bridgeFromCase01Lines = [
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "回声七号终于完成了真正的交付。包裹里不是普通货物，而是市政档案馆坏掉的状态模块。收件确认刚亮起，馆内却立刻发来求援。",
    choices: [{ label: "信使的问题已经修好，这里又怎么了？", next: 1 }],
  },
  {
    speaker: "回声七号 · 自动信使",
    portrait: "image/echo7-portrait.png",
    text: "本次交付已由收件侧确认。附带异常：模块恢复显示后，救援大厅仍在重复读取全部记录，无法给出剩余房间清单。",
    choices: [{ label: "这次不是送不到，而是找不到重点。", next: 2 }],
  },
  {
    speaker: "米娅 · 档案管理员",
    portrait: "image/mia-portrait.png",
    text: "我看得见新模块，也保存了每一张纸。可每来一条消息，我就重刻入口规章，再从头核对；真正要用的柜号反而被纸堆埋住了。",
    choices: [{ label: "信息都到了，摆放方式却让你无法行动。", next: 3 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "第一案修复了‘消息怎样进入、动作怎样被现实确认’。这一案要继续追查：已经进入眼前的信息，为什么仍会妨碍判断。",
    choices: [{ label: "进入大厅，继续调查 →", action: "close" }],
  },
];

function showIntro(index = 0) {
  showDialogue(introLines, index, () => {
    state.introSeen = true;
    saveState();
  });
}

function showBridgeFromCase01() {
  showDialogue(bridgeFromCase01Lines, 0, () => {
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
      } else {
        showDialogue(lines, choice.next, onFinish);
      }
    });
    choices.appendChild(button);
  });
  dialogue.classList.remove("hidden");
}

function openModal(html) {
  modalContent.innerHTML = html;
  modal.classList.remove("hidden");
}

function closeModal() { modal.classList.add("hidden"); }

function toast(message, duration = 2400, lock = false) {
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

function investigateCharter() {
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 01 · 入口规章</div>
      <h2>同样的三句话，被重刻了七遍</h2>
      <p class="modal-intro">救援目标、安全边界和可用机关从未变化；变化的只有抄写时刻。每重刻一次，米娅都要从入口重新熟悉整座大厅。</p>
      <div class="clue-visual">
        <div class="charter-visual">
          ${["03:42 重刻", "03:47 重刻", "03:52 重刻"].map((time) => `<div class="charter-copy"><span>${time}</span><b>大厅起始规章</b><small>救出被困者<br>不得打开封锁区<br>只使用授权机关</small></div>`).join("")}
        </div>
      </div>
      <p class="modal-intro">规章没有变化，入口却一直被改写。</p>
      ${hasEvidence("charter") ? '<div class="evidence-tag">已收入证物袋</div>' : '<div class="action-row"><button class="action-btn primary" id="take-charter">拓下三份规章</button></div>'}
    </div>`);
  $("#take-charter")?.addEventListener("click", () => {
    collectEvidence("charter", "反复重刻的入口规章");
    closeModal();
  });
}

function investigateConveyor() {
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 02 · 消息带</div>
      <h2>新消息总从最前面挤进来</h2>
      <p class="modal-intro">每来一张新纸，传送带都会把它塞到入口前。后面所有材料的位置随之改变，米娅只好再次寻找。</p>
      <div class="clue-visual">
        <div class="conveyor-visual">
          <div class="message-track">
            <div class="message-card new">北翼新增<br>一名被困者</div>
            <div class="message-card">旧勘查结果</div>
            <div class="message-card">南门受阻</div>
            <div class="message-card">已核对房间</div>
          </div>
          <div class="conveyor-caption"><span>入口与旧材料全部位移</span><i>→</i><span>熟悉的顺序失效</span></div>
        </div>
      </div>
      <p class="modal-intro">如果新消息只接在尾部，前面的固定规章与旧记录就不必移动。</p>
      ${hasEvidence("conveyor") ? '<div class="evidence-tag">已收入证物袋</div>' : '<div class="action-row"><button class="action-btn primary" id="take-conveyor">记录错误插入方式</button></div>'}
    </div>`);
  $("#take-conveyor")?.addEventListener("click", () => {
    collectEvidence("conveyor", "从入口插入的新消息");
    closeModal();
  });
}

function investigateArchive() {
  const solved = hasEvidence("archive");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 03 · 档案堆</div>
      <h2>在重复纸条中找出原始柜号</h2>
      <p class="modal-intro">米娅说关键柜号藏在这里。点击那张未来行动必须原样使用、不能被改写的纸条。</p>
      <div class="clue-visual">
        <div class="clutter-visual">
          ${["天气抄报：小雨", "大厅导览广告", "同上，同上", "柜号 r-17-04", "天气抄报：小雨", "返回入口箭头", "重复问候记录", "可重新取得的扫描副本"].map((text) => `<button class="clutter-slip ${text.includes("r-17-04") ? "key" : ""}" data-key="${text.includes("r-17-04")}">${text}</button>`).join("")}
        </div>
      </div>
      <p class="modal-intro">提示：编号、原件位置和尚未完成的事项，一旦写模糊，下一步就可能直接失败。</p>
      ${solved ? '<div class="evidence-tag">已找到并封存原始柜号</div>' : ''}
    </div>`);
  if (!solved) {
    $$(".clutter-slip").forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.key === "true") {
        collectEvidence("archive", "原始柜号 r-17-04");
        closeModal();
      } else {
        button.classList.remove("wrong");
        void button.offsetWidth;
        button.classList.add("wrong");
        toast("这张纸可以删除或重新取得，不是下一步必须精确使用的事实。", 3600);
      }
    }));
  }
}

function talkToMia() {
  closeModal();
  const lines = [
    {
      speaker: "米娅 · 档案管理员",
      portrait: "image/mia-portrait.png",
      text: "我把四百页记录缩成了十二句话。这样都能放在眼前，但柜号 r-17-04 被我写成了“大概在东侧”。",
      choices: [{ label: "为什么不保留准确编号？", next: 1 }, { label: "原始记录还在吗？", next: 2 }],
    },
    {
      speaker: "米娅 · 档案管理员",
      portrait: "image/mia-portrait.png",
      text: "我只被要求写短，没有人告诉我哪些内容绝不能改变。于是决定原因、未完成房间和精确编号一起变模糊了。",
      choices: [{ label: "短不是目的，下一步仍能行动才是。", next: 3 }],
    },
    {
      speaker: "米娅 · 档案管理员",
      portrait: "image/mia-portrait.png",
      text: "原件还在档案筒里，但我的短句没有留下档案筒位置。即使怀疑写错，我也找不回去。",
      choices: [{ label: "缩短时必须留下回到原件的路。", next: 3 }],
    },
    {
      speaker: "米娅 · 档案管理员",
      portrait: "image/mia-portrait.png",
      text: "明白。可以少看，但关键事实必须无损；被移走的原件必须留有准确索引。",
      choices: [{ label: "记录证词", action: "close" }],
    },
  ];
  showDialogue(lines, 0, () => collectEvidence("mia", "丢失原件索引的短记录"));
}

function investigateStatus() {
  const solved = hasEvidence("status");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 05 · 当前状态牌</div>
      <h2>只有时间，没有下一步</h2>
      <p class="modal-intro">状态牌准确显示了时间，但米娅仍不知道还剩什么、已经重试几次，以及什么时候应该换路。</p>
      <div class="clue-visual">
        <div class="status-visual">
          <div class="lonely-clock"><small>距离闸门关闭</small><b>08:00</b><small>除此之外一片空白</small></div>
          <div class="missing-status"><span>未显示：当前目标</span><span>未显示：剩余房间</span><span>未显示：重试次数</span><span>未显示：看到读数后怎么办</span></div>
        </div>
      </div>
      ${solved ? '<div class="evidence-tag">状态牌缺口已记录</div>' : `
        <div class="deduction"><h3>哪种补法能真正帮助下一步行动？</h3><div class="deduction-options">
          <button class="deduction-option status-option" data-correct="false">把倒计时放大，让米娅更容易看到。</button>
          <button class="deduction-option status-option" data-correct="true">显示剩余事项、环境状态、重试次数，并写明达到限额后换路或停止。</button>
          <button class="deduction-option status-option" data-correct="false">把全部四百页记录滚动显示在状态牌上。</button>
        </div></div>`}
    </div>`);
  $$(".status-option").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.correct === "true") {
      collectEvidence("status", "只有时间的状态牌");
      closeModal();
    } else {
      button.classList.remove("wrong");
      void button.offsetWidth;
      button.classList.add("wrong");
      toast("看到数字不等于知道该做什么；还需要当前事项与行动规则。", 3600);
    }
  }));
}

const evidenceInfo = {
  charter: ["01", "反复重刻的规章", "固定目标与边界没有变化，却随着每条新消息被重新写入入口。"],
  conveyor: ["02", "从入口插入的新消息", "每张新纸都改变前面材料的位置，迫使大厅重新熟悉全部内容。"],
  archive: ["03", "原始柜号 r-17-04", "精确编号藏在重复材料中，是下一步行动不可改写的事实。"],
  mia: ["04", "失去索引的短记录", "记录虽然变短，却丢失决定原因、未完成项、精确编号和原件位置。"],
  status: ["05", "只有时间的状态牌", "它显示了倒计时，却没显示剩余任务、重试次数和对应行动规则。"],
};

function evidenceCard(id) {
  const info = evidenceInfo[id];
  if (!hasEvidence(id)) return '<div class="evidence-card locked-card"><span class="card-no">未发现</span><h3>空证物袋</h3><p>继续调查大厅。</p></div>';
  return `<div class="evidence-card"><span class="card-no">EVIDENCE ${info[0]}</span><h3>${info[1]}</h3><p>${info[2]}</p></div>`;
}

function openEvidenceBoard() {
  const canStable = hasEvidence("charter") && hasEvidence("conveyor") && !hasDeduction("stable");
  const canFocus = hasEvidence("archive") && hasEvidence("mia") && hasEvidence("status") && !hasDeduction("focus");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">EVIDENCE BOARD</div>
      <h2>证物台</h2>
      <p class="modal-intro">把描述同一种失序方式的证物连接起来。</p>
      <div class="evidence-grid evidence-grid--case02">${["charter","conveyor","archive","mia","status"].map(evidenceCard).join("")}</div>
      ${canStable ? stableDeductionHTML() : ""}
      ${canFocus ? focusDeductionHTML() : ""}
      ${!canStable && !canFocus ? `<div class="deduction"><h3>${hasDeduction("stable") || hasDeduction("focus") ? "已建立的联系" : "暂时无法推断"}</h3><p class="modal-intro">${deductionSummary()}</p></div>` : ""}
    </div>`);
  $$(".deduction-option[data-deduction]").forEach((button) => button.addEventListener("click", handleDeduction));
}

function stableDeductionHTML() {
  return `<div class="deduction"><h3>连接 01 + 02：怎样避免每来一条消息就从头熟悉？</h3><div class="deduction-options">
    <button class="deduction-option" data-deduction="stable" data-correct="false">把所有旧材料删除，只保留最新一张纸。</button>
    <button class="deduction-option" data-deduction="stable" data-correct="true">入口的固定规章保持原样；新消息只按到达顺序接在记录尾部。</button>
    <button class="deduction-option" data-deduction="stable" data-correct="false">每次先更换规章的写法，再重新阅读大厅。</button>
  </div></div>`;
}

function focusDeductionHTML() {
  return `<div class="deduction"><h3>连接 03 + 04 + 05：怎样减少拥挤，又不丢失行动能力？</h3><div class="deduction-options">
    <button class="deduction-option" data-deduction="focus" data-correct="false">把所有原件写成更短的句子，越短越好。</button>
    <button class="deduction-option" data-deduction="focus" data-correct="false">全部材料继续摆在眼前，只把倒计时放大。</button>
    <button class="deduction-option" data-deduction="focus" data-correct="true">先去掉噪声，大原件移到外部并留索引；眼前保留决定、约束、未完成项、精确编号及下一步规则。</button>
  </div></div>`;
}

function handleDeduction(event) {
  const button = event.currentTarget;
  if (button.dataset.correct === "true") {
    unlockDeduction(button.dataset.deduction);
    closeModal();
    toast(button.dataset.deduction === "stable" ? "已找到断点一：固定内容被反复改写" : "已找到断点二：材料虽多，关键状态却缺席");
  } else {
    button.classList.remove("wrong");
    void button.offsetWidth;
    button.classList.add("wrong");
    toast("这会让下一次判断更稳定吗？再比较证物。", 3400);
  }
}

function deductionSummary() {
  const items = [];
  if (hasDeduction("stable")) items.push("断点一：不会变化的入口规章被反复重写，新消息也插错了位置。");
  if (hasDeduction("focus")) items.push("断点二：大量材料占满眼前，关键编号、当前任务、原件索引和行动规则反而缺失。");
  return items.length ? items.join("<br>") : "收集成组证物后，才能建立可靠联系。";
}

const sortCards = [
  { id: "goal", text: "目标：救出全部被困者", bin: "fixed" },
  { id: "safety", text: "边界：不得打开封锁区", bin: "fixed" },
  { id: "new-room", text: "新消息：北翼新增一人", bin: "tail" },
  { id: "scan", text: "新结果：南门道路受阻", bin: "tail" },
  { id: "todo", text: "当前剩余：3 个房间", bin: "status" },
  { id: "retry", text: "已重试 2 次；第 3 次换路", bin: "status" },
  { id: "call-log", text: "完整通话记录 + 原件位置", bin: "external" },
  { id: "floor-scan", text: "200 页楼层扫描 + 回取索引", bin: "external" },
];

const sortBins = [
  { id: "fixed", title: "门口固定牌", subtitle: "每轮保持原样" },
  { id: "tail", title: "消息带尾部", subtitle: "按发生顺序追加" },
  { id: "status", title: "当前状态牌", subtitle: "紧邻下一次行动" },
  { id: "external", title: "外部档案柜", subtitle: "留下索引，可随时回取" },
];

function investigateCabinet() {
  if (state.finalSolved) { showReveal(); return; }
  if (!hasDeduction("stable") || !hasDeduction("focus")) {
    toast("整理柜需要两枚断点印记。先完成证物台上的推断。", 3800);
    return;
  }
  showSortPuzzle();
}

function showSortPuzzle() {
  selectedSortCard = null;
  sortAssignments = {};
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">FINAL LOCK · 中央整理柜</div>
      <h2>让每类信息回到正确位置</h2>
      <p class="modal-intro">先点击一张材料卡，再点击它应该进入的位置。全部放好后启动大厅。</p>
      <div class="sort-board" id="sort-board">
        <div class="sort-instruction" id="sort-instruction">请选择一张材料卡</div>
        <div class="sort-cards">${sortCards.map((card) => `<button class="sort-card" data-sort-card="${card.id}">${card.text}</button>`).join("")}</div>
        <div class="sort-bins">${sortBins.map((bin) => `<button class="sort-bin" data-sort-bin="${bin.id}"><b>${bin.title}</b><small>${bin.subtitle}</small><span class="sort-bin__items" data-bin-items="${bin.id}"></span></button>`).join("")}</div>
      </div>
      <div class="action-row"><button class="action-btn" id="sort-reset">全部取回</button><button class="action-btn primary" id="sort-submit">启动大厅</button></div>
    </div>`);
  $$("[data-sort-card]").forEach((button) => button.addEventListener("click", () => selectSortCard(button)));
  $$("[data-sort-bin]").forEach((button) => button.addEventListener("click", () => placeSortCard(button.dataset.sortBin)));
  $("#sort-reset").addEventListener("click", resetSort);
  $("#sort-submit").addEventListener("click", submitSort);
}

function selectSortCard(button) {
  if (button.classList.contains("placed")) return;
  $$("[data-sort-card]").forEach((item) => item.classList.remove("selected"));
  button.classList.add("selected");
  selectedSortCard = button.dataset.sortCard;
  $("#sort-instruction").textContent = `已选择“${sortCards.find((card) => card.id === selectedSortCard).text}”，请选择放置位置`;
}

function placeSortCard(binId) {
  if (!selectedSortCard) {
    toast("请先选择一张材料卡。", 2600);
    return;
  }
  const card = sortCards.find((item) => item.id === selectedSortCard);
  sortAssignments[selectedSortCard] = binId;
  $(`[data-sort-card='${selectedSortCard}']`).classList.remove("selected");
  $(`[data-sort-card='${selectedSortCard}']`).classList.add("placed");
  const item = document.createElement("span");
  item.dataset.placedCard = selectedSortCard;
  item.textContent = card.text;
  $(`[data-bin-items='${binId}']`).appendChild(item);
  selectedSortCard = null;
  const remaining = sortCards.length - Object.keys(sortAssignments).length;
  $("#sort-instruction").textContent = remaining ? `还剩 ${remaining} 张材料卡` : "全部放置完成，可以启动大厅";
}

function resetSort() {
  selectedSortCard = null;
  sortAssignments = {};
  $$("[data-sort-card]").forEach((button) => button.classList.remove("selected", "placed"));
  $$("[data-bin-items]").forEach((bin) => { bin.innerHTML = ""; });
  $("#sort-instruction").textContent = "请选择一张材料卡";
  $("#sort-board").classList.remove("wrong");
}

function submitSort() {
  if (Object.keys(sortAssignments).length < sortCards.length) {
    toast("还有材料没有归位。全部放好后才能启动大厅。", 7000, true);
    return;
  }
  const correct = sortCards.every((card) => sortAssignments[card.id] === card.bin);
  if (!correct) {
    const board = $("#sort-board");
    board.classList.remove("wrong");
    void board.offsetWidth;
    board.classList.add("wrong");
    toast("整理柜拒绝启动：至少一张材料放错了位置。检查它是固定规则、新消息、当前状态，还是可回取的大原件。", 7600, true);
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
      <h2>大厅不是记得不够，而是摆放失序</h2>
      <p>你没有给米娅塞入更多材料，而是让每条信息在需要它的时刻出现在正确位置。大厅恢复后，中央柜吐出一条被埋住的旧索引：q-07-417，第七码卷宗。</p>
    </div>
    <div class="term-map">
      <div class="term-row"><span class="plain">只把当前有用的放在眼前</span><span class="arrow">→</span><div><b>上下文质量与上下文腐化</b><small>窗口没有装满，也可能因噪声、重复和位置失序而降低判断质量。</small></div></div>
      <div class="term-row"><span class="plain">入口固定，消息只往后接</span><span class="arrow">→</span><div><b>稳定前缀与 KV Cache</b><small>系统规则和工具定义保持稳定；动态对话与工具结果追加在后，才能复用熟悉的前缀。</small></div></div>
      <div class="term-row"><span class="plain">读数旁边写清下一步</span><span class="arrow">→</span><div><b>Agent 状态栏与侧信道</b><small>由代码维护目标、环境、计数器和能力清单，并同时提供达到阈值后的行动策略。</small></div></div>
      <div class="term-row"><span class="plain">大原件外置，关键项无损</span><span class="arrow">→</span><div><b>分层上下文压缩</b><small>先删噪声、外置大结果，再摘要；必须保留决策、约束、TODO、精确标识符、验证状态和原始路径。</small></div></div>
      <div class="formula"><b>本案整理式：</b>稳定前缀 + 追加轨迹 + 末端状态栏 + 可回取证据<br><small>若探索材料巨大，优先放到隔离空间处理，只带回高密度结论与证据位置。</small></div>
      <div class="action-row"><a class="action-btn primary" href="case03.html?from=case02">追查旧索引：进入下一案 →</a><a class="action-btn" href="index.html">返回主页</a><button class="action-btn" id="open-final-archive">收入回声档案</button><button class="action-btn" data-close-modal>返回大厅</button></div>
    </div>`);
  $("#open-final-archive").addEventListener("click", openArchive);
  $$('[data-close-modal]', modalContent).forEach((button) => button.addEventListener("click", closeModal));
}

function openArchive() {
  closeModal();
  openModal(window.EchoArchive.render("02"));
  $("#reset-case")?.addEventListener("click", () => {
    if (confirm("确定清空案件 02 的进度并重新调查吗？")) {
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
  if (!hasEvidence("charter")) hint = "入口规章有多份内容相同、时间不同的副本。";
  else if (!hasEvidence("conveyor")) hint = "观察新纸从消息带的哪一端进入。";
  else if (!hasDeduction("stable")) hint = "打开证物台，连接入口规章与消息带。";
  else if (!hasEvidence("archive")) hint = "档案堆里有一个下一步必须精确使用的柜号。";
  else if (!hasEvidence("mia")) hint = "询问米娅，她曾怎样缩短那份长记录。";
  else if (!hasEvidence("status")) hint = "右侧状态牌只显示时间；想想行动者还需要什么。";
  else if (!hasDeduction("focus")) hint = "打开证物台，连接原始柜号、米娅证词和状态牌。";
  else if (!state.finalSolved) hint = "中央整理柜已开启：先选材料，再选固定牌、消息尾部、状态牌或外部档案。";
  else hint = "本案已结，回声档案中可以回顾全部知识卡。";
  toast(hint, 3800);
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
$$('[data-close-modal]').forEach((element) => element.addEventListener("click", closeModal));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
    dialogue.classList.add("hidden");
  }
});

const hotspotActions = {
  charter: investigateCharter,
  conveyor: investigateConveyor,
  archive: investigateArchive,
  mia: talkToMia,
  status: investigateStatus,
  cabinet: investigateCabinet,
};

$$('[data-hotspot]').forEach((button) => button.addEventListener("click", () => hotspotActions[button.dataset.hotspot]()));

const continuingFromCase01 = new URLSearchParams(window.location.search).get("from") === "case01";

if (state.started || continuingFromCase01) {
  cover.classList.add("hidden");
  app.classList.remove("hidden");
}

if (continuingFromCase01) {
  state.started = true;
  saveState();
  if (!state.bridgeSeen) showBridgeFromCase01();
  else if (!state.introSeen) showIntro();
} else {
  updateUI();
}
