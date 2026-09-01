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
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      ...initialState,
      ...parsed,
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      deductions: Array.isArray(parsed.deductions) ? parsed.deductions : [],
    };
  } catch {
    return { ...initialState, evidence: [], deductions: [] };
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
    objective.textContent = "关键柜号不见了。翻查纸堆、询问米娅，再看看进度牌。";
    hint.textContent = "她一张纸也没丢；留意哪些字被写含糊了，哪些提醒根本没有挂出来。";
  } else if (!hasDeduction("focus")) {
    objective.textContent = "纸越堆越高，真正要用的字反而看不见了。回证物台找原因。";
    hint.textContent = "哪些纸必须原样留在桌上，哪些可以收进柜里？倒计时旁边还该写什么？";
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
    text: "码头的包裹刚刚送妥，云又带你赶到市政档案馆。凌晨三点，救援队还在门外等一张剩余房间清单。",
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
    text: "也许她不是记得太少，而是该放桌面的压在了柜底，该收进柜里的又堆满了眼前。",
    choices: [{ label: "去看看大厅怎样摆放这些纸。", next: 3 }],
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
    text: "回声七号终于把包裹送进了收件托盘。里面不是普通货物，而是市政档案馆进度牌的新机芯。机芯刚装好，馆内却立刻亮起求援灯。",
    choices: [{ label: "信使的问题已经修好，这里又怎么了？", next: 1 }],
  },
  {
    speaker: "回声七号 · 自动信使",
    portrait: "image/echo7-portrait.png",
    text: "收件托盘已经确认包裹到达。可进度牌亮起以后，救援大厅仍在一遍遍翻读所有纸条，始终列不出还没查过的房间。",
    choices: [{ label: "这次不是送不到，而是纸太多、重点不见了。", next: 2 }],
  },
  {
    speaker: "米娅 · 档案管理员",
    portrait: "image/mia-portrait.png",
    text: "我看得见新装好的进度牌机芯，也保存了每一张纸。可每来一张新纸，我就重刻入口规章，再从头核对；真正要用的柜号反而被纸堆埋住了。",
    choices: [{ label: "纸一张没少，摆错位置却让你走不动了。", next: 3 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "码头的问题已经解决：新门牌要送到信使眼前，包裹也要由收件托盘确认。这里要查的是另一件事——纸全都在，为什么米娅还是找不到下一步。",
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
  const card = modal.querySelector(".modal__card");
  card.scrollTop = 0;
  modalContent.setAttribute("tabindex", "-1");
  requestAnimationFrame(() => {
    card.scrollTop = 0;
    modalContent.focus({ preventScroll: true });
  });
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
      <p class="modal-intro">要救谁、哪扇门不能开、可以动哪些机关，从头到尾都没变。可每重刻一次，米娅都要站回门口，把整座大厅重新认一遍。</p>
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
      <p class="modal-intro">米娅说关键柜号埋在这里。点击那张必须照原样抄走、一个字都不能含糊的纸条。</p>
      <div class="clue-visual">
        <div class="clutter-visual">
          ${["天气抄报：小雨", "大厅导览广告", "同上，同上", "柜号 r-17-04", "天气抄报：小雨", "返回入口箭头", "重复问候记录", "可重新取得的扫描副本"].map((text) => `<button class="clutter-slip ${text.includes("r-17-04") ? "key" : ""}" data-key="${text.includes("r-17-04")}">${text}</button>`).join("")}
        </div>
      </div>
      <p class="modal-intro">门牌、柜号、原件放在哪里、还有哪些房间没查，这些字一旦写含糊，救援队就可能走错地方。</p>
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
        toast("这张纸随时还能再抄一份，也不会告诉救援队下一步去哪里。再找找不能写错的那张。", 3900);
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
      text: "我只被要求写短，却没人告诉我哪些字绝不能改。结果为什么这样决定、还有哪些房间没查、柜号究竟是多少，全被我写含糊了。",
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
      text: "明白了。桌面可以少放几张纸，但柜号、未完事项和决定原因必须原样保留；收进柜里的原件，也要留一张写清位置的取件条。",
      choices: [{ label: "记录米娅的证词", action: "close" }],
    },
  ];
  showDialogue(lines, 0, () => collectEvidence("mia", "没有留下原件位置的短记录"));
}

