const STORAGE_KEY = "echo-archive-case-03";

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
let pathSelection = [];

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
    objective.textContent = "证据已具备。重建完整找页路线，开启第七码封存门。";
    hint.textContent = "先提出问题，再走两条找页路线；汇合后比较，最后回到原页。";
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
  literal: ["01", "认字不认意的找页台", "照着准确编号，它能直达目标；名称换一种说法，它就找不到。"],
  meaning: ["02", "懂意思的回声池", "它能跨过改名和同义说法，却会混入主题相似的错误卷宗。"],
  fragment: ["03", "补齐来路的无名残页", "写上来自哪卷、说的是谁、何时写下和原页号码后，残句才不会被认错。"],
  conflict: ["04", "两张转运记录", "较晚且有双方签章的总账指向东库；三天前的北库便条仍被保留。"],
  lan: ["05", "澜的目录与原页", "先翻薄目录找到相关卷；真正需要作证时，再按取卷号拿出原页。"],
};

function evidenceCard(id) {
  const info = evidenceInfo[id];
  if (!hasEvidence(id)) return '<div class="evidence-card locked-card"><span class="card-no">未发现</span><h3>空证物袋</h3><p>继续调查卷宗库。</p></div>';
  return `<div class="evidence-card"><span class="card-no">EVIDENCE ${info[0]}</span><h3>${info[1]}</h3><p>${info[2]}</p></div>`;
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

const pathPieces = [
  { id: "question", text: "提出问题：低区水位越线时，旧河门如何处置？" },
  { id: "literal", text: "按原字与编号找" },
  { id: "meaning", text: "按含义和旧称找" },
  { id: "merge", text: "把两边找到的纸叠在一起，拿掉重复页" },
  { id: "rerank", text: "按设施、卷号、签章和日期重新排" },
  { id: "detail", text: "按取卷号拿出原页，核对后作答" },
];

function isValidPathOrder(path) {
  const first = path[0] === "question";
  const twoRoutes = [path[1], path[2]].sort().join(",") === ["literal", "meaning"].sort().join(",");
  const tail = path.slice(3).join(",") === "merge,rerank,detail";
  return first && twoRoutes && tail;
}

function shuffledPathPieces() {
  const pieces = [...pathPieces];
  for (let index = pieces.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pieces[index], pieces[swapIndex]] = [pieces[swapIndex], pieces[index]];
  }

  // 即使随机结果恰好是正确路线，也要打乱，避免从左到右点击直接通关。
  if (isValidPathOrder(pieces.map((piece) => piece.id))) {
    [pieces[0], pieces[pieces.length - 1]] = [pieces[pieces.length - 1], pieces[0]];
  }
  return pieces;
}

function investigateVault() {
  if (state.finalSolved) { showReveal(); return; }
  if (!hasDeduction("combine") || !hasDeduction("govern")) {
    toast("封存门需要两枚调查印记。先在证物台完成找页与验页推断。", 4300);
    return;
  }
  showPathPuzzle();
}

