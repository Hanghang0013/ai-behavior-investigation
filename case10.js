const STORAGE_KEY = "echo-archive-case-10";
const SAVE_VERSION = 2;
const initialState = { saveVersion: SAVE_VERSION, started: false, introSeen: false, bridgeSeen: false, evidence: [], deductions: [], finalSolved: false };
const evidenceIds = ["yun", "mia", "lan", "qiao", "score"]; const deductionIds = ["value", "coordination"];
let state = loadState(); let toastTimer; let toastLockUntil = 0; let planSelection = [];
const $ = (selector, root = document) => root.querySelector(selector); const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const cover = $("#cover"); const app = $("#app"); const modal = $("#modal"); const modalContent = $("#modal-content"); const dialogue = $("#dialogue");

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    let evidence = Array.isArray(parsed.evidence) ? parsed.evidence.filter((id) => evidenceIds.includes(id)) : [];
    let deductions = Array.isArray(parsed.deductions) ? parsed.deductions.filter((id) => deductionIds.includes(id)) : [];
    let finalSolved = Boolean(parsed.finalSolved);
    if ((parsed.saveVersion || 1) < SAVE_VERSION) {
      const old = Array.isArray(parsed.evidence) ? parsed.evidence : [];
      if (old.includes("topology") && old.includes("handoff")) evidence.push("score");
      deductions = []; finalSolved = false;
    }
    return { ...initialState, ...parsed, saveVersion: SAVE_VERSION, evidence: [...new Set(evidence)], deductions: [...new Set(deductions)], finalSolved };
  } catch { return { ...initialState, evidence: [], deductions: [] }; }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); updateUI(); }
function hasEvidence(id) { return state.evidence.includes(id); } function hasDeduction(id) { return state.deductions.includes(id); }
function collectEvidence(id, name) { if (!hasEvidence(id)) { state.evidence.push(id); saveState(); toast(`证物已归档：${name}`); } }
function unlockDeduction(id) { if (!hasDeduction(id)) { state.deductions.push(id); saveState(); } }
function witnessesReady() { return ["yun", "mia", "lan", "qiao"].every(hasEvidence); }
function solvedCount() { return [witnessesReady(), hasDeduction("value"), hasEvidence("score"), hasDeduction("coordination"), state.finalSolved].filter(Boolean).length; }
function canDeduce() { return (witnessesReady() && !hasDeduction("value")) || (hasDeduction("value") && hasEvidence("score") && !hasDeduction("coordination")); }

