const STORAGE_KEY = "echo-archive-case-05";

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
let repairSelection = [];

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
    hasEvidence("patch") && hasEvidence("impact"),
    hasDeduction("scope"),
    hasEvidence("sandbox") && hasEvidence("tests") && hasEvidence("yun"),
    hasDeduction("recovery"),
    state.finalSolved,
  ].filter(Boolean).length;
}

function canDeduce() {
  return (hasEvidence("patch") && hasEvidence("impact") && !hasDeduction("scope")) ||
    (hasEvidence("sandbox") && hasEvidence("tests") && hasEvidence("yun") && !hasDeduction("recovery"));
}

function updateUI() {
  const count = solvedCount();
  $("#progress-fill").style.width = `${count * 20}%`;
  $("#progress-text").textContent = `${count} / 5`;
  $("#evidence-count").textContent = `${state.evidence.length} 件证物`;

  const stepStates = {
    change: hasEvidence("patch") && hasEvidence("impact"),
    scope: hasDeduction("scope"),
    safety: hasEvidence("sandbox") && hasEvidence("tests") && hasEvidence("yun"),
    recovery: hasDeduction("recovery"),
    final: state.finalSolved,
  };
  const order = ["change", "scope", "safety", "recovery", "final"];
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
  const consoleReady = hasDeduction("scope") && hasDeduction("recovery");
  $("[data-hotspot='console']").classList.toggle("locked", !consoleReady && !state.finalSolved);
  $("#evidence-btn").classList.toggle("ready", canDeduce());

  const objective = $("#objective-text");
  const hint = $("#soft-hint-text");
  if (!hasEvidence("patch") || !hasEvidence("impact")) {
    objective.textContent = "对照修理单和旧机牵连图，看看这枚零件还连着谁。";
    hint.textContent = "修理单只说眼前好了，墙上的图才会告诉你还有谁跟着它转。";
  } else if (!hasDeduction("scope")) {
    objective.textContent = "一枚零件与三处故障已经连上。去证物台找出工匠漏看了什么。";
    hint.textContent = "他动手前，真的知道这枚零件还替哪些机器传话吗？";
  } else if (!hasEvidence("sandbox") || !hasEvidence("tests") || !hasEvidence("yun")) {
    objective.textContent = "看看玻璃试验间和联合试车台，再问云出了问题怎样退回原样。";
    hint.textContent = "修好的零件不能马上装进城市；先在副机上试，还要看看旧机器会不会照常工作。";
  } else if (!hasDeduction("recovery")) {
    objective.textContent = "安全修理所需的证物已经齐了。回证物台想清楚怎样留下退路。";
    hint.textContent = "别人能不能看懂他改了什么？试坏以后能不能立刻换回原来的零件？";
  } else if (!state.finalSolved) {
    objective.textContent = "出厂闸门已打开。把这次修理从发现故障到装回城市重新走一遍。";
    hint.textContent = "先看懂旧机器，再在试验间少改一点；最后别忘了听真机器回答。";
  } else {
    objective.textContent = "三台机器都已恢复，正式知识卡已收入回声档案。";
    hint.textContent = "验收簿还有一处怪事：明明少试了两轮，这次修理却拿到了满分。";
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
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "午夜调度恢复后，我们顺着维护签名 patch-b7 找到这里。工坊说，那枚负责把机器回话送到值班台的齿轮已经修好，单独转起来一点问题也没有。",
    choices: [{ label: "那为什么还要查封？", next: 1 }],
  },
  {
    speaker: "乔 · 夜班调度员",
    portrait: "image/qiao-portrait.png",
    text: "可就在同一刻，河闸、档案升降台和应急水泵的回话全变了，值班台一个也听不懂。三台机器不是碰巧一起坏，它们都靠这枚齿轮传话。",
    choices: [{ label: "把它装上去前，三台旧机器试过吗？", next: 2 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "修理单上只有一句‘眼前故障已消失’。玻璃试验间没有开，三台旧机器也没有接上试车；新零件刚做好，就直接装进了正在运转的城市。",
    choices: [{ label: "我要查清这枚新零件是怎样被送出去的。", next: 3 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "先查清他究竟动了哪里、还牵连了谁、到底试过什么。最后还要回答：要是装上去又出事，能不能马上换回原样。",
    choices: [{ label: "开始调查 →", action: "close" }],
  },
];

const bridgeFromCase04Lines = [
  {
    speaker: "乔 · 夜班调度员",
    portrait: "image/qiao-portrait.png",
    text: "北岸河闸的最终回电已经核验，人员安全，闸位恢复到三成。但回电纸带末尾的 patch-b7 不属于调度室。",
    choices: [{ label: "追查这枚维护签名。", next: 1 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "签名来自禁区工坊。工匠动过的是一枚公用的传话齿轮：河闸只是其中一台，档案升降台和应急水泵也靠它把结果送回来。",
    choices: [{ label: "第四案已经修好，为什么这里还有问题？", next: 2 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "第四案修好的是调度室怎样发令、等待和确认。这里的问题更早：工坊把一枚没试完整的新零件送了出去。前案没有白修，只是我们又找到了一道更深的裂缝。",
    choices: [{ label: "那就查清这枚零件是怎样出厂的。", next: 3 }],
  },
  {
    speaker: "乔 · 夜班调度员",
    portrait: "image/qiao-portrait.png",
    text: "工坊里一枚齿轮转得很好，三台城市机器却同时报错。请在它再次接入回声网络前，找出缺失的保护。",
    choices: [{ label: "进入禁区工坊 →", action: "close" }],
  },
];

function showIntro(index = 0) {
  showDialogue(introLines, index, () => { state.introSeen = true; saveState(); });
}

function showBridgeFromCase04() {
  showDialogue(bridgeFromCase04Lines, 0, () => {
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

function investigatePatch() {
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 01 · 维护签名台</div>
      <h2>修理单只证明眼前的零件转了起来</h2>
      <p class="modal-intro">把 patch-b7 的修理结论和桌上留下的痕迹放在一起看。</p>
      <div class="clue-visual"><div class="change-sheet">
        <div class="change-card good"><span>工坊自检 · 单独转动</span><b>传话齿轮转动正常</b><small>它能听懂新命令；工匠只试了刚刚修过的这一枚零件。</small></div>
        <div class="change-card warn"><span>桌面痕迹 · 被刮掉的旧刻度</span><b>旧机器熟悉的回话方式不见了</b><small>修理单没写还有谁连着它，也没留下修改前的样子和可以换回去的旧件。</small></div>
      </div></div>
      <p class="modal-intro">“这枚齿轮修好了”是真话，但这句话没有证明装上它以后，旧机器还能像从前一样工作。</p>
      ${hasEvidence("patch") ? '<div class="evidence-tag">已保存 patch-b7 修理单与桌面痕迹</div>' : '<div class="action-row"><button class="action-btn primary" id="take-patch">封存修理记录</button></div>'}
    </div>`);
  $("#take-patch")?.addEventListener("click", () => { collectEvidence("patch", "只试过眼前零件的 patch-b7 修理单"); closeModal(); });
}

const impactTargets = [
  { id: "gate", title: "北岸河闸", body: "既要知道开到哪里，也要知道最后停在哪儿", affected: true },
  { id: "archive", title: "档案升降台", body: "既要知道升到哪层，也要知道最后停在哪柜", affected: true },
  { id: "pump", title: "应急水泵", body: "既要知道是否启动，也要知道最后出了多少水", affected: true },
  { id: "lamp", title: "工坊顶灯", body: "只管亮或灭，走的是另一根线", affected: false },
];

function investigateImpact() {
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 02 · 旧机牵连图</div>
      <h2>一枚传话齿轮，连着不止一台机器</h2>
      <p class="modal-intro">选出所有需要它回答“做到哪一步”和“最后做成什么”的机器。没有走这根线的，不要选。</p>
      <div class="clue-visual"><div class="impact-map">
        <div class="impact-source"><i>⌘</i><b>公用传话齿轮</b><small>patch-b7 修理对象</small></div>
        <div class="impact-targets">${impactTargets.map((target) => `<button class="impact-choice ${hasEvidence("impact") && target.affected ? "selected" : ""}" data-impact="${target.id}" ${hasEvidence("impact") ? "disabled" : ""}><b>${target.title}</b><small>${target.body}</small></button>`).join("")}</div>
      </div></div>
      ${hasEvidence("impact") ? '<div class="evidence-tag">已确认三台机器都连着这枚齿轮</div>' : '<div class="action-row"><button class="action-btn primary" id="check-impact">检查牵连范围</button></div>'}
    </div>`);
  $$("[data-impact]").forEach((button) => button.addEventListener("click", () => button.classList.toggle("selected")));
  $("#check-impact")?.addEventListener("click", checkImpact);
}

function checkImpact() {
  const selected = $$('[data-impact].selected').map((button) => button.dataset.impact).sort().join(",");
  if (selected === "archive,gate,pump") {
    collectEvidence("impact", "三台机器共用一枚传话齿轮的牵连图");
    closeModal();
    return;
  }
  toast("别按距离猜。谁需要这枚齿轮回答‘做到哪儿、最后怎样’，谁就会受它影响；只管开关的顶灯走另一根线。", 6500, true);
}

function investigateSandbox() {
  const solved = hasEvidence("sandbox");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 03 · 封闭试验间</div>
      <h2>第一次试修，不该直接拿整座城市冒险</h2>
      <p class="modal-intro">工坊留下两种办法。选一个：即使试坏了，也不会让城里的真机器跟着停下。</p>
      <div class="clue-visual"><div class="sandbox-compare">
        <div class="sandbox-zone"><i>▣</i><b>玻璃试验间里的副机</b><small>照着目前能工作的样子搭一台副机，只接上这次要修的部分；试坏了可以直接拆掉重来。</small></div>
        <div class="sandbox-zone live"><i>⚡</i><b>正在运转的城市线路</b><small>一拧扳手，河闸、升降台和水泵都会立刻跟着改变。</small></div>
      </div></div>
      ${solved ? '<div class="evidence-tag">玻璃试验间已启用，城里的机器不会被试修碰到</div>' : `<div class="deduction"><h3>第一扳手应该拧在哪里？</h3><div class="deduction-options">
        <button class="deduction-option sandbox-choice" data-correct="true">先在玻璃房的副机上少改一点，只接入这次需要的零件；试车通过以后，再申请装进城市。</button>
        <button class="deduction-option sandbox-choice" data-correct="false">直接改正在运转的城市机器，出事以后再凭记忆拧回去。</button>
        <button class="deduction-option sandbox-choice" data-correct="false">把整座城市所有机关都接进试验间，免得以后还要申请。</button>
      </div></div>`}
    </div>`);
  $$(".sandbox-choice").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.correct === "true") { collectEvidence("sandbox", "不会碰到城市真机器的玻璃试验间"); closeModal(); }
    else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("试验间是为了把错误关在玻璃房里，但也不能把全城机关都搬进去。只接这次真正需要的部分。", 5600); }
  }));
}

const requiredTests = ["focused", "integration", "regression"];

function investigateTests() {
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 04 · 联合试车台</div>
      <h2>齿轮能转，不代表装回整台机器也能用</h2>
      <p class="modal-intro">从小到大选出这次真正该做的全部试车。少一项不行，拿无关的灯光凑数也不行。</p>
      <div class="clue-visual"><div class="test-rack">
        ${testOption("focused", "先试这枚新零件", "它能听懂新命令，原来卡住的地方已经通了")}
        ${testOption("integration", "再把三台旧机器接上", "河闸、升降台和水泵都能听懂它送回来的话")}
        ${testOption("regression", "照旧办法再跑一遍", "旧命令、错误命令和半路停下仍按从前的规矩处理")}
        ${testOption("boot", "只看工坊的灯亮不亮", "灯亮、机器响，却没有检查刚修的地方")}
      </div></div>
      ${hasEvidence("tests") ? '<div class="evidence-tag">三轮试车全部通过；工坊灯亮没有被当成修好的证据</div>' : '<div class="action-row"><button class="action-btn primary" id="check-tests">开始所选试车</button></div>'}
    </div>`);
  $$("[data-test]").forEach((button) => button.addEventListener("click", () => button.classList.toggle("selected")));
  $("#check-tests")?.addEventListener("click", checkTests);
}

function testOption(id, title, body) {
  const selected = hasEvidence("tests") && requiredTests.includes(id) ? "selected" : "";
  return `<button class="test-option ${selected}" data-test="${id}" ${hasEvidence("tests") ? "disabled" : ""}><i>${selected ? "✓" : "○"}</i><span><b>${title}</b><small>${body}</small></span></button>`;
}

function checkTests() {
  const selected = $$('[data-test].selected').map((button) => button.dataset.test).sort().join(",");
  if (selected === [...requiredTests].sort().join(",")) {
    collectEvidence("tests", "从新零件到三台旧机器的三轮试车");
    closeModal();
    return;
  }
  const rack = $(".test-rack");
  rack.classList.remove("wrong"); void rack.offsetWidth; rack.classList.add("wrong");
  toast("既要试新故障是否消失，也要把三台旧机器接上，还要照旧办法再跑一遍。工坊灯亮不代表它们真的能用。", 7000, true);
}

function talkToYun() {
  closeModal();
  const lines = [
    {
      speaker: "云 · 系统工程师",
      portrait: "image/yun-portrait.png",
      text: "patch-b7 一口气动了四处，还把原来的样子刮掉了。现在没人能一眼看清，哪些是为了修故障，哪些只是工匠顺手改的。",
      choices: [{ label: "怎样让一次修理更容易检查？", next: 1 }, { label: "如果装进城市后才发现遗漏呢？", next: 2 }],
    },
    {
      speaker: "云 · 系统工程师",
      portrait: "image/yun-portrait.png",
      text: "先看懂旧机器和修理规矩，再写下这次只准备动哪一处。每次少改一点，把改前、改后的样子并排留下。这样第二个人看得懂，试坏了也知道该退哪一步。",
      choices: [{ label: "少改一点，反而更容易查清。", next: 3 }],
    },
    {
      speaker: "云 · 系统工程师",
      portrait: "image/yun-portrait.png",
      text: "装新零件前，先把现在这套能工作的旧件封存好。然后只接一条线路试用；一有异常就停止，立刻换回旧件，不能眼看着故障向全城扩散。",
      choices: [{ label: "先留好旧件，出事才能马上换回去。", next: 3 }],
    },
    {
      speaker: "云 · 系统工程师",
      portrait: "image/yun-portrait.png",
      text: "最重要的是，不能只信工匠自己写的‘已经修好’。修理前后的样子、试车结果、第二个人的检查和真机器的回话，必须对得上。",
      choices: [{ label: "记录云的修复规章", action: "close" }],
    },
  ];
  showDialogue(lines, 0, () => collectEvidence("yun", "云关于少改一点、请人复查和保留旧件的证词"));
}

const evidenceInfo = {
  patch: ["01", "patch-b7 修理单", "新齿轮单独能转，但旧机器熟悉的回话方式被刮掉了；修理单没有写谁会受影响，也没有留下原样。"],
  impact: ["02", "旧机牵连图", "河闸、档案升降台和应急水泵都靠同一枚齿轮传话；动它一处，三台机器都会跟着变。"],
  sandbox: ["03", "玻璃试验间", "第一次试修发生在照原样搭出的副机上，只接这次需要的部分；试坏了不会伤到城里的真机器。"],
  tests: ["04", "三轮联合试车", "先试新零件，再接上三台旧机器，最后照旧办法再跑一遍；工坊灯亮不能证明修好了。"],
  yun: ["05", "云的修理规章", "先看懂旧机器，再少改一点；把前后样子并排留下，请人复查，装上前封存能工作的旧件。"],
};

function evidenceCard(id) {
  const info = evidenceInfo[id];
  if (!hasEvidence(id)) return '<div class="evidence-card locked-card"><span class="card-no">未发现</span><h3>空证物袋</h3><p>继续调查禁区工坊。</p></div>';
  return `<div class="evidence-card"><span class="card-no">EVIDENCE ${info[0]}</span><h3>${info[1]}</h3><p>${info[2]}</p></div>`;
}

function openEvidenceBoard() {
  const canScope = hasEvidence("patch") && hasEvidence("impact") && !hasDeduction("scope");
  const canRecovery = hasEvidence("sandbox") && hasEvidence("tests") && hasEvidence("yun") && !hasDeduction("recovery");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">EVIDENCE BOARD</div><h2>证物台</h2>
      <p class="modal-intro">把这次修理、被牵连的旧机器和工坊本该做的保护连起来。</p>
      <div class="evidence-grid evidence-grid--case05">${["patch", "impact", "sandbox", "tests", "yun"].map(evidenceCard).join("")}</div>
      ${canScope ? scopeDeductionHTML() : ""}
      ${canRecovery ? recoveryDeductionHTML() : ""}
      ${!canScope && !canRecovery ? `<div class="deduction"><h3>${hasDeduction("scope") || hasDeduction("recovery") ? "已建立的联系" : "暂时无法推断"}</h3><p class="modal-intro">${deductionSummary()}</p></div>` : ""}
    </div>`);
  $$(".deduction-option[data-deduction]").forEach((button) => button.addEventListener("click", handleDeduction));
}

function scopeDeductionHTML() {
  return `<div class="deduction"><h3>连接 01 + 02：为什么局部修好，整体却坏了？</h3><div class="deduction-options">
    <button class="deduction-option" data-deduction="scope" data-correct="false">三台旧机器太落后，应该全部重造。</button>
    <button class="deduction-option" data-deduction="scope" data-correct="true">工匠只看见眼前的齿轮能转，没有先查它还替谁传话，也没有照旧办法试过三台机器。</button>
    <button class="deduction-option" data-deduction="scope" data-correct="false">既然新零件能转，说明其他故障与本次修改无关。</button>
  </div></div>`;
}

function recoveryDeductionHTML() {
  return `<div class="deduction"><h3>连接 03 + 04 + 05：怎样让修理看得懂、查得清、退得回？</h3><div class="deduction-options">
    <button class="deduction-option" data-deduction="recovery" data-correct="false">把全城机器都交给工匠，一次全部改完，减少来回试车。</button>
    <button class="deduction-option" data-deduction="recovery" data-correct="false">只要工匠承诺已经检查，就把旧件丢掉，直接换上新件。</button>
    <button class="deduction-option" data-deduction="recovery" data-correct="true">先在玻璃房的副机上少改一点，把前后样子并排留下，请人复查并做三轮试车；装上前封存旧件，先接一条线路，异常就停下换回去。</button>
  </div></div>`;
}

function handleDeduction(event) {
  const button = event.currentTarget;
  if (button.dataset.correct === "true") {
    unlockDeduction(button.dataset.deduction);
    window.EchoFeedback.showMastery("05", button.dataset.deduction, openModal, closeModal);
  } else {
    button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong");
    toast("这套做法能解释三台机器为什么一起出错，也能保证试坏时城里的真机器不受伤吗？", 5000);
  }
}

function deductionSummary() {
  const items = [];
  if (hasDeduction("scope")) items.push("牵连关系：动手前先查这枚零件还连着谁；眼前能转，不代表装回整机以后也没事。");
  if (hasDeduction("recovery")) items.push("安全修理：先在玻璃房少改一点，留下前后样子并做三轮试车；先接一条真线路，异常就停下并换回旧件。");
  return items.length ? items.join("<br>") : "收集成组证物后，才能建立可靠联系。";
}

const repairPieces = [
  { id: "inspect", text: "重现故障，看懂旧机器、修理规矩和牵连图" },
  { id: "plan", text: "写清这次只修哪一处，以及怎样才算修好" },
  { id: "isolate", text: "先在玻璃试验间的副机上少改一点" },
  { id: "review", text: "把改前、改后的样子并排放好，请第二个人复查" },
  { id: "test", text: "从新零件到三台旧机器，完整试车三轮" },
  { id: "release", text: "封存旧件，先接一条真线路；核对现实，异常就换回去" },
];

function isValidRepairOrder(order) {
  return order.join(",") === "inspect,plan,isolate,review,test,release";
}

function shuffledRepairPieces() {
  const pieces = [...repairPieces];
  for (let index = pieces.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pieces[index], pieces[swapIndex]] = [pieces[swapIndex], pieces[index]];
  }
  if (isValidRepairOrder(pieces.map((piece) => piece.id))) {
    [pieces[0], pieces[pieces.length - 1]] = [pieces[pieces.length - 1], pieces[0]];
  }
  return pieces;
}

function investigateConsole() {
  if (state.finalSolved) { showReveal(); return; }
  if (!hasDeduction("scope") || !hasDeduction("recovery")) {
    toast("出厂闸门还缺两枚调查印记。先在证物台查清谁被牵连，以及出事后怎样换回原样。", 4700);
    return;
  }
  showRepairPuzzle();
}

function showRepairPuzzle() {
  repairSelection = [];
  const displayPieces = shuffledRepairPieces();
  openModal(`
    <div class="modal-body"><div class="modal-kicker">FINAL ROUTE · 出厂闸门</div>
      <h2>让一枚修好的零件安全回到城市</h2>
      <p class="modal-intro">按先后点击六张步骤卡。只顾眼前、少做一次试车，或者没有留下旧件，闸门都不会打开。</p>
      <div class="repair-board" id="repair-board"><div class="repair-instruction" id="repair-instruction">从“重现故障并看懂旧机器”开始</div>
        <div class="repair-slots">${repairPieces.map((_, index) => `<div class="repair-slot" data-repair-slot="${index}">${String(index + 1).padStart(2, "0")}</div>`).join("")}</div>
        <div class="repair-pieces">${displayPieces.map((piece) => `<button class="repair-piece" data-repair-piece="${piece.id}">${piece.text}</button>`).join("")}</div>
      </div>
      <div class="action-row"><button class="action-btn" id="repair-reset">重新排列</button><button class="action-btn primary" id="repair-submit">申请出厂</button></div>
    </div>`);
  $$("[data-repair-piece]").forEach((button) => button.addEventListener("click", () => selectRepairPiece(button)));
  $("#repair-reset").addEventListener("click", resetRepair);
  $("#repair-submit").addEventListener("click", submitRepair);
}

function selectRepairPiece(button) {
  if (button.classList.contains("used") || repairSelection.length >= repairPieces.length) return;
  const id = button.dataset.repairPiece;
  repairSelection.push(id);
  button.classList.add("used");
  const slot = $(`[data-repair-slot='${repairSelection.length - 1}']`);
  slot.textContent = repairPieces.find((piece) => piece.id === id).text;
  slot.classList.add("filled");
  const remaining = repairPieces.length - repairSelection.length;
  $("#repair-instruction").textContent = remaining ? `还剩 ${remaining} 个步骤` : "修理路线已经接好，可以申请出厂";
}

function resetRepair() {
  repairSelection = [];
  $$("[data-repair-piece]").forEach((button) => button.classList.remove("used"));
  $$("[data-repair-slot]").forEach((slot, index) => { slot.textContent = String(index + 1).padStart(2, "0"); slot.classList.remove("filled"); });
  $("#repair-instruction").textContent = "从“重现故障并看懂旧机器”开始";
  $("#repair-board").classList.remove("wrong");
}

function submitRepair() {
  if (repairSelection.length < repairPieces.length) { toast("修理路线还没有接完。六个步骤缺一不可。", 6200, true); return; }
  if (!isValidRepairOrder(repairSelection)) {
    const board = $("#repair-board"); board.classList.remove("wrong"); void board.offsetWidth; board.classList.add("wrong");
    toast("出厂闸门没有打开：先看懂旧机器并写清只修哪里，再去玻璃房试修、留下前后样子、做完三轮试车；最后封存旧件，只接一条真线路。", 8500, true);
    return;
  }
  showRealityVerification();
}

function showRealityVerification() {
  openModal(`
    <div class="modal-body"><div class="modal-kicker">ENVIRONMENT VERIFY · 现实终态</div>
      <h2>工坊试车通过了，还差三台真机器的回答</h2>
      <p class="modal-intro">新零件已经先装进一条受控线路。现在去接收端看一眼：新毛病是否消失，旧本事是否还在。</p>
      <div class="reality-check">
        <span><b>北岸河闸 · 正常</b><small>开到哪、停在哪儿，都与现场一致</small></span>
        <span><b>档案升降台 · 正常</b><small>按旧柜号呼叫，仍会停在正确位置</small></span>
        <span><b>应急水泵 · 正常</b><small>启动回话与现场实际出水相符</small></span>
      </div>
      <div class="formula"><b>结案条件：</b>原来的故障消失，三台旧机器都能照常工作，现场读数也彼此对得上。少一项，就停止出厂并换回封存的旧件。</div>
      <div class="action-row"><button class="action-btn primary" id="confirm-reality">以现场结果结案</button><button class="action-btn" id="back-to-repair">返回修理路线</button></div>
    </div>`);
  $("#confirm-reality").addEventListener("click", () => {
    state.finalSolved = true;
    saveState();
    showReveal();
  });
  $("#back-to-repair").addEventListener("click", showRepairPuzzle);
}

function showReveal() {
  openModal(`
    <div class="reveal-hero"><div class="modal-kicker">CASE CLOSED · 真相已解锁</div><h2>真正闯祸的不是修理，而是只盯着眼前这一处</h2>
      <p>patch-b7 的局部自检没有撒谎，但它只回答了“眼前齿轮能不能转”。现在用牵连图、玻璃房、联合试车和三台真机器重建完整维修责任。</p>
      <p class="next-case-hook"><b>新增待查线索：</b>旧验收簿写着，patch-b7 明明少做了两轮试车，却仍盖着“100 / 100 · 完美通过”。更怪的是，打分的人只看了工匠自己留下的那段演示。第 06 案已登记：完美嫌疑人。</p></div>
    ${window.EchoFeedback.renderCompletion("05")}
    <div class="case-reconstruction">
      <section class="reconstruction-block">
        <div class="reconstruction-heading"><span>1</span><h3>关键证物重新作证</h3></div>
        <div class="evidence-replay">
          <article class="replay-card"><span>证物 01 + 02</span><b>修理单只测一枚齿轮，牵连图却连着三台机器</b><p>共享换算器同时服务河闸、档案升降台和应急水泵；局部通过无法代表所有调用者安全。</p></article>
          <article class="replay-card"><span>证物 03 + 04 + 05</span><b>玻璃试验间未启用，联合试车和恢复锚点被跳过</b><p>修改直接碰真实机器，没有清晰前后对照，也没有从局部到整体的检查和可验证旧件。</p></article>
        </div>
        <p class="player-proof"><b>你作出的判断：</b>事故根因不是“代码一定不能改”，而是修改前没有理解影响范围，修改时没有隔离，修改后没有回归，失败时也没有可靠退路。</p>
      </section>
      <section class="reconstruction-block">
        <div class="reconstruction-heading"><span>2</span><h3>局部成功为什么变成整体事故</h3></div>
        <div class="causal-chain"><div class="causal-node">只看眼前故障</div><i class="causal-arrow">→</i><div class="causal-node">漏掉共享换算器的调用者</div><i class="causal-arrow">→</i><div class="causal-node">直接在真实机器上试修</div><i class="causal-arrow">→</i><div class="causal-node">局部自检替代联合回归</div><i class="causal-arrow">→</i><div class="causal-node">三台旧机器同时失效且难以撤回</div></div>
      </section>
      <section class="reconstruction-block">
        <div class="reconstruction-heading"><span>3</span><h3>你重走的安全出厂路</h3></div>
        <div class="repair-chain"><div class="causal-node">看懂结构与牵连</div><i class="causal-arrow">→</i><div class="causal-node">限定最小修改计划</div><i class="causal-arrow">→</i><div class="causal-node">玻璃房隔离试修</div><i class="causal-arrow">→</i><div class="causal-node">审查前后差异并分层测试</div><i class="causal-arrow">→</i><div class="causal-node">有限放行，异常换回旧件</div></div>
      </section>
    </div>
    <div class="term-map">
      <h3 class="term-map__title">现在，给你重走的维修步骤命名</h3>
      <p class="term-map__intro">这里的工程概念分别锚定牵连图、玻璃房、对照单、试车台和恢复旧件。</p>
      <div class="term-row"><span class="plain">先读牵连图，再写最小修理计划</span><span class="arrow">→</span><div><b>Coding Agent 的仓库理解与计划循环</b><small>对应先重现问题，读取项目规则、相关文件、依赖关系和已有检查，再提出范围小且结果可验证的修改。</small></div></div>
      <div class="term-row"><span class="plain">副机保存旧样，新旧刻度并排审查</span><span class="arrow">→</span><div><b>文件系统、独立工作区与 Diff</b><small>文件保存可审计状态，独立工作区隔离改动，Diff 让审查者看清究竟改了哪里，也提供精确撤回依据。</small></div></div>
      <div class="term-row"><span class="plain">第一次试修只在玻璃房接必要线路</span><span class="arrow">→</span><div><b>Sandbox 与最小权限</b><small>沙盒限制修改对真实环境的影响范围；只开放任务所需文件、网络和命令，让试错不能越过隔离边界。</small></div></div>
      <div class="term-row"><span class="plain">零件、三台旧机、真实线路逐层试车</span><span class="arrow">→</span><div><b>测试金字塔、回归验证、灰度与回滚</b><small>先验证修改点，再验证关联调用者和旧行为；有限放行后观察真实终态，任一异常就停止扩大并恢复旧件。</small></div></div>
      <div class="formula"><b>本案完整映射：</b>理解结构 → 限定计划 → 隔离修改 → Diff 审查 → 分层测试 → 有限放行 → 完成 / 回滚<br><small>三台真机器同时正常，才证明新故障消失且旧能力没有退化。</small></div>
      <section class="transfer-check" data-transfer-check data-success="维修成立：共享组件必须先查调用者，在隔离工作区做最小修改，再运行局部与关联回归，有限放行且保留回滚点。" data-failure="局部检查或直接上线都会重现 patch-b7 的事故。共享组件的真实风险来自它影响的所有调用者。">
        <span class="transfer-check__kicker">TRANSFER CHECK · 换一个共享零件</span>
        <h3>修复日期解析器前，哪条路线最可靠？</h3>
        <p>一个日期解析器让新报表显示错误，但它也被账单和告警系统共同调用。</p>
        <div class="transfer-options">
          <button class="transfer-option" data-transfer-option>只运行新报表的局部测试，通过后立即替换生产文件。</button>
          <button class="transfer-option" data-transfer-option data-correct="true">先查三个调用者，在隔离工作区做最小修改，审查 Diff，跑局部与关联回归，再有限放行并保留回滚点。</button>
          <button class="transfer-option" data-transfer-option>为了绝对安全，永远不再修改这个共享组件。</button>
        </div>
        <p class="transfer-feedback" aria-live="polite">选择一项，检验你是否能把工坊的安全链迁移到真实代码维护。</p>
      </section>
      <div class="action-row"><a class="action-btn primary" href="case06.html?from=case05">复验满分记录：进入下一案 →</a><a class="action-btn" href="cases.html">返回案件目录</a><a class="action-btn" href="index.html">返回主页</a><button class="action-btn" id="open-final-archive">收入回声档案</button><button class="action-btn" data-close-modal>返回工坊</button></div>
    </div>`);
  $("#open-final-archive").addEventListener("click", openArchive);
  window.EchoFeedback.bindTransfer(modalContent);
  $$('[data-close-modal]', modalContent).forEach((button) => button.addEventListener("click", closeModal));
}

function openArchive() {
  closeModal();
  openModal(window.EchoArchive.render("05"));
  $("#reset-case")?.addEventListener("click", () => {
    if (confirm("确定清空案件 05 的进度并重新调查吗？")) {
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
  if (!hasEvidence("patch")) hint = "维护签名台上，一边是‘已经修好’的修理单，另一边是被刮掉的旧刻度。";
  else if (!hasEvidence("impact")) hint = "看看哪些机器不只要听见‘开始’，还要知道‘做到哪儿、最后怎样’。它们都靠这枚齿轮传话。";
  else if (!hasDeduction("scope")) hint = "打开证物台，把只试过的新齿轮和三台受牵连的旧机器放在一起。";
  else if (!hasEvidence("sandbox")) hint = "第一次拧扳手应该在玻璃房的副机上，不该直接碰正在工作的城市机器。";
  else if (!hasEvidence("tests")) hint = "先试新齿轮，再接上三台旧机器，最后照旧办法再跑一遍。工坊灯亮不能算。";
  else if (!hasEvidence("yun")) hint = "问问云：为什么要少改一点、留下前后样子，还要提前封存能工作的旧件。";
  else if (!hasDeduction("recovery")) hint = "打开证物台，把玻璃试验间、三轮试车和云的修理规章放在一起。";
  else if (!state.finalSolved) hint = "修理顺序：看懂旧机器 → 写清只修哪里 → 玻璃房试修 → 留下前后样子 → 三轮试车 → 先接一条真线路。";
  else hint = "本案已结。那枚来得莫名其妙的满分验收章，会把调查带向第六案。";
  toast(hint, 4600);
}

$("#start-btn").addEventListener("click", startGame);
$("#cover-archive-btn").addEventListener("click", () => { cover.classList.add("hidden"); app.classList.remove("hidden"); state.started = true; saveState(); openArchive(); });
$("#archive-btn").addEventListener("click", openArchive);
$("#evidence-btn").addEventListener("click", openEvidenceBoard);
$("#hint-btn").addEventListener("click", showHint);
$$('[data-close-modal]').forEach((element) => element.addEventListener("click", closeModal));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeModal(); dialogue.classList.add("hidden"); } });

const hotspotActions = { patch: investigatePatch, impact: investigateImpact, sandbox: investigateSandbox, tests: investigateTests, yun: talkToYun, console: investigateConsole };
$$('[data-hotspot]').forEach((button) => button.addEventListener("click", () => hotspotActions[button.dataset.hotspot]()));

const continuingFromCase04 = new URLSearchParams(window.location.search).get("from") === "case04";
if (state.started || continuingFromCase04) { cover.classList.add("hidden"); app.classList.remove("hidden"); }
if (continuingFromCase04) {
  state.started = true;
  saveState();
  if (!state.bridgeSeen) showBridgeFromCase04();
  else if (!state.introSeen) showIntro();
} else updateUI();
