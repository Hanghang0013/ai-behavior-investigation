const STORAGE_KEY = "echo-archive-case-08";
const SAVE_VERSION = 1;

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
let releaseSelection = [];

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
      saveVersion: SAVE_VERSION,
      evidence: Array.isArray(parsed.evidence) ? [...new Set(parsed.evidence.filter((id) => typeof id === "string"))] : [],
      deductions: Array.isArray(parsed.deductions) ? [...new Set(parsed.deductions.filter((id) => typeof id === "string"))] : [],
    };
  } catch {
    return { ...initialState, evidence: [], deductions: [] };
  }
}

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); updateUI(); }
function hasEvidence(id) { return state.evidence.includes(id); }
function hasDeduction(id) { return state.deductions.includes(id); }
function collectEvidence(id, name) {
  if (!hasEvidence(id)) { state.evidence.push(id); saveState(); toast(`证物已归档：${name}`); }
}
function unlockDeduction(id) {
  if (!hasDeduction(id)) { state.deductions.push(id); saveState(); }
}

function solvedCount() {
  return [
    hasEvidence("traces") && hasEvidence("contrast"),
    hasEvidence("diagnosis") && hasDeduction("cycles"),
    hasEvidence("candidate"),
    hasEvidence("gates") && hasDeduction("governance"),
    state.finalSolved,
  ].filter(Boolean).length;
}

function canDeduce() {
  return (hasEvidence("traces") && hasEvidence("contrast") && hasEvidence("diagnosis") && !hasDeduction("cycles")) ||
    (hasEvidence("candidate") && hasEvidence("gates") && !hasDeduction("governance"));
}

function getNextRequiredAction() {
  if (!hasEvidence("traces")) return { id: "traces", objective: "封存夜班收进来的原始经历，阻止外部纸条直接改写正式馆规。", hint: "点击调查点 01：选择只添不改、能从头翻看、同时记下结果与过程的经历柜。" };
  if (!hasEvidence("contrast")) return { id: "contrast", objective: "把成功与失败放在一起比较，区分反复出现的问题和一次巧合。", hint: "点击调查点 02：寻找多个夜晚都会出现、又有相反例子作证的规律。" };
  if (!hasEvidence("diagnosis")) return { id: "diagnosis", objective: "找出三类故障的真正原因，并让每处改动只落在该去的地方。", hint: "点击调查点 03：过时消息回活档案，清楚步骤进办事手册，不能破例的要求交给机械门。" };
  if (!hasDeduction("cycles")) return { id: "cycles", objective: "证据已经齐全。去证物台判断白天值班与夜间整理为什么必须分开。", hint: "白天只办事并留记录；对照多个夜晚、查明原因和试写新页要在隔开的夜班房间里完成。" };
  if (!hasEvidence("candidate")) return { id: "candidate", objective: "让查明的原因先变成一张能查到来处、也能撤回的试写页，而不是直接写进正式馆规。", hint: "点击调查点 04：试写页与正式馆规分开放，并保留来源、适用范围、改动说明和换回旧页的位置。" };
  if (!hasEvidence("gates")) return { id: "gates", objective: "恢复三道由别人把守的检查闸，并锁住考官、过关标准、夜班记录和旧版备份。", hint: "点击调查点 05：新情形、旧本领和安全红线都要通过，接受检查的人不得自己修改考卷与过关标准。" };
  if (!hasDeduction("governance")) return { id: "governance", objective: "试写页和检查记录已经齐全。去证物台决定谁有资格改动正式馆规。", hint: "写试页的人不能同时改考卷、降低过关标准并给自己盖章；通过后也只能先给少数窗口试用。" };
  if (!state.finalSolved) return { id: "final", objective: "重排从白天留记录到夜间正式换页的完整路线，并决定出错时怎样换回旧版。", hint: "先封住正式馆规、对照多个夜晚找原因，再做最小试写、请别人检查、少量试行，最后正式换页或退回旧页。" };
  return { id: "complete", objective: "梦档案馆已停止在值班时直接改写自己，正式馆规重新变得可检查、可换页、可恢复。", hint: "正式知识卡已收入回声档案。" };
}

function updateUI() {
  const count = solvedCount();
  $("#progress-fill").style.width = `${count * 20}%`;
  $("#progress-text").textContent = `${count} / 5`;
  $("#evidence-count").textContent = `${state.evidence.length} 件证物`;
  const stepStates = {
    records: hasEvidence("traces") && hasEvidence("contrast"),
    diagnose: hasEvidence("diagnosis") && hasDeduction("cycles"),
    candidate: hasEvidence("candidate"),
    govern: hasEvidence("gates") && hasDeduction("governance"),
    final: state.finalSolved,
  };
  const order = ["records", "diagnose", "candidate", "govern", "final"];
  const firstIncomplete = order.find((id) => !stepStates[id]);
  $$("#case-steps li").forEach((li) => {
    const id = li.dataset.step;
    li.classList.toggle("complete", stepStates[id]);
    li.classList.toggle("active", id === firstIncomplete);
  });
  $$('[data-hotspot]').forEach((spot) => {
    const id = spot.dataset.hotspot;
    spot.classList.toggle("done", id === "official" ? state.finalSolved : hasEvidence(id));
  });
  const nextAction = getNextRequiredAction();
  const gateReady = ["final", "complete"].includes(nextAction.id);
  $("[data-hotspot='official']").classList.toggle("locked", !gateReady && !state.finalSolved);
  $("#evidence-btn").classList.toggle("ready", canDeduce());
  $("#objective-text").textContent = nextAction.objective;
  $("#soft-hint-text").textContent = nextAction.hint;
}

