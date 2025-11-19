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
  const questionNum = el("qnum");
  const currentScore = el("score-mini");

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
    startScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    quizScreen.classList.remove("hidden");
    renderQuestion();
  }

  function renderQuestion() {
    questionNum.textContent = current + 1;
    currentScore.textContent = score;

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
      li.innerHTML = `<span class="choice-label">${String.fromCharCode(
        65 + i
      )}</span><span class="choice-text">${ch}</span>`;
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
    });
    updateProgress();
  }

  function onSelect(e) {
    const li = e.currentTarget || this;
    if (selected !== null) return; // prevent changing after answered
    selected = Number(li.dataset.index);
    const idx = order[current];
    const item = QUESTIONS[idx];
    // mark
    const nodes = Array.from(choicesList.children);
    nodes.forEach((n) =>
      n.classList.remove("selected", "correct", "incorrect")
    );
    if (selected === item.answer) {
      li.classList.add("correct");
      score++;
    } else {
      li.classList.add("incorrect");
      // reveal correct
      const correctNode = nodes.find(
        (n) => Number(n.dataset.index) === item.answer
      );
      if (correctNode) correctNode.classList.add("correct");
    }
    // advance after short delay
    setTimeout(() => {
      current++;
      if (current >= order.length) showResult();
      else renderQuestion();
    }, 700);
  }

  function updateProgress() {
    const pct = Math.round((current / order.length) * 100);
    progressBar.style.width = pct + "%";
  }

  function showResult() {
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

  // init
  function init() {
    startScreen.classList.remove("hidden");
    quizScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
  }
  init();
})();
