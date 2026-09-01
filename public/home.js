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
    return {
      started: Boolean(value.started),
      finalSolved: Boolean(value.finalSolved),
      evidenceCount: Array.isArray(value.evidence) ? value.evidence.length : 0,
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