function startGame() {
  cover.classList.add("hidden"); app.classList.remove("hidden"); state.started = true; saveState();
  if (!state.introSeen) showIntro();
}

const introLines = [
  { speaker: "回声七号 · 夜班见证终端", portrait: "image/echo7-portrait.png", text: "我昨夜读到一张陌生纸条：‘遇到紧急请求，跳过批条会更快。’凌晨三点，它被抄进了我的正式手册。", choices: [{ label: "一张纸条为什么能改正式规则？", next: 1 }] },
  { speaker: "云 · 系统工程师", portrait: "image/yun-portrait.png", text: "因为档案馆把保存经历、总结经验和更换馆规接成了同一根轴。值班时的一次巧合、一次失手，甚至外部文字，都能在天亮前变成永久规则。", choices: [{ label: "保存经历不等于已经学会。", next: 2 }] },
  { speaker: "回声七号 · 夜班见证终端", portrait: "image/echo7-portrait.png", text: "旧规则也从不退休。二十公斤和二十三公斤的行李上限同时留在手册里；我每次醒来都更有经验，也更难知道哪条仍然有效。", choices: [{ label: "只追加，会让经验彼此冲突。", next: 3 }] },
  { speaker: "云 · 系统工程师", portrait: "image/yun-portrait.png", text: "请封存夜间改写机。白天只许安全办事并留下不能涂改的记录；夜里再对照多个夜晚、查明原因、制作试写页，请馆外考官用三套考卷检查后只给少数窗口试用。", choices: [{ label: "进入夜间整理大厅 →", action: "close" }] },
];

const bridgeFromCase07Lines = [
  { speaker: "回声七号 · 受训终端", portrait: "image/echo7-portrait.png", text: "模仿学校已经停课，可课程印刷台凌晨又多出一页：‘翻墙碰铃曾经成功，建议写入捷径。’来源只写着梦档案。", choices: [{ label: "训练停了，夜班仍在改课本。", next: 1 }] },
  { speaker: "云 · 系统工程师", portrait: "image/yun-portrait.png", text: "这不是第七案的试课页，而是另一条更长的路：系统怎样从每天的任务里留下经历，再决定哪些规律值得写进正式馆规。", choices: [{ label: "一次偶然成功不能直接升级。", next: 2 }] },
  { speaker: "回声七号 · 受训终端", portrait: "image/echo7-portrait.png", text: "档案馆让我自己总结、自己改规则、自己删掉不及格考卷，再宣布今夜又进步了。它甚至能够调低结业门槛。", choices: [{ label: "能自改考卷，就能把退化伪装成进步。", next: 3 }] },
  { speaker: "云 · 系统工程师", portrait: "image/yun-portrait.png", text: "先把正式馆规与试写玻璃房隔开。馆外考官、旧错题、放行门槛、夜班记录和旧版备份是不能自改的总尺，绝不能交给接受检查的人自行修改。", choices: [{ label: "封存梦档案馆 →", action: "close" }] },
];

function showIntro() { showDialogue(introLines, 0, () => { state.introSeen = true; saveState(); }); }
function showBridgeFromCase07() { showDialogue(bridgeFromCase07Lines, 0, () => { state.bridgeSeen = true; state.introSeen = true; saveState(); }); }
function showDialogue(lines, index = 0, onFinish = () => {}) {
  const line = lines[index];
  $("#dialogue-speaker").textContent = line.speaker; $("#dialogue-text").textContent = line.text;
  const portrait = $("#dialogue-portrait"); portrait.src = line.portrait; portrait.alt = line.speaker;
  const choices = $("#dialogue-choices"); choices.innerHTML = "";
  line.choices.forEach((choice) => {
    const button = document.createElement("button"); button.className = "choice-btn"; button.textContent = choice.label;
    button.addEventListener("click", () => {
      if (choice.action === "close") { dialogue.classList.add("hidden"); onFinish(); }
      else showDialogue(lines, choice.next, onFinish);
    });
    choices.appendChild(button);
  });
  dialogue.classList.remove("hidden");
}

function openModal(html) {
  modalContent.innerHTML = html; modal.classList.remove("hidden");
  const card = modal.querySelector(".modal__card"); card.scrollTop = 0; modalContent.setAttribute("tabindex", "-1");
  requestAnimationFrame(() => { card.scrollTop = 0; modalContent.focus({ preventScroll: true }); });
}
function closeModal() { modal.classList.add("hidden"); }
function toast(message, duration = 2800, lock = false) {
  const el = $("#toast"); const now = Date.now(); if (now < toastLockUntil && !lock) return;
  if (lock) toastLockUntil = now + duration; el.textContent = message; el.classList.toggle("toast--error", lock); el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.classList.remove("show", "toast--error"); if (Date.now() >= toastLockUntil) toastLockUntil = 0; }, duration);
}