function showPathPuzzle() {
  pathSelection = [];
  const displayPieces = shuffledPathPieces();
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">FINAL LOCK · 第七码封存门</div>
      <h2>铺出一条说得清的找页路线</h2>
      <p class="modal-intro">按先后点击六张步骤卡。两种找法必须都在汇合之前，它们彼此的先后不作要求。</p>
      <div class="path-board" id="path-board">
        <div class="path-instruction" id="path-instruction">从“提出问题”开始</div>
        <div class="path-slots" id="path-slots">${pathPieces.map((_, index) => `<div class="path-slot" data-path-slot="${index}">${String(index + 1).padStart(2, "0")}</div>`).join("")}</div>
        <div class="path-pieces">${displayPieces.map((piece) => `<button class="path-piece" data-path-piece="${piece.id}">${piece.text}</button>`).join("")}</div>
      </div>
      <div class="action-row"><button class="action-btn" id="path-reset">重新排列</button><button class="action-btn primary" id="path-submit">开启封存门</button></div>
    </div>`);
  $$("[data-path-piece]").forEach((button) => button.addEventListener("click", () => selectPathPiece(button)));
  $("#path-reset").addEventListener("click", resetPath);
  $("#path-submit").addEventListener("click", submitPath);
}

function selectPathPiece(button) {
  if (button.classList.contains("used") || pathSelection.length >= pathPieces.length) return;
  const id = button.dataset.pathPiece;
  pathSelection.push(id);
  button.classList.add("used");
  const slot = $(`[data-path-slot='${pathSelection.length - 1}']`);
  slot.textContent = pathPieces.find((piece) => piece.id === id).text;
  slot.classList.add("filled");
  const remaining = pathPieces.length - pathSelection.length;
  $("#path-instruction").textContent = remaining ? `还剩 ${remaining} 个步骤` : "路线已铺好，可以尝试开门";
}

function resetPath() {
  pathSelection = [];
  $$("[data-path-piece]").forEach((button) => button.classList.remove("used"));
  $$("[data-path-slot]").forEach((slot, index) => {
    slot.textContent = String(index + 1).padStart(2, "0");
    slot.classList.remove("filled");
  });
  $("#path-instruction").textContent = "从“提出问题”开始";
  $("#path-board").classList.remove("wrong");
}

function submitPath() {
  if (pathSelection.length < pathPieces.length) {
    toast("路线还没有铺完。六个步骤缺一不可。", 6500, true);
    return;
  }
  if (!isValidPathOrder(pathSelection)) {
    const board = $("#path-board");
    board.classList.remove("wrong");
    void board.offsetWidth;
    board.classList.add("wrong");
    toast("封存门没有打开：问清问题后，两台装置都要去找；把找到的纸叠在一起、重新排好，最后才能拿原页作证。", 7800, true);
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
      <h2>第七码从未失踪，失踪的是它与问题之间的路</h2>
      <p>你让编号台和回声池一起找，把重复页叠掉，再按设施、卷号、签章和日期重排，最后沿取卷号拿到了原页。码头送来的进度牌机芯、失序的救援大厅和这份旧卷宗终于连成一线：眼前的事要亲自核对，多年前的记录也必须找得到来路。</p>
    </div>
    ${window.EchoFeedback.renderCompletion("03")}
    <div class="term-map">
      <div class="term-row"><span class="plain">把旧事实留到下一次调查</span><span class="arrow">→</span><div><b>持久化记忆与 User as Code</b><small>长期记忆不是保存全部聊天，而是维护可更新、可审计的事实日志与结构化快照；关键事实应带来源、时间、关系与权限边界。</small></div></div>
      <div class="term-row"><span class="plain">先找证据，再带着证据回答</span><span class="arrow">→</span><div><b>RAG：检索 → 增强 → 生成</b><small>先从外部知识库召回候选，把相关证据放入当前上下文，再生成答案。检索质量决定了系统能达到的上限。</small></div></div>
      <div class="term-row"><span class="plain">按原字与按含义两路找，汇合后重排</span><span class="arrow">→</span><div><b>混合检索、融合与 Rerank</b><small>BM25 擅长编号、专名和原句；Dense Retrieval 擅长语义与改写。合并候选后去重、融合，再用更强模型重排。</small></div></div>
      <div class="term-row"><span class="plain">残页补来路，概览指路，原页作证</span><span class="arrow">→</span><div><b>结构感知分块、上下文化分块与两层记忆</b><small>分块尊重章节和语义边界，并补上文档、章节、实体与时间。结构化概览负责导航，详情按需加载，避免信息洪水。</small></div></div>
      <div class="formula"><b>本案找页式：</b>两路召回 → 合并去重 → 相关性 / 来源 / 时间重排 → 回取原页验证<br><small>多跳难题才值得让系统自主拆解与循环检索；简单问题保持直接，冲突事实保留时间线而非静默覆盖。</small></div>
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
      state = { ...initialState, started: true };
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
  else if (!state.finalSolved) hint = "封存门路线：问清问题 → 两台都找 → 叠去重复 → 按来路重排 → 拿原页核对。两台谁先找都可以。";
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
