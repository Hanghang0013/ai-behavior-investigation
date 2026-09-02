const STORAGE_KEY = "echo-archive-case-09";
const SAVE_VERSION = 2;
const initialState = { saveVersion: SAVE_VERSION, started: false, introSeen: false, bridgeSeen: false, evidence: [], deductions: [], finalSolved: false };
const evidenceIds = ["audio", "visual", "machine", "interrupt", "sync"];
const deductionIds = ["order", "sync"];
let state = loadState(); let toastTimer; let toastLockUntil = 0; let routeSelection = [];
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
      if (old.includes("stream")) evidence.push("audio");
      if (old.includes("bridge")) evidence.push("sync");
      deductions = []; finalSolved = false;
    }
    return { ...initialState, ...parsed, saveVersion: SAVE_VERSION, evidence: [...new Set(evidence)], deductions: [...new Set(deductions)], finalSolved };
  } catch { return { ...initialState, evidence: [], deductions: [] }; }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); updateUI(); }
function hasEvidence(id) { return state.evidence.includes(id); } function hasDeduction(id) { return state.deductions.includes(id); }
function collectEvidence(id, name) { if (!hasEvidence(id)) { state.evidence.push(id); saveState(); toast(`证物已归档：${name}`); } }
function unlockDeduction(id) { if (!hasDeduction(id)) { state.deductions.push(id); saveState(); } }
function arrivalsReady() { return ["audio", "visual", "machine", "interrupt"].every(hasEvidence); }
function solvedCount() { return [arrivalsReady(), hasDeduction("order"), hasEvidence("sync"), hasDeduction("sync"), state.finalSolved].filter(Boolean).length; }
function canDeduce() { return (arrivalsReady() && !hasDeduction("order")) || (hasDeduction("order") && hasEvidence("sync") && !hasDeduction("sync")); }

