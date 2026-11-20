import { apiRequest, getFallbackCover, notifyCartUpdated } from './common/api.js';
import { renderNavbar, renderFooter, showToast } from './common/navbar.js';

let activeCategoryId = 'all';
let currentProducts = [];
let searchTimer = null;



document.addEventListener('DOMContentLoaded', async () => {
  await renderNavbar('index');
  renderFooter();

  bindCatalogEvents();
  await populateCategoryControls();
  await loadInitialHighlights();
  await applyCatalogFilters();
});

function calculateDiscountPercent(price, oldPrice) {
  if (!oldPrice || Number(oldPrice) <= Number(price)) return 0;
  return Math.round(((Number(oldPrice) - Number(price)) / Number(oldPrice)) * 100);
}

async function populateCategoryControls() {
  const select = document.getElementById('filter-category');
  const pillsContainer = document.getElementById('category-pills-container');

  try {
    const data = await apiRequest('/api/categories');
    const categories = data.categories || [];

    categories.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = String(cat.id);
      opt.textContent = cat.name;
      select.appendChild(opt);
    });

    let pillsHtml = `<button class="cat-pill active" data-cat="all">Todos</button>`;
    categories.forEach((cat) => {
      pillsHtml += `<button class="cat-pill" data-cat="${cat.id}">${cat.name}</button>`;
    });
    pillsContainer.innerHTML = pillsHtml;

    pillsContainer.querySelectorAll('.cat-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCategoryId = btn.dataset.cat;
        select.value = activeCategoryId;
        syncCategoryPills();
        applyCatalogFilters();
      });
    });
  } catch (err) {
    showToast(`No se pudieron cargar las categorías: ${err.message}`, 'error');
  }
}

function syncCategoryPills() {
  document.querySelectorAll('.cat-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cat === String(activeCategoryId));
  });
}

async function loadInitialHighlights() {
  try {
    const data = await apiRequest('/api/products?sort=featured');
    const products = data.products || [];
    renderHeroShowcase(products);
    renderFeaturedDeals(products);
  } catch (err) {
    showToast(`Error al cargar destacados: ${err.message}`, 'error');
  }
}

function renderHeroShowcase(products) {
  const host = document.getElementById('hero-featured-card');
  const featured = products.find((p) => p.is_featured) || products[0];
  if (!featured || !host) return;

  const fallback = getFallbackCover(featured.title);
  const discount = calculateDiscountPercent(featured.price, featured.old_price);

  host.innerHTML = `
    <div class="hero-showcase-card">
      <img src="${featured.image_url}" alt="${featured.title}" onerror="this.onerror=null;this.src='${fallback}';" />
      <div class="hero-showcase-body">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
          <span class="badge badge-success">DESTACADO DE HOY</span>
          ${discount > 0 ? `<span class="badge badge-discount">-${discount}% OFF</span>` : ''}
        </div>
        <h3 style="font-family:var(--font-display);font-size:1.2rem;margin-bottom:0.35rem;">${featured.title}</h3>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:0.9rem;">${featured.description}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            ${featured.old_price ? `<span class="old-price">$${Number(featured.old_price).toFixed(2)}</span>` : ''}
            <div class="current-price">$${Number(featured.price).toFixed(2)}</div>
          </div>
          <button class="btn btn-primary btn-sm" data-quick-buy="${featured.id}" ${featured.stock <= 0 ? 'disabled' : ''}>
            ${featured.stock > 0 ? '+ Agregar al Carrito' : 'Sin Stock'}
          </button>
        </div>
      </div>
    </div>
  `;

  host.querySelector('[data-quick-buy]')?.addEventListener('click', () => {
    handleAddToCart(featured.id);
  });
}

