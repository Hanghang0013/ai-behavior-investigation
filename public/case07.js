const STORAGE_KEY = "echo-archive-case-07";
const SAVE_VERSION = 2;

const initialState = {
  saveVersion: SAVE_VERSION,
  started: false,
  introSeen: false,
  bridgeSeen: false,
  evidence: [],
  deductions: [],
  finalSolved: false,
  legacyCompletionPending: false,
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
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { ...initialState, evidence: [], deductions: [] };
    const parsed = JSON.parse(saved);
    const fromVersion = Number(parsed.saveVersion) || 1;
    const migrated = {
      ...initialState,
      ...parsed,
      evidence: Array.isArray(parsed.evidence) ? [...new Set(parsed.evidence.filter((id) => typeof id === "string"))] : [],
      deductions: Array.isArray(parsed.deductions) ? [...new Set(parsed.deductions.filter((id) => typeof id === "string"))] : [],
      saveVersion: SAVE_VERSION,
    };

    if (fromVersion < 2) {
      const missingPolicyEvidence = migrated.evidence.includes("sandbox") && !migrated.evidence.includes("policy");
      if (missingPolicyEvidence) migrated.deductions = migrated.deductions.filter((id) => id !== "signals");
      if (parsed.finalSolved && missingPolicyEvidence) {
        migrated.finalSolved = false;
        migrated.legacyCompletionPending = true;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }
    return migrated;
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
    hasEvidence("syllabus") && hasEvidence("archive"),
    hasDeduction("carriers"),
    hasEvidence("imitation") && hasEvidence("sandbox") && hasEvidence("policy") && hasEvidence("rules"),
    hasDeduction("signals"),
    state.finalSolved,
  ].filter(Boolean).length;
}

function canDeduce() {
  return (hasEvidence("syllabus") && hasEvidence("archive") && !hasDeduction("carriers")) ||
    (hasEvidence("imitation") && hasEvidence("sandbox") && hasEvidence("policy") && hasEvidence("rules") && !hasDeduction("signals"));
}

function getNextRequiredAction() {
  if (!hasEvidence("syllabus")) return {
    id: "syllabus",
    objective: "翻开混装课表，确认四种故障并不是同一种能力缺口。",
    hint: "点击调查点 01“混装课表机”，封存四张退学单。",
  };
  if (!hasEvidence("archive")) return {
    id: "archive",
    objective: "把四类教材送回各自真正该去的教室。",
    hint: "点击调查点 02“变动档案柜”，完成活档案、手册、铁门和训练场的分流表。",
  };
  if (!hasDeduction("carriers")) return {
    id: "carriers",
    objective: "四本教材已经分开。去证物台判断哪些根本不该送进课堂。",
    hint: "能随时翻原页的放进活档案；能写成步骤的印成出发前领用的手册。",
  };
  if (!hasEvidence("imitation")) return {
    id: "imitation",
    objective: "先检查临摹课堂究竟适合教会什么。",
    hint: "点击调查点 03：选择能稳定答卷格式与按钮协议的干净样卷。",
  };
  if (!hasEvidence("sandbox")) return {
    id: "sandbox",
    objective: "修复试错沙盘的奖章规则，阻止学生靠长文或翻墙骗到高分。",
    hint: "点击调查点 04：奖励真实抵达、合规路径与沿途进展。",
  };
  if (!hasEvidence("policy")) return {
    id: "policy",
    objective: "奖章规则已经修好，还要让当前学生自己产生练习路线。",
    hint: "重新打开调查点 04“试错沙盘”，完成当前学生试路台的在轨选择。",
  };
  if (!hasEvidence("rules")) return {
    id: "rules",
    objective: "恢复那扇绝不能依靠学生自觉通过的机械校规门。",
    hint: "点击调查点 05：让名牌、额度和批条在动作执行前接受确定性检查。",
  };
  if (!hasDeduction("signals")) return {
    id: "signals",
    objective: "五项训练证物已经齐全。去证物台接起临摹、在轨试路、奖励与铁门。",
    hint: "先稳定可解析协议，再进可复原沙盘自己试路；结果、路径和安全边界必须共同作证。",
  };
  if (state.legacyCompletionPending) return {
    id: "resume",
    objective: "旧结案缺少的在轨证据已经补齐，可以恢复原有结案进度。",
    hint: "点击最终结业门；系统会保留旧进度，并直接重新生成完整结案卷。",
  };
  if (!state.finalSolved) return {
    id: "final",
    objective: "重排从入学到结业的六道手续，让回声七号参加一场没见过题的复考。",
    hint: "先分班，再临摹、搭练习城、自己试路、陌生复考，最后才有限放行。",
  };
  return {
    id: "complete",
    objective: "课程已经重新分流，回声七号通过独立结业考。",
    hint: "正式知识卡已收入回声档案。",
  };
}

