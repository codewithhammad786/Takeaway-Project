// The menu page used to have a left-hand category sidebar; it's now a row of quick-pick boxes
// above the grid. "All Items" is itself two levels: a grid of category tiles first, then that
// category's items once one is picked — rather than dumping every category's items on one page.

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

// Each box gets its own two-tone accent gradient, used for its icon badge, active ring, and hover
// glow — so the quick-pick row reads as a set of distinct categories (like a proper food-ordering
// app) rather than six identical boxes with different emoji.
const MENU_BOXES = [
  { key: 'popular', label: 'Popular Items', emoji: '🔥', match: (item) => item.popular, accent: ['#ff8a3d', '#ff3d3d'] },
  { key: 'todays-offers', label: "Today's Offers", emoji: '🎁', categories: ["Today's Offers"], sortByPrice: true, accent: ['#ff8ac2', '#d6337e'] },
  { key: 'all', label: 'All Items', emoji: '⭐', accent: ['#f2d98a', '#b8860b'] },
  // Calzone is deliberately left out here — it's a Pizza-tile item browsable via All Items, not part
  // of this Pizza + Meal Deal + Munch Box combined box.
  { key: 'pizza-meal-deals', label: 'Pizza & Meal Deals', emoji: '🍕', categories: ['Pizza', 'Build Your Own Pizza', 'Grill Munch Boxes', 'Combo Munch Boxes', 'Meal Deals'], accent: ['#ff5f5f', '#c81e1e'] },
  { key: 'munch-boxes', label: 'Munch Box Deals', emoji: '🍱', categories: ['Grill Munch Boxes', 'Combo Munch Boxes'], sortByPrice: true, accent: ['#3ddc84', '#1a8f57'] },
];

// The "All Items" browse grid — one tile per real menu heading. Each tile can cover more than one
// underlying category (e.g. "Munch Boxes" covers both Grill and Combo munch boxes) so the tile
// labels stay simple. A tile only shows up if at least one item actually exists in it.
const ALL_CATEGORY_TILES = [
  { label: 'Pizza', categories: ['Pizza', 'Build Your Own Pizza', 'Calzone'], emoji: '🍕', accent: ['#ff5f5f', '#c81e1e'] },
  { label: 'Parmesan', categories: ['Parmesan'], emoji: '🧀', accent: ['#ffd65c', '#e6ac00'] },
  { label: 'Kebab', categories: ['Kebabs'], emoji: '🍢', accent: ['#5fb8ff', '#1a6fd6'] },
  { label: 'Wrap', categories: ['Wraps'], emoji: '🌯', accent: ['#7ec8ff', '#2e86d6'] },
  { label: 'Burgers', categories: ['Burgers'], emoji: '🍔', accent: ['#e08a3c', '#96481a'] },
  { label: 'Grilled', categories: ['Grilled'], emoji: '🍗', accent: ['#ff8a3d', '#c8501e'] },
  { label: 'Persian', categories: ['Persian'], emoji: '🥙', accent: ['#c98bff', '#7b3fd6'] },
  { label: 'Sides', categories: ['Sides'], emoji: '🍟', accent: ['#ffd65c', '#c99a1f'] },
  { label: 'Sweet Treats', categories: ['Sweet Treats'], emoji: '🍰', accent: ['#ff8ac2', '#d6337e'] },
  { label: 'Milkshakes', categories: ['Milkshakes'], emoji: '🥤', accent: ['#8bd8ff', '#2e9ed6'] },
];

let allMenuItems = [];
// Defaults to "popular" so first-time visitors see the highlights instead of a wall of ~75 items.
let activeBox = 'popular';
// Which category tile is open within "All Items" — null means show the tile grid itself.
let activeCategory = null;
// A non-empty search query takes over the whole view (searches every item regardless of the
// active box/category), same idea as the sort dropdown layering on top of whatever's showing.
let searchQuery = '';
let sortMode = 'default';

function getMenuBox(key) {
  return MENU_BOXES.find((b) => b.key === key) || MENU_BOXES[0];
}

// Maps a single category name (e.g. from a home-page deal-card link) onto whichever quick box
// covers it, so deep links from the home page still land somewhere sensible.
function boxForCategory(category) {
  if (category === 'all' || MENU_BOXES.some((b) => b.key === category)) return category;
  const box = MENU_BOXES.find((b) => b.categories && b.categories.includes(category));
  return box ? box.key : 'all';
}

