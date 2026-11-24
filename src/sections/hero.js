// ============ HERO ============
// Full-bleed pour photo + WebGL steam (three.js fullscreen shader), masked
// line-by-line headline reveal, clip-revealed inset photo and scroll drift.

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec2 uMouse;
  uniform float uMouseStrength;
  uniform float uIntensity;
  uniform vec2 uOrigin;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < OCTAVES; i++) {
      v += a * noise(p);
      p = m * p;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float aspect = uRes.x / uRes.y;
    vec2 p = vec2((vUv.x - uOrigin.x) * aspect, vUv.y - uOrigin.y);
    float t = uTime;

    // pointer gently parts the steam
    vec2 m = vec2((uMouse.x - uOrigin.x) * aspect, uMouse.y - uOrigin.y);
    vec2 dm = p - m;
    float mInf = exp(-dot(dm, dm) * 7.0) * uMouseStrength;
    p += normalize(dm + 1e-4) * mInf * 0.11;

    float h = max(p.y, 0.0);

    // the plume leans and meanders as it rises
    float sway = sin(h * 2.6 - t * 0.35) * 0.075 * h
               + sin(h * 5.3 - t * 0.62) * 0.025 * h
               + (uMouse.x - 0.5) * 0.14 * h * uMouseStrength;
    float x = p.x - sway;

    // rising, domain-warped noise, stretched vertically for curling wisps
    vec2 q = vec2(x * 2.4, h * 1.2 - t * 0.22);
    vec2 w = vec2(fbm(q * 1.3 + vec2(0.0, -t * 0.08)),
                  fbm(q * 1.3 + vec2(4.7, 2.1) + t * 0.05));
    float n = fbm(q * 1.8 + w * 1.9 + vec2(0.0, -t * 0.15));

    // envelope: thin at the cup, wide and faint near the top
    float width = mix(0.045, 0.45, smoothstep(0.0, 0.85, h));
    float env = exp(-(x * x) / (width * width));
    float rise = smoothstep(0.0, 0.12, h) * (1.0 - smoothstep(0.38, 0.98, h));

    float wisps = smoothstep(0.42, 0.8, n);
    wisps *= wisps;
    float ridge = 1.0 - abs(n * 2.0 - 1.0);
    ridge = pow(ridge, 7.0) * 0.55;

    float a = (wisps * 1.05 + ridge * 0.6 + 0.06) * env * rise;
    a = clamp(a * uIntensity, 0.0, 0.6);
    vec3 col = mix(vec3(0.95, 0.86, 0.75), vec3(1.0, 0.98, 0.95), wisps);
    gl_FragColor = vec4(col * a, a);
  }