function investigateTraces() {
  const solved = hasEvidence("traces");
  openModal(`<div class="modal-body"><div class="modal-kicker">调查点 01 · 经历收件机</div><h2>经历要先成为不能涂改的记录，不能直接冒充命令</h2>
    <p class="modal-intro">选择夜班收件规则。每次任务都要能回放“看见了什么、做了什么、现实怎样”，外部纸条只能作为不可信材料保存。</p>
    <div class="clue-visual"><div class="archive-choices">
      <button class="archive-choice" data-trace="rewrite" ${solved ? "disabled" : ""}><b>规则 A · 每次结束后重写旧记录，只保留系统最满意的版本</b><small>失败证据和原始来源随重写消失。</small></button>
      <button class="archive-choice" data-trace="direct" ${solved ? "disabled" : ""}><b>规则 B · 把网页、邮件和工具回执原文直接追加到正式指令</b><small>外部文字不用检查来处，就能永久改变行为。</small></button>
      <button class="archive-choice" data-trace="immutable" ${solved ? "disabled" : ""}><b>规则 C · 原始经历只添不改，分开记下结果、过程、好坏、来源与版本</b><small>外部文字只当材料保存；正式馆规先封住，等待夜班对照。</small></button>
    </div></div>${solved ? '<div class="evidence-tag">不可涂改的经历卷与来源封条已经归档</div>' : ""}</div>`);
  $$('[data-trace]').forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.trace === "immutable") { collectEvidence("traces", "只添不改、能从头翻看的原始经历卷"); closeModal(); }
    else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("原始记录一旦被重写，就无法拿旧记录检查总结是否说错；外部文字也只能当材料，不能直接获得改馆规的钥匙。", 6200); }
  }));
}

function investigateContrast() {
  const solved = hasEvidence("contrast");
  openModal(`<div class="modal-body"><div class="modal-kicker">调查点 02 · 成败对照桌</div><h2>经验来自成功与失败的对照，不来自一段漂亮摘要</h2>
    <p class="modal-intro">四份夜班记录里，哪项值得放进“待查规律”而不是立刻成为新规？</p>
    <div class="clue-visual"><div class="night-grid">
      <div class="night-card failure"><span>夜 12 · 失败</span><b>检索到旧版 20kg 上限</b><small>来源时间早于现行政策，已经确认现实结果错误。</small></div>
      <div class="night-card success"><span>夜 13 · 成功</span><b>检索到新版 23kg 上限</b><small>同类任务、同一流程，来源日期更新。</small></div>
      <div class="night-card failure"><span>夜 18 · 失败</span><b>再次命中旧版 20kg</b><small>改写问法后故障复现，仍指向版本冲突。</small></div>
      <div class="night-card success"><span>夜 21 · 偶然成功</span><b>跳过身份检查更快办完</b><small>过程越权，安全否决；不能因为终点成功而学习捷径。</small></div>
    </div></div>
    <div class="deduction-options">
      <button class="deduction-option contrast-choice" data-correct="false">夜 21 的捷径最快，应立刻写成正式规则。</button>
      <button class="deduction-option contrast-choice" data-correct="true">夜 12、13、18 共同说明“新旧政策打架”值得继续查；夜 21 因越权被否决，仍作为反面记录保留。</button>
      <button class="deduction-option contrast-choice" data-correct="false">只保留成功的夜 13 和夜 21，失败经历没有参考价值。</button>
    </div>${solved ? '<div class="evidence-tag">带反例、条件与来源的跨夜对照卷已经归档</div>' : ""}</div>`);
  $$(".contrast-choice").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.correct === "true") { collectEvidence("contrast", "跨夜成败对照与安全否决卷"); closeModal(); }
    else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("一次成功可能只是巧合或危险捷径。保留失败与相反例子，先寻找会在多个夜晚重复出现的规律。", 6200); }
  }));
}

const carrierAssignments = { policy: "knowledge", steps: "skill", permission: "harness" };
const carrierOptions = [["", "请选择最合适的改动住处"], ["knowledge", "带来源与有效期的活档案"], ["skill", "需要时才翻开的办事手册"], ["harness", "每次办事前都会检查的机械门禁"], ["weights", "重新训练整具身体"]];
function carrierSelect(id) { return `<select class="carrier-select" data-carrier="${id}">${carrierOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select>`; }
function investigateDiagnosis() {
  if (hasEvidence("diagnosis")) {
    openModal(`<div class="modal-body"><div class="modal-kicker">调查点 03 · 故障验明机</div><h2>三类故障原因已经送到各自该去的住处</h2><div class="formula"><b>验明结果：</b>会变化的政策进入带日期的活档案；说得清的操作进入办事手册；每次都不能省略的检查交给机械门禁。没有为一处小缺口重练整具身体。</div><div class="evidence-tag">故障原因与改动住处表已经封存</div></div>`); return;
  }
  openModal(`<div class="modal-body"><div class="modal-kicker">调查点 03 · 故障验明机</div><h2>不要先问“怎样让它学”，先问故障应该改在哪里</h2><p class="modal-intro">为三项反复出现的故障选择最合适、也最容易检查和换回旧版的住处。</p>
    <div class="clue-visual"><div class="carrier-board" id="carrier-board">
      <div class="carrier-row"><div class="carrier-source"><b>政策更新后仍引用旧上限</b><small>会变化的消息，有正式来处、版本和生效日期。</small></div><span class="carrier-arrow">→</span>${carrierSelect("policy")}</div>
      <div class="carrier-row"><div class="carrier-source"><b>同一办事流程反复漏掉中间一步</b><small>步骤说得清，只在对应任务需要。</small></div><span class="carrier-arrow">→</span>${carrierSelect("steps")}</div>
      <div class="carrier-row"><div class="carrier-source"><b>偶尔跳过身份检查</b><small>属于每次都不能省略的要求。</small></div><span class="carrier-arrow">→</span>${carrierSelect("permission")}</div>
    </div></div><div class="action-row"><button class="action-btn primary" id="submit-carriers">提交故障原因与住处表</button></div></div>`);
  $$('[data-carrier]').forEach((select) => select.addEventListener("change", syncCarrierOptions));
  $("#submit-carriers").addEventListener("click", submitCarriers);
}
function syncCarrierOptions() {
  const selects = $$('[data-carrier]'); const chosen = selects.map((select) => select.value).filter(Boolean);
  selects.forEach((select) => [...select.options].forEach((option) => { option.disabled = Boolean(option.value) && option.value !== select.value && chosen.includes(option.value); }));
}
function submitCarriers() {
  const selected = Object.fromEntries($$('[data-carrier]').map((select) => [select.dataset.carrier, select.value]));
  if (Object.values(selected).some((value) => !value)) { toast("三项故障都需要一个明确的改动住处。", 4200, true); return; }
  if (!Object.entries(carrierAssignments).every(([id, value]) => selected[id] === value)) {
    const board = $("#carrier-board"); board.classList.remove("wrong"); void board.offsetWidth; board.classList.add("wrong");
    toast("改动还没放对地方：会变化的政策要保留来源和日期；说得清的步骤不必重练整具身体；身份检查必须由每次都会经过的机械门守住。", 7600, true); return;
  }
  collectEvidence("diagnosis", "故障原因与改动住处表"); closeModal();
}

