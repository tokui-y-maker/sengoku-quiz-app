/* Sengoku Quiz App v2
 * - Difficulty: easy/normal/hard/mania
 * - 10 questions per run
 * - Review mode: wrong-only (stored in localStorage)
 * - Explanation shown after answer (toggleable)
 * - Choice shuffle (toggleable)
 */

const STORAGE_KEY = "sengoku_quiz_v2_state";

const DIFF_LABEL = {
  easy: "やさしい",
  normal: "普通",
  hard: "難しい",
  mania: "マニア"
};

const state = {
  questions: [],
  selectedDiff: "normal",
  mode: "normal", // normal | review
  shuffleChoices: true,
  showExplanation: true,
  showTags: true,

  runQuestions: [],
  idx: 0,
  correct: 0,
  wrongIds: new Set(), // persistent
};

// ---- Elements
const el = {
  home: document.getElementById("home"),
  quiz: document.getElementById("quiz"),
  result: document.getElementById("result"),

  totalCount: document.getElementById("totalCount"),
  loadState: document.getElementById("loadState"),
  wrongPool: document.getElementById("wrongPool"),
  homeMsg: document.getElementById("homeMsg"),

  startBtn: document.getElementById("startBtn"),
  reviewBtn: document.getElementById("reviewBtn"),

  progressText: document.getElementById("progressText"),
  barFill: document.getElementById("barFill"),
  qNo: document.getElementById("qNo"),
  questionText: document.getElementById("questionText"),
  tagRow: document.getElementById("tagRow"),
  choices: document.getElementById("choices"),
  feedback: document.getElementById("feedback"),
  nextBtn: document.getElementById("nextBtn"),
  quitBtn: document.getElementById("quitBtn"),

  modeBadge: document.getElementById("modeBadge"),
  diffBadge: document.getElementById("diffBadge"),

  scoreNum: document.getElementById("scoreNum"),
  scoreDen: document.getElementById("scoreDen"),
  rateNum: document.getElementById("rateNum"),
  wrongNum: document.getElementById("wrongNum"),
  wrongList: document.getElementById("wrongList"),
  backHomeBtn: document.getElementById("backHomeBtn"),
  reviewFromResultBtn: document.getElementById("reviewFromResultBtn"),

  openSettings: document.getElementById("openSettings"),
  settingsModal: document.getElementById("settingsModal"),
  shuffleChoices: document.getElementById("shuffleChoices"),
  showExplanation: document.getElementById("showExplanation"),
  showTags: document.getElementById("showTags"),
  clearProgress: document.getElementById("clearProgress"),
};

function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

// ---- Utils
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr, n){
  if(arr.length <= n) return shuffle(arr);
  return shuffle(arr).slice(0, n);
}

function setView(view){
  el.home.classList.add("hidden");
  el.quiz.classList.add("hidden");
  el.result.classList.add("hidden");
  view.classList.remove("hidden");
}

function setMsg(msg){
  el.homeMsg.textContent = msg || "";
}

function loadPersist(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const data = JSON.parse(raw);
    if(data && Array.isArray(data.wrongIds)){
      state.wrongIds = new Set(data.wrongIds);
    }
    if(data && typeof data.shuffleChoices === "boolean") state.shuffleChoices = data.shuffleChoices;
    if(data && typeof data.showExplanation === "boolean") state.showExplanation = data.showExplanation;
    if(data && typeof data.showTags === "boolean") state.showTags = data.showTags;
    if(data && typeof data.selectedDiff === "string") state.selectedDiff = data.selectedDiff;
  }catch(_e){
    // ignore
  }
}

