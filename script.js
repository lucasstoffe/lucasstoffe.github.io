// Scroll reveal
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
);

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

// Header gets a hairline once the page has moved
const head = document.querySelector('.site-head');
const onScroll = () => head.classList.toggle('is-scrolled', window.scrollY > 24);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Hide broken image icons — placeholder cells stay clean
document.querySelectorAll('img').forEach((img) => {
  img.addEventListener('error', () => { img.style.opacity = '0'; });
});

// Moodboard hover glitch — brief distortion on mouse enter
document.querySelectorAll('.m').forEach((cell) => {
  cell.addEventListener('mouseenter', () => {
    cell.classList.add('glitch-active');
    setTimeout(() => cell.classList.remove('glitch-active'), 250);
  });
});

// Language switch — a short full-screen transition between the language pages.
// Five bars close over the page while the name of the language scrambles into
// the new one; the next page opens the same way. Plain links still work without it.
(function () {
  const NAMES = { en: 'English', fr: 'Français', nl: 'Nederlands' };
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ/\\_—·+';
  const root = document.documentElement;
  const here = (root.lang || 'en').slice(0, 2);
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const store = {
    get() { try { return sessionStorage.getItem('lang-wipe'); } catch (e) { return null; } },
    set(v) { try { sessionStorage.setItem('lang-wipe', v); } catch (e) {} },
    clear() { try { sessionStorage.removeItem('lang-wipe'); } catch (e) {} },
  };

  function build(stepText, word) {
    const el = document.createElement('div');
    el.className = 'lang-wipe';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<span class="lang-wipe-bar"></span>'.repeat(5) +
      '<div class="lang-wipe-label"><span class="lang-wipe-step"><i></i><span></span></span><span class="lang-wipe-word"></span></div>';
    el.querySelector('.lang-wipe-step span').textContent = stepText;
    el.querySelector('.lang-wipe-word').textContent = word;
    document.body.appendChild(el);
    return el;
  }

  // Letters settle left to right, with random glyphs ahead of them
  function scramble(node, to, duration) {
    const start = performance.now();
    (function frame(now) {
      const p = Math.min(1, (now - start) / duration);
      const settled = Math.floor(p * to.length);
      let out = to.slice(0, settled);
      for (let i = settled; i < to.length; i++) out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      node.textContent = out;
      if (p < 1) requestAnimationFrame(frame);
    })(start);
  }

  // Leaving: close the bars, scramble to the new language, then go
  document.querySelectorAll('.lang a').forEach((link) => {
    link.addEventListener('click', (event) => {
      const to = link.getAttribute('lang');
      if (calm || link.getAttribute('aria-current') === 'true' || !NAMES[to]) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      const wipe = build(here.toUpperCase() + ' → ' + to.toUpperCase(), NAMES[here] || '');
      const word = wipe.querySelector('.lang-wipe-word');
      requestAnimationFrame(() => requestAnimationFrame(() => wipe.classList.add('is-closed')));
      setTimeout(() => scramble(word, NAMES[to], 480), 420);
      setTimeout(() => { store.set(to); window.location.href = link.href; }, 1050);
    });
  });

  // Arriving: start closed, then open
  if (store.get() === here && !calm) {
    const wipe = build('→ ' + here.toUpperCase(), NAMES[here]);
    wipe.classList.add('is-closed');
    wipe.querySelectorAll('.lang-wipe-bar').forEach((bar) => { bar.style.transition = 'none'; });
    wipe.querySelector('.lang-wipe-label').style.transition = 'none';
    void wipe.offsetWidth;
    root.classList.remove('lang-arriving');
    setTimeout(() => {
      wipe.querySelectorAll('.lang-wipe-bar').forEach((bar) => { bar.style.transition = ''; });
      wipe.querySelector('.lang-wipe-label').style.transition = '';
      wipe.classList.add('is-opening');
      setTimeout(() => wipe.remove(), 900);
    }, 260);
  }
  store.clear();
  root.classList.remove('lang-arriving');

  // Coming back with the browser's back button: never leave the bars closed
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) document.querySelectorAll('.lang-wipe').forEach((el) => el.remove());
  });
})();
