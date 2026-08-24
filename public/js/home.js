document.addEventListener('DOMContentLoaded', () => {
  const heroPhoto = document.getElementById('hero-photo');
  const heroAccent = document.getElementById('hero-photo-accent');
  const heroFallback = document.getElementById('hero-emoji-fallback');

  if (heroPhoto) {
    heroPhoto.addEventListener(
      'error',
      () => {
        heroPhoto.hidden = true;
        if (heroAccent) heroAccent.hidden = true;
        if (heroFallback) heroFallback.hidden = false;
      },
      { once: true }
    );
  }

  if (heroAccent) {
    heroAccent.addEventListener('error', () => { heroAccent.hidden = true; }, { once: true });
  }
});

// Rotating background behind the hero — real dish photos already used elsewhere on the menu, so
// nothing new/unverified. Crossfades every few seconds; a failed image just gets skipped rather
// than showing a broken slide.
const HERO_SLIDESHOW_IMAGES = [
  'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/7816894/pexels-photo-7816894.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/106343/pexels-photo-106343.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/29306498/pexels-photo-29306498.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/32991898/pexels-photo-32991898.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/708587/pexels-photo-708587.jpeg?auto=compress&cs=tinysrgb&w=1200',
];

document.addEventListener('DOMContentLoaded', () => {
  const slideshow = document.getElementById('hero-slideshow');
  if (!slideshow) return;

  slideshow.innerHTML = HERO_SLIDESHOW_IMAGES.map(
    (url) => `<div class="hero-slide" style="background-image: url('${url}')"></div>`
  ).join('');

  const slides = Array.from(slideshow.querySelectorAll('.hero-slide'));
  if (!slides.length) return;

  let current = 0;
  slides[0].classList.add('active');

  setInterval(() => {
    slides[current].classList.remove('active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('active');
  }, 5000);
});

function renderTeaserCard(item) {
  const price = formatCurrency(item.variants[0].price);
  const imageInner = item.image
    ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" data-fallback="${escapeHtml(item.icon || '🍽️')}" />`
    : `<div class="deal-card-icon">${escapeHtml(item.icon || '🍽️')}</div>`;
  const flag = item.badge
    ? `<span class="deal-card-flag">${escapeHtml(item.badge)}</span>`
    : item.popular
      ? `<span class="deal-card-flag deal-card-flag-popular">🔥 Popular</span>`
      : '';

  return `
    <a class="deal-card" href="menu.html?category=${encodeURIComponent(item.category)}" data-item-id="${escapeHtml(item._id)}">
      <div class="deal-card-image-wrap">
        ${imageInner}
        ${flag}
        <button type="button" class="deal-card-quick-add" aria-label="Quick add ${escapeHtml(item.name)} to cart" data-quick-add>+</button>
        <span class="deal-card-price">${price}</span>
      </div>
      <div class="deal-card-info">
        <span class="deal-card-category">${escapeHtml(item.category)}</span>
        <h3 class="deal-card-name">${escapeHtml(item.name)}</h3>
      </div>
    </a>
  `;
}

function renderCarouselInto(carousel, items, { prevId, nextId, emptyMessage } = {}) {
  if (!items.length) {
    carousel.innerHTML = `<p class="empty-state">${escapeHtml(emptyMessage || 'Nothing to show yet.')}</p>`;
    return;
  }

  carousel.innerHTML = items.map(renderTeaserCard).join('');
  carousel.querySelectorAll('.deal-card-image-wrap img').forEach((img) => {
    img.addEventListener(
      'error',
      () => {
        const fallback = document.createElement('div');
        fallback.className = 'deal-card-icon';
        fallback.textContent = img.getAttribute('data-fallback') || '🍽️';
        img.replaceWith(fallback);
      },
      { once: true }
    );
  });

  if (typeof openItemModal === 'function') {
    carousel.querySelectorAll('[data-quick-add]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!hasGuestDetails()) {
          redirectToGuestGate('index.html');
          return;
        }

        const card = btn.closest('.deal-card');
        const item = items.find((i) => i._id === card.getAttribute('data-item-id'));
        if (item) openItemModal(item);
      });
    });
  }

  if (prevId) {
    document.getElementById(prevId)?.addEventListener('click', () => {
      carousel.scrollBy({ left: -280, behavior: 'smooth' });
    });
  }
  if (nextId) {
    document.getElementById(nextId)?.addEventListener('click', () => {
      carousel.scrollBy({ left: 280, behavior: 'smooth' });
    });
  }
}

async function loadCarousel({ endpoint, containerId, prevId, nextId, hideSectionIfEmpty, emptyMessage }) {
  const carousel = document.getElementById(containerId);
  if (!carousel) return;

  try {
    const items = await apiRequest(endpoint);
    if (!items.length && hideSectionIfEmpty) {
      const section = document.getElementById(hideSectionIfEmpty);
      if (section) section.hidden = true;
      return;
    }
    renderCarouselInto(carousel, items, { prevId, nextId, emptyMessage });
  } catch (err) {
    carousel.innerHTML = `<p class="empty-state">Couldn't load menu items: ${escapeHtml(err.message)}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCarousel({
    endpoint: '/menu?category=Popular%20Deals',
    containerId: 'deals-carousel',
    prevId: 'deals-prev',
    nextId: 'deals-next',
    hideSectionIfEmpty: 'deals',
  });

  loadCarousel({
    endpoint: '/menu?popular=true',
    containerId: 'popular-items',
    prevId: 'popular-prev',
    nextId: 'popular-next',
    emptyMessage: 'No popular items right now — check out the full menu!',
  });

  loadTrustRating();
});

// Shows the real average from actual submitted reviews — never a made-up number. If there are no
// reviews yet, the trust bar invites the first one instead of claiming a rating that doesn't exist.
async function loadTrustRating() {
  const ratingEl = document.getElementById('trust-rating');
  const subEl = document.getElementById('trust-rating-sub');
  if (!ratingEl) return;

  try {
    const reviews = await apiRequest('/reviews');
    if (!reviews.length) return;

    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    ratingEl.textContent = `${avg.toFixed(1)}/5 Rating`;
    subEl.textContent = `From ${reviews.length} customer review${reviews.length === 1 ? '' : 's'}`;
  } catch (err) {
    // Leave the "New to reviews!" default in place — not critical if this fails to load.
  }
}