function nextAction() {
  if (!hasEvidence("yun")) return { id: "yun", objective: "先问云：北岸现实现在究竟是什么样。", hint: "点击 01：云只报告亲眼核对的水位、闸位和道路，不替别人判断任务进度。" };
  if (!hasEvidence("mia")) return { id: "mia", objective: "再问米娅：整件救援现在进行到哪里。", hint: "点击 02：米娅维护共同进度，但她的状态牌不能代替现场和执行回条。" };
  if (!hasEvidence("lan")) return { id: "lan", objective: "询问澜：哪份暴雨预案仍然有效，旧版流向了哪里。", hint: "点击 03：历史证据要带版本、来源和生效时间，不能让旧路线冒充当前方案。" };
  if (!hasEvidence("qiao")) return { id: "qiao", objective: "询问乔：哪些动作真的执行，哪些只是接到请求。", hint: "点击 04：乔保留工具回条和自己能使用哪些钥匙的记录，但不能自己宣布城市已经安全。" };
  if (!hasDeduction("value")) return { id: "value", objective: "四份证词已经齐全。去证物台判断为什么这次值得四个人协作。", hint: "每个人都带来了其他人没有的证据或钥匙；少一份都无法解释完整现实。" };
  if (!hasEvidence("score")) return { id: "score", objective: "在协作分谱桌上安排共享材料、行动钥匙和报告方式。", hint: "点击 05：共同目标与进度要共享，完整历史和危险钥匙只给真正需要的人。" };
  if (!hasDeduction("coordination")) return { id: "coordination", objective: "去证物台连接四份证词与协作分谱，决定怎样解决冲突。", hint: "一个总负责人维护共同任务牌；每位目击者交回带来源的局部证据，最后由没参与执行的人核对现实结果。" };
  if (!state.finalSolved) return { id: "final", objective: "重排从共同目标到城市三项现实结果的终案路线。", hint: "写清要看到的结果 → 分配最少必要工作 → 各自取证 → 报告冲突 → 统一行动 → 请没参与执行的人核对并停止。" };
  return { id: "complete", objective: "四份局部真话已经拼成同一份城市现实，北岸终案由现场结果收束。", hint: "十案知识卡已经全部接入回声档案。" };
}
function updateUI() {
  const count = solvedCount(); $("#progress-fill").style.width = `${count * 20}%`; $("#progress-text").textContent = `${count} / 5`; $("#evidence-count").textContent = `${state.evidence.length} 件证物`;
  const done = { witnesses: witnessesReady(), value: hasDeduction("value"), sharing: hasEvidence("score"), communication: hasDeduction("coordination"), final: state.finalSolved };
  const first = ["witnesses", "value", "sharing", "communication", "final"].find((id) => !done[id]);
  $$("#case-steps li").forEach((li) => { li.classList.toggle("complete", done[li.dataset.step]); li.classList.toggle("active", li.dataset.step === first); });
  $$('[data-hotspot]').forEach((spot) => spot.classList.toggle("done", spot.dataset.hotspot === "verify" ? state.finalSolved : hasEvidence(spot.dataset.hotspot)));
  const next = nextAction(); $("[data-hotspot='verify']").classList.toggle("locked", !["final", "complete"].includes(next.id)); $("#evidence-btn").classList.toggle("ready", canDeduce()); $("#objective-text").textContent = next.objective; $("#soft-hint-text").textContent = next.hint;
}
function startGame() { cover.classList.add("hidden"); app.classList.remove("hidden"); state.started = true; saveState(); if (!state.introSeen) showIntro(); }
const introLines = [
  { speaker: "云 · 北岸现场", portrait: "image/yun-portrait.png", text: "我能确认河闸保持在十八，北岸高架可通行，旧下穿道仍积水。但我看不到公众通知有没有真正送达。", choices: [{ label: "云只掌握现实现场。", next: 1 }] },
  { speaker: "米娅 · 任务记录员", portrait: "image/mia-portrait.png", text: "我的进度牌写着：河闸已核对、路线待确认、通知仍在发送。可有人把‘已接单’抄成了‘已送达’。", choices: [{ label: "米娅只掌握任务过程。", next: 2 }] },
  { speaker: "澜 · 总索引员", portrait: "image/lan-portrait.png", text: "现行预案是 R19，走北岸高架；两支队伍仍拿着旧版 R17，准备进入积水下穿道。", choices: [{ label: "澜只掌握历史与版本。", next: 3 }] },
  { speaker: "乔 · 夜班调度员", portrait: "image/qiao-portrait.png", text: "我有河闸和广播台的执行回条。河闸保持令已完成，通知却只收到回查号，还没有终端收件证据。", choices: [{ label: "乔只掌握执行与回条。", next: 4 }] },
  { speaker: "回声七号 · 联合记录终端", portrait: "image/echo7-portrait.png", text: "四个人都说了真话，却没人单独拥有完整答案。请决定他们该共享什么、谁能动哪把钥匙、冲突怎样回传，以及谁有权宣布城市安全。", choices: [{ label: "开始四证联合调查 →", action: "close" }] },
];
const bridgeLines = [
  { speaker: "回声七号 · 调度回声", portrait: "image/echo7-portrait.png", text: "第九案已经把四路回声合成 R19。但它发往各部门后被拆成了现场、进度、历史和执行四份局部记录。", choices: [{ label: "时间已经对齐，部门仍看不见彼此缺少什么。", next: 1 }] },
  { speaker: "云 · 北岸现场", portrait: "image/yun-portrait.png", text: "这次不是让四个人重复一份摘要。请让我们各自带回独立证据，再用一张共同任务牌拼出城市结果。", choices: [{ label: "进入四证联合调查厅 →", action: "close" }] },
];
function showIntro() { showDialogue(introLines, 0, () => { state.introSeen = true; saveState(); }); } function showBridge() { showDialogue(bridgeLines, 0, () => { state.bridgeSeen = true; state.introSeen = true; saveState(); }); }
function showDialogue(lines, index = 0, done = () => {}) { const line = lines[index]; $("#dialogue-speaker").textContent = line.speaker; $("#dialogue-text").textContent = line.text; $("#dialogue-portrait").src = line.portrait; $("#dialogue-portrait").alt = line.speaker; const choices = $("#dialogue-choices"); choices.innerHTML = ""; line.choices.forEach((choice) => { const button = document.createElement("button"); button.className = "choice-btn"; button.textContent = choice.label; button.addEventListener("click", () => { if (choice.action === "close") { dialogue.classList.add("hidden"); done(); } else showDialogue(lines, choice.next, done); }); choices.appendChild(button); }); dialogue.classList.remove("hidden"); }
function openModal(html) { modalContent.innerHTML = html; modal.classList.remove("hidden"); const card = modal.querySelector(".modal__card"); card.scrollTop = 0; modalContent.setAttribute("tabindex", "-1"); requestAnimationFrame(() => { card.scrollTop = 0; modalContent.focus({ preventScroll: true }); }); } function closeModal() { modal.classList.add("hidden"); }
function toast(message, duration = 2800, lock = false) { const el = $("#toast"); const now = Date.now(); if (now < toastLockUntil && !lock) return; if (lock) toastLockUntil = now + duration; el.textContent = message; el.classList.toggle("toast--error", lock); el.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.classList.remove("show", "toast--error"); if (Date.now() >= toastLockUntil) toastLockUntil = 0; }, duration); }

