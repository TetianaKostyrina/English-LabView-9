// ====== СЛОВА (ваш список) ======
const VOCAB = [
  { en: "unsigned", ru: "беззнаковый (без знака)", pron: "ан-сайн(д)" },
  { en: "signed", ru: "знаковый (со знаком)", pron: "сайн(д)" },
  { en: "precision", ru: "точность", pron: "при-сИжн" },
  { en: "intended", ru: "предназначенный; задуманный", pron: "ин-тЭн-дид" },
  { en: "enable", ru: "включать; активировать", pron: "и-нЭйбл" },
  { en: "disadvantage", ru: "недостаток", pron: "дис-эд-вЭн-тидж" },
  { en: "corresponding", ru: "соответствующий", pron: "корис-пОн-динг" },
  { en: "exceeds", ru: "превышает", pron: "ик-сИдс" },
  { en: "replacing", ru: "заменяя; замена", pron: "ри-плЭй-синг" },
  { en: "avoid", ru: "избегать", pron: "э-вОйд" },
  { en: "order", ru: "порядок; заказ", pron: "О(р)-дэр" },
  { en: "debugging", ru: "отладка", pron: "ди-бАг-инг" },
  { en: "troubleshooting", ru: "поиск и устранение неисправностей", pron: "трАбл-шУтинг" },
  { en: "causes", ru: "причины; вызывает", pron: "кО-зиз" },
  { en: "their", ru: "их (принадлежность)", pron: "зэа(р)" },
  { en: "there", ru: "там; туда", pron: "зэа(р)" },
  { en: "while", ru: "пока; в то время как", pron: "уайл" },
  { en: "probes", ru: "пробы/щупы; «пробники»", pron: "проубз" },
  { en: "advanced", ru: "продвинутый; расширенный", pron: "эд-вЭнст" },
];

// ====== ФОНЫ (по вкладкам) ======
// Взято из результатов Google Images (прямые ссылки на картинки).
const BACKGROUNDS = {
  cards: "https://www.freevector.com/uploads/vector/preview/28148/EducationBackground_Preview_03.jpg",
  mcq: "https://images.hdqwalls.com/download/soft-gradient-abstract-5k-1d-1920x1080.jpg",
  typing: "https://images.hdqwalls.com/download/pastel-abstract-area-4k-gn-1920x1080.jpg",
  match: "https://4kwallpapers.com/images/walls/thumbs_2t/20099.jpg"
};

// ====== УТИЛИТЫ ======
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sample(arr, n) { return shuffle(arr).slice(0, n); }

let deck = shuffle(VOCAB);
let currentTab = "cards";

// ====== СЧЁТ (баллы) ======
let mcqAttempts = 0, mcqCorrect = 0;
let typeAttempts = 0, typeCorrect = 0;
let matchWrongAttempts = 0;

// ====== AUDIO: Wiktionary/Commons через MediaWiki API + fallback SpeechSynthesis ======
// Важно: для фраз/словосочетаний на Wiktionary часто нет отдельного аудиофайла,
// поэтому для таких случаев будет использоваться голос браузера.
const audioCache = new Map(); // key -> url|null

async function getWiktionaryAudioURL(text) {
  const key = text.trim();
  if (audioCache.has(key)) return audioCache.get(key);

  const titles = key.replace(/\s+/g, " "); // нормализация пробелов

  // 1) Получаем список файлов (images) со страницы
  const pageUrl = new URL("https://en.wiktionary.org/w/api.php");
  pageUrl.search = new URLSearchParams({
    action: "query",
    prop: "images",
    titles,
    format: "json",
    origin: "*"
  });

  const pageJson = await fetch(pageUrl).then(r => r.json());
  const pages = pageJson?.query?.pages;
  const pageId = pages ? Object.keys(pages)[0] : null;
  const images = pageId ? (pages[pageId].images || []) : [];

  const file = images
    .map(x => x.title)
    .find(t =>
      /^File:(en|En)-us-.*\.(ogg|mp3|wav)$/i.test(t) ||
      /^File:LL-Q1860.*\.(ogg|mp3|wav)$/i.test(t) ||
      /^File:En-.*\.(ogg|mp3|wav)$/i.test(t)
    );

  if (!file) {
    audioCache.set(key, null);
    return null;
  }

  // 2) Получаем прямой URL файла через imageinfo
  const fileUrl = new URL("https://en.wiktionary.org/w/api.php");
  fileUrl.search = new URLSearchParams({
    action: "query",
    prop: "imageinfo",
    titles: file,
    iiprop: "url",
    format: "json",
    origin: "*"
  });

  const fileJson = await fetch(fileUrl).then(r => r.json());
  const fp = fileJson?.query?.pages;
  const fid = fp ? Object.keys(fp)[0] : null;
  const url = fid ? (fp[fid]?.imageinfo?.[0]?.url ?? null) : null;

  audioCache.set(key, url);
  return url;
}

