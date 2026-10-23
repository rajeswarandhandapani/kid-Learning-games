/**
 * KlgBlocks — base-10 blocks and a place-value chart.
 *
 *   blocks(n, { highlight })   hundreds flats, tens rods and ones cubes for n (0–999)
 *   chart(n)                   Hundreds | Tens | Ones table with the digits
 *   parts(n)                   { h, t, o }
 *
 * highlight: "h" | "t" | "o" fades the other kinds so a child can see one place.
 * Counts are on data-h / data-t / data-o and the total on data-value.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;

  function parts(n) { return { h: Math.floor(n / 100) % 10, t: Math.floor(n / 10) % 10, o: n % 10 }; }

  function make(cls, count, host) {
    for (let i = 0; i < count; i++) {
      const b = document.createElement("span");
      b.className = "kv-b " + cls;
      host.appendChild(b);
    }
  }

  function blocks(n, { highlight, label } = {}) {
    const p = parts(n);
    const f = V.figure(label || n + " shown with blocks: " + p.h + " hundreds, " + p.t + " tens and " + p.o + " ones", "kv-blocks");
    f.dataset.h = String(p.h); f.dataset.t = String(p.t); f.dataset.o = String(p.o); f.dataset.value = String(n);
    [["h", "kv-flat", "kv-col-h"], ["t", "kv-rod", "kv-col-t"], ["o", "kv-cube", "kv-col-o"]].forEach(([k, cls, col]) => {
      const group = document.createElement("div");
      group.className = "kv-bgroup " + col + (highlight && highlight !== k ? " dim" : "");
      group.setAttribute("aria-hidden", "true");
      make(cls, p[k], group);
      f.appendChild(group);
    });
    return f;
  }

  function chart(n, { label } = {}) {
    const p = parts(n);
    const f = V.figure(label || n + " in a place-value chart: " + p.h + " hundreds, " + p.t + " tens, " + p.o + " ones", "kv-pvchart");
    f.dataset.value = String(n);
    const t = document.createElement("table");
    t.setAttribute("aria-hidden", "true");
    t.innerHTML = "<tr><th>Hundreds</th><th>Tens</th><th>Ones</th></tr><tr><td>" + p.h + "</td><td>" + p.t + "</td><td>" + p.o + "</td></tr>";
    f.appendChild(t);
    return f;
  }

  window.KlgBlocks = { blocks, chart, parts };
})();
