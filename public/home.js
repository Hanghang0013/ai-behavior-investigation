const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const modal = $("#modal");
const modalContent = $("#modal-content");
const CASE_STORAGE_KEYS = [
  "echo-archive-case-01",
  "echo-archive-case-02",
  "echo-archive-case-03",
  "echo-archive-case-04",
  "echo-archive-case-05",
  "echo-archive-case-06",
  "echo-archive-case-07",
  "echo-archive-case-08",
  "echo-archive-case-09",
  "echo-archive-case-10",
];

function clearRequestedProgress() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("reset-progress") !== "all") return;
  CASE_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  window.history.replaceState(null, "", window.location.pathname);
}

function readCaseProgress(storageKey) {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || "{}");
    const evidence = Array.isArray(value.evidence) ? value.evidence : [];
    const hasEvidence = (id) => evidence.includes(id);
    let finalSolved = Boolean(value.finalSolved);
    if (storageKey.endsWith("-03") && value.saveVersion !== 3) finalSolved = false;
    if (storageKey.endsWith("-06") && (!hasEvidence("judge") || !hasEvidence("metrics") || !hasEvidence("regression"))) finalSolved = false;
    if (storageKey.endsWith("-07") && !hasEvidence("policy")) finalSolved = false;
    if (storageKey.endsWith("-09") && ((value.saveVersion || 1) < 2 || !["audio", "visual", "machine", "interrupt", "sync"].every(hasEvidence))) finalSolved = false;
    if (storageKey.endsWith("-10") && ((value.saveVersion || 1) < 2 || !["yun", "mia", "lan", "qiao", "score"].every(hasEvidence))) finalSolved = false;
    return {
      started: Boolean(value.started),
      finalSolved,
      evidenceCount: evidence.length,
    };
  } catch {
    return { started: false, finalSolved: false, evidenceCount: 0 };
  }
}

function updateCaseDirectory() {
  const completed = CASE_STORAGE_KEYS.filter((key) => readCaseProgress(key).finalSolved).length;
  $$(".home-case-card").forEach((card) => {
    const progress = readCaseProgress(card.dataset.storageKey);
    const status = $(".home-case-status", card);
    card.classList.toggle("completed", progress.finalSolved);
    card.classList.toggle("in-progress", progress.started && !progress.finalSolved);

    if (progress.finalSolved) {
      status.textContent = "案件已结 · 可重新调查";
      $("[data-case-enter-label]", card).textContent = "重新进入案件";
    } else if (progress.started) {
      status.textContent = `调查中 · ${progress.evidenceCount} 件证物`;
      $("[data-case-enter-label]", card).textContent = "继续调查";
    } else {
      status.textContent = "尚未开始";
      $("[data-case-enter-label]", card).textContent = "进入案件";
    }
  });
  if ($("#home-progress")) $("#home-progress").textContent = `${completed} / ${CASE_STORAGE_KEYS.length} 案件已结`;
  if ($("#city-recovery-map") && window.EchoFeedback) {
    $("#city-recovery-map").innerHTML = window.EchoFeedback.renderCityRecovery();
  }
}

function openArchive() {
  modalContent.innerHTML = window.EchoArchive.render(null);
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

[$("#home-archive-btn"), $("#hero-archive-btn"), $("#footer-archive-btn")].filter(Boolean).forEach((button) => button.addEventListener("click", openArchive));
$$('[data-close-modal]').forEach((element) => element.addEventListener("click", closeModal));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});
window.addEventListener("pageshow", updateCaseDirectory);

clearRequestedProgress();
updateCaseDirectory();