// Same idea, but for landing straight on an "All Items" tile (e.g. Grilled/Persian/Sides) rather
// than just the top-level tile grid, when a link names a category none of the 6 quick boxes cover.
function tileForCategory(category) {
  return ALL_CATEGORY_TILES.find((t) => t.categories.includes(category)) || null;
}

// The API sorts /menu results alphabetically by category then name (server/routes/menu.js), never
// by price — so a box that wants a price-ascending order (e.g. "arrange Munch Boxes lower to
// higher") has to sort for itself here rather than relying on whatever order items arrive in.
function sortByLowestPrice(items) {
  return [...items].sort((a, b) => a.variants[0].price - b.variants[0].price);
}

function itemsForBox(box) {
  let items;
  if (box.match) items = allMenuItems.filter(box.match);
  else if (box.categories) items = allMenuItems.filter((i) => box.categories.includes(i.category));
  else items = allMenuItems;

  return box.sortByPrice ? sortByLowestPrice(items) : items;
}

// The sort dropdown is a customer-facing override that applies on top of whatever's already being
// shown (a box's own order, a category's items, or search results) — "Recommended" just means
// leave that existing order alone.
function applySort(items) {
  if (sortMode === 'price-asc') return [...items].sort((a, b) => a.variants[0].price - b.variants[0].price);
  if (sortMode === 'price-desc') return [...items].sort((a, b) => b.variants[0].price - a.variants[0].price);
  return items;
}

function updateSortVisibility(show) {
  document.getElementById('menu-sort-wrap').hidden = !show;
}

function renderQuickBoxes() {
  const container = document.getElementById('menu-quickboxes');
  container.innerHTML = MENU_BOXES.map((box) => {
    const activeClass = box.key === activeBox ? 'active' : '';
    const [accentA, accentB] = box.accent;
    return `
      <button type="button" class="menu-quickbox ${activeClass}" data-box="${box.key}" style="--box-a: ${accentA}; --box-b: ${accentB};">
        <span class="menu-quickbox-emoji">${foodIconSvg(box.emoji, 28)}</span>
        <span class="menu-quickbox-label">${box.label}</span>
      </button>
    `;
  }).join('');

  container.querySelectorAll('[data-box]').forEach((btn) => {
    btn.addEventListener('click', () => setActiveBox(btn.getAttribute('data-box')));
  });
}

function setActiveBox(key) {
  activeBox = key;
  activeCategory = null;
  renderQuickBoxes();
  renderMenuGrid();
}

function renderCategoryTileGrid(container) {
  const tiles = ALL_CATEGORY_TILES.filter((t) => allMenuItems.some((i) => t.categories.includes(i.category)));

  if (!tiles.length) {
    container.innerHTML = '<p class="empty-state">No items available right now.</p>';
    return;
  }

  container.innerHTML = `
    <div class="menu-category-tiles">
      ${tiles
        .map(
          (tile) => `
        <button type="button" class="menu-category-tile" data-category-tile="${escapeHtml(tile.label)}" style="--tile-a: ${tile.accent[0]}; --tile-b: ${tile.accent[1]};">
          <span class="menu-category-tile-emoji">${foodIconSvg(tile.emoji, 24)}</span>
          <span class="menu-category-tile-label">${escapeHtml(tile.label)}</span>
        </button>
      `
        )
        .join('')}
    </div>
  `;

  container.querySelectorAll('[data-category-tile]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.getAttribute('data-category-tile');
      renderMenuGrid();
    });
  });
}

function renderCategoryItemsView(container, tileLabel) {
  const tile = ALL_CATEGORY_TILES.find((t) => t.label === tileLabel);
  // Falls back to matching the raw category name directly — used for categories that have their own
  // quick-pick box (so intentionally have no tile in the grid, e.g. "Popular Deals") but can still be
  // deep-linked to from elsewhere on the site, like a home-page deal card.
  const items = applySort(tile ? allMenuItems.filter((i) => tile.categories.includes(i.category)) : allMenuItems.filter((i) => i.category === tileLabel));

  container.innerHTML = `
    <button type="button" class="menu-back-link" data-back-to-categories>← All Categories</button>
    <section class="menu-category-section">
      <h2 class="menu-category-heading">
        <span class="menu-category-heading-emoji">${foodIconSvg(tile ? tile.emoji : '🍽️', 22)}</span>${escapeHtml(tileLabel)}
      </h2>
      <div class="menu-grid">${items.map(renderMenuCard).join('')}</div>
    </section>
  `;

  container.querySelector('[data-back-to-categories]').addEventListener('click', () => {
    activeCategory = null;
    renderMenuGrid();
  });

  bindMenuCards(container, items);
}

