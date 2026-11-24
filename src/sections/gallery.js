// ============ GALLERY — pinned multi-speed columns, velocity skew, Flip lightbox ============

export function initGallery(ctx) {
  const { gsap, ScrollTrigger, SplitText, Flip, reducedMotion, lenis } = ctx;
  const root = document.querySelector('#gallery');
  if (!root) return;

  const head = root.querySelector('.gallery__head');
  const title = root.querySelector('.gallery__title');
  const cols = [...root.querySelectorAll('.gallery__col')];
  const items = [...root.querySelectorAll('.gallery__item')];
  const byIndex = (i) => items.find((it) => Number(it.dataset.index) === i);

  /* ---------------- headline reveal ---------------- */
  if (!reducedMotion) {
    SplitText.create(title, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 115,
          duration: 1.5,
          stagger: 0.14,
          scrollTrigger: { trigger: root, start: 'top 65%', once: true },
        });
      },
    });
    gsap.from(root.querySelectorAll('.gallery__eyebrow, .gallery__sub'), {
      y: 20,
      opacity: 0,
      duration: 1.1,
      stagger: 0.25,
      delay: 0.3,
      scrollTrigger: { trigger: root, start: 'top 65%', once: true },
    });
  }

  /* ---------------- image reveal helper (clip wipe + inner scale-down) ---------------- */
  const reveal = (item, delay = 0) => {
    if (item._revealed) return;
    item._revealed = true;
    const media = item.querySelector('.gallery__media');
    const img = media.querySelector('img');
    gsap.to(media, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, delay, ease: 'expo.out' });
    gsap.fromTo(img, { scale: 1.5 }, { scale: root.classList.contains('is-pinned') ? 1.18 : 1, duration: 1.8, delay, ease: 'expo.out' });
  };
  const prepReveal = () => items.forEach((it) => {
    it._revealed = false;
    gsap.set(it.querySelector('.gallery__media'), { clipPath: 'inset(100% 0% 0% 0%)' });
  });

  const mm = gsap.matchMedia();

  mm.add({ desktop: '(min-width: 900px)', mobile: '(max-width: 899px)' }, (c) => {
    if (reducedMotion) return; // static layout from CSS, nothing hidden

    /* ---------- mobile: 2-col staggered, reveal on scroll ---------- */
    if (c.conditions.mobile) {
      prepReveal();
      ScrollTrigger.batch(items, {
        start: 'top 90%',
        once: true,
        onEnter: (batch) => batch.forEach((it, i) => reveal(it, i * 0.12)),
      });
      return () => items.forEach((it) => { it._revealed = false; });
    }

    /* ---------- desktop: pinned stage, columns rise at different speeds ---------- */
    root.classList.add('is-pinned');
    prepReveal();

    const vh = () => window.innerHeight;
    // start offset (in vh, below the top) and extra exit distance — different spans = different speeds
    const cfg = [
      { from: 0.58, to: -0.55 },
      { from: 1.02, to: -0.2 },
      { from: 0.78, to: -0.42 },
      { from: 1.28, to: -0.7 },
    ];

    const checkReveal = () => {
      const limit = vh() * 0.96;
      for (const it of items) {
        if (!it._revealed && it.getBoundingClientRect().top < limit) reveal(it);
      }
    };

    // velocity skew: spikes with scroll speed, eases back to rest
    const skewSetters = items.map((it) => gsap.quickSetter(it, 'skewY', 'deg'));
    const clampSkew = gsap.utils.clamp(-5, 5);
    const proxy = { skew: 0 };
    const applySkew = () => skewSetters.forEach((set) => set(proxy.skew));

    const tl = gsap.timeline({
      defaults: { ease: 'none', duration: 1 },
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: () => `+=${Math.round(vh() * 1.7)}`,
        pin: true,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          checkReveal();
          const s = clampSkew(self.getVelocity() / -320);
          if (Math.abs(s) > Math.abs(proxy.skew)) {
            proxy.skew = s;
            gsap.to(proxy, { skew: 0, duration: 0.9, ease: 'power3', overwrite: true, onUpdate: applySkew });
          }
        },
      },
    });

    cols.forEach((col, i) => {
      const k = cfg[i % cfg.length];
      tl.fromTo(col,
        { y: () => vh() * k.from },
        { y: () => -col.offsetHeight - vh() * k.to },
        0);
      // inner image drift against the column for depth
      tl.fromTo(col.querySelectorAll('.gallery__media img'),
        { yPercent: -7 },
        { yPercent: 7 },
        0);
    });

    // headline recedes as the frames pass over it
    tl.fromTo(head,
      { scale: 1, opacity: 1, filter: 'blur(0px)' },
      { scale: 0.86, opacity: 0.14, filter: 'blur(8px)', ease: 'power1.in', duration: 0.55 },
      0)
      .to(head, { scale: 0.92, opacity: 1, filter: 'blur(0px)', ease: 'power2.out', duration: 0.35 }, 0.65);

    // images already peeking in before the pin starts
    ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'top top',
      onUpdate: checkReveal,
      onEnter: checkReveal,
    });

    return () => {
      root.classList.remove('is-pinned');
      gsap.set(items, { clearProps: 'transform' });
      items.forEach((it) => { it._revealed = false; });
    };
  });

  /* ---------------- lightbox (Flip-fit from thumbnail to fullscreen) ---------------- */
  const lb = document.createElement('div');
  lb.className = 'gallery__lb';
  lb.hidden = true;
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Gallery image viewer');
  lb.innerHTML = `
    <div class="gallery__lb-bg"></div>
    <div class="gallery__lb-ui">
      <span class="gallery__lb-count" aria-live="polite"></span>
      <span class="gallery__lb-hint">Arrow keys to browse · Esc to close</span>
      <button class="gallery__lb-close" type="button">Close</button>
    </div>
    <figure class="gallery__lb-fig">
      <div class="gallery__lb-frame"><img alt="" width="800" height="1000" decoding="async" /></div>
      <figcaption class="gallery__lb-cap"></figcaption>
    </figure>`;
  document.body.appendChild(lb);

  const lbBg = lb.querySelector('.gallery__lb-bg');
  const lbUi = lb.querySelector('.gallery__lb-ui');
  const lbFrame = lb.querySelector('.gallery__lb-frame');
  const lbImg = lbFrame.querySelector('img');
  const lbCap = lb.querySelector('.gallery__lb-cap');
  const lbCount = lb.querySelector('.gallery__lb-count');
  const lbClose = lb.querySelector('.gallery__lb-close');
  const total = items.length;
  let open = false;
  let busy = false;
  let idx = 0;
  let lastFocus = null;

  const mediaOf = (i) => byIndex(i).querySelector('.gallery__media');
  const fill = (i) => {
    const it = byIndex(i);
    const img = it.querySelector('img');
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbCap.innerHTML = it.querySelector('.gallery__cap').innerHTML;
    lbCount.textContent = `${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  };
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
  };

  function openLb(i, trigger) {
    if (open || busy) return;
    open = true;
    busy = true;
    idx = i;
    lastFocus = trigger;
    fill(i);
    lb.hidden = false;
    if (lenis) lenis.stop();
    lbClose.focus({ preventScroll: true });

    const media = mediaOf(i);
    if (reducedMotion) {
      gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: 0.25, onComplete: () => { busy = false; } });
      return;
    }
    gsap.set(lb, { opacity: 1 });
    Flip.fit(lbFrame, media, { scale: true });
    gsap.set(media, { opacity: 0 });
    gsap.to(lbFrame, { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0, duration: 1, ease: 'marlow', onComplete: () => { busy = false; } });
    gsap.fromTo(lbImg, { scale: 1.18 }, { scale: 1, duration: 1.1, ease: 'marlow' });
    gsap.fromTo(lbBg, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' });
    gsap.fromTo([lbUi, lbCap], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.45, stagger: 0.08 });
  }

  function closeLb() {
    if (!open || busy) return;
    busy = true;
    const media = mediaOf(idx);
    const done = () => {
      lb.hidden = true;
      gsap.set([lbFrame, lbImg, lbUi, lbCap, lbBg, lb], { clearProps: 'all' });
      gsap.set(media, { clearProps: 'opacity' });
      if (lenis) lenis.start();
      open = false;
      busy = false;
      const back = byIndex(idx).querySelector('.gallery__btn') || lastFocus;
      if (back) back.focus({ preventScroll: true });
    };
    if (reducedMotion) { gsap.to(lb, { opacity: 0, duration: 0.2, onComplete: done }); return; }

    gsap.to([lbUi, lbCap], { opacity: 0, duration: 0.25 });
    gsap.to(lbBg, { opacity: 0, duration: 0.7, delay: 0.1, ease: 'power2.inOut' });
    if (inView(media)) {
      gsap.to(lbImg, { scale: 1.18, duration: 0.85, ease: 'power3.inOut' });
      Flip.fit(lbFrame, media, { scale: true, duration: 0.85, ease: 'power3.inOut', onComplete: done });
    } else {
      gsap.to(lbFrame, { opacity: 0, scale: 0.92, duration: 0.5, ease: 'power3.in', onComplete: () => { gsap.set(media, { clearProps: 'opacity' }); done(); } });
    }
  }

  function step(d) {
    if (!open || busy) return;
    const prevMedia = mediaOf(idx);
    idx = (idx + d + total) % total;
    busy = true;
    gsap.to(lbFrame, {
      opacity: 0, x: -30 * d, duration: reducedMotion ? 0.01 : 0.3, ease: 'power2.in',
      onComplete: () => {
        gsap.set(prevMedia, { clearProps: 'opacity' });
        gsap.set(mediaOf(idx), { opacity: 0 });
        fill(idx);
        gsap.fromTo(lbFrame, { opacity: 0, x: 30 * d }, { opacity: 1, x: 0, duration: reducedMotion ? 0.01 : 0.6, ease: 'marlow', onComplete: () => { busy = false; } });
      },
    });
  }

  items.forEach((it) => {
    const btn = it.querySelector('.gallery__btn');
    btn.addEventListener('click', () => openLb(Number(it.dataset.index), btn));
  });
  lb.addEventListener('click', (e) => { e.stopPropagation(); closeLb(); });
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLb(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'Tab') { e.preventDefault(); lbClose.focus(); }
  });
}