function nextAction() {
  if (!hasEvidence("audio")) return { id: "audio", objective: "查清第一道开闸口令何时说出、何时被听见。", hint: "点击 01：一条口令要同时保留说出时刻、到达时刻、内容和来处。" };
  if (!hasEvidence("visual")) return { id: "visual", objective: "查清暴雨画面拍摄于何时，又迟到了多久。", hint: "点击 02：画面到得晚，不代表画面里的事情发生得晚。" };
  if (!hasEvidence("machine")) return { id: "machine", objective: "区分闸机收到命令与闸门真的停在目标位置。", hint: "点击 03：接单回条只能证明开始处理，闸位读数才能证明现实结果。" };
  if (!hasEvidence("interrupt")) return { id: "interrupt", objective: "找回值班员要求停止继续开闸的打断记录。", hint: "点击 04：打断一旦发生，后来到达的旧画面也不能让旧命令复活。" };
  if (!hasDeduction("order")) return { id: "order", objective: "四路记录已经齐全。去证物台还原事情真正发生的先后。", hint: "不要按消息出现在屏幕上的顺序排；先看每件事自身的发生时刻。" };
  if (!hasEvidence("sync")) return { id: "sync-evidence", objective: "检查快回应与慢核对是否共用同一块最新状态牌。", hint: "点击 05：快路先接住打断，慢路只依据最新编号继续，旧编号的结果要作废。" };
  if (!hasDeduction("sync")) return { id: "sync", objective: "去证物台判断打断后，快路与慢路怎样避免各说各话。", hint: "两条路可以一快一慢，但必须共用当前要求、当前编号和完成门。" };
  if (!state.finalSolved) return { id: "final", objective: "重建从四路到达到北岸现实确认的完整路线。", hint: "记下发生和到达时间 → 拼出眼前情况 → 先接住新要求 → 再仔细核对 → 旧答案作废 → 确认现实结果。" };
  return { id: "complete", objective: "四路回声已经按真实先后合流，旧口令无法越过新打断，北岸现实重新拥有结案权。", hint: "正式知识卡已收入回声档案。" };
}
function updateUI() {
  const count = solvedCount(); $("#progress-fill").style.width = `${count * 20}%`; $("#progress-text").textContent = `${count} / 5`; $("#evidence-count").textContent = `${state.evidence.length} 件证物`;
  const done = { arrivals: arrivalsReady(), order: hasDeduction("order"), paths: hasEvidence("sync"), interrupt: hasDeduction("sync"), final: state.finalSolved };
  const first = ["arrivals", "order", "paths", "interrupt", "final"].find((id) => !done[id]);
  $$("#case-steps li").forEach((li) => { li.classList.toggle("complete", done[li.dataset.step]); li.classList.toggle("active", li.dataset.step === first); });
  $$('[data-hotspot]').forEach((spot) => spot.classList.toggle("done", spot.dataset.hotspot === "confirm" ? state.finalSolved : hasEvidence(spot.dataset.hotspot)));
  const next = nextAction(); $("[data-hotspot='confirm']").classList.toggle("locked", !["final", "complete"].includes(next.id)); $("#evidence-btn").classList.toggle("ready", canDeduce()); $("#objective-text").textContent = next.objective; $("#soft-hint-text").textContent = next.hint;
}
function startGame() { cover.classList.add("hidden"); app.classList.remove("hidden"); state.started = true; saveState(); if (!state.introSeen) showIntro(); }
const introLines = [
  { speaker: "云 · 北岸现场", portrait: "image/yun-portrait.png", text: "应急画面拍到水位上涨，语音席随后要求开闸三成。可画面走了慢线，抵达调度厅时，值班员已经喊过‘停止继续开闸’。", choices: [{ label: "屏幕上的先后，不一定是事情的先后。", next: 1 }] },
  { speaker: "回声七号 · 调度回声", portrait: "image/echo7-portrait.png", text: "我先听见开闸口令，就回答‘正在执行’。慢画面后来抵达，我又把它当成新情况；人的打断虽然更早发生，却没有写进慢路正在看的状态牌。", choices: [{ label: "快回应和慢核对看见了不同的现在。", next: 2 }] },
  { speaker: "乔 · 闸机值守", portrait: "image/qiao-portrait.png", text: "闸机回条只说‘已接单’，不是‘已经到位’。旧口令仍在路上时，谁都不能拿一句回答代替最终闸位。", choices: [{ label: "最后仍要看现实读数。", next: 3 }] },
  { speaker: "云 · 北岸现场", portrait: "image/yun-portrait.png", text: "请收齐四路时钟，按事情发生的时刻还原现场，再让快路、慢路和闸机共用同一块最新状态牌。", choices: [{ label: "进入北岸回声调度厅 →", action: "close" }] },
];
const bridgeLines = [
  { speaker: "澜 · 梦档案保管员", portrait: "image/lan-portrait.png", text: "档案馆已经停止夜里乱改馆规。恢复的原始经历卷却显示：同一秒里，语音、画面、闸位和人工打断被写成了四种不同的‘现在’。", choices: [{ label: "第八案保住了记录，第九案要还原时间。", next: 1 }] },
  { speaker: "云 · 北岸现场", portrait: "image/yun-portrait.png", text: "暴雨正在逼近。不能再按谁先到屏幕就先信谁，也不能让慢路带着旧要求继续工作。", choices: [{ label: "校准四路时钟 →", action: "close" }] },
];
function showIntro() { showDialogue(introLines, 0, () => { state.introSeen = true; saveState(); }); } function showBridge() { showDialogue(bridgeLines, 0, () => { state.bridgeSeen = true; state.introSeen = true; saveState(); }); }
function showDialogue(lines, index = 0, done = () => {}) { const line = lines[index]; $("#dialogue-speaker").textContent = line.speaker; $("#dialogue-text").textContent = line.text; $("#dialogue-portrait").src = line.portrait; $("#dialogue-portrait").alt = line.speaker; const choices = $("#dialogue-choices"); choices.innerHTML = ""; line.choices.forEach((choice) => { const button = document.createElement("button"); button.className = "choice-btn"; button.textContent = choice.label; button.addEventListener("click", () => { if (choice.action === "close") { dialogue.classList.add("hidden"); done(); } else showDialogue(lines, choice.next, done); }); choices.appendChild(button); }); dialogue.classList.remove("hidden"); }
function openModal(html) { modalContent.innerHTML = html; modal.classList.remove("hidden"); const card = modal.querySelector(".modal__card"); card.scrollTop = 0; modalContent.setAttribute("tabindex", "-1"); requestAnimationFrame(() => { card.scrollTop = 0; modalContent.focus({ preventScroll: true }); }); } function closeModal() { modal.classList.add("hidden"); }
function toast(message, duration = 2800, lock = false) { const el = $("#toast"); const now = Date.now(); if (now < toastLockUntil && !lock) return; if (lock) toastLockUntil = now + duration; el.textContent = message; el.classList.toggle("toast--error", lock); el.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.classList.remove("show", "toast--error"); if (Date.now() >= toastLockUntil) toastLockUntil = 0; }, duration); }
function evidenceChoice({ kicker, title, intro, id, name, choices }) { const solved = hasEvidence(id); openModal(`<div class="modal-body"><div class="modal-kicker">${kicker}</div><h2>${title}</h2><p class="modal-intro">${intro}</p><div class="clue-visual"><div class="realtime-choices">${choices.map((choice) => `<button class="realtime-choice" data-choice="${choice.id}" ${solved ? "disabled" : ""}><b>${choice.title}</b><small>${choice.body}</small></button>`).join("")}</div></div>${solved ? `<div class="evidence-tag">${name}已经归档</div>` : ""}</div>`); $$('[data-choice]').forEach((button) => button.addEventListener("click", () => { const choice = choices.find((item) => item.id === button.dataset.choice); if (choice.correct) { collectEvidence(id, name); closeModal(); } else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast(choice.feedback, 6500); } })); }

