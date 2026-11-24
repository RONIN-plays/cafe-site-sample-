// ============ MARLOW — bootstrap (owned by lead) ============
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import { CustomEase } from 'gsap/CustomEase';
import Lenis from 'lenis';

// Section styles (each owned by its section agent)
import './styles/preloader.css';
import './styles/nav.css';
import './styles/hero.css';
import './styles/marquee.css';
import './styles/story.css';
import './styles/process.css';
import './styles/menu.css';
import './styles/gallery.css';
import './styles/testimonials.css';
import './styles/visit.css';
import './styles/footer.css';

import { initPreloader } from './sections/preloader.js';
import { initNav } from './sections/nav.js';
import { initCursor } from './sections/cursor.js';
import { initHero } from './sections/hero.js';
import { initMarquee } from './sections/marquee.js';
import { initStory } from './sections/story.js';
import { initProcess } from './sections/process.js';
import { initMenu } from './sections/menu.js';
import { initGallery } from './sections/gallery.js';
import { initTestimonials } from './sections/testimonials.js';
import { initVisit } from './sections/visit.js';
import { initFooter } from './sections/footer.js';

gsap.registerPlugin(ScrollTrigger, SplitText, Flip, CustomEase);
CustomEase.create('marlow', '0.22, 1, 0.36, 1');
gsap.defaults({ ease: 'marlow', duration: 1 });

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

// Lenis smooth scroll synced to the GSAP ticker
const lenis = new Lenis({ lerp: reducedMotion ? 1 : 0.09, smoothWheel: !reducedMotion });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
window.__lenis = lenis;

/**
 * Shared context passed to every section init.
 * - onReady(fn): fn runs once the preloader has finished (use for intro animations).
 */
const readyCallbacks = [];
const ctx = {
  gsap, ScrollTrigger, SplitText, Flip, lenis,
  reducedMotion, isTouch,
  onReady: (fn) => readyCallbacks.push(fn),
};

async function boot() {
  await document.fonts.ready;
  // init in DOM order so pinned triggers calculate correctly
  const inits = [initNav, initCursor, initHero, initMarquee, initStory, initProcess,
    initMenu, initGallery, initTestimonials, initVisit, initFooter];
  for (const init of inits) {
    try { init(ctx); } catch (e) { console.error(`[marlow] ${init.name} failed`, e); }
  }
  lenis.stop();
  try { await initPreloader(ctx); } catch (e) { console.error('[marlow] preloader failed', e); }
  lenis.start();
  document.body.classList.remove('is-loading');
  readyCallbacks.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  ScrollTrigger.refresh();
}

window.addEventListener('load', () => ScrollTrigger.refresh());
boot();
