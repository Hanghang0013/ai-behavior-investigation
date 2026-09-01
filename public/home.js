const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const modal = $("#modal");
const modalContent = $("#modal-content");

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
  const caseKeys = ["echo-archive-case-01", "echo-archive-case-02", "echo-archive-case-03"];
  const completed = caseKeys.filter((key) => readCaseProgress(key).finalSolved).length;
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
  if ($("#home-progress")) $("#home-progress").textContent = `${completed} / 3 案件已结`;
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

updateCaseDirectory();
