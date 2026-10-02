/* ==========================================================================
   AI E-commerce Operator — script.js
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
  EMAIL_SUBJECT: "Hello from the AI E-commerce Operator website",
};

(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const mq = (q) => window.matchMedia(q);
  const reduceMQ = mq('(prefers-reduced-motion: reduce)');
  const coarseMQ = mq('(hover: none), (pointer: coarse)');
  const narrowMQ = mq('(max-width: 760px)');
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

  /* ---------------------------------------------------------------- Navigation */
  function initNav() {
    const header = $('#site-header');
    const toggle = $('#nav-toggle');
    if (!header || !toggle) return;

    const setOpen = (open) => {
      header.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', () => setOpen(!header.classList.contains('nav-open')));
    $$('#primary-nav a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && header.classList.contains('nav-open')) { setOpen(false); toggle.focus(); }
    });
    mq('(min-width: 981px)').addEventListener?.('change', (e) => { if (e.matches) setOpen(false); });

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
    const groups = $$('[data-stagger]');
    groups.forEach((g) => Array.from(g.children).forEach((c, i) => c.style.setProperty('--d', (i * 0.07).toFixed(2) + 's')));

    const items = $$('.reveal');
    if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('in')); $$('[data-anim]').forEach((el) => el.classList.add('in-view')); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach((el) => io.observe(el));

    // Animated sections only run their CSS animations while visible.
    const vis = new IntersectionObserver((entries) => {
      entries.forEach((en) => en.target.classList.toggle('in-view', en.isIntersecting));
    }, { rootMargin: '120px 0px' });
    $$('[data-anim]').forEach((el) => vis.observe(el));
  }

  /* ---------------------------------------------------- Scroll-linked effects */
  function initScroll() {
    const header = $('#site-header');
    const bar = $('.progress');
    const hero = $('#top');
    const px = $$('.px');
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY || window.pageYOffset;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
      if (header) header.classList.toggle('is-scrolled', y > 12);
      if (hero) hero.style.setProperty('--hp', Math.min(1, Math.max(0, y / (hero.offsetHeight * 0.85))).toFixed(3));
      if (!reduceMQ.matches && !coarseMQ.matches && px.length) {
        const vh = window.innerHeight;
        px.forEach((el) => {
          const r = el.parentElement.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          const depth = parseFloat(el.dataset.depth) || 0;
          el.style.setProperty('--py', ((r.top + r.height / 2 - vh / 2) * depth).toFixed(1) + 'px');
        });
      }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ---------------------------------------------------------------- 3D tilt */
  function initTilt() {
    $$('[data-tilt]').forEach((el) => {
      const max = parseFloat(el.dataset.tilt) || 8;
      let frame = 0;
      let last = null;

      const apply = () => {
        frame = 0;
        const r = el.getBoundingClientRect();
        const px = (last.clientX - r.left) / r.width;
        const py = (last.clientY - r.top) / r.height;
        el.style.setProperty('--ry', ((px - 0.5) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - py) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
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

  /* -------------------------------------- Sequences (checklists, steppers…) */
  function initSequences() {
    $$('[data-seq]').forEach((box) => {
      const items = $$('.seq-item', box);
      if (!items.length) return;
      const mode = box.dataset.seq;
      const step = parseInt(box.dataset.step, 10) || 1200;
      let i = -1;
      let timer = 0;

      const showStatic = () => {
        items.forEach((it, n) => it.classList.toggle('on', mode === 'progress' || n === 0));
      };
      const tick = () => {
        i += 1;
        if (mode === 'progress') {
          if (i < items.length) items[i].classList.add('on');
          else if (i >= items.length + 2) { items.forEach((it) => it.classList.remove('on')); i = -1; }
        } else {
          items.forEach((it, n) => it.classList.toggle('on', n === i % items.length));
        }
      };
      const start = () => { if (!timer && !reduceMQ.matches) { tick(); timer = window.setInterval(tick, step); } };
      const stop = () => { window.clearInterval(timer); timer = 0; };

      if (reduceMQ.matches || !('IntersectionObserver' in window)) { showStatic(); return; }
      new IntersectionObserver((entries) => entries.forEach((en) => (en.isIntersecting ? start() : stop())), { threshold: 0.25 }).observe(box);
    });
  }

  /* ----------------------------------------------------------- Hero canvas */
  function initHero() {
    const hero = $('#top');
    const canvas = $('#hero-canvas');
    if (!hero || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const LABELS = ['Discovery', 'Intelligence', 'Sourcing', 'Economics', 'Offer', 'Creative', 'Store', 'Advertising', 'Measurement', 'Learning'];
    const N = LABELS.length;
    const FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
    const CAM = 4.8; // camera distance (unit-radius scene)
    const hue = (i) => 188 + (i / N) * 150; // cyan → violet → magenta

    // Quality levels: 2 = full, 1 = reduced, 0 = minimal. Adapts to the device.
    const lowPower = () => narrowMQ.matches || coarseMQ.matches || (navigator.hardwareConcurrency || 8) <= 4;
    let quality = lowPower() ? 1 : 2;

    let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, S = 0, wide = true;
    let running = false, visible = true, raf = 0, last = 0, tAccum = 0, slow = 0, frames = 0, emaDt = 16;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    /* Pre-rendered glow sprites (cheap additive lights) */
    const sprite = (h, l = 62) => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, `hsla(${h},100%,${l + 18}%,1)`);
      gr.addColorStop(0.25, `hsla(${h},100%,${l}%,.55)`);
      gr.addColorStop(1, `hsla(${h},100%,${l}%,0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      return c;
    };
    const sprites = Array.from({ length: N }, (_, i) => sprite(hue(i)));
    const coreSprite = sprite(236, 55);

    /* Scene data (unit space) */
    const nodes = Array.from({ length: N }, (_, i) => {
      const th = (i / N) * TAU;
      return { p: [Math.cos(th), 0.27 * Math.sin(2 * th + 0.6) + 0.1 * Math.sin(3 * th), Math.sin(th)], x: 0, y: 0, z: 0, s: 1, sx: 0, sy: 0 };
    });
    const sats = Array.from({ length: 16 }, (_, i) => ({
      r: 1.25 + ((i * 37) % 10) / 14, a: (i / 16) * TAU + (i % 3), y: -0.7 + ((i * 53) % 14) / 10, w: 0.05 + ((i * 29) % 7) / 90,
      anchor: Math.round(((i / 16) * N)) % N, x: 0, y2: 0, z: 0, s: 1, sx: 0, sy: 0,
    }));
    let dust = [];
    const buildDust = () => {
      const n = quality === 2 ? 150 : quality === 1 ? 60 : 24;
      dust = Array.from({ length: n }, () => ({
        x: (Math.random() - 0.5) * 4.2, y: (Math.random() - 0.5) * 2.8, z: (Math.random() - 0.5) * 4.2,
        v: 0.01 + Math.random() * 0.03, r: 0.6 + Math.random() * 1.3, o: 0.25 + Math.random() * 0.6,
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
    const depth01 = (z) => Math.min(1, Math.max(0, (z + 1.6) / 3.2));

    /* Quadratic bezier between rotated nodes a, b with an outward control point */
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

    function resize() {
      const r = hero.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, quality === 2 ? 2 : quality === 1 ? 1.5 : 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      wide = W >= 981;
      if (wide) { cx = W * 0.72; cy = H * 0.52; S = Math.min(H * 0.34, W * 0.2); }
      else {
        // Stacked layout: the scene sits in the gap between the headline and the lede.
        const inner = $('.hero-inner', hero), h1 = $('h1', hero), lede = $('.lede', hero);
        const top = inner.offsetTop + h1.offsetTop + h1.offsetHeight;
        const bottom = inner.offsetTop + lede.offsetTop;
        const gap = Math.max(160, bottom - top);
        cx = W * 0.5; cy = top + gap / 2 + 6; S = Math.min(W * (W < 640 ? 0.36 : 0.3), gap * (W < 640 ? 0.4 : 0.42));
      }
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
    const ringPts = (r, n = 72) => Array.from({ length: n + 1 }, (_, i) => [Math.cos((i / n) * TAU) * r, 0, Math.sin((i / n) * TAU) * r]);
    const RING_A = ringPts(1.0);
    const RING_B = ringPts(1.55);
    const lat = (n = 40) => Array.from({ length: n + 1 }, (_, i) => [Math.cos((i / n) * TAU), Math.sin((i / n) * TAU)]);
    const CIRCLE = lat();

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      const yaw = t * 0.07 + mouse.x * 0.4;
      const pitch = 0.46 + mouse.y * 0.26;
      setRot(yaw, pitch);
      ctx.globalCompositeOperation = 'lighter';

      /* Dust */
      ctx.fillStyle = '#9fb4ff';
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
      ctx.strokeStyle = '#8aa0ff';
      ctx.globalAlpha = 0.1;
      polyline3D(RING_A, (p, o) => rot(p[0], p[1], p[2], o)); ctx.stroke();
      if (quality > 0) {
        ctx.globalAlpha = 0.05;
        ctx.setLineDash([2, 8]);
        polyline3D(RING_B, (p, o) => rot(p[0], p[1] - 0.15, p[2], o)); ctx.stroke();
        ctx.setLineDash([]);
      }

      /* Transform nodes + satellites */
      for (let i = 0; i < N; i++) { const n = nodes[i]; rot(n.p[0], n.p[1], n.p[2], n); }
      for (let i = 0; i < sats.length; i++) {
        const s = sats[i]; const a = s.a + t * s.w;
        rot(Math.cos(a) * s.r, s.y, Math.sin(a) * s.r, tmp);
        s.x = tmp.x; s.y2 = tmp.y; s.z = tmp.z; s.s = tmp.s; s.sx = tmp.sx; s.sy = tmp.sy;
      }

      const active = (t * 0.45) % N; // travelling highlight
      const glowOf = (i) => { let d = Math.abs(i - active); d = Math.min(d, N - d); return Math.max(0, 1 - d * 0.8); };

      /* Satellite links + dots */
      if (quality > 0) {
        ctx.lineWidth = 1;
        for (let i = 0; i < sats.length; i++) {
          const s = sats[i]; const n = nodes[s.anchor];
          const dep = depth01(s.z);
          ctx.globalAlpha = 0.06 + 0.1 * dep;
          ctx.strokeStyle = `hsl(${hue(s.anchor)},90%,70%)`;
          ctx.beginPath(); ctx.moveTo(n.sx, n.sy); ctx.lineTo(s.sx, s.sy); ctx.stroke();
          ctx.globalAlpha = 0.25 + 0.5 * dep;
          const sz = 9 * s.s;
          ctx.drawImage(sprites[s.anchor], s.sx - sz, s.sy - sz, sz * 2, sz * 2);
        }
      }

      /* Cross links (neural mesh) */
      if (quality === 2) {
        ctx.lineWidth = 1;
        for (let i = 0; i < N; i++) {
          const a = nodes[i]; const b = nodes[(i + 3) % N];
          ctx.globalAlpha = 0.035 + 0.05 * depth01((a.z + b.z) / 2);
          ctx.strokeStyle = `hsl(${hue(i)},90%,72%)`;
          ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
        }
      }

      /* Ring edges + data packets */
      const SEG = quality === 2 ? 18 : 10;
      for (let i = 0; i < N; i++) {
        const a = nodes[i]; const b = nodes[(i + 1) % N];
        const c = ctrl(a, b);
        const dep = depth01((a.z + b.z) / 2);
        const g = ctx.createLinearGradient(a.sx, a.sy, b.sx, b.sy);
        g.addColorStop(0, `hsl(${hue(i)},95%,66%)`);
        g.addColorStop(1, `hsl(${hue((i + 1) % N)},95%,66%)`);
        const pt = { s: 1, z: 0, sx: 0, sy: 0 };
        ctx.beginPath();
        for (let k = 0; k <= SEG; k++) { bez(a, c, b, k / SEG, pt); if (k === 0) ctx.moveTo(pt.sx, pt.sy); else ctx.lineTo(pt.sx, pt.sy); }
        ctx.strokeStyle = g;
        ctx.lineWidth = 5 * ((a.s + b.s) / 2);
        ctx.globalAlpha = 0.05 + 0.06 * dep;
        ctx.stroke();
        ctx.lineWidth = 1.4 * ((a.s + b.s) / 2);
        ctx.globalAlpha = 0.22 + 0.5 * dep;
        ctx.stroke();

        const packets = quality === 2 ? 2 : 1;
        for (let k = 0; k < packets; k++) {
          const u = (t * 0.2 + i * 0.37 + k * 0.5) % 1;
          for (let tr = 0; tr < 4; tr++) {
            const uu = u - tr * 0.025;
            if (uu < 0) continue;
            bez(a, c, b, uu, pt);
            const sz = (16 - tr * 3) * pt.s;
            ctx.globalAlpha = (0.95 - tr * 0.24) * (0.45 + 0.55 * depth01(pt.z));
            ctx.drawImage(sprites[i], pt.sx - sz, pt.sy - sz, sz * 2, sz * 2);
          }
        }
      }

      /* Core + nodes, sorted back to front */
      const order = nodes.map((n, i) => ({ z: n.z, i })).concat([{ z: 0, i: -1 }]).sort((p, q) => p.z - q.z);
      for (let o = 0; o < order.length; o++) {
        const i = order[o].i;
        if (i === -1) { drawCore(t); continue; }
        drawNode(i, t, glowOf(i));
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    function drawCore(t) {
      rot(0, 0, 0, tmp);
      const g = 0.55 * S * tmp.s;
      ctx.globalAlpha = 0.5 + 0.12 * Math.sin(t * 1.4);
      ctx.drawImage(coreSprite, tmp.sx - g, tmp.sy - g, g * 2, g * 2);
      if (quality === 0) return;
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#a9b8ff';
      const R = 0.26;
      for (let k = 0; k < 3; k++) {
        const ph = t * (0.5 + k * 0.17) + k * 1.1;
        const cph = Math.cos(ph), sph = Math.sin(ph);
        ctx.globalAlpha = 0.22;
        polyline3D(CIRCLE, (p, o) => {
          const u = p[0] * R, v = p[1] * R;
          if (k === 0) return rot(u, v * cph, v * sph, o); // great circle spinning about X
          if (k === 1) return rot(v * cph, u, v * sph, o); // … about Y
          return rot(u * cph, u * sph, v, o);              // … about Z
        });
        ctx.stroke();
      }
    }

    function drawNode(i, t, glow) {
      const n = nodes[i];
      const dep = depth01(n.z);
      const s = n.s;
      const gSize = (34 + 40 * glow) * s;
      ctx.globalAlpha = (0.5 + 0.5 * glow) * (0.5 + 0.5 * dep);
      ctx.drawImage(sprites[i], n.sx - gSize, n.sy - gSize, gSize * 2, gSize * 2);

      ctx.globalAlpha = 0.35 + 0.65 * dep;
      ctx.strokeStyle = `hsl(${hue(i)},95%,75%)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(n.sx, n.sy, 9 * s, 0, TAU); ctx.stroke();
      if (glow > 0.05) {
        const ph = (t * 0.45) % 1;
        ctx.globalAlpha = glow * (1 - ph) * 0.8;
        ctx.beginPath(); ctx.arc(n.sx, n.sy, (10 + ph * 26) * s, 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 0.7 + 0.3 * dep;
      ctx.fillStyle = `hsl(${hue(i)},100%,${84 + glow * 10}%)`;
      ctx.beginPath(); ctx.arc(n.sx, n.sy, (3.4 + glow * 1.4) * s, 0, TAU); ctx.fill();

      // Label
      const fs = Math.max(9, (wide ? 11.5 : 10) * s);
      ctx.font = `500 ${fs.toFixed(1)}px ${FONT}`;
      ctx.textBaseline = 'middle';
      const right = n.sx >= cx;
      ctx.textAlign = right ? 'left' : 'right';
      const lx = n.sx + (right ? 1 : -1) * 15 * s;
      ctx.globalAlpha = (0.22 + 0.7 * dep) * (0.75 + 0.25 * glow);
      ctx.fillStyle = '#dbe3ff';
      ctx.fillText(LABELS[i].toUpperCase(), lx, n.sy - 6 * s);
      ctx.globalAlpha *= 0.55;
      ctx.fillStyle = `hsl(${hue(i)},90%,72%)`;
      ctx.font = `500 ${(fs * 0.86).toFixed(1)}px ${FONT}`;
      ctx.fillText(String(i + 1).padStart(2, '0'), lx, n.sy + 7 * s);
    }

    /* Loop control */
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      tAccum += dt;
      draw(tAccum);

      // Adaptive quality: drop a level if frames stay slow.
      emaDt = emaDt * 0.95 + dt * 1000 * 0.05;
      frames++;
      if (frames > 90 && emaDt > 30 && quality > 0) {
        slow++;
        if (slow > 20) { quality--; slow = 0; frames = 0; emaDt = 16; buildDust(); resize(); }
      } else if (emaDt <= 30) slow = 0;
    }
    function start() {
      if (running || reduceMQ.matches || !visible || document.hidden) return;
      running = true; last = performance.now(); raf = requestAnimationFrame(frame);
    }
    function stop() { running = false; cancelAnimationFrame(raf); }
    const sync = () => {
      if (reduceMQ.matches) { stop(); draw(2.4); } else start();
    };

    /* Pointer interaction (desktop only) */
    window.addEventListener('pointermove', (e) => {
      if (coarseMQ.matches || reduceMQ.matches || !visible) return;
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      hero.style.setProperty('--lx', ((e.clientX / window.innerWidth) * 100).toFixed(1) + '%');
      hero.style.setProperty('--ly', ((e.clientY / window.innerHeight) * 100).toFixed(1) + '%');
    }, { passive: true });

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero); else window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) start(); else stop(); }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    reduceMQ.addEventListener?.('change', sync);
    narrowMQ.addEventListener?.('change', () => { quality = lowPower() ? Math.min(quality, 1) : quality; buildDust(); resize(); });

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
