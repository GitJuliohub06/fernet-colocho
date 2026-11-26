import { apiRequest, getFallbackCover } from './common/api.js';
import { renderNavbar, renderFooter, showToast } from './common/navbar.js';

let currentSession = null;
let adminProducts = [];
let adminUsers = [];
let pendingDeleteAction = null;
let prodSearchTimer = null;
let userSearchTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentSession = await renderNavbar('admin');
  renderFooter();

  if (!currentSession) {
    showToast('Debes iniciar sesión como Administrador.', 'info');
    window.location.href = './login.html';
    return;
  }

  if (currentSession.role !== 'admin') {
    showToast('Acceso restringido exclusivamente a Administradores.', 'error');
    window.location.href = './index.html';
    return;
  }

  bindAdminEvents();
  await populateAdminCategories();
  await refreshAllAdminData();
});

async function populateAdminCategories() {
  const select = document.getElementById('adm-prod-category');
  try {
    const data = await apiRequest('/api/categories');
    select.innerHTML = (data.categories || [])
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join('');
  } catch (err) {
    showToast(`Error al cargar categorías: ${err.message}`, 'error');
  }
}

async function refreshAllAdminData() {
  await Promise.all([
    loadAdminStats(),
    renderAdminProductsTable(),
    renderAdminUsersTable()
  ]);
}

async function loadAdminStats() {
  try {
    const stats = await apiRequest('/api/admin/stats');
    document.getElementById('adm-stat-products').textContent = stats.total_products;
    document.getElementById('adm-stat-users').textContent = stats.total_users;
    document.getElementById('adm-stat-orders').textContent = stats.total_orders;
    document.getElementById('adm-stat-revenue').textContent = `$${Number(stats.total_revenue).toFixed(2)}`;
  } catch (err) {
    showToast(`Error al cargar métricas: ${err.message}`, 'error');
  }
}

