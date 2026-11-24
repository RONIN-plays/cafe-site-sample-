// ============ CURSOR + MAGNETIC ============
// Dot + trailing ring (gsap.quickTo). Ring grows over interactive elements and
// turns into a filled terracotta label disc over [data-cursor="view"].
// Every [data-magnetic] element is pulled toward the pointer and springs back.

const SIZES = { default: 40, hover: 68, view: 104, text: 4 };

function injectStyles() {
  if (document.getElementById('cursor-runtime-styles')) return;
  const s = document.createElement('style');
  s.id = 'cursor-runtime-styles';
  s.textContent = `
    html.has-cursor, html.has-cursor * { cursor: none !important; }
    html.has-cursor input, html.has-cursor textarea, html.has-cursor select,
    html.has-cursor [contenteditable] { cursor: text !important; }
    .cursor { opacity: 0; transition: opacity .3s ease; }
    .cursor.is-visible { opacity: 1; }
    .cursor__ring { transition: border-color .35s ease, background-color .35s ease; }
    .cursor.is-hover .cursor__ring { border-color: rgba(200,86,43,.9); background-color: rgba(200,86,43,.08); }
    .cursor.is-view .cursor__ring { border-color: transparent; background-color: var(--terracotta); }
    .cursor.is-view .cursor__dot, .cursor.is-text .cursor__dot { opacity: 0; }
    .cursor.is-text .cursor__ring { opacity: 0; }
    .cursor__dot { transition: opacity .25s ease; }
    .cursor__label { white-space: nowrap; }
  `;
  document.head.appendChild(s);
}

function bindMagnetic(el, gsap) {
  if (el.__magnetic) return;
  el.__magnetic = true;
  const strength = parseFloat(el.dataset.magnetic) || 0.35;
  const inner = el.querySelector('[data-magnetic-inner]') || (el.children.length === 1 ? el.firstElementChild : null);
  const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
  const ixTo = inner ? gsap.quickTo(inner, 'x', { duration: 0.6, ease: 'power3.out' }) : null;
  const iyTo = inner ? gsap.quickTo(inner, 'y', { duration: 0.6, ease: 'power3.out' }) : null;
  let rect = null;

  el.addEventListener('pointerenter', () => {
    // measure without the current magnetic offset
    const x = gsap.getProperty(el, 'x');
    const y = gsap.getProperty(el, 'y');
    const r = el.getBoundingClientRect();
    rect = { left: r.left - x, top: r.top - y, width: r.width, height: r.height };
  });
  el.addEventListener('pointermove', (e) => {
    if (!rect) return;
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    xTo(dx * strength);
    yTo(dy * strength);
    if (ixTo) { ixTo(dx * strength * 0.45); iyTo(dy * strength * 0.45); }
  });
  el.addEventListener('pointerleave', () => {
    rect = null;
    gsap.to(el, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.35)', overwrite: true });
    if (inner) gsap.to(inner, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.35)', overwrite: true });
  });
}

export function initCursor(ctx) {
  const { gsap, isTouch, reducedMotion } = ctx;
  const root = document.querySelector('.cursor');
  if (isTouch || !root || !window.matchMedia('(pointer: fine)').matches) return;

  injectStyles();
  document.documentElement.classList.add('has-cursor');

  const dot = root.querySelector('.cursor__dot');
  const ring = root.querySelector('.cursor__ring');
  const label = root.querySelector('.cursor__label');

  const dotDur = reducedMotion ? 0.01 : 0.12;
  const ringDur = reducedMotion ? 0.01 : 0.5;
  const dX = gsap.quickTo(dot, 'x', { duration: dotDur, ease: 'power3.out' });
  const dY = gsap.quickTo(dot, 'y', { duration: dotDur, ease: 'power3.out' });
  const rX = gsap.quickTo(ring, 'x', { duration: ringDur, ease: 'power3.out' });
  const rY = gsap.quickTo(ring, 'y', { duration: ringDur, ease: 'power3.out' });

  let state = 'default';
  const setSize = (size, dur = 0.55) => gsap.to(ring, {
    width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2,
    duration: reducedMotion ? 0.01 : dur, ease: 'expo.out', overwrite: 'auto',
  });

  const setState = (next, text = '') => {
    if (next === state && (next !== 'view' || label.textContent === text)) return;
    state = next;
    root.classList.toggle('is-hover', next === 'hover');
    root.classList.toggle('is-view', next === 'view');
    root.classList.toggle('is-text', next === 'text');
    setSize(SIZES[next] ?? SIZES.default);
    if (next === 'view') {
      label.textContent = text || 'View';
      gsap.fromTo(label, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'expo.out', overwrite: true });
    } else {
      gsap.to(label, { opacity: 0, duration: 0.2, overwrite: true });
    }
  };

  const resolve = (target) => {
    if (!(target instanceof Element)) return ['default'];
    const view = target.closest('[data-cursor="view"]');
    if (view) return ['view', view.getAttribute('data-cursor-label') || 'View'];
    if (target.closest('input, textarea, select, [contenteditable]')) return ['text'];
    if (target.closest('[data-cursor="hover"], a, button, [role="button"], label, [data-magnetic]')) return ['hover'];
    return ['default'];
  };

  let shown = false;
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    dX(e.clientX); dY(e.clientY);
    rX(e.clientX); rY(e.clientY);
    if (!shown) {
      shown = true;
      gsap.set([dot, ring], { x: e.clientX, y: e.clientY });
      root.classList.add('is-visible');
    }
  }, { passive: true });

  document.addEventListener('pointerover', (e) => {
    const [s, t] = resolve(e.target);
    setState(s, t);
  });
  document.documentElement.addEventListener('pointerleave', () => { root.classList.remove('is-visible'); shown = false; });
  window.addEventListener('blur', () => { root.classList.remove('is-visible'); shown = false; });

  window.addEventListener('pointerdown', () => gsap.to(ring, { scale: 0.82, duration: 0.25, ease: 'power3.out' }));
  window.addEventListener('pointerup', () => gsap.to(ring, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)' }));

  // the element under the pointer can change while scrolling without a pointerover
  let lastX = -1; let lastY = -1;
  window.addEventListener('pointermove', (e) => { lastX = e.clientX; lastY = e.clientY; }, { passive: true });
  const recheck = () => {
    if (lastX < 0) return;
    const el = document.elementFromPoint(lastX, lastY);
    const [s, t] = resolve(el);
    setState(s, t);
  };
  let rafPending = false;
  let lastCheck = 0;
  ctx.lenis?.on('scroll', () => {
    const now = performance.now();
    if (rafPending || now - lastCheck < 100) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; lastCheck = performance.now(); recheck(); });
  });

  // ---------- magnetic ----------
  if (!reducedMotion) {
    const bindAll = () => document.querySelectorAll('[data-magnetic]').forEach((el) => bindMagnetic(el, gsap));
    bindAll();
    ctx.onReady(bindAll); // pick up anything other sections injected during init
  }
}
