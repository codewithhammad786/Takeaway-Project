let allMenuItems = [];
// Defaults to "popular" so first-time visitors see the highlights instead of a wall of ~75 items —
// "All Items" and every category are one click away in the sidebar.
let activeCategory = 'popular';

function itemsForActiveCategory() {
  if (activeCategory === 'all') return allMenuItems;
  if (activeCategory === 'popular') return allMenuItems.filter((i) => i.popular);
  return allMenuItems.filter((i) => i.category === activeCategory);
}

function renderMenuGrid() {
  const container = document.getElementById('menu-items');
  const items = itemsForActiveCategory();

  if (!items.length) {
    container.innerHTML =
      activeCategory === 'popular'
        ? '<p class="empty-state">No popular items right now — pick "All Items" or a category from the sidebar to browse everything.</p>'
        : '<p class="empty-state">No items in this category.</p>';
    return;
  }

  container.innerHTML = items.map(renderMenuCard).join('');
  bindMenuCards(container, items);
}

function setActiveCategory(category) {
  activeCategory = category;
  renderSidebar();
  renderMenuGrid();
  closeMobileSidebar();
}

// On mobile the sidebar is a collapsible panel instead of a fixed left rail — closing it after a
// category is picked gets the user straight to the results instead of leaving the panel open.
function closeMobileSidebar() {
  const sidebar = document.getElementById('category-sidebar');
  const toggle = document.getElementById('mobile-category-toggle');
  if (!sidebar || !toggle) return;
  sidebar.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
}

function renderSidebar() {
  const sidebarEl = document.getElementById('category-sidebar');
  renderCategorySidebar(sidebarEl, allMenuItems, { activeCategory, onSelect: setActiveCategory });
}

function showMenuError(message) {
  const feedback = document.getElementById('menu-feedback');
  feedback.textContent = message;
  feedback.className = 'feedback error';
  feedback.hidden = false;
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) {
    const here = window.location.pathname.split('/').pop() + window.location.search;
    window.location.href = `register.html?redirect=${encodeURIComponent(here)}`;
    return;
  }

  const container = document.getElementById('menu-items');
  try {
    allMenuItems = await apiRequest('/menu');

    const requestedCategory = new URLSearchParams(window.location.search).get('category');
    if (requestedCategory === 'all' || requestedCategory === 'popular' || allMenuItems.some((i) => i.category === requestedCategory)) {
      activeCategory = requestedCategory;
    }

    renderSidebar();
    renderMenuGrid();
    renderSidebarRatingBadge(document.getElementById('category-sidebar'));
  } catch (err) {
    container.innerHTML = '';
    showMenuError(`Couldn't load the menu: ${err.message}`);
  }

  const mobileToggle = document.getElementById('mobile-category-toggle');
  const sidebar = document.getElementById('category-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = sidebar.classList.toggle('open');
      mobileToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }
});
