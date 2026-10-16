const ONLINE_DISCOUNT_RATE = 0.15;

// Shown only on an empty cart, only for a returning guest (one who has a saved phone+email from a
// past order) — fetches their most recent paid order and offers to re-add every item in one click,
// instead of making them rebuild the whole order from the menu again.
async function renderReorderPrompt() {
  const guest = getGuestDetails();
  if (!guest || !guest.phone || !guest.email) return;

  let result;
  try {
    result = await apiRequest('/customers/last-order', {
      method: 'POST',
      body: JSON.stringify({ phone: guest.phone, email: guest.email }),
    });
  } catch (err) {
    return;
  }

  if (!result.found || !result.items.length) return;

  const container = document.getElementById('cart-items');
  const box = document.createElement('div');
  box.className = 'reorder-prompt';
  box.innerHTML = `
    <p class="reorder-title">Reorder your last order? <span class="reorder-note">#${escapeHtml(result.orderNumber)} — ${new Date(result.createdAt).toLocaleDateString('en-GB')}</span></p>
    <ul class="reorder-items">
      ${result.items.map((item) => `<li>${item.quantity} × ${escapeHtml(item.name)}</li>`).join('')}
    </ul>
    ${result.skipped ? `<p class="reorder-note">${result.skipped} item(s) from that order are no longer available and were left out.</p>` : ''}
    <button type="button" class="btn btn-primary" id="reorder-add-btn">Add to Cart</button>
  `;
  container.appendChild(box);

  document.getElementById('reorder-add-btn').addEventListener('click', () => {
    result.items.forEach((item) => {
      addToCart(
        {
          menuItemId: item.menuItemId,
          name: item.name,
          icon: item.icon,
          image: item.image,
          variantLabel: item.variantLabel,
          price: item.price,
          selectedOptions: item.selectedOptions,
          removedToppings: item.removedToppings,
          addedToppings: item.addedToppings,
        },
        item.quantity
      );
    });
    showToast('Your last order has been added to your cart!');
    renderCartPage();
  });
}

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
    renderReorderPrompt();
  } else {
    container.innerHTML = cart
      .map((item) => {
        const detail = describeCartLine(item);
        const imageHTML = item.image
          ? `<img class="cart-item-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" data-fallback="${escapeHtml(item.icon || '🍽️')}" />`
          : `<div class="cart-item-icon" style="background: ${foodIconGlowBackground(item.icon, 0.16)};">${foodIconSvg(item.icon, 30)}</div>`;
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
          const iconKey = img.getAttribute('data-fallback');
          const fallback = document.createElement('div');
          fallback.className = 'cart-item-icon';
          fallback.style.background = foodIconGlowBackground(iconKey, 0.16);
          fallback.innerHTML = foodIconSvg(iconKey, 30);
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
