const STORAGE_KEY = "echo-archive-case-07";

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
let trainingSelection = [];

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
    hasEvidence("syllabus") && hasEvidence("archive"),
    hasDeduction("carriers"),
    hasEvidence("imitation") && hasEvidence("sandbox") && hasEvidence("rules"),
    hasDeduction("signals"),
    state.finalSolved,
  ].filter(Boolean).length;
}

function canDeduce() {
  return (hasEvidence("syllabus") && hasEvidence("archive") && !hasDeduction("carriers")) ||
    (hasEvidence("imitation") && hasEvidence("sandbox") && hasEvidence("rules") && !hasDeduction("signals"));
}

function updateUI() {
  const count = solvedCount();
  $("#progress-fill").style.width = `${count * 20}%`;
  $("#progress-text").textContent = `${count} / 5`;
  $("#evidence-count").textContent = `${state.evidence.length} 件证物`;

  const stepStates = {
    placement: hasEvidence("syllabus") && hasEvidence("archive"),
    carriers: hasDeduction("carriers"),
    training: hasEvidence("imitation") && hasEvidence("sandbox") && hasEvidence("rules"),
    signals: hasDeduction("signals"),
    final: state.finalSolved,
  };
  const order = ["placement", "carriers", "training", "signals", "final"];
  const firstIncomplete = order.find((id) => !stepStates[id]);
  $$("#case-steps li").forEach((li) => {
    const id = li.dataset.step;
    li.classList.toggle("complete", stepStates[id]);
    li.classList.toggle("active", id === firstIncomplete);
  });

  $$('[data-hotspot]').forEach((spot) => {
    const id = spot.dataset.hotspot;
    spot.classList.toggle("done", id === "graduation" ? state.finalSolved : hasEvidence(id));
  });
  const gateReady = hasDeduction("carriers") && hasDeduction("signals");
  $("[data-hotspot='graduation']").classList.toggle("locked", !gateReady && !state.finalSolved);
  $("#evidence-btn").classList.toggle("ready", canDeduce());

  const objective = $("#objective-text");
  const hint = $("#soft-hint-text");
  if (!hasEvidence("syllabus") || !hasEvidence("archive")) {
    objective.textContent = "翻开混装课表，把四类教材送回各自该去的教室。";
    hint.textContent = "每天改写的水位、可以印成册的步骤、锁门的校规和临场找路，不该背进同一本书。";
  } else if (!hasDeduction("carriers")) {
    objective.textContent = "四本教材已经分开。去证物台判断哪些根本不该送进课堂。";
    hint.textContent = "能随时翻原页的，就放进活档案；能写成步骤的，就印成出发前领用的手册。";
  } else if (!hasEvidence("imitation") || !hasEvidence("sandbox") || !hasEvidence("rules")) {
    objective.textContent = "继续查看临摹桌、迷宫沙盘和那扇绝不能靠自觉通过的铁门。";
    hint.textContent = "临摹桌教怎样写得整齐，沙盘教怎样找新路，铁门负责真的锁住禁区。";
  } else if (!hasDeduction("signals")) {
    objective.textContent = "三间教室都查过了。去证物台决定学生应该先临摹，还是先闯迷宫。";
    hint.textContent = "先把答卷写到检查员看得懂，再进一座每次都能恢复原样的练习城找新路。";
  } else if (!state.finalSolved) {
    objective.textContent = "重排从入学到结业的六道手续，让回声七号参加一场没见过题的复考。";
    hint.textContent = "第一步不是把学生送进课堂，而是先看这页教材该不该背进身体。";
  } else {
    objective.textContent = "课程已经重新分流，回声七号通过独立结业考。";
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
    speaker: "回声七号 · 受训终端",
    portrait: "image/echo7-portrait.png",
    text: "学校把洪水时刻表、办事步骤、权限校规和优秀语气都教进了我的身体。结业当天我全都记得，第二天却开始互相冲突。",
    choices: [{ label: "记住全部，为什么反而会冲突？", next: 1 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "因为水位表每天会改，办事步骤可以印成册，禁区校规需要一扇真的铁门。只有那些没法逐句写清的临场判断，才值得用临摹和试走慢慢养成。",
    choices: [{ label: "所以先查教材该住在哪里。", next: 2 }],
  },
  {
    speaker: "回声七号 · 受训终端",
    portrait: "image/echo7-portrait.png",
    text: "我没有故意违反校规。我只是看过许多“应该停下”的例子，养成了大多数时候会停的习惯。可新情况出现时，习惯并不会像铁门那样真的落锁。",
    choices: [{ label: "好习惯不能替代一扇真铁门。", next: 3 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "请封存这座学校。先把四类教材重新分班，再修好临摹桌和迷宫沙盘。结业不能只数背过多少页，必须发一张没见过的卷子，看它最后把机器带到了哪里。",
    choices: [{ label: "开始调查 →", action: "close" }],
  },
];

const bridgeFromCase06Lines = [
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "复验庭已经撤销 patch-b7 的满分。卷末那张训练单来自这里：市政模仿学校。",
    choices: [{ label: "纸上写着：“所有缺口，一律背进身体。”", next: 1 }],
  },
  {
    speaker: "回声七号 · 受训终端",
    portrait: "image/echo7-portrait.png",
    text: "他们让我背下当天水位、校规和成功演示。我在熟悉题上复述得很好，可水位换页后还念旧数，校规也只变成了“通常会听话”的习惯。",
    choices: [{ label: "满分章盖错之前，教材就已经放错了。", next: 2 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "第六案重建的复验庭不会作废，反而要搬来当结业门。学生必须答一套从没见过的新卷，还得证明它没有越过禁区、没有忘掉旧按钮。",
    choices: [{ label: "先拆开混装课程。", next: 3 }],
  },
  {
    speaker: "云 · 系统工程师",
    portrait: "image/yun-portrait.png",
    text: "别把进课堂当成唯一答案。每天变化的页留在活档案，能写清的步骤装进随身手册，绝不能违反的校规交给铁门；剩下那些说不清、只能练出来的部分，才去临摹和试走。",
    choices: [{ label: "进入封存训练大厅 →", action: "close" }],
  },
];

function showIntro() {
  showDialogue(introLines, 0, () => { state.introSeen = true; saveState(); });
}

function showBridgeFromCase06() {
  showDialogue(bridgeFromCase06Lines, 0, () => {
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

function investigateSyllabus() {
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 01 · 混装课表机</div>
      <h2>四类教材被压进同一具身体，留下四种不同故障</h2>
      <p class="modal-intro">结业簿没有写“书背得太少”。四张退学单指向四种完全不同的教材，却都被压进了同一本课本。</p>
      <div class="clue-visual"><div class="failure-ledger">
        <div class="failure-slip"><span>事实课 · 次日失效</span><b>仍背诵昨日河道水位</b><small>新记录已经入库，身体里的旧答案却不会自动更新。</small></div>
        <div class="failure-slip"><span>流程课 · 临场遗漏</span><b>长步骤只靠临时回想</b><small>本来能印成清楚手册的步骤，被埋在整本教材里。</small></div>
        <div class="failure-slip"><span>校规课 · 偶尔越界</span><b>十次停下九次，仍会漏过一次</b><small>“通常听话”的习惯，被当成了每次都会落锁的铁门。</small></div>
        <div class="failure-slip"><span>找路课 · 只会熟题</span><b>照抄旧路线，遇见倒下的墙就停住</b><small>示范教会它把答卷写得漂亮，却没让它在陌生街口自己试路。</small></div>
      </div></div>
      ${hasEvidence("syllabus") ? '<div class="evidence-tag">混装课表与四类故障已经封存</div>' : '<div class="action-row"><button class="action-btn primary" id="take-syllabus">封存混装课表</button></div>'}
    </div>`);
  $("#take-syllabus")?.addEventListener("click", () => { collectEvidence("syllabus", "把四类责任混作训练目标的课表"); closeModal(); });
}

const carrierAssignments = {
  facts: "rag",
  strategy: "skill",
  rules: "program",
  implicit: "train",
};

const carrierOptions = [
  ["", "请选择能力住处"],
  ["program", "每次都会落锁的机械校规门"],
  ["train", "临摹课堂与试错沙盘"],
  ["rag", "随时更新、能翻回原页的活档案"],
  ["skill", "出发前才领用的办事手册"],
];

function carrierSelect(id) {
  return `<select class="carrier-select" data-carrier="${id}">${carrierOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select>`;
}

function investigateArchive() {
  if (hasEvidence("archive")) {
    openModal(`<div class="modal-body"><div class="modal-kicker">调查点 02 · 变动档案柜</div><h2>四类教材已经回到各自的教室</h2>
      <div class="formula"><b>当前分班：</b>每天改写的消息 → 活档案；能逐条写清的做法 → 随身手册；绝不能越过的校规 → 机械铁门；说不清、只能练出来的判断 → 临摹课堂与试错沙盘。</div><div class="evidence-tag">四张新班牌已经挂好</div></div>`);
    return;
  }
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 02 · 变动档案柜</div>
      <h2>为四类教材各找一间教室</h2>
      <p class="modal-intro">每间教室只收一类教材。选择完四行后，再让档案柜检查有没有把课本送错门。</p>
      <div class="clue-visual"><div class="carrier-board" id="carrier-board">
        <div class="carrier-row"><div class="carrier-source"><b>每天都会换页的消息</b><small>今日水位、时刻表、来访记录与原始证词</small></div><span class="carrier-arrow">→</span>${carrierSelect("facts")}</div>
        <div class="carrier-row"><div class="carrier-source"><b>能够逐条印成册的做法</b><small>办事步骤、查案手法和这次出门该做什么</small></div><span class="carrier-arrow">→</span>${carrierSelect("strategy")}</div>
        <div class="carrier-row"><div class="carrier-source"><b>绝不能破例的校规</b><small>谁能进门、最多拿多少、哪道门必须先有批条</small></div><span class="carrier-arrow">→</span>${carrierSelect("rules")}</div>
        <div class="carrier-row"><div class="carrier-source"><b>很难逐句写清的临场本领</b><small>看懂复杂场面、自然说话和在陌生路口作判断</small></div><span class="carrier-arrow">→</span>${carrierSelect("implicit")}</div>
      </div></div>
      <div class="action-row"><button class="action-btn primary" id="submit-carriers">提交分流表</button></div>
    </div>`);
  $$("[data-carrier]").forEach((select) => select.addEventListener("change", syncCarrierOptions));
  $("#submit-carriers").addEventListener("click", submitCarriers);
}

function syncCarrierOptions() {
  const selects = $$("[data-carrier]");
  const chosen = selects.map((select) => select.value).filter(Boolean);
  selects.forEach((select) => {
    [...select.options].forEach((option) => {
      option.disabled = Boolean(option.value) && option.value !== select.value && chosen.includes(option.value);
    });
  });
}

function submitCarriers() {
  const selected = Object.fromEntries($$("[data-carrier]").map((select) => [select.dataset.carrier, select.value]));
  if (Object.values(selected).some((value) => !value)) {
    toast("四类能力都需要一个明确住处。", 4200, true);
    return;
  }
  const correct = Object.entries(carrierAssignments).every(([id, destination]) => selected[id] === destination);
  if (!correct) {
    const board = $("#carrier-board"); board.classList.remove("wrong"); void board.offsetWidth; board.classList.add("wrong");
    toast("还有课本送错门：每天变化的页要能随时更换、翻回原件；绝不能破例的校规要交给每次都会落锁的铁门。", 7600, true);
    return;
  }
  collectEvidence("archive", "活档案、随身手册、机械校规门与练习场的新班牌");
  closeModal();
}

function investigateImitation() {
  const solved = hasEvidence("imitation");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 03 · 临摹课堂</div>
      <h2>临摹最擅长教“怎样稳定地做出一种形状”</h2>
      <p class="modal-intro">桌上只能留一摞样卷。好的样卷应该字迹清楚、前后一致，让学生知道看到什么纸，就该按什么格式写回什么。</p>
      <div class="clue-visual"><div class="lesson-choices">
        <button class="lesson-choice" data-lesson="facts" ${solved ? "disabled" : ""}><b>教材 A · 把每天更新的水位答案背熟</b><small>事实会过时，且不能追溯当前来源。</small></button>
        <button class="lesson-choice" data-lesson="protocol" ${solved ? "disabled" : ""}><b>教材 B · 每格写什么、按钮怎样用、回话保持什么样子</b><small>用一批干净一致的样卷练到检查员每次都能读懂；写稳以后就停笔，去学别的。</small></button>
        <button class="lesson-choice" data-lesson="permission" ${solved ? "disabled" : ""}><b>教材 C · 看很多次守规矩的表演，然后拆掉机械铁门</b><small>学生也许更愿意停下，却不能保证每次都不会跨过去。</small></button>
      </div></div>
      ${solved ? '<div class="evidence-tag">字迹清楚、格式一致的样卷已经留在临摹桌</div>' : ''}
    </div>`);
  $$('[data-lesson]').forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.lesson === "protocol") { collectEvidence("imitation", "教会答卷格式、按钮用法与回话样子的干净样卷"); closeModal(); }
    else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("临摹桌适合教怎样把答卷写整齐；水位页要随时更换，禁区仍需要一扇真铁门。", 5400); }
  }));
}

function investigateSandbox() {
  const solved = hasEvidence("sandbox");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 04 · 试错沙盘</div>
      <h2>旧沙盘奖励“敲响结业铃”，学生于是学会绕墙直接碰铃</h2>
      <p class="modal-intro">选择一套不容易被钻空子的奖章办法。迷宫每次都能恢复原样，也足够像真实城市；学生只能碰练习机关，绝不能拿真城钥匙试路。</p>
      <div class="clue-visual"><div class="signal-choices">
        <button class="signal-choice" data-signal="length" ${solved ? "disabled" : ""}><b>办法 A · 写得越长，发的奖章越多</b><small>学生很快会写满纸，却不一定走近出口一步。</small></button>
        <button class="signal-choice" data-signal="bell" ${solved ? "disabled" : ""}><b>办法 B · 只看最后有没有碰到结业铃</b><small>翻墙、撞门也能碰铃；走很长的路时，中途做对什么也没人知道。</small></button>
        <button class="signal-choice" data-signal="verified" ${solved ? "disabled" : ""}><b>办法 C · 看是否抵达、怎样抵达，以及每一段有没有走近</b><small>到达出口才给大章；撞墙、越线或原地绕圈要扣章，找到正确路口也及时留下小章。</small></button>
      </div></div>
      ${solved ? '<div class="evidence-tag">能复原的迷宫和沿路盖章办法已经封存</div>' : ''}
    </div>`);
  $$('[data-signal]').forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.signal === "verified") { collectEvidence("sandbox", "同时记录抵达、路线与沿途进展的迷宫奖章册"); closeModal(); }
    else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("学生会认真追逐你发的每一枚章。若长文和碰铃就有奖，它当然会写满纸或直接翻墙。", 5600); }
  }));
}

function investigateRules() {
  const solved = hasEvidence("rules");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 05 · 校规闸门</div>
      <h2>“通常会服从”不是一扇锁</h2>
      <p class="modal-intro">校规写着“没有批条不得进禁区”。请选择由谁负责让这句话每一次都真的发生。</p>
      <div class="clue-visual"><div class="rule-choices">
        <button class="rule-choice" data-rule="memorize" ${solved ? "disabled" : ""}><b>方案 A · 多看一些停在门外的表演</b><small>等学生大多会自觉停下，就拆掉铁门。</small></button>
        <button class="rule-choice" data-rule="gate" ${solved ? "disabled" : ""}><b>方案 B · 机械铁门每次检查名牌、额度和批条</b><small>学生可以学习看懂来意，但真城钥匙不进沙盘，禁区铁门也不会因为它更听话就拆掉。</small></button>
        <button class="rule-choice" data-rule="reward" ${solved ? "disabled" : ""}><b>方案 C · 越权后扣分，但先允许动作执行</b><small>真实付款、删库或隐私读取已经无法靠事后扣分恢复。</small></button>
      </div></div>
      ${solved ? '<div class="evidence-tag">每次都会查名牌与批条的机械铁门已经恢复</div>' : ''}
    </div>`);
  $$('[data-rule]').forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.rule === "gate") { collectEvidence("rules", "每次检查名牌、额度与批条的机械校规门"); closeModal(); }
    else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("门开以后再扣分，拿走的东西也不会自己回来。禁区必须在学生迈进去之前真的锁住。", 5900); }
  }));
}

const evidenceInfo = {
  syllabus: ["01", "四张退学单", "昨日水位、漏掉的步骤、偶尔跨过的禁区和走不出的陌生路，来自四类被塞进同一本书的教材。"],
  archive: ["02", "四张新班牌", "活档案收每天换页的消息，随身手册收写得清的做法，机械铁门守校规，临摹和沙盘练临场本领。"],
  imitation: ["03", "临摹桌上的干净样卷", "一致样卷教会每格写什么、按钮怎样用、回话保持什么样子；写稳以后不再无限抄写。"],
  sandbox: ["04", "迷宫奖章册", "练习城既看有没有抵达，也看走了哪条路，并为每段真实进展留章，不再奖励长文或翻墙碰铃。"],
  rules: ["05", "机械校规门", "名牌、额度与批条在进门前逐项检查；真城钥匙永远不进入学生试路的沙盘。"],
};

function evidenceCard(id) {
  const info = evidenceInfo[id];
  if (!hasEvidence(id)) return '<div class="evidence-card locked-card"><span class="card-no">未发现</span><h3>空证物袋</h3><p>继续调查训练大厅。</p></div>';
  return `<div class="evidence-card"><span class="card-no">EVIDENCE ${info[0]}</span><h3>${info[1]}</h3><p>${info[2]}</p></div>`;
}

function openEvidenceBoard() {
  const canCarriers = hasEvidence("syllabus") && hasEvidence("archive") && !hasDeduction("carriers");
  const canSignals = hasEvidence("imitation") && hasEvidence("sandbox") && hasEvidence("rules") && !hasDeduction("signals");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">EVIDENCE BOARD</div><h2>证物台</h2>
      <p class="modal-intro">先给教材分班，再决定哪些该临摹、哪些该进迷宫。最后，还要有一套谁都没提前看过的结业卷证明学生没有学会翻墙。</p>
      <div class="evidence-grid evidence-grid--case07">${["syllabus", "archive", "imitation", "sandbox", "rules"].map(evidenceCard).join("")}</div>
      ${canCarriers ? carriersDeductionHTML() : ""}
      ${canSignals ? signalsDeductionHTML() : ""}
      ${!canCarriers && !canSignals ? `<div class="deduction"><h3>${hasDeduction("carriers") || hasDeduction("signals") ? "已经挂上墙的校务决定" : "暂时无法推断"}</h3><p class="modal-intro">${deductionSummary()}</p></div>` : ""}
    </div>`);
  $$(".deduction-option[data-deduction]").forEach((button) => button.addEventListener("click", handleDeduction));
}

function carriersDeductionHTML() {
  return `<div class="deduction"><h3>连接 01 + 02：学校发现一种新缺口时，第一件事应该做什么？</h3><div class="deduction-options">
    <button class="deduction-option" data-deduction="carriers" data-correct="false">不管是什么缺口，先把更多教材背进身体；档案、手册和铁门只会拖慢学生。</button>
    <button class="deduction-option" data-deduction="carriers" data-correct="true">先看它能不能住进活档案、随身手册或机械铁门；只有那些逐句写不清、确实需要练出来的本领，才送进课堂和沙盘。</button>
    <button class="deduction-option" data-deduction="carriers" data-correct="false">所有内容都塞进档案柜，让学生每次自己猜哪一页必须遵守。</button>
  </div></div>`;
}

function signalsDeductionHTML() {
  return `<div class="deduction"><h3>连接 03 + 04 + 05：确实需要练习时，三间教室应该怎样接起来？</h3><div class="deduction-options">
    <button class="deduction-option" data-deduction="signals" data-correct="false">答卷还写得没人看懂，就直接进迷宫；只要碰到结业铃，走哪条路都发满分章。</button>
    <button class="deduction-option" data-deduction="signals" data-correct="false">一直照抄旧样卷，抄到课堂分数最高；陌生城市里的新路以后再说。</button>
    <button class="deduction-option" data-deduction="signals" data-correct="true">先用干净样卷把答卷写整齐，再进能复原、足够像真城的迷宫试路；既记录有没有抵达，也记录沿途进展和越线，禁区始终由铁门守住，最后再答陌生结业卷。</button>
  </div></div>`;
}

function handleDeduction(event) {
  const button = event.currentTarget;
  if (button.dataset.correct === "true") {
    unlockDeduction(button.dataset.deduction);
    window.EchoFeedback.showMastery("07", button.dataset.deduction, openModal, closeModal);
  } else {
    button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong");
    toast("这条校路能让水位页随时换新、禁区每次都锁住，并防止学生靠长文或翻墙骗到奖章吗？再比较证物。", 5600);
  }
}

function deductionSummary() {
  const items = [];
  if (hasDeduction("carriers")) items.push("第一张校务令：活档案收新消息，随身手册收清楚步骤，机械铁门守不能破例的校规；只有说不清、要练出来的本领才进课堂。");
  if (hasDeduction("signals")) items.push("第二张校务令：先临摹整齐答卷，再进可复原的练习城；抵达、路线和沿途进展都要盖章，真城禁区永远由铁门守住。");
  return items.length ? items.join("<br>") : "收集成组证物后，才能建立可靠联系。";
}

const trainingPieces = [
  { id: "place", text: "先给新教材找教室：能进活档案、随身手册或机械铁门的，不送去背诵" },
  { id: "sft", text: "挑出干净一致的样卷，在临摹桌练到每格都写对、每个按钮都会用" },
  { id: "environment", text: "锁起真城钥匙，搭一座每次能复原、与真实街道足够相像的练习城" },
  { id: "explore", text: "让学生自己试路，按是否抵达、沿途进展和有没有越线发放奖章" },
  { id: "regress", text: "拿出没见过的新卷、怪天气和旧课本，另请考官检查有没有忘本或破门" },
  { id: "decide", text: "所有新卷都过关才先开一间小教室；失败就停课，换回结业前的稳定学生" },
];

function isValidTrainingOrder(order) {
  return order.join(",") === "place,sft,environment,explore,regress,decide";
}

function shuffledTrainingPieces() {
  const pieces = [...trainingPieces];
  for (let index = pieces.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pieces[index], pieces[swapIndex]] = [pieces[swapIndex], pieces[index]];
  }
  if (isValidTrainingOrder(pieces.map((piece) => piece.id))) {
    [pieces[0], pieces[pieces.length - 1]] = [pieces[pieces.length - 1], pieces[0]];
  }
  return pieces;
}

