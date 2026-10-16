/**
 * Small shared pieces for the hand-built Tamil activities (the ones that do
 * not use QuizEngine): end-of-round rewards, celebrations and the "how will
 * this sound" notice.
 *
 *   KlgTamilGames.finish({ score, total, el })  banks progress, fills el
 *   KlgTamilGames.cheer(target?)                sound + small confetti burst
 *   KlgTamilGames.oops()                        gentle wrong sound
 *   KlgTamilGames.voiceNote(el)                 explains where audio comes from
 *   KlgTamilGames.modeLinks(container, param)   highlights ?param= links
 */
(function () {
  "use strict";
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  function cheer(target) {
    if (window.KlgSounds) KlgSounds.correct();
    if (typeof confetti !== "function" || reduced()) return;
    const rect = target && target.getBoundingClientRect ? target.getBoundingClientRect() : null;
    confetti({
      particleCount: 18, spread: 60, scalar: 0.7, ticks: 60,
      origin: rect
        ? { x: (rect.left + rect.width / 2) / innerWidth, y: (rect.top + rect.height / 2) / innerHeight }
        : { x: 0.5, y: 0.6 },
    });
  }

  function oops() {
    if (window.KlgSounds) KlgSounds.wrong();
  }

  function starsFor(score, total) {
    const pct = total ? score / total : 0;
    return pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.5 ? 1 : 0;
  }

  function finish({ score, total, el, message }) {
    const stars = starsFor(score, total);
    const reward = window.KlgProgress
      ? KlgProgress.record({ score, total, elapsedMs: 0, bestStreak: 0 })
      : null;
    if (stars >= 2) {
      if (window.KlgSounds) KlgSounds.fanfare();
      if (typeof confetti === "function" && !reduced()) confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    }
    if (el) {
      el.replaceChildren();
      const big = document.createElement("div");
      big.className = "tg-finish-score";
      big.textContent = `${score} / ${total}`;
      const starLine = document.createElement("div");
      starLine.className = "tg-finish-stars";
      starLine.textContent = stars ? "⭐".repeat(stars) : "🌱";
      const note = document.createElement("p");
      note.className = "tg-finish-note";
      note.textContent = message || (stars === 3 ? "அருமை! Wonderful!" : stars >= 1 ? "நன்று! Well done — keep going!" : "Every try helps your brain grow. Play again!");
      el.append(big, starLine, note);
      if (reward) {
        const xp = document.createElement("p");
        xp.className = "tg-finish-xp";
        xp.textContent = `+${reward.xp} XP · ${reward.rank.emoji} ${reward.rank.name}` +
          (reward.newBadges.length ? ` · New badge: ${reward.newBadges.map((b) => b.emoji + " " + b.name).join(", ")}` : "");
        el.appendChild(xp);
      }
    }
    return reward;
  }

  function voiceNote(el) {
    if (!el) return;
    const refresh = () => {
      const tts = window.KlgTamilAudio && KlgTamilAudio.tamilVoice();
      el.textContent = tts
        ? "🎙️ Real Tamil voice recordings, plus this device’s Tamil voice for anything not recorded."
        : "🎙️ Real Tamil voice recordings. A few rare letters are taught by blending their sounds (க் + இ → கி).";
    };
    refresh();
    if ("speechSynthesis" in window) speechSynthesis.addEventListener("voiceschanged", refresh);
  }

  /** Marks the ?param= link that matches the current URL as selected. */
  function modeLinks(container, param, fallback) {
    if (!container) return;
    const current = new URLSearchParams(location.search).get(param) || fallback;
    container.querySelectorAll("a").forEach((a) => {
      const value = new URLSearchParams(a.getAttribute("href").replace(/^[^?]*\??/, "")).get(param) || fallback;
      const selected = value === current;
      a.classList.toggle("btn-secondary", selected);
      a.classList.toggle("btn-outline-secondary", !selected);
      if (selected) a.setAttribute("aria-current", "true");
    });
  }

  window.KlgTamilGames = { finish, cheer, oops, voiceNote, modeLinks, starsFor };
})();