function witnessModal({ id, speaker, portrait, title, fact, limit, decision, name }) {
  const solved = hasEvidence(id);
  openModal(`<div class="modal-body"><div class="modal-kicker">目击者证词 · ${speaker}</div><h2>${title}</h2><div class="clue-visual"><div class="choir-grid"><div class="choir-card"><span>亲眼或亲手掌握</span><b>${fact}</b></div><div class="choir-card"><span>这份证词不能证明</span><b>${limit}</b></div><div class="choir-card"><span>应交回共同任务牌</span><b>${decision}</b></div></div></div>${solved ? `<div class="evidence-tag">${name}已经归档</div>` : `<div class="action-row"><button class="action-btn primary" id="record-witness">记录这份局部证词</button></div>`}</div>`);
  $("#record-witness")?.addEventListener("click", () => { collectEvidence(id, name); closeModal(); });
}
function investigateYun() { witnessModal({ id: "yun", speaker: "云", portrait: "image/yun-portrait.png", title: "现实已经改变，但只改变了其中一部分", fact: "22:19 连续两次现场读数：河闸 18%，水位稳定；北岸高架可通，旧下穿道积水。", limit: "公众通知是否送达，也不能证明救援队已经换走 R17 旧路线。", decision: "现实读数、拍摄时刻、地点与尚未核对的两项结果。", name: "云的北岸现实读数" }); }
function investigateMia() { witnessModal({ id: "mia", speaker: "米娅", portrait: "image/mia-portrait.png", title: "共同进度牌能说到哪一步，不能替现实说完成", fact: "任务 R19：河闸已核对；路线待两队回报；通知已接单、仍在发送。", limit: "进度牌上的文字不能证明道路能走，也不能证明市民终端收到通知。", decision: "每项任务的负责人、当前状态、缺少证据和下一步。", name: "米娅的 R19 进度牌" }); }
function investigateLan() { witnessModal({ id: "lan", speaker: "澜", portrait: "image/lan-portrait.png", title: "两份都是真预案，只有一份仍在生效", fact: "R19 于 22:13 生效，改走北岸高架；R17 已过期，但仍被两支队伍持有。", limit: "哪支队伍已经读到新预案，也不能亲自改变道路和河闸。", decision: "现行版本、旧版去向、来源原页与需要追回的两份副本。", name: "澜的预案版本与流向表" }); }
function investigateQiao() { witnessModal({ id: "qiao", speaker: "乔", portrait: "image/qiao-portrait.png", title: "执行回条证明动作到哪一步，不证明整座城市安全", fact: "河闸保持令已完成；广播任务 B-204 只返回‘已接单’，尚无市民终端收件条。", limit: "路线版本是否正确，也不能自己决定、执行并宣布最后成功。", decision: "动作编号、许可人、进行状态、完成回条与仍需别人核对的结果。", name: "乔的执行回条与钥匙表" }); }

