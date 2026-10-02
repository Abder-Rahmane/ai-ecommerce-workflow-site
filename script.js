/* ==========================================================================
   Operator — script.js
   No dependencies, no network requests. Everything runs in the browser.
   ========================================================================== */

/* --------------------------------------------------------------------------
   ✏️  SITE CONFIGURATION — edit this block
   -------------------------------------------------------------------------- */
const SITE_CONFIG = {
  // Your public contact email. Leave "" until you have one: the button then
  // shows "Contact address coming soon" instead of a broken link.
  // Example: CONTACT_EMAIL: "hello@your-domain.com",
  CONTACT_EMAIL: "",

  // Subject pre-filled in the visitor's email client.
  EMAIL_SUBJECT: "Hello from the Operator website",
};

(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const mq = (q) => window.matchMedia(q);
  const onChange = (m, fn) => (m.addEventListener ? m.addEventListener('change', fn) : m.addListener(fn));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduceMQ = mq('(prefers-reduced-motion: reduce)');
  const coarseMQ = mq('(hover: none), (pointer: coarse)');
  const narrowMQ = mq('(max-width: 760px)');
  // Must match the "wide" hero layout query in styles.css
  const wideMQ = mq('(min-width: 981px), (min-width: 640px) and (orientation: landscape)');
  const navDesktopMQ = mq('(min-width: 900px)');
  // Must match the pinned-scene query in styles.css (desktop, tall enough, motion allowed)
  const pinMQ = mq('(min-width: 900px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)');
  const root = document.documentElement;
  const TAU = Math.PI * 2;

  /* ------------------------------------------------------------------ Contact */
  function initContact() {
    const email = (SITE_CONFIG.CONTACT_EMAIL || '').trim();
    const subject = (SITE_CONFIG.EMAIL_SUBJECT || '').trim();
    $$('[data-contact-link]').forEach((a) => {
      if (email) {
        const useSubject = subject && !a.hasAttribute('data-no-subject');
        a.href = 'mailto:' + email + (useSubject ? '?subject=' + encodeURIComponent(subject) : '');
        a.removeAttribute('aria-disabled');
      } else {
        a.setAttribute('aria-disabled', 'true');
        a.addEventListener('click', (e) => e.preventDefault());
      }
    });
    if (email) $$('[data-contact-text]').forEach((el) => { el.textContent = email; });
  }

  /* ---------------------------------------------------------------- Navigation
     Mobile: full-screen menu with scroll lock, focus trap and Escape to close.
     Desktop: inline links + scroll-spy. */
  function initNav() {
    const header = $('#site-header');
    const toggle = $('#nav-toggle');
    const nav = $('#primary-nav');
    if (!header || !toggle || !nav) return;

    const behind = [$('main'), $('.site-footer')].filter(Boolean);
    const isOpen = () => header.classList.contains('nav-open');

    const setOpen = (open, { restoreFocus = true } = {}) => {
      if (open === isOpen()) return;
      header.classList.toggle('nav-open', open);
      root.classList.toggle('nav-lock', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      behind.forEach((el) => { if ('inert' in el) el.inert = open; });
      if (open) requestAnimationFrame(() => $('a', nav)?.focus());
      else if (restoreFocus) toggle.focus({ preventScroll: true });
    };

    toggle.addEventListener('click', () => setOpen(!isOpen()));
    $$('a', nav).forEach((a) => a.addEventListener('click', () => setOpen(false, { restoreFocus: false })));
    document.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key !== 'Tab') return;
      const items = [$('.brand', header), toggle, ...$$('a', nav)].filter((el) => el && el.offsetParent !== null);
      const first = items[0]; const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    onChange(navDesktopMQ, (e) => { if (e.matches) setOpen(false, { restoreFocus: false }); });

    // Scroll-spy
    const links = new Map($$('#primary-nav ul a').map((a) => [a.getAttribute('href'), a]));
    const sections = $$('main section[id]').filter((s) => links.has('#' + s.id));
    if (!('IntersectionObserver' in window) || !sections.length) return;
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        links.get('#' + en.target.id)?.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => spy.observe(s));
  }

  /* ----------------------------------------------- Reveal + pause offscreen */
  function initReveal() {
    $$('[data-stagger]').forEach((g) => Array.from(g.children).forEach((c, i) => c.style.setProperty('--d', (i * 0.06).toFixed(2) + 's')));

    const items = $$('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('in'));
      $$('[data-anim]').forEach((el) => el.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach((el) => io.observe(el));

    // Sections only run their CSS animations while they are on screen.
    const vis = new IntersectionObserver((entries) => {
      entries.forEach((en) => en.target.classList.toggle('in-view', en.isIntersecting));
    }, { rootMargin: '120px 0px' });
    $$('[data-anim]').forEach((el) => vis.observe(el));
  }

  /* ------------------------------------------ Workflow stage: Discover → Build → Operate
     Desktop: one pinned scene; the scroll position (a ~1-viewport run) selects the active step.
     Elsewhere: three compact blocks, each activated once when it comes into view. */
  function createStage() {
    const track = $('#stage');
    if (!track) return () => {};
    const pin = $('.stage-pin', track);
    const steps = $$('.step', track);
    const rail = $$('.rail-btn', track);
    const CUTS = [0.34, 0.67];                       // scroll progress where Build / Operate take over
    let active = -1;
    let blocksObserver = null;

    const fire = (el, name) => el.dispatchEvent(new CustomEvent(name));
    const setActive = (n) => {
      if (n === active) return;
      const prev = active;
      active = n;
      steps.forEach((s, i) => {
        s.classList.toggle('is-active', i === n);
        s.classList.toggle('is-past', i < n);
        if (i === n) fire(s, 'stage:activate'); else if (i === prev) fire(s, 'stage:deactivate');
      });
      rail.forEach((b, i) => { b.classList.toggle('on', i === n); if (i === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    };

    // Blocks mode (phones, tablets, reduced motion): activate each block once, as it scrolls into view.
    const startBlocks = () => {
      if (blocksObserver) return;
      active = -2;
      steps.forEach((s) => s.classList.remove('is-active', 'is-past'));
      if (reduceMQ.matches) { steps.forEach((s) => s.classList.add('is-active')); return; }   // reduced motion: everything shown at once
      if (!('IntersectionObserver' in window)) { steps.forEach((s) => { s.classList.add('is-active'); fire(s, 'stage:activate'); }); return; }
      blocksObserver = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add('is-active'); fire(en.target, 'stage:activate'); blocksObserver.unobserve(en.target);
        });
      }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
      steps.forEach((s) => blocksObserver.observe(s));
    };
    const stopBlocks = () => { if (blocksObserver) { blocksObserver.disconnect(); blocksObserver = null; } };

    const geometry = () => {
      const stickyTop = parseFloat(getComputedStyle(pin).top) || 0;
      const run = Math.max(1, track.offsetHeight - pin.offsetHeight);
      return { stickyTop, run, top: track.getBoundingClientRect().top + window.scrollY };
    };

    rail.forEach((btn) => btn.addEventListener('click', () => {
      if (!pinMQ.matches) return;
      const n = parseInt(btn.dataset.go, 10);
      const g = geometry();
      const p = n === 0 ? 0 : CUTS[n - 1] + 0.04;
      window.scrollTo({ top: g.top - g.stickyTop + p * g.run, behavior: 'smooth' });
    }));

    let mode = '';
    const update = () => {
      if (!pinMQ.matches) {
        if (mode !== 'blocks') { mode = 'blocks'; active = -1; track.style.removeProperty('--sp'); startBlocks(); }
        return;
      }
      if (mode !== 'pin') { mode = 'pin'; stopBlocks(); active = -1; }
      const g = geometry();
      const p = clamp((g.stickyTop - track.getBoundingClientRect().top) / g.run, 0, 1);
      track.style.setProperty('--sp', (0.04 + 0.96 * p).toFixed(3));
      setActive(p < CUTS[0] ? 0 : p < CUTS[1] ? 1 : 2);
    };
    onChange(pinMQ, update);
    return update;
  }

  /* ---------------------------------------------------- Scroll-linked effects */
  function initScroll() {
    const header = $('#site-header');
    const bar = $('.progress');
    const hero = $('#top');
    const stageUpdate = createStage();
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY || window.pageYOffset;
      const max = root.scrollHeight - window.innerHeight;
      if (bar) bar.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
      if (header) header.classList.toggle('is-scrolled', y > 12);
      if (hero && y < hero.offsetHeight) hero.style.setProperty('--hp', clamp(y / (hero.offsetHeight * 0.85), 0, 1).toFixed(3));
      stageUpdate();
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ---------------------------------------------------------------- 3D tilt
     Pointer devices only: touch has no hover, so nothing relies on it. */
  function initTilt() {
    if (coarseMQ.matches) return;
    $$('[data-tilt]').forEach((el) => {
      const max = parseFloat(el.dataset.tilt) || 6;
      let frame = 0;
      let last = null;
      const apply = () => {
        frame = 0;
        const r = el.getBoundingClientRect();
        const px = (last.clientX - r.left) / r.width;
        const py = (last.clientY - r.top) / r.height;
        el.style.setProperty('--ry', ((px - 0.5) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - py) * 2 * max).toFixed(2) + 'deg');
      };
      el.addEventListener('pointermove', (e) => {
        if (reduceMQ.matches || e.pointerType === 'touch') return;
        last = e;
        el.classList.add('is-tilting');
        if (!frame) frame = requestAnimationFrame(apply);
      });
      el.addEventListener('pointerleave', () => {
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        el.classList.remove('is-tilting');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* -------------------------------------- Sequences (approval stepper, …)
     A sequence inside a stage plays when that stage becomes active; others play while visible. */
  function initSequences() {
    $$('[data-seq]').forEach((box) => {
      const items = $$('.seq-item', box);
      if (!items.length) return;
      const mode = box.dataset.seq;
      const step = parseInt(box.dataset.step, 10) || 1200;
      const owner = box.closest('.step');
      let i = -1;
      let timer = 0;

      const showStatic = () => items.forEach((it, n) => it.classList.toggle('on', mode === 'progress' || n === 0));
      const tick = () => {
        i += 1;
        if (mode === 'progress') {
          if (i < items.length) items[i].classList.add('on');
          else if (i >= items.length + 2) { items.forEach((it) => it.classList.remove('on')); i = -1; }
        } else {
          items.forEach((it, n) => it.classList.toggle('on', n === i % items.length));
        }
      };
      const stop = () => { window.clearInterval(timer); timer = 0; };
      const start = () => { if (!timer && !reduceMQ.matches) { tick(); timer = window.setInterval(tick, step); } };
      const restart = () => { stop(); i = -1; items.forEach((it) => it.classList.remove('on')); start(); };

      if (reduceMQ.matches) { showStatic(); return; }
      if (owner) {
        owner.addEventListener('stage:activate', restart);
        owner.addEventListener('stage:deactivate', stop);
        return;
      }
      if (!('IntersectionObserver' in window)) { showStatic(); return; }
      new IntersectionObserver((entries) => entries.forEach((en) => (en.isIntersecting ? start() : stop())), { threshold: 0.25 }).observe(box);
    });
  }

  /* ----------------------------------------------------------- Hero canvas
     A product travels around the commerce lifecycle: Signal → Validate → Source →
     Offer → Create → Launch → Measure → Learn → back to Signal. Pure canvas 2D
     with a small 3D projection — no libraries, adaptive quality, paused off-screen. */
  function initHero() {
    const hero = $('#top');
    const canvas = $('#hero-canvas');
    if (!hero || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const LABELS = ['Signal', 'Validate', 'Source', 'Offer', 'Create', 'Launch', 'Measure', 'Learn'];
    const N = LABELS.length;
    const FONT = '"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
    const CAM = 4.8;                 // camera distance (unit-radius scene)
    const HUE = 256;                 // single accent hue (#7C5CFF)

    // Quality: 2 = full, 1 = reduced (phones, low-core CPUs), 0 = minimal. Drops further if frames stay slow.
    const lowPower = () => narrowMQ.matches || coarseMQ.matches || (navigator.hardwareConcurrency || 8) <= 4;
    let quality = lowPower() ? 1 : 2;

    let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, S = 0, wide = true;
    let running = false, visible = true, raf = 0, last = 0, lastDraw = 0, tAccum = 0, slow = 0, frames = 0, emaDt = 16;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    /* Pre-rendered glow sprites */
    const sprite = (h, s, l) => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, `hsla(${h},${s}%,${Math.min(96, l + 22)}%,1)`);
      gr.addColorStop(0.25, `hsla(${h},${s}%,${l}%,.55)`);
      gr.addColorStop(1, `hsla(${h},${s}%,${l}%,0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      return c;
    };
    const glow = sprite(HUE, 100, 64);
    const glowSoft = sprite(HUE, 90, 55);
    const glowWhite = sprite(HUE + 10, 100, 82);

    /* Scene data (unit space) */
    const nodes = Array.from({ length: N }, (_, i) => {
      const th = (i / N) * TAU;
      return { p: [Math.cos(th), 0.24 * Math.sin(2 * th + 0.6) + 0.08 * Math.sin(3 * th), Math.sin(th)], x: 0, y: 0, z: 0, s: 1, sx: 0, sy: 0 };
    });
    const sats = Array.from({ length: 10 }, (_, i) => ({
      r: 1.25 + ((i * 37) % 10) / 14, a: (i / 10) * TAU + (i % 3), y: -0.7 + ((i * 53) % 14) / 10, w: 0.05 + ((i * 29) % 7) / 90,
      anchor: Math.round((i / 10) * N) % N, z: 0, s: 1, sx: 0, sy: 0,
    }));
    let dust = [];
    const buildDust = () => {
      const n = quality === 2 ? 110 : quality === 1 ? 40 : 18;
      dust = Array.from({ length: n }, () => ({
        x: (Math.random() - 0.5) * 4.2, y: (Math.random() - 0.5) * 2.8, z: (Math.random() - 0.5) * 4.2,
        v: 0.01 + Math.random() * 0.03, r: 0.7 + Math.random() * 1.3, o: 0.25 + Math.random() * 0.6,
      }));
    };
    buildDust();

    const tmp = { x: 0, y: 0, z: 0, s: 1, sx: 0, sy: 0 };
    let cyaw = 1, syaw = 0, cpit = 1, spit = 0;
    const setRot = (yaw, pitch) => { cyaw = Math.cos(yaw); syaw = Math.sin(yaw); cpit = Math.cos(pitch); spit = Math.sin(pitch); };
    const rot = (x, y, z, o) => {
      const x1 = x * cyaw + z * syaw;
      const z1 = -x * syaw + z * cyaw;
      o.x = x1;
      o.y = y * cpit + z1 * spit;
      o.z = z1 * cpit - y * spit;
      const s = CAM / (CAM - o.z);
      o.s = s;
      o.sx = cx + o.x * S * s;
      o.sy = cy + o.y * S * s;
      return o;
    };
    const depth01 = (z) => clamp((z + 1.6) / 3.2, 0, 1);

    /* Quadratic bezier between two rotated nodes with an outward control point */
    const ctrl = (a, b) => ({ x: (a.x + b.x) * 0.64, y: (a.y + b.y) * 0.64 - 0.04, z: (a.z + b.z) * 0.64 });
    const bez = (a, c, b, t, o) => {
      const u = 1 - t;
      const x = u * u * a.x + 2 * u * t * c.x + t * t * b.x;
      const y = u * u * a.y + 2 * u * t * c.y + t * t * b.y;
      const z = u * u * a.z + 2 * u * t * c.z + t * t * b.z;
      const s = CAM / (CAM - z);
      o.s = s; o.z = z; o.sx = cx + x * S * s; o.sy = cy + y * S * s;
      return o;
    };

    /* Logo spiral (same geometry as the brand mark), used as the 3D core */
    const SPIRAL = Array.from({ length: 49 }, (_, i) => {
      const t = i / 48;
      const a = ((-100 + 345 * t) * Math.PI) / 180;
      const r = (7.4 + 3.8 * t) * 0.0262;
      return [Math.cos(a) * r, Math.sin(a) * r, t];
    });
    const ringPts = (r, n = 72) => Array.from({ length: n + 1 }, (_, i) => [Math.cos((i / n) * TAU) * r, 0, Math.sin((i / n) * TAU) * r]);
    const RING_A = ringPts(1.0);
    const RING_B = ringPts(1.55);

    function resize() {
      const r = hero.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, quality === 2 ? 2 : 1.5);
      wide = wideMQ.matches;
      if (!wide) { canvas.width = canvas.height = 1; return; }     // stacked layout: no canvas work at all
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      if (wide) { cx = W * 0.72; cy = H * 0.53; S = Math.min(H * 0.33, W * 0.19); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!running) draw(2.4);
    }

    function polyline3D(points, fn) {
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const p = fn(points[i], tmp);
        if (i === 0) ctx.moveTo(p.sx, p.sy); else ctx.lineTo(p.sx, p.sy);
      }
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      const yaw = t * 0.07 + mouse.x * 0.4;
      const pitch = 0.46 + mouse.y * 0.26;
      setRot(yaw, pitch);
      ctx.globalCompositeOperation = 'lighter';

      /* Dust */
      ctx.fillStyle = '#bdb4ff';
      const dyaw = yaw * 0.6; const cd = Math.cos(dyaw), sd = Math.sin(dyaw);
      for (let i = 0; i < dust.length; i++) {
        const d = dust[i];
        const yy = ((d.y + t * d.v + 1.4) % 2.8) - 1.4;
        const x1 = d.x * cd + d.z * sd; const z1 = -d.x * sd + d.z * cd;
        const s = CAM / (CAM - z1 * 0.8);
        const sx = cx + x1 * S * s * 0.9; const sy = cy + yy * S * s;
        if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue;
        const dep = depth01(z1);
        ctx.globalAlpha = d.o * (0.15 + 0.7 * dep);
        const r = d.r * s * (0.6 + dep * 0.6);
        ctx.fillRect(sx - r / 2, sy - r / 2, r, r);
      }

      /* Guide rings */
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#a99bff';
      ctx.globalAlpha = 0.11;
      polyline3D(RING_A, (p, o) => rot(p[0], p[1], p[2], o)); ctx.stroke();
      if (quality === 2) {
        ctx.globalAlpha = 0.05;
        ctx.setLineDash([2, 8]);
        polyline3D(RING_B, (p, o) => rot(p[0], p[1] - 0.15, p[2], o)); ctx.stroke();
        ctx.setLineDash([]);
      }

      /* Transform nodes + satellites */
      for (let i = 0; i < N; i++) { const n = nodes[i]; rot(n.p[0], n.p[1], n.p[2], n); }
      const satCount = quality === 2 ? sats.length : quality === 1 ? 5 : 0;
      for (let i = 0; i < satCount; i++) {
        const s = sats[i]; const a = s.a + t * s.w;
        rot(Math.cos(a) * s.r, s.y, Math.sin(a) * s.r, tmp);
        s.z = tmp.z; s.s = tmp.s; s.sx = tmp.sx; s.sy = tmp.sy;
      }

      // The product: travels one stage every 2.2 s, easing in and out of each node.
      const prog = (((t / 2.2) % N) + N) % N;
      const seg = Math.floor(prog);
      const u = prog - seg;
      const ease = u * u * (3 - 2 * u);
      const glowOf = (i) => { let d = Math.abs(i - (seg + ease)); d = Math.min(d, N - d); return Math.max(0, 1 - d * 0.9); };

      /* Satellites */
      for (let i = 0; i < satCount; i++) {
        const s = sats[i]; const n = nodes[s.anchor];
        const dep = depth01(s.z);
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#a99bff';
        ctx.globalAlpha = 0.05 + 0.08 * dep;
        ctx.beginPath(); ctx.moveTo(n.sx, n.sy); ctx.lineTo(s.sx, s.sy); ctx.stroke();
        ctx.globalAlpha = 0.2 + 0.4 * dep;
        const sz = 8 * s.s;
        ctx.drawImage(glowSoft, s.sx - sz, s.sy - sz, sz * 2, sz * 2);
      }

      /* Ring edges + small packets */
      const SEG = quality === 2 ? 18 : 10;
      const pt = { s: 1, z: 0, sx: 0, sy: 0 };
      for (let i = 0; i < N; i++) {
        const a = nodes[i]; const b = nodes[(i + 1) % N];
        const c = ctrl(a, b);
        const dep = depth01((a.z + b.z) / 2);
        const avgS = (a.s + b.s) / 2;
        ctx.beginPath();
        for (let k = 0; k <= SEG; k++) { bez(a, c, b, k / SEG, pt); if (k === 0) ctx.moveTo(pt.sx, pt.sy); else ctx.lineTo(pt.sx, pt.sy); }
        ctx.strokeStyle = `hsl(${HUE},95%,72%)`;
        if (quality === 2) { ctx.lineWidth = 5 * avgS; ctx.globalAlpha = 0.045 + 0.05 * dep; ctx.stroke(); }
        ctx.lineWidth = 1.3 * avgS;
        ctx.globalAlpha = 0.2 + 0.45 * dep;
        ctx.stroke();

        const packets = quality === 2 ? 2 : 1;
        for (let k = 0; k < packets; k++) {
          const q = (t * 0.2 + i * 0.37 + k * 0.5) % 1;
          bez(a, c, b, q, pt);
          const sz = 13 * pt.s;
          ctx.globalAlpha = 0.8 * (0.4 + 0.6 * depth01(pt.z));
          ctx.drawImage(glow, pt.sx - sz, pt.sy - sz, sz * 2, sz * 2);
        }
      }

      /* The product token (bright, with a short trail) */
      {
        const a = nodes[seg % N]; const b = nodes[(seg + 1) % N];
        const c = ctrl(a, b);
        for (let tr = 0; tr < 7; tr++) {
          const uu = clamp(ease - tr * 0.035, 0, 1);
          bez(a, c, b, uu, pt);
          const sz = (24 - tr * 2.6) * pt.s;
          ctx.globalAlpha = (0.95 - tr * 0.13) * (0.5 + 0.5 * depth01(pt.z));
          ctx.drawImage(glowWhite, pt.sx - sz, pt.sy - sz, sz * 2, sz * 2);
        }
        bez(a, c, b, ease, pt);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(pt.sx, pt.sy, 3.6 * pt.s, 0, TAU); ctx.fill();
      }

      /* Core + nodes, sorted back to front */
      const order = nodes.map((n, i) => ({ z: n.z, i })).concat([{ z: 0, i: -1 }]).sort((p, q) => p.z - q.z);
      for (let o = 0; o < order.length; o++) {
        const i = order[o].i;
        if (i === -1) drawCore(t); else drawNode(i, glowOf(i));
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    /* The brand mark, in 3D, at the centre of the loop */
    function drawCore(t) {
      rot(0, 0, 0, tmp);
      const g = 0.62 * S * tmp.s;
      ctx.globalAlpha = 0.34 + 0.08 * Math.sin(t * 1.3);
      ctx.drawImage(glowSoft, tmp.sx - g, tmp.sy - g, g * 2, g * 2);
      const ph = Math.sin(t * 0.35) * 0.9;         // gentle swing around the vertical axis
      const cph = Math.cos(ph), sph = Math.sin(ph);
      const wpx = Math.max(2.5, 0.085 * S);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const stroke = (from, to, color, alpha) => {
        ctx.beginPath();
        let started = false;
        for (let i = from; i <= to; i++) {
          const p = SPIRAL[i];
          rot(p[0] * cph, p[1], -p[0] * sph, tmp);
          if (!started) { ctx.moveTo(tmp.sx, tmp.sy); started = true; } else ctx.lineTo(tmp.sx, tmp.sy);
        }
        ctx.lineWidth = wpx;
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.stroke();
      };
      stroke(0, 36, '#F4F4F2', 0.85);
      stroke(36, 48, '#8f78ff', 1);
      ctx.lineCap = 'butt';
    }

    function drawNode(i, g) {
      const n = nodes[i];
      const dep = depth01(n.z);
      const s = n.s;
      const gSize = (30 + 40 * g) * s;
      ctx.globalAlpha = (0.4 + 0.6 * g) * (0.5 + 0.5 * dep);
      ctx.drawImage(glow, n.sx - gSize, n.sy - gSize, gSize * 2, gSize * 2);

      ctx.strokeStyle = `hsl(${HUE},100%,82%)`;
      ctx.globalAlpha = 0.35 + 0.65 * dep;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(n.sx, n.sy, 8.5 * s, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.75 + 0.25 * dep;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(n.sx, n.sy, (3 + g * 1.6) * s, 0, TAU); ctx.fill();

      // Label: stage name (+ index on wide layouts); the stage the product is in brightens.
      if (!wide && dep < 0.42 && g < 0.5) return;     // stacked layout: skip labels of far-side nodes to avoid overlaps
      const fs = Math.max(11, (wide ? 13 : 12) * s);
      ctx.font = `500 ${fs.toFixed(1)}px ${FONT}`;
      ctx.textBaseline = 'middle';
      const right = n.sx >= cx;
      ctx.textAlign = right ? 'left' : 'right';
      const lx = n.sx + (right ? 1 : -1) * 15 * s;
      ctx.globalAlpha = clamp((0.28 + 0.62 * dep) * (0.7 + 0.3 * g) + g * 0.2, 0, 1);
      ctx.fillStyle = '#F4F4F2';
      ctx.fillText(LABELS[i], lx, wide ? n.sy - 6 * s : n.sy);
      if (wide) {
        ctx.globalAlpha *= 0.7;
        ctx.fillStyle = '#A99BFF';
        ctx.font = `500 ${(fs * 0.8).toFixed(1)}px ${FONT}`;
        ctx.fillText(String(i + 1).padStart(2, '0'), lx, n.sy + 8 * s);
      }
    }

    /* Loop control */
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = clamp((now - last) / 1000, 0, 0.1);
      last = now;
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      tAccum += dt;
      // Reduced quality renders at ~30 fps to save battery.
      if (quality < 2 && now - lastDraw < 30) return;
      lastDraw = now;
      draw(tAccum);

      // Adaptive quality: step down if frames stay slow.
      emaDt = emaDt * 0.95 + dt * 1000 * 0.05;
      frames++;
      if (frames > 90 && emaDt > (quality < 2 ? 45 : 30) && quality > 0) {
        slow++;
        if (slow > 20) { quality--; slow = 0; frames = 0; emaDt = 16; buildDust(); resize(); }
      } else if (emaDt <= 30) slow = 0;
    }
    function start() {
      if (running || reduceMQ.matches || !visible || document.hidden || !wideMQ.matches) return;   // stacked layout uses the CSS flow line instead
      running = true; last = performance.now(); raf = requestAnimationFrame(frame);
    }
    function stop() { running = false; cancelAnimationFrame(raf); }
    const sync = () => { if (!wideMQ.matches) stop(); else if (reduceMQ.matches) { stop(); draw(2.4); } else start(); };

    /* Pointer parallax: fine pointers only */
    if (!coarseMQ.matches) {
      window.addEventListener('pointermove', (e) => {
        if (reduceMQ.matches || !visible || e.pointerType === 'touch') return;
        mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
        mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
    }

    let resizeFrame = 0;
    const scheduleResize = () => { if (!resizeFrame) resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; resize(); }); };
    if ('ResizeObserver' in window) { const ro = new ResizeObserver(scheduleResize); ro.observe(hero); ro.observe($('.hero-inner', hero)); }
    else window.addEventListener('resize', scheduleResize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) start(); else stop(); }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    onChange(reduceMQ, sync);
    onChange(wideMQ, () => { scheduleResize(); sync(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleResize);

    resize();
    draw(2.4);
    sync();
  }

  /* -------------------------------------------------------------------- Boot */
  function boot() {
    initContact();
    initNav();
    initReveal();
    initScroll();
    initTilt();
    initSequences();
    initHero();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
