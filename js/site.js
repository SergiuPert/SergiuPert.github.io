// Small, dependency-free behaviour for the portfolio. The page reads fine without any of it.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Email is put together here so simple address scrapers don't find it in the page source.
  const address = ['sergiupert', 'gmail.com'].join('@');
  $$('[data-email]').forEach(a => { a.href = `mailto:${address}`; a.removeAttribute('target'); });
  $$('[data-email-text]').forEach(p => { p.textContent = address; });

  // Nav background and reading progress.
  const nav = $('#nav');
  const bar = $('#progress');
  const onScroll = () => {
    nav.classList.toggle('is-stuck', scrollY > 24);
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Highlight the section being read.
  const links = $$('.nav__links a');
  const spy = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach(l => l.classList.toggle('is-here', l.getAttribute('href') === `#${e.target.id}`));
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(l => { const s = $(l.getAttribute('href')); if (s) spy.observe(s); });
  spy.observe($('#top')); // Back at the top, no section is highlighted.

  // Reveal blocks as they scroll in.
  const reveal = new IntersectionObserver((entries, o) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      o.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  $$('.reveal').forEach(el => reveal.observe(el));

  // Spell clips load only when near the screen, and play only while visible.
  const clips = $$('.clip video');
  const player = new IntersectionObserver(entries => {
    for (const e of entries) {
      const v = e.target;
      if (e.isIntersecting) {
        if (!v.src) v.src = v.dataset.src;
        if (!reduced) v.play().catch(() => {});
      } else if (!v.paused) {
        v.pause();
      }
    }
  }, { rootMargin: '120px 0px', threshold: 0.2 });
  clips.forEach(v => {
    player.observe(v);
    if (reduced) {
      v.controls = true;
      if (!v.src) v.src = v.dataset.src;
    }
  });

  // The trailer loads from YouTube only after a click, so visitors get no third-party cookies until they ask for the video.
  const trailer = $('#trailer');
  if (trailer) {
    $('.trailer__btn', trailer).addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${trailer.dataset.yt}?autoplay=1&rel=0`;
      f.title = 'Evilos trailer';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      trailer.replaceChildren(f);
    });
  }

  // Screenshot viewer.
  const box = $('#lightbox');
  const shots = $$('#gallery a[data-full]');
  if (box && box.showModal && shots.length) {
    const img = $('img', box);
    let at = 0;
    const show = i => {
      at = (i + shots.length) % shots.length;
      img.src = shots[at].href;
      img.alt = $('img', shots[at]).alt;
    };
    shots.forEach((a, i) => a.addEventListener('click', e => {
      e.preventDefault();
      show(i);
      box.showModal();
    }));
    $('.lightbox__close', box).addEventListener('click', () => box.close());
    $('.lightbox__nav--prev', box).addEventListener('click', () => show(at - 1));
    $('.lightbox__nav--next', box).addEventListener('click', () => show(at + 1));
    box.addEventListener('click', e => { if (e.target === box) box.close(); });
    box.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') show(at - 1);
      if (e.key === 'ArrowRight') show(at + 1);
    });
    let startX = null;
    box.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', e => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  // Embers drifting up over the hero art. Stops when the hero is off screen, and doesn't run at all for reduced motion.
  const canvas = $('#embers');
  if (canvas && !reduced) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, raf = 0, last = 0, running = false;
    let embers = [];
    const spawn = (anywhere = false) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: 0.7 + Math.random() * 2,
      vy: 16 + Math.random() * 34,
      sway: 6 + Math.random() * 16,
      phase: Math.random() * Math.PI * 2,
      life: 0.45 + Math.random() * 0.55,
    });
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(70, w / 22));
      embers = Array.from({ length: count }, () => spawn(true));
    };
    const frame = t => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0);
      last = t;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        e.y -= e.vy * dt;
        e.phase += dt * 1.4;
        const x = e.x + Math.sin(e.phase) * e.sway;
        const fade = Math.min(1, e.y / (h * 0.65));
        if (e.y < -10 || fade <= 0) { embers[i] = spawn(); continue; }
        const a = fade * e.life * (0.7 + 0.3 * Math.sin(e.phase * 3));
        const g = ctx.createRadialGradient(x, e.y, 0, x, e.y, e.r * 5);
        g.addColorStop(0, `rgba(255, 190, 110, ${a})`);
        g.addColorStop(0.4, `rgba(255, 110, 30, ${a * 0.55})`);
        g.addColorStop(1, 'rgba(255, 70, 10, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, e.y, e.r * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    const toggle = on => {
      if (on === running) return;
      running = on;
      if (on) { last = performance.now(); raf = requestAnimationFrame(frame); } else { cancelAnimationFrame(raf); }
    };
    size();
    addEventListener('resize', size);
    new IntersectionObserver(([e]) => toggle(e.isIntersecting)).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (document.hidden) toggle(false); });
  }
})();
