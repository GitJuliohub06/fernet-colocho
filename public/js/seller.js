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
  const select = document.getElementById('prod-category');
  const categories = MockDB.getCategories();
  select.innerHTML = categories
    .map((c) => `<option value="${c.id}">${c.name}</option>`)
    .join('');
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
  const query = document.getElementById('seller-search-input').value.trim().toLowerCase();
  const onlyMine = document.getElementById('seller-only-mine').checked;

  let products = MockDB.getProducts();

  if (onlyMine && session) {
    products = products.filter((p) => Number(p.seller_id) === Number(session.id));
  }

  // Actualizar KPIs
  document.getElementById('kpi-seller-total').textContent = products.length;
  document.getElementById('kpi-seller-stock').textContent = products.reduce((a, b) => a + Number(b.stock), 0);
  document.getElementById('kpi-seller-low').textContent = products.filter((p) => Number(p.stock) <= 5).length;

  const filtered = products.filter(
    (p) =>
      !query ||
      p.title.toLowerCase().includes(query) ||
      p.category_name.toLowerCase().includes(query) ||
      p.platform.toLowerCase().includes(query)
  );

  const tbody = document.getElementById('seller-products-tbody');
  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">
          No se encontraron videojuegos registrados con ese criterio.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered
    .map((p) => {
      const fallback = MockDB.getFallbackCover(p.title);
      const stockClass = p.stock <= 0 ? 'badge-danger' : p.stock <= 5 ? 'badge-warning' : 'badge-success';
      return `
        <tr>
          <td>
            <img class="seller-thumb-mini" src="${p.image_url}" alt="${p.title}" onerror="this.onerror=null;this.src='${fallback}';" />
          </td>
          <td>
            <strong>${p.title}</strong>
            <div style="font-size:0.75rem;color:var(--text-muted);">${p.platform}</div>
          </td>
          <td>${p.category_name}</td>
          <td>
            <strong style="color:var(--primary);">$${Number(p.price).toFixed(2)}</strong>
            ${p.old_price ? `<div style="font-size:0.74rem;text-decoration:line-through;color:var(--text-dim);">$${Number(p.old_price).toFixed(2)}</div>` : ''}
          </td>
          <td>
            <div class="stock-Quick-ctrl">
              <button class="btn btn-outline btn-sm" data-stock-delta="-1" data-id="${p.id}">-1</button>
              <span class="badge ${stockClass}" style="min-width:64px;justify-content:center;">${p.stock} uds</span>
              <button class="btn btn-outline btn-sm" data-stock-delta="5" data-id="${p.id}">+5</button>
            </div>
          </td>
          <td>
            <button class="btn btn-outline btn-sm" data-edit-prod="${p.id}">✏️ Editar</button>
          </td>
        </tr>
      `;
    })
    .join('');

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