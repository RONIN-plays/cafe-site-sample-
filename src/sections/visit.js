// ============ VISIT — hours badge, drawn map, reservation form ============

// day index (0 = Sun) -> [open, close] in minutes
const HOURS = {
  0: [8 * 60, 17 * 60], 6: [8 * 60, 17 * 60],
  1: [7 * 60, 18 * 60], 2: [7 * 60, 18 * 60], 3: [7 * 60, 18 * 60], 4: [7 * 60, 18 * 60], 5: [7 * 60, 18 * 60],
};
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmt = (mins) => `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function initVisit(ctx) {
  const { gsap, SplitText, reducedMotion } = ctx;
  const root = document.querySelector('#visit');
  if (!root) return;

  initStatus(root);
  initForm(root, ctx);

  const map = root.querySelector('.visit__map');
  const media = root.querySelector('.visit__media');
  const mediaInner = root.querySelector('.visit__media-inner');
  const img = media?.querySelector('img');

  if (reducedMotion) {
    map?.classList.add('is-pinned');
    return;
  }

  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 900px)', mobile: '(max-width: 899px)' }, (c) => {
    const { desktop } = c.conditions;

    // headline: lines rise from masks
    SplitText.create(root.querySelector('.visit__title'), {
      type: 'lines', mask: 'lines', autoSplit: true,
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 110, duration: 1.3, stagger: 0.09,
          scrollTrigger: { trigger: root, start: 'top 75%', once: true },
        });
      },
    });

    // info blocks: quiet stagger
    gsap.from(root.querySelectorAll('.visit__status, .visit__block'), {
      y: 30, opacity: 0, duration: 1.1, stagger: 0.08,
      scrollTrigger: { trigger: root.querySelector('.visit__info'), start: 'top 80%', once: true },
    });

    /* ---- map: streets draw themselves as you scroll ---- */
    if (map) {
      const q = (s) => [...map.querySelectorAll(s)];
      const roads = [
        ...q('.visit__map-road--main'),
        ...q('.visit__map-road:not(.visit__map-road--main):not(.visit__map-water)'),
        ...q('.visit__map-water'),
        ...q('.visit__map-park path'),
      ];
      const labels = q('.visit__map-label, .visit__map-north');
      const tag = map.querySelector('.visit__map-tag');
      const drop = map.querySelector('.visit__pin-drop');

      gsap.set(roads, { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.timeline({
        scrollTrigger: { trigger: map, start: 'top 88%', end: desktop ? 'center 50%' : 'center 55%', scrub: 1 },
        defaults: { ease: 'none' },
      })
        .to(roads, { strokeDashoffset: 0, duration: 1, stagger: 0.12 })
        .from(labels, { opacity: 0, y: 6, duration: 0.6, stagger: 0.08 }, '-=1.1');

      // pin drops once the streets are mostly in, then starts pulsing
      gsap.set(drop, { transformBox: 'fill-box', transformOrigin: '50% 100%' });
      gsap.timeline({
        scrollTrigger: { trigger: map, start: desktop ? 'center 62%' : 'center 70%', toggleActions: 'play none none reverse' },
        onStart: () => map.classList.add('is-pinned'),
        onReverseComplete: () => map.classList.remove('is-pinned'),
      })
        .from(drop, { y: -90, opacity: 0, duration: 0.55, ease: 'power3.in' })
        .to(drop, { scaleY: 0.82, scaleX: 1.1, duration: 0.12, ease: 'power2.out' })
        .to(drop, { scaleY: 1, scaleX: 1, duration: 0.7 })
        .from(tag, { opacity: 0, x: -10, duration: 0.6 }, '-=0.6');
    }

    /* ---- interior image: clip wipe + inner parallax ---- */
    if (media && img) {
      gsap.fromTo(media, { clipPath: 'inset(100% 0% 0% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'power4.inOut',
        scrollTrigger: { trigger: media, start: 'top 82%', once: true },
      });
      gsap.fromTo(img, { scale: 1.3 }, {
        scale: 1, duration: 2, ease: 'power3.out',
        scrollTrigger: { trigger: media, start: 'top 82%', once: true },
      });
      gsap.fromTo(mediaInner, { yPercent: desktop ? -8 : -5 }, {
        yPercent: desktop ? 8 : 5, ease: 'none',
        scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    }

    // form panel slides up over the image
    gsap.from(root.querySelector('.visit__form'), {
      y: desktop ? 120 : 60, duration: 1.4,
      scrollTrigger: { trigger: root.querySelector('.visit__form'), start: 'top 95%', once: true },
    });
  });
}

/* ================= live open/closed badge ================= */
function initStatus(root) {
  const badge = root.querySelector('[data-visit-status]');
  const text = badge?.querySelector('.visit__status-text');
  const rows = [...root.querySelectorAll('.visit__table tr[data-days]')];
  if (!badge) return;

  const update = () => {
    const now = new Date();
    const day = now.getDay();
    const mins = now.getHours() * 60 + now.getMinutes();
    const [open, close] = HOURS[day];
    let label, state;

    if (mins >= open && mins < close) {
      const left = close - mins;
      state = left <= 45 ? 'soon' : 'open';
      label = left <= 45 ? `Open now · closing soon, ${fmt(close)}` : `Open now · until ${fmt(close)}`;
    } else if (mins < open) {
      state = 'closed';
      label = `Closed · opens ${fmt(open)}`;
    } else {
      const nd = (day + 1) % 7;
      state = 'closed';
      label = `Closed · opens ${fmt(HOURS[nd][0])} tomorrow`;
    }

    text.textContent = label;
    badge.classList.toggle('is-open', state === 'open');
    badge.classList.toggle('is-soon', state === 'soon');
    badge.classList.toggle('is-closed', state === 'closed');
    rows.forEach((r) => r.classList.toggle('is-today', r.dataset.days.split(',').includes(String(day))));
  };
  update();
  // re-check on the minute
  const msToMinute = 60000 - (Date.now() % 60000);
  setTimeout(() => { update(); setInterval(update, 60000); }, msToMinute + 50);
}

/* ================= reservation form ================= */
function initForm(root, ctx) {
  const { gsap, reducedMotion } = ctx;
  const form = root.querySelector('.visit__form');
  if (!form) return;

  const f = {
    name: form.querySelector('#visit-name'),
    email: form.querySelector('#visit-email'),
    date: form.querySelector('#visit-date'),
    time: form.querySelector('#visit-time'),
  };
  const guestsInput = form.querySelector('input[name="guests"]');
  const guestsNum = form.querySelector('.visit__guests-num');
  const stepBtns = [...form.querySelectorAll('.visit__step')];
  const status = form.querySelector('.visit__form-status');
  const btn = form.querySelector('.visit__submit');
  const btnBody = btn.querySelector('.visit__submit-body');
  const btnLabel = btn.querySelector('.visit__submit-label');
  const btnDone = btn.querySelector('.visit__submit-done');
  const btnCheck = btnDone.querySelector('path');
  const btnDoneText = btnDone.querySelector('.visit__submit-done-text');
  let submitted = false;

  /* ---- date + time slots that respect opening hours ---- */
  const today = new Date();
  const max = new Date(); max.setDate(max.getDate() + 60);
  f.date.min = isoDate(today);
  f.date.max = isoDate(max);

  const parseDate = (v) => { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); };

  function fillTimes() {
    const chosen = f.date.value ? parseDate(f.date.value) : today;
    const [open, close] = HOURS[chosen.getDay()];
    const isToday = isoDate(chosen) === isoDate(new Date());
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    const prev = f.time.value;
    const opts = [];
    // first seating 30 min after opening, last one an hour before close
    for (let m = open + 30; m <= close - 60; m += 30) {
      if (isToday && m < nowMins + 30) continue;
      opts.push(fmt(m));
    }
    f.time.innerHTML = '';
    const ph = new Option(opts.length ? 'Choose a time' : 'Fully booked for today', '');
    f.time.add(ph);
    opts.forEach((t) => f.time.add(new Option(t, t)));
    if (opts.includes(prev)) f.time.value = prev;
  }
  fillTimes();
  f.date.addEventListener('change', fillTimes);

  /* ---- guests stepper ---- */
  let guests = 2;
  const setGuests = (n, dir) => {
    n = Math.min(8, Math.max(1, n));
    stepBtns[0].disabled = n <= 1;
    stepBtns[1].disabled = n >= 8;
    if (n === guests) return;
    guests = n;
    guestsInput.value = String(n);
    if (reducedMotion) { guestsNum.textContent = n; return; }
    gsap.killTweensOf(guestsNum);
    gsap.timeline()
      .to(guestsNum, { yPercent: -100 * dir, opacity: 0, duration: 0.18, ease: 'power2.in' })
      .add(() => { guestsNum.textContent = n; })
      .fromTo(guestsNum, { yPercent: 100 * dir, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45 });
  };
  stepBtns.forEach((b) => b.addEventListener('click', () => {
    const d = Number(b.dataset.step);
    setGuests(guests + d, d);
  }));
  setGuests(2, 1);

  /* ---- validation ---- */
  const rules = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Tell us who to expect.'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : (v.trim() ? 'That email looks incomplete.' : 'We need an email to confirm.')),
    date: (v) => {
      if (!v) return 'Pick a day.';
      if (v < f.date.min) return 'That day has already passed.';
      if (v > f.date.max) return 'We book up to 60 days ahead.';
      return '';
    },
    time: (v) => (v ? '' : (f.time.options.length > 1 ? 'Pick a time.' : 'No seatings left that day. Try another.')),
  };
  const fieldLabel = { name: 'name', email: 'email', date: 'date', time: 'time' };

  function check(key, show = true) {
    const msg = rules[key](f[key].value);
    const field = f[key].closest('.visit__field');
    if (show) {
      field.classList.toggle('is-invalid', !!msg);
      f[key].setAttribute('aria-invalid', msg ? 'true' : 'false');
      field.querySelector('.visit__err').textContent = msg;
    }
    return msg;
  }
  Object.keys(f).forEach((k) => {
    const ev = k === 'date' || k === 'time' ? 'change' : 'input';
    f[k].addEventListener(ev, () => { if (f[k].closest('.visit__field').classList.contains('is-invalid')) check(k); });
    f[k].addEventListener('blur', () => { if (f[k].value) check(k); });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (submitted) return;
    const bad = Object.keys(f).filter((k) => check(k));
    if (bad.length) {
      status.classList.add('is-error');
      status.textContent = bad.length === 1
        ? `One thing to fix: ${fieldLabel[bad[0]]}.`
        : `${bad.length} things to fix: ${bad.map((k) => fieldLabel[k]).join(', ')}.`;
      f[bad[0]].focus({ preventScroll: true });
      if (!reducedMotion) {
        gsap.fromTo(bad.map((k) => f[k].closest('.visit__field')), { x: 0 }, {
          keyframes: { x: [0, -8, 7, -4, 2, 0] }, duration: 0.45, ease: 'power1.inOut', stagger: 0.05,
        });
      }
      return;
    }
    succeed();
  });

  function succeed() {
    submitted = true;
    status.classList.remove('is-error');
    const d = parseDate(f.date.value);
    const when = `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })}`;
    const first = f.name.value.trim().split(/\s+/)[0];
    status.innerHTML = '';
    status.append(
      `Table for ${guests} on ${when} at ${f.time.value} is noted, ${first}. This is a demo, so no email is sent. `,
    );
    const again = document.createElement('button');
    again.type = 'button';
    again.textContent = 'Make another booking';
    again.addEventListener('click', reset);
    status.append(again);

    btn.classList.add('is-done');
    btn.setAttribute('aria-disabled', 'true');
    btnDone.removeAttribute('aria-hidden');
    btnLabel.setAttribute('aria-hidden', 'true');
    form.querySelectorAll('.visit__input, .visit__step').forEach((el) => { el.disabled = true; });

    if (reducedMotion) {
      gsap.set(btnLabel, { autoAlpha: 0 });
      gsap.set(btnDone, { autoAlpha: 1 });
      gsap.set(btnCheck, { strokeDashoffset: 0 });
      return;
    }

    // animate the inner pill, never the [data-magnetic] button (the cursor owns its transforms)
    const h = btnBody.offsetHeight;
    const w0 = btnBody.offsetWidth;
    const pad = parseFloat(getComputedStyle(btnBody).paddingLeft);
    // measure the final "See you soon" pill before animating
    btnDone.style.visibility = 'visible';
    btnLabel.style.display = 'none';
    btnBody.style.width = 'auto';
    const wEnd = btnBody.offsetWidth;
    const tEnd = btnDoneText.offsetWidth;
    btnDone.style.visibility = '';
    btnLabel.style.display = '';
    gsap.set(btnBody, { width: w0 });
    gsap.set(btnDoneText, { width: 0, opacity: 0, marginLeft: 0, yPercent: 100 });
    gsap.set(btnDone, { gap: 0 });
    const gapPx = wEnd - pad * 2 - tEnd - btnCheck.ownerSVGElement.getBoundingClientRect().width;
    gsap.timeline()
      // label lifts out
      .to(btnLabel, { yPercent: -140, opacity: 0, duration: 0.35, ease: 'power2.in' })
      // pill gathers into a circle
      .to(btnBody, { width: h, paddingLeft: 0, paddingRight: 0, duration: 0.55, ease: 'power3.inOut' }, 0.15)
      .set(btnLabel, { visibility: 'hidden' })
      .set(btnDone, { visibility: 'visible' })
      // check draws
      .to(btnCheck, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' })
      // circle opens back into a pill with the message
      .to(btnBody, { width: wEnd, paddingLeft: pad, paddingRight: pad, duration: 0.8, ease: 'power3.inOut' }, '+=0.1')
      .to(btnDoneText, { width: tEnd, marginLeft: Math.max(0, gapPx), duration: 0.8, ease: 'power3.inOut' }, '<')
      .to(btnDoneText, { yPercent: 0, opacity: 1, duration: 0.7 }, '<0.25');
  }

  function reset() {
    submitted = false;
    form.reset();
    form.querySelectorAll('.visit__input').forEach((el) => { el.disabled = false; });
    stepBtns.forEach((b) => { b.disabled = false; });
    guests = 0; setGuests(2, 1);
    fillTimes();
    gsap.set([btnBody, btnLabel, btnDone, btnCheck, btnDoneText], { clearProps: 'all' });
    btn.classList.remove('is-done');
    btn.removeAttribute('aria-disabled');
    btnDone.setAttribute('aria-hidden', 'true');
    btnLabel.removeAttribute('aria-hidden');
    status.textContent = '';
    f.name.focus();
  }
}