function investigateAudio() { evidenceChoice({ kicker: "调查点 01 · 语音回声钟", title: "一句口令至少有两个时刻", intro: "语音席在 22:14:08.0 说出‘开到三成’，调度厅在 22:14:08.2 听见。哪张记录能在事后还原它？", id: "audio", name: "带双时间与来处的语音条", choices: [
  { id: "arrival", title: "只记 22:14:08.2 · 收到开闸消息", body: "不知道消息何时说出，也无法与别路记录对齐。", feedback: "只记到达时刻，会把路上等待误当成事情发生得晚。" },
  { id: "text", title: "只记‘开到三成’", body: "内容还在，时间、说话者和对应任务都丢了。", feedback: "一句没有时刻和来处的话，无法安全改变正在进行的城市任务。" },
  { id: "both", title: "说出 22:14:08.0 · 到达 22:14:08.2 · 语音席 · 开到三成", body: "同时保留发生、到达、来处、任务和原始片段位置。", correct: true },
] }); }
function investigateVisual() { evidenceChoice({ kicker: "调查点 02 · 画面延时屏", title: "迟到的画面可能来自更早的现实", intro: "北岸画面在 22:14:07.8 拍到水位上涨，却到 22:14:10.8 才送达。应该怎样把它放进事件列？", id: "visual", name: "迟到三秒的画面封条", choices: [
  { id: "late", title: "把它当作 22:14:10.8 才发生的新水位变化", body: "画面到得晚，就被误当成事情发生得晚。", feedback: "这会让一张旧画面覆盖后来发生的人工打断。先看拍摄时刻，再看它何时送达。" },
  { id: "drop", title: "画面迟到了，直接丢弃", body: "丢掉了水位变化的环境证据，也无法解释旧口令为何产生。", feedback: "迟到不等于无用。它仍能解释早先判断，只是不能冒充当前现实。" },
  { id: "stamp", title: "按拍摄时刻放回 22:14:07.8，并标出到达晚了三秒", body: "它能解释开闸口令，却不能推翻 22:14:09.0 的新打断。", correct: true },
] }); }
function investigateMachine() { evidenceChoice({ kicker: "调查点 03 · 闸位回条柱", title: "闸机接单不等于闸门到位", intro: "闸机在 22:14:08.5 回了‘命令已接收’，但没有目标闸位读数。此时可以写什么？", id: "machine", name: "接单回条与尚未确认的现实结果", choices: [
  { id: "done", title: "写‘开闸三成已经完成’", body: "把接单回条当成了现实结果。", feedback: "机器只承认收到命令，还没有证明闸门移动到哪里。" },
  { id: "ignore", title: "没有最终读数，所以连命令是否送达也不知道", body: "抹掉了回条已经证明的有限事实。", feedback: "回条能证明命令已被接收，只是不能证明最终位置。进行中与已完成必须分开。" },
  { id: "pending", title: "写‘已接单，仍在进行；等待闸位和水位回读’", body: "保留已经知道的事实，也明确还缺什么才能结束。", correct: true },
] }); }
function investigateInterrupt() { evidenceChoice({ kicker: "调查点 04 · 人工打断线", title: "新要求必须让旧决定失去效力", intro: "值班员在 22:14:09.0 喊出‘停止继续开闸，保持当前闸位’，22:14:09.1 到达。之后那张旧画面才抵达。该怎样处理？", id: "interrupt", name: "人工打断与保持令", choices: [
  { id: "finish", title: "先完成旧开闸，再处理打断", body: "把排队顺序放在人的最新安全要求之上。", feedback: "打断的作用就是改变正在进行的任务。继续执行旧要求会让回应及时、行动却过期。" },
  { id: "vote", title: "让旧画面和新口令各算一票", body: "不同时间的材料被当成同时有效。", feedback: "旧画面解释过去，新打断决定现在，不能用投票抹掉时间先后。" },
  { id: "hold", title: "立即写入‘保持’，撤销未完成的旧开闸要求", body: "后来到达但拍摄更早的画面只作历史证据，不再改写当前要求。", correct: true },
] }); }
function investigateSync() { evidenceChoice({ kicker: "调查点 05 · 快慢状态桥", title: "快路与慢路可以分工，不能拥有两个现在", intro: "快路已经接住打断，慢路仍在分析旧画面。请选择两条路的工作约定。", id: "sync", name: "快慢共用状态牌 R19", choices: [
  { id: "separate", title: "快路和慢路各自保存一份当前要求", body: "谁先说完就采用谁的答案。", feedback: "两份‘当前要求’会让旧分析晚到后覆盖新打断。" },
  { id: "wait", title: "所有回应都等慢路结束", body: "避免冲突，却不能及时接住人的打断。", feedback: "快路可以立即确认收到和处理打断；它只是不该抢报现实已经完成。" },
  { id: "shared", title: "共用状态牌：快路写入打断，慢路提交前重看编号", body: "慢路若基于 R18，看到当前已是 R19 就丢弃旧结果；只有现实回读能把状态改成完成。", correct: true },
] }); }

