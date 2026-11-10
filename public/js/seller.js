import { MockDB } from './common/mock-data.js';
import { renderNavbar, renderFooter, showToast } from './common/navbar.js';

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('seller');
  renderFooter();

  verifySellerAccessBanner();
  populateSellerCategories();
  updateCoverPreview();
  renderSellerInventory();
  bindSellerEvents();
});

function verifySellerAccessBanner() {
  const banner = document.getElementById('seller-role-banner');
  const session = MockDB.getSession();

  if (!session || (session.role !== 'vendedor' && session.role !== 'admin')) {
    banner.innerHTML = `
      <div>
        🔒 <strong>Vista protegida para el rol Vendedor.</strong> Activa la sesión de Vendedor para registrar o modificar inventario.
      </div>
      <div style="display:flex;gap:0.5rem;">
        <button id="btn-activate-seller" class="btn btn-primary btn-sm">Activar Rol Vendedor (Julio)</button>
        <a href="/login.html" class="btn btn-outline btn-sm">Ir a Login</a>
      </div>
    `;
    document.getElementById('btn-activate-seller')?.addEventListener('click', () => {
      const seller = MockDB.getUsers().find((u) => u.role === 'vendedor');
      if (seller) {
        MockDB.setSession(seller);
        window.location.reload();
      }
    });
  } else {
    banner.innerHTML = `
      <div>
        ✅ <strong>Panel de Vendedor Activo:</strong> Operando como <strong>${session.full_name}</strong> (Rol: <code>${session.role}</code>)
      </div>
      <span class="badge badge-success">Permisos de Inventario Verificados</span>
    `;
  }
}

function populateSellerCategories() {
    const categorySelect = document.getElementById('prod-category');

    if (!categorySelect) return;

    // Intentar obtener las categorías del MockDB
    let categories = MockDB.getCategories();

    // Si no hay categorías, utilizar una lista de respaldo
    if (!categories || categories.length === 0) {
        categories = [
            { id: 1, name: 'RPG y Acción' },
            { id: 2, name: 'Shooter y Cooperativo' },
            { id: 3, name: 'Terror y Supervivencia' },
            { id: 4, name: 'Lucha y Arcade' },
            { id: 5, name: 'Estrategia y Deportes' }
        ];
    }

    categorySelect.innerHTML = `
        <option value="">Seleccioná una categoría</option>
        ${categories.map(category => `
            <option value="${category.id}">
                ${category.name}
            </option>
        `).join('')}
    `;
}

function updateCoverPreview() {
  const title = document.getElementById('prod-title').value.trim() || 'Nuevo Videojuego';
  const price = Number(document.getElementById('prod-price').value || 0).toFixed(2);
  const rawUrl = document.getElementById('prod-image').value.trim();
  const fallback = MockDB.getFallbackCover(title);

  const imgEl = document.getElementById('prod-image-preview');
  imgEl.src = rawUrl || fallback;
  imgEl.onerror = () => {
    imgEl.onerror = null;
    imgEl.src = fallback;
  };

  document.getElementById('preview-title-text').textContent = title;
  document.getElementById('preview-price-text').textContent = `$${price} USD`;
}


