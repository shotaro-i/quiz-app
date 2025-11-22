// Simple accessible quiz app (vanilla JS)
(function () {
  "use strict";

  // Small question bank - production usage: replace or import JSON
  const QUESTIONS = [
    {
      q: "Which language runs in a web browser?",
      choices: ["Java", "C", "Python", "JavaScript"],
      answer: 3,
    },
    {
      q: "What does CSS stand for?",
      choices: [
        "Central Style Sheets",
        "Cascading Style Sheets",
        "Cascading Simple Sheets",
        "Cars SUVs Sailboats",
      ],
      answer: 1,
    },
    {
      q: "What does HTML stand for?",
      choices: [
        "HyperText Markup Language",

        "Hyperlinks Text Mark Language",
        "Home Tool Markup Language",
        "Hyperlinking Textual Markup Language",
      ],
      answer: 0,
    },
    {
      q: "Which CSS property controls the text size?",
      choices: ["font-style", "text-size", "font-size", "text-style"],
      answer: 2,
    },
    {
      q: "Which built-in method adds one or more elements to the end of an array?",
      choices: ["last()", "append()", "push()", "put()"],
      answer: 2,
    },
  ];

  // DOM refs
  const el = (id) => document.getElementById(id);
  const startScreen = el("start-screen");
  const quizScreen = el("quiz-screen");
  const resultScreen = el("result-screen");
  const btnStart = el("btn-start");
  const btnRestart = el("btn-restart");
  const progressBar = el("progress-bar");
  const qText = el("question-text");
  const choicesList = el("choices");
  const scoreEl = el("score");
  const seedInput = el("seed");
  const questionNum = el("question-num");
  const currentScore = el("current-score");
  const announcer = el("sr-announcer");

  let order = [];
  let current = 0;
  let score = 0;
  let selected = null;

  function randSeed(s) {
    // simple LCG for reproducible order
    let m = 0x80000000, //　2 to the power of 31 in hexadecimal
      a = 1103515245,
      c = 12345;
    let state = typeof s === "number" ? s : hashStr(String(s));

    //Once this function called as a variable definition, subsequent calls to that variable will only invoke the anonymous function portion thereafter.
    return function () {
      state = (a * state + c) % m;
      return state / m; // return in range [0,1)
    };
  }

  function hashStr(str) {
    // djb2
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = (h << 5) + h + str.charCodeAt(i);
    return h >>> 0; // ensure non-negative integer (~ mod 4294967296(=2^32))
  }

  function shuffle(arr, rnd = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1)); // random index from [0,i]
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function start() {
    const seedVal = seedInput.value.trim();
    let rnd;
    if (seedVal === "") {
      rnd = Math.random;
    } else {
      const num = Number(seedVal);
      rnd = randSeed(isNaN(num) ? hashStr(seedVal) : num);
    }
    order = shuffle(
      QUESTIONS.map((_, i) => i),
      rnd
    );
    current = 0;
    score = 0;
    // reset current-score (only if element exists)
    if (currentScore) currentScore.textContent = score;
    // ensure progress resets
    if (progressBar) progressBar.style.width = "0";
    if (progressBar) progressBar.setAttribute("aria-valuenow", "0");
    startScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    quizScreen.classList.remove("hidden");
    // subtle card entrance animation
    const quizCard = quizScreen.querySelector(".card");
    if (quizCard) {
      quizCard.classList.add("animate");
      setTimeout(() => quizCard.classList.remove("animate"), 520);
    }
    renderQuestion();
  }

  function renderQuestion() {
    questionNum.textContent = current + 1;
    // Do not update the current-score here; update it only after the user selects an answer

    selected = null;
    const idx = order[current];
    const item = QUESTIONS[idx];
    qText.textContent = `Q${current + 1}. ${item.q}`;
    choicesList.innerHTML = "";
    item.choices.forEach((ch, i) => {
      const li = document.createElement("li");
      li.className = "choice";
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      li.dataset.index = i;
      // build children safely to avoid HTML injection
      const label = document.createElement("span");
      label.className = "choice-label";
      label.textContent = String.fromCharCode(65 + i);
      const text = document.createElement("span");
      text.className = "choice-text";
      text.textContent = ch;
      li.appendChild(label);
      li.appendChild(text);
      li.addEventListener("click", onSelect);
      li.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          onSelect.call(li, ev);
          return;
        }
        // Move focus with arrow keys (do not select)
        if (ev.key === "ArrowDown" || ev.key === "ArrowRight") {
          ev.preventDefault();
          const next = li.nextElementSibling || choicesList.firstElementChild;
          if (next) next.focus();
        } else if (ev.key === "ArrowUp" || ev.key === "ArrowLeft") {
          ev.preventDefault();
          const prev =
            li.previousElementSibling || choicesList.lastElementChild;
          if (prev) prev.focus();
        }
      });
      choicesList.appendChild(li);
      // staggered entrance
      setTimeout(() => li.classList.add("entered"), 40 * i + 20);
    });
    // focus first choice for keyboard users
    setTimeout(() => {
      const first = choicesList.firstElementChild;
      if (first) first.focus();
    }, 40);
    // progress is updated when the user finalizes a choice
  }

  function onSelect(e) {
    const li = e.currentTarget || this;
    if (selected !== null) return; // prevent changing after answered
    selected = Number(li.dataset.index);
    const idx = order[current];
    const item = QUESTIONS[idx];
    // mark
    const nodes = Array.from(choicesList.children);
    nodes.forEach((n) => n.classList.remove("correct", "incorrect"));

    if (selected === item.answer) {
      li.classList.add("correct");
      score++;
      if (announcer) announcer.textContent = "Correct";
    } else {
      li.classList.add("incorrect");
      // reveal correct
      const correctNode = nodes.find(
        (n) => Number(n.dataset.index) === item.answer
      );
      if (correctNode) correctNode.classList.add("correct");
      if (announcer)
        announcer.textContent = `Incorrect. Correct answer is ${String.fromCharCode(
          65 + item.answer
        )}.`;
    }
    // update current-score and progress now that the user has finalized this choice
    if (currentScore) currentScore.textContent = score;
    current++;
    updateProgress();
    // advance after short delay
    setTimeout(() => {
      if (current >= order.length) showResult();
      else renderQuestion();
    }, 700);
  }

  function updateProgress() {
    let pct = 0;
    const total = order.length || 0;
    const done = typeof current === "number" ? current : 0;
    if (total > 0) pct = Math.round((done / total) * 100);
    if (progressBar) progressBar.style.width = pct + "%";
    if (progressBar) progressBar.setAttribute("aria-valuenow", String(pct));
  }

  function showResult() {
    // ensure progress shows complete
    if (progressBar) progressBar.style.width = "100%";
    if (progressBar) progressBar.setAttribute("aria-valuenow", "100");
    quizScreen.classList.add("hidden");
    resultScreen.classList.remove("hidden");
    scoreEl.textContent = `${score} / ${order.length}`;
    saveHighScore(score);
  }

  function saveHighScore(s) {
    try {
      const key = "quiz_highscore_v1";
      const prev = Number(localStorage.getItem(key) || "0");
      if (s > prev) localStorage.setItem(key, String(s));
    } catch (err) {
      // swallow: localStorage may be unavailable in some contexts
      console.error("Could not save high score", err);
    }
  }

  btnStart.addEventListener("click", start);
  btnRestart.addEventListener("click", () => {
    startScreen.classList.remove("hidden");
    resultScreen.classList.add("hidden");
    quizScreen.classList.add("hidden");
  });

  // small accessibility: focus management
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      // return to start
      startScreen.classList.remove("hidden");
      quizScreen.classList.add("hidden");
      resultScreen.classList.add("hidden");
    }
  });

  // theme toggle logic
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = themeToggle && themeToggle.querySelector(".theme-icon");
  function setTheme(mode) {
    document.documentElement.classList.toggle("dark-mode", mode === "dark");
    if (themeIcon) themeIcon.textContent = mode === "dark" ? "🌙" : "☀️";
    if (themeToggle)
      themeToggle.setAttribute(
        "aria-pressed",
        mode === "dark" ? "true" : "false"
      );
  }
  function getPreferredTheme() {
    return (
      localStorage.getItem("theme-mode") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light")
    );
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.classList.contains("dark-mode")
        ? "dark"
        : "light";
      const next = current === "dark" ? "light" : "dark";
      setTheme(next);
      localStorage.setItem("theme-mode", next);
    });
    // init display
    setTheme(getPreferredTheme());
  }

  // init
  function init() {
    startScreen.classList.remove("hidden");
    quizScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
  }
  init();
})();
