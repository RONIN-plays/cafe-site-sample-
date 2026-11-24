// ============ MARQUEE ============
// Two infinite rows moving in opposite directions. Speed follows Lenis scroll
// velocity, direction flips with scroll direction, and the rows skew slightly.

export function initMarquee(ctx) {
  const { gsap, lenis, reducedMotion } = ctx;
  const section = document.querySelector('#marquee');
  if (!section || reducedMotion) return;

  const rows = Array.from(section.querySelectorAll('[data-marquee-row]')).map((row) => {
    const track = row.querySelector('.marquee__track');
    const group = track.querySelector('.marquee__group');
    return {
      row, track, group,
      dir: Number(row.dataset.direction) || -1,
      pos: 0,
      width: 0,
      setX: gsap.quickSetter(track, 'x', 'px'),
      setSkew: gsap.quickSetter(track, 'skewX', 'deg'),
    };
  });

  const build = () => {
    rows.forEach((r) => {
      r.track.querySelectorAll('[data-clone]').forEach((c) => c.remove());
      r.width = r.group.getBoundingClientRect().width;
      if (!r.width) return;
      const needed = Math.ceil((window.innerWidth * 1.2) / r.width) + 1;
      for (let i = 0; i < needed; i++) {
        const clone = r.group.cloneNode(true);
        clone.setAttribute('data-clone', '');
        r.track.appendChild(clone);
      }
      r.pos = gsap.utils.wrap(-r.width, 0, r.pos);
    });
  };
  build();
  // fonts are ready before init, but be safe once everything has loaded
  window.addEventListener('load', build, { once: true });
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 200); });

  // hover slows the band so it can be read
  let hoverTarget = 1;
  let hoverFactor = 1;
  section.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hoverTarget = 0.3; });
  section.addEventListener('pointerleave', () => { hoverTarget = 1; });

  let vel = 0;
  let skew = 0;
  let scrollDir = 1;
  let spin = 0;

  const tick = () => {
    const dt = Math.min(gsap.ticker.deltaRatio(60), 3) / 60;
    const rawV = lenis ? lenis.velocity || 0 : 0;
    if (lenis && lenis.direction) scrollDir = lenis.direction;
    vel += (rawV - vel) * 0.1;
    hoverFactor += (hoverTarget - hoverFactor) * 0.06;

    const base = Math.max(45, window.innerWidth * 0.045); // px per second
    const boost = 1 + Math.min(Math.abs(vel) * 0.16, 9);
    const speed = base * boost * hoverFactor;

    const targetSkew = gsap.utils.clamp(-9, 9, -vel * 0.22);
    skew += (targetSkew - skew) * 0.12;
    spin += speed * dt * 0.25 * scrollDir;

    rows.forEach((r) => {
      if (!r.width) return;
      r.pos += r.dir * scrollDir * speed * dt;
      r.setX(gsap.utils.wrap(-r.width, 0, r.pos));
      r.setSkew(skew * r.dir);
      r.track.style.setProperty('--spin', `${spin.toFixed(2)}deg`);
    });
  };

  let running = false;
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) { gsap.ticker.add(tick); running = true; }
    else if (!entry.isIntersecting && running) { gsap.ticker.remove(tick); running = false; }
  }, { rootMargin: '100px 0px' });
  io.observe(section);
}