function investigateStatus() {
  const solved = hasEvidence("status");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 05 · 当前进度牌</div>
      <h2>只有时间，没有下一步</h2>
      <p class="modal-intro">进度牌准确显示了时间，但米娅仍不知道还剩哪些房间、同一条路已经走过几次，以及什么时候该换一扇门。</p>
      <div class="clue-visual">
        <div class="status-visual">
          <div class="lonely-clock"><small>距离闸门关闭</small><b>08:00</b><small>除此之外一片空白</small></div>
          <div class="missing-status"><span>未显示：正在查哪一翼</span><span>未显示：剩余房间</span><span>未显示：同一路走过几次</span><span>未显示：走不通以后换哪扇门</span></div>
        </div>
      </div>
      ${solved ? '<div class="evidence-tag">进度牌缺少的提醒已记录</div>' : `
        <div class="deduction"><h3>哪种补法能真正帮助下一步行动？</h3><div class="deduction-options">
          <button class="deduction-option status-option" data-correct="false">把倒计时放大，让米娅更容易看到。</button>
          <button class="deduction-option status-option" data-correct="true">写清正在查哪里、还剩哪些房间、同一路走过几次，并注明第三次不通就换门或停下求援。</button>
          <button class="deduction-option status-option" data-correct="false">把全部四百页记录滚动显示在进度牌上。</button>
        </div></div>`}
    </div>`);
  $$(".status-option").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.correct === "true") {
      collectEvidence("status", "只有倒计时的进度牌");
      closeModal();
    } else {
      button.classList.remove("wrong");
      void button.offsetWidth;
      button.classList.add("wrong");
      toast("只知道还剩几分钟，仍不知道该去哪里。进度牌还要写清没查完的房间和走不通时怎么办。", 4000);
    }
  }));
}

const evidenceInfo = {
  charter: ["01", "反复重刻的规章", "要救谁、哪扇门不能开一直没变，却随着每张新纸被重新刻了一遍。"],
  conveyor: ["02", "从入口插入的新消息", "每张新纸都改变前面材料的位置，迫使大厅重新熟悉全部内容。"],
  archive: ["03", "原始柜号 r-17-04", "准确柜号埋在重复纸条里；一个数字抄错，救援队就会走错柜。"],
  mia: ["04", "没有原件位置的短记录", "记录虽然变短，却丢了决定原因、没查完的房间、准确柜号和原件放在哪里。"],
  status: ["05", "只有倒计时的进度牌", "它只显示还剩几分钟，却没写还有哪些房间、同一路走过几次、走不通时怎么办。"],
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
    <button class="deduction-option" data-deduction="focus" data-correct="true">扔掉重复和无关纸条，厚原件收进档案柜并留下取件条；桌上保留决定原因、禁区、没查完的房间、准确柜号和下一步。</button>
  </div></div>`;
}

function handleDeduction(event) {
  const button = event.currentTarget;
  if (button.dataset.correct === "true") {
    unlockDeduction(button.dataset.deduction);
    window.EchoFeedback.showMastery("02", button.dataset.deduction, openModal, closeModal);
  } else {
    button.classList.remove("wrong");
    void button.offsetWidth;
    button.classList.add("wrong");
    toast("这样摆放以后，下一张纸到来时米娅还会不会从头翻？救援队还能不能准确找到下一间房？", 4200);
  }
}

function deductionSummary() {
  const items = [];
  if (hasDeduction("stable")) items.push("断点一：不会变化的入口规章被反复重写，新消息也插错了位置。");
  if (hasDeduction("focus")) items.push("断点二：纸堆占满桌面，准确柜号、没查完的房间、原件位置和下一步反而不见了。");
  return items.length ? items.join("<br>") : "收集成组证物后，才能建立可靠联系。";
}

const sortCards = [
  { id: "goal", text: "目标：救出全部被困者", bin: "fixed" },
  { id: "safety", text: "边界：不得打开封锁区", bin: "fixed" },
  { id: "new-room", text: "新消息：北翼新增一人", bin: "tail" },
  { id: "scan", text: "新结果：南门道路受阻", bin: "tail" },
  { id: "todo", text: "当前剩余：3 个房间", bin: "status" },
  { id: "retry", text: "同一扇门已走 2 次；第 3 次不通就换路", bin: "status" },
  { id: "call-log", text: "完整通话记录 + 原件位置", bin: "external" },
  { id: "floor-scan", text: "200 页楼层抄本 + 原件取件条", bin: "external" },
];

