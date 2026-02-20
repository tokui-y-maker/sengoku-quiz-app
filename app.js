const state = {
  allQuestions: [],
  currentSet: [],
  wrongFromNormal: [],
  index: 0,
  score: 0,
  mode: "normal",
  answered: false,
};

const homeEl = document.getElementById("home");
const quizEl = document.getElementById("quiz");
const resultEl = document.getElementById("result");
const homeMessageEl = document.getElementById("homeMessage");

const startBtn = document.getElementById("startBtn");
const reviewBtn = document.getElementById("reviewBtn");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");

const progressEl = document.getElementById("progress");
const modeLabelEl = document.getElementById("modeLabel");
const questionEl = document.getElementById("question");
const choicesEl = document.getElementById("choices");
const feedbackEl = document.getElementById("feedback");

const scoreEl = document.getElementById("score");
const rateEl = document.getElementById("rate");
const wrongCountEl = document.getElementById("wrongCount");

const labels = ["A", "B", "C", "D"];

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showHome(message = "") {
  homeEl.classList.remove("hidden");
  quizEl.classList.add("hidden");
  resultEl.classList.add("hidden");
  homeMessageEl.textContent = message;
  reviewBtn.disabled = state.wrongFromNormal.length === 0;
}

function showQuiz() {
  homeEl.classList.add("hidden");
  quizEl.classList.remove("hidden");
  resultEl.classList.add("hidden");
}

function showResult() {
  homeEl.classList.add("hidden");
  quizEl.classList.add("hidden");
  resultEl.classList.remove("hidden");

  const total = state.currentSet.length;
  const rate = total > 0 ? Math.round((state.score / total) * 100) : 0;
  scoreEl.textContent = `正解数: ${state.score} / ${total}`;
  rateEl.textContent = `正解率: ${rate}%`;
  wrongCountEl.textContent = `不正解: ${total - state.score}問`;
}

function renderQuestion() {
  const q = state.currentSet[state.index];
  state.answered = false;
  nextBtn.classList.add("hidden");
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";

  progressEl.textContent = `第${state.index + 1}問 / ${state.currentSet.length}`;
  modeLabelEl.textContent = state.mode === "review" ? "復習モード" : "通常モード";
  questionEl.textContent = q.question;

  choicesEl.innerHTML = "";
  q.choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.textContent = `${labels[i]}. ${choice}`;
    btn.addEventListener("click", () => answer(i));
    choicesEl.appendChild(btn);
  });
}

function answer(selected) {
  if (state.answered) return;
  state.answered = true;

  const q = state.currentSet[state.index];
  const ok = selected === q.answerIndex;
  const explanation = typeof q.explanation === "string" ? q.explanation : "";

  if (ok) {
    state.score += 1;
    feedbackEl.classList.add("ok");
    feedbackEl.innerHTML = explanation
      ? `<strong>正解</strong><br>解説: ${explanation}`
      : "<strong>正解</strong>";
  } else {
    feedbackEl.classList.add("ng");
    feedbackEl.innerHTML = explanation
      ? `<strong>不正解（正解: ${labels[q.answerIndex]}）</strong><br>解説: ${explanation}`
      : `<strong>不正解（正解: ${labels[q.answerIndex]}）</strong>`;
    if (state.mode === "normal" && !state.wrongFromNormal.some((x) => x.id === q.id)) {
      state.wrongFromNormal.push(q);
    }
  }

  Array.from(choicesEl.children).forEach((el, idx) => {
    el.disabled = true;
    if (idx === q.answerIndex) el.classList.add("correct");
    if (!ok && idx === selected) el.classList.add("wrong");
  });

  nextBtn.classList.remove("hidden");
}

function start(mode) {
  const source = mode === "review" ? state.wrongFromNormal : state.allQuestions;

  if (mode === "normal") {
    state.wrongFromNormal = [];
  }

  if (source.length === 0) {
    showHome(mode === "review" ? "復習対象がありません。先に通常モードを解いてください。" : "問題がありません。");
    return;
  }

  const count = mode === "review" ? Math.min(10, source.length) : 10;
  if (source.length < 10 && mode === "normal") {
    showHome("通常モードは10問必要です。questions.jsonを確認してください。");
    return;
  }

  state.mode = mode;
  state.currentSet = shuffle(source).slice(0, count);
  state.index = 0;
  state.score = 0;

  showQuiz();
  renderQuestion();
}

nextBtn.addEventListener("click", () => {
  state.index += 1;
  if (state.index >= state.currentSet.length) {
    showResult();
    return;
  }
  renderQuestion();
});

startBtn.addEventListener("click", () => start("normal"));
reviewBtn.addEventListener("click", () => start("review"));
backBtn.addEventListener("click", () => showHome("モードを選んで開始してください。"));

async function init() {
  try {
    const res = await fetch("questions.json");
    if (!res.ok) throw new Error("questions.json の読み込みに失敗しました");

    const data = await res.json();
    const valid = Array.isArray(data) && data.every((q) =>
      typeof q.id === "number"
      && typeof q.question === "string"
      && Array.isArray(q.choices)
      && q.choices.length === 4
      && Number.isInteger(q.answerIndex)
      && q.answerIndex >= 0
      && q.answerIndex <= 3
      && (q.explanation === undefined || typeof q.explanation === "string")
      && (q.difficulty === undefined || ["easy", "normal", "hard"].includes(q.difficulty))
    );

    if (!valid) throw new Error("questions.json の形式が不正です");

    state.allQuestions = data;
    showHome("問題を読み込みました。通常モードを開始できます。");
  } catch (e) {
    startBtn.disabled = true;
    reviewBtn.disabled = true;
    showHome(`エラー: ${e.message}`);
  }
}

init();