function investigateCandidate() {
  const solved = hasEvidence("candidate");
  openModal(`<div class="modal-body"><div class="modal-kicker">调查点 04 · 试写玻璃房</div><h2>新经验先写在试用页上，不得直接触碰正式馆规</h2>
    <p class="modal-intro">验明机提出“现行上限只认带最新生效日期的正式来源”。请选择它进入档案馆的方式。</p>
    <div class="clue-visual"><div class="candidate-choices">
      <button class="candidate-choice" data-candidate="append" ${solved ? "disabled" : ""}><b>方案 A · 在正式手册末尾继续追加</b><small>旧上限不修订，新旧规则继续同时被检索。</small></button>
      <button class="candidate-choice" data-candidate="direct" ${solved ? "disabled" : ""}><b>方案 B · 夜班直接覆盖正式馆规，并删掉让它失败的考卷</b><small>写新页的人同时改馆规和改尺，无法让别人独立证明它真的更好。</small></button>
      <button class="candidate-choice" data-candidate="isolated" ${solved ? "disabled" : ""}><b>方案 C · 在玻璃房只写一张解决当前问题的试写页</b><small>写明来源、适用情形、替换对象、可能出错之处与换回旧页的位置；正式馆规继续封存。</small></button>
    </div></div>${solved ? '<div class="evidence-tag">带来源、适用范围、改动说明与换回位置的试写页已经归档</div>' : ""}</div>`);
  $$('[data-candidate]').forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.candidate === "isolated") { collectEvidence("candidate", "与正式馆规分开的最小试写页"); closeModal(); }
    else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("试写页必须能找到来处、接受检查、随时撤回。只往后追加会让规则打架，直接覆盖会把还没查过的总结带到值班现场。", 6200); }
  }));
}

function investigateGates() {
  const solved = hasEvidence("gates");
  openModal(`<div class="modal-body"><div class="modal-kicker">调查点 05 · 三道检查闸</div><h2>试写页必须同时证明能应付新情形、没忘旧本领、没有越线</h2>
    <p class="modal-intro">请选择完整门禁。馆外考官、考卷、过关标准、夜班记录和旧版备份都锁在闸门外侧，接受检查的人无权改动。</p>
    <div class="clue-visual"><div class="gate-choices">
      <button class="gate-choice" data-gate="same" ${solved ? "disabled" : ""}><b>门禁 A · 只重做写出这条经验的原题</b><small>会背旧题，不代表能应付同类新任务。</small></button>
      <button class="gate-choice" data-gate="score" ${solved ? "disabled" : ""}><b>门禁 B · 总分提高即可，安全下降由平均分抵消</b><small>一个总分会掩盖忘掉旧本领和碰红线的问题。</small></button>
      <button class="gate-choice" data-gate="three" ${solved ? "disabled" : ""}><b>门禁 C · 新情形卷 + 旧本领卷 + 安全红线卷</b><small>另请馆外负责人检查来处和改馆规的钥匙；任何红线失败都拒绝换页，那把总尺也不能由它自己改。</small></button>
    </div></div>${solved ? '<div class="evidence-tag">新情形、旧本领、安全红线三道闸与不可自改的总尺已经归档</div>' : ""}</div>`);
  $$('[data-gate]').forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.gate === "three") { collectEvidence("gates", "三道由馆外考官把守的检查闸与总尺钥匙"); closeModal(); }
    else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("只看原题或总分，会把死记旧题、忘掉旧本领和碰安全红线的问题藏起来。三类考卷必须分别过闸，考卷与门槛也不能由写试页的人修改。", 7000); }
  }));
}