async function speakEnglish(text) {
  const t = (text || "").trim();
  if (!t) return;

  // 1) реальный аудиофайл с Wiktionary (если есть)
  try {
    const url = await getWiktionaryAudioURL(t);
    if (url) {
      const audio = new Audio(url);
      await audio.play();
      setStatus("Озвучка: Wiktionary");
      return;
    }
  } catch (_) { /* fallback ниже */ }

  // 2) fallback: голос браузера (TTS)
  const u = new SpeechSynthesisUtterance(t);
  u.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
  setStatus("Озвучка: голос браузера");
}

function setStatus(text) {
  $("#status").textContent = text || "";
  if (text) setTimeout(() => { $("#status").textContent = ""; }, 2200);
}

// ====== ФОН (переключение по вкладкам) ======
function applyBackground(tab) {
  const url = BACKGROUNDS[tab] || BACKGROUNDS.cards;
  document.body.style.setProperty("--page-bg", `url("${url}")`);
}

// ====== ТАБЫ ======
$$(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    currentTab = tab;

    $$(".panel").forEach(p => p.classList.remove("active"));
    $("#" + tab).classList.add("active");

    applyBackground(tab);
    renderAll();
  });
});

// ====== ПЕРЕМЕШАТЬ ======
$("#btnShuffle").addEventListener("click", () => {
  deck = shuffle(deck);
  resetAll();
  setStatus("Перемешано");
  renderAll();
});

// ====== 1) RU → EN (выбор) ======
let t1I = 0;
let t1Answered = false;

// озвучиваем ПРАВИЛЬНОЕ английское слово (подсказка)
$("#btnSpeakT1").addEventListener("click", async () => speakEnglish(deck[t1I].en));
$("#btnT1Next").addEventListener("click", () => {
  t1I = (t1I + 1) % deck.length;
  t1Answered = false;
  renderTask1();
});

function resetTask1() { t1I = 0; t1Answered = false; }

let t1Attempts = 0, t1Correct = 0;

function renderTask1() {
  const w = deck[t1I];
  $("#t1Prompt").textContent = w.ru;
  $("#t1Pron").textContent = w.pron ? `Подсказка (как звучит EN): ${w.pron}` : "";
  $("#t1Index").textContent = `${t1I + 1} / ${deck.length}`;
  $("#t1Feedback").textContent = "";
  $("#t1Feedback").className = "feedback";

  const wrong = deck.filter(x => x.en !== w.en);
  const opts = shuffle([w, ...sample(wrong, 3)]).map(x => x.en);

  $("#t1Options").innerHTML = "";
  opts.forEach(text => {
    const b = document.createElement("button");
    b.textContent = text;
    b.addEventListener("click", () => {
      if (t1Answered) return;
      t1Answered = true;

      t1Attempts += 1;

      if (text === w.en) {
        t1Correct += 1;
        $("#t1Feedback").textContent = "Верно";
        $("#t1Feedback").classList.add("ok");
      } else {
        $("#t1Feedback").textContent = `Неверно. Правильно: ${w.en}`;
        $("#t1Feedback").classList.add("bad");
      }
    });
    $("#t1Options").appendChild(b);
  });
}

// ====== 2) MCQ ======
let mcqI = 0;
let mcqAnswered = false;

$("#btnSpeakMcq").addEventListener("click", async () => speakEnglish(deck[mcqI].en));
$("#btnMcqNext").addEventListener("click", () => {
  mcqI = (mcqI + 1) % deck.length;
  mcqAnswered = false;
  renderMcq();
});

function resetMcq() { mcqI = 0; mcqAnswered = false; }

