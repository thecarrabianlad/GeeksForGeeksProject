/* ============================================================
   NEXUS — script.js
   ============================================================

   TO USE YOUR OWN BLENDER RENDER:
   1. Export your animation from Blender as a PNG (or JPG) sequence.
   2. Name the files so they sort in order, e.g.:
        frame_001.png, frame_002.png, ... frame_120.png
      (any zero-padded numbering works, see FRAME_PATTERN below)
   3. Put them in /assets/frames/, replacing the placeholder files.
   4. Update the three constants below to match your export:
        FRAME_COUNT   -> how many frames you rendered
        FRAME_PATH    -> folder path
        FRAME_PATTERN -> filename pattern, {n} is replaced with the
                          frame number, padded with FRAME_PAD digits
        FRAME_EXT     -> "png" or "jpg"
   That's it — nothing else in this file needs to change.
   ============================================================ */

/* Flag JS as available so CSS can hide .reveal elements pre-animation;
   without this, content stays fully visible (no-JS fallback). */
document.documentElement.classList.add('js');

const FRAME_COUNT   = 158;
const FRAME_PATH    = 'assets/frames/';
const FRAME_PATTERN = 'frame_{n}';
const FRAME_PAD     = 3;      // frame_001 -> 3 digits
const FRAME_EXT     = 'png';  // change to 'png' if you export PNG

function frameSrc(index) {
  const n = String(index + 1).padStart(FRAME_PAD, '0'); 
  return FRAME_PATH + FRAME_PATTERN.replace('{n}', n) + '.' + FRAME_EXT;
}

/* ---------- reduced motion check ---------- */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   MOUSE PARALLAX — sets --mx / --my (-1..1) on <html>, smoothed.
   Used by the poly background canvas and every .bg-orb-wrap.
   Only below the hero, since that's the only place these layers
   are visible — the hero keeps its own, untouched animation.
   ============================================================ */

let parallaxX = 0, parallaxY = 0, parallaxTargetX = 0, parallaxTargetY = 0;