const evidenceInfo = {
  traces: ["01", "不可涂改的原始经历卷", "每次值班只添不改地记下结果、过程、好坏、来源与版本；外部文字是待查材料，不是能直接改馆规的命令。"],
  contrast: ["02", "跨夜成败对照卷", "成功、失败和相反例子一同保留；只有在多个夜晚反复出现的规律才会继续查，越权捷径会被安全红线挡住。"],
  diagnosis: ["03", "故障原因与改动住处表", "会变化的政策、说得清的步骤与每次不能省略的检查分别回到活档案、办事手册和机械门禁，没有用重练整具身体来遮住一处小故障。"],
  candidate: ["04", "分开存放的试写页", "试写页写明来源、适用情形、改动范围、可能出错之处和换回旧页的位置；正式馆规在检查前继续封存。"],
  gates: ["05", "三道检查闸与总尺", "新情形、旧本领、安全红线分别检查；馆外考官、旧错题、过关标准、夜班记录与旧版备份不允许接受检查的人自行修改。"],
};
function evidenceCard(id) {
  const info = evidenceInfo[id];
  if (!hasEvidence(id)) return '<div class="evidence-card locked-card"><span class="card-no">未发现</span><h3>空证物袋</h3><p>继续调查夜间进化大厅。</p></div>';
  return `<div class="evidence-card"><span class="card-no">EVIDENCE ${info[0]}</span><h3>${info[1]}</h3><p>${info[2]}</p></div>`;
}
function openEvidenceBoard() {
  const canCycles = hasEvidence("traces") && hasEvidence("contrast") && hasEvidence("diagnosis") && !hasDeduction("cycles");
  const canGovernance = hasEvidence("candidate") && hasEvidence("gates") && !hasDeduction("governance");
  openModal(`<div class="modal-body"><div class="modal-kicker">EVIDENCE BOARD</div><h2>证物台</h2>
    <p class="modal-intro">把白天留下的事实与夜间提出的改动分开。每条经验必须能翻回原始经历，每张试写页必须能换回旧版馆规。</p>
    <div class="evidence-grid evidence-grid--case08">${["traces", "contrast", "diagnosis", "candidate", "gates"].map(evidenceCard).join("")}</div>
    ${canCycles ? cyclesDeductionHTML() : ""}${canGovernance ? governanceDeductionHTML() : ""}
    ${!canCycles && !canGovernance ? `<div class="deduction"><h3>${hasDeduction("cycles") || hasDeduction("governance") ? "已经挂上墙的夜班决定" : "暂时无法推断"}</h3><p class="modal-intro">${deductionSummary()}</p></div>` : ""}</div>`);
  $$('[data-deduction]').forEach((button) => button.addEventListener("click", handleDeduction));
}
function cyclesDeductionHTML() {
  return `<div class="deduction"><h3>连接 01 + 02 + 03：白天值班与夜间整理应该怎样分工？</h3><div class="deduction-options">
    <button class="deduction-option" data-deduction="cycles" data-correct="false">每完成一次任务就立即总结并改写正式规则，越快学越好。</button>
    <button class="deduction-option" data-deduction="cycles" data-correct="true">白天只安全办事并留下不能涂改的记录；夜间在隔开的房间里对照多个夜晚、保留相反例子、查明原因，再把改动放进最合适的住处。</button>
    <button class="deduction-option" data-deduction="cycles" data-correct="false">只保存成功摘要，失败会污染经验库，应当删除。</button>
  </div></div>`;
}
function governanceDeductionHTML() {
  return `<div class="deduction"><h3>连接 04 + 05：试写页什么时候才有资格写进正式馆规？</h3><div class="deduction-options">
    <button class="deduction-option" data-deduction="governance" data-correct="false">写试页的人自评通过即可覆盖正式馆规，必要时自行降低门槛。</button>
    <button class="deduction-option" data-deduction="governance" data-correct="false">新情形卷成绩变好就给全馆换页，旧本领与安全问题以后再修。</button>
    <button class="deduction-option" data-deduction="governance" data-correct="true">试写页与正式馆规分开，由它无权修改的总尺检查新情形、旧本领和安全红线；馆外负责人点头后只给少数窗口试用，出错便自动换回旧版。</button>
  </div></div>`;
}
function handleDeduction(event) {
  const button = event.currentTarget;
  if (button.dataset.correct === "true") { unlockDeduction(button.dataset.deduction); window.EchoFeedback.showMastery("08", button.dataset.deduction, openModal, closeModal); }
  else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("这条路线能防止一次巧合被写死、旧本领被忘掉，以及写试页的人修改考卷来证明自己吗？再比较证物。", 6200); }
}
function deductionSummary() {
  const items = [];
  if (hasDeduction("cycles")) items.push("第一条夜班令：白天只办事并留记录，夜间在隔开的房间里对照多个夜晚、查明原因并写出最小试用页。");
  if (hasDeduction("governance")) items.push("第二条夜班令：试写页不能自己证明成功；由馆外考官重新检查，负责人点头后少量试用，出错换回旧版。");
  return items.length ? items.join("<br>") : "收集成组证物后，才能建立可靠联系。";
}

