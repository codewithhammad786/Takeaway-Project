// Shared category sidebar — used on both the menu page (filters the grid in place) and the home
// page (links out to the menu page pre-filtered to that category). Keeping the markup/behaviour in
// one place means every page gets the same bright, icon-heavy sidebar and the same category list.

const CATEGORY_ORDER = [
  'Popular Deals',
  'Grilled',
  'Persian',
  'Parmesan',
  'Meal Deals',
  'Grill Munch Boxes',
  'Pizza',
  'Build Your Own Pizza',
  'Calzone',
  'Combo Munch Boxes',
  'Burgers',
  'Kebabs',
  'Wraps',
  'Sides',
  'Sweet Treats',
  'Milkshakes',
];

// Groups the sidebar's categories into collapsible sections, mirroring how a real app sidebar
// organizes many nav items into labelled groups.
const CATEGORY_GROUPS = [
  { label: 'Featured', emoji: '🔥', categories: ['Popular Deals'] },
  { label: 'Pizza', emoji: '🍕', categories: ['Pizza', 'Build Your Own Pizza', 'Calzone'] },
  { label: 'Grill & Kebabs', emoji: '🍗', categories: ['Grilled', 'Persian', 'Parmesan', 'Kebabs'] },
  { label: 'Burgers & Wraps', emoji: '🍔', categories: ['Burgers', 'Wraps'] },
  { label: 'Meals & Boxes', emoji: '🍱', categories: ['Meal Deals', 'Grill Munch Boxes', 'Combo Munch Boxes'] },
  { label: 'Sides & Drinks', emoji: '🍟', categories: ['Sides', 'Milkshakes'] },
  { label: 'Sweets', emoji: '🍰', categories: ['Sweet Treats'] },
];

const CATEGORY_EMOJI = {
  'Popular Deals': '🔥',
  Grilled: '🍗',
  Persian: '🥙',
  Parmesan: '🧀',
  'Meal Deals': '🍽️',
  'Grill Munch Boxes': '🍱',
  Pizza: '🍕',
  'Build Your Own Pizza': '🍕',
  Calzone: '🥟',
  'Combo Munch Boxes': '🍱',
  Burgers: '🍔',
  Kebabs: '🌯',
  Wraps: '🌯',
  Sides: '🍟',
  'Sweet Treats': '🍰',
  Milkshakes: '🥤',
};

// Renders the sidebar into `sidebarEl` for the given menu items.
// - `activeCategory`: the currently selected category ('all' or a category name), or null if this
//   page has no notion of an active category (e.g. the home page just links out).
// - `getHref(category)`: if provided, categories render as real links (for pages that navigate away
//   to the menu). If omitted, categories render as buttons that call `onSelect(category)` instead
//   (for the menu page itself, which filters its grid in place).
function renderCategorySidebar(sidebarEl, items, { activeCategory = null, getHref = null, onSelect = null } = {}) {
  const categoriesPresent = CATEGORY_ORDER.filter((c) => items.some((i) => i.category === c));
  const isActive = (cat) => activeCategory !== null && cat === activeCategory;

  function categoryTag(cat, label) {
    const activeClass = isActive(cat) ? 'active' : '';
    const icon = `<span class="sidebar-icon">${CATEGORY_EMOJI[cat] || '🍽️'}</span>`;
    if (getHref) {
      return `<a class="sidebar-category ${activeClass}" href="${escapeHtml(getHref(cat))}">${icon}${escapeHtml(label)}</a>`;
    }
    return `<button class="sidebar-category ${activeClass}" data-category="${escapeHtml(cat)}" type="button">${icon}${escapeHtml(label)}</button>`;
  }

  let html = `<p class="category-sidebar-title">🍴 Menu</p>`;

  if (activeCategory !== null || getHref) {
    const popularHref = getHref ? getHref('popular') : null;
    const popularClass = isActive('popular') ? 'active' : '';
    const allHref = getHref ? getHref('all') : null;
    const allClass = isActive('all') ? 'active' : '';

    html += `<div class="sidebar-pinned-group">`;
    html += getHref
      ? `<a class="sidebar-category sidebar-category-all ${popularClass}" href="${escapeHtml(popularHref)}"><span class="sidebar-icon">🔥</span>Popular</a>`
      : `<button class="sidebar-category sidebar-category-all ${popularClass}" data-category="popular" type="button"><span class="sidebar-icon">🔥</span>Popular</button>`;
    html += getHref
      ? `<a class="sidebar-category sidebar-category-all ${allClass}" href="${escapeHtml(allHref)}"><span class="sidebar-icon">⭐</span>All Items</a>`
      : `<button class="sidebar-category sidebar-category-all ${allClass}" data-category="all" type="button"><span class="sidebar-icon">⭐</span>All Items</button>`;
    html += `</div>`;
  }

  CATEGORY_GROUPS.forEach((group) => {
    const groupCategories = group.categories.filter((c) => categoriesPresent.includes(c));
    if (!groupCategories.length) return;

    const isHot = group.label === 'Featured';
    html += `
      <details class="sidebar-group">
        <summary class="sidebar-group-title">
          <span class="sidebar-group-emoji">${group.emoji}</span>${escapeHtml(group.label)}
          ${isHot ? '<span class="sticker sticker-hot">🔥 Hot Deals</span>' : ''}
        </summary>
        <div class="sidebar-group-items">
          ${groupCategories.map((cat) => categoryTag(cat, cat)).join('')}
        </div>
      </details>
    `;
  });

  sidebarEl.innerHTML = html;

  if (!getHref && onSelect) {
    sidebarEl.querySelectorAll('.sidebar-category[data-category]').forEach((el) => {
      el.addEventListener('click', () => onSelect(el.getAttribute('data-category')));
    });
  }
}

// Fetches approved customer reviews and injects an honest "★ 4.8 (12 reviews)" trust sticker at
// the top of the sidebar — real numbers pulled from actual submitted reviews, not invented.
async function renderSidebarRatingBadge(sidebarEl) {
  try {
    const reviews = await apiRequest('/reviews');
    if (!reviews.length) return;

    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const badge = document.createElement('a');
    badge.className = 'sidebar-rating-badge';
    badge.href = 'contact.html';
    badge.innerHTML = `⭐ <strong>${avg.toFixed(1)}</strong> <span>(${reviews.length} review${reviews.length === 1 ? '' : 's'})</span>`;

    const title = sidebarEl.querySelector('.category-sidebar-title');
    if (title) title.insertAdjacentElement('afterend', badge);
  } catch (err) {
    // Silently skip the badge if reviews can't be loaded — it's a nice-to-have, not critical.
  }
}