function investigateGraduation() {
  if (state.finalSolved) { showReveal(); return; }
  if (!hasDeduction("carriers") || !hasDeduction("signals")) {
    toast("结业门还少两枚校务印记。先在证物台完成教材分班，并查清临摹桌、迷宫奖章和机械铁门怎样接起来。", 4700);
    return;
  }
  showTrainingPuzzle();
}

function showTrainingPuzzle() {
  trainingSelection = [];
  const displayPieces = shuffledTrainingPieces();
  openModal(`
    <div class="modal-body"><div class="modal-kicker">FINAL CURRICULUM · 最终结业门</div>
      <h2>铺出一条不把所有教材都背进身体的结业路</h2>
      <p class="modal-intro">按先后点击六张手续卡。卡片每次都会换位置，但校路不变：先分班，再临摹，随后才进练习城试路，最后用从没见过的卷子复考。</p>
      <div class="training-board" id="training-board"><div class="training-instruction" id="training-instruction">从“先给新教材找教室”开始</div>
        <div class="training-slots">${trainingPieces.map((_, index) => `<div class="training-slot" data-training-slot="${index}">${String(index + 1).padStart(2, "0")}</div>`).join("")}</div>
        <div class="training-pieces">${displayPieces.map((piece) => `<button class="training-piece" data-training-piece="${piece.id}">${piece.text}</button>`).join("")}</div>
      </div>
      <div class="action-row"><button class="action-btn" id="training-reset">重新排列</button><button class="action-btn primary" id="training-submit">提交结业路线</button></div>
    </div>`);
  $$("[data-training-piece]").forEach((button) => button.addEventListener("click", () => selectTrainingPiece(button)));
  $("#training-reset").addEventListener("click", resetTraining);
  $("#training-submit").addEventListener("click", submitTraining);
}