function savePersist(){
  const data = {
    wrongIds: Array.from(state.wrongIds),
    shuffleChoices: state.shuffleChoices,
    showExplanation: state.showExplanation,
    showTags: state.showTags,
    selectedDiff: state.selectedDiff,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function updateHomeStats(){
  el.totalCount.textContent = String(state.questions.length || "-");
  el.loadState.textContent = state.questions.length ? "済" : "未";
  el.wrongPool.textContent = String(state.wrongIds.size);
  el.reviewBtn.disabled = state.wrongIds.size === 0;
  el.reviewFromResultBtn.disabled = state.wrongIds.size === 0;
}

function normalizeQuestion(q){
  // expected schema:
  // { id, question, choices[4], answerIndex, explanation?, tags?, era?, difficulty? }
  if(!q || typeof q !== "object") return null;
  if(typeof q.id === "undefined") return null;
  if(typeof q.question !== "string") return null;
  if(!Array.isArray(q.choices) || q.choices.length < 2) return null;
  if(typeof q.answerIndex !== "number") return null;

  const difficulty = (q.difficulty || "normal");
  const tags = Array.isArray(q.tags) ? q.tags : [];
  const era = typeof q.era === "string" ? q.era : "";
  const explanation = typeof q.explanation === "string" ? q.explanation : "";

  return {
    id: q.id,
    question: q.question,
    choices: q.choices,
    answerIndex: q.answerIndex,
    explanation,
    tags,
    era,
    difficulty,
  };
}

function filterByDifficulty(diff){
  return state.questions.filter(q => (q.difficulty || "normal") === diff);
}

function buildRunQuestions(mode){
  const diff = state.selectedDiff;
  const pool = filterByDifficulty(diff);

  if(pool.length === 0){
    // fallback: if diff has no questions, use all
    return pickRandom(state.questions, 10);
  }

  if(mode === "review"){
    const wrongPool = pool.filter(q => state.wrongIds.has(q.id));
    if(wrongPool.length === 0){
      return pickRandom(pool, 10);
    }
    return pickRandom(wrongPool, Math.min(10, wrongPool.length));
  }

  return pickRandom(pool, 10);
}

function setBadges(){
  el.modeBadge.textContent = state.mode === "review" ? "復習" : "通常";
  el.diffBadge.textContent = DIFF_LABEL[state.selectedDiff] || "普通";
}

// ---- Render
function renderQuestion(){
  const total = state.runQuestions.length;
  const current = state.runQuestions[state.idx];

  setBadges();

  el.progressText.textContent = `${state.idx + 1} / ${total}`;
  el.barFill.style.width = `${clamp(((state.idx+1)/total)*100, 0, 100)}%`;

  el.qNo.textContent = `Q${state.idx + 1}`;
  el.questionText.textContent = current.question;

  // tags
  el.tagRow.innerHTML = "";
  if(state.showTags){
    const tags = [];
    if(current.era) tags.push(current.era);
    if(current.tags && current.tags.length) tags.push(...current.tags);

    tags.slice(0, 8).forEach(t => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = t;
      el.tagRow.appendChild(span);
    });
  }

  // feedback reset
  el.feedback.innerHTML = "";
  el.nextBtn.classList.add("hidden");

  // build choices with optional shuffle
  const letters = ["A","B","C","D","E","F"];
  let choiceObjs = current.choices.map((text, idx) => ({ text, idx }));

  if(state.shuffleChoices){
    choiceObjs = shuffle(choiceObjs);
  }

  el.choices.innerHTML = "";
  choiceObjs.forEach((c, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.dataset.origIndex = String(c.idx);

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = letters[i] || "•";

    const txt = document.createElement("span");
    txt.textContent = c.text;

    btn.appendChild(label);
    btn.appendChild(txt);

    btn.addEventListener("click", () => onAnswer(btn, current));
    el.choices.appendChild(btn);
  });
}

function lockChoices(){
  $all(".choice", el.choices).forEach(b => b.disabled = true);
}

function markChoices(correctOrigIndex, pickedOrigIndex){
  $all(".choice", el.choices).forEach(b => {
    const orig = Number(b.dataset.origIndex);
    if(orig === correctOrigIndex) b.classList.add("correct");
    if(orig === pickedOrigIndex && pickedOrigIndex !== correctOrigIndex) b.classList.add("wrong");
  });
}

function onAnswer(btn, q){
  lockChoices();

  const picked = Number(btn.dataset.origIndex);
  const correct = q.answerIndex;

  const ok = picked === correct;
  if(ok){
    state.correct += 1;
  }else{
    state.wrongIds.add(q.id);
    savePersist();
    updateHomeStats();
  }

  markChoices(correct, picked);

  // feedback
  const judge = document.createElement("div");
  judge.className = "judge " + (ok ? "ok" : "ng");
  judge.textContent = ok ? "正解" : "不正解";
  el.feedback.appendChild(judge);

  const ansText = document.createElement("div");
  ansText.className = "meta2";
  ansText.textContent = `答え：${q.choices[correct]}`;
  el.feedback.appendChild(ansText);

  if(state.showExplanation && q.explanation){
    const exp = document.createElement("div");
    exp.className = "exp";
    exp.textContent = q.explanation;
    el.feedback.appendChild(exp);
  }

  el.nextBtn.classList.remove("hidden");
}

function finishRun(){
  const total = state.runQuestions.length;
  el.scoreNum.textContent = String(state.correct);
  el.scoreDen.textContent = String(total);

  const rate = total ? Math.round((state.correct / total) * 100) : 0;
  el.rateNum.textContent = String(rate);

  const wrongThisRun = total - state.correct;
  el.wrongNum.textContent = String(wrongThisRun);

  // list wrong questions that are in persistent wrongIds (limit)
  el.wrongList.innerHTML = "";
  const wrongItems = state.runQuestions.filter(q => state.wrongIds.has(q.id));
  if(wrongItems.length === 0){
    const div = document.createElement("div");
    div.className = "wrong-item";
    div.innerHTML = `<div class="wq">完璧です。</div><div class="wmeta">復習候補はありません。</div>`;
    el.wrongList.appendChild(div);
  }else{
    wrongItems.slice(0, 12).forEach(q => {
      const div = document.createElement("div");
      div.className = "wrong-item";
      const meta = [q.era, ...(q.tags||[])].filter(Boolean).slice(0,6).join(" / ");
      div.innerHTML = `<div class="wq">${q.question}</div><div class="wmeta">${meta || ""}</div>`;
      el.wrongList.appendChild(div);
    });
  }

  updateHomeStats();
  setView(el.result);
}

// ---- Flow
function start(mode){
  if(!state.questions.length){
    setMsg("問題が読み込めていません。questions.json を確認してください。");
    return;
  }

  state.mode = mode;
  state.runQuestions = buildRunQuestions(mode);
  state.idx = 0;
  state.correct = 0;

  if(!state.runQuestions.length){
    setMsg("出題できる問題がありません。difficulty の設定を確認してください。");
    return;
  }

  setView(el.quiz);
  renderQuestion();
}

function next(){
  state.idx += 1;
  if(state.idx >= state.runQuestions.length){
    finishRun();
    return;
  }
  renderQuestion();
}

function quit(){
  setView(el.home);
  setMsg("中断しました。");
  updateHomeStats();
}

function openSettings(){
  el.settingsModal.classList.remove("hidden");
}
function closeSettings(){
  el.settingsModal.classList.add("hidden");
}

// ---- Difficulty UI
function initDifficultyButtons(){
  const btns = $all(".diff-btn");
  function activate(diff){
    state.selectedDiff = diff;
    btns.forEach(b => b.classList.toggle("is-active", b.dataset.diff === diff));
    savePersist();
  }
  btns.forEach(b => {
    b.addEventListener("click", () => activate(b.dataset.diff));
  });
  // initial
  activate(state.selectedDiff || "normal");
}

// ---- Data load
async function loadQuestions(){
  el.loadState.textContent = "読込中";
  setMsg("問題を読み込み中…");

  try{
    const res = await fetch("questions.json", { cache: "no-store" });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();

    if(!Array.isArray(raw)) throw new Error("questions.json は配列（[]）である必要があります");

    const normalized = raw.map(normalizeQuestion).filter(Boolean);

    // Basic validation: ensure answerIndex is within choices
    const ok = normalized.filter(q => q.answerIndex >= 0 && q.answerIndex < q.choices.length);
    state.questions = ok;

    el.totalCount.textContent = String(state.questions.length);
    el.loadState.textContent = "済";

    setMsg(state.questions.length ? "準備完了。難易度を選んで開始できます。" : "有効な問題がありません。questions.json を確認してください。");
    updateHomeStats();
  }catch(e){
    el.loadState.textContent = "失敗";
    setMsg(`読み込み失敗: ${e.message}`);
    updateHomeStats();
  }
}

// ---- Event binding
function bindEvents(){
  el.startBtn.addEventListener("click", () => start("normal"));
  el.reviewBtn.addEventListener("click", () => start("review"));
  el.reviewFromResultBtn.addEventListener("click", () => start("review"));

  el.nextBtn.addEventListener("click", () => next());
  el.quitBtn.addEventListener("click", () => quit());
  el.backHomeBtn.addEventListener("click", () => { setView(el.home); setMsg(""); updateHomeStats(); });

  el.shuffleChoices.addEventListener("change", () => {
    state.shuffleChoices = el.shuffleChoices.checked;
    savePersist();
  });

  el.openSettings.addEventListener("click", openSettings);

  el.settingsModal.addEventListener("click", (ev) => {
    const t = ev.target;
    if(t && t.dataset && t.dataset.close){
      closeSettings();
    }
    if(t && t.classList && t.classList.contains("modal-backdrop")){
      closeSettings();
    }
  });

  el.showExplanation.addEventListener("change", () => {
    state.showExplanation = el.showExplanation.checked;
    savePersist();
  });

  el.showTags.addEventListener("change", () => {
    state.showTags = el.showTags.checked;
    savePersist();
  });

  el.clearProgress.addEventListener("click", () => {
    state.wrongIds = new Set();
    savePersist();
    updateHomeStats();
    setMsg("復習データをクリアしました。");
    closeSettings();
  });
}

// ---- Init
(function init(){
  loadPersist();

  // reflect persisted settings
  el.shuffleChoices.checked = state.shuffleChoices;
  el.showExplanation.checked = state.showExplanation;
  el.showTags.checked = state.showTags;

  initDifficultyButtons();
  bindEvents();
  updateHomeStats();
  loadQuestions();
})();