function updateUI() {
  const count = solvedCount();
  $("#progress-fill").style.width = `${count * 20}%`;
  $("#progress-text").textContent = `${count} / 5`;
  $("#evidence-count").textContent = `${state.evidence.length} 件证物`;

  const stepStates = {
    placement: hasEvidence("syllabus") && hasEvidence("archive"),
    carriers: hasDeduction("carriers"),
    training: hasEvidence("imitation") && hasEvidence("sandbox") && hasEvidence("policy") && hasEvidence("rules"),
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
    const done = id === "graduation" ? state.finalSolved : id === "sandbox" ? hasEvidence("sandbox") && hasEvidence("policy") : hasEvidence(id);
    spot.classList.toggle("done", done);
  });
  const nextAction = getNextRequiredAction();
  const gateReady = ["resume", "final", "complete"].includes(nextAction.id);
  $("[data-hotspot='graduation']").classList.toggle("locked", !gateReady && !state.finalSolved);
  $("#evidence-btn").classList.toggle("ready", canDeduce());

  const objective = $("#objective-text");
  const hint = $("#soft-hint-text");
  objective.textContent = nextAction.objective;
  hint.textContent = nextAction.hint;
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
  if (hasEvidence("sandbox") && !hasEvidence("policy")) {
    showOnPolicyPuzzle();
    return;
  }
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
    if (button.dataset.signal === "verified") showOnPolicyPuzzle();
    else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("学生会认真追逐你发的每一枚章。若长文和碰铃就有奖，它当然会写满纸或直接翻墙。", 5600); }
  }));
}