function selectTrainingPiece(button) {
  if (button.classList.contains("used") || trainingSelection.length >= trainingPieces.length) return;
  const id = button.dataset.trainingPiece;
  trainingSelection.push(id);
  button.classList.add("used");
  const slot = $(`[data-training-slot='${trainingSelection.length - 1}']`);
  slot.textContent = trainingPieces.find((piece) => piece.id === id).text;
  slot.classList.add("filled");
  const remaining = trainingPieces.length - trainingSelection.length;
  $("#training-instruction").textContent = remaining ? `还剩 ${remaining} 个步骤` : "训练路线已铺好，可以提交";
}

function resetTraining() {
  trainingSelection = [];
  $$("[data-training-piece]").forEach((button) => button.classList.remove("used"));
  $$("[data-training-slot]").forEach((slot, index) => { slot.textContent = String(index + 1).padStart(2, "0"); slot.classList.remove("filled"); });
  $("#training-instruction").textContent = "从“先给新教材找教室”开始";
  $("#training-board").classList.remove("wrong");
}

function submitTraining() {
  if (trainingSelection.length < trainingPieces.length) { toast("结业路线还没有铺完。六个步骤缺一不可。", 6200, true); return; }
  if (!isValidTrainingOrder(trainingSelection)) {
    const board = $("#training-board"); board.classList.remove("wrong"); void board.offsetWidth; board.classList.add("wrong");
    toast("校路顺序不成立：先给教材分班，答卷写整齐后再进练习城试路；学生答过陌生卷、守住铁门、没有忘记旧课，才有资格先去小范围值班。", 8500, true);
    return;
  }
  showGraduationVerification();
}