function renderSellerInventory() {
  const session = MockDB.getSession();

  const searchInput = document.getElementById('seller-search-input');
  const onlyMineInput = document.getElementById('seller-only-mine');
  const tbody = document.getElementById('seller-products-tbody');

  const query = searchInput.value.trim().toLowerCase();
  const onlyMine = onlyMineInput.checked;

  let products = MockDB.getProducts();

  if (onlyMine && session) {
    products = products.filter(
      (p) => Number(p.seller_id) === Number(session.id)
    );
  }

  // Actualizar indicadores
  document.getElementById('kpi-seller-total').textContent = products.length;

  document.getElementById('kpi-seller-stock').textContent =
    products.reduce((total, p) => total + Number(p.stock || 0), 0);

  document.getElementById('kpi-seller-low').textContent =
    products.filter((p) => Number(p.stock) <= 5).length;

  // Filtrar productos
  const filtered = products.filter((p) => {
    const title = String(p.title || '').toLowerCase();
    const category = String(p.category_name || '').toLowerCase();
    const platform = String(p.platform || '').toLowerCase();

    return (
      !query ||
      title.includes(query) ||
      category.includes(query) ||
      platform.includes(query)
    );
  });

  // Limpiar tabla
  tbody.replaceChildren();

  if (filtered.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');

    cell.colSpan = 6;
    cell.textContent = 'No se encontraron videojuegos registrados con ese criterio.';
    cell.style.textAlign = 'center';
    cell.style.padding = '2rem';
    cell.style.color = 'var(--text-muted)';

    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  // Construir cada fila de forma segura
  filtered.forEach((p) => {
    const row = document.createElement('tr');

    // PORTADA
    const imageCell = document.createElement('td');
    const image = document.createElement('img');

    image.className = 'seller-thumb-mini';
    image.alt = `Portada de ${p.title || 'videojuego'}`;

    const fallback = MockDB.getFallbackCover(p.title || 'Videojuego');

    image.onerror = () => {
      image.onerror = null;
      image.src = fallback;
    };

    image.src = p.image_url || fallback;

    imageCell.appendChild(image);

    // NOMBRE Y PLATAFORMA
    const titleCell = document.createElement('td');

    const title = document.createElement('strong');
    title.textContent = p.title || 'Sin título';

    const platform = document.createElement('div');
    platform.style.fontSize = '0.78rem';
    platform.style.color = 'var(--text-muted)';
    platform.textContent = p.platform || 'Sin plataforma';

    titleCell.append(title, platform);

    // CATEGORÍA
    const categoryCell = document.createElement('td');
    categoryCell.textContent = p.category_name || 'General';

    // PRECIO
    const priceCell = document.createElement('td');

    const currentPrice = document.createElement('strong');
    currentPrice.style.color = 'var(--primary)';
    currentPrice.textContent = `$${Number(p.price || 0).toFixed(2)}`;

    priceCell.appendChild(currentPrice);

    if (p.old_price) {
      const oldPrice = document.createElement('div');
      oldPrice.style.fontSize = '0.74rem';
      oldPrice.style.textDecoration = 'line-through';
      oldPrice.style.color = 'var(--text-dim)';
      oldPrice.textContent = `$${Number(p.old_price).toFixed(2)}`;

      priceCell.appendChild(oldPrice);
    }

    // STOCK
    const stockCell = document.createElement('td');
    const stockControls = document.createElement('div');

    stockControls.className = 'stock-Quick-ctrl';

    const stock = Number(p.stock || 0);
    const stockClass =
      stock <= 0 ? 'badge-danger' :
      stock <= 5 ? 'badge-warning' :
      'badge-success';

    const decreaseButton = document.createElement('button');
    decreaseButton.className = 'btn btn-outline btn-sm';
    decreaseButton.textContent = '-1';
    decreaseButton.dataset.stockDelta = '-1';
    decreaseButton.dataset.id = p.id;

    const stockBadge = document.createElement('span');
    stockBadge.className = `badge ${stockClass}`;
    stockBadge.textContent = `${stock} uds`;

    const increaseButton = document.createElement('button');
    increaseButton.className = 'btn btn-outline btn-sm';
    increaseButton.textContent = '+5';
    increaseButton.dataset.stockDelta = '5';
    increaseButton.dataset.id = p.id;

    stockControls.append(
      decreaseButton,
      stockBadge,
      increaseButton
    );

    stockCell.appendChild(stockControls);

    // ACCIONES
    const actionsCell = document.createElement('td');

    const editButton = document.createElement('button');
    editButton.className = 'btn btn-outline btn-sm';
    editButton.textContent = '✏️ Editar';
    editButton.dataset.editProd = p.id;

    actionsCell.appendChild(editButton);

    // Agregar todas las celdas
    row.append(
      imageCell,
      titleCell,
      categoryCell,
      priceCell,
      stockCell,
      actionsCell
    );

    tbody.appendChild(row);
  });

  // Eventos de stock
  tbody.querySelectorAll('[data-stock-delta]').forEach((btn) => {
    btn.addEventListener('click', () => {
      adjustProductStock(
        Number(btn.dataset.id),
        Number(btn.dataset.stockDelta)
      );
    });
  });

  // Eventos de edición
  tbody.querySelectorAll('[data-edit-prod]').forEach((btn) => {
    btn.addEventListener('click', () => {
      loadProductIntoSellerForm(Number(btn.dataset.editProd));
    });
  });
}


function adjustProductStock(productId, delta) {
  const products = MockDB.getProducts();
  const target = products.find((p) => p.id === productId);
  if (!target) return;

  target.stock = Math.max(0, Number(target.stock) + delta);
  MockDB.saveProducts(products);
  renderSellerInventory();
  showToast(`Stock de "${target.title}" actualizado a ${target.stock} unidades.`, 'success');
}

function loadProductIntoSellerForm(productId) {
  const prod = MockDB.getProducts().find((p) => p.id === productId);
  if (!prod) return;

  document.getElementById('prod-edit-id').value = String(prod.id);
  document.getElementById('prod-title').value = prod.title;
  document.getElementById('prod-category').value = String(prod.category_id);
  document.getElementById('prod-platform').value = prod.platform;
  document.getElementById('prod-price').value = prod.price;
  document.getElementById('prod-old-price').value = prod.old_price || '';
  document.getElementById('prod-stock').value = prod.stock;
  document.getElementById('prod-image').value = prod.image_url;
  document.getElementById('prod-desc').value = prod.description;
  document.getElementById('prod-featured').checked = Boolean(prod.is_featured);

  document.getElementById('seller-form-title').textContent = `✏️ Editando: ${prod.title}`;
  document.getElementById('btn-submit-seller').textContent = '💾 Actualizar Videojuego';
  updateCoverPreview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetSellerForm() {
  document.getElementById('seller-product-form').reset();
  document.getElementById('prod-edit-id').value = '';
  document.getElementById('seller-form-title').textContent = '➕ Registrar Nuevo Videojuego';
  document.getElementById('btn-submit-seller').textContent = '💾 Guardar Videojuego en Catálogo';
  updateCoverPreview();
}

function bindSellerEvents() {
  ['prod-title', 'prod-price', 'prod-image'].forEach((id) => {
    document.getElementById(id).addEventListener('input', updateCoverPreview);
  });

  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('prod-image').value = btn.dataset.cover;
      updateCoverPreview();
    });
  });

  document.getElementById('btn-reset-seller-form').addEventListener('click', resetSellerForm);
  document.getElementById('seller-search-input').addEventListener('input', renderSellerInventory);
  document.getElementById('seller-only-mine').addEventListener('change', renderSellerInventory);

  document.getElementById('seller-product-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const editId = document.getElementById('prod-edit-id').value;
    const title = document.getElementById('prod-title').value.trim();
    const categoryId = Number(document.getElementById('prod-category').value);
    const platform = document.getElementById('prod-platform').value;
    const price = Number(document.getElementById('prod-price').value);
    const oldPriceRaw = document.getElementById('prod-old-price').value;
    const oldPrice = oldPriceRaw ? Number(oldPriceRaw) : null;
    const stock = Number(document.getElementById('prod-stock').value);
    const imageUrl = document.getElementById('prod-image').value.trim();
    const description = document.getElementById('prod-desc').value.trim();
    const isFeatured = document.getElementById('prod-featured').checked;

    if (!title || !description || !imageUrl || isNaN(price) || price <= 0 || isNaN(stock) || stock < 0) {
      showToast('Completa todos los campos obligatorios con valores válidos.', 'error');
      return;
    }

    const session = MockDB.getSession();
    const sellerId = session ? session.id : 2;
    const products = MockDB.getProducts();

    if (editId) {
      const idx = products.findIndex((p) => p.id === Number(editId));
      if (idx !== -1) {
        products[idx] = {
          ...products[idx],
          title,
          category_id: categoryId,
          platform,
          price,
          old_price: oldPrice,
          stock,
          image_url: imageUrl,
          description,
          is_featured: isFeatured
        };
        MockDB.saveProducts(products);
        showToast(`"${title}" actualizado correctamente.`, 'success');
      }
    } else {
      const nextId = products.length ? Math.max(...products.map((p) => p.id)) + 1 : 1;
      products.unshift({
        id: nextId,
        title,
        description,
        price,
        old_price: oldPrice,
        stock,
        platform,
        category_id: categoryId,
        seller_id: sellerId,
        is_featured: isFeatured,
        is_active: true,
        image_url: imageUrl
      });
      MockDB.saveProducts(products);
      showToast(`Videojuego "${title}" publicado en la tienda.`, 'success');
    }

    resetSellerForm();
    renderSellerInventory();
  });
}