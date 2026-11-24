# Marlow — Coffee & Bakehouse · Build Brief

A demo website for a neighbourhood specialty-coffee house and bakehouse. It's a freelance portfolio piece, so it has to look **Awwwards-level**: editorial, warm, tactile and heavily animated, while staying fast and accessible.

## Brand
- **Name:** Marlow, Coffee & Bakehouse. Est. 2019. 14 Hollis Lane, Old Town. (fictional)
- **Voice:** warm, unhurried, a little poetic, never cheesy. Short sentences. "Slow coffee. Warm crumbs." "Roasted on Tuesdays. Poured every day."
- **Hours:** Mon–Fri 7:00–18:00 · Sat–Sun 8:00–17:00
- **Feel:** a sunlit room at 8am. Steam, crumbs, ceramic, wood, linen. Think Kinfolk magazine meets a modern Awwwards site.

## Art direction
- **Palette (CSS vars in `src/styles/base.css`):** `--espresso #1b120c`, `--roast #2a1c13`, `--mocha #4a3326`, `--crema #f3ebdd`, `--oat #e6d9c3`, `--milk #fbf7f0`, `--terracotta #c8562b` (accent), `--ember #e07a3f`, `--sage #8a9a7b` (rare).
  Sections alternate between dark (espresso) and light (crema) to give the scroll a rhythm.
- **Type:** Fraunces (display, variable: use `font-variation-settings` 'SOFT', 'WONK', 'opsz'; italics for emphasis words), Bricolage Grotesque (body), JetBrains Mono (labels, prices, eyebrows, numbers). Classes: `.display`, `.eyebrow`, `.btn`, `.btn--ghost`, `.container`, `.section-dark`, `.section-light`.
- **Big type:** headlines are huge (`--fs-mega`, `--fs-h1`, `--fs-h2`) with tight leading and italic accent words, e.g. "Slow *coffee*."
- **Do not use** Inter/Roboto/Arial, purple/blue gradients, generic card grids, emoji, or stock icon sets. Use thin rules (`--line-dark/light`), numbered labels (01 / 02), asymmetric layouts, overlapping images and generous whitespace.
- **Motion language:** soft, "pour-like" eases (`ease: 'marlow'` = expo-out-ish, already the GSAP default). Text reveals line by line from masks (SplitText `mask: 'lines'`), images reveal through clip-path / inset wipes plus inner scale-down parallax, and ScrollTrigger scrub for storytelling. Nothing bouncy or cartoonish.

## Architecture (vanilla JS + Vite + GSAP + Lenis + Three)
- `index.html` includes each section via `<!-- @include partials/NAME.html -->` (custom Vite plugin). **Don't edit index.html, main.js, base.css or vite.config.js.** Those belong to the lead. If you need a change there, say so in your report.
- Each section owns exactly three files: `partials/NAME.html`, `src/styles/NAME.css` and `src/sections/NAME.js`, which exports `initNAME(ctx)`.
- `ctx = { gsap, ScrollTrigger, SplitText, Flip, lenis, reducedMotion, isTouch, onReady(fn) }`. The plugins are already registered. `onReady(fn)` fires after the preloader finishes, so hero/intro timelines go there. Scroll-triggered stuff can be set up directly in init.
- Inits run in DOM order: nav, cursor, hero, marquee, story, process, menu, gallery, testimonials, visit, footer.
- Prefix all CSS classes with the section name (e.g. `.menu__item`) to avoid collisions. Root element: `<section id="NAME" class="NAME">`.
- Interactive elements that should grow the custom cursor get `data-cursor="hover"`. Elements that should show a label in the cursor get `data-cursor="view"` with `data-cursor-label="View"`. Magnetic elements get `data-magnetic`.
- **Reduced motion:** when `ctx.reducedMotion` is true, skip scrub/pin theatrics and show the content statically (or use simple fades). Use `gsap.matchMedia()` for desktop vs mobile (`(min-width: 900px)`). Pinned horizontal scroll must degrade to a vertical stack or native horizontal swipe on mobile.
- **Performance:** animate transforms/opacity/clip-path only, use `loading="lazy"` on below-the-fold images and set `width`/`height` attributes, and pause WebGL when off screen.
- Verify your work compiles with `npx vite build` (run it from the project root). Don't start a dev server on port 5173, because the lead uses it.

## Images (in `public/images/`, referenced as `/images/NAME.jpg`)
These are supplied by the asset agent. Use exactly these names:
- Hero: `hero-pour.jpg` (dark, moody espresso/latte-art pour, landscape), `hero-cup.jpg` (coffee cup on a dark surface)
- Story: `story-barista.jpg`, `story-interior.jpg`, `story-hands.jpg`
- Process: `process-beans.jpg`, `process-roast.jpg`, `process-grind.jpg`, `process-pour.jpg`
- Menu, coffee and tea: `menu-espresso.jpg`, `menu-flatwhite.jpg`, `menu-coldbrew.jpg`, `menu-matcha.jpg`, `menu-chai.jpg`
- Menu, bakery: `menu-croissant.jpg`, `menu-cinnamon.jpg`, `menu-sourdough.jpg`, `menu-cake.jpg`
- Menu, brunch: `menu-avotoast.jpg`, `menu-pancakes.jpg`, `menu-benedict.jpg`, `menu-granola.jpg`
- Gallery: `gallery-1.jpg` … `gallery-8.jpg` (mixed cafe moments and food, mostly portrait)
- Visit: `visit-interior.jpg`

## Page flow
1. **Preloader**: a cup filling up with a 0→100 counter, then a curtain wipe into the hero.
2. **Nav**: minimal fixed bar that hides on scroll down and shows on scroll up. Full-screen menu overlay with staggered big links, plus an "Order ahead" pill.
3. **Hero**: mega headline "Slow coffee. Warm crumbs." revealed line by line, a WebGL **steam** shader rising over the hero image, scroll parallax, and a magnetic CTA.
4. **Marquee**: velocity-reactive infinite ticker ("Roasted on Tuesdays ✺ Poured every day ✺ …").
5. **Story**: pinned manifesto. Words fill from faint to full colour as you scroll, and images reveal through clip-path.
6. **Process**: "From bean to cup". Pinned horizontal scroll across 4 steps (Source → Roast → Grind → Pour) with big numbers and parallax images.
7. **Menu**: tabbed (Coffee / Tea & More / Bakery / Brunch). An editorial price list with a hover image that follows the cursor, and Flip transitions between tabs.
8. **Gallery**: "Made this morning". A scroll-skewed or velocity-driven image gallery with dish captions.
9. **Testimonials**: big rotating quotes from locals/press (fictional, no faces).
10. **Visit**: address, hours (with a live "Open now / Closed" badge), a stylised map and a reservation form.
11. **Footer**: giant "MARLOW" wordmark that reveals letter by letter, plus newsletter, socials and credits.
