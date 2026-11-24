// ============ FOOTER — newsletter, back to top, MARLOW wordmark ============
const BASE = { w: 400, s: 0, k: 0, y: 0 };

export function initFooter(ctx) {
  const { gsap, ScrollTrigger, lenis, reducedMotion, isTouch } = ctx;
  const root = document.querySelector('.footer');
  if (!root) return;

  initNewsletter(root, ctx);
  initClock(root);

  /* ---------- back to top + in-page links ---------- */
  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, reducedMotion ? { immediate: true } : { duration: 2, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else (typeof target === 'number' ? window : target).scrollTo?.({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  };
  root.querySelector('.footer__top-btn')?.addEventListener('click', () => {
    scrollTo(0);
    const main = document.querySelector('main');
    if (main) {
      if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
    }
  });
  root.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const el = document.querySelector(a.getAttribute('href'));
      if (!el || !lenis) return;
      e.preventDefault();
      lenis.scrollTo(el, reducedMotion ? { immediate: true } : { duration: 1.8 });
    });
  });

  /* ---------- wordmark: fit to width ---------- */
  const mark = root.querySelector('.footer__mark');
  const word = root.querySelector('.footer__word');
  const letters = [...root.querySelectorAll('.footer__letter')];
  const glyphs = letters.map((l) => l.querySelector('.footer__glyph'));
  if (!word || !letters.length) return;

  const fit = () => {
    word.style.fontSize = '';
    letters.forEach((l) => { l.style.width = ''; });
    const avail = word.clientWidth;
    const sum = letters.reduce((a, l) => a + l.offsetWidth, 0);
    if (!avail || !sum) return;
    const fs = parseFloat(getComputedStyle(word).fontSize);
    // leave ~10% breathing room so heavier hover weights don't collide
    word.style.fontSize = `${(fs * avail * 0.9) / sum}px`;
    // lock each cell so weight changes never reflow the row
    letters.forEach((l) => { l.style.width = `${l.offsetWidth}px`; });
  };
  fit();
  let rz;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { fit(); ScrollTrigger.refresh(); }, 150); });
  document.fonts?.ready.then(fit);

  /* ---------- wordmark: letters rise in with the scroll ---------- */
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.fromTo(letters, { yPercent: 105, rotate: (i) => (i % 2 ? 5 : -5) }, {
      yPercent: 0, rotate: 0, ease: 'power2.out', stagger: 0.12,
      scrollTrigger: {
        trigger: root,
        start: 'top 75%',
        end: 'bottom bottom',
        scrub: 0.8,
      },
    });
  });

  /* ---------- wordmark: variable-font hover wave ---------- */
  const state = letters.map(() => ({ ...BASE }));
  const target = letters.map(() => ({ ...BASE }));
  let pointer = null; // {x, y} in client coords, or null when away
  let running = false;
  let inView = false;

  const computeTargets = () => {
    letters.forEach((l, i) => {
      const t = target[i];
      if (!pointer) { Object.assign(t, BASE); return; }
      const r = l.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (pointer.x - cx) / (r.width * 1.25);
      const dy = (pointer.y - cy) / (r.height * 1.6);
      const p = Math.exp(-(dx * dx + dy * dy)); // 0..1 gaussian falloff
      t.w = 400 + 330 * p;
      t.s = 100 * p;
      t.k = p > 0.45 ? 1 : 0;
      t.y = reducedMotion ? 0 : -6 * p;
    });
  };

  const render = () => {
    let moving = false;
    letters.forEach((_, i) => {
      const s = state[i];
      const t = target[i];
      const ease = 0.14;
      s.w += (t.w - s.w) * ease;
      s.s += (t.s - s.s) * ease;
      s.y += (t.y - s.y) * ease;
      s.k = t.k;
      if (Math.abs(t.w - s.w) > 0.5 || Math.abs(t.y - s.y) > 0.05) moving = true;
      glyphs[i].style.fontVariationSettings = `'wght' ${s.w.toFixed(1)}, 'SOFT' ${s.s.toFixed(1)}, 'WONK' ${s.k}, 'opsz' 144`;
      glyphs[i].style.transform = s.y ? `translateY(${s.y.toFixed(2)}%)` : '';
    });
    if (!moving && !pointer) stop();
  };
  const start = () => { if (!running) { running = true; gsap.ticker.add(render); } };
  const stop = () => { if (running) { running = false; gsap.ticker.remove(render); } };

  ScrollTrigger.create({
    trigger: mark,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => { inView = self.isActive; if (!inView) { pointer = null; computeTargets(); start(); } },
  });

  if (!isTouch) {
    root.addEventListener('pointermove', (e) => {
      if (!inView || e.pointerType !== 'mouse') return;
      pointer = { x: e.clientX, y: e.clientY };
      computeTargets();
      start();
    });
    root.addEventListener('pointerleave', () => { pointer = null; computeTargets(); start(); });
  } else if (!reducedMotion) {
    // touch: a tap on the wordmark sends a single wave across it
    mark.addEventListener('pointerdown', () => {
      const r = word.getBoundingClientRect();
      const sweep = { x: r.left - r.width * 0.15 };
      gsap.to(sweep, {
        x: r.right + r.width * 0.15, duration: 1.6, ease: 'power1.inOut',
        onUpdate: () => {
          const rr = word.getBoundingClientRect();
          pointer = { x: sweep.x, y: rr.top + rr.height / 2 };
          computeTargets(); start();
        },
        onComplete: () => { pointer = null; computeTargets(); start(); },
      });
    });
  }
}

/* ================= newsletter ================= */
function initNewsletter(root, ctx) {
  const { gsap, reducedMotion } = ctx;
  const form = root.querySelector('.footer__news');
  if (!form) return;
  const input = form.querySelector('.footer__news-input');
  const btn = form.querySelector('.footer__news-btn');
  const arrow = form.querySelector('.footer__news-arrow');
  const check = form.querySelector('.footer__news-check path');
  const status = form.querySelector('.footer__news-status');
  let done = false;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (done) return;
    const v = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      status.textContent = v ? 'That email looks incomplete. Check for a typo.' : 'Add your email to get the letters.';
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      if (!reducedMotion) gsap.fromTo(form.querySelector('.footer__news-row'), { x: 0 }, { keyframes: { x: [0, -8, 7, -4, 2, 0] }, duration: 0.45, ease: 'power1.inOut' });
      return;
    }
    done = true;
    input.setAttribute('aria-invalid', 'false');
    input.readOnly = true;
    btn.setAttribute('aria-disabled', 'true');
    btn.setAttribute('aria-label', 'Subscribed');
    status.textContent = 'You’re on the list. The first letter arrives early next month.';
    if (reducedMotion) {
      gsap.set(arrow, { autoAlpha: 0 });
      gsap.set(check, { strokeDashoffset: 0 });
      return;
    }
    gsap.timeline()
      .to(arrow, { xPercent: 180, duration: 0.4, ease: 'power3.in' })
      .fromTo(check.ownerSVGElement, { scale: 0.6 }, { scale: 1, duration: 0.7 }, 0.4)
      .to(check, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }, 0.45);
  });
  input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true') { input.removeAttribute('aria-invalid'); status.textContent = ''; }
  });
}

/* ================= local clock ================= */
function initClock(root) {
  const el = root.querySelector('.footer__clock-time');
  if (!el) return;
  const tick = () => {
    const d = new Date();
    el.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  tick();
  setInterval(tick, 15000);
}