function shuffledSortCards() {
  const cards = [...sortCards];
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }
  if (cards.every((card, index) => card.id === sortCards[index].id)) {
    [cards[0], cards[1]] = [cards[1], cards[0]];
  }
  return cards;
}

const sortBins = [
  { id: "fixed", title: "门口固定牌", subtitle: "每轮保持原样" },
  { id: "tail", title: "消息带尾部", subtitle: "按发生顺序追加" },
  { id: "status", title: "当前进度牌", subtitle: "抬头就知道下一步" },
  { id: "external", title: "大厅档案柜", subtitle: "留下取件条，需要时再取" },
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
  const displayCards = shuffledSortCards();
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">FINAL LOCK · 中央整理柜</div>
      <h2>让每张纸回到该待的位置</h2>
      <p class="modal-intro">先点击一张材料卡，再点击它应该进入的位置。全部放好后启动大厅。</p>
      <div class="sort-board" id="sort-board">
        <div class="sort-instruction" id="sort-instruction">请选择一张材料卡</div>
        <div class="sort-cards">${displayCards.map((card) => `<button class="sort-card" data-sort-card="${card.id}">${card.text}</button>`).join("")}</div>
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
    toast("整理柜没有启动：至少一张纸放错了。看看它应该钉在门口、接在消息带末尾、挂上进度牌，还是收进档案柜。", 7800, true);
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
      <p>你没有再往桌上塞纸。现在沿着自己整理过的证物，重建“全部保存”为什么仍会让大厅失去行动能力。</p>
    </div>
    ${window.EchoFeedback.renderCompletion("02")}
    <div class="case-reconstruction">
      <section class="reconstruction-block">
        <div class="reconstruction-heading"><span>1</span><h3>关键证物重新作证</h3></div>
        <div class="evidence-replay">
          <article class="replay-card"><span>证物 01 + 02</span><b>入口规章不断重印，新消息从纸带前端插入</b><p>不变的材料每轮都被改写，米娅只能一次次重新熟悉入口和顺序。</p></article>
          <article class="replay-card"><span>证物 03 + 04 + 05</span><b>厚原件堆满桌面，关键柜号却从摘要里消失</b><p>进度牌只有时间，没有未决事项和下一步；缩短记录时又改写了精确编号。</p></article>
        </div>
        <p class="player-proof"><b>你作出的判断：</b>问题不在于窗口是否还能放纸，而在于眼前材料是否稳定、相关、可行动，并且仍能回到原件核对。</p>
      </section>
      <section class="reconstruction-block">
        <div class="reconstruction-heading"><span>2</span><h3>失败是怎样一步步发生的</h3></div>
        <div class="causal-chain"><div class="causal-node">固定规章被反复改写</div><i class="causal-arrow">→</i><div class="causal-node">每条新消息都破坏原有顺序</div><i class="causal-arrow">→</i><div class="causal-node">大量原件挤占眼前位置</div><i class="causal-arrow">→</i><div class="causal-node">柜号和未决事项在缩写中丢失</div><i class="causal-arrow">→</i><div class="causal-node">大厅忘记下一步并重新开始</div></div>
      </section>
      <section class="reconstruction-block">
        <div class="reconstruction-heading"><span>3</span><h3>你建立的新摆放秩序</h3></div>
        <div class="repair-chain"><div class="causal-node">规章固定在入口</div><i class="causal-arrow">→</i><div class="causal-node">新消息只接在队尾</div><i class="causal-arrow">→</i><div class="causal-node">目标与下一步挂上进度牌</div><i class="causal-arrow">→</i><div class="causal-node">厚原件外置保存</div><i class="causal-arrow">→</i><div class="causal-node">取件条原样保留</div></div>
      </section>
    </div>
    <div class="term-map">
      <h3 class="term-map__title">现在，给你刚才整理的区域命名</h3>
      <p class="term-map__intro">每个术语都对应一组你亲手归位的材料。</p>
      <div class="term-row"><span class="plain">清走重复纸，只留当前有用材料</span><span class="arrow">→</span><div><b>上下文质量与上下文腐化</b><small>你证明了“放得下”不等于“用得上”；噪声、重复和错位会在窗口未满时先破坏判断。</small></div></div>
      <div class="term-row"><span class="plain">规章钉在入口，消息接在队尾</span><span class="arrow">→</span><div><b>稳定前缀与 KV Cache</b><small>不变的系统规则和工具定义保持稳定，动态轨迹向后追加，系统无需每轮重新熟悉入口。</small></div></div>
      <div class="term-row"><span class="plain">把目标、进度和下一步挂上牌</span><span class="arrow">→</span><div><b>Agent 状态栏与侧信道</b><small>你补上的不只是时间读数，而是未决事项、环境状态和看到读数后应该采取的行动。</small></div></div>
      <div class="term-row"><span class="plain">原件入柜，q-07-417 原样留在取件条</span><span class="arrow">→</span><div><b>分层上下文压缩</b><small>大材料可以外置或摘要，但决定、约束、TODO、精确标识符、验证状态和原件位置必须无损保留。</small></div></div>
      <div class="formula"><b>本案完整映射：</b>稳定前缀 + 追加轨迹 + 末端状态栏 + 可回取证据<br><small>大厅恢复后吐出的 q-07-417，正是“压缩后仍能回到原件”的现实证明。</small></div>
      <section class="transfer-check" data-transfer-check data-success="整理成立：摘要保留了决定、未决事项、精确编号和原件位置，既减轻拥挤又没有切断后续行动。" data-failure="这种做法会让系统继续拥挤，或在缩短材料时失去可执行信息。检查哪些内容一旦改写就无法继续调查。">
        <span class="transfer-check__kicker">TRANSFER CHECK · 换一摞材料</span>
        <h3>哪份摘要还能支持下一步行动？</h3>
        <p>救援记录即将超过大厅容量，其中包含大量重复回报、决定“转移北区居民”、未完成的避难所核验、编号 shelter-17，以及原件柜位。</p>
        <div class="transfer-options">
          <button class="transfer-option" data-transfer-option>“情况复杂，大家继续努力。”删除编号和原件，尽可能短。</button>
          <button class="transfer-option" data-transfer-option data-correct="true">保留转移决定、未决核验、shelter-17 和原件柜位；删除重复回报。</button>
          <button class="transfer-option" data-transfer-option>把全部原件继续摊在桌面，避免任何信息损失。</button>
        </div>
        <p class="transfer-feedback" aria-live="polite">选择一项，检验你是否掌握了“少看但仍能行动与回溯”。</p>
      </section>
      <div class="action-row"><a class="action-btn primary" href="case03.html?from=case02">追查旧索引：进入下一案 →</a><a class="action-btn" href="index.html">返回主页</a><button class="action-btn" id="open-final-archive">收入回声档案</button><button class="action-btn" data-close-modal>返回大厅</button></div>
    </div>`);
  $("#open-final-archive").addEventListener("click", openArchive);
  window.EchoFeedback.bindTransfer(modalContent);
  $$('[data-close-modal]', modalContent).forEach((button) => button.addEventListener("click", closeModal));
}

function openArchive() {
  closeModal();
  openModal(window.EchoArchive.render("02"));
  $("#reset-case")?.addEventListener("click", () => {
    if (confirm("确定清空案件 02 的进度并重新调查吗？")) {
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
  if (!hasEvidence("charter")) hint = "入口规章有多份内容相同、时间不同的副本。";
  else if (!hasEvidence("conveyor")) hint = "观察新纸从消息带的哪一端进入。";
  else if (!hasDeduction("stable")) hint = "打开证物台，连接入口规章与消息带。";
  else if (!hasEvidence("archive")) hint = "档案堆里有一个下一步必须精确使用的柜号。";
  else if (!hasEvidence("mia")) hint = "询问米娅，她曾怎样缩短那份长记录。";
  else if (!hasEvidence("status")) hint = "右侧进度牌只显示时间；米娅还需要知道没查完的房间和走不通时怎么办。";
  else if (!hasDeduction("focus")) hint = "打开证物台，连接原始柜号、米娅证词和状态牌。";
  else if (!state.finalSolved) hint = "中央整理柜已开启：先选一张纸，再把它放到门口规章、消息带尾部、进度牌或档案柜。";
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
