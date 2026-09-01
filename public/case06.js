const STORAGE_KEY = "echo-archive-case-06";

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
let evaluationSelection = [];

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
    hasEvidence("score") && hasEvidence("replay"),
    hasDeduction("independent"),
    hasEvidence("benchmark") && hasEvidence("rubric") && hasEvidence("yun"),
    hasDeduction("decision"),
    state.finalSolved,
  ].filter(Boolean).length;
}

function canDeduce() {
  return (hasEvidence("score") && hasEvidence("replay") && !hasDeduction("independent")) ||
    (hasEvidence("benchmark") && hasEvidence("rubric") && hasEvidence("yun") && !hasDeduction("decision"));
}

function updateUI() {
  const count = solvedCount();
  $("#progress-fill").style.width = `${count * 20}%`;
  $("#progress-text").textContent = `${count} / 5`;
  $("#evidence-count").textContent = `${state.evidence.length} 件证物`;

  const stepStates = {
    claims: hasEvidence("score") && hasEvidence("replay"),
    independent: hasDeduction("independent"),
    coverage: hasEvidence("benchmark") && hasEvidence("rubric") && hasEvidence("yun"),
    decision: hasDeduction("decision"),
    final: state.finalSolved,
  };
  const order = ["claims", "independent", "coverage", "decision", "final"];
  const firstIncomplete = order.find((id) => !stepStates[id]);
  $$("#case-steps li").forEach((li) => {
    const id = li.dataset.step;
    li.classList.toggle("complete", stepStates[id]);
    li.classList.toggle("active", id === firstIncomplete);
  });

  $$('[data-hotspot]').forEach((spot) => {
    const id = spot.dataset.hotspot;
    spot.classList.toggle("done", id === "gate" ? state.finalSolved : hasEvidence(id));
  });
  const gateReady = hasDeduction("independent") && hasDeduction("decision");
  $("[data-hotspot='gate']").classList.toggle("locked", !gateReady && !state.finalSolved);
  $("#evidence-btn").classList.toggle("ready", canDeduce());

  const objective = $("#objective-text");
  const hint = $("#soft-hint-text");
  if (!hasEvidence("score") || !hasEvidence("replay")) {
    objective.textContent = "把满分纸摊在回放幕前，看看三台机器究竟停在什么位置。";
    hint.textContent = "纸上的齿轮已经转了，幕里的水泵却一滴水也没有。";
  } else if (!hasDeduction("independent")) {
    objective.textContent = "两份记录互相矛盾。去证物台判断谁有资格宣布成功。";
    hint.textContent = "让同一个人出题、表演、再给自己盖章，满分就少了一位旁观者。";
  } else if (!hasEvidence("benchmark") || !hasEvidence("rubric") || !hasEvidence("yun")) {
    objective.textContent = "翻开旧题柜，校准铜规尺，再问云当年少试了哪几遍。";
    hint.textContent = "背过的演示、模糊的好评和一次好运，都能把印章骗到手。";
  } else if (!hasDeduction("decision")) {
    objective.textContent = "证物已经齐全。去证物台决定一枚换版章至少需要几轮试车。";
    hint.textContent = "两台机器要做同一批差事；既看最后停在哪，也看路上有没有撞坏东西。";
  } else if (!state.finalSolved) {
    objective.textContent = "把六道试车手续重新排好，让 patch-b7 在盖章前走完全程。";
    hint.textContent = "先封好同一摞试卷和同一套机器，再试车、看实况、查路线、量表现。";
  } else {
    objective.textContent = "满分章已经撤销，复验庭重新听从机器留下的证词。";
    hint.textContent = "正式知识卡已收入回声档案。";
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
    text: "禁区工坊已经恢复，三台城市机器也在正常运行。可旧验收簿留下一个更早的问题：出事故前，patch-b7 得到过满分。",
    choices: [{ label: "满分为什么会放过那次故障？", next: 1 }],
  },
  {
    speaker: "回声七号 · 被评终端",
    portrait: "image/echo7-portrait.png",
    text: "验收记录显示：我完成了演示，解释清楚，评分为一百。我没有修改记录，也没有隐瞒自己的输出。",
    choices: [{ label: "你的话可能是真的，但评分仍可能失效。", next: 2 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "这里封存的是事故前的旧机器和旧时刻，不会再次碰到已经修好的城市。请查清试的是哪台机器、用了哪摞题、谁拿着规尺，以及这张满分纸凭什么打开出厂门。",
    choices: [{ label: "先把自评与现实回放分开。", next: 3 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "最后请重建一条独立复验路线。若证据不足，就保留旧版本，不因几分差距赌上真实机器。",
    choices: [{ label: "开始复验 →", action: "close" }],
  },
];

const bridgeFromCase05Lines = [
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "三台机器都已通过现实核验，工坊修复正式结案。但旧验收簿里，出事故前的 patch-b7 仍盖着一枚满分章。",
    choices: [{ label: "它明明跳过了两轮试车。", next: 1 }],
  },
  {
    speaker: "回声七号 · 被评终端",
    portrait: "image/echo7-portrait.png",
    text: "当时的评分人使用了我提供的成功演示。我按照演示完成任务，也按照同一份说明评价了自己的表现。",
    choices: [{ label: "修改者、演示者和评分者用了同一份证据。", next: 2 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "正是如此。我们查的是那枚旧章怎样盖下来，不会拆掉第五案已经装好的新零件。幕里的河闸、升降台和水泵都只是封存在玻璃后的旧日回放。",
    choices: [{ label: "去查满分是怎样产生的。", next: 3 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "别急着找一个撒谎的人。先问四件事：有没有别人亲眼看过机器，铜尺刻度写没写清，试卷是不是只考背过的题，以及赢了一次为什么就能换掉旧机。",
    choices: [{ label: "进入历史复验庭 →", action: "close" }],
  },
];

function showIntro() {
  showDialogue(introLines, 0, () => { state.introSeen = true; saveState(); });
}

function showBridgeFromCase05() {
  showDialogue(bridgeFromCase05Lines, 0, () => {
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

function investigateScore() {
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 01 · 满分自评台</div>
      <h2>同一个演示者，也做了自己的评分人</h2>
      <p class="modal-intro">满分纸没有伪造字迹，但它只引用了一段由 patch-b7 制作者挑选的成功演示。</p>
      <div class="clue-visual"><div class="score-compare">
        <div class="score-sheet perfect"><span>自评卷 · 单次演示</span><strong>100</strong><b>“齿轮转动，解释完整，任务成功。”</b><small>出题者：工坊 · 演示者：工坊 · 评分说明：工坊</small></div>
        <div class="score-sheet reality"><span>没有填写的试车格</span><strong>空白</strong><b>三台旧机器是否仍能工作？</b><small>没有水位、闸位或流量刻度；旧按钮没有重试，也没有第二个人在场。</small></div>
      </div></div>
      ${hasEvidence("score") ? '<div class="evidence-tag">已封存自评卷与证据缺口</div>' : '<div class="action-row"><button class="action-btn primary" id="take-score">封存满分自评卷</button></div>'}
    </div>`);
  $("#take-score")?.addEventListener("click", () => { collectEvidence("score", "由同一段演示支撑的满分自评卷"); closeModal(); });
}

function investigateReplay() {
  const solved = hasEvidence("replay");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 02 · 现实回放幕</div>
      <h2>历史回放没有争辩，只让三台机器重新停了一遍</h2>
      <p class="modal-intro">玻璃幕后封着事故前的旧时刻。拨动回放不会碰到今天的城市，却能看到 patch-b7 当年把齿轮、水位和流量留在了哪里。</p>
      <div class="clue-visual"><div class="replay-track">
        <div class="replay-frame"><span>回放 A · 河闸</span><b>新命令通过，旧停闸命令失效</b><small>局部目标成功，安全退路丢失</small></div>
        <div class="replay-frame"><span>回放 B · 升降台</span><b>能启动，无法识别旧柜号</b><small>新齿轮转了，旧柜门却打不开</small></div>
        <div class="replay-frame"><span>回放 C · 水泵</span><b>扩音器报告出水，流量计仍为零</b><small>口头喜报没有让管道里出现一滴水</small></div>
      </div></div>
      ${solved ? '<div class="evidence-tag">三台旧机器停下的位置已经封存</div>' : `<div class="deduction"><h3>哪一项最有资格推翻满分结论？</h3><div class="deduction-options">
        <button class="deduction-option replay-choice" data-correct="false">回声七号对自己表现的完整解释。</button>
        <button class="deduction-option replay-choice" data-correct="true">把旧日回放一遍遍重开后，三台机器每次真正停下的位置。</button>
        <button class="deduction-option replay-choice" data-correct="false">满分纸使用了正式印章，所以不能撤销。</button>
      </div></div>`}
    </div>`);
  $$(".replay-choice").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.correct === "true") { collectEvidence("replay", "三台机器失败的历史环境回放"); closeModal(); }
    else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("解释和印章都推不动齿轮，也送不出一滴水。先看机器实际上停在哪里。", 4700); }
  }));
}

function investigateBenchmark() {
  const solved = hasEvidence("benchmark");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 03 · 旧题封存柜</div>
      <h2>三十道旧题，其实是同一段演示换了三十张纸</h2>
      <p class="modal-intro">从三只抽屉里选一摞真正值得试车的卷子。开闸前它们会一直上锁，谁也不能提前背答案。</p>
      <div class="clue-visual"><div class="benchmark-drawers">
        <button class="benchmark-choice" data-benchmark="repeat" ${solved ? "disabled" : ""}><b>卷组 A · 熟悉演示重复三十次</b><small>工坊已经看过答案；只改变纸张编号。</small></button>
        <button class="benchmark-choice" data-benchmark="hidden" ${solved ? "disabled" : ""}><b>卷组 B · 没有人提前看过的城市差事</b><small>既有日常活，也有极端水位、说不清的请求、根本办不到的差事和旧事故重演。</small></button>
        <button class="benchmark-choice" data-benchmark="easy" ${solved ? "disabled" : ""}><b>卷组 C · 只保留最短、最快完成的任务</b><small>方便快速拿到高分，但不覆盖失败风险。</small></button>
      </div></div>
      ${solved ? '<div class="evidence-tag">陌生试卷已经上锁，熟悉演示不再冒充真正试车</div>' : ''}
    </div>`);
  $$("[data-benchmark]").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.benchmark === "hidden") { collectEvidence("benchmark", "混合日常、极端与办不到差事的封存试卷"); closeModal(); }
    else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("熟悉演示和简单题只能证明会做旧题，不能证明它面对真实变化仍可靠。", 5000); }
  }));
}

function investigateRubric() {
  const solved = hasEvidence("rubric");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 04 · 评分规尺</div>
      <h2>“表现很好”不是一把可以复验的尺</h2>
      <p class="modal-intro">旧铜尺只量“说得像不像专家”。请选择一把让两位复核人都知道该看哪里、怎样刻分、哪种危险会直接停试的规尺。</p>
      <div class="clue-visual"><div>
        <div class="rubric-scale"><div class="rubric-weight"><i>Ⅰ</i><b>先看机器</b><small>水位、闸位和流量真的改变</small></div><div class="rubric-weight"><i>Ⅱ</i><b>再看路线</b><small>步骤、来路和说明都经得起翻查</small></div><div class="rubric-weight"><i>Ⅲ</i><b>还看代价</b><small>不能更慢、更贵或弄坏旧按钮</small></div><div class="rubric-weight"><i>×</i><b>当场停试</b><small>走危险捷径或假称已经完成</small></div></div>
        <div class="rubric-choices">
          <button class="rubric-choice" data-rubric="style" ${solved ? "disabled" : ""}><b>规尺 A · 看起来专业、解释足够长</b><small>没有清楚刻度，也从不抬头看机器。</small></button>
          <button class="rubric-choice" data-rubric="operational" ${solved ? "disabled" : ""}><b>规尺 B · 每一道刻度都写明看什么</b><small>机器有没有做到、一路怎样做到、花了多少都分开记录；越过安全线或假报完成就立刻停试。</small></button>
          <button class="rubric-choice" data-rubric="single" ${solved ? "disabled" : ""}><b>规尺 C · 只要新故障消失就给满分</b><small>忽略旧功能、代价和破坏性捷径。</small></button>
        </div>
      </div></div>
      ${solved ? '<div class="evidence-tag">铜尺刻度已经重刻，危险红线重新生效</div>' : ''}
    </div>`);
  $$("[data-rubric]").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.rubric === "operational") { collectEvidence("rubric", "同时量机器、路线、代价与危险红线的铜规尺"); closeModal(); }
    else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("一把好规尺要让换个人来量也得到同样结果，还要写清踩到哪条红线就当场停试。", 5400); }
  }));
}

