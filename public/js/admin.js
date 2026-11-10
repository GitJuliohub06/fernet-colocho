import { MockDB } from './common/mock-data.js';
import { renderNavbar, renderFooter, showToast } from './common/navbar.js';

let pendingDeleteAction = null;

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('admin');
  renderFooter();

  verifyAdminRoleBanner();
  populateAdminCategories();
  refreshAllAdminData();
  bindAdminEvents();
});

function verifyAdminRoleBanner() {
  const banner = document.getElementById('admin-role-banner');
  const session = MockDB.getSession();

  if (!session || session.role !== 'admin') {
    banner.innerHTML = `
      <div>
        🛡️ <strong>Área restringida a Administradores.</strong> En producción el middleware de backend bloqueará peticiones sin rol <code>admin</code>.
      </div>
      <div style="display:flex;gap:0.5rem;">
        <button id="btn-force-admin" class="btn btn-accent btn-sm">Activar Sesión Administrador (1 Clic)</button>
        <a href="/login.html" class="btn btn-outline btn-sm">Ir a Login</a>
      </div>
    `;
    document.getElementById('btn-force-admin')?.addEventListener('click', () => {
      const admin = MockDB.getUsers().find((u) => u.role === 'admin');
      if (admin) {
        MockDB.setSession(admin);
        window.location.reload();
      }
    });
  } else {
    banner.innerHTML = `
      <div>
        ✅ <strong>Sesión Administrativa Verificada:</strong> ${session.full_name} (<code>@${session.username}</code>)
      </div>
      <span class="badge badge-discount">Control Total Activo</span>
    `;
  }
}

function populateAdminCategories() {
  const select = document.getElementById('adm-prod-category');
  select.innerHTML = MockDB.getCategories()
    .map((c) => `<option value="${c.id}">${c.name}</option>`)
    .join('');
}

function refreshAllAdminData() {
  const products = MockDB.getProducts();
  const users = MockDB.getUsers();
  const orders = MockDB.getOrders();
  const revenue = orders.reduce((acc, o) => acc + Number(o.total), 0);

  document.getElementById('adm-stat-products').textContent = products.length;
  document.getElementById('adm-stat-users').textContent = users.length;
  document.getElementById('adm-stat-orders').textContent = orders.length;
  document.getElementById('adm-stat-revenue').textContent = `$${revenue.toFixed(2)}`;

  renderAdminProductsTable();
  renderAdminUsersTable();
}