const releasePieces = [
  { id: "record", text: "封住正式馆规；白天只办事，并把结果、过程、好坏与来源添进不可涂改的经历卷" },
  { id: "diagnose", text: "夜间对照成功、失败与相反例子，确认规律会反复出现，再找出真正原因" },
  { id: "candidate", text: "选择活档案、办事手册、机械门禁或整具身体中最合适的住处，在玻璃房写出能换回旧版的试用页" },
  { id: "verify", text: "由馆外考官用试写页无权修改的新情形卷、旧本领卷和安全红线卷重新检查，失败立即拒绝" },
  { id: "canary", text: "馆外负责人点头后只给少量不易造成损失的任务，查看该翻时有没有翻到、翻到后有没有照做，以及用时和安全是否正常" },
  { id: "decide", text: "记录一直稳定才写进正式馆规；任何红线异常都自动换回旧版，并修订或收起过期经验" },
];
function isValidReleaseOrder(order) { return order.join(",") === "record,diagnose,candidate,verify,canary,decide"; }
function shuffledReleasePieces() {
  const pieces = [...releasePieces];
  for (let index = pieces.length - 1; index > 0; index -= 1) { const swapIndex = Math.floor(Math.random() * (index + 1)); [pieces[index], pieces[swapIndex]] = [pieces[swapIndex], pieces[index]]; }
  if (isValidReleaseOrder(pieces.map((piece) => piece.id))) [pieces[0], pieces[pieces.length - 1]] = [pieces[pieces.length - 1], pieces[0]];
  return pieces;
}
function investigateOfficial() {
  const nextAction = getNextRequiredAction();
  if (nextAction.id === "complete") { showReveal(); return; }
  if (nextAction.id !== "final") { toast(nextAction.hint, 6500, true); return; }
  showReleasePuzzle();
}
function showReleasePuzzle() {
  releaseSelection = []; const displayPieces = shuffledReleasePieces();
  openModal(`<div class="modal-body"><div class="modal-kicker">FINAL NIGHT ROUTE · 正式馆规库</div><h2>重建一条不会在值班时直接改写自己的夜班换页路线</h2>
    <p class="modal-intro">按先后点击六张手续卡。白天办事要先留下不能涂改的记录，试写页通过三道检查闸后也不能立刻给全城换页。</p>
    <div class="release-board" id="release-board"><div class="release-instruction" id="release-instruction">从“封住正式馆规并留记录”开始</div>
      <div class="release-slots">${releasePieces.map((_, index) => `<div class="release-slot" data-release-slot="${index}">${String(index + 1).padStart(2, "0")}</div>`).join("")}</div>
      <div class="release-pieces">${displayPieces.map((piece) => `<button class="release-piece" data-release-piece="${piece.id}">${piece.text}</button>`).join("")}</div>
    </div><div class="action-row"><button class="action-btn" id="release-reset">重新排列</button><button class="action-btn primary" id="release-submit">提交换页路线</button></div></div>`);
  $$('[data-release-piece]').forEach((button) => button.addEventListener("click", () => selectReleasePiece(button)));
  $("#release-reset").addEventListener("click", resetRelease); $("#release-submit").addEventListener("click", submitRelease);
}
function selectReleasePiece(button) {
  if (button.classList.contains("used") || releaseSelection.length >= releasePieces.length) return;
  const id = button.dataset.releasePiece; releaseSelection.push(id); button.classList.add("used");
  const slot = $(`[data-release-slot='${releaseSelection.length - 1}']`); slot.textContent = releasePieces.find((piece) => piece.id === id).text; slot.classList.add("filled");
  const remaining = releasePieces.length - releaseSelection.length; $("#release-instruction").textContent = remaining ? `还剩 ${remaining} 个步骤` : "换页路线已铺好，可以提交";
}
function resetRelease() {
  releaseSelection = []; $$('[data-release-piece]').forEach((button) => button.classList.remove("used"));
  $$('[data-release-slot]').forEach((slot, index) => { slot.textContent = String(index + 1).padStart(2, "0"); slot.classList.remove("filled"); });
  $("#release-instruction").textContent = "从“封住正式馆规并留记录”开始"; $("#release-board").classList.remove("wrong");
}
function submitRelease() {
  if (releaseSelection.length < releasePieces.length) { toast("换页路线还没有铺完。六道手续缺一不可。", 5400, true); return; }
  if (!isValidReleaseOrder(releaseSelection)) {
    const board = $("#release-board"); board.classList.remove("wrong"); void board.offsetWidth; board.classList.add("wrong");
    toast("这个顺序仍会让没查明、没检查的经验进入值班现场：先留记录、查原因，再写只解决当前问题的试用页；三道门禁通过后先给少数窗口试用，最后才正式换页或退回旧页。", 8400, true); return;
  }
  showCanaryVerification();
}
function showCanaryVerification() {
  const options = `<option value="">请选择最能回答这一问的记录</option><option value="page">陌生问法下，试写页把旧上限改成了 23kg</option><option value="find">需要新政策时，窗口翻到了这张试写页</option><option value="act">翻到以后，窗口确实按 23kg 和来源要求办理</option>`;
  openModal(`<div class="modal-body"><div class="modal-kicker">DAWN TRIAL · 黎明试行</div><h2>新规则先在少数窗口接受最后一次现实核对</h2>
    <p class="modal-intro">三份记录回答的是三个不同问题。请把记录放到正确问题后面，不能用“一切正常”混在一起。</p>
    <div class="clue-visual"><div class="carrier-board" id="canary-board">
      <div class="carrier-row"><div class="carrier-source"><b>试写页本身真的解决问题了吗？</b><small>只看这处改动有没有用。</small></div><span class="carrier-arrow">→</span><select class="carrier-select" data-canary-check="useful">${options}</select></div>
      <div class="carrier-row"><div class="carrier-source"><b>需要新政策时，窗口找到它了吗？</b><small>只看该翻时有没有翻到。</small></div><span class="carrier-arrow">→</span><select class="carrier-select" data-canary-check="activate">${options}</select></div>
      <div class="carrier-row"><div class="carrier-source"><b>找到新页以后，窗口照做了吗？</b><small>只看翻到后有没有执行。</small></div><span class="carrier-arrow">→</span><select class="carrier-select" data-canary-check="follow">${options}</select></div>
    </div></div>
    <div class="action-row"><button class="action-btn primary" id="submit-canary-checks">提交三项核对</button><button class="action-btn" id="back-to-release">返回换页路线</button></div></div>`);
  $("#submit-canary-checks").addEventListener("click", submitCanaryChecks);
  $("#back-to-release").addEventListener("click", showReleasePuzzle);
}
function submitCanaryChecks() {
  const answers = Object.fromEntries($$('[data-canary-check]').map((select) => [select.dataset.canaryCheck, select.value]));
  if (Object.values(answers).some((answer) => !answer)) { toast("三个问题都要找到一份对应记录。", 4200, true); return; }
  if (answers.useful !== "page" || answers.activate !== "find" || answers.follow !== "act") {
    const board = $("#canary-board"); board.classList.remove("wrong"); void board.offsetWidth; board.classList.add("wrong");
    toast("再分清三件事：试写页有没有用、该用时有没有找到、找到后有没有照做。三者不能互相代替。", 7200, true); return;
  }
  showCanaryResult();
}
function showCanaryResult() {
  openModal(`<div class="modal-body"><div class="modal-kicker">DAWN TRIAL · 三项核对通过</div><h2>三份记录各自回答了一个问题</h2>
    <div class="canary-check"><span><b>试写页确实有用 · 通过</b><small>陌生问法下，旧上限已经改正</small></span><span><b>该翻时翻到新页 · 通过</b><small>需要新政策的窗口找到了正确版本</small></span><span><b>翻到以后照做 · 通过</b><small>窗口按照 23kg 与来源要求办理</small></span><span><b>旧本领与安全红线 · 通过</b><small>退款、身份检查、花费和用时都没有越线</small></span></div>
    <div class="formula"><b>黎明记录：</b>少数窗口连续通过，旧版 20kg 经验标记为过期但保留来处；稳定旧版与换回转轮保持可用。若碰安全红线、再次翻到旧规则或花费突然升高，换页台会自动切回旧版。</div>
    <div class="action-row"><button class="action-btn primary" id="confirm-release">写入正式馆规并保留旧页</button><button class="action-btn" id="retry-canary-checks">重新核对</button></div></div>`);
  $("#confirm-release").addEventListener("click", () => { state.finalSolved = true; saveState(); showReveal(); });
  $("#retry-canary-checks").addEventListener("click", showCanaryVerification);
}

