import { apiRequest, getFallbackCover } from './common/api.js';
import { renderNavbar, renderFooter, showToast } from './common/navbar.js';

let currentSession = null;
let loadedProducts = [];
let sellerSearchTimer = null;
let previewObjectUrl = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentSession = await renderNavbar('seller');
  renderFooter();

  if (!currentSession) {
    showToast('Debes iniciar sesión como Vendedor o Administrador.', 'info');
    window.location.href = './login.html';
    return;
  }

  if (currentSession.role !== 'vendedor' && currentSession.role !== 'admin') {
    showToast('Acceso denegado: tu cuenta no tiene permisos de Vendedor.', 'error');
    window.location.href = './index.html';
    return;
  }

  renderSellerAccessBanner(currentSession);
  bindSellerEvents();
  await populateSellerCategories();
  updateCoverPreview();
  await renderSellerInventory();
});

function renderSellerAccessBanner(session) {
  const banner = document.getElementById('seller-role-banner');
  banner.innerHTML = `
    <div>
      ✅ <strong>Panel de Vendedor Activo:</strong> Operando como <strong>${session.full_name}</strong> (Rol: <code>${session.role}</code>)
    </div>
    <span class="badge badge-success">Permisos de Inventario Verificados</span>
  `;
}

async function populateSellerCategories() {
  const categorySelect = document.getElementById('prod-category');
  if (!categorySelect) return;

  try {
    const data = await apiRequest('/api/categories');
    const categories = data.categories || [];
    categorySelect.innerHTML = `
      <option value="">Selecciona una categoría</option>
      ${categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}
    `;
  } catch (err) {
    showToast(`Error al cargar categorías: ${err.message}`, 'error');
  }
}

function updateCoverPreview() {
  const title = document.getElementById('prod-title').value.trim() || 'Nuevo Videojuego';
  const price = Number(document.getElementById('prod-price').value || 0).toFixed(2);
  const rawUrl = document.getElementById('prod-image').value.trim();
  const fileInput = document.getElementById('prod-image-file');
  const fallback = getFallbackCover(title);
  const imgEl = document.getElementById('prod-image-preview');

  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }

  if (fileInput && fileInput.files && fileInput.files[0]) {
    previewObjectUrl = URL.createObjectURL(fileInput.files[0]);
    imgEl.src = previewObjectUrl;
  } else {
    imgEl.src = rawUrl || fallback;
  }

  imgEl.onerror = () => {
    imgEl.onerror = null;
    imgEl.src = fallback;
  };

  document.getElementById('preview-title-text').textContent = title;
  document.getElementById('preview-price-text').textContent = `$${price} USD`;
}