// A search query overrides whatever box/category is active and searches every item by name —
// clearing the search box goes back to exactly where the customer was browsing.
function renderSearchResults(container, query) {
  const q = query.trim().toLowerCase();
  const items = applySort(allMenuItems.filter((i) => i.name.toLowerCase().includes(q)));
  updateSortVisibility(true);

  if (!items.length) {
    container.innerHTML = `<p class="empty-state">No items match "${escapeHtml(query)}" — try a different search.</p>`;
    return;
  }

  container.innerHTML = `
    <section class="menu-category-section">
      <h2 class="menu-category-heading">Search results <span class="menu-search-count">(${items.length})</span></h2>
      <div class="menu-grid">${items.map(renderMenuCard).join('')}</div>
    </section>
  `;
  bindMenuCards(container, items);
}

function renderMenuGrid() {
  const container = document.getElementById('menu-items');

  if (searchQuery.trim()) {
    renderSearchResults(container, searchQuery);
    return;
  }

  const box = getMenuBox(activeBox);

  if (box.key === 'all') {
    updateSortVisibility(Boolean(activeCategory));
    if (activeCategory) {
      renderCategoryItemsView(container, activeCategory);
    } else {
      renderCategoryTileGrid(container);
    }
    return;
  }

  updateSortVisibility(true);
  const items = applySort(itemsForBox(box));
  if (!items.length) {
    container.innerHTML = `<p class="empty-state">No items in ${escapeHtml(box.label)} right now — try "All Items".</p>`;
    return;
  }

  container.innerHTML = `
    <section class="menu-category-section">
      <h2 class="menu-category-heading">
        <span class="menu-category-heading-emoji">${foodIconSvg(box.emoji, 22)}</span>${escapeHtml(box.label)}
      </h2>
      <div class="menu-grid">${items.map(renderMenuCard).join('')}</div>
    </section>
  `;
  bindMenuCards(container, items);
}

function showMenuError(message) {
  const feedback = document.getElementById('menu-feedback');
  feedback.textContent = message;
  feedback.className = 'feedback error';
  feedback.hidden = false;
}

// Shows the real average from actual submitted reviews — never a made-up number. If there are no
// reviews yet, nothing is shown rather than claiming a rating that doesn't exist.
async function renderMenuRatingBadge() {
  const holder = document.getElementById('menu-rating-badge');
  if (!holder) return;

  try {
    const reviews = await apiRequest('/reviews');
    if (!reviews.length) return;

    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    holder.innerHTML = `
      <a class="menu-rating-badge" href="contact.html">
        ⭐ <strong>${avg.toFixed(1)}</strong> <span>(${reviews.length} review${reviews.length === 1 ? '' : 's'})</span>
      </a>
    `;
  } catch (err) {
    // Not critical if this fails to load.
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!hasGuestDetails()) {
    redirectToGuestGate();
    return;
  }

  const container = document.getElementById('menu-items');
  try {
    allMenuItems = await apiRequest('/menu');

    const requestedCategory = new URLSearchParams(window.location.search).get('category');
    if (requestedCategory) {
      activeBox = boxForCategory(requestedCategory);
      if (activeBox === 'all') {
        const tile = tileForCategory(requestedCategory);
        activeCategory = tile ? tile.label : requestedCategory;
      }
    }

    renderQuickBoxes();
    renderMenuGrid();
    renderMenuRatingBadge();

    document.getElementById('menu-search-input').addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderMenuGrid();
    });

    document.getElementById('menu-sort-select').addEventListener('change', (e) => {
      sortMode = e.target.value;
      renderMenuGrid();
    });
  } catch (err) {
    container.innerHTML = '';
    showMenuError(`Couldn't load the menu: ${err.message}`);
  }
});
