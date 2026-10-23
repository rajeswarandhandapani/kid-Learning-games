/**
 * KlgRound — the round loop shared by the hand-built picture games.
 *
 *   KlgRound.run({
 *     total: 8,                       questions per round
 *     make(index, asked) { … },       returns a question object (anything)
 *     render(q, ctx) { … },           draws the question into ctx.stage
 *     speak: true,                    read each task aloud when the browser can
 *   })
 *
 * ctx (passed to render):
 *   ctx.stage            element to draw into
 *   ctx.task(text)       sets (and, if enabled, speaks) the instruction
 *   ctx.right(msg)       correct: cheer; scores a point if no earlier mistake
 *   ctx.wrong(msg)       gentle "try again": keeps the question open
 *   ctx.reveal(msg)      show the answer after help: no point, moves on
 *   ctx.firstTry()       true until ctx.wrong() has been called
 *   ctx.index, ctx.total, ctx.say(text)
 *
 * Expected page ids (see scripts/new-game.cjs): start-btn, start-screen,
 * play-screen, exit-btn, score-pill, progress-text, task, listen-btn, stage,
 * feedback, next-btn, finish-screen, finish-summary, play-again.
 * Finishing records progress through KlgGameKit.finish → KlgProgress.
 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const canSpeak = "speechSynthesis" in window;

  function say(text) {
    if (!canSpeak || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/[\u{1F300}-\u{1FAFF}]/gu, "").trim());
    u.lang = "en-US";
    u.rate = 0.88;
    speechSynthesis.speak(u);
  }

  function run(opts) {
    const total = opts.total || 8;
    let index = 0, score = 0, asked = new Set(), current = null, mistakes = 0, closed = false, lastTask = "";
    const nextBtn = $("next-btn");

    const ctx = {
      stage: $("stage"),
      total,
      index: 0,
      say,
      firstTry: () => mistakes === 0,
      task(text) {
        $("task").textContent = text;
        lastTask = text;
        $("listen-btn").hidden = !canSpeak;
        if (opts.speak !== false) say(text);
      },
      right(msg) {
        if (closed) return;
        closed = true;
        if (mistakes === 0) score += 1;
        $("score-pill").textContent = "⭐ " + score;
        setFeedback((mistakes === 0 ? "Yes! " : "You got it! ") + (msg || ""), "good");
        if (window.KlgGameKit) KlgGameKit.cheer(nextBtn);
        showNext();
      },
      wrong(msg) {
        if (closed) return;
        mistakes += 1;
        if (window.KlgGameKit) KlgGameKit.oops();
        setFeedback(msg || "Not quite. Look again and have another go.", "try");
      },
      reveal(msg) {
        if (closed) return;
        closed = true;
        mistakes += 1;
        setFeedback(msg || "", "try");
        showNext();
      },
    };

    function setFeedback(text, kind) {
      const f = $("feedback");
      f.textContent = text;
      f.className = "mg-feedback " + (kind || "");
    }

    function showNext() {
      nextBtn.textContent = index + 1 === total ? "See my stars →" : "Next →";
      nextBtn.hidden = false;
      nextBtn.focus({ preventScroll: true });
    }

    function show() {
      closed = false;
      mistakes = 0;
      ctx.index = index;
      nextBtn.hidden = true;
      setFeedback("", "");
      $("progress-text").textContent = `Question ${index + 1} / ${total}`;
      $("score-pill").textContent = "⭐ " + score;
      ctx.stage.replaceChildren();
      current = opts.make(index, asked);
      opts.render(current, ctx);
    }

    function start() {
      index = 0; score = 0; asked = new Set();
      $("start-screen").classList.add("d-none");
      $("finish-screen").classList.add("d-none");
      $("play-screen").classList.remove("d-none");
      show();
    }

    function finish() {
      $("play-screen").classList.add("d-none");
      $("finish-screen").classList.remove("d-none");
      KlgGameKit.finish({ score, total, el: $("finish-summary") });
      $("finish-screen").focus();
    }

    nextBtn.addEventListener("click", () => {
      if (index + 1 >= total) return finish();
      index += 1;
      show();
    });
    $("start-btn").addEventListener("click", () => { if (window.KlgSounds) KlgSounds.click(); start(); });
    $("play-again").addEventListener("click", () => { if (window.KlgSounds) KlgSounds.click(); start(); });
    $("exit-btn").addEventListener("click", () => {
      if (canSpeak) speechSynthesis.cancel();
      $("play-screen").classList.add("d-none");
      $("start-screen").classList.remove("d-none");
    });
    $("listen-btn").addEventListener("click", () => say(lastTask));
    return { start };
  }

  window.KlgRound = { run, say, canSpeak };
})();