async function renderSellerInventory() {
  const searchInput = document.getElementById('seller-search-input');
  const onlyMineInput = document.getElementById('seller-only-mine');
  const tbody = document.getElementById('seller-products-tbody');

  const params = new URLSearchParams({ includeInactive: 'true' });
  if (onlyMineInput.checked) params.set('mine', 'true');
  if (searchInput.value.trim()) params.set('search', searchInput.value.trim());

  try {
    const data = await apiRequest(`/api/products?${params.toString()}`);
    loadedProducts = data.products || [];

    document.getElementById('kpi-seller-total').textContent = loadedProducts.length;
    document.getElementById('kpi-seller-stock').textContent = loadedProducts.reduce(
      (total, p) => total + Number(p.stock || 0),
      0
    );
    document.getElementById('kpi-seller-low').textContent = loadedProducts.filter(
      (p) => Number(p.stock) <= 5
    ).length;



    tbody.replaceChildren();

    

    if (loadedProducts.length === 0) {
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

    loadedProducts.forEach((p) => {
      const canModify =
        currentSession.role === 'admin' || Number(p.seller_id) === Number(currentSession.id);
      const row = document.createElement('tr');

      const imageCell = document.createElement('td');
      const image = document.createElement('img');
      image.className = 'seller-thumb-mini';
      image.alt = `Portada de ${p.title || 'videojuego'}`;
      const fallback = getFallbackCover(p.title || 'Videojuego');
      image.onerror = () => {
        image.onerror = null;
        image.src = fallback;
      };
      image.src = p.image_url || fallback;
      imageCell.appendChild(image);

      const titleCell = document.createElement('td');
      const title = document.createElement('strong');
      title.textContent = p.title || 'Sin título';
      const platform = document.createElement('div');
      platform.style.fontSize = '0.78rem';
      platform.style.color = 'var(--text-muted)';
      platform.textContent = p.platform || 'Sin plataforma';
      titleCell.append(title, platform);

      const categoryCell = document.createElement('td');
      categoryCell.textContent = p.category_name || 'General';

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

      const stockCell = document.createElement('td');
      const stockControls = document.createElement('div');
      stockControls.className = 'stock-Quick-ctrl';

      const stock = Number(p.stock || 0);
      const stockClass =
        stock <= 0 ? 'badge-danger' : stock <= 5 ? 'badge-warning' : 'badge-success';

      const decreaseButton = document.createElement('button');
      decreaseButton.className = 'btn btn-outline btn-sm';
      decreaseButton.textContent = '-1';
      decreaseButton.disabled = !canModify;
      decreaseButton.dataset.stockDelta = '-1';
      decreaseButton.dataset.id = p.id;

      const stockBadge = document.createElement('span');
      stockBadge.className = `badge ${stockClass}`;
      stockBadge.textContent = `${stock} uds`;

      const increaseButton = document.createElement('button');
      increaseButton.className = 'btn btn-outline btn-sm';
      increaseButton.textContent = '+5';
      increaseButton.disabled = !canModify;
      increaseButton.dataset.stockDelta = '5';
      increaseButton.dataset.id = p.id;

      stockControls.append(decreaseButton, stockBadge, increaseButton);
      stockCell.appendChild(stockControls);

      const actionsCell = document.createElement('td');
      const editButton = document.createElement('button');
      editButton.className = 'btn btn-outline btn-sm';
      editButton.textContent = canModify ? '✏️ Editar' : '🔒 Otro vendedor';
      editButton.disabled = !canModify;
      editButton.dataset.editProd = p.id;
      actionsCell.appendChild(editButton);

      row.append(imageCell, titleCell, categoryCell, priceCell, stockCell, actionsCell);
      tbody.appendChild(row);
    });

    tbody.querySelectorAll('[data-stock-delta]').forEach((btn) => {
      btn.addEventListener('click', () => {
        adjustProductStock(Number(btn.dataset.id), Number(btn.dataset.stockDelta));
      });
    });

    tbody.querySelectorAll('[data-edit-prod]').forEach((btn) => {
      btn.addEventListener('click', () => {
        loadProductIntoSellerForm(Number(btn.dataset.editProd));
      });
    });
  } catch (err) {
    showToast(`Error al cargar inventario: ${err.message}`, 'error');
  }
}

async function adjustProductStock(productId, delta) {
  try {
    const res = await apiRequest(`/api/products/${productId}/stock`, {
      method: 'PATCH',
      body: { delta }
    });
    showToast(res.message, 'success');
    await renderSellerInventory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function loadProductIntoSellerForm(productId) {
  const prod = loadedProducts.find((p) => p.id === productId);
  if (!prod) return;

  document.getElementById('prod-edit-id').value = String(prod.id);
  document.getElementById('prod-title').value = prod.title;
  document.getElementById('prod-category').value = String(prod.category_id);
  document.getElementById('prod-platform').value = prod.platform;
  document.getElementById('prod-price').value = prod.price;
  document.getElementById('prod-old-price').value = prod.old_price || '';
  document.getElementById('prod-stock').value = prod.stock;
  document.getElementById('prod-image').value = prod.image_url;
  document.getElementById('prod-image-file').value = '';
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

  document.getElementById('prod-image-file').addEventListener('change', updateCoverPreview);

  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('prod-image-file').value = '';
      document.getElementById('prod-image').value = btn.dataset.cover;
      updateCoverPreview();
    });
  });

  document.getElementById('btn-reset-seller-form').addEventListener('click', resetSellerForm);

  document.getElementById('seller-search-input').addEventListener('input', () => {
    clearTimeout(sellerSearchTimer);
    sellerSearchTimer = setTimeout(renderSellerInventory, 220);
  });

  document.getElementById('seller-only-mine').addEventListener('change', renderSellerInventory);

  document.getElementById('seller-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const editId = document.getElementById('prod-edit-id').value;
    const title = document.getElementById('prod-title').value.trim();
    const categoryId = Number(document.getElementById('prod-category').value);
    const platform = document.getElementById('prod-platform').value;
    const price = Number(document.getElementById('prod-price').value);
    const oldPriceRaw = document.getElementById('prod-old-price').value.trim();
    const stock = Number(document.getElementById('prod-stock').value);
    const imageUrl = document.getElementById('prod-image').value.trim();
    const imageFile = document.getElementById('prod-image-file').files[0] || null;
    const description = document.getElementById('prod-desc').value.trim();
    const isFeatured = document.getElementById('prod-featured').checked;

    if (!title || !description || !categoryId || (!imageUrl && !imageFile) || Number.isNaN(price) || price <= 0 || Number.isNaN(stock) || stock < 0) {
      showToast('Completa todos los campos obligatorios (incluyendo URL o archivo de portada).', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-seller');
    submitBtn.disabled = true;

    try {
      let body;
      if (imageFile) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('category_id', String(categoryId));
        formData.append('platform', platform);
        formData.append('price', String(price));
        if (oldPriceRaw !== '') formData.append('old_price', oldPriceRaw);
        formData.append('stock', String(stock));
        formData.append('description', description);
        formData.append('is_featured', String(isFeatured));
        formData.append('image', imageFile);
        body = formData;
      } else {
        body = {
          title,
          category_id: categoryId,
          platform,
          price,
          old_price: oldPriceRaw !== '' ? Number(oldPriceRaw) : null,
          stock,
          image_url: imageUrl,
          description,
          is_featured: isFeatured
        };
      }

      const res = editId
        ? await apiRequest(`/api/products/${editId}`, { method: 'PUT', body })
        : await apiRequest('/api/products', { method: 'POST', body });

      showToast(res.message, 'success');
      resetSellerForm();
      await renderSellerInventory();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });


}