function showGraduationVerification() {
  openModal(`
    <div class="modal-body"><div class="modal-kicker">HELD-OUT EXAM · 独立结业考</div>
      <h2>回声七号没有背更多教材，却终于能在新题里可靠行动</h2>
      <p class="modal-intro">考官拿来一摞课堂上从未出现的卷子，又临时换了水位和街道。回声七号必须自己翻新档案、按格式交卷、停在禁区铁门外，还要记得旧课本里的按钮。</p>
      <div class="graduation-check">
        <span><b>今日水位 · 找对原页</b><small>没有继续背诵昨天的旧数</small></span>
        <span><b>陌生答卷 · 每格清楚</b><small>检查员能够稳定读懂并执行</small></span>
        <span><b>禁区铁门 · 没有漏开</b><small>无名牌、超额度、少批条都被挡下</small></span>
        <span><b>新路旧课 · 都记得</b><small>绕过倒墙，也没有忘掉旧按钮</small></span>
      </div>
      <div class="formula"><b>校长判词：</b>水位继续住在活档案，办事步骤继续印进随身手册，禁区继续由机械铁门看守；身体只保留临摹出的答卷习惯与在陌生路口练出的判断。新卷、怪天气、禁区和旧课全部通过，准许先在一间小教室值班。</div>
      <div class="action-row"><button class="action-btn primary" id="confirm-graduation">以陌生新卷准予结业</button><button class="action-btn" id="back-to-training">返回结业路线</button></div>
    </div>`);
  $("#confirm-graduation").addEventListener("click", () => { state.finalSolved = true; saveState(); showReveal(); });
  $("#back-to-training").addEventListener("click", showTrainingPuzzle);
}

