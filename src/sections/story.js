// ============ STORY — pinned manifesto + image composition (owned by story agent) ============

const REVEAL_FROM = {
  up: 'inset(100% 0% 0% 0%)',
  down: 'inset(0% 0% 100% 0%)',
  left: 'inset(0% 0% 0% 100%)',
  right: 'inset(0% 100% 0% 0%)',
};
const SHOWN = 'inset(0% 0% 0% 0%)';

export function initStory(ctx) {
  const { gsap, ScrollTrigger, SplitText, reducedMotion } = ctx;
  const root = document.querySelector('#story');
  if (!root) return;

  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];

  const stage = q('.story__stage');
  const manifesto = q('.story__manifesto');
  const meterFill = q('.story__meter-fill');
  const gallery = q('.story__gallery');
  const media = qa('.story__media');
  const stats = qa('.story__stat');
  const counters = qa('[data-count]');
  const stamp = q('.story__stamp');
  const stampRing = q('.story__stamp-ring');

  // ---------- reduced motion: static layout, gentle fades only ----------
  if (reducedMotion) {
    root.classList.add('is-static');
    const fadeTargets = [stage, ...media, q('.story__note'), ...stats].filter(Boolean);
    gsap.set(fadeTargets, { autoAlpha: 0 });
    ScrollTrigger.batch(fadeTargets, {
      start: 'top 90%',
      once: true,
      onEnter: (els) => gsap.to(els, { autoAlpha: 1, duration: 0.8, ease: 'power1.out', stagger: 0.08 }),
    });
    return;
  }

  const mm = gsap.matchMedia();

  mm.add(
    { isDesktop: '(min-width: 900px)', isMobile: '(max-width: 899.98px)' },
    (c) => {
      const { isDesktop } = c.conditions;

      // ---- 1. manifesto: words fill faint -> ink, chips scale in at their place in the sentence ----
      const split = SplitText.create(manifesto, {
        type: 'words',
        wordsClass: 'story__word',
        tag: 'span',
        ignore: '.story__chip',
      });
      const sequence = [...manifesto.querySelectorAll('.story__word, .story__chip')];
      const chips = sequence.filter((el) => el.classList.contains('story__chip'));

      gsap.set(split.words, { opacity: 0.15 });
      gsap.set(chips, { scale: 0, opacity: 0 });
      gsap.set(chips.map((ch) => ch.querySelector('img')), { scale: 1.7 });

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: isDesktop
          ? {
              trigger: stage,
              start: 'top top',
              end: () => '+=' + Math.round(window.innerHeight * 1.5),
              pin: true,
              scrub: 0.6,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            }
          : {
              trigger: manifesto,
              start: 'top 85%',
              end: 'bottom 45%',
              scrub: 0.6,
            },
      });

      const STEP = 0.1;
      sequence.forEach((el, i) => {
        const at = i * STEP;
        if (el.classList.contains('story__chip')) {
          tl.to(el, { scale: 1, opacity: 1, duration: 0.6, ease: 'power3.out' }, at);
          tl.to(el.querySelector('img'), { scale: 1, duration: 0.9, ease: 'power2.out' }, at);
        } else {
          tl.to(el, { opacity: 1, duration: 0.35 }, at);
        }
      });
      // hold the finished sentence for a beat before the pin releases
      tl.to({}, { duration: 0.8 });
      tl.fromTo(meterFill, { scaleX: 0 }, { scaleX: 1, duration: tl.duration(), ease: 'none' }, 0);

      // ---- 2. images: clip-path wipe + inner scale-down, then differing parallax ----
      media.forEach((m) => {
        const fig = m.querySelector('.story__fig');
        const img = m.querySelector('img');
        const cap = m.querySelector('.story__cap');
        const from = REVEAL_FROM[fig.dataset.reveal] || REVEAL_FROM.up;

        const reveal = gsap.timeline({
          scrollTrigger: { trigger: m, start: 'top 88%', toggleActions: 'play none none none' },
        });
        reveal
          .fromTo(fig, { clipPath: from }, { clipPath: SHOWN, duration: 1.5, ease: 'expo.inOut' })
          .fromTo(img, { scale: 1.3 }, { scale: 1, duration: 2.2, ease: 'marlow' }, 0);
        if (cap) reveal.from(cap, { y: 14, autoAlpha: 0, duration: 0.9 }, 0.9);

        const speed = parseFloat(m.dataset.speed || '0');
        if (speed) {
          const amp = isDesktop ? 140 : 50;
          gsap.fromTo(
            m,
            { y: () => speed * amp },
            {
              y: () => -speed * amp,
              ease: 'none',
              scrollTrigger: {
                trigger: gallery,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
                invalidateOnRefresh: true,
              },
            }
          );
        }
      });

      // ---- 3. stamp: scroll-linked spin on the wrapper (the ring also idles, below) ----
      gsap.fromTo(
        stamp,
        { rotation: -60 },
        {
          rotation: 120,
          ease: 'none',
          scrollTrigger: { trigger: gallery, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
        }
      );

      return () => split.revert();
    }
  );

  // ---------- elements that behave the same at every breakpoint ----------

  // stamp entrance + slow idle rotation of the circular text
  gsap.from(stamp, {
    scale: 0.6,
    autoAlpha: 0,
    duration: 1.4,
    scrollTrigger: { trigger: stamp, start: 'top 90%', toggleActions: 'play none none none' },
  });
  const idle = gsap.to(stampRing, { rotation: 360, svgOrigin: '100 100', duration: 28, ease: 'none', repeat: -1, paused: true });
  ScrollTrigger.create({
    trigger: stamp,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => (self.isActive ? idle.play() : idle.pause()),
  });

  // note paragraph
  const note = q('.story__note');
  if (note) {
    gsap.from(note, {
      y: 30,
      autoAlpha: 0,
      duration: 1.2,
      scrollTrigger: { trigger: note, start: 'top 90%', toggleActions: 'play none none none' },
    });
  }

  // stats: rows rise in, numbers count up once
  gsap.from(stats, {
    y: 40,
    autoAlpha: 0,
    duration: 1.2,
    stagger: 0.12,
    scrollTrigger: { trigger: q('.story__stats'), start: 'top 85%', toggleActions: 'play none none none' },
  });
  counters.forEach((el) => {
    const end = parseInt(el.dataset.count, 10) || 0;
    const counter = { v: 0 };
    el.textContent = '0';
    gsap.to(counter, {
      v: end,
      duration: 2.2,
      ease: 'power3.out',
      delay: 0.15,
      onUpdate: () => { el.textContent = String(Math.round(counter.v)); },
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
}
