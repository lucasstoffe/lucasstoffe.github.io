// Scroll reveal.
// Things appear a little after they enter the screen, so you see them arrive.
// Whatever comes into view at the same moment appears one after another,
// top to bottom and left to right (--i sets the small delay in style.css).
const observer = new IntersectionObserver(
  (entries) => {
    entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left))
      .forEach((entry, k) => {
        const el = entry.target;
        el.style.setProperty('--i', Math.min(k, 6));
        el.classList.add('is-visible');
        observer.unobserve(el);
        // Once it has landed, drop the blur so the text is fully crisp
        setTimeout(() => el.classList.add('is-done'), 1700 + Math.min(k, 6) * 120);
      });
  },
  { threshold: 0, rootMargin: '0px 0px -12% 0px' }
);

// Moodboard: each image appears on its own as you scroll down, instead of the whole grid at once
document.querySelectorAll('.moodboard-grid').forEach((grid) => {
  grid.classList.remove('reveal');
  grid.querySelectorAll('.m').forEach((cell) => cell.classList.add('reveal'));
});

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

// Screen recordings: only play while on screen (saves battery).
// With "reduce motion" on they don't start by themselves: a play button is shown instead.
document.querySelectorAll('.shot--video video').forEach((video) => {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm) {
    video.removeAttribute('autoplay');
    video.pause();
    video.controls = true;
    return;
  }
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) video.play().catch(() => {});
    else video.pause();
  }, { threshold: 0.2 }).observe(video);
});

// Moodboard glitch: a brief distortion on mouse enter, only on these images.
// To change which ones glitch, edit the file names in this list.
const GLITCH = ['14.jpg', '18.jpg', 'fw2.jpg', '07.jpg', '08.jpg'];
document.querySelectorAll('.m').forEach((cell) => {
  const img = cell.querySelector('img');
  if (!img || !GLITCH.some((name) => img.getAttribute('src').endsWith('/' + name))) return;
  cell.addEventListener('mouseenter', () => {
    cell.classList.add('glitch-active');
    setTimeout(() => cell.classList.remove('glitch-active'), 250);
  });
});

// Header gets a hairline once the page has moved
const head = document.querySelector('.site-head');
const onScroll = () => head.classList.toggle('is-scrolled', window.scrollY > 24);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Hide broken image icons — placeholder cells stay clean
document.querySelectorAll('img').forEach((img) => {
  img.addEventListener('error', () => { img.style.opacity = '0'; });
});

