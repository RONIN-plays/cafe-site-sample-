// ============ PRELOADER ============
// Cup fills in sync with a 000 → 100 counter. Progress loosely tracks the hero
// images plus a minimum duration. Resolves once the curtain has fully opened.

const MIN_DURATION = 2000; // ms
const MAX_WAIT = 7000; // ms – never hold the page hostage
const LEVEL_EMPTY = 168; // liquid group y when empty (below cup floor)
const LEVEL_FULL = 70; // liquid group y when full (just under the rim)

function trackImages(selector) {
  const imgs = Array.from(document.querySelectorAll(selector));
  const state = { total: imgs.length, done: 0 };
  if (!imgs.length) return { progress: () => 1 };
  const tick = () => { state.done = Math.min(state.total, state.done + 1); };
  imgs.forEach((img) => {
    if (img.complete) { tick(); return; }
    img.addEventListener('load', tick, { once: true });
    img.addEventListener('error', tick, { once: true });
  });
  return { progress: () => state.done / state.total };
}

export async function initPreloader(ctx) {
  const { gsap, reducedMotion } = ctx;
  const root = document.querySelector('[data-preloader]');
  if (!root) return;

  // always start the story at the top
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  ctx.lenis?.scrollTo(0, { immediate: true, force: true });

  const q = (s) => root.querySelector(s);
  const qa = (s) => root.querySelectorAll(s);
  const countEl = q('[data-preloader-count]');
  const liquid = q('.preloader__liquid');
  const waveFront = q('.preloader__wave--front');
  const waveBack = q('.preloader__wave--back');
  const draws = qa('.preloader__draw');
  const steam = qa('.preloader__steam-path');

  const images = trackImages('.hero img');
  const start = performance.now();
  const minDuration = reducedMotion ? 500 : MIN_DURATION;

  const fmt = (n) => String(Math.round(n)).padStart(3, '0');
  const setLevel = (p) => {
    const y = LEVEL_EMPTY + (LEVEL_FULL - LEVEL_EMPTY) * p;
    liquid.setAttribute('transform', `translate(0 ${y.toFixed(2)})`);
  };

  // ---------- intro: draw the cup ----------
  const waves = [];
  steam.forEach((p) => {
    const len = Math.ceil(p.getTotalLength()) + 2;
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, attr: { 'data-len': len } });
  });
  if (!reducedMotion) {
    draws.forEach((p) => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    });
    gsap.to(draws, { strokeDashoffset: 0, duration: 1.4, stagger: 0.12, ease: 'power2.inOut' });
    gsap.from(['.preloader__meta', '.preloader__tagline', '.preloader__count'].map((s) => q(s)), {
      yPercent: 100, opacity: 0, duration: 1.1, stagger: 0.08, delay: 0.1,
    });
    // endless gentle waves (two layers, opposite directions)
    waves.push(gsap.fromTo(waveFront, { x: 0 }, { x: -50, duration: 1.6, ease: 'none', repeat: -1 }));
    waves.push(gsap.fromTo(waveBack, { x: -50 }, { x: 0, duration: 2.3, ease: 'none', repeat: -1 }));
    // a little vertical bob so the surface feels liquid
    waves.push(gsap.to([waveFront, waveBack], { y: 1.5, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.3 }));
  }

  // ---------- progress loop ----------
  await new Promise((resolve) => {
    const state = { shown: 0 };
    const update = () => {
      const elapsed = performance.now() - start;
      const timeP = Math.min(1, elapsed / minDuration);
      const imgP = elapsed > MAX_WAIT ? 1 : images.progress();
      // target is limited by both clocks; ease towards it so numbers glide
      const target = Math.min(timeP, 0.15 + imgP * 0.85, 1) * 100;
      const k = reducedMotion ? 0.35 : 0.075;
      state.shown += (target - state.shown) * k;
      if (target >= 100 && state.shown > 99.4) state.shown = 100;
      countEl.textContent = fmt(state.shown);
      setLevel(state.shown / 100);
      if (state.shown >= 100) {
        gsap.ticker.remove(update);
        resolve();
      }
    };
    gsap.ticker.add(update);
  });

  root.setAttribute('aria-label', 'Loaded');

  // ---------- exit ----------
  const finish = () => {
    waves.forEach((t) => t.kill());
    root.classList.add('is-done');
    root.remove();
  };

  if (reducedMotion) {
    window.dispatchEvent(new CustomEvent('marlow:preloader-exit'));
    await gsap.to(root, { opacity: 0, duration: 0.5, ease: 'power1.out' });
    finish();
    return;
  }

  const tl = gsap.timeline();
  // the cup steams once it's full
  tl.to(steam, { strokeDashoffset: 0, duration: 0.9, stagger: 0.12, ease: 'power2.out' })
    .to(steam, { strokeDashoffset: (i, el) => -Number(el.getAttribute('data-len')), opacity: 0, duration: 0.8, stagger: 0.12, ease: 'power2.in' }, '>-0.1')
    // content slides away
    .to(q('.preloader__count'), { yPercent: -105, duration: 0.8, ease: 'power3.in' }, 0.55)
    .to([q('.preloader__tagline'), q('.preloader__meta')], { y: -40, opacity: 0, duration: 0.7, stagger: 0.05, ease: 'power3.in' }, 0.6)
    .to(q('.preloader__cup'), { y: -60, opacity: 0, duration: 0.8, ease: 'power3.in' }, 0.65)
    // terracotta seam draws across
    .to(q('.preloader__seam'), { scaleX: 1, duration: 0.7, ease: 'expo.inOut' }, 1.15)
    .add(() => window.dispatchEvent(new CustomEvent('marlow:preloader-exit')), 1.75)
    // curtain splits
    .to(q('.preloader__panel--top'), { yPercent: -100, duration: 1.25, ease: 'expo.inOut' }, 1.75)
    .to(q('.preloader__panel--bottom'), { yPercent: 100, duration: 1.25, ease: 'expo.inOut' }, 1.75)
    .to(q('.preloader__seam'), { scaleY: 0, opacity: 0, duration: 0.5, ease: 'power2.in' }, 1.8);

  await tl;
  finish();
}
