// ============ PROCESS — pinned horizontal "bean to cup" (owned by process agent) ============

const DESKTOP = '(min-width: 900px) and (hover: hover) and (pointer: fine)';
const STACKED = '(max-width: 899.98px), (hover: none), (pointer: coarse)';

export function initProcess(ctx) {
  const { gsap, ScrollTrigger, SplitText, reducedMotion } = ctx;
  const root = document.querySelector('#process');
  if (!root) return;

  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];

  const pin = q('.process__pin');
  const track = q('.process__track');
  const intro = q('.process__intro');
  const headline = q('.process__headline');
  const steps = qa('.process__step');
  const roll = q('.process__count-roll');
  const nameEl = q('.process__count-name');
  const barFill = q('.process__bar-fill');
  const bean = q('.process__bean');

  // ---------- reduced motion: stacked layout, simple fades ----------
  if (reducedMotion) {
    const fadeTargets = [intro, ...steps];
    gsap.set(fadeTargets, { autoAlpha: 0 });
    ScrollTrigger.batch(fadeTargets, {
      start: 'top 90%',
      once: true,
      onEnter: (els) => gsap.to(els, { autoAlpha: 1, duration: 0.8, ease: 'power1.out', stagger: 0.08 }),
    });
    return;
  }

  // ---------- headline: masked line reveal (all breakpoints) ----------
  SplitText.create(headline, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'process-line',
    autoSplit: true,
    onSplit: (self) =>
      gsap.from(self.lines, {
        yPercent: 110,
        duration: 1.3,
        stagger: 0.1,
        scrollTrigger: { trigger: root, start: 'top 65%', once: true },
      }),
  });
  gsap.from([q('.process__eyebrow'), q('.process__lead'), q('.process__hint')], {
    y: 24,
    autoAlpha: 0,
    duration: 1.1,
    stagger: 0.1,
    delay: 0.25,
    scrollTrigger: { trigger: root, start: 'top 65%', once: true },
  });

  // HUD step indicator
  let current = 0;
  let rollTl;
  const setStep = (i) => {
    if (i === current) return;
    const dir = i > current ? 1 : -1;
    current = i;
    if (rollTl) rollTl.kill();
    rollTl = gsap.timeline()
      .to(roll, { yPercent: -110 * dir, duration: 0.25, ease: 'power2.in' })
      .add(() => {
        roll.textContent = String(i + 1).padStart(2, '0');
        nameEl.textContent = steps[i].dataset.name || '';
      })
      .fromTo(roll, { yPercent: 110 * dir }, { yPercent: 0, duration: 0.5, ease: 'marlow' });
  };

  const mm = gsap.matchMedia();

  // ---------- desktop: pinned horizontal scroll ----------
  mm.add(DESKTOP, () => {
    root.classList.add('is-horizontal');

    const getDistance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const spinBean = gsap.quickSetter(bean, 'rotation', 'deg');
    const setFill = gsap.quickSetter(barFill, 'scaleX');

    const scrollTween = gsap.to(track, {
      x: () => -getDistance(),
      ease: 'none', // required for containerAnimation mapping
      onUpdate() {
        const p = this.progress();
        setFill(p);
        spinBean(p * 540);
      },
      scrollTrigger: {
        trigger: pin,
        pin: true,
        start: 'top top',
        end: () => '+=' + getDistance(),
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    steps.forEach((step, i) => {
      const frame = step.querySelector('.process__frame');
      const img = frame.querySelector('img');
      const num = step.querySelector('.process__num');
      const title = step.querySelector('.process__title-inner');
      const rest = [step.querySelector('.process__desc'), step.querySelector('.process__detail')];

      // image drifts inside its frame as the panel crosses the viewport
      gsap.fromTo(
        img,
        { xPercent: -9 },
        {
          xPercent: 9,
          ease: 'none',
          scrollTrigger: {
            trigger: frame,
            containerAnimation: scrollTween,
            start: 'left right',
            end: 'right left',
            scrub: true,
          },
        }
      );

      // panel entrance
      // the first panel is already on screen when the pin starts, so it keys off vertical scroll
      gsap.timeline({
        scrollTrigger: i === 0
          ? { trigger: pin, start: 'top 45%', toggleActions: 'play none none reverse' }
          : {
              trigger: step,
              containerAnimation: scrollTween,
              start: 'left 78%',
              toggleActions: 'play none none reverse',
            },
      })
        .fromTo(frame, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' })
        .from(num, { xPercent: 35, autoAlpha: 0, duration: 1.6 }, 0.2)
        .from(title, { yPercent: 110, duration: 1.2 }, 0.45)
        .from(rest, { y: 30, autoAlpha: 0, duration: 1.1, stagger: 0.1 }, 0.6);

      // HUD counter: the panel nearest the centre wins
      ScrollTrigger.create({
        trigger: step,
        containerAnimation: scrollTween,
        start: 'left 55%',
        end: 'right 55%',
        onToggle: (self) => { if (self.isActive) setStep(i); },
      });
    });

    // HUD fades in only once the track starts moving
    gsap.fromTo(q('.process__hud'), { autoAlpha: 0, y: 12 }, {
      autoAlpha: 1, y: 0, duration: 0.8,
      scrollTrigger: { trigger: pin, start: 'top 20%', toggleActions: 'play none none reverse' },
    });

    return () => {
      root.classList.remove('is-horizontal');
      current = 0;
      roll.textContent = '01';
      nameEl.textContent = steps[0].dataset.name || '';
    };
  });

  // ---------- mobile / touch: vertical stack, simple reveals ----------
  mm.add(STACKED, () => {
    steps.forEach((step) => {
      const frame = step.querySelector('.process__frame');
      const img = frame.querySelector('img');
      const num = step.querySelector('.process__num');
      const title = step.querySelector('.process__title-inner');
      const rest = [step.querySelector('.process__desc'), step.querySelector('.process__detail')];

      gsap.timeline({ scrollTrigger: { trigger: step, start: 'top 80%', once: true } })
        .fromTo(frame, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut' })
        .fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.8 }, 0)
        .from(num, { y: 40, autoAlpha: 0, duration: 1.2 }, 0.4)
        .from(title, { yPercent: 110, duration: 1.1 }, 0.5)
        .from(rest, { y: 24, autoAlpha: 0, duration: 1, stagger: 0.1 }, 0.6);
    });
  });
}
