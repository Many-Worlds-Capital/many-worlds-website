(function () {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const COLOR = '#0057FF';
  const PARTICLE_OPACITY = 0.25;
  const PARTICLE_RADIUS = 1.5;
  const LINE_OPACITY = 0.08;
  const LINE_WIDTH = 0.5;
  const CONNECTION_DIST = 150;
  const SPEED = 0.3;
  const MAX_PARTICLES = 120;

  let particles = [];
  let w, h;
  let animId;
  let paused = false;

  function resize() {
    const parent = canvas.parentElement;
    w = canvas.width = parent.offsetWidth;
    h = canvas.height = parent.offsetHeight;
  }

  function getCount() {
    const base = Math.floor((w * h) / 12000);
    const mobile = w < 768 ? 0.5 : 1;
    return Math.min(Math.max(Math.floor(base * mobile), 30), MAX_PARTICLES);
  }

  function createParticle() {
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: Math.cos(angle) * SPEED,
      vy: Math.sin(angle) * SPEED,
    };
  }

  function init() {
    resize();
    particles = [];
    const count = getCount();
    for (let i = 0; i < count; i++) {
      particles.push(createParticle());
    }
  }

  function update() {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x += w;
      if (p.x > w) p.x -= w;
      if (p.y < 0) p.y += h;
      if (p.y > h) p.y -= h;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // Draw lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_DIST) {
          const opacity = LINE_OPACITY * (1 - dist / CONNECTION_DIST);
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = COLOR;
          ctx.globalAlpha = opacity;
          ctx.lineWidth = LINE_WIDTH;
          ctx.stroke();
        }
      }
    }

    // Draw particles
    ctx.globalAlpha = PARTICLE_OPACITY;
    ctx.fillStyle = COLOR;
    for (let i = 0; i < particles.length; i++) {
      ctx.beginPath();
      ctx.arc(particles[i].x, particles[i].y, PARTICLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  function loop() {
    if (paused) return;
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  // Debounced resize
  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
    }, 100);
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

  init();
  loop();
})();
