const ONLINE_DISCOUNT_RATE = 0.15;

function renderCartPage() {
  const container = document.getElementById('cart-items');
  const checkoutBtn = document.getElementById('checkout-btn');
  const cart = getCart();

  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Your cart is empty.</p>
        <a href="menu.html" class="btn btn-primary">Browse Menu</a>
      </div>
    `;
    checkoutBtn.classList.add('btn-disabled');
    checkoutBtn.setAttribute('aria-disabled', 'true');
    checkoutBtn.addEventListener('click', (e) => e.preventDefault());
  } else {
    container.innerHTML = cart
      .map((item) => {
        const detail = describeCartLine(item);
        const imageHTML = item.image
          ? `<img class="cart-item-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" data-fallback="${escapeHtml(item.icon || '🍽️')}" />`
          : `<div class="cart-item-icon">${escapeHtml(item.icon || '🍽️')}</div>`;
        return `
      <div class="cart-item" data-line-id="${escapeHtml(item.lineId)}">
        ${imageHTML}
        <div class="cart-item-info">
          <h4>${escapeHtml(item.name)}</h4>
          ${detail ? `<span class="cart-item-detail">${escapeHtml(detail)}</span>` : ''}
          <span>${formatCurrency(item.price)} each</span>
        </div>
        <div class="qty-control">
          <button data-action="decrease" aria-label="Decrease quantity">−</button>
          <span>${item.quantity}</span>
          <button data-action="increase" aria-label="Increase quantity">+</button>
        </div>
        <div class="cart-item-total">${formatCurrency(item.price * item.quantity)}</div>
        <button class="remove-btn" data-action="remove">Remove</button>
      </div>
    `;
      })
      .join('');

    container.querySelectorAll('.cart-item-image').forEach((img) => {
      img.addEventListener(
        'error',
        () => {
          const fallback = document.createElement('div');
          fallback.className = 'cart-item-icon';
          fallback.textContent = img.getAttribute('data-fallback') || '🍽️';
          img.replaceWith(fallback);
        },
        { once: true }
      );
    });

    container.querySelectorAll('.cart-item').forEach((row) => {
      const lineId = row.getAttribute('data-line-id');
      const item = cart.find((i) => i.lineId === lineId);

      row.querySelector('[data-action="increase"]').addEventListener('click', () => {
        updateCartQuantity(lineId, item.quantity + 1);
        renderCartPage();
      });
      row.querySelector('[data-action="decrease"]').addEventListener('click', () => {
        updateCartQuantity(lineId, item.quantity - 1);
        renderCartPage();
      });
      row.querySelector('[data-action="remove"]').addEventListener('click', () => {
        removeFromCart(lineId);
        renderCartPage();
      });
    });
  }

  const subtotal = getCartSubtotal();
  const discount = subtotal * ONLINE_DISCOUNT_RATE;
  document.getElementById('summary-subtotal').textContent = formatCurrency(subtotal);
  document.getElementById('summary-discount').textContent = `− ${formatCurrency(discount)}`;
  document.getElementById('summary-total').textContent = formatCurrency(subtotal - discount);
}

document.addEventListener('DOMContentLoaded', renderCartPage);
