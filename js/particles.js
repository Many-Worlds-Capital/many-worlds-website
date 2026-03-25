(function () {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const COLOR = '#0057FF';
  const LINE_OPACITY = 0.07;
  const LINE_WIDTH = 1;
  const NUM_LINES = 28;
  const POINTS_PER_LINE = 200;
  const SPEED = 0.0004;

  let w, h;
  let paused = false;
  let animId;
  let time = 0;

  function resize() {
    const parent = canvas.parentElement;
    w = canvas.width = parent.offsetWidth;
    h = canvas.height = parent.offsetHeight;
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    const centerX = w * 0.5;
    const centerY = h * 0.55;
    const spread = Math.min(w, h) * 0.35;

    for (let i = 0; i < NUM_LINES; i++) {
      const t = (i / (NUM_LINES - 1)) - 0.5; // -0.5 to 0.5
      const baseY = centerY + t * spread * 1.8;

      // Each line has slightly different wave parameters
      const phaseOffset = i * 0.4;
      const ampScale = 1 - Math.abs(t) * 0.6;

      ctx.beginPath();
      ctx.strokeStyle = COLOR;
      ctx.globalAlpha = LINE_OPACITY * (1 - Math.abs(t) * 1.2);
      ctx.lineWidth = LINE_WIDTH;

      for (let j = 0; j <= POINTS_PER_LINE; j++) {
        const ratio = j / POINTS_PER_LINE;
        const x = (ratio - 0.15) * w * 1.3;

        // Distance from center for amplitude envelope (gaussian-ish)
        const dx = (x - centerX) / (w * 0.3);
        const envelope = Math.exp(-dx * dx * 0.5);

        // Multiple overlapping sine waves for organic feel
        const wave1 = Math.sin(ratio * 6 + time + phaseOffset) * 30;
        const wave2 = Math.sin(ratio * 10 - time * 0.7 + phaseOffset * 1.3) * 15;
        const wave3 = Math.sin(ratio * 3.5 + time * 0.5 + phaseOffset * 0.7) * 20;
        const wave4 = Math.sin(ratio * 14 + time * 1.2 + phaseOffset * 0.5) * 8;

        const displacement = (wave1 + wave2 + wave3 + wave4) * envelope * ampScale;
        const y = baseY + displacement;

        if (j === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  function loop() {
    if (paused) return;
    time += SPEED * 16; // roughly 60fps equivalent
    draw();
    animId = requestAnimationFrame(loop);
  }

  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 100);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      paused = true;
      cancelAnimationFrame(animId);
    } else {
      paused = false;
      loop();
    }
  });

  resize();
  loop();
})();
