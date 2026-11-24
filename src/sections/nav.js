// ============ NAV ============
// Fixed bar that adapts its colour to the section underneath, hides on scroll
// down / shows on scroll up, letter-roll links, full-screen overlay menu, and
// site-wide smooth anchor scrolling through Lenis.

const expoOut = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

function luminance(rgb) {
  const m = rgb.match(/[\d.]+/g);
  if (!m) return null;
  const [r, g, b, a = 1] = m.map(Number);
  if (a < 0.1) return null; // transparent
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function initNav(ctx) {
  const { gsap, ScrollTrigger, lenis, reducedMotion } = ctx;
  const nav = document.querySelector('[data-nav]');
  if (!nav) return;

  const bar = nav.querySelector('.nav__bar');
  const toggle = nav.querySelector('.nav__toggle');
  const toggleSr = nav.querySelector('.nav__toggle-sr');
  const overlay = nav.querySelector('.nav__overlay');
  const links = Array.from(nav.querySelectorAll('.nav__link'));

  // ---------- letter-roll links ----------
  nav.querySelectorAll('[data-roll]').forEach((a) => {
    const text = a.textContent.trim();
    a.setAttribute('aria-label', text);
    a.innerHTML = `<span class="nav__roll" aria-hidden="true">${[...text]
      .map((c, i) => `<span class="nav__char" style="--i:${i}">${c}</span>`).join('')}</span>`;
  });

  // ---------- section theme detection ----------
  let sections = [];
  const readThemes = () => {
    const els = Array.from(document.querySelectorAll('main > section, body > footer, main > footer'));
    sections = els.map((el) => {
      let theme = el.dataset.navTheme;
      if (!theme) {
        const lum = luminance(getComputedStyle(el).backgroundColor);
        if (lum === null) theme = el.classList.contains('section-dark') ? 'dark' : 'light';
        else theme = lum < 0.3 ? 'dark' : 'light';
      }
      return { el, theme, id: el.id };
    });
  };
  readThemes();
  ScrollTrigger.addEventListener('refresh', readThemes);

  let currentTheme = '';
  let currentActive = '';
  const updateTheme = () => {
    const probe = bar.offsetHeight / 2;
    const mid = window.innerHeight * 0.5;
    let theme = 'dark';
    let active = '';
    for (const s of sections) {
      const r = s.el.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) theme = s.theme;
      if (r.top <= mid && r.bottom > mid) active = s.id;
    }
    if (theme !== currentTheme) {
      currentTheme = theme;
      nav.classList.toggle('nav--light', theme === 'light');
      nav.classList.toggle('nav--accent', theme === 'accent');
    }
    if (active !== currentActive) {
      currentActive = active;
      links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === `#${active}`));
    }
  };

  // ---------- hide on scroll down / show on scroll up ----------
  let hidden = false;
  const onScroll = (l) => {
    const y = l?.scroll ?? window.scrollY;
    const dir = l?.direction ?? 0;
    nav.classList.toggle('is-scrolled', y > 40);
    if (dir === 1 && y > window.innerHeight * 0.35 && !hidden) { hidden = true; nav.classList.add('is-hidden'); }
    else if ((dir === -1 || y < 80) && hidden) { hidden = false; nav.classList.remove('is-hidden'); }
    updateTheme();
  };
  if (lenis) lenis.on('scroll', onScroll);
  else window.addEventListener('scroll', () => onScroll(), { passive: true });
  window.addEventListener('resize', updateTheme);
  updateTheme();

  // show the bar if keyboard focus lands in it while hidden
  bar.addEventListener('focusin', () => { hidden = false; nav.classList.remove('is-hidden'); });

  // ---------- overlay ----------
  const bigTexts = overlay.querySelectorAll('.nav__big-text');
  const bigNums = overlay.querySelectorAll('.nav__big-num');
  const items = overlay.querySelectorAll('.nav__big-item');
  const figure = overlay.querySelector('.nav__figure-clip');
  const figImg = overlay.querySelector('.nav__figure-img');
  const infoBlocks = overlay.querySelectorAll('.nav__info-block, .nav__figcap');

  const tl = gsap.timeline({
    paused: true,
    onReverseComplete: () => {
      overlay.classList.remove('is-animating');
      overlay.setAttribute('inert', '');
    },
  });
  if (reducedMotion) {
    tl.fromTo(overlay.querySelector('.nav__overlay-bg'), { clipPath: 'inset(0 0 0% 0)', opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none' })
      .from([...items, ...infoBlocks, figure],{ opacity: 0, duration: 0.3, ease: 'none' }, 0);
  } else {
    tl.fromTo(overlay.querySelector('.nav__overlay-bg'),
      { clipPath: 'inset(0% 0% 100% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'expo.inOut' })
      .fromTo(bigTexts, { yPercent: 115, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.06, ease: 'expo.out' }, 0.5)
      .fromTo(bigNums, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out' }, 0.65)
      .fromTo(items, { borderTopColor: 'rgba(243,235,221,0)' }, { borderTopColor: 'rgba(243,235,221,0.14)', duration: 0.8, stagger: 0.06, ease: 'none' }, 0.5)
      .fromTo(figure, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut' }, 0.45)
      .fromTo(figImg, { scale: 1.35 }, { scale: 1, duration: 1.6, ease: 'expo.out' }, 0.6)
      .fromTo(infoBlocks, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out' }, 0.8);
  }

  let isOpen = false;
  let lastFocus = null;
  const open = () => {
    if (isOpen) return;
    isOpen = true;
    lastFocus = document.activeElement;
    nav.classList.add('is-open');
    overlay.classList.add('is-animating');
    overlay.removeAttribute('inert');
    overlay.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    toggleSr.textContent = 'Close menu';
    lenis?.stop();
    tl.timeScale(1).play();
    setTimeout(() => overlay.querySelector('.nav__big-link')?.focus({ preventScroll: true }), reducedMotion ? 50 : 650);
  };
  const close = ({ restoreFocus = true } = {}) => {
    if (!isOpen) return;
    isOpen = false;
    nav.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggleSr.textContent = 'Open menu';
    lenis?.start();
    tl.timeScale(reducedMotion ? 1 : 1.8).reverse();
    if (restoreFocus && lastFocus) lastFocus.focus?.({ preventScroll: true });
  };
  toggle.addEventListener('click', () => (isOpen ? close() : open()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) close();
    // simple focus trap inside bar + overlay while open
    if (e.key === 'Tab' && isOpen) {
      const focusables = [toggle, ...overlay.querySelectorAll('a[href]')];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!nav.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  });

  // ---------- smooth anchor scrolling (site-wide) ----------
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-no-lenis') || e.defaultPrevented) return;
    const hash = a.getAttribute('href');
    if (hash.length < 2) { e.preventDefault(); return; }
    let target;
    try { target = document.querySelector(hash); } catch { return; }
    if (!target) return;
    e.preventDefault();
    const wasOpen = isOpen;
    if (wasOpen) close({ restoreFocus: false });
    const go = () => {
      if (lenis) {
        lenis.scrollTo(hash === '#hero' ? 0 : target, {
          duration: reducedMotion ? 0 : 1.6,
          immediate: reducedMotion,
          easing: expoOut,
          force: true,
        });
      } else {
        target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
      }
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    };
    if (wasOpen && !reducedMotion) setTimeout(go, 150); else go();
  });

  // ---------- intro ----------
  if (!reducedMotion) {
    const introEls = [nav.querySelector('.nav__logo'), ...links, ...nav.querySelectorAll('.nav__actions > *')];
    gsap.set(introEls, { yPercent: -160, opacity: 0 });
    const playIntro = () => {
      if (playIntro.done) return;
      playIntro.done = true;
      gsap.to(introEls, { yPercent: 0, opacity: 1, duration: 1.2, stagger: 0.05, delay: 0.55, ease: 'expo.out', clearProps: 'opacity' });
    };
    window.addEventListener('marlow:preloader-exit', playIntro, { once: true });
    ctx.onReady(playIntro);
  }
}
