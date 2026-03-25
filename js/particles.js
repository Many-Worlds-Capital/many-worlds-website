(function () {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const COLOR = '#0050FF';
  const LINE_OPACITY = 0.077;
  const LINE_WIDTH = 1.2;
  const NUM_LINES = 35;
  const POINTS_PER_LINE = 300;
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
    const centerY = h * 0.4;

    for (let i = 0; i < NUM_LINES; i++) {
      const t = (i / (NUM_LINES - 1)) - 0.5; // -0.5 to 0.5
      const baseY = centerY + t * h * 0.7;

      const phaseOffset = i * 0.35;
      const ampScale = 1 - Math.abs(t) * 0.4;

      ctx.beginPath();
      ctx.strokeStyle = COLOR;
      ctx.globalAlpha = LINE_OPACITY * Math.max(0, 1 - Math.abs(t) * 1.4);
      ctx.lineWidth = LINE_WIDTH;

      for (let j = 0; j <= POINTS_PER_LINE; j++) {
        const ratio = j / POINTS_PER_LINE;
        const x = (ratio - 0.05) * w * 1.1;

        // Horizontal envelope - waveform burst in the center, tapering at edges
        const dx = (x - centerX) / (w * 0.28);
        const envelope = Math.exp(-dx * dx * 0.4);

        // Waveform-style: sharper peaks using combinations of sine waves
        // Primary oscillation - higher frequency for waveform look
        const freq1 = ratio * 12 + time + phaseOffset;
        const wave1 = Math.sin(freq1) * 25;

        // Harmonic - adds sharpness/complexity
        const freq2 = ratio * 24 - time * 0.8 + phaseOffset * 1.2;
        const wave2 = Math.sin(freq2) * 10;

        // Sub-oscillation for slow movement
        const freq3 = ratio * 4 + time * 0.3 + phaseOffset * 0.6;
        const wave3 = Math.sin(freq3) * 18;

        // Sharp transient spikes (waveform character)
        const freq4 = ratio * 18 + time * 1.1 + phaseOffset * 0.8;
        const spike = Math.sin(freq4);
        const wave4 = spike * spike * spike * 15; // cube for sharp peaks

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
    time += SPEED * 16;
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