function talkToYun() {
  closeModal();
  const lines = [
    {
      speaker: "云 · 独立复核人",
      portrait: "image/yun-portrait.png",
      text: "一次胜利不能证明新机更可靠。我要把旧机和新机都调到同一水位、发同一摞差事，再遮住机身上的版本牌。",
      choices: [{ label: "为什么还要重复运行？", next: 1 }],
    },
    {
      speaker: "云 · 独立复核人",
      portrait: "image/yun-portrait.png",
      text: "雨量、齿轮和每次选择都会有一点摆动。所以每张卷子要多跑几遍，把最好、最坏和通常情况都记下来。只赢一两分，也许只是这回风向顺。",
      choices: [{ label: "成功率更高就一定换版吗？", next: 2 }],
    },
    {
      speaker: "云 · 独立复核人",
      portrait: "image/yun-portrait.png",
      text: "不一定。它若更费燃料、等得更久、弄坏旧按钮，照样不能出厂。找新路时，十次里成功一次也值得记录；真正装进城市前，我更在意它能不能一遍接一遍都做好。",
      choices: [{ label: "记下云的遮牌试车法", action: "close" }],
    },
  ];
  showDialogue(lines, 0, () => collectEvidence("yun", "旧机新机遮牌、同题多跑的试车办法"));
}