function investigateScore() {
  const solved = hasEvidence("score");
  openModal(`<div class="modal-body"><div class="modal-kicker">调查点 05 · 协作分谱桌</div><h2>共同目标要共享，证据与钥匙不能全部混在一起</h2><p class="modal-intro">选择一份能让四位目击者合作、又不抹掉各自证据边界的安排。</p><div class="clue-visual"><div class="collab-choices">
    <button class="collab-choice" data-score-choice="all" ${solved ? "disabled" : ""}><b>安排 A · 四人共看全部历史，并各持河闸、路线和广播的所有钥匙</b><small>消息越多越难找到当前任务，任何人也都能越过自己的证据范围行动。</small></button>
    <button class="collab-choice" data-score-choice="summary" ${solved ? "disabled" : ""}><b>安排 B · 先让一个人写总摘要，其余三人只对摘要投票</b><small>独立来源和冲突被摘要抹平，多了人数却没有多出新证据。</small></button>
    <button class="collab-choice" data-score-choice="bounded" ${solved ? "disabled" : ""}><b>安排 C · 共用 R19 任务牌，各自保留原始证据和必要钥匙</b><small>云核现实、米娅管进度、澜管版本、乔得到许可后执行；回报都写任务号、版本、来源、当前情况和没解决的问题，由调查员统一处理。</small></button>
  </div></div>${solved ? '<div class="evidence-tag">四证分工、共享范围与钥匙表已经归档</div>' : ""}</div>`);
  $$('[data-score-choice]').forEach((button) => button.addEventListener("click", () => { if (button.dataset.scoreChoice === "bounded") { collectEvidence("score", "四证分工、共享范围与钥匙表"); closeModal(); } else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("检查这份安排是否保留了四种独立证据、限制了危险钥匙，并让冲突能回到同一张任务牌。", 6800); } }));
}

