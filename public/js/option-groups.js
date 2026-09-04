// Shared rendering/reading helpers for an item's option groups (Drink, Flavour, Salad, Sauce, etc.) —
// used by the item detail modal. A single-choice group with several options becomes a dropdown; a
// single optional add-on becomes a plain checkbox; anything letting you pick several (Salad, Sauce,
// Sides) collapses behind a <details> toggle so it doesn't dominate the modal by default.

function renderOptionSelectGroup(group, groupId) {
  return `
    <div class="option-group" data-max="1">
      <label class="field-label" for="${groupId}">${escapeHtml(group.label)}</label>
      <select class="option-select" id="${groupId}">
        ${!group.required ? `<option value="">Select ${escapeHtml(group.label).replace(/^Choose /i, '')}…</option>` : ''}
        ${group.choices
          .map(
            (choice, i) => `
          <option value="${escapeHtml(choice.label)}" data-price="${choice.price || 0}" ${group.required && i === 0 ? 'selected' : ''}>
            ${escapeHtml(choice.label)}${choice.price ? ` (+${formatCurrency(choice.price)})` : ''}
          </option>
        `
          )
          .join('')}
      </select>
    </div>
  `;
}

function renderOptionSingleCheckboxGroup(group) {
  const choice = group.choices[0];
  return `
    <div class="option-group" data-max="1">
      <label class="option-chip option-chip-standalone">
        <input type="checkbox" value="${escapeHtml(choice.label)}" data-price="${choice.price || 0}" />
        <span>Add ${escapeHtml(choice.label)}${choice.price ? ` <span class="option-price">+${formatCurrency(choice.price)}</span>` : ''}</span>
      </label>
    </div>
  `;
}

function renderOptionCollapsibleGroup(group, groupName) {
  return `
    <details class="option-group option-details" data-max="${group.max}">
      <summary class="field-label option-summary">${escapeHtml(group.label)} <span class="option-summary-count"></span></summary>
      <div class="option-choices">
        ${group.choices
          .map(
            (choice) => `
          <label class="option-chip">
            <input type="checkbox" name="${groupName}" value="${escapeHtml(choice.label)}" data-price="${choice.price || 0}" />
            <span>${escapeHtml(choice.label)}${choice.price ? ` <span class="option-price">+${formatCurrency(choice.price)}</span>` : ''}</span>
          </label>
        `
          )
          .join('')}
      </div>
    </details>
  `;
}

// Renders every option group an item has, given a unique id/name prefix (usually the item id).
// `variantLabel` is the customer's currently selected variant (e.g. "Single"/"Meal") — a group
// marked `mealOnly` (like the Grilled section's side/drink choices) is skipped when "Single" is
// selected, since those only come with the Meal price; conversely `singleOnly` (like the Grilled
// section's own salad option) is skipped when "Meal" is selected.
function renderOptionGroupsHTML(item, idPrefix, variantLabel) {
  return (item.optionGroups || [])
    .filter((group) => !(group.mealOnly && variantLabel === 'Single') && !(group.singleOnly && variantLabel === 'Meal'))
    .map((group, groupIndex) => {
      if (group.max === 1 && group.choices.length > 1) {
        return renderOptionSelectGroup(group, `option-${escapeHtml(idPrefix)}-${groupIndex}`);
      }
      if (group.max === 1 && group.choices.length === 1) {
        return renderOptionSingleCheckboxGroup(group);
      }
      return renderOptionCollapsibleGroup(group, `option-${escapeHtml(idPrefix)}-${groupIndex}`);
    })
    .join('');
}

// Reads every option group's current selection, regardless of whether it's rendered as a
// dropdown, a standalone checkbox, or a collapsible checkbox list.
function readSelectedOptions(container) {
  const selected = [];
  container.querySelectorAll('.option-group').forEach((groupEl) => {
    const select = groupEl.querySelector('select.option-select');
    if (select) {
      if (select.value) {
        const opt = select.options[select.selectedIndex];
        selected.push({ value: select.value, price: Number(opt.getAttribute('data-price')) || 0 });
      }
      return;
    }
    groupEl.querySelectorAll('input:checked').forEach((input) => {
      selected.push({ value: input.value, price: Number(input.getAttribute('data-price')) || 0 });
    });
  });
  return selected;
}

// Wires up change listeners for every option group inside `container`, enforcing each
// collapsible group's max-selection limit and calling `onChange` whenever a selection changes.
function bindOptionGroupEvents(container, onChange) {
  container.querySelectorAll('.option-group').forEach((groupEl) => {
    const select = groupEl.querySelector('select.option-select');
    if (select) {
      select.addEventListener('change', onChange);
      return;
    }

    const max = Number(groupEl.getAttribute('data-max'));
    const checkboxes = groupEl.querySelectorAll('input[type="checkbox"]');
    const summaryCount = groupEl.querySelector('.option-summary-count');

    checkboxes.forEach((box) => {
      box.addEventListener('change', () => {
        const checkedCount = groupEl.querySelectorAll('input[type="checkbox"]:checked').length;
        checkboxes.forEach((b) => {
          if (!b.checked) b.disabled = checkedCount >= max;
        });
        if (summaryCount) {
          summaryCount.textContent = checkedCount > 0 ? `(${checkedCount} selected)` : '';
        }
        onChange();
      });
    });
  });
}