async function renderAdminProductsTable() {
  const query = document.getElementById('adm-prod-search').value.trim();
  const params = new URLSearchParams({ includeInactive: 'true' });
  if (query) params.set('search', query);

  try {
    const data = await apiRequest(`/api/products?${params.toString()}`);
    adminProducts = data.products || [];

    const tbody = document.getElementById('adm-products-tbody');
    tbody.innerHTML = adminProducts
      .map((p) => {
        const fallback = getFallbackCover(p.title);
        return `
          <tr>
            <td>#${p.id}</td>
            <td><img class="adm-thumb" src="${p.image_url}" alt="${p.title}" onerror="this.onerror=null;this.src='${fallback}';" /></td>
            <td>
              <strong>${p.title}</strong>
              <div style="font-size:0.75rem;color:var(--text-muted);">${p.platform}</div>
            </td>
            <td>${p.category_name}</td>
            <td><strong style="color:var(--primary);">$${Number(p.price).toFixed(2)}</strong></td>
            <td>${p.stock} uds</td>
            <td>
              <span class="badge ${p.is_active ? 'badge-success' : 'badge-danger'}">
                ${p.is_active ? 'Activo' : 'Oculto'}
              </span>
            </td>
            <td>
              <div class="adm-actions-cell">
                <button class="btn btn-outline btn-sm" data-adm-edit-prod="${p.id}">Editar</button>
                <button class="btn btn-danger btn-sm" data-adm-del-prod="${p.id}">Eliminar</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('[data-adm-edit-prod]').forEach((btn) => {
      btn.addEventListener('click', () => openProductModal(Number(btn.dataset.admEditProd)));
    });

    tbody.querySelectorAll('[data-adm-del-prod]').forEach((btn) => {
      btn.addEventListener('click', () => requestDeleteProduct(Number(btn.dataset.admDelProd)));
    });
  } catch (err) {
    showToast(`Error al cargar productos: ${err.message}`, 'error');
  }
}

async function renderAdminUsersTable() {
  const query = document.getElementById('adm-user-search').value.trim();
  const params = new URLSearchParams();
  if (query) params.set('search', query);

  try {
    const data = await apiRequest(`/api/users?${params.toString()}`);
    adminUsers = data.users || [];

    const tbody = document.getElementById('adm-users-tbody');
    tbody.innerHTML = adminUsers
      .map(
        (u) => `
        <tr>
          <td>#${u.id}</td>
          <td><strong>${u.full_name}</strong></td>
          <td>
            <div>@${u.username}</div>
            <div style="font-size:0.76rem;color:var(--text-muted);">${u.email}</div>
          </td>
          <td><span class="fc-role-badge ${u.role}">${u.role}</span></td>
          <td>
            <span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">
              ${u.is_active ? 'Activo' : 'Bloqueado'}
            </span>
          </td>
          <td>
            <div class="adm-actions-cell">
              <button class="btn btn-outline btn-sm" data-adm-edit-user="${u.id}">Editar</button>
              <button class="btn btn-danger btn-sm" data-adm-del-user="${u.id}">Eliminar</button>
            </div>
          </td>
        </tr>
      `
      )
      .join('');

    tbody.querySelectorAll('[data-adm-edit-user]').forEach((btn) => {
      btn.addEventListener('click', () => openUserModal(Number(btn.dataset.admEditUser)));
    });

    tbody.querySelectorAll('[data-adm-del-user]').forEach((btn) => {
      btn.addEventListener('click', () => requestDeleteUser(Number(btn.dataset.admDelUser)));
    });
  } catch (err) {
    showToast(`Error al cargar usuarios: ${err.message}`, 'error');
  }
}

function openProductModal(productId = null) {
  const modal = document.getElementById('adm-product-modal');
  const form = document.getElementById('adm-product-form');
  form.reset();
  document.getElementById('adm-prod-image-file').value = '';

  if (productId) {
    const p = adminProducts.find((x) => x.id === productId);
    if (!p) return;
    document.getElementById('adm-prod-modal-title').textContent = `Editar Producto #${p.id}`;
    document.getElementById('adm-prod-id').value = String(p.id);
    document.getElementById('adm-prod-title').value = p.title;
    document.getElementById('adm-prod-category').value = String(p.category_id);
    document.getElementById('adm-prod-platform').value = p.platform;
    document.getElementById('adm-prod-price').value = p.price;
    document.getElementById('adm-prod-old-price').value = p.old_price || '';
    document.getElementById('adm-prod-stock').value = p.stock;
    document.getElementById('adm-prod-image').value = p.image_url;
    document.getElementById('adm-prod-desc').value = p.description;
    document.getElementById('adm-prod-featured').checked = Boolean(p.is_featured);
    document.getElementById('adm-prod-active').checked = Boolean(p.is_active);
  } else {
    document.getElementById('adm-prod-modal-title').textContent = 'Crear Nuevo Producto';
    document.getElementById('adm-prod-id').value = '';
    document.getElementById('adm-prod-active').checked = true;
  }

  modal.classList.add('open');
}

function openUserModal(userId = null) {
  const modal = document.getElementById('adm-user-modal');
  const form = document.getElementById('adm-user-form');
  const passInput = document.getElementById('adm-user-password');
  form.reset();

  if (userId) {
    const u = adminUsers.find((x) => x.id === userId);
    if (!u) return;
    document.getElementById('adm-user-modal-title').textContent = `Editar Usuario @${u.username}`;
    document.getElementById('adm-user-id').value = String(u.id);
    document.getElementById('adm-user-fullname').value = u.full_name;
    document.getElementById('adm-user-username').value = u.username;
    document.getElementById('adm-user-email').value = u.email;
    document.getElementById('adm-user-role').value = u.role;
    passInput.value = '';
    passInput.placeholder = 'Dejar vacío para mantener la actual';
    document.getElementById('adm-user-active').checked = Boolean(u.is_active);
  } else {
    document.getElementById('adm-user-modal-title').textContent = 'Registrar Nuevo Usuario';
    document.getElementById('adm-user-id').value = '';
    passInput.placeholder = 'Clave de acceso (mín. 6 caracteres)';
    document.getElementById('adm-user-active').checked = true;
  }

  modal.classList.add('open');
}

function requestDeleteProduct(productId) {
  const prod = adminProducts.find((p) => p.id === productId);
  if (!prod) return;

  document.getElementById('adm-confirm-text').textContent =
    `¿Estás seguro de que deseas eliminar permanentemente el videojuego "${prod.title}" (ID #${prod.id}) del catálogo?`;

  pendingDeleteAction = async () => {
    try {
      const res = await apiRequest(`/api/products/${productId}`, { method: 'DELETE' });
      showToast(res.message, 'info');
      await refreshAllAdminData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  document.getElementById('adm-confirm-modal').classList.add('open');
}

function requestDeleteUser(userId) {
  const user = adminUsers.find((u) => u.id === userId);
  if (!user) return;

  if (currentSession && currentSession.id === user.id) {
    showToast('Medida de seguridad: No puedes eliminar tu propia cuenta administrativa activa.', 'error');
    return;
  }

  document.getElementById('adm-confirm-text').textContent =
    `¿Confirmas la eliminación definitiva del usuario "${user.full_name}" (@${user.username} — Rol: ${user.role})?`;

  pendingDeleteAction = async () => {
    try {
      const res = await apiRequest(`/api/users/${userId}`, { method: 'DELETE' });
      showToast(res.message, 'info');
      await refreshAllAdminData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  document.getElementById('adm-confirm-modal').classList.add('open');
}

function bindAdminEvents() {
  document.querySelectorAll('.side-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.side-nav-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.admin-panel-section').forEach((s) => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  document.getElementById('adm-prod-search').addEventListener('input', () => {
    clearTimeout(prodSearchTimer);
    prodSearchTimer = setTimeout(renderAdminProductsTable, 220);
  });

  document.getElementById('adm-user-search').addEventListener('input', () => {
    clearTimeout(userSearchTimer);
    userSearchTimer = setTimeout(renderAdminUsersTable, 220);
  });

  document.getElementById('btn-open-new-prod').addEventListener('click', () => openProductModal(null));
  document.getElementById('btn-open-new-user').addEventListener('click', () => openUserModal(null));

  document.getElementById('btn-close-prod-modal').addEventListener('click', () => {
    document.getElementById('adm-product-modal').classList.remove('open');
  });

  document.getElementById('btn-close-user-modal').addEventListener('click', () => {
    document.getElementById('adm-user-modal').classList.remove('open');
  });

  // Guardar Producto (Crear o Actualizar)
  document.getElementById('adm-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idVal = document.getElementById('adm-prod-id').value;
    const title = document.getElementById('adm-prod-title').value.trim();
    const categoryId = Number(document.getElementById('adm-prod-category').value);
    const platform = document.getElementById('adm-prod-platform').value.trim();
    const price = Number(document.getElementById('adm-prod-price').value);
    const oldPriceRaw = document.getElementById('adm-prod-old-price').value.trim();
    const stock = Number(document.getElementById('adm-prod-stock').value);
    const imageUrl = document.getElementById('adm-prod-image').value.trim();
    const imageFile = document.getElementById('adm-prod-image-file').files[0] || null;
    const description = document.getElementById('adm-prod-desc').value.trim();
    const isFeatured = document.getElementById('adm-prod-featured').checked;
    const isActive = document.getElementById('adm-prod-active').checked;

    if (!imageUrl && !imageFile) {
      showToast('Indica una URL de portada o selecciona una imagen local.', 'error');
      return;
    }

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
        formData.append('is_active', String(isActive));
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
          is_featured: isFeatured,
          is_active: isActive
        };
      }

      const res = idVal
        ? await apiRequest(`/api/products/${idVal}`, { method: 'PUT', body })
        : await apiRequest('/api/products', { method: 'POST', body });

      showToast(res.message, 'success');
      document.getElementById('adm-product-modal').classList.remove('open');
      await refreshAllAdminData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Guardar Usuario (Crear o Actualizar)
  document.getElementById('adm-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idVal = document.getElementById('adm-user-id').value;
    const password = document.getElementById('adm-user-password').value;

    if (!idVal && password.length < 6) {
      showToast('Para crear un usuario nuevo debes indicar una contraseña de al menos 6 caracteres.', 'error');
      return;
    }

    const payload = {
      full_name: document.getElementById('adm-user-fullname').value.trim(),
      username: document.getElementById('adm-user-username').value.trim(),
      email: document.getElementById('adm-user-email').value.trim(),
      role: document.getElementById('adm-user-role').value,
      is_active: document.getElementById('adm-user-active').checked
    };

    if (password.trim() !== '') {
      payload.password = password;
    }

    try {
      const res = idVal
        ? await apiRequest(`/api/users/${idVal}`, { method: 'PUT', body: payload })
        : await apiRequest('/api/users', { method: 'POST', body: payload });

      showToast(res.message, 'success');
      document.getElementById('adm-user-modal').classList.remove('open');
      await refreshAllAdminData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Confirmación de eliminación
  document.getElementById('btn-cancel-delete').addEventListener('click', () => {
    pendingDeleteAction = null;
    document.getElementById('adm-confirm-modal').classList.remove('open');
  });

  document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
    const action = pendingDeleteAction;
    pendingDeleteAction = null;
    document.getElementById('adm-confirm-modal').classList.remove('open');
    if (typeof action === 'function') {
      await action();
    }
  });

  document.getElementById('btn-admin-refresh-data').addEventListener('click', async () => {
    await refreshAllAdminData();
    showToast('Datos actualizados desde PostgreSQL.', 'info');
  });
}