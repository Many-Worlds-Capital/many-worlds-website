// Branching worldlines: one line enters from the left and splits, Everett-style,
// into many. One history is traced in signal blue; the rest stay hairline grey.
(function () {
  const canvas = document.getElementById("worlds");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const GREY = "rgba(0, 0, 0, 0.13)";
  const BLUE = "#0057ff";
  const DRAW_MS = 14000;   // time for the front to cross the screen
  const HOLD_MS = 6000;
  const FADE_MS = 2200;
  const SAMPLES = 28;

  let w = 0, h = 0, dpr = 1;
  let segments = [];
  let start = performance.now();
  let mouse = null;
  let bend = { x: 0, y: 0, k: 0 };
  let raf = 0;

  function rand(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  }

  function build(seed) {
    const r = rand(seed);
    segments = [];
    const y0 = h * (w < 640 ? 0.3 : 0.38);
    const spread = h * (w < 640 ? 0.16 : 0.2);
    const maxDepth = w < 640 ? 5 : 6;
    let leaves = [];

    function grow(x, y, depth, onPath) {
      const step = (w * 1.05) / (maxDepth + 1) * (0.75 + r() * 0.5);
      const x1 = x + step;
      if (depth >= maxDepth || x1 > w * 1.08) {
        const tail = { x0: x, y0: y, x1: w * 1.1, y1: y + (r() - 0.5) * spread * 0.2, onPath };
        segments.push(tail);
        leaves.push(tail);
        return;
      }
      const splits = depth === 0 || r() < 0.82;
      if (!splits) {
        segments.push({ x0: x, y0: y, x1, y1: y + (r() - 0.5) * spread * 0.15, onPath });
        grow(x1, segments[segments.length - 1].y1, depth + 1, onPath);
        return;
      }
      const gap = (spread / Math.pow(depth + 1, 0.85)) * (0.7 + r() * 0.6);
      const up = y - gap / 2, down = y + gap / 2;
      const pathUp = onPath && r() < 0.5;
      segments.push({ x0: x, y0: y, x1, y1: up, onPath: pathUp });
      segments.push({ x0: x, y0: y, x1, y1: down, onPath: onPath && !pathUp });
      grow(x1, up, depth + 1, pathUp);
      grow(x1, down, depth + 1, onPath && !pathUp);
    }

    const lead = w * (0.08 + r() * 0.06);
    segments.push({ x0: -10, y0: y0, x1: lead, y1: y0, onPath: true });
    grow(lead, y0, 0, true);

    for (const s of segments) {
      s.pts = [];
      for (let i = 0; i <= SAMPLES; i++) {
        const t = i / SAMPLES;
        const e = t * t * (3 - 2 * t); // smoothstep: horizontal tangents at both ends
        s.pts.push([s.x0 + (s.x1 - s.x0) * t, s.y0 + (s.y1 - s.y0) * e]);
      }
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build(Math.floor(start) || 7);
  }

  function displaced(x, y) {
    if (!bend.k) return y;
    const dx = x - bend.x, dy = y - bend.y;
    const f = Math.exp(-(dx * dx + dy * dy) / (2 * 110 * 110));
    return y + (bend.y - y) * 0.22 * f * bend.k;
  }

  function stroke(s, front) {
    if (s.x0 > front) return;
    ctx.beginPath();
    let first = true;
    for (const [x, y] of s.pts) {
      if (x > front) break;
      const yy = displaced(x, y);
      if (first) { ctx.moveTo(x, yy); first = false; } else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  function render(front, alpha) {
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1;
    ctx.strokeStyle = GREY;
    for (const s of segments) if (!s.onPath) stroke(s, front);
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = BLUE;
    for (const s of segments) if (s.onPath) stroke(s, front);
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const t = now - start;
    const total = DRAW_MS + HOLD_MS + FADE_MS;
    if (t > total) {
      start = now;
      build(Math.floor(now));
    }
    const p = Math.min(1, t / DRAW_MS);
    const eased = 1 - Math.pow(1 - p, 2.2);
    const front = eased * w * 1.12;
    const alpha = t > DRAW_MS + HOLD_MS ? 1 - (t - DRAW_MS - HOLD_MS) / FADE_MS : 1;

    const target = mouse ? 1 : 0;
    bend.k += (target - bend.k) * 0.06;
    if (mouse) {
      bend.x += (mouse.x - bend.x) * 0.1;
      bend.y += (mouse.y - bend.y) * 0.1;
    }

    render(front, Math.max(0, alpha));
    raf = requestAnimationFrame(frame);
  }

  resize();

  if (reduced) {
    render(w * 1.2, 1);
    window.addEventListener("resize", () => { resize(); render(w * 1.2, 1); });
    return;
  }

  window.addEventListener("resize", resize);
  canvas.parentElement.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (!bend.k) { bend.x = mouse.x; bend.y = mouse.y; }
  });
  canvas.parentElement.addEventListener("pointerleave", () => { mouse = null; });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(frame);
  });

  raf = requestAnimationFrame(frame);
})();