function renderFeaturedDeals(products) {
  const grid = document.getElementById('featured-deals-grid');
  if (!grid) return;

  const deals = products
    .filter((p) => p.old_price && Number(p.old_price) > Number(p.price))
    .slice(0, 4);

  grid.innerHTML = deals
    .map((game) => {
      const discount = calculateDiscountPercent(game.price, game.old_price);
      const fallback = getFallbackCover(game.title);
      return `
        <article class="deal-mini-card">
          <div class="game-thumb-wrap" style="height:135px;">
            <img class="game-thumb" src="${game.image_url}" alt="${game.title}" onerror="this.onerror=null;this.src='${fallback}';" />
            <div class="game-badges-top">
              <span class="badge badge-discount">-${discount}%</span>
              <span class="badge badge-success">${game.platform}</span>
            </div>
          </div>
          <div class="game-body">
            <h4 class="game-title" style="font-size:0.95rem;">${game.title}</h4>
            <div class="game-footer">
              <div class="price-box">
                <span class="old-price">$${Number(game.old_price).toFixed(2)}</span>
                <span class="current-price" style="font-size:1.05rem;">$${Number(game.price).toFixed(2)}</span>
              </div>
              <button class="btn btn-accent btn-sm" data-add-id="${game.id}" ${game.stock <= 0 ? 'disabled' : ''}>
                ${game.stock > 0 ? 'Agregar' : 'Agotado'}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  grid.querySelectorAll('[data-add-id]').forEach((btn) => {
    btn.addEventListener('click', () => handleAddToCart(Number(btn.dataset.addId)));
  });
}

async function applyCatalogFilters() {
  const query = document.getElementById('search-input').value.trim();
  const platform = document.getElementById('filter-platform').value;
  const sortBy = document.getElementById('filter-sort').value;
  const onlyOffers = document.getElementById('filter-only-offers').checked;

  const params = new URLSearchParams();
  if (query) params.set('search', query);
  if (activeCategoryId !== 'all') params.set('category', activeCategoryId);
  if (platform !== 'all') params.set('platform', platform);
  if (onlyOffers) params.set('onlyOffers', 'true');
  if (sortBy) params.set('sort', sortBy);

  try {
    const data = await apiRequest(`/api/products?${params.toString()}`);
    currentProducts = data.products || [];
    renderCatalogGrid(currentProducts);
  } catch (err) {
    document.getElementById('results-counter').textContent = 'Error al cargar el catálogo.';
    showToast(err.message, 'error');
  }
}

function renderCatalogGrid(products) {
  const grid = document.getElementById('catalog-grid');
  const counter = document.getElementById('results-counter');
  counter.textContent = `Mostrando ${products.length} videojuego(s) en el catálogo`;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-catalog">
        <h3 style="margin-bottom:0.4rem;">No se encontraron videojuegos con esos filtros</h3>
        <p style="color:var(--text-muted);margin-bottom:1rem;">Prueba limpiando el buscador o cambiando la categoría seleccionada.</p>
        <button id="btn-reset-filters" class="btn btn-primary btn-sm">Restablecer Filtros</button>
      </div>
    `;
    document.getElementById('btn-reset-filters')?.addEventListener('click', resetAllFilters);
    return;
  }

  grid.innerHTML = products
    .map((game) => {
      const discount = calculateDiscountPercent(game.price, game.old_price);
      const fallback = getFallbackCover(game.title);
      const stockBadge =
        game.stock > 0
          ? `<span class="badge badge-success">Stock: ${game.stock}</span>`
          : `<span class="badge badge-danger">Agotado</span>`;

      return `
        <article class="game-card">
          <div class="game-thumb-wrap">
            <img class="game-thumb" src="${game.image_url}" alt="${game.title}" onerror="this.onerror=null;this.src='${fallback}';" />
            <div class="game-badges-top">
              <span>${discount > 0 ? `<span class="badge badge-discount">-${discount}%</span>` : ''}</span>
              ${stockBadge}
            </div>
          </div>

          <div class="game-body">
            <div class="game-meta-row">
              <span>${game.category_name}</span>
              <span>${game.platform}</span>
            </div>
            <h3 class="game-title">${game.title}</h3>
            <p class="game-desc">${game.description}</p>

            <div class="game-footer">
              <div class="price-box">
                ${game.old_price ? `<span class="old-price">$${Number(game.old_price).toFixed(2)}</span>` : ''}
                <span class="current-price">$${Number(game.price).toFixed(2)}</span>
              </div>
              <div class="card-actions">
                <button class="btn btn-outline btn-sm" data-detail-id="${game.id}">Detalles</button>
                <button class="btn btn-primary btn-sm" data-buy-id="${game.id}" ${game.stock <= 0 ? 'disabled' : ''}>
                  ${game.stock > 0 ? '+ Carrito' : 'Sin Stock'}
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  grid.querySelectorAll('[data-buy-id]').forEach((btn) => {
    btn.addEventListener('click', () => handleAddToCart(Number(btn.dataset.buyId)));
  });

  grid.querySelectorAll('[data-detail-id]').forEach((btn) => {
    btn.addEventListener('click', () => openGameDetailModal(Number(btn.dataset.detailId)));
  });
}

async function handleAddToCart(productId) {
  try {
    const res = await apiRequest('/api/cart', {
      method: 'POST',
      body: { product_id: productId, quantity: 1 }
    });
    notifyCartUpdated(res.cart.total_items);
    showToast(res.message, 'success');
  } catch (err) {
    if (err.status === 401) {
      showToast('Inicia sesión para agregar videojuegos a tu carrito.', 'info');
      setTimeout(() => {
        window.location.href = './login.html';
      }, 800);
      return;
    }
    showToast(err.message, 'error');
  }
}

async function openGameDetailModal(productId) {
  let game = currentProducts.find((p) => p.id === Number(productId));

  if (!game) {
    try {
      const res = await apiRequest(`/api/products/${productId}`);
      game = res.product;
    } catch (err) {
      showToast(err.message, 'error');
      return;
    }
  }

  const modal = document.getElementById('game-detail-modal');
  const titleEl = document.getElementById('modal-game-title');
  const bodyEl = document.getElementById('modal-game-body');
  const fallback = getFallbackCover(game.title);

  titleEl.textContent = game.title;
  bodyEl.innerHTML = `
    <img src="${game.image_url}" alt="${game.title}" style="width:100%;height:230px;object-fit:cover;border-radius:var(--radius-sm);margin-bottom:1rem;" onerror="this.onerror=null;this.src='${fallback}';" />
    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.8rem;">
      <span class="badge badge-success">${game.category_name}</span>
      <span class="badge badge-warning">${game.platform}</span>
      <span class="badge ${game.stock > 0 ? 'badge-success' : 'badge-danger'}">Unidades disponibles: ${game.stock}</span>
    </div>
    <p style="color:var(--text-muted);margin-bottom:1.2rem;">${game.description}</p>
    <div style="display:flex;justify-content:space-between;align-items:center;padding-top:1rem;border-top:1px solid var(--border-color);">
      <div>
        ${game.old_price ? `<span class="old-price">$${Number(game.old_price).toFixed(2)}</span>` : ''}
        <div class="current-price">$${Number(game.price).toFixed(2)} USD</div>
      </div>
      <div style="display:flex;gap:0.6rem;">
        <button id="modal-add-cart" class="btn btn-primary" ${game.stock <= 0 ? 'disabled' : ''}>Agregar al Carrito</button>
        <a href="./buyer.html" class="btn btn-accent">Ir a Pagar</a>
      </div>
    </div>
  `;

  bodyEl.querySelector('#modal-add-cart')?.addEventListener('click', async () => {
    await handleAddToCart(game.id);
    modal.classList.remove('open');
  });

  modal.classList.add('open');
}

function resetAllFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-category').value = 'all';
  document.getElementById('filter-platform').value = 'all';
  document.getElementById('filter-sort').value = 'featured';
  document.getElementById('filter-only-offers').checked = false;
  activeCategoryId = 'all';
  syncCategoryPills();
  applyCatalogFilters();
}

function bindCatalogEvents() {
  document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyCatalogFilters, 220);
  });

  document.getElementById('btn-search-clear').addEventListener('click', resetAllFilters);

  document.getElementById('filter-category').addEventListener('change', (e) => {
    activeCategoryId = e.target.value;
    syncCategoryPills();
    applyCatalogFilters();
  });

  document.getElementById('filter-platform').addEventListener('change', applyCatalogFilters);
  document.getElementById('filter-sort').addEventListener('change', applyCatalogFilters);
  document.getElementById('filter-only-offers').addEventListener('change', applyCatalogFilters);

  document.getElementById('btn-hero-deals').addEventListener('click', () => {
    document.getElementById('filter-only-offers').checked = true;
    applyCatalogFilters();
    document.getElementById('catalogo-principal').scrollIntoView({ behavior: 'smooth' });
  });

  const modal = document.getElementById('game-detail-modal');
  document.getElementById('btn-close-modal').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

}