// Language switch.
// 1. The control: a block slides to the chosen language and a red frame follows the pointer.
// 2. The change of page: five bars close under the header while the language name
//    scrambles into the new one; the next page opens the same way.
// With "reduce motion" on, the block still slides but the bars become a plain fade.
// Plain links still work without any of this.
(function () {
  const NAMES = { en: 'English', fr: 'Français', nl: 'Nederlands' };
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ/\\_—·+';
  const root = document.documentElement;
  const here = (root.lang || 'en').slice(0, 2);
  // Read at the moment of the click, so switching the Mac setting works without a reload
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const box = document.querySelector('.lang');

  const store = {
    get() { try { return sessionStorage.getItem('lang-wipe'); } catch (e) { return null; } },
    set(v) { try { sessionStorage.setItem('lang-wipe', v); } catch (e) {} },
    clear() { try { sessionStorage.removeItem('lang-wipe'); } catch (e) {} },
  };

  // ---- the control
  const links = box ? Array.from(box.querySelectorAll('a')) : [];
  let thumb = null;
  const place = (index) => {
    box.style.setProperty('--i', index);
    links.forEach((link, k) => link.classList.toggle('is-on', k === index));
  };

  if (box) {
    thumb = document.createElement('i');
    thumb.className = 'lang-thumb';
    const ghost = document.createElement('i');
    ghost.className = 'lang-ghost';
    [thumb, ghost].forEach((el) => { el.setAttribute('aria-hidden', 'true'); box.appendChild(el); });

    const current = Math.max(0, links.findIndex((link) => link.getAttribute('aria-current') === 'true'));
    place(current);
    box.style.setProperty('--h', current);
    links.forEach((link, k) => link.addEventListener('mouseenter', () => box.style.setProperty('--h', k)));
  }

  // ---- the change of page
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

  // Calm version: the new name comes in from the side the block moved to and
  // pushes the old name out. They touch and travel together, like one shoving the other.
  function push(node, from, to, dir, duration) {
    const oldEl = document.createElement('span');
    const newEl = document.createElement('span');
    oldEl.textContent = from;
    newEl.textContent = to;
    newEl.className = 'lang-wipe-in';
    node.textContent = '';
    node.append(oldEl, newEl);
    node.classList.add('is-push');

    const width = node.clientWidth;
    const oldW = oldEl.offsetWidth;
    const newW = newEl.offsetWidth;
    const gap = Math.max(16, width * 0.03);
    // Start fully outside the visible strip, on the side it enters from
    const from0 = dir > 0 ? Math.max(width, oldW + gap) : -(newW + gap + width * 0.25);
    // Entering from the right, the old name only has to travel its own width to leave.
    // Entering from the left, it has the whole line to cross, so once it is hit it
    // keeps going on its own until it is out of frame.
    let hit = null;   // moment the two names touch (entry from the left)
    const draw = (x, p) => {
      newEl.style.transform = 'translateX(' + x + 'px)';
      let pushed;
      if (dir > 0) {
        pushed = Math.min(0, x - (oldW + gap));
      } else {
        const contact = x + newW + gap;
        if (hit === null && contact > 0) hit = Math.min(p, 0.95);
        if (hit === null) {
          pushed = 0;
        } else {
          const u = Math.min(1, (p - hit) / (1 - hit));
          pushed = Math.max(contact, (width + gap) * (1 - Math.pow(1 - u, 3)));
        }
      }
      oldEl.style.transform = 'translateX(' + pushed + 'px)';
    };
    draw(from0, 0);
    const start = performance.now();
    (function frame(now) {
      const p = Math.min(1, (now - start) / duration);
      draw(from0 * Math.pow(1 - p, 4), p);   // quick in, soft landing
      if (p < 1) requestAnimationFrame(frame);
    })(start);
  }

  // Leaving: slide the block, close the page, then go
  links.forEach((link, index) => {
    link.addEventListener('click', (event) => {
      const to = link.getAttribute('lang');
      if (link.getAttribute('aria-current') === 'true' || !NAMES[to]) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      const calm = reduceMotion.matches;

      const fromIndex = links.findIndex((l) => l.getAttribute('aria-current') === 'true');
      place(index);
      thumb.classList.add('is-moving');

      const wipe = build(here.toUpperCase() + ' → ' + to.toUpperCase(), NAMES[here] || '');
      const word = wipe.querySelector('.lang-wipe-word');
      // The block gets a head start, so the eye sees it move before the page closes
      setTimeout(() => wipe.classList.add('is-closed'), calm ? 150 : 180);
      if (calm) setTimeout(() => push(word, NAMES[here] || '', NAMES[to], index > fromIndex ? 1 : -1, 420), 420);
      else setTimeout(() => scramble(word, NAMES[to], 480), 600);
      setTimeout(() => { store.set(to); window.location.href = link.href; }, calm ? 920 : 1250);
    });
  });

  // Arriving: start closed, then open
  if (store.get() === here) {
    const wipe = build('→ ' + here.toUpperCase(), NAMES[here]);
    const parts = Array.from(wipe.querySelectorAll('.lang-wipe-bar, .lang-wipe-label'));
    parts.forEach((part) => { part.style.transition = 'none'; });
    wipe.classList.add('is-closed');
    void wipe.offsetWidth;
    root.classList.remove('lang-arriving');
    setTimeout(() => {
      parts.forEach((part) => { part.style.transition = ''; });
      wipe.classList.add('is-opening');
      setTimeout(() => wipe.remove(), 900);
    }, 260);
  }
  store.clear();
  root.classList.remove('lang-arriving');

  // Coming back with the browser's back button: never leave the page closed
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    document.querySelectorAll('.lang-wipe').forEach((el) => el.remove());
    if (box) place(Math.max(0, links.findIndex((link) => link.getAttribute('aria-current') === 'true')));
  });
})();