function renderMcq() {
  const w = deck[mcqI];
  $("#mcqWord").textContent = w.en;
  $("#mcqPron").textContent = w.pron ? `Произношение: ${w.pron}` : "";
  $("#mcqIndex").textContent = `${mcqI + 1} / ${deck.length}`;
  $("#mcqFeedback").textContent = "";
  $("#mcqFeedback").className = "feedback";

  const wrong = deck.filter(x => x.en !== w.en);
  const opts = shuffle([w, ...sample(wrong, 3)]).map(x => x.ru);

  $("#mcqOptions").innerHTML = "";
  opts.forEach(text => {
    const b = document.createElement("button");
    b.textContent = text;
    b.addEventListener("click", () => {
      if (mcqAnswered) return;
      mcqAnswered = true;

      mcqAttempts += 1;

      if (text === w.ru) {
        mcqCorrect += 1;
        $("#mcqFeedback").textContent = "Верно";
        $("#mcqFeedback").classList.add("ok");
      } else {
        $("#mcqFeedback").textContent = `Неверно. Правильно: ${w.ru}`;
        $("#mcqFeedback").classList.add("bad");
      }
    });
    $("#mcqOptions").appendChild(b);
  });
}

// ====== 3) TYPING ======
let typeI = 0;

$("#btnSpeakType").addEventListener("click", async () => speakEnglish(deck[typeI].en));
$("#btnTypeNext").addEventListener("click", () => {
  typeI = (typeI + 1) % deck.length;
  $("#typeInput").value = "";
  $("#typeFeedback").textContent = "";
  $("#typeFeedback").className = "feedback";
  renderTyping();
});
$("#btnCheckType").addEventListener("click", checkTyping);
$("#typeInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") checkTyping();
});

function resetTyping() { typeI = 0; }

function renderTyping() {
  const w = deck[typeI];
  $("#typePrompt").textContent = w.ru;
  $("#typeIndex").textContent = `${typeI + 1} / ${deck.length}`;
}

function checkTyping() {
  const w = deck[typeI];
  const v = ($("#typeInput").value || "").trim();

  typeAttempts += 1;

  $("#typeFeedback").className = "feedback";
  if (v.toLowerCase() === w.en.toLowerCase()) {
    typeCorrect += 1;
    $("#typeFeedback").textContent = "Верно";
    $("#typeFeedback").classList.add("ok");
  } else {
    $("#typeFeedback").textContent = `Неверно. Правильно: ${w.en}`;
    $("#typeFeedback").classList.add("bad");
  }
}

// ====== 4) MATCHING ======
let matchPairs = new Map(); // en -> ru
let matchLeftSelected = null;
let matchRightSelected = null;
let matchLeftOrder = [];
let matchRightOrder = [];

$("#btnResetMatch").addEventListener("click", () => {
  resetMatch();
  renderMatch();
});

function resetMatch() {
  matchPairs = new Map();
  matchLeftSelected = null;
  matchRightSelected = null;
  matchLeftOrder = shuffle(deck);
  matchRightOrder = shuffle(deck);
  matchWrongAttempts = 0;
}

function renderMatch() {
  $("#matchFeedback").textContent = "";
  $("#matchFeedback").className = "feedback";

  const doneCount = matchPairs.size;
  $("#matchProgress").textContent = `Собрано пар: ${doneCount} / ${deck.length}`;

  $("#matchLeft").innerHTML = "";
  $("#matchRight").innerHTML = "";

  const usedRus = new Set(matchPairs.values());

  matchLeftOrder.forEach(w => {
    const div = document.createElement("div");
    div.className = "item";
    div.dataset.en = w.en;

    const already = matchPairs.has(w.en);
    if (already) div.classList.add("done", "correct");
    if (matchLeftSelected === w.en) div.classList.add("selected");

    div.innerHTML = `<span>${w.en}</span><span class="badge">🔊</span>`;
    div.addEventListener("click", async () => {
      if (matchPairs.has(w.en)) return;
      matchLeftSelected = w.en;
      matchRightSelected = null;
      renderMatch();
      await speakEnglish(w.en);
    });

    $("#matchLeft").appendChild(div);
  });

  matchRightOrder.forEach(w => {
    const div = document.createElement("div");
    div.className = "item";
    div.dataset.ru = w.ru;

    const already = usedRus.has(w.ru);
    if (already) div.classList.add("done", "correct");
    if (matchRightSelected === w.ru) div.classList.add("selected");

    div.innerHTML = `<span>${w.ru}</span>`;
    div.addEventListener("click", () => {
      if (already) return;
      matchRightSelected = w.ru;
      tryPair();
    });

    $("#matchRight").appendChild(div);
  });
}

