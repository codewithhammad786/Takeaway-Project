function renderLiveStatus() {
  const nav = document.getElementById('nav-menu');
  if (!nav) return;

  let badge = document.getElementById('live-status-badge');
  const open = isShopOpen();

  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'live-status-badge';
    nav.insertBefore(badge, nav.firstChild);
  }

  badge.className = `live-status ${open ? 'live-status-open' : 'live-status-closed'}`;
  badge.innerHTML = `<span class="live-status-dot"></span>${open ? 'Open Now' : 'Closed · Opens 15:00'}`;
}

// Adds a raised, slightly denser look to the sticky header once the page has scrolled, and shows/
// hides a "back to top" button — one shared scroll listener (rAF-throttled) drives both, injected
// here so every page gets it without touching each HTML file.
function setupScrollEffects() {
  const header = document.querySelector('.site-header');
  const backToTop = document.getElementById('back-to-top-btn');
  if (!header && !backToTop) return;

  let ticking = false;
  const update = () => {
    const scrolled = window.scrollY > 12;
    if (header) header.classList.toggle('scrolled', scrolled);
    if (backToTop) backToTop.classList.toggle('visible', window.scrollY > 500);
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );
  update();
}

function createBackToTopButton() {
  if (document.getElementById('back-to-top-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'back-to-top-btn';
  btn.type = 'button';
  btn.className = 'back-to-top';
  btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML = '↑';
  btn.addEventListener('click', () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  document.body.appendChild(btn);
}

// Gentle fade/rise-in as sections enter the viewport — pure CSS transition triggered by toggling a
// class via IntersectionObserver, skipped entirely for prefers-reduced-motion.
function setupScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll('.section, .section-alt');
  if (!targets.length || !('IntersectionObserver' in window)) return;

  targets.forEach((el) => el.classList.add('reveal-on-scroll'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach((el) => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('nav-menu');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  const FOUNDED_YEAR = 2022;
  const yearEl = document.getElementById('year');
  if (yearEl) {
    const currentYear = new Date().getFullYear();
    yearEl.textContent = currentYear > FOUNDED_YEAR ? `${FOUNDED_YEAR}–${currentYear}` : String(FOUNDED_YEAR);
  }

  renderLiveStatus();
  setInterval(renderLiveStatus, 60000);

  createBackToTopButton();
  setupScrollEffects();
  setupScrollReveal();
});