const evidenceInfo = {
  yun: ["01", "云 · 现实", "河闸 18%、水位稳定、高架可通、旧下穿道积水；通知仍未知。"],
  mia: ["02", "米娅 · 进度", "河闸已核对，路线待回报，通知只到已接单；每项都写着缺少的证据。"],
  lan: ["03", "澜 · 历史", "R19 改走高架，R17 已过期却仍流向两队；保留来源与版本流向。"],
  qiao: ["04", "乔 · 执行", "河闸动作完成；广播 B-204 只接单。执行钥匙与最后核对分开。"],
  score: ["05", "四证协作分谱", "共用目标、版本和进度；原始证据与危险钥匙按职责分开，回报带来源和未决问题。"],
};
function evidenceCard(id) { const info = evidenceInfo[id]; return hasEvidence(id) ? `<div class="evidence-card"><span class="card-no">EVIDENCE ${info[0]}</span><h3>${info[1]}</h3><p>${info[2]}</p></div>` : '<div class="evidence-card locked-card"><span class="card-no">未发现</span><h3>空证物袋</h3><p>继续询问四位目击者。</p></div>'; }
function openEvidenceBoard() {
  const canValue = witnessesReady() && !hasDeduction("value"); const canCoordinate = hasDeduction("value") && hasEvidence("score") && !hasDeduction("coordination");
  openModal(`<div class="modal-body"><div class="modal-kicker">EVIDENCE BOARD</div><h2>四证拼图台</h2><p class="modal-intro">四份证词都是真的，但每份都有清楚边界。把新证据、行动钥匙、共同进度和最后核对放回正确位置。</p><div class="evidence-grid evidence-grid--case10">${Object.keys(evidenceInfo).map(evidenceCard).join("")}</div>${canValue ? valueDeduction() : ""}${canCoordinate ? coordinationDeduction() : ""}${!canValue && !canCoordinate ? `<div class="deduction"><h3>已确认关系</h3><p class="modal-intro">${deductionSummary()}</p></div>` : ""}</div>`);
  $$('[data-deduction]').forEach((button) => button.addEventListener("click", handleDeduction));
}
function valueDeduction() { return `<div class="deduction"><h3>连接 01–04：为什么这次四个人真的比一个人更有价值？</h3><div class="deduction-options"><button class="deduction-option" data-deduction="value" data-correct="false">因为四票比一票更容易形成多数。</button><button class="deduction-option" data-deduction="value" data-correct="true">因为四人分别带来现场、进度、历史与执行证据，并持有不同钥匙；少任何一份，都无法解释城市是否完成三项目标。</button><button class="deduction-option" data-deduction="value" data-correct="false">因为四人阅读同一份摘要后会比一个人更有信心。</button></div></div>`; }
function coordinationDeduction() { return `<div class="deduction"><h3>连接 01–05：怎样让局部真话拼成一项可靠行动？</h3><div class="deduction-options"><button class="deduction-option" data-deduction="coordination" data-correct="false">把全部记录和所有钥匙交给四个人自由讨论，谁先行动就听谁。</button><button class="deduction-option" data-deduction="coordination" data-correct="true">调查员维护共同 R19 任务牌，四人按最小任务包取证或执行；回报带来源、状态和未决问题，冲突回到调查员，最后由未参与执行的现场核对决定完成。</button><button class="deduction-option" data-deduction="coordination" data-correct="false">让乔执行完所有动作后自行宣布安全，其余证词只留档。</button></div></div>`; }
function handleDeduction(event) { const button = event.currentTarget; if (button.dataset.correct === "true") { unlockDeduction(button.dataset.deduction); window.EchoFeedback.showMastery("10", button.dataset.deduction, openModal, closeModal); } else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("再检查：这个安排是否真的增加独立证据，是否限制危险钥匙，冲突由谁收束，最终又由哪份现实作证。", 6500); } }
function deductionSummary() { const items = []; if (hasDeduction("value")) items.push("第一条联合令：只有带来新证据、真正同时开工或不同钥匙时，多一个人才能增加价值。"); if (hasDeduction("coordination")) items.push("第二条联合令：共享目标与进度，分开原始证据和钥匙；协调者收束冲突，独立现实核对者决定完成。"); return items.join("<br>") || "收齐对应证物后才能建立联系。"; }