function markPairVisual(leftEn, rightRu, cls) {
  const leftEl = $(`#matchLeft .item[data-en="${cssEscape(leftEn)}"]`);
  const rightEl = $(`#matchRight .item[data-ru="${cssEscape(rightRu)}"]`);
  if (leftEl) leftEl.classList.add(cls);
  if (rightEl) rightEl.classList.add(cls);
}

function clearPairVisual(leftEn, rightRu, cls) {
  const leftEl = $(`#matchLeft .item[data-en="${cssEscape(leftEn)}"]`);
  const rightEl = $(`#matchRight .item[data-ru="${cssEscape(rightRu)}"]`);
  if (leftEl) leftEl.classList.remove(cls);
  if (rightEl) rightEl.classList.remove(cls);
}

// CSS.escape fallback (для старых браузеров)
function cssEscape(str) {
  if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(str);
  return String(str).replace(/"/g, '\\"');
}

function tryPair() {
  if (!matchLeftSelected || !matchRightSelected) {
    renderMatch();
    return;
  }

  const left = matchLeftSelected;
  const right = matchRightSelected;
  const correct = deck.find(w => w.en === left)?.ru === right;

  if (correct) {
    matchPairs.set(left, right);

    $("#matchFeedback").textContent = "Верно";
    $("#matchFeedback").className = "feedback ok";

    matchLeftSelected = null;
    matchRightSelected = null;

    renderMatch();

    if (matchPairs.size === deck.length) {
      onMatchComplete();
    }
    return;
  }

  // Неверно: подсветить красным, затем сбросить к исходному цвету
  matchWrongAttempts += 1;
  $("#matchFeedback").textContent = "Неверно";
  $("#matchFeedback").className = "feedback bad";

  markPairVisual(left, right, "wrong");

  // небольшой таймер, потом сброс цвета/выбора
  setTimeout(() => {
    clearPairVisual(left, right, "wrong");
    matchLeftSelected = null;
    matchRightSelected = null;
    renderMatch();
  }, 650);
}

// ====== ФЕЙЕРВЕРК + ОЦЕНКА ======
function closeScoreModal() {
  const m = $("#scoreModal");
  // Дублируем скрытие и через class, и через inline-style — это лечит редкие баги WebView,
  // когда модалка остаётся видимой/перехватывает клики.
  m.classList.add("hidden");
  m.style.display = "none";
}

function openScoreModal() {
  const m = $("#scoreModal");
  m.classList.remove("hidden");
  m.style.display = "flex";
}

// Кнопка «Закрыть» (на некоторых Android/WebView click может срабатывать нестабильно)
const closeBtn = $("#btnCloseScore");
closeBtn.addEventListener("click", closeScoreModal);
closeBtn.addEventListener("pointerdown", closeScoreModal);
closeBtn.addEventListener("pointerup", closeScoreModal);
closeBtn.addEventListener("touchend", closeScoreModal, { passive: true });
closeBtn.addEventListener("touchstart", closeScoreModal, { passive: true });

// Клик по затемнённому фону (вне карточки)
const scoreModal = $("#scoreModal");
scoreModal.addEventListener("click", (e) => {
  if (e.target && e.target.id === "scoreModal") closeScoreModal();
});

scoreModal.addEventListener("pointerup", (e) => {
  if (e.target && e.target.id === "scoreModal") closeScoreModal();
});

// Фолбэк: закрыть модалку любым тапом по кнопке/фону (через capture), если WebView теряет событие
document.addEventListener("pointerdown", (e) => {
  if ($("#scoreModal").classList.contains("hidden")) return;
  const t = e.target;
  if (!t) return;
  if (t.id === "btnCloseScore" || t.id === "scoreModal") closeScoreModal();
}, true);

document.addEventListener("touchstart", (e) => {
  if ($("#scoreModal").classList.contains("hidden")) return;
  const t = e.target;
  if (!t) return;
  if (t.id === "btnCloseScore" || t.id === "scoreModal") closeScoreModal();
}, { capture: true, passive: true });

// Esc
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#scoreModal").classList.contains("hidden")) {
    closeScoreModal();
  }
});

