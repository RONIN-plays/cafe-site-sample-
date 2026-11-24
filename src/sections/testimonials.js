// ============ TESTIMONIALS — rotating quotes ============
const INTERVAL = 6.5; // seconds per quote

export function initTestimonials(ctx) {
  const { gsap, ScrollTrigger, SplitText, reducedMotion } = ctx;
  const root = document.querySelector('#testimonials');
  if (!root) return;

  const carousel = root.querySelector('[data-testimonials]');
  const slides = [...root.querySelectorAll('.testimonials__slide')];
  const mark = root.querySelector('.testimonials__mark');
  const countNum = root.querySelector('.testimonials__count-num');
  const fill = root.querySelector('.testimonials__progress-fill');
  const toggle = root.querySelector('.testimonials__toggle');
  const prevBtn = root.querySelector('.testimonials__arrow--prev');
  const nextBtn = root.querySelector('.testimonials__arrow--next');
  const live = root.querySelector('.testimonials__live');
  const total = slides.length;
  const pad = (n) => String(n).padStart(2, '0');

  let current = 0;
  let swapTl = null;
  let timer = null;
  const pauseReasons = new Set(['offscreen']);
  const splits = [];

  /* ---------- per-slide split (re-splits on resize / font load) ---------- */
  slides.forEach((slide, i) => {
    const p = slide.querySelector('.testimonials__quote p');
    SplitText.create(p, {
      type: 'lines,words',
      mask: 'lines',
      linesClass: 'testimonials__line',
      wordsClass: 'testimonials__word',
      autoSplit: true,
      onSplit(self) {
        if (swapTl) swapTl.progress(1);
        splits[i] = self;
        gsap.set(self.words, { yPercent: 0, opacity: 1 });
      },
    });
  });

  function setSlideA11y() {
    slides.forEach((s, i) => {
      const on = i === current;
      s.classList.toggle('is-active', on);
      s.toggleAttribute('inert', !on);
      s.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
  }
  setSlideA11y();

  /* ---------- counter roll ---------- */
  function rollCounter(dir) {
    const next = pad(current + 1);
    if (reducedMotion) { countNum.textContent = next; return; }
    gsap.timeline()
      .to(countNum, { yPercent: -110 * dir, duration: 0.35, ease: 'power2.in' })
      .add(() => { countNum.textContent = next; })
      .fromTo(countNum, { yPercent: 110 * dir }, { yPercent: 0, duration: 0.6 });
  }

  /* ---------- the swap ---------- */
  function goTo(index, { dir = 1, announce = false } = {}) {
    index = (index + total) % total;
    if (index === current) return;
    if (swapTl) swapTl.progress(1).kill();

    const outSlide = slides[current];
    const inSlide = slides[index];
    const outWords = splits[current]?.words || [];
    const inWords = splits[index]?.words || [];
    const outCite = outSlide.querySelector('.testimonials__cite');
    const inCite = inSlide.querySelector('.testimonials__cite');
    current = index;

    rollCounter(dir);
    if (announce) {
      const q = inSlide.querySelector('.testimonials__quote').textContent.trim();
      const who = inSlide.querySelector('.testimonials__who').textContent.trim();
      live.textContent = `Quote ${index + 1} of ${total}: ${q} ${who}.`;
    }

    if (reducedMotion) {
      setSlideA11y();
      gsap.fromTo(inSlide, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'none' });
      updateStaticProgress();
      return;
    }

    swapTl = gsap.timeline({ onComplete: () => { swapTl = null; } });
    swapTl
      // outgoing words drift up and dissolve, last word first feels like steam lifting
      .to(outWords, {
        yPercent: -60 * dir, opacity: 0, duration: 0.55, ease: 'power2.in',
        stagger: { each: 0.012, from: dir > 0 ? 'start' : 'end' },
      }, 0)
      .to(outCite, { y: -14, opacity: 0, duration: 0.4, ease: 'power2.in' }, 0)
      // the giant quote mark breathes: a slight lift and tilt
      .to(mark, { yPercent: -6, rotate: -4 * dir, duration: 0.6, ease: 'power2.inOut' }, 0)
      .add(() => setSlideA11y(), 0.5)
      .fromTo(inWords, { yPercent: 115, opacity: 1 }, {
        yPercent: 0, duration: 1.15, stagger: { each: 0.022, from: 'start' },
      }, 0.5)
      .fromTo(inCite, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, 0.85)
      .to(mark, { yPercent: 0, rotate: 0, duration: 1.4 }, 0.6)
      .add(() => { gsap.set(outWords, { yPercent: 0, opacity: 1 }); gsap.set(outCite, { clearProps: 'all' }); });

    startTimer();
  }

  const next = (o) => goTo(current + 1, { dir: 1, ...o });
  const prev = (o) => goTo(current - 1, { dir: -1, ...o });

  /* ---------- timer: the progress tween IS the clock ---------- */
  function startTimer() {
    if (reducedMotion) return;
    if (timer) timer.kill();
    timer = gsap.fromTo(fill, { scaleX: 0 }, {
      scaleX: 1, duration: INTERVAL, ease: 'none',
      onComplete: () => next(),
      paused: pauseReasons.size > 0,
    });
  }
  function setPaused(reason, on) {
    if (on) pauseReasons.add(reason); else pauseReasons.delete(reason);
    if (!timer) return;
    if (pauseReasons.size) timer.pause(); else timer.resume();
  }
  function updateStaticProgress() {
    gsap.set(fill, { scaleX: (current + 1) / total });
  }

  /* ---------- controls ---------- */
  nextBtn.addEventListener('click', () => { next({ announce: true }); });
  prevBtn.addEventListener('click', () => { prev({ announce: true }); });

  carousel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next({ announce: true }); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev({ announce: true }); }
  });

  if (reducedMotion) {
    toggle.hidden = true;
    updateStaticProgress();
    return;
  }

  toggle.addEventListener('click', () => {
    const paused = toggle.getAttribute('aria-pressed') !== 'true';
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused ? 'Play' : 'Pause';
    setPaused('user', paused);
  });

  // pause while the reader is with it: hover, keyboard focus, hidden tab, off-screen
  carousel.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setPaused('hover', true); });
  carousel.addEventListener('pointerleave', () => setPaused('hover', false));
  carousel.addEventListener('focusin', () => setPaused('focus', true));
  carousel.addEventListener('focusout', (e) => { if (!carousel.contains(e.relatedTarget)) setPaused('focus', false); });
  document.addEventListener('visibilitychange', () => setPaused('hidden', document.hidden));

  ScrollTrigger.create({
    trigger: carousel,
    start: 'top 85%',
    end: 'bottom 10%',
    onToggle: (self) => setPaused('offscreen', !self.isActive),
  });

  startTimer();

  /* ---------- entrance: headline lines + press row ---------- */
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    SplitText.create(root.querySelector('.testimonials__title'), {
      type: 'lines', mask: 'lines', autoSplit: true,
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 110, duration: 1.3, stagger: 0.08,
          scrollTrigger: { trigger: root, start: 'top 75%', once: true },
        });
      },
    });

    gsap.from(mark, {
      yPercent: 30, opacity: 0, rotate: -8, duration: 1.6,
      scrollTrigger: { trigger: carousel, start: 'top 80%', once: true },
    });

    gsap.from(root.querySelectorAll('.testimonials__press-item'), {
      y: 24, opacity: 0, duration: 1, stagger: 0.07,
      scrollTrigger: { trigger: root.querySelector('.testimonials__press'), start: 'top 92%', once: true },
    });
  });
}