function renderAdminProductsTable() {
  const query = document.getElementById('adm-prod-search').value.trim().toLowerCase();
  const products = MockDB.getProducts().filter(
    (p) =>
      !query ||
      p.title.toLowerCase().includes(query) ||
      p.category_name.toLowerCase().includes(query)
  );

  const tbody = document.getElementById('adm-products-tbody');
  tbody.innerHTML = products
    .map((p) => {
      const fallback = MockDB.getFallbackCover(p.title);
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
}

function renderAdminUsersTable() {
  const query = document.getElementById('adm-user-search').value.trim().toLowerCase();
  const users = MockDB.getUsers().filter(
    (u) =>
      !query ||
      u.full_name.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
  );

  const tbody = document.getElementById('adm-users-tbody');
  tbody.innerHTML = users
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
}

function openProductModal(productId = null) {
  const modal = document.getElementById('adm-product-modal');
  const form = document.getElementById('adm-product-form');
  form.reset();

  if (productId) {
    const p = MockDB.getProducts().find((x) => x.id === productId);
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
  form.reset();

  if (userId) {
    const u = MockDB.getUsers().find((x) => x.id === userId);
    if (!u) return;
    document.getElementById('adm-user-modal-title').textContent = `Editar Usuario @${u.username}`;
    document.getElementById('adm-user-id').value = String(u.id);
    document.getElementById('adm-user-fullname').value = u.full_name;
    document.getElementById('adm-user-username').value = u.username;
    document.getElementById('adm-user-email').value = u.email;
    document.getElementById('adm-user-role').value = u.role;
    document.getElementById('adm-user-password').value = u.password_plain;
    document.getElementById('adm-user-active').checked = Boolean(u.is_active);
  } else {
    document.getElementById('adm-user-modal-title').textContent = 'Registrar Nuevo Usuario';
    document.getElementById('adm-user-id').value = '';
    document.getElementById('adm-user-active').checked = true;
  }

  modal.classList.add('open');
}

function requestDeleteProduct(productId) {
  const prod = MockDB.getProducts().find((p) => p.id === productId);
  if (!prod) return;

  document.getElementById('adm-confirm-text').textContent =
    `¿Estás seguro de que deseas eliminar permanentemente el videojuego "${prod.title}" (ID #${prod.id}) del catálogo?`;

  pendingDeleteAction = () => {
    const updated = MockDB.getProducts().filter((p) => p.id !== productId);
    MockDB.saveProducts(updated);
    refreshAllAdminData();
    showToast(`Producto "${prod.title}" eliminado.`, 'info');
  };

  document.getElementById('adm-confirm-modal').classList.add('open');
}

function requestDeleteUser(userId) {
  const user = MockDB.getUsers().find((u) => u.id === userId);
  if (!user) return;

  const session = MockDB.getSession();
  if (session && session.id === user.id) {
    showToast('Medida de seguridad: No puedes eliminar tu propia cuenta administrativa activa.', 'error');
    return;
  }

  document.getElementById('adm-confirm-text').textContent =
    `¿Confirmas la eliminación definitiva del usuario "${user.full_name}" (@${user.username} — Rol: ${user.role})?`;

  pendingDeleteAction = () => {
    const updated = MockDB.getUsers().filter((u) => u.id !== userId);
    MockDB.saveUsers(updated);
    refreshAllAdminData();
    showToast(`Usuario @${user.username} eliminado del sistema.`, 'info');
  };

  document.getElementById('adm-confirm-modal').classList.add('open');
}

function bindAdminEvents() {
  // Cambio de pestañas laterales
  document.querySelectorAll('.side-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.side-nav-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.admin-panel-section').forEach((s) => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  document.getElementById('adm-prod-search').addEventListener('input', renderAdminProductsTable);
  document.getElementById('adm-user-search').addEventListener('input', renderAdminUsersTable);

  document.getElementById('btn-open-new-prod').addEventListener('click', () => openProductModal(null));
  document.getElementById('btn-open-new-user').addEventListener('click', () => openUserModal(null));

  document.getElementById('btn-close-prod-modal').addEventListener('click', () => {
    document.getElementById('adm-product-modal').classList.remove('open');
  });

  document.getElementById('btn-close-user-modal').addEventListener('click', () => {
    document.getElementById('adm-user-modal').classList.remove('open');
  });

  // Guardar Producto (Crear o Actualizar)
  document.getElementById('adm-product-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const idVal = document.getElementById('adm-prod-id').value;
    const products = MockDB.getProducts();

    const payload = {
      title: document.getElementById('adm-prod-title').value.trim(),
      category_id: Number(document.getElementById('adm-prod-category').value),
      platform: document.getElementById('adm-prod-platform').value.trim(),
      price: Number(document.getElementById('adm-prod-price').value),
      old_price: document.getElementById('adm-prod-old-price').value
        ? Number(document.getElementById('adm-prod-old-price').value)
        : null,
      stock: Number(document.getElementById('adm-prod-stock').value),
      image_url: document.getElementById('adm-prod-image').value.trim(),
      description: document.getElementById('adm-prod-desc').value.trim(),
      is_featured: document.getElementById('adm-prod-featured').checked,
      is_active: document.getElementById('adm-prod-active').checked
    };

    if (idVal) {
      const idx = products.findIndex((p) => p.id === Number(idVal));
      if (idx !== -1) {
        products[idx] = { ...products[idx], ...payload };
        showToast(`Producto "${payload.title}" actualizado.`, 'success');
      }
    } else {
      const nextId = products.length ? Math.max(...products.map((p) => p.id)) + 1 : 1;
      products.unshift({ id: nextId, seller_id: 1, ...payload });
      showToast(`Producto "${payload.title}" creado.`, 'success');
    }

    MockDB.saveProducts(products);
    document.getElementById('adm-product-modal').classList.remove('open');
    refreshAllAdminData();
  });

  // Guardar Usuario (Crear o Actualizar)
  document.getElementById('adm-user-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const idVal = document.getElementById('adm-user-id').value;
    const users = MockDB.getUsers();

    const payload = {
      full_name: document.getElementById('adm-user-fullname').value.trim(),
      username: document.getElementById('adm-user-username').value.trim(),
      email: document.getElementById('adm-user-email').value.trim(),
      role: document.getElementById('adm-user-role').value,
      password_plain: document.getElementById('adm-user-password').value,
      is_active: document.getElementById('adm-user-active').checked
    };

    if (idVal) {
      const idx = users.findIndex((u) => u.id === Number(idVal));
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...payload };
        showToast(`Usuario @${payload.username} actualizado.`, 'success');
      }
    } else {
      const nextId = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
      users.push({
        id: nextId,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        ...payload
      });
      showToast(`Usuario @${payload.username} creado con rol ${payload.role}.`, 'success');
    }

    MockDB.saveUsers(users);
    document.getElementById('adm-user-modal').classList.remove('open');
    refreshAllAdminData();
  });

  // Confirmación de eliminación
  document.getElementById('btn-cancel-delete').addEventListener('click', () => {
    pendingDeleteAction = null;
    document.getElementById('adm-confirm-modal').classList.remove('open');
  });

  document.getElementById('btn-confirm-delete').addEventListener('click', () => {
    if (typeof pendingDeleteAction === 'function') {
      pendingDeleteAction();
    }
    pendingDeleteAction = null;
    document.getElementById('adm-confirm-modal').classList.remove('open');
  });

  document.getElementById('btn-admin-reset-data').addEventListener('click', () => {
    if (confirm('¿Restablecer todos los usuarios, productos y facturas a su estado original?')) {
      MockDB.resetAll();
      refreshAllAdminData();
      showToast('Datos restaurados al estado inicial.', 'info');
    }
  });
}