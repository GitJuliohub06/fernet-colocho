import { apiRequest, getFallbackCover, notifyCartUpdated, formatDateTime } from './api.js';
import { renderNavbar, renderFooter, showToast } from './navbar.js';

let currentSession = null;
let currentCart = { items: [], total_items: 0, subtotal: 0, tax: 0, total: 0 };
let currentOrders = [];
let quickSearchTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentSession = await renderNavbar('buyer');
  renderFooter();

  if (!currentSession) {
    showToast('Debes iniciar sesión para acceder al carrito y facturación.', 'info');
    window.location.href = './login.html';
    return;
  }

  // renderBuyerSessionBanner(currentSession);
  bindBuyerEvents();
  await Promise.all([
    loadQuickCatalog(''),
    loadCartPanel(),
    loadOrdersHistory()
  ]);
});



async function loadQuickCatalog(filterText = '') {
  const container = document.getElementById('buyer-products-list');
  const params = new URLSearchParams();
  if (filterText.trim()) params.set('search', filterText.trim());

  try {
    const data = await apiRequest(`/api/products?${params.toString()}`);
    const products = data.products || [];

    if (products.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:1.5rem;color:var(--text-muted);font-size:0.88rem;">
          No se encontraron videojuegos con ese filtro.
        </div>
      `;
      return;
    }

    container.innerHTML = products
      .map((p) => {
        const fallback = getFallbackCover(p.title);
        return `
          <div class="mini-prod-card">
            <div class="mini-prod-top">
              <img src="${p.image_url}" alt="${p.title}" onerror="this.onerror=null;this.src='${fallback}';" />
              <div>
                <div style="font-weight:700;font-size:0.86rem;line-height:1.2;">${p.title}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">${p.platform} · Stock: ${p.stock}</div>
                <div style="color:var(--primary);font-weight:800;font-size:0.92rem;">$${Number(p.price).toFixed(2)}</div>
              </div>
            </div>
            <button class="btn btn-outline btn-sm" data-quick-add="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>
              ${p.stock > 0 ? '+ Agregar al Carrito' : 'Agotado'}
            </button>
          </div>
        `;
      })
      .join('');

    container.querySelectorAll('[data-quick-add]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          const res = await apiRequest('/api/cart', {
            method: 'POST',
            body: { product_id: Number(btn.dataset.quickAdd), quantity: 1 }
          });
          currentCart = res.cart;
          renderCartPanel();
          notifyCartUpdated(currentCart.total_items);
          showToast(res.message, 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  } catch (err) {
    showToast(`Error al cargar catálogo rápido: ${err.message}`, 'error');
  }
}

async function loadCartPanel() {
  try {
    currentCart = await apiRequest('/api/cart');
    renderCartPanel();
    notifyCartUpdated(currentCart.total_items);
  } catch (err) {
    showToast(`Error al cargar el carrito: ${err.message}`, 'error');
  }
}

function renderCartPanel() {
  const listEl = document.getElementById('cart-items-container');
  const subtotalEl = document.getElementById('summary-subtotal');
  const taxEl = document.getElementById('summary-tax');
  const totalEl = document.getElementById('summary-total');
  const statItemsEl = document.getElementById('stat-cart-items');

  const items = currentCart.items || [];
  statItemsEl.textContent = Number(currentCart.total_items || 0);

  if (items.length === 0) {
    listEl.innerHTML = `
      <div style="text-align:center;padding:2rem 0.5rem;color:var(--text-muted);font-size:0.88rem;">
        Tu carrito está vacío. Selecciona videojuegos del catálogo izquierdo o desde la tienda principal.
      </div>
    `;
    subtotalEl.textContent = '$0.00';
    taxEl.textContent = '$0.00';
    totalEl.textContent = '$0.00';
    return;
  }

  listEl.innerHTML = items
    .map((item) => `
      <div class="cart-item-row">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-meta">$${Number(item.price).toFixed(2)} c/u · Subtotal: <strong>$${Number(item.line_total).toFixed(2)}</strong></div>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" data-qty-action="dec" data-id="${item.product_id}">−</button>
          <span style="font-size:0.85rem;font-weight:700;min-width:20px;text-align:center;">${item.quantity}</span>
          <button class="qty-btn" data-qty-action="inc" data-id="${item.product_id}">+</button>
        </div>
        <button class="btn btn-danger btn-sm" data-remove-id="${item.product_id}" title="Eliminar producto">✕</button>
      </div>
    `)
    .join('');

  subtotalEl.textContent = `$${Number(currentCart.subtotal).toFixed(2)}`;
  taxEl.textContent = `$${Number(currentCart.tax).toFixed(2)}`;
  totalEl.textContent = `$${Number(currentCart.total).toFixed(2)}`;

  listEl.querySelectorAll('[data-qty-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      updateItemQuantity(Number(btn.dataset.id), btn.dataset.qtyAction);
    });
  });

  listEl.querySelectorAll('[data-remove-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeItemFromCart(Number(btn.dataset.removeId));
    });
  });
}

async function updateItemQuantity(productId, action) {
  const item = (currentCart.items || []).find((i) => i.product_id === productId);
  if (!item) return;

  const newQty = action === 'inc' ? item.quantity + 1 : item.quantity - 1;

  try {
    const res = await apiRequest(`/api/cart/${productId}`, {
      method: 'PUT',
      body: { quantity: newQty }
    });
    currentCart = res.cart;
    renderCartPanel();
    notifyCartUpdated(currentCart.total_items);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function removeItemFromCart(productId) {
  try {
    const res = await apiRequest(`/api/cart/${productId}`, { method: 'DELETE' });
    currentCart = res.cart;
    renderCartPanel();
    notifyCartUpdated(currentCart.total_items);
    showToast(res.message, 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function confirmAndGenerateInvoice() {
  if (!currentCart.items || currentCart.items.length === 0) {
    showToast('Agrega al menos un videojuego al carrito para facturar.', 'error');
    return;
  }

  const btn = document.getElementById('btn-confirm-purchase');
  btn.disabled = true;

  try {
    const res = await apiRequest('/api/orders', { method: 'POST' });
    const searchVal = document.getElementById('buyer-quick-search').value;

    await Promise.all([
      loadQuickCatalog(searchVal),
      loadCartPanel(),
      loadOrdersHistory()
    ]);

    openInvoiceModal(res.order);
    showToast(res.message, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function loadOrdersHistory() {
  const tbody = document.getElementById('orders-history-tbody');
  const statOrders = document.getElementById('stat-orders-count');

  try {
    const data = await apiRequest('/api/orders');
    currentOrders = data.orders || [];
    statOrders.textContent = currentOrders.length;

    if (currentOrders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;color:var(--text-muted);padding:1.5rem;">
            Aún no se han generado facturas en tu cuenta.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = currentOrders
      .map(
        (o) => `
        <tr>
          <td><strong style="color:var(--primary);">${o.invoice_number}</strong></td>
          <td>${formatDateTime(o.created_at)}</td>
          <td>${o.buyer_name}</td>
          <td>${o.items.reduce((a, b) => a + Number(b.quantity), 0)} unidad(es)</td>
          <td><strong>$${Number(o.total).toFixed(2)}</strong></td>
          <td>
            <button class="btn btn-outline btn-sm" data-view-invoice="${o.id}">Ver Factura</button>
          </td>
        </tr>
      `
      )
      .join('');

    tbody.querySelectorAll('[data-view-invoice]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const orderId = Number(btn.dataset.viewInvoice);
        try {
          const detail = await apiRequest(`/api/orders/${orderId}`);
          openInvoiceModal(detail.order);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  } catch (err) {
    showToast(`Error al cargar facturas: ${err.message}`, 'error');
  }
}

function openInvoiceModal(order) {
  const modal = document.getElementById('invoice-modal');
  const body = document.getElementById('invoice-document-body');

  const rowsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td>${item.product_title}</td>
        <td style="text-align:center;">${item.quantity}</td>
        <td style="text-align:right;">$${Number(item.unit_price).toFixed(2)}</td>
        <td style="text-align:right;"><strong>$${Number(item.line_total).toFixed(2)}</strong></td>
      </tr>
    `
    )
    .join('');

  body.innerHTML = `
    <div class="invoice-top">
      <div>
        <div class="fc-brand" style="margin-bottom:0.3rem;">
          <div class="fc-brand-logo" style="width:32px;height:32px;font-size:0.9rem;">F&C</div>
          <div>FERNET<span class="amp">&</span>COLOCHO STORE</div>
        </div>
        <div style="font-size:0.8rem;color:var(--text-muted);">Facturación Digital de Videojuegos · San Salvador</div>
      </div>
      <div style="text-align:right;">
        <span class="badge badge-success">FACTURA PAGADA</span>
        <div style="font-family:var(--font-display);font-size:1.15rem;color:var(--primary);margin-top:0.25rem;">
          ${order.invoice_number}
        </div>
        <div style="font-size:0.78rem;color:var(--text-muted);">${formatDateTime(order.created_at)}</div>
      </div>
    </div>

    <div class="invoice-meta-grid">
      <div>
        <div style="color:var(--text-muted);font-size:0.75rem;">FACTURADO A (COMPRADOR):</div>
        <strong>${order.buyer_name}</strong>
        <div>${order.buyer_email}</div>
      </div>
      <div>
        <div style="color:var(--text-muted);font-size:0.75rem;">MÉTODO DE ENTREGA:</div>
        <strong>Licencia Digital Instantánea</strong>
        <div>Estado: Entregado y Verificado</div>
      </div>
    </div>

    <div class="table-responsive" style="margin-bottom:1.2rem;">
      <table class="fc-table">
        <thead>
          <tr>
            <th>Videojuego</th>
            <th style="text-align:center;">Cant.</th>
            <th style="text-align:right;">Precio Unit.</th>
            <th style="text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>

    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.35rem;font-size:0.92rem;">
      <div>Subtotal: <strong>$${Number(order.subtotal).toFixed(2)}</strong></div>
      <div>IVA (13%): <strong>$${Number(order.tax).toFixed(2)}</strong></div>
      <div style="font-size:1.2rem;color:var(--primary);font-family:var(--font-display);margin-top:0.3rem;">
        TOTAL FACTURADO: $${Number(order.total).toFixed(2)} USD
      </div>
    </div>
  `;

  modal.classList.add('open');
}

function bindBuyerEvents() {
  document.getElementById('buyer-quick-search').addEventListener('input', (e) => {
    clearTimeout(quickSearchTimer);
    quickSearchTimer = setTimeout(() => loadQuickCatalog(e.target.value), 220);
  });

  document.getElementById('btn-clear-cart').addEventListener('click', async () => {
    if (!currentCart.items || currentCart.items.length === 0) return;
    if (!confirm('¿Deseas vaciar todos los productos del carrito actual?')) return;

    try {
      const res = await apiRequest('/api/cart', { method: 'DELETE' });
      currentCart = res.cart;
      renderCartPanel();
      notifyCartUpdated(currentCart.total_items);
      showToast(res.message, 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('btn-confirm-purchase').addEventListener('click', confirmAndGenerateInvoice);

  const modal = document.getElementById('invoice-modal');
  document.getElementById('btn-close-invoice').addEventListener('click', () => modal.classList.remove('open'));
  document.getElementById('btn-print-invoice').addEventListener('click', () => window.print());
}