const evidenceInfo = {
  audio: ["01", "语音条", "说出 22:14:08.0，到达 22:14:08.2；内容为开到三成。"],
  visual: ["02", "迟到画面", "拍摄 22:14:07.8，到达 22:14:10.8；它解释过去，不能覆盖后来要求。"],
  machine: ["03", "闸机回条", "22:14:08.5 只证明已接单，最终闸位仍为空。"],
  interrupt: ["04", "人工打断", "22:14:09.0 要求停止继续开闸、保持当前闸位。"],
  sync: ["05", "状态牌 R19", "快路已写入保持令；慢路的 R18 结果必须在交付前作废。"],
};
function evidenceCard(id) { const info = evidenceInfo[id]; return hasEvidence(id) ? `<div class="evidence-card"><span class="card-no">EVIDENCE ${info[0]}</span><h3>${info[1]}</h3><p>${info[2]}</p></div>` : '<div class="evidence-card locked-card"><span class="card-no">未发现</span><h3>空证物袋</h3><p>继续调查四路时钟。</p></div>'; }
function openEvidenceBoard() {
  const canOrder = arrivalsReady() && !hasDeduction("order"); const canSync = hasDeduction("order") && hasEvidence("sync") && !hasDeduction("sync");
  openModal(`<div class="modal-body"><div class="modal-kicker">EVIDENCE BOARD</div><h2>四钟证物台</h2><p class="modal-intro">先分清事情何时发生、记录何时到达，再判断哪一条仍代表现在。</p><div class="evidence-grid evidence-grid--case09">${Object.keys(evidenceInfo).map(evidenceCard).join("")}</div>${canOrder ? orderDeduction() : ""}${canSync ? syncDeduction() : ""}${!canOrder && !canSync ? `<div class="deduction"><h3>已确认关系</h3><p class="modal-intro">${deductionSummary()}</p></div>` : ""}</div>`);
  $$('[data-deduction]').forEach((button) => button.addEventListener("click", handleDeduction));
}
function orderDeduction() { return `<div class="deduction"><h3>连接 01–04：真实先后是哪一条？</h3><div class="deduction-options"><button class="deduction-option" data-deduction="order" data-correct="false">按抵达屏幕的顺序：语音 → 闸机回条 → 打断 → 画面。</button><button class="deduction-option" data-deduction="order" data-correct="true">按事情发生的时刻：画面拍摄 → 语音开闸 → 闸机接单 → 人工保持；迟到画面只能解释过去。</button><button class="deduction-option" data-deduction="order" data-correct="false">四条都在十秒内，视为同时发生并取多数意见。</button></div></div>`; }
function syncDeduction() { return `<div class="deduction"><h3>连接 04 + 05：怎样既及时接住打断，又不让旧分析复活？</h3><div class="deduction-options"><button class="deduction-option" data-deduction="sync" data-correct="false">快路立即宣布完成，慢路稍后再修正。</button><button class="deduction-option" data-deduction="sync" data-correct="true">快路立即确认打断并把状态牌改为 R19；慢路交付前重看编号，丢弃基于 R18 的结果；最终完成仍等闸位和水位回读。</button><button class="deduction-option" data-deduction="sync" data-correct="false">不再允许快回应，所有事情都等慢路结束。</button></div></div>`; }
function handleDeduction(event) { const button = event.currentTarget; if (button.dataset.correct === "true") { unlockDeduction(button.dataset.deduction); window.EchoFeedback.showMastery("09", button.dataset.deduction, openModal, closeModal); } else { button.classList.remove("wrong"); void button.offsetWidth; button.classList.add("wrong"); toast("再看发生时刻、到达时刻和当前状态牌编号。晚到的旧材料不能覆盖更晚发生的新要求。", 6500); } }
function deductionSummary() { const items = []; if (hasDeduction("order")) items.push("第一条时序令：按事情发生的时刻还原事实，到达时刻只说明路上等了多久。"); if (hasDeduction("sync")) items.push("第二条时序令：快慢两路共用一个现在；新打断让旧编号的回答和动作失效，现实回读决定完成。"); return items.join("<br>") || "收齐对应证物后才能建立联系。"; }