function onMatchComplete() {
  $("#matchFeedback").textContent = "Готово: все пары собраны";
  $("#matchFeedback").className = "feedback ok";

  launchFireworks(2200);

  const score = buildScore();
  $("#scoreText").innerHTML = score.html;
  openScoreModal();
}

function buildScore() {
  const n = deck.length;

  const t1Acc = t1Attempts ? (t1Correct / t1Attempts) : 0;
  const mcqAcc = mcqAttempts ? (mcqCorrect / mcqAttempts) : 0;
  const typeAcc = typeAttempts ? (typeCorrect / typeAttempts) : 0;
  const matchAcc = n ? (matchPairs.size / n) : 0;

  // БАЛЛЫ (простая система)
  const maxScore = n * 25; // 10 (matching) + 5 (task1) + 5 (mcq) + 5 (typing) за слово (если всё пройти по одному разу)
  let points = 0;
  points += matchPairs.size * 10;
  points -= matchWrongAttempts * 2;
  points += t1Correct * 5;
  points += mcqCorrect * 5;
  points += typeCorrect * 5;
  points = Math.max(0, Math.round(points));

  const percent = Math.round((((0.5 * matchAcc) + (0.1667 * t1Acc) + (0.1667 * mcqAcc) + (0.1666 * typeAcc)) * 100));

  let grade = "C";
  if (percent >= 90) grade = "A";
  else if (percent >= 75) grade = "B";
  else if (percent >= 60) grade = "C";
  else grade = "D";

  const html = `
    <div><b>Итог:</b> ${percent}% (оценка: <b>${grade}</b>)</div>
    <div style="margin-top:10px;">
      <div>4) Соответствия: <b>${matchPairs.size}</b> / ${n} (ошибок: ${matchWrongAttempts})</div>
      <div>1) Выбор слова (RU→EN): <b>${t1Correct}</b> / ${t1Attempts || 0}</div>
      <div>2) Выбор перевода: <b>${mcqCorrect}</b> / ${mcqAttempts || 0}</div>
      <div>3) Ввод слова: <b>${typeCorrect}</b> / ${typeAttempts || 0}</div>
    </div>
    <div style="margin-top:10px;"><b>Баллы:</b> ${points} / ${maxScore}</div>
  `.trim();

  return { points, maxScore, percent, grade, html };
}

function launchFireworks(durationMs = 2000) {
  const canvas = $("#fxCanvas");
  const ctx = canvas.getContext("2d");

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();

  const particles = [];
  const start = performance.now();

  function spawnBurst() {
    const x = Math.random() * window.innerWidth;
    const y = (Math.random() * window.innerHeight) * 0.5 + 40;
    const count = 70 + Math.floor(Math.random() * 40);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 4.5;
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 900 + Math.random() * 700,
        age: 0,
        r: 2 + Math.random() * 3
      });
    }
  }

  let burstTimer = 0;
  function frame(ts) {
    const elapsed = ts - start;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    burstTimer += 16;
    if (burstTimer > 220) {
      burstTimer = 0;
      spawnBurst();
    }

    // update/draw
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += 16;
      p.vy += 0.06; // gravity
      p.x += p.vx;
      p.y += p.vy;
      const k = 1 - (p.age / p.life);
      if (k <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.max(0, k);
      // цвет не задаём явно: используем HSL с рандомом
      const hue = (p.x + p.y + p.age) % 360;
      ctx.fillStyle = `hsl(${hue}, 90%, 60%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (elapsed < durationMs) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  window.addEventListener("resize", resize, { once: true });
  spawnBurst();
  requestAnimationFrame(frame);
}

// ====== RESET ALL ======
function resetAll() {
  t1Attempts = 0; t1Correct = 0;
  resetTask1();

  mcqAttempts = 0; mcqCorrect = 0;
  typeAttempts = 0; typeCorrect = 0;
  matchWrongAttempts = 0;

  resetMcq();
  resetTyping();
  resetMatch();
}

// ====== РЕНДЕР ВСЕГО ======
function renderAll() {
  renderTask1();
  renderMcq();
  renderTyping();
  renderMatch();
}

// ====== INIT ======
applyBackground(currentTab);
resetAll();
renderAll();