const planPieces = [
  { id: "goal", text: "先在 R19 任务牌写清必须看到的三个结果：河闸与水位安全、救援队走可通高架、公众终端真正收到通知" },
  { id: "assign", text: "云核现实、米娅管进度、澜查版本、乔得到许可后执行；每人只拿必要材料和钥匙" },
  { id: "gather", text: "四人分别取证并可同时开工，原始读数、来源页和执行回条保留在各自证物袋" },
  { id: "report", text: "回报只传任务号、R19、事实、来源、当前状态与未决问题；冲突和旧版流向交回调查员" },
  { id: "resolve", text: "调查员追回两份 R17，确认改走高架，并批准乔重发带 R19 的公众通知" },
  { id: "verify", text: "由云和市民终端独立核对三项现实结果；全部通过才停止，任何缺项就继续、取消或恢复" },
];
function validOrder(order) { return order.join(",") === "goal,assign,gather,report,resolve,verify"; }
function shuffled() { const parts = [...planPieces]; for (let i = parts.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [parts[i], parts[j]] = [parts[j], parts[i]]; } if (validOrder(parts.map((part) => part.id))) [parts[0], parts[5]] = [parts[5], parts[0]]; return parts; }
function investigateVerify() { const next = nextAction(); if (next.id === "complete") return showReveal(); if (next.id !== "final") return toast(next.hint, 6500, true); showPlanPuzzle(); }
function showPlanPuzzle() { planSelection = []; openModal(`<div class="modal-body"><div class="modal-kicker">FINAL PLAN · 城市核对台</div><h2>把四份局部真话拼成一条能由现实检查的城市行动</h2><p class="modal-intro">按顺序点击六张手续卡。人多不是答案；新证据、清楚分工、明确回报和由别人核对现实结果缺一不可。</p><div class="score-board" id="plan-board"><div class="score-slots">${planPieces.map((_, index) => `<div class="score-slot" data-plan-slot="${index}">${String(index + 1).padStart(2, "0")}</div>`).join("")}</div><div class="score-pieces">${shuffled().map((part) => `<button class="score-piece" data-plan-piece="${part.id}">${part.text}</button>`).join("")}</div></div><div class="action-row"><button class="action-btn" id="plan-reset">重新排列</button><button class="action-btn primary" id="plan-submit">提交联合行动</button></div></div>`); $$('[data-plan-piece]').forEach((button) => button.addEventListener("click", () => selectPlan(button))); $("#plan-reset").addEventListener("click", showPlanPuzzle); $("#plan-submit").addEventListener("click", submitPlan); }
function selectPlan(button) { if (button.classList.contains("used")) return; const id = button.dataset.planPiece; planSelection.push(id); button.classList.add("used"); const slot = $(`[data-plan-slot='${planSelection.length - 1}']`); slot.textContent = planPieces.find((part) => part.id === id).text; slot.classList.add("filled"); }
function submitPlan() { if (planSelection.length < planPieces.length) return toast("联合行动还缺少手续。", 4500, true); if (!validOrder(planSelection)) { const board = $("#plan-board"); board.classList.remove("wrong"); void board.offsetWidth; board.classList.add("wrong"); return toast("先写清必须看到的结果并分配工作，再各自取证和报告冲突；统一行动以后，仍要由没参与执行的人核对现实再决定停止。", 8000, true); } showVerification(); }
function showVerification() { openModal(`<div class="modal-body"><div class="modal-kicker">CITY REPLY · 城市现实结果</div><h2>四份证词第一次指向同一个现实</h2><div class="ensemble-check"><span><b>河闸与水位</b><small>18% 安全闸位，连续读数稳定</small></span><span><b>救援路线</b><small>两队已交回 R17，按 R19 走北岸高架</small></span><span><b>公众通知</b><small>B-204R 已由三个市民终端确认收到</small></span><span><b>剩余任务</b><small>无未决冲突，危险钥匙已收回</small></span></div><div class="formula"><b>现实结果：</b>云的现场读数、米娅的共同进度、澜的版本流向和乔的执行回条互相补全；三项城市检查全部通过，其他行动已经停止。</div><div class="action-row"><button class="action-btn primary" id="confirm-case">以城市现实完成十案</button><button class="action-btn" id="back-plan">返回联合行动</button></div></div>`); $("#confirm-case").addEventListener("click", () => { state.finalSolved = true; saveState(); showReveal(); }); $("#back-plan").addEventListener("click", showPlanPuzzle); }