const routePieces = [
  { id: "stamp", text: "为声音、画面、闸机回条和人工打断同时标记发生时刻、到达时刻、来处与任务编号" },
  { id: "merge", text: "按发生时刻还原事件，把人工保持令写成共同状态牌 R19 的当前要求" },
  { id: "fast", text: "快路立即确认收到打断并说明仍在处理，不抢报闸门已经到位" },
  { id: "slow", text: "慢路提交前重看状态牌；基于 R18 旧画面的结果立即作废，只按 R19 继续核对" },
  { id: "act", text: "向闸机发送当前仍有效的保持令，保留回查号；旧开闸要求若仍在路上就撤销" },
  { id: "verify", text: "等待闸位 18% 与上下游水位回读；一致才完成，超时或冲突就停下并回到安全闸位" },
];
function validOrder(order) { return order.join(",") === "stamp,merge,fast,slow,act,verify"; }
function shuffled() { const parts = [...routePieces]; for (let i = parts.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [parts[i], parts[j]] = [parts[j], parts[i]]; } if (validOrder(parts.map((part) => part.id))) [parts[0], parts[5]] = [parts[5], parts[0]]; return parts; }
function investigateConfirm() { const next = nextAction(); if (next.id === "complete") return showReveal(); if (next.id !== "final") return toast(next.hint, 6500, true); showRoutePuzzle(); }
function showRoutePuzzle() { routeSelection = []; openModal(`<div class="modal-body"><div class="modal-kicker">FINAL ROUTE · 北岸现实核对台</div><h2>让四路回声在同一个现在汇合</h2><p class="modal-intro">按顺序点击六张手续卡。快慢可以不同，但现在只能有一个，结案仍要由现实读数作证。</p><div class="loop-board" id="route-board"><div class="loop-slots">${routePieces.map((_, index) => `<div class="loop-slot" data-route-slot="${index}">${String(index + 1).padStart(2, "0")}</div>`).join("")}</div><div class="loop-pieces">${shuffled().map((part) => `<button class="loop-piece" data-route-piece="${part.id}">${part.text}</button>`).join("")}</div></div><div class="action-row"><button class="action-btn" id="route-reset">重新排列</button><button class="action-btn primary" id="route-submit">提交合流路线</button></div></div>`); $$('[data-route-piece]').forEach((button) => button.addEventListener("click", () => selectRoute(button))); $("#route-reset").addEventListener("click", showRoutePuzzle); $("#route-submit").addEventListener("click", submitRoute); }
function selectRoute(button) { if (button.classList.contains("used")) return; const id = button.dataset.routePiece; routeSelection.push(id); button.classList.add("used"); const slot = $(`[data-route-slot='${routeSelection.length - 1}']`); slot.textContent = routePieces.find((part) => part.id === id).text; slot.classList.add("filled"); }
function submitRoute() { if (routeSelection.length < routePieces.length) return toast("合流路线还缺少手续。", 4500, true); if (!validOrder(routeSelection)) { const board = $("#route-board"); board.classList.remove("wrong"); void board.offsetWidth; board.classList.add("wrong"); return toast("先还原真实先后并更新共同状态，再让快慢两路行动；最后必须等闸位与水位回读。", 7800, true); } showVerification(); }
function showVerification() { openModal(`<div class="modal-body"><div class="modal-kicker">REALITY REPLY · 北岸回读</div><h2>最后一声回声来自现实</h2><div class="realtime-check"><span><b>当前要求 · R19</b><small>停止继续开闸，保持安全闸位</small></span><span><b>旧要求 · 已撤销</b><small>R18 的开到三成不再执行</small></span><span><b>闸位 · 18%</b><small>乔的机械回读与现场刻度一致</small></span><span><b>上下游水位 · 稳定</b><small>云在现场连续两次确认</small></span></div><div class="formula"><b>现实结果：</b>打断已经改变闸机行动，闸门保持在安全位置；旧画面和旧口令都没有再次覆盖当前要求。现在才可以报告完成。</div><div class="action-row"><button class="action-btn primary" id="confirm-case">让现实结案</button><button class="action-btn" id="back-route">返回合流路线</button></div></div>`); $("#confirm-case").addEventListener("click", () => { state.finalSolved = true; saveState(); showReveal(); }); $("#back-route").addEventListener("click", showRoutePuzzle); }