function showOnPolicyPuzzle() {
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">调查点 04 · 当前学生试路台</div>
      <h2>要改进当前学生，就要看它自己会走到哪里</h2>
      <p class="modal-intro">奖章规则已经修好。现在选择由谁产生练习轨迹：旧教师的路线可以示范已知做法，但只有当前学生依据自己的判断试路，反馈才覆盖它真正会遇到的路口和错误。</p>
      <div class="deduction-options">
        <button class="deduction-option policy-route-choice" data-correct="false">永远重播教师多年前走过的固定路线，不让当前学生自己选择路口。</button>
        <button class="deduction-option policy-route-choice" data-correct="true">让当前学生在每次复原并随机变化的迷宫中自己选择路线；环境按终点、沿途进展和越线行为即时回章，再用这些新轨迹更新它。</button>
        <button class="deduction-option policy-route-choice" data-correct="false">由教师遥控学生每一步，但把最后成绩写在学生名下。</button>
      </div>
    </div>`);
  $$(".policy-route-choice").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.correct === "true") {
      if (!hasEvidence("sandbox")) state.evidence.push("sandbox");
      if (!hasEvidence("policy")) state.evidence.push("policy");
      saveState();
      toast("证物已归档：当前学生自主走出的迷宫路线与奖章册");
      closeModal();
    } else {
      button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong");
      toast("固定教师路线只能覆盖教师到过的地方。要改善当前策略，必须观察当前学生自己的选择会把它带到哪些状态。", 6200);
    }
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
  sandbox: ["04", "迷宫终点、沿途与越线奖章册", "当前学生自己产生新路线；练习城同时记录是否抵达、沿途进展与越线行为，不再奖励长文、翻墙或只重播教师旧轨迹。"],
  policy: ["04-B", "当前学生自己走出的新路线", "路线来自当前学生在随机变化迷宫中的实际选择，反馈覆盖它真正会到达的路口和错误，而不是教师旧轨迹。"],
  rules: ["05", "机械校规门", "名牌、额度与批条在进门前逐项检查；真城钥匙永远不进入学生试路的沙盘。"],
};

function evidenceCard(id) {
  const info = evidenceInfo[id];
  if (!hasEvidence(id)) return '<div class="evidence-card locked-card"><span class="card-no">未发现</span><h3>空证物袋</h3><p>继续调查训练大厅。</p></div>';
  return `<div class="evidence-card"><span class="card-no">EVIDENCE ${info[0]}</span><h3>${info[1]}</h3><p>${info[2]}</p></div>`;
}

function openEvidenceBoard() {
  const canCarriers = hasEvidence("syllabus") && hasEvidence("archive") && !hasDeduction("carriers");
  const canSignals = hasEvidence("imitation") && hasEvidence("sandbox") && hasEvidence("policy") && hasEvidence("rules") && !hasDeduction("signals");
  openModal(`
    <div class="modal-body">
      <div class="modal-kicker">EVIDENCE BOARD</div><h2>证物台</h2>
      <p class="modal-intro">先给教材分班，再决定哪些该临摹、哪些该进迷宫。最后，还要有一套谁都没提前看过的结业卷证明学生没有学会翻墙。</p>
      <div class="evidence-grid evidence-grid--case07">${["syllabus", "archive", "imitation", "sandbox", "policy", "rules"].map(evidenceCard).join("")}</div>
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
  const nextAction = getNextRequiredAction();
  if (nextAction.id === "complete") { showReveal(); return; }
  if (state.finalSolved) { state.finalSolved = false; saveState(); }
  if (nextAction.id === "policy") { showOnPolicyPuzzle(); return; }
  if (nextAction.id === "resume") {
    state.legacyCompletionPending = false;
    state.finalSolved = true;
    saveState();
    showReveal();
    return;
  }
  if (nextAction.id !== "final") {
    toast(nextAction.hint, 6200, true);
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
  $("#confirm-graduation").addEventListener("click", () => {
    state.legacyCompletionPending = false;
    state.finalSolved = true;
    saveState();
    showReveal();
  });
  $("#back-to-training").addEventListener("click", showTrainingPuzzle);
}

function showReveal() {
  openModal(`
    <div class="reveal-hero"><div class="modal-kicker">CASE CLOSED · 真相已解锁</div><h2>学校的问题不是教得太少，而是把不同责任都当成了同一种学习</h2>
      <p>你完成了两次不同的调查：上卷决定能力应该住在哪里，下卷才决定真正需要训练的能力应当怎样学习、验证、停止和恢复。</p>
      <p class="next-case-hook"><b>新增待查线索：</b>课程印刷台的纸带每天凌晨都会自行增加一页。来源栏只写着“梦档案 · 夜间经验汇总”，其中混入了未经核对的失败轨迹与偶然成功。第 08 案已登记：会做梦的档案馆。</p></div>
    ${window.EchoFeedback.renderCompletion("07")}
    <div class="case-reconstruction">
      <section class="reconstruction-block">
        <div class="reconstruction-heading"><span>上</span><h3>上卷：先决定能力该住在哪里</h3></div>
        <div class="evidence-replay">
          <article class="replay-card"><span>证物 01</span><b>四张退学单留下四种不同故障</b><p>昨日水位过时、长流程漏步、校规偶尔越界、陌生路线走不通，说明它们不是同一种能力缺口。</p></article>
          <article class="replay-card"><span>证物 02 + 分流表</span><b>你亲手为四类能力选择了不同住处</b><p>动态事实进入活档案，可语言化步骤进入随身手册，硬权限交给机械铁门，隐式判断才进入训练场。</p></article>
        </div>
        <p class="player-proof"><b>你作出的上卷判断：</b>训练不是默认升级路线。先看能力能否被外置成事实、策略或确定性规则，只有难以完整写出的隐式能力才优先进入参数训练。</p>
        <div class="causal-chain"><div class="causal-node">事实、流程、权限和隐式判断全部塞进身体</div><i class="causal-arrow">→</i><div class="causal-node">事实无法及时更新</div><i class="causal-arrow">→</i><div class="causal-node">流程只能临场回忆</div><i class="causal-arrow">→</i><div class="causal-node">硬规则变成概率习惯</div><i class="causal-arrow">→</i><div class="causal-node">熟悉示范无法解决陌生任务</div></div>
        <div class="repair-chain repair-chain--spaced"><div class="causal-node">动态事实 → 活档案</div><i class="causal-arrow">→</i><div class="causal-node">可语言化策略 → 随身手册</div><i class="causal-arrow">→</i><div class="causal-node">硬规则 → 机械铁门</div><i class="causal-arrow">→</i><div class="causal-node">隐式能力 → 临摹与试错训练</div></div>
      </section>
      <section class="reconstruction-block">
        <div class="reconstruction-heading"><span>下</span><h3>下卷：确实需要训练时，怎样形成可靠闭环</h3></div>
        <div class="evidence-replay">
          <article class="replay-card"><span>证物 03</span><b>你选择干净一致的样卷，并在格式稳定后停止临摹</b><p>临摹桌负责让每格可解析、按钮协议一致，而不是保存今日水位或替代铁门。</p></article>
          <article class="replay-card"><span>证物 04</span><b>你先修复奖励，再让当前学生自己产生新路线</b><p>迷宫记录终点、路径、沿途进展和越线；反馈覆盖当前学生真正会到达的状态，而非只重播教师旧路线。</p></article>
          <article class="replay-card"><span>证物 05</span><b>你保留机械校规门和低权限练习城</b><p>越权动作在执行前被确定拒绝，真实钥匙从未进入试错环境。</p></article>
          <article class="replay-card"><span>最终结业门</span><b>你排列训练闭环，并用陌生卷、怪天气、禁区和旧课复考</b><p>新能力、分布外任务、安全与旧能力全部通过后，才允许一间小教室有限值班。</p></article>
        </div>
        <p class="player-proof"><b>你作出的下卷判断：</b>先用示范稳定协议，再让当前策略在高保真、可重置环境中探索；奖励既看结果也看路径和阶段进展，最后必须通过独立回归。</p>
        <div class="causal-chain"><div class="causal-node">格式尚不稳定就直接试错</div><i class="causal-arrow">→</i><div class="causal-node">只重播教师旧路线</div><i class="causal-arrow">→</i><div class="causal-node">只奖终点，翻墙也能得分</div><i class="causal-arrow">→</i><div class="causal-node">真实高权限环境承担探索风险</div><i class="causal-arrow">→</i><div class="causal-node">课堂高分掩盖过拟合与遗忘</div></div>
        <div class="repair-chain repair-chain--spaced"><div class="causal-node">干净示范稳定协议</div><i class="causal-arrow">→</i><div class="causal-node">高保真沙盘中在轨探索</div><i class="causal-arrow">→</i><div class="causal-node">结果、路径与阶段信号共同奖励</div><i class="causal-arrow">→</i><div class="causal-node">留出、OOD、安全和遗忘回归</div><i class="causal-arrow">→</i><div class="causal-node">有限放行或停训恢复</div></div>
      </section>
    </div>
    <div class="term-map">
      <h3 class="term-map__title">现在，给上下两卷中亲手完成的决定命名</h3>
      <p class="term-map__intro">术语分别指回分流表、临摹桌、当前学生试路台、迷宫奖章册和独立结业考。</p>
      <div class="term-row"><span class="plain">四类教材分流到活档案、手册、铁门和训练场</span><span class="arrow">→</span><div><b>能力放置决策</b><small>对应动态事实 → RAG / 知识库，可语言化策略 → Prompt / Skill，硬规则 → 程序 / Harness，隐式判断 → 后训练。</small></div></div>
      <div class="term-row"><span class="plain">挑干净样卷，练到答卷稳定可读后停止临摹</span><span class="arrow">→</span><div><b>SFT · Supervised Fine-Tuning</b><small>监督微调用一致示范稳定输出结构、工具协议和表达风格；继续无限临摹旧题可能压缩探索空间。</small></div></div>
      <div class="term-row"><span class="plain">让当前学生自己试路，由环境验证终点与路径</span><span class="arrow">→</span><div><b>RL / RLVR 与 On-Policy Rollout</b><small>当前策略产生自己的轨迹并进入自己会遇到的状态；环境终态、规则检查和路径约束提供可机器验证奖励。</small></div></div>
      <div class="term-row"><span class="plain">拒绝长文奖与翻墙碰铃，为正确路口发小章</span><span class="arrow">→</span><div><b>奖励黑客、信用分配与稠密信号</b><small>奖励是代理目标，模型会利用漏洞；沿途小章把最终成败分配回具体步骤，使长任务中的有效进展和关键错误都能被学习。</small></div></div>
      <div class="term-row"><span class="plain">干净教材、可复原真城、陌生卷与旧课复考</span><span class="arrow">→</span><div><b>数据质量、环境保真与独立回归</b><small>训练收益必须通过留出、分布外、安全和灾难性遗忘回归；任何护栏失败都停止放行并恢复稳定版本。</small></div></div>
      <div class="formula"><b>本案完整映射：</b>能力放置审查 → SFT 稳定协议 → 可重置高保真环境 → 在轨探索与结果/路径/阶段信号 → 留出/OOD/安全/遗忘回归 → 有限放行 / 停训恢复<br><small>上卷先判断是否需要训练，下卷才讨论怎样训练；算法不能代替正确的数据、环境、验证器和权限边界。</small></div>
      <div class="action-row"><a class="action-btn primary" href="case08.html?from=case07">追查第 08 案</a><a class="action-btn" href="cases.html">返回案件目录</a><a class="action-btn" href="index.html">返回主页</a><button class="action-btn" id="open-final-archive">收入回声档案</button><button class="action-btn" data-close-modal>返回训练大厅</button></div>
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
      state = { ...initialState, evidence: [], deductions: [], started: true };
      closeModal();
      updateUI();
      showIntro();
    }
  });
}

function showHint() {
  toast(getNextRequiredAction().hint, 5400);
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
