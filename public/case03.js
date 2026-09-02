const STORAGE_KEY = "echo-archive-case-03";
const SAVE_VERSION = 3;

const initialState = {
  saveVersion: SAVE_VERSION,
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
let archivePuzzle = null;

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
    if (parsed.saveVersion !== SAVE_VERSION) return { ...initialState, evidence: [], deductions: [] };
    return {
      ...initialState,
      ...parsed,
      saveVersion: SAVE_VERSION,
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
    hasEvidence("literal") && hasEvidence("meaning"),
    hasDeduction("combine"),
    hasEvidence("fragment") && hasEvidence("conflict") && hasEvidence("lan"),
    hasDeduction("govern"),
    state.finalSolved,
  ].filter(Boolean).length;
}

function canDeduce() {
  return (hasEvidence("literal") && hasEvidence("meaning") && !hasDeduction("combine")) ||
    (hasEvidence("fragment") && hasEvidence("conflict") && hasEvidence("lan") && !hasDeduction("govern"));
}

function updateUI() {
  const count = solvedCount();
  $("#progress-fill").style.width = `${count * 20}%`;
  $("#progress-text").textContent = `${count} / 5`;
  $("#evidence-count").textContent = `${state.evidence.length} 件证物`;

  const stepStates = {
    routes: hasEvidence("literal") && hasEvidence("meaning"),
    combine: hasDeduction("combine"),
    trust: hasEvidence("fragment") && hasEvidence("conflict") && hasEvidence("lan"),
    govern: hasDeduction("govern"),
    final: state.finalSolved,
  };
  const order = ["routes", "combine", "trust", "govern", "final"];
  const firstIncomplete = order.find((id) => !stepStates[id]);
  $$("#case-steps li").forEach((li) => {
    const id = li.dataset.step;
    li.classList.toggle("complete", stepStates[id]);
    li.classList.toggle("active", id === firstIncomplete);
  });

  $$('[data-hotspot]').forEach((spot) => {
    const id = spot.dataset.hotspot;
    spot.classList.toggle("done", id === "vault" ? state.finalSolved : hasEvidence(id));
  });

  const vaultReady = hasDeduction("combine") && hasDeduction("govern");
  $("[data-hotspot='vault']").classList.toggle("locked", !vaultReady && !state.finalSolved);
  $("#evidence-btn").classList.toggle("ready", canDeduce());

  const objective = $("#objective-text");
  const hint = $("#soft-hint-text");
  if (!hasEvidence("literal") || !hasEvidence("meaning")) {
    objective.textContent = "调查两台找页装置，看看它们各自遗漏了什么。";
    hint.textContent = "一个擅长认准原字，一个擅长听懂换过的说法。";
  } else if (!hasDeduction("combine")) {
    objective.textContent = "两台装置各有盲区。去证物台连接它们。";
    hint.textContent = "目标不是选出唯一赢家，而是让两种找法互相补缺。";
  } else if (!hasEvidence("fragment") || !hasEvidence("conflict") || !hasEvidence("lan")) {
    objective.textContent = "几张可能的原页已经找到，但还不能确定该信哪张。检查残页、转运记录柜并询问澜。";
    hint.textContent = "答案本身之外，还要知道它来自哪里、何时写下、怎样回到原页。";
  } else if (!hasDeduction("govern")) {
    objective.textContent = "两张转运纸互相矛盾。回证物台判断卷宗现在在哪，又该怎样留下旧去处。";
    hint.textContent = "较新的记录可以更新当前判断，但较旧证词不必被抹去。";
  } else if (!state.finalSolved) {
    objective.textContent = "调查材料已经齐全。用它们搭建一套能自己找全、排错并返回原页的找页柜。";
    hint.textContent = "配置不完整也可以启动；观察它在哪里停下，再只修改出错的区域。";
  } else {
    objective.textContent = "第七码卷宗已找回，正式知识卡已收入回声档案。";
    hint.textContent = "打开回声档案，可回顾三起已结案件的全部知识点。";
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
    text: "大厅刚恢复秩序，中央柜便吐出一张旧取卷条：第七码卷宗里写着北岸河闸的夜班处置办法。",
    choices: [{ label: "那就把它调出来。", next: 1 }],
  },
  {
    speaker: "澜 · 总索引员",
    portrait: "image/lan-portrait.png",
    text: "做不到。库里没有丢过一页，可按编号找，它不懂旧称；按意思找，它又把相似故事排在前面。七次搜索，七个错误答案。",
    choices: [{ label: "卷宗还在，只是找错了路？", next: 2 }, { label: "先告诉我最后一次错在哪里。", next: 3 }],
  },
  {
    speaker: "澜 · 总索引员",
    portrait: "image/lan-portrait.png",
    text: "是。更糟的是，捞出来的残页没写自己来自哪一卷，两张转运纸还说它去了不同库房。我不敢靠猜测打开封存门。",
    choices: [{ label: "把找页与验页分开调查。", next: 4 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "错误答案写着‘南岸排洪门’，但旧值班员口中的‘旧河门’，在改名后其实叫‘北岸潮汐闸’。只盯字面，会错过改名；只看大意，又会混入相似设施。",
    choices: [{ label: "两种找法都要检查。", next: 4 }],
  },
  {
    speaker: "澜 · 总索引员",
    portrait: "image/lan-portrait.png",
    text: "中央封存门只接受一条说得清的找页路线：从问题出发，说明哪些页是怎样找到的、为什么留下这一页，最后还要回到原卷核对。请替我重建它。",
    choices: [{ label: "开始调查 →", action: "close" }],
  },
];

const bridgeFromCase02Lines = [
  {
    speaker: "米娅 · 档案管理员",
    portrait: "image/mia-portrait.png",
    text: "大厅已经恢复。刚才被纸堆压住的取卷条也露了出来：q-07-417，第七码卷宗，记录着北岸河闸在低区水位越线时该怎么做。",
    choices: [{ label: "沿着编号把原卷调出来。", next: 1 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "码头把包裹送到了，救援大厅也把纸张理顺了。可这张取卷条要带我们翻过多年的旧档：知道某一卷存在，不代表急用时就能找对那一页。",
    choices: [{ label: "这次要在旧档里找对路。", next: 2 }],
  },
  {
    speaker: "澜 · 总索引员",
    portrait: "image/lan-portrait.png",
    text: "照编号找，只认得卷面上的新名字；照旧称找，又捞出一堆相似故事。残页没写来路，两张转运纸还互相打架。找了七次，没有一次敢拿来指挥河闸。",
    choices: [{ label: "先把可能的页找全，再查哪一张可信。", next: 3 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "前两处故障发生在眼前；这一处藏在多年旧档里。只要我们找错一页，后面的河闸命令就会从根上错掉。",
    choices: [{ label: "进入第七码库，完成追查 →", action: "close" }],
  },
];

function showIntro(index = 0) {
  showDialogue(introLines, index, () => {
    state.introSeen = true;
    saveState();
  });
}

function showBridgeFromCase02() {
  showDialogue(bridgeFromCase02Lines, 0, () => {
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

function toast(message, duration = 2600, lock = false) {
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

function investigateLiteral() {
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 01 · 编号找页台</div>
      <h2>它能认准一个字符，却听不懂换过的名字</h2>
      <p class="modal-intro">把门禁纸条上的精确编号输入后，目标卷宗立即来到第一位。</p>
      <div class="clue-visual"><div class="search-compare">
        <div class="search-query"><span>输入</span><b>q-07-417</b></div>
        <div class="result-stack">
          <div class="result-row hit"><i>1</i><div><b>q-07-417</b><small>第七码 · 河闸值班卷</small></div><small class="match-note">每个字符相同</small></div>
          <div class="result-row"><i>2</i><div><b>q-07-471</b><small>第七码 · 设备保养卷</small></div><small>编号相近</small></div>
        </div>
        <div class="search-query"><span>改用旧称</span><b>低区水位越线时，旧河门如何处置</b></div>
        <div class="result-row miss"><i>—</i><div><b>无结果</b><small>卷宗里只写着改名后的“北岸潮汐闸”</small></div><small>字面不同</small></div>
      </div></div>
      <p class="modal-intro">这台装置特别适合编号、专名和原句，但说法一变，它就像没见过。</p>
      ${hasEvidence("literal") ? '<div class="evidence-tag">已记录这台装置的长处与盲区</div>' : '<div class="action-row"><button class="action-btn primary" id="take-literal">保存两次结果</button></div>'}
    </div>`);
  $("#take-literal")?.addEventListener("click", () => {
    collectEvidence("literal", "认字不认意的编号找页台");
    closeModal();
  });
}

function investigateMeaning() {
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 02 · 含义回声池</div>
      <h2>它能听懂改名，却把相似故事混在一起</h2>
      <p class="modal-intro">回声池不要求每个字都相同。它听得出“旧河门”和“潮汐闸”说的是相近设施，却也把南岸另一座排洪门捞了上来。</p>
      <div class="clue-visual"><div class="search-compare">
        <div class="search-query"><span>询问</span><b>低区水位越线时，旧河门如何处置</b></div>
        <div class="result-stack">
          <div class="result-row hit"><i>1</i><div><b>南岸排洪门夜间规程</b><small>文字很相似，但设施错误</small></div><small class="match-note">意思相近</small></div>
          <div class="result-row"><i>2</i><div><b>北岸潮汐闸夜班处置</b><small>目标卷宗，采用了新名称</small></div><small>意思相近</small></div>
          <div class="result-row"><i>3</i><div><b>旧河道巡检表</b><small>主题相近，无水位处置步骤</small></div><small>意思相近</small></div>
        </div>
      </div></div>
      <p class="modal-intro">它找得更广，却不能只凭“像不像”决定谁排第一。</p>
      ${hasEvidence("meaning") ? '<div class="evidence-tag">已记录这台装置的长处与盲区</div>' : '<div class="action-row"><button class="action-btn primary" id="take-meaning">保存找页顺序</button></div>'}
    </div>`);
  $("#take-meaning")?.addEventListener("click", () => {
    collectEvidence("meaning", "懂意思却会混入相似页的回声池");
    closeModal();
  });
}

function investigateFragment() {
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 03 · 无名残页</div>
      <h2>“它”究竟指哪一座门？</h2>
      <p class="modal-intro">残页上的句子没有错，但脱离原卷后，任何人都无法确认“它”是谁。选择最有助于日后找回和核对的页眉。</p>
      <div class="clue-visual"><div class="fragment-lab">
        <blockquote class="orphan-fragment">“低区水位越线时，它必须开启三成；最终闸位未确认前不得结案。”</blockquote>
        <div class="context-options">
          <button class="context-option" data-context="wrong"><b>方案 A · 原样孤立保存</b>正文：低区水位越线时，它必须开启三成……</button>
          <button class="context-option" data-context="correct"><b>方案 B · 补齐来路</b>来源：第七码 / 北岸潮汐闸<br>章节：夜班处置 / 日期：6 月 14 日<br>原页：q-07-417 · 第 32 页</button>
          <button class="context-option" data-context="wrong"><b>方案 C · 多写几个相近词</b>河门、排洪、潮汐、低区、水位、开启</button>
        </div>
      </div></div>
      ${hasEvidence("fragment") ? '<div class="evidence-tag">残页已补齐来源、对象、时间与原页入口</div>' : ''}
    </div>`);
  if (!hasEvidence("fragment")) {
    $$('[data-context]').forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.context === "correct") {
        collectEvidence("fragment", "补齐来路的无名残页");
        closeModal();
      } else {
        button.classList.remove("wrong");
        void button.offsetWidth;
        button.classList.add("wrong");
        toast("正文没有变，但仍无法确认它来自哪卷、说的是谁，也回不到原页。", 4200);
      }
    }));
  }
}

function investigateConflict() {
  const solved = hasEvidence("conflict");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 04 · 转运记录柜</div>
      <h2>两份记录互相矛盾，不能悄悄抹掉其中一份</h2>
      <p class="modal-intro">卷宗曾经在北库，后来又被转往东库。请选择既能判断当前位置、又能保留变化过程的处理方式。</p>
      <div class="clue-visual"><div class="timeline-ledger">
        <div class="ledger-entry"><time>6 月 11 日</time><div class="ledger-paper"><b>“第七码已移交北库。”</b><small>来源：值班员手写便条 · 无接收签章</small></div></div>
        <div class="ledger-entry latest"><time>6 月 14 日</time><div class="ledger-paper"><b>“第七码由北库转入东库恒温柜。”</b><small>来源：转运总账 · 双方签章 · 柜位 e-7</small></div></div>
      </div></div>
      ${solved ? '<div class="evidence-tag">当前柜位已确认，两次转运也都保留下来</div>' : `<div class="deduction"><h3>你会去哪个库房，又怎样处理旧便条？</h3><div class="deduction-options">
        <button class="deduction-option conflict-option" data-correct="false">只留下较新的东库记录，删除北库便条。</button>
        <button class="deduction-option conflict-option" data-correct="false">两份都算正确，所以随机选择一个库房。</button>
        <button class="deduction-option conflict-option" data-correct="true">按较晚且有双方签章的总账去东库；保留北库便条，注明那是三天前的去处。</button>
      </div></div>`}
    </div>`);
  $$(".conflict-option").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.correct === "true") {
      collectEvidence("conflict", "保留两次去处的转运记录");
      closeModal();
    } else {
      button.classList.remove("wrong");
      void button.offsetWidth;
      button.classList.add("wrong");
      toast("找当前库房要比较日期和签章，但旧便条也证明卷宗确实经过北库，不能悄悄丢掉。", 4700);
    }
  }));
}

function talkToLan() {
  closeModal();
  const lines = [
    {
      speaker: "澜 · 总索引员",
      portrait: "image/lan-portrait.png",
      text: "我曾把每卷的全部正文都铺在桌上。桌子很快被淹没；后来我只留一句短评，又无法证明短评从何而来。",
      choices: [{ label: "能不能先看地图，再按需开原页？", next: 1 }, { label: "第七码的地图会写什么？", next: 2 }],
    },
    {
      speaker: "澜 · 总索引员",
      portrait: "image/lan-portrait.png",
      text: "可以。先做一本薄目录，只写有哪些卷、人物、地点，以及它们彼此怎么相连；真正要作证时，再沿目录上的取卷号拿出原页。桌上不会被淹没，证据也没有丢。",
      choices: [{ label: "薄目录负责指路，原页负责作证。", next: 3 }],
    },
    {
      speaker: "澜 · 总索引员",
      portrait: "image/lan-portrait.png",
      text: "第七码：北岸潮汐闸；旧称旧河门；涉及低区水位处置与库房转运。它只是一张地图，不替代 q-07-417 第 32 页的原始记录。",
      choices: [{ label: "先凭关系定位，再回原页核对。", next: 3 }],
    },
    {
      speaker: "澜 · 总索引员",
      portrait: "image/lan-portrait.png",
      text: "还有一条规矩：只收以后可能用得上的事实。无关闲聊不进柜；写着私人资料的卷宗，要锁好柜门，注明谁能看、到哪天必须封存或销毁。",
      choices: [{ label: "记录索引员证词", action: "close" }],
    },
  ];
  showDialogue(lines, 0, () => collectEvidence("lan", "薄目录指路、原页作证的找卷办法"));
}

const evidenceInfo = {
  literal: ["编号台结果", "认字不认意的找页台", "照着准确编号，它能直达目标；名称换一种说法，它就找不到。"],
  meaning: ["回声池清单", "懂意思的回声池", "它能跨过改名和同义说法，却会混入主题相似的错误卷宗。"],
  fragment: ["残页页眉", "补齐来路的无名残页", "写上来自哪卷、说的是谁、何时写下和原页号码后，残句才不会被认错。"],
  conflict: ["转运记录", "两张转运记录", "较晚且有双方签章的总账指向东库；三天前的北库便条仍被保留。"],
  lan: ["澜的薄目录", "澜的目录与原页", "先翻薄目录找到相关卷；真正需要作证时，再按取卷号拿出原页。"],
};

function evidenceCard(id) {
  const info = evidenceInfo[id];
  if (!hasEvidence(id)) return '<div class="evidence-card locked-card"><span class="card-no">未发现</span><h3>空证物袋</h3><p>继续调查卷宗库。</p></div>';
  return `<div class="evidence-card"><span class="card-no">${info[0]}</span><h3>${info[1]}</h3><p>${info[2]}</p></div>`;
}

function openEvidenceBoard() {
  const canCombine = hasEvidence("literal") && hasEvidence("meaning") && !hasDeduction("combine");
  const canGovern = hasEvidence("fragment") && hasEvidence("conflict") && hasEvidence("lan") && !hasDeduction("govern");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">EVIDENCE BOARD</div>
      <h2>证物台</h2>
      <p class="modal-intro">把能够互相补缺、共同解释一次失误的证物连接起来。</p>
      <div class="evidence-grid evidence-grid--case03">${["literal", "meaning", "fragment", "conflict", "lan"].map(evidenceCard).join("")}</div>
      ${canCombine ? combineDeductionHTML() : ""}
      ${canGovern ? governDeductionHTML() : ""}
      ${!canCombine && !canGovern ? `<div class="deduction"><h3>${hasDeduction("combine") || hasDeduction("govern") ? "已建立的联系" : "暂时无法推断"}</h3><p class="modal-intro">${deductionSummary()}</p></div>` : ""}
    </div>`);
  $$(".deduction-option[data-deduction]").forEach((button) => button.addEventListener("click", handleDeduction));
}

function combineDeductionHTML() {
  return `<div class="deduction"><h3>连接 01 + 02：怎样既不漏掉改名的目标，又不让相似答案占据第一位？</h3><div class="deduction-options">
    <button class="deduction-option" data-deduction="combine" data-correct="false">只用编号装置，因为精确总比理解意思可靠。</button>
    <button class="deduction-option" data-deduction="combine" data-correct="true">让两台装置都去找，把重复的页叠在一起，再按问题中的设施、卷号和来路重新排一次。</button>
    <button class="deduction-option" data-deduction="combine" data-correct="false">只用回声池，并把第一条相似结果直接当答案。</button>
  </div></div>`;
}

function governDeductionHTML() {
  return `<div class="deduction"><h3>连接 03 + 04 + 05：怎样让目录简短，却仍然值得相信？</h3><div class="deduction-options">
    <button class="deduction-option" data-deduction="govern" data-correct="false">只留下最短结论，旧便条和原页都丢掉。</button>
    <button class="deduction-option" data-deduction="govern" data-correct="false">把所有原页永远铺在眼前，避免任何取回步骤。</button>
    <button class="deduction-option" data-deduction="govern" data-correct="true">薄目录只负责指路，需要作证再取原页；每张摘录写清来自哪卷、说的是谁和日期，互相矛盾的旧便条也一并留下。</button>
  </div></div>`;
}

function handleDeduction(event) {
  const button = event.currentTarget;
  if (button.dataset.correct === "true") {
    unlockDeduction(button.dataset.deduction);
    window.EchoFeedback.showMastery("03", button.dataset.deduction, openModal, closeModal);
  } else {
    button.classList.remove("wrong");
    void button.offsetWidth;
    button.classList.add("wrong");
    toast("这样做会不会漏掉改过名字的卷？能不能排除相似的错页？最后还能不能找到原卷？", 4300);
  }
}

function deductionSummary() {
  const items = [];
  if (hasDeduction("combine")) items.push("找页办法：编号台照原字找，回声池照意思找；两边结果叠在一起，再按设施、卷号和来路重新排。 ");
  if (hasDeduction("govern")) items.push("验页办法：薄目录只指路，需要作证再取原页；摘录写清来路和日期，旧去处也保留。");
  return items.length ? items.join("<br>") : "收集成组证物后，才能建立可靠联系。";
}

function investigateVault() {
  if (state.finalSolved) { showReveal(); return; }
  if (!hasDeduction("combine") || !hasDeduction("govern")) {
    toast("封存门需要两枚调查印记。先在证物台完成找页与验页推断。", 4300);
    return;
  }
  showRetrievalWorkbench();
}

const retrievalParts = {
  literal: ["编号台结果", "照准确编号找", "q-07-417 能直接命中；名称换过以后，这一路会漏掉。"],
  meaning: ["回声池清单", "照旧称与意思找", "能认出旧河门与北岸潮汐闸的关系，也会带回相似设施。"],
  fragment: ["残页页眉", "核对这段话属于谁", "卷名、设施、日期与页码已经补回残页。"],
  conflict: ["两张转运记录", "分清旧去处与当前去处", "6 月 11 日北库是旧位，6 月 14 日签章总账指向东库 e-7。"],
  lan: ["澜的薄目录", "从简短条目返回完整原页", "取卷号把 q-07-417 接回第 32 页。"],
  southPage: ["回声池第一张", "直接采用排在最前的页面", "南岸排洪门文字最像，但设施与编号不符。"],
  patrolSheet: ["旧河道巡检表", "只看主题相近就留下", "它谈河道巡查，却没有水位越线后的处置步骤。"],
  maintenanceVolume: ["q-07-471 保养卷", "只看相近编号就留下", "编号十分接近，内容却是设备保养。"],
};

const retrievalZones = {
  find: { title: "找全可能的页面", note: "需要同时接住准确编号和换过的叫法。", slots: 2 },
  check: { title: "判断哪张值得相信", note: "补回残页身份，并分清记录的新旧去处。", slots: 2 },
  source: { title: "返回完整原页", note: "用简短入口找到能够作证的原件。", slots: 1 },
};

function shuffledRetrievalParts() {
  const ids = Object.keys(retrievalParts);
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
  }
  if (ids.join(",") === Object.keys(retrievalParts).join(",")) [ids[0], ids[ids.length - 1]] = [ids[ids.length - 1], ids[0]];
  return ids;
}

function showRetrievalWorkbench(reset = true) {
  if (reset || !archivePuzzle) {
    archivePuzzle = {
      selected: "",
      trayOrder: shuffledRetrievalParts(),
      slots: { find: [null, null], check: [null, null], source: [null] },
      result: null,
    };
  }
  renderRetrievalWorkbench("柜门已经展开成三个区域。先选一件材料，再点一个空插槽；任何配置都可以启动试运行。");
}

function installedRetrievalParts() {
  return Object.values(archivePuzzle.slots).flat().filter(Boolean);
}

function retrievalZoneHTML(zoneId) {
  const zone = retrievalZones[zoneId];
  const needsRepair = archivePuzzle.result && !archivePuzzle.result.ok && archivePuzzle.result.failedZone === zoneId;
  return `<section class="builder-zone ${needsRepair ? "problem" : ""}" data-zone="${zoneId}">
    <header><span>${zoneId === "find" ? "01" : zoneId === "check" ? "02" : "03"}</span><div><b>${zone.title}</b><small>${zone.note}</small></div>${needsRepair ? "<em>返修这里</em>" : ""}</header>
    <div class="builder-zone__slots">${archivePuzzle.slots[zoneId].map((id, index) => {
      if (!id) return `<button class="builder-slot" data-build-slot="${zoneId}:${index}"><span>空插槽</span><small>${archivePuzzle.selected ? "点击安装已选材料" : "先从下方选择材料"}</small></button>`;
      const part = retrievalParts[id];
      return `<button class="builder-slot filled" data-build-slot="${zoneId}:${index}"><span>${part[0]} · 点击取回</span><b>${part[1]}</b></button>`;
    }).join("")}</div>
  </section>`;
}

function retrievalTrayHTML() {
  const installed = installedRetrievalParts();
  const available = archivePuzzle.trayOrder.filter((id) => !installed.includes(id));
  return `<div class="builder-tray">${available.map((id) => {
    const part = retrievalParts[id];
    return `<button class="builder-part ${archivePuzzle.selected === id ? "selected" : ""}" data-build-part="${id}"><span>${part[0]}</span><b>${part[1]}</b><small>${part[2]}</small></button>`;
  }).join("")}</div><div class="archive-scroll-hint"><span>←</span> 材料没有按答案排列，可拖动横向滚动条继续翻找 <span>→</span></div>`;
}

function retrievalTestResult() {
  const find = archivePuzzle.slots.find;
  const check = archivePuzzle.slots.check;
  const source = archivePuzzle.slots.source;
  const has = (zone, id) => zone.includes(id);

  if (!has(find, "literal") && !has(find, "meaning")) return {
    ok: false,
    failedZone: "find",
    title: "两句询问都没有走进合适的找页入口",
    numbered: "只剩相似编号与相似主题，q-07-471 被推到前面。",
    renamed: "旧河门没有被认成北岸潮汐闸，南岸相似页排在前面。",
    stop: "找页柜没有获得两种互补的找法。",
  };
  if (!has(find, "literal")) return {
    ok: false,
    failedZone: "find",
    title: "旧称能够听懂，准确编号却失去了约束",
    numbered: "q-07-417 与 q-07-471 混在一起，无法认准目标卷号。",
    renamed: "旧河门找到了北岸候选，也带回南岸排洪门。",
    stop: "把编号台结果接入第一个区域，才能排除相近编号。",
  };
  if (!has(find, "meaning")) return {
    ok: false,
    failedZone: "find",
    title: "编号能够命中，换过名字的问题仍然无路可走",
    numbered: "q-07-417 已经出现。",
    renamed: "只照原字寻找“旧河门”，没有找到改名后的北岸潮汐闸。",
    stop: "把回声池清单接入第一个区域，才能跨过旧称。",
  };
  if (!has(check, "fragment")) return {
    ok: false,
    failedZone: "check",
    title: "候选找全了，无名残句却无法证明自己属于谁",
    numbered: "编号台与回声池共同带回北岸、南岸和巡检表。",
    renamed: "南岸页面正文最像，仍然冒充正确答案。",
    stop: "需要残页页眉提供卷名、设施、日期和页码。",
  };
  if (!has(check, "conflict")) return {
    ok: false,
    failedZone: "check",
    title: "页面身份已经确认，柜门却停在三天前的北库",
    numbered: "两种找法都指向 q-07-417 · 北岸潮汐闸。",
    renamed: "残页也与北岸身份吻合，但旧便条仍指向北库。",
    stop: "需要两张转运记录分清旧去处和当前柜位。",
  };
  if (!has(source, "lan")) return {
    ok: false,
    failedZone: "source",
    title: "正确卷宗已经确认，却只能停在简短摘录",
    numbered: "q-07-417 已锁定，当前柜位也已确认是东库 e-7。",
    renamed: "旧称问题与同一卷宗汇合。",
    stop: "需要澜的薄目录提供第 32 页入口，才能回到原件。",
  };
  return {
    ok: true,
    title: "两种问法穿过同一套机关，回到了同一张原页",
    numbered: "q-07-417 → 北岸潮汐闸 → 当前卷",
    renamed: "旧河门 + 低区水位越线 → 北岸潮汐闸 → 当前卷",
    stop: "候选已排除，来路与当前柜位完整，可以取出第 32 页核对。",
  };
}

function retrievalResultHTML() {
  if (!archivePuzzle.result) return `<section class="builder-idle"><span>试运行窗口</span><b>等待启动</b><p>你不必先猜出完整答案。随时启动，观察自己搭建的找页柜会在哪里停下。</p></section>`;
  const result = archivePuzzle.result;
  return `<section class="builder-run ${result.ok ? "success" : "failed"}" id="builder-test-result" ${result.ok ? "" : 'role="alert" aria-live="assertive"'}>
    ${result.ok ? `<header><span>运行通过</span><h3>${result.title}</h3></header>` : `<div class="builder-error-banner"><strong>!</strong><div><span>试运行失败</span><b>${result.title}</b><small>问题位于“${retrievalZones[result.failedZone].title}”区域</small></div></div>`}
    <div class="builder-queries">
      <article><span>测试一 · 准确编号</span><b>“调出 q-07-417。”</b><p>${result.numbered}</p></article>
      <article><span>测试二 · 换过的叫法</span><b>“旧河门遇到低区水位越线怎么办？”</b><p>${result.renamed}</p></article>
    </div>
    <div class="builder-stop"><b>${result.ok ? "机关输出" : "为什么会失败"}</b><p>${result.stop}</p></div>
    ${result.ok ? `<div class="builder-route-output"><span>两种找法汇合</span><i>→</i><span>身份与新旧记录核对</span><i>→</i><span>东库 e-7 · 第 32 页</span></div>
      <article class="original-page"><span>第七码 · q-07-417 · 第 32 页</span><h3>北岸潮汐闸夜班处置</h3><p>低区水位越线时，北岸潮汐闸开启三成。最终闸位与现场水位未确认前，不得登记完成。</p><small>修订：6 月 14 日｜东库 e-7｜转运双方签章</small></article>
      <div class="action-row"><button class="action-btn primary" id="finish-retrieval-build">封存这套找页柜并结案</button></div>` : `<div class="builder-repair-note"><b>下一步：</b>配置没有被清空。只需返回标红区域，取回错误部件或补上缺失材料。<button class="action-btn" data-jump-to-zone="${result.failedZone}">前往返修区域 ↑</button></div>`}
  </section>`;
}

function renderRetrievalWorkbench(message, preserveScroll = false, focusResult = false) {
  const card = modal.querySelector(".modal__card");
  const previousScroll = preserveScroll && card ? card.scrollTop : 0;
  const previousTrayScroll = preserveScroll ? modal.querySelector(".builder-tray")?.scrollLeft || 0 : 0;
  openModal(`<div class="modal-body retrieval-workbench-wrap">
    <div class="modal-kicker">FINAL BUILD · 双路找页柜</div>
    <h2>不要替柜子找答案，决定它以后怎样找</h2>
    <p class="modal-intro">五件调查材料与三条真实出现过的错误捷径已经混在一起。选择材料，再把它装进三个区域；你可以随时运行并根据结果返修。</p>
    <div class="retrieval-workbench">
      <div class="retrieval-workbench__status ${archivePuzzle.result && !archivePuzzle.result.ok ? "danger" : archivePuzzle.result?.ok ? "success" : ""}">${message}</div>
      <div class="builder-layout">${retrievalZoneHTML("find")}<i>→</i>${retrievalZoneHTML("check")}<i>→</i>${retrievalZoneHTML("source")}</div>
      <div class="builder-selection">${archivePuzzle.selected ? `已拿起：<b>${retrievalParts[archivePuzzle.selected][0]} · ${retrievalParts[archivePuzzle.selected][1]}</b>` : "先从材料带选择一件，再点击上方空插槽。"}</div>
      ${retrievalTrayHTML()}
      <div class="action-row builder-actions"><button class="action-btn primary" id="run-retrieval-build">启动两组找页测试</button><button class="action-btn" id="reset-retrieval-build">拆下全部材料</button></div>
      ${retrievalResultHTML()}
    </div>
  </div>`);

  if (focusResult) {
    requestAnimationFrame(() => requestAnimationFrame(() => $("#builder-test-result")?.scrollIntoView({ behavior: "smooth", block: "start" })));
  } else if (preserveScroll) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      modal.querySelector(".modal__card").scrollTop = previousScroll;
      const tray = modal.querySelector(".builder-tray");
      if (tray) tray.scrollLeft = Math.min(previousTrayScroll, Math.max(0, tray.scrollWidth - tray.clientWidth));
    }));
  }

  $$('[data-build-part]').forEach((button) => button.addEventListener("click", () => {
    archivePuzzle.selected = archivePuzzle.selected === button.dataset.buildPart ? "" : button.dataset.buildPart;
    renderRetrievalWorkbench(archivePuzzle.selected ? "材料已经拿起。现在选择上方任意一个空插槽。" : "材料已经放回材料带。", true);
  }));
  $$('[data-build-slot]').forEach((button) => button.addEventListener("click", () => {
    const [zone, rawIndex] = button.dataset.buildSlot.split(":");
    const index = Number(rawIndex);
    if (archivePuzzle.slots[zone][index]) {
      const removed = archivePuzzle.slots[zone][index];
      archivePuzzle.slots[zone][index] = null;
      archivePuzzle.result = null;
      renderRetrievalWorkbench(`${retrievalParts[removed][0]}已经退回材料带，其余配置保持不动。`, true);
      return;
    }
    if (!archivePuzzle.selected) {
      renderRetrievalWorkbench("这个插槽还是空的。先从材料带拿起一件材料。", true);
      return;
    }
    archivePuzzle.slots[zone][index] = archivePuzzle.selected;
    archivePuzzle.selected = "";
    archivePuzzle.result = null;
    renderRetrievalWorkbench("材料已经装入。可以继续搭建，也可以现在启动看看会发生什么。", true);
  }));
  $("#run-retrieval-build").addEventListener("click", () => {
    archivePuzzle.result = retrievalTestResult();
    if (!archivePuzzle.result.ok) toast(`试运行失败：${archivePuzzle.result.title}`, 4600, true);
    renderRetrievalWorkbench(archivePuzzle.result.ok ? "找页柜通过了两种问法，已经取出原页，可以封存结案。" : `试运行失败：${archivePuzzle.result.title}。标红区域需要返修。`, false, true);
  });
  $("#reset-retrieval-build").addEventListener("click", () => showRetrievalWorkbench(true));
  $("[data-jump-to-zone]")?.addEventListener("click", (event) => {
    const zone = event.currentTarget.dataset.jumpToZone;
    $(`[data-zone="${zone}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("#finish-retrieval-build")?.addEventListener("click", () => {
    if (!archivePuzzle.result?.ok) return;
    state.finalSolved = true;
    saveState();
    showReveal();
  });
}

function showReveal() {
  openModal(`
    <div class="reveal-hero">
      <div class="modal-kicker">CASE CLOSED · 真相已解锁</div>
      <h2>第七码从未失踪，失踪的是它与问题之间的路</h2>
      <p>你没有替柜子从七个相似答案中猜一个，而是利用调查材料搭建了它以后寻找、排错并返回原页的办法。两种不同问法已经通过同一套机关回到同一张证据。</p>
    </div>
    ${window.EchoFeedback.renderCompletion("03")}
    <div class="case-reconstruction">
      <section class="reconstruction-block">
        <div class="reconstruction-heading"><span>1</span><h3>关键证物重新作证</h3></div>
        <div class="evidence-replay">
          <article class="replay-card"><span>编号台结果 + 回声池清单</span><b>编号台认准原字，回声池认得改名后的含义</b><p>前者能锁定 q-07-417，却会漏掉新名称；后者能找到同义说法，却把相似设施排在前面。</p></article>
          <article class="replay-card"><span>残页页眉 + 转运记录 + 澜的薄目录</span><b>无名残页内容相似，只有来路能解决冲突</b><p>来源、章节、日期、转运记录和原页号码共同证明哪一页属于当前北岸预案。</p></article>
        </div>
        <p class="player-proof"><b>你实际完成的调查：</b>你先在五个调查点保存了编号结果、回声池顺序、带页眉的残页、两张转运纸和澜的薄目录；随后决定它们分别负责找全候选、排除错页和返回原件。你可以提前启动、观察具体停点并局部返修，最后让编号问法与旧称问法共同返回 q-07-417 原页。</p>
      </section>
      <section class="reconstruction-block">
        <div class="reconstruction-heading"><span>2</span><h3>错误答案为什么总排在前面</h3></div>
        <div class="causal-chain"><div class="causal-node">只按旧名字会漏掉改名卷宗</div><i class="causal-arrow">→</i><div class="causal-node">只按含义会召回相似设施</div><i class="causal-arrow">→</i><div class="causal-node">残页缺少来源与日期</div><i class="causal-arrow">→</i><div class="causal-node">冲突记录无法判断新旧</div><i class="causal-arrow">→</i><div class="causal-node">相似答案冒充正确证据</div></div>
      </section>
      <section class="reconstruction-block">
        <div class="reconstruction-heading"><span>3</span><h3>你重建的找页路线</h3></div>
        <div class="repair-chain"><div class="causal-node">从证物中提取五件机关部件</div><i class="causal-arrow">→</i><div class="causal-node">为两种问法安装两个找页入口</div><i class="causal-arrow">→</i><div class="causal-node">用残页身份和转运新旧排除错页</div><i class="causal-arrow">→</i><div class="causal-node">用薄目录接回完整原页</div><i class="causal-arrow">→</i><div class="causal-node">启动测试并按停点局部返修</div><i class="causal-arrow">→</i><div class="causal-node">两种问法汇合后核对原卷</div></div>
      </section>
    </div>
    <div class="term-map">
      <h3 class="term-map__title">现在，给你修复的找页步骤命名</h3>
      <p class="term-map__intro">下面每个正式名字，都对应你刚才亲手完成的一段调查，不增加没有操作依据的新答案。</p>
      <div class="term-row"><span class="plain">把问题送入自己搭好的找页柜，取回原页以后再形成答案</span><span class="arrow">→</span><div><b>RAG：检索 → 增强 → 生成</b><small>对应你安装部件、启动两组测试并以取回的第 32 页支持结论；找错或取不回原件时，后续答案就没有可靠上限。</small></div></div>
      <div class="term-row"><span class="plain">在“找全候选”区域同时安装编号台结果与回声池清单</span><span class="arrow">→</span><div><b>混合检索（Hybrid Search）</b><small>编号找页对应精确词项检索，回声池对应语义检索；测试中的编号问法和旧称问法分别证明两路缺一不可。</small></div></div>
      <div class="term-row"><span class="plain">让两路候选汇合，再用身份与新旧记录排除南岸错页</span><span class="arrow">→</span><div><b>融合去重与 Rerank</b><small>对应你在第二个区域安装残页页眉与转运记录；第一张或正文最像的页面不再自动胜出。</small></div></div>
      <div class="term-row"><span class="plain">把卷名、设施、日期和页码随残句一起装入核对区域</span><span class="arrow">→</span><div><b>结构感知分块与上下文化分块</b><small>对应残页页眉这一证物和“无身份时南岸错页仍会冒充答案”的试运行后果。</small></div></div>
      <div class="term-row"><span class="plain">在“返回完整原页”区域安装澜的薄目录</span><span class="arrow">→</span><div><b>记忆分层（Memory Layers）</b><small>薄目录负责日常导航，完整原页按需回取；对应系统从简短条目走到第 32 页的输出路线。</small></div></div>
      <div class="term-row"><span class="plain">安装两张转运记录，让北库旧位不能覆盖东库 e-7 当前柜位</span><span class="arrow">→</span><div><b>来源追踪与知识治理</b><small>来源、时间、版本和冲突记录共同决定当前有效信息；对应缺少它时找页柜停在三天前北库的失败结果。</small></div></div>
      <div class="formula"><b>本案完整映射：</b>证物提出设计条件 → 玩家分配五件部件 → 两种问法进入同一套找页柜 → 试运行暴露停点 → 局部返修 → 返回并核对原页<br><small>你产出的不只是本案答案，而是一套以后仍知道怎样找全、排错和回到证据的系统。</small></div>
      <div class="action-row"><a class="action-btn primary" href="case04.html?from=case03">继续案件 04：午夜回电 →</a><a class="action-btn" href="index.html">返回主页</a><button class="action-btn" id="open-final-archive">收入回声档案</button><button class="action-btn" data-close-modal>返回卷宗库</button></div>
    </div>`);
  $("#open-final-archive").addEventListener("click", openArchive);
  $$('[data-close-modal]', modalContent).forEach((button) => button.addEventListener("click", closeModal));
}

function openArchive() {
  closeModal();
  openModal(window.EchoArchive.render("03"));
  $("#reset-case")?.addEventListener("click", () => {
    if (confirm("确定清空案件 03 的进度并重新调查吗？")) {
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
  if (!hasEvidence("literal")) hint = "编号找页台先照准确编号找，再照旧名字找，两次结果并不相同。";
  else if (!hasEvidence("meaning")) hint = "回声池能理解改名后的说法，但第一名不一定是正确设施。";
  else if (!hasDeduction("combine")) hint = "打开证物台，连接两台各有盲区的找页装置。";
  else if (!hasEvidence("fragment")) hint = "无名残页缺的不是更多相近词，而是它来自哪卷、说的是谁、何时写下和原页号码。";
  else if (!hasEvidence("conflict")) hint = "记录柜里的两条话发生在不同日期，来源可靠程度也不同。";
  else if (!hasEvidence("lan")) hint = "呼叫澜，问他如何既避免满桌原页，又能随时回去作证。";
  else if (!hasDeduction("govern")) hint = "打开证物台，把无名残页、两张转运纸和澜的薄目录放在一起。";
  else if (!state.finalSolved) hint = "双路找页柜有三个区域：找全候选需要两种找法；排除错页需要残页身份和转运新旧；返回原件需要澜的薄目录。可以提前启动查看停点。";
  else hint = "本案已结，回声档案已收录三案全部已解锁知识卡。";
  toast(hint, 4200);
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
  literal: investigateLiteral,
  meaning: investigateMeaning,
  fragment: investigateFragment,
  conflict: investigateConflict,
  lan: talkToLan,
  vault: investigateVault,
};

$$('[data-hotspot]').forEach((button) => button.addEventListener("click", () => hotspotActions[button.dataset.hotspot]()));

const continuingFromCase02 = new URLSearchParams(window.location.search).get("from") === "case02";

if (state.started || continuingFromCase02) {
  cover.classList.add("hidden");
  app.classList.remove("hidden");
}

if (continuingFromCase02) {
  state.started = true;
  saveState();
  if (!state.bridgeSeen) showBridgeFromCase02();
  else if (!state.introSeen) showIntro();
} else {
  updateUI();
}