function showReveal() { openModal(`<div class="reveal-hero"><div class="modal-kicker">CASE CLOSED · 真相已解锁</div><h2>它不是没有听懂，而是把“先到”误当成“刚发生”</h2><p>你用四路双时间记录还原真实先后，让快回应与慢核对共用同一块状态牌，并让新打断废止旧决定。最后，闸位和水位而不是一句回声决定了结案。</p><p class="next-case-hook"><b>新增待查线索：</b>R19 合流记录发往四个部门后，云、米娅、澜和乔分别拿到了不同部分。四份局部事实都是真的，却再次得出四个城市结论。第 10 案已登记：四位目击者。</p></div>
  <div class="case-reconstruction"><section class="reconstruction-block"><div class="reconstruction-heading"><span>证</span><h3>关键证物与玩家判断回放</h3></div><div class="evidence-replay"><article class="replay-card"><span>证物 01–04</span><b>四路记录都有发生时刻与到达时刻</b><p>你证明了到达顺序不等于事情先后，迟到画面只能解释过去。</p></article><article class="replay-card"><span>证物 05 + 时序令</span><b>快慢两路共用状态牌 R19</b><p>你证明了新打断必须让旧编号的分析和未完成动作一起失效。</p></article></div></section>
  <section class="reconstruction-block"><div class="reconstruction-heading"><span>因</span><h3>错误怎样发生，又怎样被修好</h3></div><div class="evidence-replay"><article class="replay-card"><span>记录</span><b>只按到达时刻排队</b><p>迟到画面失去拍摄时刻，被误写成最新材料。</p></article><article class="replay-card"><span>现场</span><b>消息在路上时，水位与人的要求仍在变化</b><p>旧材料到达时，现实已经进入 R19。</p></article><article class="replay-card"><span>回声七号</span><b>快路抢报，慢路带着 R18 继续核对</b><p>局部理解都合理，合在一起却执行了过期要求。</p></article><article class="replay-card"><span>调度规则</span><b>没有共同编号、旧答案作废办法和现实检查门</b><p>人的新要求没有撤销旧结果，接单回条又被冒充为完成。</p></article></div><div class="repair-chain"><div class="causal-node">记下发生与到达时间</div><i class="causal-arrow">→</i><div class="causal-node">共用当前任务牌</div><i class="causal-arrow">→</i><div class="causal-node">旧答案作废</div><i class="causal-arrow">→</i><div class="causal-node">现实回读</div></div></section></div>${window.EchoFeedback.renderCompletion("09")}
  <div class="term-map"><h3 class="term-map__title">给你刚才每一步行动命名</h3><p class="term-map__intro">左边是你实际做过的事，右边只给这一项行为对应的专业名称。</p><div class="term-row"><span class="plain">把语音、画面、闸机回条和人工新要求放进同一条记录</span><span class="arrow">→</span><div><b>多模态实时系统 · Multimodal Realtime</b><small>对应收集四路证物并将它们合流。</small></div></div><div class="term-row"><span class="plain">按照事情实际发生的时刻还原先后</span><span class="arrow">→</span><div><b>事件时间 · Event Time</b><small>对应连接证物 01–04 的时序判断。</small></div></div><div class="term-row"><span class="plain">先及时接住新要求，再花时间仔细核对</span><span class="arrow">→</span><div><b>快慢路径 · Fast/Slow Path</b><small>对应最终路线中快路回应、慢路核对的分工。</small></div></div><div class="term-row"><span class="plain">快慢两路始终共用 R19 这一块当前任务牌</span><span class="arrow">→</span><div><b>状态同步 · State Synchronization</b><small>对应调查点 05 的共同状态牌选择。</small></div></div><div class="term-row"><span class="plain">人的新要求立刻改变正在进行的任务</span><span class="arrow">→</span><div><b>打断 · Barge-in</b><small>对应调查点 04 的人工保持令。</small></div></div><div class="term-row"><span class="plain">撤销 R18 的旧开闸动作和旧答案</span><span class="arrow">→</span><div><b>版本失效 · Invalidation</b><small>对应最终路线中让旧动作与旧结果作废。</small></div></div><div class="term-row"><span class="plain">等闸位和水位读数确认以后才报告完成</span><span class="arrow">→</span><div><b>现实验证 · Reality Verification</b><small>对应北岸回读中的最终确认。</small></div></div><div class="formula"><b>停止条件：</b>当前编号一致、旧动作已撤销、闸位与水位现实结果通过；任何缺项、超时或冲突都不得结案。</div>
  <div class="action-row"><a class="action-btn primary" href="case10.html?from=case09">追查第 10 案</a><a class="action-btn" href="cases.html">返回案件目录</a><button class="action-btn" id="open-final-archive">收入回声档案</button><button class="action-btn" data-close-modal>返回调度厅</button></div></div>`); $("#open-final-archive").addEventListener("click", openArchive); $$('[data-close-modal]', modalContent).forEach((button) => button.addEventListener("click", closeModal)); }