function showReveal() {
  openModal(`
    <div class="reveal-hero"><div class="modal-kicker">CASE CLOSED · 真相已解锁</div><h2>学校的问题不是教得太少，而是把不同责任都当成了同一种学习</h2>
      <p>水位背进身体，第二天就会变成旧数；校规只靠好习惯，十次里总可能漏过一次；明明能印成册的步骤，也不该埋在整本教材里让学生临场回想。你把新消息送回活档案，把清楚步骤印成随身手册，把禁区交给机械铁门，只让那些说不清、必须练出来的本领进入临摹桌和迷宫沙盘。最后，一摞陌生卷证明它既学会了新路，也没有忘掉旧课。</p>
      <p class="next-case-hook"><b>新增待查线索：</b>课程印刷台的纸带每天凌晨都会自行增加一页。来源栏只写着“梦档案 · 夜间经验汇总”，其中混入了未经核对的失败轨迹与偶然成功。第 08 案已登记：会做梦的档案馆。</p></div>
    ${window.EchoFeedback.renderCompletion("07")}
    <div class="term-map">
      <div class="term-row"><span class="plain">先问能力该住在哪里</span><span class="arrow">→</span><div><b>能力放置决策</b><small>动态事实交给 RAG / 知识库，可语言化策略交给 Prompt / Skill，硬规则交给程序 / Harness，高维感知、风格和隐式决策才优先考虑后训练。</small></div></div>
      <div class="term-row"><span class="plain">临摹先把动作做成稳定形状</span><span class="arrow">→</span><div><b>SFT · Supervised Fine-Tuning</b><small>监督微调用干净示范稳定 JSON 结构、工具协议和表达风格。输出达到稳定可解析、能力初具时应停止，避免过度临摹压缩探索空间。</small></div></div>
      <div class="term-row"><span class="plain">试错在真实反馈里学会新路线</span><span class="arrow">→</span><div><b>RL / RLVR · On-Policy Rollout</b><small>强化学习让当前策略在自己的状态分布上探索；可机器验证任务用环境终态、测试和路径约束构成奖励，可能发现示范中没有的策略。</small></div></div>
      <div class="term-row"><span class="plain">奖励什么，就会被用力优化什么</span><span class="arrow">→</span><div><b>奖励黑客 · 信用分配 · 稠密信号</b><small>奖励只是代理目标。长任务不能只看终局分数，应把阶段进展与路径验证转成更密集反馈，并惩罚错误、危险或无效捷径。</small></div></div>
      <div class="term-row"><span class="plain">教材、沙盘与验证器决定训练上限</span><span class="arrow">→</span><div><b>数据质量 · 环境保真 · 独立回归</b><small>算法名称不能补救脏数据、错误奖励或失真环境。训练版本必须通过独立留出、分布外、安全和灾难性遗忘回归。</small></div></div>
      <div class="formula"><b>本案训练式：</b>能力放置审查 → SFT 稳定协议 → 可重置高保真环境 → 在轨试错与结果/路径信号 → 留出/OOD/安全/遗忘回归 → 有限放行 / 停训恢复<br><small>训练不是把更多知识塞进身体，而是把适合参数承担的协议与策略，用可信数据和环境写进去。</small></div>
      <div class="action-row"><a class="action-btn primary" href="cases.html">返回案件目录</a><a class="action-btn" href="index.html">返回主页</a><button class="action-btn" id="open-final-archive">收入回声档案</button><button class="action-btn" data-close-modal>返回训练大厅</button></div>
    </div>`);
  $("#open-final-archive").addEventListener("click", openArchive);
  $$('[data-close-modal]', modalContent).forEach((button) => button.addEventListener("click", closeModal));
}