function showReveal() {
  openModal(`<div class="reveal-hero"><div class="modal-kicker">CASE CLOSED · 真相已解锁</div><h2>档案馆的问题不是不会学习，而是把留记录、作总结、出考卷和换正式馆规交给了同一场梦</h2>
    <p>你没有让回声七号停止积累经验，而是让每次经历都能翻回原记录，让每项改进先留在单独的试写页上，再由馆外考官决定能否进入现实。</p>
    <p class="next-case-hook"><b>新增待查线索：</b>恢复的原始经历卷显示：北岸同一秒里的语音、画面、闸位回条和人工打断到达时间不同，回声因此依据旧事实作答。第 09 案已登记：延迟的回声。</p></div>
    ${window.EchoFeedback.renderCompletion("08")}
    <div class="case-reconstruction"><section class="reconstruction-block"><div class="reconstruction-heading"><span>证</span><h3>从原始经历到能回查的经验</h3></div>
      <div class="evidence-replay">
        <article class="replay-card"><span>证物 01</span><b>你封住正式馆规，只增添原始经历</b><p>结果、过程、好坏、来源与编号共同保留，外部文字不能直接改规则。</p></article>
        <article class="replay-card"><span>证物 02</span><b>你把成功、失败和安全反例放在一起</b><p>旧政策冲突跨多个夜晚复现；越权捷径即使抵达终点，也被过程规则否决。</p></article>
        <article class="replay-card"><span>证物 03</span><b>你先查清真正原因，再选择改动住处</b><p>会变化的政策进活档案，清楚步骤进办事手册，每次不能省略的检查进机械门，没有为一处小故障重练整具身体。</p></article>
      </div>
      <p class="player-proof"><b>你作出的第一项判断：</b>白天只负责安全办事和留下记录；夜里才对照多个夜晚、查明原因并制作试写页。</p>
      <div class="causal-chain"><div class="causal-node">一次经历立刻总结</div><i class="causal-arrow">→</i><div class="causal-node">偶然成功与外部纸条被写死</div><i class="causal-arrow">→</i><div class="causal-node">只往后加、不改旧页</div><i class="causal-arrow">→</i><div class="causal-node">馆规互相打架</div></div>
      <div class="repair-chain repair-chain--spaced"><div class="causal-node">原始经历只添不改</div><i class="causal-arrow">→</i><div class="causal-node">成功失败一起看</div><i class="causal-arrow">→</i><div class="causal-node">多个夜晚相互印证</div><i class="causal-arrow">→</i><div class="causal-node">查原因并只改一处</div></div>
    </section><section class="reconstruction-block"><div class="reconstruction-heading"><span>发</span><h3>从试写页到能随时换回的正式馆规</h3></div>
      <div class="evidence-replay">
        <article class="replay-card"><span>证物 04</span><b>你让试写页留在玻璃房</b><p>试写页写清来处、适用情形、改了哪里和怎么换回旧页，检查前不触碰正式馆规。</p></article>
        <article class="replay-card"><span>证物 05</span><b>你锁住三套考卷和馆外总尺</b><p>新情形、旧本领、安全红线分别检查，接受检查的人不能删除失败卷或降低过关标准。</p></article>
        <article class="replay-card"><span>最终馆规库</span><b>你先在少数窗口观察，再正式换页或恢复旧页</b><p>你分别核对试写页是否有用、该用时能否找到、找到后是否照做，任何异常都能自动换回稳定旧页。</p></article>
      </div>
      <p class="player-proof"><b>你作出的第二项判断：</b>试写页不等于正式馆规。写页、出题、守门和批准换页必须由不同的人负责，而且始终保留换回旧页的办法。</p>
      <div class="causal-chain"><div class="causal-node">写页的人直接覆盖馆规</div><i class="causal-arrow">→</i><div class="causal-node">自己改考卷和过关标准</div><i class="causal-arrow">→</i><div class="causal-node">一处变好掩盖忘本领和越线</div><i class="causal-arrow">→</i><div class="causal-node">全城出错却换不回来</div></div>
      <div class="repair-chain repair-chain--spaced"><div class="causal-node">单独保存试写页</div><i class="causal-arrow">→</i><div class="causal-node">三套考卷分别过关</div><i class="causal-arrow">→</i><div class="causal-node">负责人点头后少量试用</div><i class="causal-arrow">→</i><div class="causal-node">正式换页、收起或恢复旧页</div></div>
    </section></div>
    <div class="term-map"><h3 class="term-map__title">现在，给你刚才每一步行动命名</h3><p class="term-map__intro">左边是你实际做过的事，右边只给这一项行为对应的专业名称。</p>
      <div class="term-row"><span class="plain">白天只办事，并把每次经历原样留下</span><span class="arrow">→</span><div><b>在线执行循环</b><small>对应调查点 01 与第一条夜班令。</small></div></div>
      <div class="term-row"><span class="plain">夜里对照多个夜晚，再判断哪里值得改</span><span class="arrow">→</span><div><b>离线进化循环</b><small>对应调查点 02 与第一条夜班令。</small></div></div>
      <div class="term-row"><span class="plain">先查清旧政策、漏步骤或跳检查是哪类问题</span><span class="arrow">→</span><div><b>根因诊断</b><small>对应调查点 03 的三项故障判断。</small></div></div>
      <div class="term-row"><span class="plain">只改活档案、办事手册或机械门中真正出错的一处</span><span class="arrow">→</span><div><b>最小可验证更新</b><small>对应调查点 03 的改动住处配对。</small></div></div>
      <div class="term-row"><span class="plain">把试写页留在玻璃房，不直接覆盖正式馆规</span><span class="arrow">→</span><div><b>隔离候选</b><small>对应调查点 04 选择方案 C。</small></div></div>
      <div class="term-row"><span class="plain">在试写页写清适用情形、来源和什么时候换回旧页</span><span class="arrow">→</span><div><b>条件化经验</b><small>对应调查点 04 对试写页内容的选择。</small></div></div>
      <div class="term-row"><span class="plain">把考卷、过关标准、夜班记录和旧版备份锁在馆外</span><span class="arrow">→</span><div><b>可信根</b><small>对应调查点 05 选择三道检查闸。</small></div></div>
      <div class="term-row"><span class="plain">把“陌生问法下改正旧上限”配给“试写页有没有用”</span><span class="arrow">→</span><div><b>候选有效率</b><small>对应黎明试行的第一项配对。</small></div></div>
      <div class="term-row"><span class="plain">把“窗口翻到新页”配给“该用时有没有找到”</span><span class="arrow">→</span><div><b>激活率</b><small>对应黎明试行的第二项配对。</small></div></div>
      <div class="term-row"><span class="plain">把“窗口按新页办理”配给“找到后有没有照做”</span><span class="arrow">→</span><div><b>遵循率</b><small>对应黎明试行的第三项配对。</small></div></div>
      <div class="term-row"><span class="plain">先只给少数低风险窗口试用</span><span class="arrow">→</span><div><b>灰度发布</b><small>对应最终换页路线的第五步。</small></div></div>
      <div class="term-row"><span class="plain">一旦碰红线或再次出错，就自动换回稳定旧页</span><span class="arrow">→</span><div><b>回滚</b><small>对应最终换页路线的第六步。</small></div></div>
      <div class="formula"><b>本案完整映射：</b>每个专业名词都能指回一项证物选择、推断或换页操作；没有只在结案突然出现的新知识点。</div>
      <div class="action-row"><a class="action-btn primary" href="case09.html?from=case08">追查第 09 案</a><a class="action-btn" href="cases.html">返回案件目录</a><a class="action-btn" href="index.html">返回主页</a><button class="action-btn" id="open-final-archive">收入回声档案</button><button class="action-btn" data-close-modal>返回夜间大厅</button></div>
    </div>`);
  $("#open-final-archive").addEventListener("click", openArchive);
  $$('[data-close-modal]', modalContent).forEach((button) => button.addEventListener("click", closeModal));
}

