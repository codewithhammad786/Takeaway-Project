function ensureItemModal() {
  let overlay = document.getElementById('item-modal-overlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'item-modal-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" id="item-modal-close" type="button" aria-label="Close">&times;</button>
      <div id="item-modal-content"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeItemModal();
  });
  document.getElementById('item-modal-close').addEventListener('click', closeItemModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeItemModal();
  });

  return overlay;
}

function closeItemModal() {
  const overlay = document.getElementById('item-modal-overlay');
  if (overlay) overlay.hidden = true;
  document.body.style.overflow = '';
}

// Opens the item detail/customize modal. `onAdded` (optional) is called after a successful
// add-to-cart, e.g. so the calling page can refresh its "already in cart" quantity badges.
function openItemModal(item, onAdded) {
  const overlay = ensureItemModal();
  const content = document.getElementById('item-modal-content');

  let variantIndex = 0;
  const removed = new Set();
  const added = new Set();

  function currentTotal() {
    const variant = item.variants[variantIndex];
    let total = variant.price;

    if (item.customization) {
      total += added.size * item.customization.extraToppingPrice;
    } else {
      readSelectedOptions(content).forEach((opt) => {
        total += opt.price;
      });
    }

    return Math.round(total * 100) / 100;
  }

  function renderModalContent() {
    const variant = item.variants[variantIndex];

    const imageHTML = item.image
      ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="pizza-modal-image" />`
      : '';

    const variantHTML =
      item.variants.length > 1
        ? `
          <label class="field-label">Choose an option</label>
          <select class="variant-select" id="item-modal-variant">
            ${item.variants
              .map((v, i) => `<option value="${i}" ${i === variantIndex ? 'selected' : ''}>${escapeHtml(v.label)} — ${formatCurrency(v.price)}</option>`)
              .join('')}
          </select>
        `
        : '';

    const customizationHTML = item.customization
      ? `
          ${
            item.customization.defaultToppings.length
              ? `
            <label class="field-label">Remove any toppings (free)</label>
            <div class="option-choices">
              ${item.customization.defaultToppings
                .map(
                  (t) => `
                <label class="option-chip">
                  <input type="checkbox" data-remove-topping="${escapeHtml(t)}" ${removed.has(t) ? '' : 'checked'} />
                  <span>${escapeHtml(t)}</span>
                </label>
              `
                )
                .join('')}
            </div>
          `
              : ''
          }
          <label class="field-label">Add extra toppings (+${formatCurrency(item.customization.extraToppingPrice)} each)</label>
          <div class="option-choices">
            ${item.customization.availableToppings
              .map(
                (t) => `
              <label class="option-chip">
                <input type="checkbox" data-add-topping="${escapeHtml(t)}" ${added.has(t) ? 'checked' : ''} />
                <span>${escapeHtml(t)}</span>
              </label>
            `
              )
              .join('')}
          </div>
        `
      : '';

    const optionGroupsHTML = !item.customization ? renderOptionGroupsHTML(item, item._id) : '';

    content.innerHTML = `
      <div class="pizza-modal-header">
        ${imageHTML}
        <h2>${escapeHtml(item.name)}</h2>
        <p>${escapeHtml(item.description)}</p>
      </div>

      ${variantHTML}
      ${customizationHTML}
      ${optionGroupsHTML}

      <div class="pizza-modal-footer">
        <span class="price" data-modal-price>${formatCurrency(currentTotal())}</span>
        <button class="btn btn-primary" id="item-modal-add" type="button">Add to Cart</button>
      </div>
    `;

    function updatePrice() {
      content.querySelector('[data-modal-price]').textContent = formatCurrency(currentTotal());
    }

    const variantSelect = document.getElementById('item-modal-variant');
    if (variantSelect) {
      variantSelect.addEventListener('change', (e) => {
        variantIndex = Number(e.target.value);
        renderModalContent();
      });
    }

    content.querySelectorAll('[data-remove-topping]').forEach((box) => {
      box.addEventListener('change', () => {
        const t = box.getAttribute('data-remove-topping');
        if (box.checked) removed.delete(t);
        else removed.add(t);
        updatePrice();
      });
    });

    content.querySelectorAll('[data-add-topping]').forEach((box) => {
      box.addEventListener('change', () => {
        const t = box.getAttribute('data-add-topping');
        if (box.checked) added.add(t);
        else added.delete(t);
        updatePrice();
      });
    });

    if (!item.customization) {
      bindOptionGroupEvents(content, updatePrice);
    }

    document.getElementById('item-modal-add').addEventListener('click', () => {
      const finalVariant = item.variants[variantIndex];
      const finalTotal = currentTotal();

      let selectedOptions;
      let removedToppings;
      let addedToppings;

      if (item.customization) {
        selectedOptions = [
          ...Array.from(removed).map((t) => `No ${t}`),
          ...Array.from(added).map((t) => `Extra ${t} (+${formatCurrency(item.customization.extraToppingPrice)})`),
        ];
        removedToppings = Array.from(removed);
        addedToppings = Array.from(added);
      } else {
        selectedOptions = readSelectedOptions(content).map((opt) => opt.value);
      }

      addToCart({
        menuItemId: item._id,
        name: item.name,
        icon: item.icon,
        image: item.image,
        variantLabel: finalVariant.label,
        price: finalTotal,
        selectedOptions,
        ...(removedToppings ? { removedToppings } : {}),
        ...(addedToppings ? { addedToppings } : {}),
      });

      closeItemModal();
      showToast(`${item.name} added to cart!`, item.icon);
      if (typeof onAdded === 'function') onAdded();
    });
  }

  renderModalContent();
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
}