function openArchive() { closeModal(); openModal(window.EchoArchive.render("09")); $("#reset-case")?.addEventListener("click", () => { if (confirm("确定清空案件 09 的进度并重新调查吗？")) { localStorage.removeItem(STORAGE_KEY); state = { ...initialState, evidence: [], deductions: [], started: true }; closeModal(); updateUI(); showIntro(); } }); }
$("#start-btn").addEventListener("click", startGame); $("#cover-archive-btn").addEventListener("click", () => { cover.classList.add("hidden"); app.classList.remove("hidden"); state.started = true; saveState(); openArchive(); }); $("#archive-btn").addEventListener("click", openArchive); $("#evidence-btn").addEventListener("click", openEvidenceBoard); $("#hint-btn").addEventListener("click", () => toast(nextAction().hint, 5400)); $$('[data-close-modal]').forEach((element) => element.addEventListener("click", closeModal));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeModal(); dialogue.classList.add("hidden"); } });
const actions = { audio: investigateAudio, visual: investigateVisual, machine: investigateMachine, interrupt: investigateInterrupt, sync: investigateSync, confirm: investigateConfirm }; $$('[data-hotspot]').forEach((button) => button.addEventListener("click", () => actions[button.dataset.hotspot]()));
const continuing = new URLSearchParams(window.location.search).get("from") === "case08"; if (state.started || continuing) { cover.classList.add("hidden"); app.classList.remove("hidden"); } if (continuing) { state.started = true; saveState(); if (!state.bridgeSeen) showBridge(); else if (!state.introSeen) showIntro(); } else updateUI();
