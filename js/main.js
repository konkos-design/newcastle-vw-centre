/* Newcastle VW Centre — interactions (vanilla, no dependencies) */
(function () {
  const doc = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) doc.classList.add('reduced');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Draw helpers for the red / white / gold lines ---------- */
  function prepLines(svg) {
    $$('path', svg).forEach(p => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      p.dataset.len = len;
    });
  }
  function setLines(svg, t) {
    $$('path', svg).forEach((p, i) => {
      const len = +p.dataset.len;
      const local = clamp((t - i * 0.08) / 0.84, 0, 1);
      p.style.strokeDashoffset = len * (1 - local);
    });
  }

  /* ---------- Ignition intro (home only, once per session) ---------- */
  function runIgnition(done) {
    const ig = $('.ignite');
    if (!ig) return done();
    let seen = false;
    try { seen = sessionStorage.getItem('nvw-ignite') === '1'; sessionStorage.setItem('nvw-ignite', '1'); } catch (e) {}
    if (seen || reduced) { ig.remove(); return done(); }
    const arc = $('.arc-on', ig), needle = $('.needle', ig), num = $('.rpm', ig);
    const L = arc.getTotalLength();
    arc.style.strokeDasharray = L;
    const start = performance.now(), dur = 1250;
    (function frame(now) {
      const t = clamp((now - start) / dur, 0, 1);
      // rev up to 7 then settle to idle
      const v = t < .6 ? easeOut(t / .6) * .88 : .88 - easeInOut((t - .6) / .4) * .78;
      arc.style.strokeDashoffset = L * (1 - v);
      needle.setAttribute('transform', `rotate(${-120 + v * 240} 120 120)`);
      num.textContent = (v * 8).toFixed(1);
      if (t < 1) requestAnimationFrame(frame);
      else {
        ig.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], { duration: 650, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' });
        setTimeout(() => { ig.remove(); }, 660);
        setTimeout(done, 250);
      }
    })(start);
  }
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  /* ---------- Hero entrance ---------- */
  function heroIn() {
    const hero = $('.hero') || $('.phero');
    if (!hero) return;
    const lines = $$('h1 .ln > span', hero);
    const trio = $('.hero__lines svg, .phero .trio', hero);
    if (reduced) { if (trio) { prepLines(trio); setLines(trio, 1); } return; }
    lines.forEach((s, i) => s.animate(
      [{ transform: 'translateY(110%) skewY(6deg)' }, { transform: 'none' }],
      { duration: 1000, delay: 120 + i * 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
    if (trio) {
      prepLines(trio);
      const s = performance.now() + 250;
      (function f(n) { const t = clamp((n - s) / 1500, 0, 1); setLines(trio, easeOut(t)); if (t < 1) requestAnimationFrame(f); })(s);
    }
    const sweep = $('.hero__sweep');
    if (sweep) sweep.animate([{ transform: 'translateX(-120%)' }, { transform: 'translateX(120%)' }], { duration: 1600, delay: 700, easing: 'cubic-bezier(.6,0,.3,1)' });
    const img = $('.hero__media img');
    if (img) img.animate([{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 2200, easing: 'cubic-bezier(.2,.8,.2,1)' });
    $$('[data-hero]', hero).forEach((el, i) => el.animate(
      [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }],
      { duration: 800, delay: 600 + i * 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
  }

  /* ---------- Scroll reveals ---------- */
  function reveals() {
    const els = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.style.transitionDelay = (e.target.dataset.delay || 0) + 'ms'; e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    els.forEach(e => io.observe(e));
  }

  /* ---------- Scroll-linked effects ---------- */
  const lanes = $$('.lane svg');
  lanes.forEach(prepLines);
  const pit = $('.pit');
  const tuneBrands = $$('.tune__brand');
  const hdr = $('.hdr');
  const fcall = $('.fcall');
  let lastY = window.scrollY, ticking = false;

  function setupPit() {
    if (!pit) return;
    const track = $('.pit__track', pit);
    const native = reduced || window.innerWidth <= 820;
    pit.classList.toggle('pit--native', native);
    if (native) { pit.style.height = ''; track.style.transform = ''; return; }
    const extra = track.scrollWidth - window.innerWidth;
    pit.style.height = (window.innerHeight + Math.max(0, extra)) + 'px';
  }

  function onScroll() {
    const y = window.scrollY, vh = window.innerHeight;
    // header
    if (hdr && !doc.classList.contains('menu-open')) {
      hdr.classList.toggle('is-solid', y > 40);
      hdr.classList.toggle('is-hidden', y > lastY && y > 400);
    }
    lastY = y;
    if (fcall) fcall.classList.toggle('show', y > vh * .7);
    // lanes draw while passing through viewport
    lanes.forEach(svg => {
      const r = svg.getBoundingClientRect();
      const t = clamp((vh - r.top) / (vh * .75), 0, 1);
      setLines(svg, reduced ? 1 : t);
    });
    // pinned horizontal gallery
    if (pit && !pit.classList.contains('pit--native')) {
      const r = pit.getBoundingClientRect();
      const track = $('.pit__track', pit);
      const extra = track.scrollWidth - window.innerWidth;
      const p = clamp(-r.top / (pit.offsetHeight - vh), 0, 1);
      track.style.transform = `translate3d(${-extra * p}px,0,0)`;
      const bar = $('.pit__bar', pit); if (bar) bar.style.width = (p * 100) + '%';
    }
    // tuning words light up at viewport centre (touch devices have no hover)
    tuneBrands.forEach(b => {
      const r = b.getBoundingClientRect();
      b.classList.toggle('is-lit', r.top < vh * .62 && r.bottom > vh * .38);
    });
    ticking = false;
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', () => { setupPit(); onScroll(); });

  /* ---------- Mobile menu ---------- */
  const burger = $('.burger');
  if (burger) burger.addEventListener('click', () => {
    const open = doc.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', open);
    $('.mnav').setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) hdr.classList.remove('is-hidden');
  });
  $$('.mnav a').forEach(a => a.addEventListener('click', () => { doc.classList.remove('menu-open'); document.body.style.overflow = ''; }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && doc.classList.contains('menu-open')) burger.click(); });

  /* ---------- Opening hours (Newcastle NSW time) ---------- */
  function hours() {
    const st = $$('[data-status]');
    if (!st.length && !$('.hours')) return;
    let day, mins;
    try {
      const parts = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      const g = t => parts.find(p => p.type === t).value;
      day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'));
      mins = (+g('hour') % 24) * 60 + +g('minute');
    } catch (e) { const d = new Date(); day = d.getDay(); mins = d.getHours() * 60 + d.getMinutes(); }
    const weekday = day >= 1 && day <= 5;
    const open = weekday && mins >= 480 && mins < 1020;
    let text;
    if (open) text = mins >= 960 ? 'Open now · closes 5 pm' : 'Open now until 5 pm';
    else if (weekday && mins < 480) text = 'Closed · opens 8 am today';
    else if (day === 5 || day === 6 || (day === 0)) text = 'Closed · opens 8 am Monday';
    else text = 'Closed · opens 8 am tomorrow';
    st.forEach(s => { s.classList.add(open ? 'open' : 'closed'); const b = $('b', s); if (b) b.textContent = text; });
    const row = $(`.hours tr[data-d="${day}"]`); if (row) row.classList.add('today');
  }

  /* ---------- Review deck ---------- */
  function deck() {
    const stack = $('.deck__stack'); if (!stack) return;
    const cards = $$('.rcard', stack); const n = cards.length; let i = 0, timer;
    const count = $('.deck__count');
    function layout() {
      cards.forEach((c, k) => {
        const pos = (k - i + n) % n;
        c.style.zIndex = n - pos;
        c.style.opacity = pos > 2 ? 0 : 1;
        const dx = window.innerWidth < 820 ? 0 : pos * 14; c.style.transform = pos === 0 ? "none" : `translate(${dx}px, ${pos * -12}px) rotate(${pos * (dx ? 2.2 : 1.2)}deg) scale(${1 - pos * .04})`;
        c.setAttribute('aria-hidden', pos !== 0);
      });
      if (count) count.textContent = `${i + 1} / ${n}`;
    }
    function go(d) {
      const top = cards[i];
      if (!reduced) top.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${d > 0 ? -120 : 120}%) rotate(${d > 0 ? -14 : 14}deg)`, opacity: 0 }], { duration: 450, easing: 'cubic-bezier(.6,0,.4,1)' });
      i = (i + d + n) % n; layout(); restart();
    }
    function restart() { clearInterval(timer); if (!reduced) timer = setInterval(() => go(1), 7000); }
    $('[data-next]')?.addEventListener('click', () => go(1));
    $('[data-prev]')?.addEventListener('click', () => go(-1));
    stack.addEventListener('mouseenter', () => clearInterval(timer));
    stack.addEventListener('mouseleave', restart);
    let sx = null;
    stack.addEventListener('pointerdown', e => { sx = e.clientX; });
    stack.addEventListener('pointerup', e => { if (sx === null) return; const dx = e.clientX - sx; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); sx = null; });
    layout(); restart();
  }

  /* ---------- Count-up numbers ---------- */
  function counters() {
    $$('[data-count]').forEach(el => {
      const to = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
      if (reduced || !('IntersectionObserver' in window)) { el.textContent = to.toFixed(dec); return; }
      const io = new IntersectionObserver(es => {
        if (!es[0].isIntersecting) return; io.disconnect();
        const s = performance.now();
        (function f(n) { const t = clamp((n - s) / 1400, 0, 1); el.textContent = (to * easeOut(t)).toFixed(dec); if (t < 1) requestAnimationFrame(f); })(s);
      }, { threshold: .5 });
      io.observe(el);
    });
  }

  /* ---------- Warning-light decoder ---------- */
  function decoder() {
    const dash = $('.dash'); if (!dash) return;
    const btns = $$('.wl', dash), out = $('.dash__out', dash);
    function show(b) {
      btns.forEach(x => x.setAttribute('aria-pressed', x === b));
      const d = b.dataset;
      out.style.setProperty('--c', getComputedStyle(b).getPropertyValue('--c'));
      out.innerHTML = `<div><span class="dash__urg">${d.urg}</span><h3>${d.title}</h3><p>${d.what}</p></div><div><h3>What to do</h3><p>${d.do}</p></div>`;
      if (!reduced) out.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: 'ease-out' });
    }
    btns.forEach(b => b.addEventListener('click', () => show(b)));
    show(btns[0]);
  }

  /* ---------- Read more (reviews page) ---------- */
  $$('.readmore').forEach(b => b.addEventListener('click', () => {
    const m = b.previousElementSibling; const o = m.classList.toggle('is-open');
    b.textContent = o ? 'Show less' : 'Read full review'; b.setAttribute('aria-expanded', o);
  }));
  // hide "read more" where text is short
  $$('.more').forEach(m => { if (m.scrollHeight <= m.clientHeight + 4) { m.classList.add('is-open'); const b = m.nextElementSibling; if (b && b.classList.contains('readmore')) b.remove(); } });

  /* ---------- Init ---------- */
  setupPit(); hours(); deck(); counters(); decoder(); reveals();
  runIgnition(() => { heroIn(); onScroll(); });
  onScroll();
  const y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();
})();
