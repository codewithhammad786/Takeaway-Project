document.addEventListener('DOMContentLoaded', () => {
  const heroPhoto = document.getElementById('hero-photo');
  const heroFallback = document.getElementById('hero-emoji-fallback');
  if (heroPhoto) {
    heroPhoto.addEventListener(
      'error',
      () => {
        heroPhoto.hidden = true;
        if (heroFallback) heroFallback.hidden = false;
      },
      { once: true }
    );
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
  const badge = item.badge ? `<span class="deal-badge">${escapeHtml(item.badge)}</span>` : '';

  return `
    <a class="deal-card" href="menu.html?category=${encodeURIComponent(item.category)}">
      <div class="deal-card-image-wrap">
        ${imageInner}
        ${badge}
      </div>
      <h3 class="deal-card-name">${escapeHtml(item.name)} ${item.popular && !item.badge ? '<span class="badge-popular">Popular</span>' : ''}</h3>
      <p class="deal-card-price">${price}</p>
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

// "Order Again" + "You Might Also Like" — only shown to logged-in customers with real order
// history, built from what they've actually bought before (see /api/auth/recommendations).
async function loadPersonalizedSections() {
  if (typeof isLoggedIn !== 'function' || !isLoggedIn()) return;

  try {
    const { orderAgain, recommended } = await apiRequest('/auth/recommendations', { headers: authHeaders() });

    if (orderAgain.length) {
      const section = document.getElementById('order-again-section');
      const carousel = document.getElementById('order-again-carousel');
      if (section && carousel) {
        section.hidden = false;
        renderCarouselInto(carousel, orderAgain, { prevId: 'order-again-prev', nextId: 'order-again-next' });
      }
    }

    if (recommended.length) {
      const section = document.getElementById('recommended-section');
      const carousel = document.getElementById('recommended-carousel');
      if (section && carousel) {
        section.hidden = false;
        renderCarouselInto(carousel, recommended, { prevId: 'recommended-prev', nextId: 'recommended-next' });
      }
    }
  } catch (err) {
    // Personalization is a bonus, not critical — the rest of the home page still works fine.
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
  loadPersonalizedSections();
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
