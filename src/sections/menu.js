// ============ MENU — tabs (Flip pill), staggered panel swap, cursor-follow image ============

export function initMenu(ctx) {
  const { gsap, ScrollTrigger, SplitText, Flip, reducedMotion, lenis } = ctx;
  const root = document.querySelector('#menu');
  if (!root) return;

  const tabs = [...root.querySelectorAll('.menu__tab')];
  const panels = [...root.querySelectorAll('.menu__panel')];
  const panelsWrap = root.querySelector('.menu__panels');
  const pill = root.querySelector('.menu__pill');
  const title = root.querySelector('.menu__title');
  let current = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
  let introDone = reducedMotion;

  const partsOf = (panel) => ({
    inners: panel.querySelectorAll('.menu__row-inner'),
    rules: panel.querySelectorAll('.menu__rule'),
    aside: panel.querySelectorAll('.menu__aside-inner > *'),
  });

  /* ---------------- headline + intro reveal ---------------- */
  if (!reducedMotion) {
    SplitText.create(title, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 110,
          duration: 1.4,
          stagger: 0.12,
          scrollTrigger: { trigger: title, start: 'top 85%', toggleActions: 'play none none none' },
        });
      },
    });

    gsap.from(root.querySelectorAll('.menu__eyebrow, .menu__intro, .menu__bar'), {
      y: 24,
      opacity: 0,
      duration: 1.1,
      stagger: 0.1,
      scrollTrigger: { trigger: root.querySelector('.menu__head'), start: 'top 80%', once: true },
    });

    // first panel: rules draw in, rows rise out of their masks
    const first = partsOf(panels[current]);
    gsap.set(first.rules, { scaleX: 0 });
    gsap.set(first.inners, { yPercent: 100, opacity: 0 });
    gsap.set(first.aside, { y: 30, opacity: 0 });
    const introTl = gsap.timeline({
      paused: true,
      onComplete: () => { introDone = true; },
    });
    introTl
      .to(first.rules, { scaleX: 1, duration: 1.4, stagger: 0.07, ease: 'power3.inOut' }, 0)
      .to(first.inners, { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.07 }, 0.15)
      .to(first.aside, { y: 0, opacity: 1, duration: 1.1, stagger: 0.08 }, 0.1);
    ScrollTrigger.create({
      trigger: panelsWrap,
      start: 'top 82%',
      once: true,
      onEnter: () => introTl.play(),
    });
    // if the user switches tabs before the intro has played, finish it instantly
    root._menuIntro = introTl;
  }

  /* ---------------- tabs ---------------- */
  let switchTl = null;

  function movePill(tab, instant) {
    if (!pill) return;
    if (instant || reducedMotion) { tab.appendChild(pill); return; }
    const state = Flip.getState(pill);
    tab.appendChild(pill);
    Flip.from(state, { duration: 0.75, ease: 'marlow', absolute: false });
  }

  function select(index, { focus = false } = {}) {
    if (index === current) return;
    const prevPanel = panels[current];
    const nextPanel = panels[index];
    const prevIndex = current;
    current = index;

    tabs.forEach((t, i) => {
      const on = i === index;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    if (focus) tabs[index].focus({ preventScroll: true });
    // keep the active tab visible inside the (mobile) scrollable tablist, without touching page scroll
    const list = tabs[index].parentElement;
    if (list.scrollWidth > list.clientWidth) {
      const lr = list.getBoundingClientRect();
      const tr = tabs[index].getBoundingClientRect();
      list.scrollTo({
        left: list.scrollLeft + (tr.left - lr.left) - (lr.width - tr.width) / 2,
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
    }
    movePill(tabs[index]);
    hideFloat(true);

    // finish anything mid-flight so states are clean
    if (root._menuIntro && !introDone) { root._menuIntro.progress(1); introDone = true; }
    if (switchTl) switchTl.progress(1).kill();

    if (reducedMotion) {
      prevPanel.hidden = true;
      nextPanel.hidden = false;
      ScrollTrigger.refresh();
      return;
    }

    const prev = partsOf(prevPanel);
    const next = partsOf(nextPanel);
    const dir = index > prevIndex ? 1 : -1;
    let h0 = 0;

    switchTl = gsap.timeline({
      onComplete: () => {
        gsap.set(panelsWrap, { clearProps: 'height' });
        panelsWrap.classList.remove('is-animating');
        gsap.set([...prev.inners, ...prev.rules, ...prev.aside], { clearProps: 'all' });
        switchTl = null;
        ScrollTrigger.refresh();
      },
    });

    switchTl
      .call(() => {
        h0 = panelsWrap.offsetHeight;
        gsap.set(panelsWrap, { height: h0 });
        panelsWrap.classList.add('is-animating');
      })
      // out: rows slip up and out of their masks, rules retract
      .to(prev.inners, { yPercent: -100 * dir, opacity: 0, duration: 0.45, stagger: 0.035, ease: 'power3.in' }, 0)
      .to(prev.aside, { y: -20, opacity: 0, duration: 0.4, stagger: 0.04, ease: 'power3.in' }, 0)
      .to(prev.rules, { scaleX: 0, transformOrigin: 'right center', duration: 0.5, stagger: 0.03, ease: 'power3.in' }, 0)
      // swap
      .call(() => {
        prevPanel.hidden = true;
        nextPanel.hidden = false;
        gsap.set(next.inners, { yPercent: 100 * dir, opacity: 0 });
        gsap.set(next.rules, { scaleX: 0, transformOrigin: 'left center' });
        gsap.set(next.aside, { y: 30, opacity: 0 });
      })
      // height eases to the new panel while rows rise in
      .to(panelsWrap, {
        height: () => {
          panelsWrap.style.height = 'auto';
          const h1 = panelsWrap.offsetHeight;
          panelsWrap.style.height = `${h0}px`;
          return h1;
        },
        duration: 0.9,
        ease: 'power3.inOut',
      }, '>')
      .to(next.rules, { scaleX: 1, duration: 1.1, stagger: 0.05, ease: 'power3.inOut' }, '<')
      .to(next.inners, { yPercent: 0, opacity: 1, duration: 0.95, stagger: 0.055 }, '<0.1')
      .to(next.aside, { y: 0, opacity: 1, duration: 0.95, stagger: 0.06 }, '<');
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (e) => {
      let n = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n === null) return;
      e.preventDefault();
      select(n, { focus: true });
    });
  });

  /* ---------------- floating image card (fine pointers only) ---------------- */
  const float = root.querySelector('.menu__float');
  const floatInner = root.querySelector('.menu__float-inner');
  const floatMedia = root.querySelector('.menu__float-media');
  const floatCap = root.querySelector('.menu__float-cap');
  const imgCache = new Map();
  let floatOn = false;
  let activeRow = null;
  let activeSrc = '';
  let z = 1;
  let hideFloat = () => {};

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (float && finePointer.matches && !ctx.isTouch) {
    // move the card to <body> so no ancestor transform can break position:fixed
    document.body.appendChild(float);
    float.classList.add('is-ready');

    const xTo = gsap.quickTo(float, 'x', { duration: reducedMotion ? 0.01 : 0.65, ease: 'power3' });
    const yTo = gsap.quickTo(float, 'y', { duration: reducedMotion ? 0.01 : 0.65, ease: 'power3' });
    const rotTo = gsap.quickTo(floatInner, 'rotation', { duration: 0.6, ease: 'power3' });
    let mx = 0, my = 0, lastX = 0, vel = 0;

    const tick = () => {
      // rotation follows horizontal velocity, then settles back to upright
      vel *= 0.86;
      rotTo(gsap.utils.clamp(-14, 14, vel * 0.55));
    };

    const getImg = (src) => {
      let img = imgCache.get(src);
      if (!img) {
        img = new Image();
        img.decoding = 'async';
        img.alt = '';
        img.width = 560;
        img.height = 700;
        img.src = src;
        floatMedia.appendChild(img);
        imgCache.set(src, img);
      }
      return img;
    };

    const rowsAll = [...root.querySelectorAll('.menu__row')];
    const showRow = (row) => {
      if (row === activeRow) return;
      const prevIdx = activeRow ? rowsAll.indexOf(activeRow) : -1;
      activeRow = row;
      floatCap.textContent = row.dataset.name || '';
      const src = row.dataset.img;
      if (src === activeSrc) return;
      activeSrc = src;
      const img = getImg(src);
      img.style.zIndex = ++z;
      if (reducedMotion) { gsap.set(img, { opacity: 1, clipPath: 'none' }); return; }
      const down = rowsAll.indexOf(row) >= prevIdx;
      gsap.killTweensOf(img);
      gsap.fromTo(img,
        { clipPath: down ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)', scale: 1.25, yPercent: down ? 8 : -8 },
        { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, yPercent: 0, duration: 0.8, ease: 'marlow' });
    };

    const showFloat = (e) => {
      if (floatOn) return;
      floatOn = true;
      if (e) { gsap.set(float, { x: e.clientX, y: e.clientY }); xTo(e.clientX); yTo(e.clientY); }
      lastX = e ? e.clientX : lastX;
      gsap.ticker.add(tick);
      gsap.to(floatInner, { opacity: 1, scale: 1, duration: reducedMotion ? 0.2 : 0.6, ease: 'marlow', overwrite: 'auto' });
    };
    hideFloat = (immediate) => {
      if (!floatOn) return;
      floatOn = false;
      activeRow = null;
      gsap.ticker.remove(tick);
      gsap.to(floatInner, { opacity: 0, scale: 0.7, rotation: 0, duration: immediate ? 0.2 : 0.4, ease: 'power3.out', overwrite: 'auto' });
    };

    panelsWrap.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      vel += mx - lastX;
      lastX = mx;
      xTo(mx); yTo(my);
      const row = e.target.closest('.menu__row');
      if (row && !(switchTl && switchTl.isActive())) { showFloat(e); showRow(row); }
      else if (!row) hideFloat();
    });
    panelsWrap.addEventListener('pointerleave', () => hideFloat());

    // scrolling under a stationary cursor: re-hit-test so the card tracks the row beneath
    let raf = 0;
    const onScroll = () => {
      if (!floatOn || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = document.elementFromPoint(mx, my);
        const row = el && el.closest('#menu .menu__row');
        if (row) showRow(row); else hideFloat();
      });
    };
    if (lenis) lenis.on('scroll', onScroll); else window.addEventListener('scroll', onScroll, { passive: true });
  }
}