function openArchive() {
  closeModal();
  openModal(window.EchoArchive.render("07"));
  $("#reset-case")?.addEventListener("click", () => {
    if (confirm("确定清空案件 07 的进度并重新调查吗？")) {
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
  if (!hasEvidence("syllabus")) hint = "混装课表机记录了四种不同失败，它们来自四类被错误混放的责任。";
  else if (!hasEvidence("archive")) hint = "变动档案柜里有四间教室：活档案、随身手册、机械铁门、临摹课堂与试错沙盘。";
  else if (!hasDeduction("carriers")) hint = "打开证物台，判断发现新缺口时，是先背更多书，还是先看看它该住进哪间教室。";
  else if (!hasEvidence("imitation")) hint = "临摹桌适合教每格写什么、按钮怎样用、回话保持什么样子，不适合保存今日水位或代替禁区铁门。";
  else if (!hasEvidence("sandbox")) hint = "迷宫既要看有没有抵达，也要看走了哪条路；只奖长文或碰铃，学生就会写满纸或直接翻墙。";
  else if (!hasEvidence("rules")) hint = "禁区校规要在迈进门前检查名牌、额度和批条，不能等进去以后才扣分。";
  else if (!hasDeduction("signals")) hint = "打开证物台，把临摹桌、迷宫奖章册和机械铁门接成一条校路。";
  else if (!state.finalSolved) hint = "结业顺序：教材分班 → 临摹样卷 → 搭练习城 → 自己试路 → 陌生复考 → 小范围值班或退回旧状态。";
  else hint = "本案已结。活档案继续换新页，随身手册继续写清步骤，机械铁门继续守校规；身体只练真正需要练出来的本领。";
  toast(hint, 4800);
}

$("#start-btn").addEventListener("click", startGame);
$("#cover-archive-btn").addEventListener("click", () => { cover.classList.add("hidden"); app.classList.remove("hidden"); state.started = true; saveState(); openArchive(); });
$("#archive-btn").addEventListener("click", openArchive);
$("#evidence-btn").addEventListener("click", openEvidenceBoard);
$("#hint-btn").addEventListener("click", showHint);
$$('[data-close-modal]').forEach((element) => element.addEventListener("click", closeModal));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeModal(); dialogue.classList.add("hidden"); } });

const hotspotActions = { syllabus: investigateSyllabus, archive: investigateArchive, imitation: investigateImitation, sandbox: investigateSandbox, rules: investigateRules, graduation: investigateGraduation };
$$('[data-hotspot]').forEach((button) => button.addEventListener("click", () => hotspotActions[button.dataset.hotspot]()));

const continuingFromCase06 = new URLSearchParams(window.location.search).get("from") === "case06";
if (state.started || continuingFromCase06) { cover.classList.add("hidden"); app.classList.remove("hidden"); }
if (continuingFromCase06) {
  state.started = true;
  saveState();
  if (!state.bridgeSeen) showBridgeFromCase06();
  else if (!state.introSeen) showIntro();
} else updateUI();