`;

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

async function createSteam(hero, canvas, gsap, isMobile) {
  const {
    WebGLRenderer, Scene, OrthographicCamera, PlaneGeometry, Mesh, ShaderMaterial, Vector2, NoBlending,
  } = await import('three');

  const renderer = new WebGLRenderer({
    canvas, alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power',
  });
  renderer.setClearColor(0x000000, 0);
  // steam is soft: render below native res (DPR capped at 1.5)
  const scale = isMobile ? 0.5 : 0.75;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5) * scale);

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new Vector2(1, 1) },
    uMouse: { value: new Vector2(0.5, 0.2) },
    uMouseStrength: { value: 0 },
    uIntensity: { value: 0 },
    uOrigin: { value: new Vector2(0.5, isMobile ? 0.26 : 0.08) },
  };
  const material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    defines: { OCTAVES: isMobile ? 3 : 5 },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: NoBlending,
  });
  const geometry = new PlaneGeometry(2, 2);
  scene.add(new Mesh(geometry, material));

  const resize = () => {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
  };
  resize();
  window.addEventListener('resize', resize);

  // pointer (smoothed)
  const target = { x: 0.5, y: 0.2, s: 0 };
  if (!isMobile) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width;
      target.y = 1 - (e.clientY - r.top) / r.height;
      target.s = 1;
    });
    hero.addEventListener('pointerleave', () => { target.s = 0; });
  }

  let time = Math.random() * 50;
  const tick = () => {
    const dt = Math.min(gsap.ticker.deltaRatio(60), 3) / 60;
    time += dt;
    uniforms.uTime.value = time;
    const mu = uniforms.uMouse.value;
    mu.x += (target.x - mu.x) * 0.05;
    mu.y += (target.y - mu.y) * 0.05;
    uniforms.uMouseStrength.value += (target.s - uniforms.uMouseStrength.value) * 0.04;
    renderer.render(scene, camera);
  };

  let running = false;
  let inView = true;
  const sync = () => {
    const should = inView && !document.hidden;
    if (should && !running) { gsap.ticker.add(tick); running = true; }
    else if (!should && running) { gsap.ticker.remove(tick); running = false; }
  };
  const io = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }, { threshold: 0 });
  io.observe(hero);
  document.addEventListener('visibilitychange', sync);
  sync();

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    gsap.ticker.remove(tick);
    running = false;
    io.disconnect();
    hero.classList.add('hero--no-webgl');
  });

  return { uniforms };
}

export function initHero(ctx) {
  const { gsap, SplitText, reducedMotion } = ctx;
  const hero = document.querySelector('#hero');
  if (!hero) return;

  const q = (s) => hero.querySelector(s);
  const qa = (s) => Array.from(hero.querySelectorAll(s));
  const imgWrap = q('.hero__img-wrap');
  const img = q('.hero__img');
  const canvas = q('.hero__steam');
  const title = q('.hero__title');
  const eyebrow = q('.hero__eyebrow-inner');
  const lead = q('.hero__lead');
  const ctaWraps = qa('.hero__cta-wrap');
  const hoursRows = qa('.hero__hours-row');
  const foot = q('.hero__foot');
  const badge = q('.hero__badge');
  const inset = q('.hero__inset');
  const insetClip = q('.hero__inset-clip');
  const insetImg = q('.hero__inset-img');
  const insetCap = q('.hero__inset-cap');
  const isMobile = window.matchMedia('(max-width: 899px)').matches;

  // ---------- steam ----------
  let steam = null;
  const steamFallback = reducedMotion || !webglAvailable() || (navigator.hardwareConcurrency || 4) <= 2;
  const steamReady = steamFallback
    ? Promise.resolve(null)
    : createSteam(hero, canvas, gsap, isMobile).then((s) => { steam = s; return s; }).catch((e) => {
      console.warn('[marlow] steam fallback', e);
      return null;
    });
  steamReady.then((s) => { if (!s) hero.classList.add('hero--no-webgl'); });

  // ---------- reduced motion: static with a gentle fade ----------
  if (reducedMotion) {
    const content = q('.hero__content');
    gsap.set(content, { opacity: 0 });
    ctx.onReady(() => gsap.to(content, { opacity: 1, duration: 0.8, ease: 'power1.out' }));
    return;
  }

  // ---------- intro (prepared now, played when the curtain opens) ----------
  const titleSplit = SplitText.create(qa('.hero__line'), { type: 'lines', mask: 'lines', linesClass: 'hero__split-line' });
  const leadSplit = SplitText.create(lead, { type: 'lines', mask: 'lines' });

  gsap.set(titleSplit.lines, { yPercent: 115, rotate: 2.5, transformOrigin: '0% 100%' });
  gsap.set(leadSplit.lines, { yPercent: 105 });
  gsap.set(eyebrow, { yPercent: 110 });
  gsap.set(ctaWraps, { y: 30, opacity: 0 });
  gsap.set(hoursRows, { y: 14, opacity: 0 });
  gsap.set(badge, { scale: 0.5, rotate: -120, opacity: 0 });
  gsap.set(insetClip, { clipPath: 'inset(100% 0% 0% 0%)' });
  gsap.set(insetImg, { scale: 1.45 });
  gsap.set(insetCap, { opacity: 0, y: 10 });
  gsap.set(img, { scale: 1.28, transformOrigin: '50% 60%' });

  const playIntro = () => {
    if (playIntro.done) return;
    playIntro.done = true;
    const tl = gsap.timeline({
      delay: 0.15,
      onComplete: () => {
        // restore the real text so line breaks stay correct on resize
        titleSplit.revert();
        leadSplit.revert();
      },
    });
    tl.to(img, { scale: 1, duration: 2.6, ease: 'expo.out' }, 0)
      .to(eyebrow, { yPercent: 0, duration: 1.1 }, 0.35)
      .to(titleSplit.lines, { yPercent: 0, rotate: 0, duration: 1.5, stagger: 0.14, ease: 'expo.out' }, 0.4)
      .to(leadSplit.lines, { yPercent: 0, duration: 1.2, stagger: 0.07 }, 0.85)
      .to(ctaWraps, { y: 0, opacity: 1, duration: 1.1, stagger: 0.08 }, 0.95)
      .to(insetClip, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' }, 0.6)
      .to(insetImg, { scale: 1, duration: 2, ease: 'expo.out' }, 0.8)
      .to(insetCap, { opacity: 1, y: 0, duration: 0.9 }, 1.4)
      .to(hoursRows, { y: 0, opacity: 1, duration: 0.9, stagger: 0.07 }, 1.1)
      .to(badge, { scale: 1, rotate: 0, opacity: 1, duration: 1.6, ease: 'expo.out' }, 1.15);
    steamReady.then((s) => {
      if (s) gsap.to(s.uniforms.uIntensity, { value: 1, duration: 3.5, ease: 'power2.inOut', delay: 0.4 });
    });
  };
  window.addEventListener('marlow:preloader-exit', playIntro, { once: true });
  ctx.onReady(playIntro);

  // ---------- scroll: drift, parallax, soften ----------
  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 900px)', mobile: '(max-width: 899px)' }, (c) => {
    const { desktop } = c.conditions;
    const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
    const tl = gsap.timeline({ scrollTrigger: st, defaults: { ease: 'none' } });
    tl.to(imgWrap, { scale: 1.15, yPercent: 8 }, 0)
      .to(title, { yPercent: desktop ? -38 : -20 }, 0)
      .to(title, { opacity: 0, duration: 0.7 }, 0)
      .to(canvas, { opacity: 0, duration: 0.8 }, 0)
      .to([q('.hero__top'), q('.hero__row'), foot, inset], {
        opacity: 0.25,
        y: desktop ? -60 : -30,
        ...(desktop ? { filter: 'blur(6px)' } : {}),
        duration: 1,
      }, 0);
  });
}
