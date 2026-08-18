function renderMenuCard(item) {
  const hasVariants = item.variants.length > 1;
  const priceDisplay = hasVariants
    ? `${formatCurrency(item.variants[0].price)} – ${formatCurrency(item.variants[item.variants.length - 1].price)}`
    : formatCurrency(item.variants[0].price);

  const imageInner = item.image
    ? `<img class="menu-card-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" data-fallback="${escapeHtml(item.icon || '🍽️')}" />`
    : `<div class="menu-card-icon">${escapeHtml(item.icon || '🍽️')}</div>`;

  const dealBadgeHTML = item.badge ? `<span class="deal-badge">${escapeHtml(item.badge)}</span>` : '';

  return `
    <article class="menu-card" data-id="${escapeHtml(item._id)}" tabindex="0" role="button" aria-label="View ${escapeHtml(item.name)}">
      <div class="menu-card-image-wrap">
        ${imageInner}
        ${dealBadgeHTML}
        <span class="cart-qty-badge" data-qty-badge hidden></span>
      </div>
      <div class="menu-card-body">
        <h3>${escapeHtml(item.name)} ${item.popular && !item.badge ? '<span class="badge-popular">Popular</span>' : ''}</h3>
        <span class="price">${priceDisplay}</span>
      </div>
    </article>
  `;
}

function updateCartQtyBadges(container, items) {
  const cart = getCart();
  const qtyByItemId = new Map();
  cart.forEach((line) => {
    qtyByItemId.set(line.menuItemId, (qtyByItemId.get(line.menuItemId) || 0) + line.quantity);
  });

  container.querySelectorAll('.menu-card').forEach((card) => {
    const id = card.getAttribute('data-id');
    const badge = card.querySelector('[data-qty-badge]');
    if (!badge) return;
    const qty = qtyByItemId.get(id) || 0;
    if (qty > 0) {
      badge.textContent = qty;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  });
}

function bindMenuCards(container, items) {
  const itemsById = new Map(items.map((i) => [i._id, i]));

  container.querySelectorAll('.menu-card').forEach((card) => {
    const id = card.getAttribute('data-id');
    const item = itemsById.get(id);
    if (!item) return;

    const img = card.querySelector('.menu-card-image');
    if (img) {
      img.addEventListener(
        'error',
        () => {
          const fallback = document.createElement('div');
          fallback.className = 'menu-card-icon';
          fallback.textContent = img.getAttribute('data-fallback') || '🍽️';
          img.replaceWith(fallback);
        },
        { once: true }
      );
    }

    function openThisModal() {
      openItemModal(item, () => updateCartQtyBadges(container, items));
    }

    card.addEventListener('click', openThisModal);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openThisModal();
      }
    });
  });

  updateCartQtyBadges(container, items);
}