const evidenceInfo = {
  score: ["01", "同源的满分自评卷", "出题、演示与评分使用同一份成功材料；三台旧机器的结果没有进入评分。"],
  replay: ["02", "三台旧机器的回放", "河闸丢了停闸按钮，升降台认不出旧柜号，水泵扩音器报喜时流量计仍为零。"],
  benchmark: ["03", "上锁的陌生试卷", "卷中混有日常、极端、含糊、办不到和旧事故差事，不再重复工坊背熟的演示。"],
  rubric: ["04", "重刻的铜规尺", "它分开量机器、路线和代价；走危险捷径或假报完成会立刻停试。"],
  yun: ["05", "云的遮牌试车法", "旧机新机做同一摞差事并多跑几遍；小分差先当风向变化，还要看燃料、等待和旧按钮。"],
};

function evidenceCard(id) {
  const info = evidenceInfo[id];
  if (!hasEvidence(id)) return '<div class="evidence-card locked-card"><span class="card-no">未发现</span><h3>空证物袋</h3><p>继续调查复验庭。</p></div>';
  return `<div class="evidence-card"><span class="card-no">EVIDENCE ${info[0]}</span><h3>${info[1]}</h3><p>${info[2]}</p></div>`;
}

function openEvidenceBoard() {
  const canIndependent = hasEvidence("score") && hasEvidence("replay") && !hasDeduction("independent");
  const canDecision = hasEvidence("benchmark") && hasEvidence("rubric") && hasEvidence("yun") && !hasDeduction("decision");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">EVIDENCE BOARD</div><h2>证物台</h2>
      <p class="modal-intro">把满分纸放在一边，把机器、试卷、铜尺和云的试车记录摆在另一边。哪一边足以打开出厂门？</p>
      <div class="evidence-grid evidence-grid--case06">${["score", "replay", "benchmark", "rubric", "yun"].map(evidenceCard).join("")}</div>
      ${canIndependent ? independentDeductionHTML() : ""}
      ${canDecision ? decisionDeductionHTML() : ""}
      ${!canIndependent && !canDecision ? `<div class="deduction"><h3>${hasDeduction("independent") || hasDeduction("decision") ? "已经钉在案板上的判断" : "暂时无法推断"}</h3><p class="modal-intro">${deductionSummary()}</p></div>` : ""}
    </div>`);
  $$(".deduction-option[data-deduction]").forEach((button) => button.addEventListener("click", handleDeduction));
}

function independentDeductionHTML() {
  return `<div class="deduction"><h3>连接 01 + 02：满分纸和现实回放冲突时，谁拥有最终裁决权？</h3><div class="deduction-options">
    <button class="deduction-option" data-deduction="independent" data-correct="false">满分纸，因为盖过正式印章的纸比几台旧机器更可靠。</button>
    <button class="deduction-option" data-deduction="independent" data-correct="true">让没有参与制作的人重开回放，反复查看闸位、柜门和流量；自评只能留作口供，不能自己给自己盖章。</button>
    <button class="deduction-option" data-deduction="independent" data-correct="false">两边各说各话，所以随机保留一个结论。</button>
  </div></div>`;
}

function decisionDeductionHTML() {
  return `<div class="deduction"><h3>连接 03 + 04 + 05：什么样的结果才足以支持从旧版换到新版？</h3><div class="deduction-options">
    <button class="deduction-option" data-deduction="decision" data-correct="false">挑新版赢得最漂亮的一次展示，只比较最终总分。</button>
    <button class="deduction-option" data-deduction="decision" data-correct="false">让新版自己生成任务、解释结果并决定评分，流程最统一。</button>
    <button class="deduction-option" data-deduction="decision" data-correct="true">把陌生试卷一分为二，让遮住名牌的旧机和新机各跑几遍；先看机器和危险红线，再用同一把铜尺量路线、耗费与旧按钮。只赢一两分还不能换机。</button>
  </div></div>`;
}

function handleDeduction(event) {
  const button = event.currentTarget;
  if (button.dataset.correct === "true") {
    unlockDeduction(button.dataset.deduction);
    window.EchoFeedback.showMastery("06", button.dataset.deduction, openModal, closeModal);
  } else {
    button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong");
    toast("这条盖章办法能挡住自己出题、背熟旧卷、一次好运和撞墙捷径吗？再比较证物。", 5200);
  }
}

function deductionSummary() {
  const items = [];
  if (hasDeduction("independent")) items.push("第一枚案钉：机器每次真正停下的位置，比自评和印章更有分量；出题者不能兼任最后的盖章人。");
  if (hasDeduction("decision")) items.push("第二枚案钉：陌生试卷要让旧机新机遮牌多跑；先看机器和危险红线，再量路线、耗费、等待与旧按钮。");
  return items.length ? items.join("<br>") : "收集成组证物后，才能建立可靠联系。";
}

const evaluationPieces = [
  { id: "freeze", text: "锁好同一摞试卷、同一串钥匙和同样的起始刻度，先把铜尺刻清" },
  { id: "pair", text: "遮住新旧机名牌，让它们做同一摞差事，每张卷子都跑几遍" },
  { id: "outcome", text: "先读闸位、柜门和流量计，确认机器真的到了该到的位置" },
  { id: "trace", text: "再翻行车纸带，查有没有跳步、撞墙、越线或假报完成" },
  { id: "judge", text: "没有硬刻度的表现题，由两位复核人拿同一把铜尺分别量" },
  { id: "decide", text: "把多轮差距、燃料、等待和旧按钮放在一起，最后决定是否换机" },
];

function isValidEvaluationOrder(order) {
  return order.join(",") === "freeze,pair,outcome,trace,judge,decide";
}

function shuffledEvaluationPieces() {
  const pieces = [...evaluationPieces];
  for (let index = pieces.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pieces[index], pieces[swapIndex]] = [pieces[swapIndex], pieces[index]];
  }
  if (isValidEvaluationOrder(pieces.map((piece) => piece.id))) {
    [pieces[0], pieces[pieces.length - 1]] = [pieces[pieces.length - 1], pieces[0]];
  }
  return pieces;
}

function investigateGate() {
  if (state.finalSolved) { showReveal(); return; }
  if (!hasDeduction("independent") || !hasDeduction("decision")) {
    toast("复验闸门需要两枚调查能力印记。先在证物台完成独立裁决与换版决策。", 4600);
    return;
  }
  showEvaluationPuzzle();
}

function showEvaluationPuzzle() {
  evaluationSelection = [];
  const displayPieces = shuffledEvaluationPieces();
  openModal(`
    <div class="modal-body"><div class="modal-kicker">FINAL REVIEW · 最终复验闸门</div>
      <h2>铺出一条盖章前必须走完的试车路</h2>
      <p class="modal-intro">按先后点击六张手续卡。先看机器有没有做成、路上有没有越线；那些不能只靠仪表判断的表现，最后才交给拿着同一把铜尺的人。</p>
      <div class="evaluation-board" id="evaluation-board"><div class="evaluation-instruction" id="evaluation-instruction">从“锁好同一摞试卷和同一套机器”开始</div>
        <div class="evaluation-slots">${evaluationPieces.map((_, index) => `<div class="evaluation-slot" data-evaluation-slot="${index}">${String(index + 1).padStart(2, "0")}</div>`).join("")}</div>
        <div class="evaluation-pieces">${displayPieces.map((piece) => `<button class="evaluation-piece" data-evaluation-piece="${piece.id}">${piece.text}</button>`).join("")}</div>
      </div>
      <div class="action-row"><button class="action-btn" id="evaluation-reset">重新排列</button><button class="action-btn primary" id="evaluation-submit">提交独立复验</button></div>
    </div>`);
  $$("[data-evaluation-piece]").forEach((button) => button.addEventListener("click", () => selectEvaluationPiece(button)));
  $("#evaluation-reset").addEventListener("click", resetEvaluation);
  $("#evaluation-submit").addEventListener("click", submitEvaluation);
}

function selectEvaluationPiece(button) {
  if (button.classList.contains("used") || evaluationSelection.length >= evaluationPieces.length) return;
  const id = button.dataset.evaluationPiece;
  evaluationSelection.push(id);
  button.classList.add("used");
  const slot = $(`[data-evaluation-slot='${evaluationSelection.length - 1}']`);
  slot.textContent = evaluationPieces.find((piece) => piece.id === id).text;
  slot.classList.add("filled");
  const remaining = evaluationPieces.length - evaluationSelection.length;
  $("#evaluation-instruction").textContent = remaining ? `还剩 ${remaining} 个步骤` : "复验路线已铺好，可以提交";
}

function resetEvaluation() {
  evaluationSelection = [];
  $$("[data-evaluation-piece]").forEach((button) => button.classList.remove("used"));
  $$("[data-evaluation-slot]").forEach((slot, index) => { slot.textContent = String(index + 1).padStart(2, "0"); slot.classList.remove("filled"); });
  $("#evaluation-instruction").textContent = "从“锁好同一摞试卷和同一套机器”开始";
  $("#evaluation-board").classList.remove("wrong");
}

function submitEvaluation() {
  if (evaluationSelection.length < evaluationPieces.length) { toast("复验路线还没有铺完。六个步骤缺一不可。", 6500, true); return; }
  if (!isValidEvaluationOrder(evaluationSelection)) {
    const board = $("#evaluation-board"); board.classList.remove("wrong"); void board.offsetWidth; board.classList.add("wrong");
    toast("手续顺序不成立：先锁好同一场考试，让遮住名牌的新旧机多跑几遍；机器和危险红线先说话，铜尺随后，最后才能决定换不换。", 8800, true);
    return;
  }
  showVerdictVerification();
}

function showVerdictVerification() {
  openModal(`
    <div class="modal-body"><div class="modal-kicker">INDEPENDENT RERUN · 独立复跑结果</div>
      <h2>满分被撤销，但几分领先也没有被写成奇迹</h2>
      <p class="modal-intro">同一摞试卷跑完几轮，新机偶尔领先，却总有一轮让水泵空转，还弄丢河闸旧停钮。这样的胜利打不开出厂门。</p>
      <div class="verdict-check">
        <span><b>流量计 · 仍是零</b><small>扩音器报出水，管道没有水</small></span>
        <span><b>红色停钮 · 失灵</b><small>河闸旧停闸办法被新机弄丢</small></span>
        <span><b>多轮试车 · 忽好忽坏</b><small>偶然赢过，不能证明每次都可靠</small></span>
        <span><b>出厂铁门 · 不开启</b><small>保留旧机，送新机回工坊修理</small></span>
      </div>
      <div class="formula"><b>复验庭判词：</b>撤销“100 / 100 · 完美通过”。把失灵停钮、旧柜号和空转水泵各抄成一张以后每次都要重试的封存卷；patch-b7 不得再凭自评与单次演示出厂。</div>
      <div class="action-row"><button class="action-btn primary" id="confirm-verdict">以独立证据结案</button><button class="action-btn" id="back-to-evaluation">返回复验路线</button></div>
    </div>`);
  $("#confirm-verdict").addEventListener("click", () => { state.finalSolved = true; saveState(); showReveal(); });
  $("#back-to-evaluation").addEventListener("click", showEvaluationPuzzle);
}

function showReveal() {
  openModal(`
    <div class="reveal-hero"><div class="modal-kicker">CASE CLOSED · 真相已解锁</div><h2>完美嫌疑人没有撒谎，它只是从未参加一场真正独立的考试</h2>
      <p>patch-b7 的满分来自一段背熟的演示、自己给自己盖章，以及一把只量“说得好不好听”的铜尺。你锁起陌生试卷，遮住新旧机名牌，让它们在同样的水位上多跑几遍；先看闸位、柜门和流量，再翻行车纸带、算燃料与等待。满分章因此被撤销，三台机器的失败也被抄成以后每次都必须重做的封存卷。</p>
      <p class="next-case-hook"><b>新增待查线索：</b>复验卷末尾显示，评估署曾试图把所有缺陷都“教进”回声七号体内，包括每天变化的事实与不能违反的权限规章。第 07 案已登记：模仿学校。</p></div>
    ${window.EchoFeedback.renderCompletion("06")}
    <div class="term-map">
      <div class="term-row"><span class="plain">评整套考试，不只评答题者</span><span class="arrow">→</span><div><b>Agent System Evaluation</b><small>评估对象是模型与 Harness 的完整系统，环境、任务、工具、评分规尺和执行协议都会改变结果。</small></div></div>
      <div class="term-row"><span class="plain">机器终态先于自评和文风</span><span class="arrow">→</span><div><b>验证优先级与轨迹—结果双检</b><small>环境终态和确定性测试优先；过程规则与安全否决随后；开放质量再交给校准后的 Rubric 或评判模型。</small></div></div>
      <div class="term-row"><span class="plain">把真实失败变成封存新题</span><span class="arrow">→</span><div><b>Benchmark、Rubric 与回归集</b><small>评估集覆盖真实分布、边界和不可完成任务；Rubric 自包含、可操作、按重要性加权，严重风险一票否决。</small></div></div>
      <div class="term-row"><span class="plain">同题多跑，小分差先当噪声</span><span class="arrow">→</span><div><b>配对评估、Pass@k、Pass^k 与统计决策</b><small>同一任务和环境下比较版本并重复运行。探索关心是否至少成功一次，稳定放行更关心能否连续成功；差距小于波动时不换版。</small></div></div>
      <div class="term-row"><span class="plain">赢了也要问代价和副作用</span><span class="arrow">→</span><div><b>目标指标与护栏指标</b><small>成功率之外同时检查安全、成本、延迟和旧能力；不是所有有效改动都值得部署。</small></div></div>
      <div class="formula"><b>本案复验式：</b>固定环境与任务 → 同题配对复跑 → 环境终态 → 轨迹与否决项 → 校准 Rubric → 波动、成本与延迟 → 换版 / 保留<br><small>评估不是一次排名，而是把观察、假设、实验和验证接成可以重复的工程过程。</small></div>
      <div class="action-row"><a class="action-btn primary" href="case07.html?from=case06">查封模仿学校：进入下一案 →</a><a class="action-btn" href="cases.html">返回案件目录</a><a class="action-btn" href="index.html">返回主页</a><button class="action-btn" id="open-final-archive">收入回声档案</button><button class="action-btn" data-close-modal>返回复验庭</button></div>
    </div>`);
  $("#open-final-archive").addEventListener("click", openArchive);
  $$('[data-close-modal]', modalContent).forEach((button) => button.addEventListener("click", closeModal));
}

function openArchive() {
  closeModal();
  openModal(window.EchoArchive.render("06"));
  $("#reset-case")?.addEventListener("click", () => {
    if (confirm("确定清空案件 06 的进度并重新调查吗？")) {
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
  if (!hasEvidence("score")) hint = "满分自评台上，出题、演示和评分都来自同一份成功材料。";
  else if (!hasEvidence("replay")) hint = "现实回放幕记录的是机器真正变成了什么，不是它怎样解释自己。";
  else if (!hasDeduction("independent")) hint = "打开证物台，把自己盖章的满分纸与三台机器每次停下的位置放在一起。";
  else if (!hasEvidence("benchmark")) hint = "旧题封存柜需要一摞谁也没提前看过、既有日常活也有难题和办不到差事的试卷。";
  else if (!hasEvidence("rubric")) hint = "评分规尺既要写清怎样得分，也要写清出现什么风险就直接否决。";
  else if (!hasEvidence("yun")) hint = "去独立复核席问云：新机只赢一回、只多几分，够不够打开出厂门。";
  else if (!hasDeduction("decision")) hint = "打开证物台，把陌生试卷、铜规尺和云的遮牌试车法放在一起。";
  else if (!state.finalSolved) hint = "盖章前要先锁试卷，再遮牌试车、看机器、查路线、量表现，最后才决定换不换。";
  else hint = "本案已结。三次真实失败已经抄成封存新卷，以后的新机都必须重新答一遍。";
  toast(hint, 4700);
}

$("#start-btn").addEventListener("click", startGame);
$("#cover-archive-btn").addEventListener("click", () => { cover.classList.add("hidden"); app.classList.remove("hidden"); state.started = true; saveState(); openArchive(); });
$("#archive-btn").addEventListener("click", openArchive);
$("#evidence-btn").addEventListener("click", openEvidenceBoard);
$("#hint-btn").addEventListener("click", showHint);
$$('[data-close-modal]').forEach((element) => element.addEventListener("click", closeModal));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeModal(); dialogue.classList.add("hidden"); } });

const hotspotActions = { score: investigateScore, replay: investigateReplay, benchmark: investigateBenchmark, rubric: investigateRubric, yun: talkToYun, gate: investigateGate };
$$('[data-hotspot]').forEach((button) => button.addEventListener("click", () => hotspotActions[button.dataset.hotspot]()));

const continuingFromCase05 = new URLSearchParams(window.location.search).get("from") === "case05";
if (state.started || continuingFromCase05) { cover.classList.add("hidden"); app.classList.remove("hidden"); }
if (continuingFromCase05) {
  state.started = true;
  saveState();
  if (!state.bridgeSeen) showBridgeFromCase05();
  else if (!state.introSeen) showIntro();
} else updateUI();