function showReveal() { openModal(`<div class="reveal-hero"><div class="modal-kicker">CASE CLOSED · 第一卷终章</div><h2>四位目击者没有说谎，错的是把局部真话当成了完整答案</h2><p>你没有让四个人重复同一份摘要，而是保留现场、进度、历史和执行四种独立证据；共同任务牌只共享行动所需内容，危险钥匙留在明确边界内，最后由城市现实决定完成。</p><p class="next-case-hook"><b>回声网络修复记录：</b>从第一个错误的“已经送达”，到四位目击者共同证明的城市现实结果，十处节点重新亮起。调查局第一卷正式归档。</p></div>
  <div class="case-reconstruction"><section class="reconstruction-block"><div class="reconstruction-heading"><span>证</span><h3>关键证物与玩家判断回放</h3></div><div class="evidence-replay"><article class="replay-card"><span>证物 01–04</span><b>四位目击者分别补上一块缺口</b><p>你通过现场、进度、版本与执行回条，证明了这次协作会产生一个人没有的新证据。</p></article><article class="replay-card"><span>证物 05 + 联合令</span><b>共同任务牌与分开的证物袋、钥匙</b><p>你证明了共享全部历史和权限会制造混乱；只共享行动所需内容，冲突才能被收束。</p></article></div></section>
  <section class="reconstruction-block"><div class="reconstruction-heading"><span>因</span><h3>错误怎样发生，又怎样被修好</h3></div><div class="evidence-replay"><article class="replay-card"><span>材料</span><b>R17、R19、进度和回条散落在不同人手里</b><p>局部事实没有共同任务号、当前版本和缺失项。</p></article><article class="replay-card"><span>城市现场</span><b>河闸、道路和市民终端是三项不同现实</b><p>其中一项正常，不能证明整座城市已经安全。</p></article><article class="replay-card"><span>四位目击者</span><b>每个人都说出真实但局部的结论</b><p>重复转述不能自动发现证据缺口和版本冲突。</p></article><article class="replay-card"><span>联合办事规则</span><b>缺少共享范围、钥匙保管、冲突处理和最后核对的负责人</b><p>接单被冒充成完成，也没人阻止旧预案继续流转。</p></article></div><div class="repair-chain"><div class="causal-node">写清现实结果</div><i class="causal-arrow">→</i><div class="causal-node">只分必要工作</div><i class="causal-arrow">→</i><div class="causal-node">回报附上来处</div><i class="causal-arrow">→</i><div class="causal-node">由别人核对现实</div></div></section></div>${window.EchoFeedback.renderCompletion("10")}
  <div class="term-map"><h3 class="term-map__title">给你刚才每一步行动命名</h3><p class="term-map__intro">左边是你实际做过的事，右边只给这一项行为对应的专业名称。</p><div class="term-row"><span class="plain">确认四个人分别带来现场、进度、历史和执行的新证据</span><span class="arrow">→</span><div><b>多 Agent 价值边界</b><small>对应连接证物 01–04 的人数价值判断。</small></div></div><div class="term-row"><span class="plain">每个人只拿完成自己任务所需的材料和钥匙</span><span class="arrow">→</span><div><b>上下文隔离</b><small>对应协作分谱选择安排 C。</small></div></div><div class="term-row"><span class="plain">调查员维护共同任务牌，并负责解决四方冲突</span><span class="arrow">→</span><div><b>协作拓扑</b><small>对应第二条联合令与最终路线的总负责人。</small></div></div><div class="term-row"><span class="plain">回报写清任务号、版本、事实、来源、状态和未决问题</span><span class="arrow">→</span><div><b>结构化通信</b><small>对应最终路线中选择统一回报内容。</small></div></div><div class="term-row"><span class="plain">四人交回证据，把 R17 冲突转交调查员继续处理</span><span class="arrow">→</span><div><b>任务交接 · Handoff</b><small>对应最终路线中回收旧预案并转交未决问题。</small></div></div><div class="term-row"><span class="plain">乔执行以后，由云和市民终端核对三个现实结果</span><span class="arrow">→</span><div><b>独立验证</b><small>对应最终路线的最后一步和城市现实回读。</small></div></div><div class="formula"><b>停止条件：</b>河闸水位、救援路线、公众通知三项现实全部通过，冲突清零、危险钥匙收回；任何一项未知都只能继续、取消或恢复。</div>
  <section class="transfer-check" data-transfer-check data-success="协作成立：四人各自提供库存、温度、订单和付款证据，共享同一批次目标与进度；只有冷链实测、包裹交接和付款回条全部通过才发货。" data-failure="先问每个人是否带来不同证据或钥匙，再检查他们共享了什么、谁收束冲突，以及最后由哪项现实证明完成。"><span class="transfer-check__kicker">TRANSFER CHECK · 换一个冷链仓库</span><h3>库管、温控员、订单员和付款员要共同放行一批疫苗，哪套安排最可靠？</h3><div class="transfer-options"><button class="transfer-option" data-transfer-option>四人都读同一份摘要并投票，多数同意就发货。</button><button class="transfer-option" data-transfer-option data-correct="true">四人分别核对库存、实测温度、订单与付款，共享批次目标和缺失项；调度员收束冲突，只有冷链实测、包裹交接和付款回条全部通过才发货。</button><button class="transfer-option" data-transfer-option>把仓门、温控和付款钥匙都交给最先完成检查的人。</button></div><p class="transfer-feedback" aria-live="polite">选择一项，检验你能否把四证协作带到新现场。</p></section><div class="action-row"><a class="action-btn primary" href="cases.html">返回十案目录</a><a class="action-btn" href="index.html">返回主页</a><button class="action-btn" id="open-final-archive">收入回声档案</button><button class="action-btn" data-close-modal>返回联合调查厅</button></div></div>`); $("#open-final-archive").addEventListener("click", openArchive); window.EchoFeedback.bindTransfer(modalContent); $$('[data-close-modal]', modalContent).forEach((button) => button.addEventListener("click", closeModal)); }
