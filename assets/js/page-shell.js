/**
 * KlgShell — the same simple frame around every game, so a child who has learned
 * one game knows them all. Loaded last on each game page, after the game has
 * built its controls, and needs no per-game code.
 *
 *   Top bar       🏠 Home (back to this subject), the game's name, 🔊 sound
 *   Start screen  picture, name, one big ▶ Play and 🔊 Hear how to play.
 *                 Everything else folds away under ⚙️ More ways to play.
 *   Play screen   back, progress and score on one short row, with the speaker
 *                 beside the question.
 *
 * Elements are moved, never rebuilt, so each game's own code keeps finding them.
 */
(function () {
  "use strict";
  const STAGE_KEY = "klg-stage";
  const canSpeak = !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance !== "undefined";

  function say(text) {
    if (!canSpeak || !text) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text).replace(/[\u{1F300}-\u{1FAFF}]/gu, "").trim());
    utterance.lang = "en-US";
    utterance.rate = 0.88;
    speechSynthesis.speak(utterance);
  }

  const gameId = window.KlgProgress ? KlgProgress.currentGameId() : null;
  const game = gameId && window.KlgCatalogue ? KlgCatalogue.byId(gameId) : null;

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* ---------- top bar ---------- */
  function buildTopBar() {
    const bar = document.querySelector(".klg-navbar .container");
    if (!bar) return;
    const home = bar.querySelector(".navbar-brand");
    if (home) {
      home.textContent = "🏠 Home";
      home.setAttribute("aria-label", "Home: choose another game");
      if (game) home.setAttribute("href", "../../index.html#world/" + game.subject);
    }
    const name = bar.querySelector(".navbar-text");
    if (name) name.classList.add("kid-game-name");
    const sound = document.getElementById("klg-mute-btn");
    if (sound) bar.appendChild(sound);
  }

  /* ---------- start screen ---------- */
  function startRoot() {
    const screen = document.getElementById("start-screen");
    if (!screen) return null;
    return screen.querySelector(":scope > .card-body") || screen;
  }

  function isHeading(node) {
    return node.matches(".game-card-icon, .typing-emblem, h1, h2, .tg-subtitle");
  }

  /** The two ways to play, as big buttons. The existing #play-mode still holds the choice. */
  function buildPlayModeButtons() {
    const select = document.getElementById("play-mode");
    if (!select) return;
    const holder = select.closest(".quiz-settings");
    const row = make("div", "kid-mode-row");
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", "How would you like to play?");
    const buttons = [["practice", "🐢 Take your time"], ["challenge", "⏱️ Beat the clock"]].map(([value, label]) => {
      const button = make("button", "kid-mode-btn", label);
      button.type = "button";
      button.dataset.playMode = value;
      button.addEventListener("click", () => {
        select.value = value;
        select.dispatchEvent(new Event("change"));
        paint();
      });
      row.appendChild(button);
      return button;
    });
    function paint() {
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.playMode === select.value)));
    }
    paint();
    holder.classList.add("kid-select-hidden");
    holder.before(row);
  }

  function buildStartScreen() {
    const root = startRoot();
    const start = document.getElementById("start-btn");
    if (!root || !start) return;
    const reviewing = document.getElementById("klg-review-intro");
    start.textContent = reviewing ? "▶ Start review" : "▶ Play";
    start.classList.add("kid-play");

    buildPlayModeButtons();

    // How-to-play text is read now, because it is about to fold away.
    const how = root.querySelector(".text-muted small") || root.querySelector("#quiz-info");
    const howText = [game ? game.name : "", how ? how.textContent.replace(/\s+/g, " ").trim() : (game ? game.blurb : "")].filter(Boolean).join(". ");

    const hear = root.querySelector(".quiz-intro-listen") || (canSpeak ? make("button", "quiz-listen quiz-intro-listen", "🔊 Hear how to play") : null);
    if (hear && !hear.parentNode) {
      hear.type = "button";
      hear.addEventListener("click", () => say(howText));
    }

    // Top to bottom: the picture and name, then Play, then the sound button, then the rest.
    const label = root.querySelector("#mode-label");
    const more = make("details", "kid-more");
    const summary = make("summary", "", "⚙️ More ways to play");
    more.appendChild(summary);
    [...root.children].forEach((node) => {
      if (isHeading(node) || node === start || node === hear || node === reviewing || node === label) return;
      more.appendChild(node);
    });
    if (label && !label.textContent.trim()) more.appendChild(label);
    root.append(start);
    if (reviewing) root.insertBefore(reviewing, start);
    if (hear) root.append(hear);
    // Anything visible left in the fold? A review hides its settings, so nothing would be.
    const useful = [...more.children].some((node) => node !== summary && node.style.display !== "none" && !node.hidden);
    if (useful) root.append(more);
    // Coming back from a level or mode link: show which one is on.
    const settings = new URLSearchParams(location.search);
    settings.delete("review");
    if (useful && [...settings.keys()].length) more.open = true;
  }

  /* ---------- play screen ---------- */
  function shortenProgress(node) {
    const first = node.firstChild;
    if (first && first.nodeType === Node.TEXT_NODE && /Question/.test(first.textContent)) {
      const word = make("span", "visually-hidden", first.textContent);
      node.replaceChild(word, first);
    }
  }

  /** Removes a row, or the parts of it, left empty after its contents moved. */
  function prune(node) {
    [...node.children].forEach(prune);
    if (!node.children.length && !node.textContent.trim()) node.remove();
  }

  function buildPlayHeader() {
    document.querySelectorAll(".quiz-tools").forEach((tools) => {
      const back = tools.querySelector("button");
      if (back && /Change activity/.test(back.textContent)) back.textContent = "⬅ Back";
      const message = tools.querySelector("span.small");
      if (message) message.classList.add("visually-hidden");
      const screen = tools.parentNode;
      const progress = screen.querySelector(".quiz-progress-text");
      const oldRow = progress ? progress.closest(".d-flex.justify-content-between, .mg-toolbar") : null;
      if (progress) {
        shortenProgress(progress);
        tools.insertBefore(progress, back ? back.nextSibling : tools.firstChild);
      }
      const mascot = screen.querySelector("#quiz-mascot");
      const score = screen.querySelector("#score-pill");
      if (mascot) tools.append(mascot);
      if (score) tools.append(score);
      if (oldRow) prune(oldRow);
    });
    const timerText = document.getElementById("timer-text");
    if (timerText && timerText.parentNode) timerText.parentNode.classList.add("kid-timer-text");
  }

  /** Puts the speaker beside the question, so it no longer takes a row of its own. */
  function buildPrompt() {
    [["#question-text", ".quiz-listen:not(.quiz-intro-listen)"], ["#task", "#listen-btn"]].forEach(([questionSelector, listenSelector]) => {
      const question = document.querySelector(questionSelector);
      const listen = document.querySelector(listenSelector);
      if (!question || !listen || question.nextElementSibling !== listen) return;
      const row = make("div", "kid-prompt");
      question.before(row);
      row.append(question, listen);
      listen.textContent = "🔊";
      if (!listen.getAttribute("aria-label")) listen.setAttribute("aria-label", "Listen again");
    });
  }

  function init() {
    document.body.classList.add("kid-game");
    if (game) document.body.dataset.subject = game.subject;
    buildTopBar();
    buildStartScreen();
    buildPlayHeader();
    buildPrompt();
  }

  /** The chosen age band, or null before one is chosen. */
  function stage() {
    try {
      return localStorage.getItem(STAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  window.KlgShell = { say, canSpeak, game, stage };

  // Game scripts come first in the page, so their own start-up has already run.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