if (!prefersReducedMotion) {
  window.addEventListener('mousemove', (e) => {
    parallaxTargetX = (e.clientX / window.innerWidth - 0.5) * 2;
    parallaxTargetY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!e.touches || !e.touches.length) return;
    const t = e.touches[0];
    parallaxTargetX = (t.clientX / window.innerWidth - 0.5) * 2;
    parallaxTargetY = (t.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
}

/* ============================================================
   FRAME SEQUENCE — canvas scroll scrub
   ============================================================ */

(function initFrameSequence() {
  const canvas = document.getElementById('frameCanvas');
  const heroPin = document.getElementById('heroPin');
  const heroStage = document.getElementById('heroStage');
  const heroVeil = document.getElementById('heroVeil');
  if (!canvas || !heroPin) return;

  const ctx = canvas.getContext('2d');
  const images = new Array(FRAME_COUNT);
  let loadedCount = 0;
  let currentFrame = 0;
  let ready = false;

  function clamp01(n) {
    return Math.min(1, Math.max(0, n));
  }

  function resizeCanvas() {
    canvas.width = canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2);
    canvas.height = canvas.clientHeight * Math.min(window.devicePixelRatio || 1, 2);
    drawFrame(currentFrame);
  }

  function drawFrame(index) {
    const img = images[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function preload() {
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = frameSrc(i);
      img.onload = () => {
        loadedCount++;
        if (i === 0) { resizeCanvas(); drawFrame(0); }
        if (loadedCount === FRAME_COUNT) ready = true;
      };
      images[i] = img;
    }
  }

  function applyHandoff(t) {
    if (!heroStage) return;
    if (prefersReducedMotion) {
      heroStage.style.transform = '';
      heroStage.style.borderRadius = '';
      if (heroVeil) heroVeil.style.opacity = '0';
      return;
    }
    const scale = 1 - t * 0.22;
    const lift = t * 28;
    heroStage.style.transform = `translate3d(0, ${lift}px, 0) scale(${scale})`;
    heroStage.style.borderRadius = (t * 32) + 'px';
    if (heroVeil) heroVeil.style.opacity = String(t * 0.62);
  }

  function onScroll() {
    const rect = heroPin.getBoundingClientRect();
    const vh = window.innerHeight;
    const pinH = heroPin.offsetHeight;
    const handoff = vh;
    const totalTravel = pinH - vh;
    const frameTravel = Math.max(1, totalTravel - handoff);
    const scrolled = -rect.top;

    const frameProgress = clamp01(scrolled / frameTravel);
    const handoffProgress = clamp01((scrolled - frameTravel) / handoff);

    const fill = document.getElementById('progressFill');
    if (fill) fill.style.height = (frameProgress * 100) + '%';
    const label = document.getElementById('progressLabel');
    if (label) label.textContent = frameProgress < 0.02 ? 'Scroll' : Math.round(frameProgress * 100) + '%';

    applyHandoff(handoffProgress);

    if (prefersReducedMotion) return; // keep first frame static

    const targetFrame = Math.min(FRAME_COUNT - 1, Math.round(frameProgress * (FRAME_COUNT - 1)));
    if (targetFrame !== currentFrame) {
      currentFrame = targetFrame;
      requestAnimationFrame(() => drawFrame(currentFrame));
    }
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('scroll', onScroll, { passive: true });

  preload();
  resizeCanvas();
  onScroll();
})();

/* ============================================================
   POLY WIREFRAME BACKGROUND — everything below the hero
   A fixed, full-viewport field of slowly rotating and drifting
   low-poly triangle wireframes, nudged by mouse/touch parallax.
   The hero's own opaque background always sits on top of this
   while pinned, so the hero itself is never touched.
   ============================================================ */

(function initPolyBackground() {
  const canvas = document.getElementById('polyCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, DPR = 1;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  const COLORS = [
    'rgba(109,255,178,',   // gold-bright
    'rgba(159,182,167,',   // mist
    'rgba(53,217,128,',    // gold
  ];

  function makeShape() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      size: 46 + Math.random() * 140,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.0035,
      vx: (Math.random() - 0.5) * 0.09,
      vy: (Math.random() - 0.5) * 0.09,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      alpha: 0.07 + Math.random() * 0.15,
    };
  }

  resize();
  const COUNT = W < 700 ? 12 : 24;
  const shapes = Array.from({ length: COUNT }, makeShape);

  function drawShape(s) {
    const a = s.rot;
    const b = a + (Math.PI * 2) / 3;
    const c = a + (Math.PI * 4) / 3;
    const p1x = s.x + Math.cos(a) * s.size, p1y = s.y + Math.sin(a) * s.size * 0.86;
    const p2x = s.x + Math.cos(b) * s.size, p2y = s.y + Math.sin(b) * s.size * 0.86;
    const p3x = s.x + Math.cos(c) * s.size, p3y = s.y + Math.sin(c) * s.size * 0.86;

    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.lineTo(p3x, p3y);
    ctx.closePath();
    ctx.strokeStyle = s.color + s.alpha + ')';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function step() {
    parallaxX += (parallaxTargetX - parallaxX) * 0.045;
    parallaxY += (parallaxTargetY - parallaxY) * 0.045;
    document.documentElement.style.setProperty('--mx', parallaxX.toFixed(3));
    document.documentElement.style.setProperty('--my', parallaxY.toFixed(3));

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(parallaxX * -18, parallaxY * -18);

    const margin = 220;
    shapes.forEach((s) => {
      s.rot += s.rotSpeed;
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < -margin) s.x = W + margin;
      if (s.x > W + margin) s.x = -margin;
      if (s.y < -margin) s.y = H + margin;
      if (s.y > H + margin) s.y = -margin;
      drawShape(s);
    });

    ctx.restore();
    requestAnimationFrame(step);
  }

  window.addEventListener('resize', () => {
    resize();
  });

  if (prefersReducedMotion) {
    shapes.forEach(drawShape); // single static frame, no motion or parallax
  } else {
    step();
  }
})();

/* ============================================================
   NAV — scroll state + mobile sheet
   ============================================================ */

(function initNav() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const mobileNav = document.getElementById('mobileNav');

  window.addEventListener('scroll', () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
  }, { passive: true });

  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
})();

/* ============================================================
   COUNTDOWN — set to the event date below
   ============================================================ */

(function initCountdown() {
  const EVENT_DATE = new Date('2026-11-14T09:00:00+05:30');

  const els = {
    days: document.getElementById('cd-days'),
    hours: document.getElementById('cd-hours'),
    mins: document.getElementById('cd-mins'),
    secs: document.getElementById('cd-secs'),
  };
  if (!els.days) return;

  function setVal(el, val) {
    const str = String(val).padStart(2, '0');
    if (el.textContent === str) return;
    el.textContent = str;
    if (prefersReducedMotion) return;
    el.classList.remove('tick-flash');
    void el.offsetWidth; // restart the animation
    el.classList.add('tick-flash');
  }

  function tick() {
    const diff = Math.max(0, EVENT_DATE - new Date());
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    setVal(els.days, days);
    setVal(els.hours, hours);
    setVal(els.mins, mins);
    setVal(els.secs, secs);
  }

  tick();
  setInterval(tick, 1000);
})();

/* ============================================================
   REGISTRATION FORM — front-end only
   ============================================================ */

(function initForm() {
  const form = document.getElementById('regForm');
  const card = document.getElementById('formCard');
  const success = document.getElementById('formSuccess');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    card.classList.add('is-submitted');
    success.classList.add('is-visible');
  });
})();

/* ============================================================
   SCROLL REVEAL — fades/rises elements below the hero into
   view as they enter the viewport. Runs once per element.
   ============================================================ */

(function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  items.forEach(el => observer.observe(el));
})();