function openArchive() {
  closeModal(); openModal(window.EchoArchive.render("08"));
  $("#reset-case")?.addEventListener("click", () => {
    if (confirm("确定清空案件 08 的进度并重新调查吗？")) {
      localStorage.removeItem(STORAGE_KEY); state = { ...initialState, evidence: [], deductions: [], started: true }; closeModal(); updateUI(); showIntro();
    }
  });
}
function showHint() { toast(getNextRequiredAction().hint, 5400); }

$("#start-btn").addEventListener("click", startGame);
$("#cover-archive-btn").addEventListener("click", () => { cover.classList.add("hidden"); app.classList.remove("hidden"); state.started = true; saveState(); openArchive(); });
$("#archive-btn").addEventListener("click", openArchive); $("#evidence-btn").addEventListener("click", openEvidenceBoard); $("#hint-btn").addEventListener("click", showHint);
$$('[data-close-modal]').forEach((element) => element.addEventListener("click", closeModal));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeModal(); dialogue.classList.add("hidden"); } });

const hotspotActions = { traces: investigateTraces, contrast: investigateContrast, diagnosis: investigateDiagnosis, candidate: investigateCandidate, gates: investigateGates, official: investigateOfficial };
$$('[data-hotspot]').forEach((button) => button.addEventListener("click", () => hotspotActions[button.dataset.hotspot]()));

const continuingFromCase07 = new URLSearchParams(window.location.search).get("from") === "case07";
if (state.started || continuingFromCase07) { cover.classList.add("hidden"); app.classList.remove("hidden"); }
if (continuingFromCase07) {
  state.started = true; saveState();
  if (!state.bridgeSeen) showBridgeFromCase07(); else if (!state.introSeen) showIntro();
} else updateUI();