function openArchive() { closeModal(); openModal(window.EchoArchive.render("10")); $("#reset-case")?.addEventListener("click", () => { if (confirm("确定清空案件 10 的进度并重新调查吗？")) { localStorage.removeItem(STORAGE_KEY); state = { ...initialState, evidence: [], deductions: [], started: true }; closeModal(); updateUI(); showIntro(); } }); }
$("#start-btn").addEventListener("click", startGame); $("#cover-archive-btn").addEventListener("click", () => { cover.classList.add("hidden"); app.classList.remove("hidden"); state.started = true; saveState(); openArchive(); }); $("#archive-btn").addEventListener("click", openArchive); $("#evidence-btn").addEventListener("click", openEvidenceBoard); $("#hint-btn").addEventListener("click", () => toast(nextAction().hint, 5400)); $$('[data-close-modal]').forEach((element) => element.addEventListener("click", closeModal));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeModal(); dialogue.classList.add("hidden"); } });
const actions = { yun: investigateYun, mia: investigateMia, lan: investigateLan, qiao: investigateQiao, score: investigateScore, verify: investigateVerify }; $$('[data-hotspot]').forEach((button) => button.addEventListener("click", () => actions[button.dataset.hotspot]()));
const continuing = new URLSearchParams(window.location.search).get("from") === "case09"; if (state.started || continuing) { cover.classList.add("hidden"); app.classList.remove("hidden"); } if (continuing) { state.started = true; saveState(); if (!state.bridgeSeen) showBridge(); else if (!state.introSeen) showIntro(); } else updateUI();
