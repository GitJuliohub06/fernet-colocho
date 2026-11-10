import { MockDB } from './common/mock-data.js';
import { renderNavbar, renderFooter, showToast } from './common/navbar.js';

const TAX_RATE = 0.13;

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('buyer');
  renderFooter();

  checkBuyerSessionBanner();
  renderQuickCatalog();
  renderCartPanel();
  renderOrdersHistory();
  bindBuyerEvents();
});

function checkBuyerSessionBanner() {
  const banner = document.getElementById('buyer-role-banner');
  const session = MockDB.getSession();

  if (!session) {
    banner.innerHTML = `
      <div>
        ⚠️ <strong>Estás viendo la vista en modo visitante.</strong> Para emitir una factura debes autenticarte como Comprador.
      </div>
      <div style="display:flex;gap:0.5rem;">
        <button id="btn-quick-login-buyer" class="btn btn-primary btn-sm">Activar Sesión Comprador (1 Clic)</button>
        <a href="/login.html" class="btn btn-outline btn-sm">Ir a Login</a>
      </div>
    `;
    document.getElementById('btn-quick-login-buyer')?.addEventListener('click', () => {
      const buyer = MockDB.getUsers().find((u) => u.role === 'comprador');
      if (buyer) {
        MockDB.setSession(buyer);
        window.location.reload();
      }
    });
  } else {
    banner.innerHTML = `
      <div>
        ✅ <strong>Sesión activa:</strong> ${session.full_name} (<code>@${session.username}</code> — Rol: <strong>${session.role.toUpperCase()}</strong>)
      </div>
      <span class="badge badge-success">Listo para facturar</span>
    `;
  }
}

function renderQuickCatalog(filterText = '') {
  const container = document.getElementById('buyer-products-list');
  const query = filterText.trim().toLowerCase();

  const products = MockDB.getProducts().filter(
    (p) =>
      p.is_active &&
      (!query ||
        p.title.toLowerCase().includes(query) ||
        p.platform.toLowerCase().includes(query))
  );

  container.innerHTML = products
    .map((p) => {
      const fallback = MockDB.getFallbackCover(p.title);
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
    btn.addEventListener('click', () => {
      const res = MockDB.addToCart(Number(btn.dataset.quickAdd), 1);
      showToast(res.message, res.ok ? 'success' : 'error');
      renderCartPanel();
    });
  });
}

function renderCartPanel() {
  const cart = MockDB.getCart();
  const listEl = document.getElementById('cart-items-container');
  const subtotalEl = document.getElementById('summary-subtotal');
  const taxEl = document.getElementById('summary-tax');
  const totalEl = document.getElementById('summary-total');
  const statItemsEl = document.getElementById('stat-cart-items');

  const totalCount = cart.reduce((acc, item) => acc + Number(item.quantity), 0);
  statItemsEl.textContent = totalCount;

  if (cart.length === 0) {
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

  let subtotal = 0;

  listEl.innerHTML = cart
    .map((item) => {
      const lineTotal = Number(item.price) * Number(item.quantity);
      subtotal += lineTotal;
      return `
        <div class="cart-item-row">
          <div class="cart-item-info">
            <div class="cart-item-title">${item.title}</div>
            <div class="cart-item-meta">$${Number(item.price).toFixed(2)} c/u · Subtotal: <strong>$${lineTotal.toFixed(2)}</strong></div>
          </div>
          <div class="qty-controls">
            <button class="qty-btn" data-qty-action="dec" data-id="${item.product_id}">−</button>
            <span style="font-size:0.85rem;font-weight:700;min-width:20px;text-align:center;">${item.quantity}</span>
            <button class="qty-btn" data-qty-action="inc" data-id="${item.product_id}">+</button>
          </div>
          <button class="btn btn-danger btn-sm" data-remove-id="${item.product_id}" title="Eliminar producto">✕</button>
        </div>
      `;
    })
    .join('');

  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  taxEl.textContent = `$${tax.toFixed(2)}`;
  totalEl.textContent = `$${total.toFixed(2)}`;

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

function updateItemQuantity(productId, action) {
  const cart = MockDB.getCart();
  const products = MockDB.getProducts();
  const product = products.find((p) => p.id === productId);
  const item = cart.find((i) => i.product_id === productId);
  if (!item || !product) return;

  if (action === 'inc') {
    if (item.quantity + 1 > product.stock) {
      showToast(`Stock máximo alcanzado (${product.stock} unidades).`, 'error');
      return;
    }
    item.quantity += 1;
  } else if (action === 'dec') {
    item.quantity -= 1;
    if (item.quantity <= 0) {
      removeItemFromCart(productId);
      return;
    }
  }

  MockDB.saveCart(cart);
  renderCartPanel();
}

function removeItemFromCart(productId) {
  const updated = MockDB.getCart().filter((i) => i.product_id !== productId);
  MockDB.saveCart(updated);
  renderCartPanel();
  showToast('Producto eliminado del carrito.', 'info');
}

function confirmAndGenerateInvoice() {
  const session = MockDB.getSession();
  if (!session) {
    showToast('Debes iniciar sesión como Comprador antes de emitir una factura.', 'error');
    return;
  }

  const cart = MockDB.getCart();
  if (cart.length === 0) {
    showToast('Agrega al menos un videojuego al carrito para facturar.', 'error');
    return;
  }

  const products = MockDB.getProducts();

  for (const item of cart) {
    const dbProd = products.find((p) => p.id === item.product_id);
    if (!dbProd || dbProd.stock < item.quantity) {
      showToast(`Stock insuficiente para "${item.title}". Disponible: ${dbProd ? dbProd.stock : 0}`, 'error');
      return;
    }
  }

  // Descontar stock (Simulación de la transacción SQL que haremos en PostgreSQL)
  cart.forEach((item) => {
    const dbProd = products.find((p) => p.id === item.product_id);
    dbProd.stock -= item.quantity;
  });
  MockDB.saveProducts(products);

  const subtotal = cart.reduce((acc, i) => acc + Number(i.price) * Number(i.quantity), 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const orders = MockDB.getOrders();
  const nextId = orders.length ? Math.max(...orders.map((o) => o.id)) + 1 : 1;
  const invoiceNumber = `FC-2026-${String(nextId).padStart(4, '0')}`;

  const newOrder = {
    id: nextId,
    invoice_number: invoiceNumber,
    buyer_id: session.id,
    buyer_name: session.full_name,
    buyer_email: session.email,
    created_at: new Date().toLocaleString('es-SV'),
    subtotal: Number(subtotal.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    total: Number(total.toFixed(2)),
    items: cart.map((i) => ({
      product_id: i.product_id,
      product_title: i.title,
      quantity: i.quantity,
      unit_price: Number(i.price),
      line_total: Number((i.price * i.quantity).toFixed(2))
    }))
  };

  orders.unshift(newOrder);
  MockDB.saveOrders(orders);
  MockDB.saveCart([]);

  renderQuickCatalog(document.getElementById('buyer-quick-search').value);
  renderCartPanel();
  renderOrdersHistory();
  openInvoiceModal(newOrder);
  showToast(`¡Compra confirmada! Factura ${invoiceNumber} emitida.`, 'success');
}

function renderOrdersHistory() {
  const tbody = document.getElementById('orders-history-tbody');
  const statOrders = document.getElementById('stat-orders-count');
  const orders = MockDB.getOrders();
  statOrders.textContent = orders.length;

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;color:var(--text-muted);padding:1.5rem;">
          Aún no se han generado facturas en esta sesión.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders
    .map(
      (o) => `
      <tr>
        <td><strong style="color:var(--primary);">${o.invoice_number}</strong></td>
        <td>${o.created_at}</td>
        <td>${o.buyer_name}</td>
        <td>${o.items.reduce((a, b) => a + b.quantity, 0)} unidad(es)</td>
        <td><strong>$${Number(o.total).toFixed(2)}</strong></td>
        <td>
          <button class="btn btn-outline btn-sm" data-view-invoice="${o.id}">Ver Factura</button>
        </td>
      </tr>
    `
    )
    .join('');

  tbody.querySelectorAll('[data-view-invoice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const found = orders.find((o) => o.id === Number(btn.dataset.viewInvoice));
      if (found) openInvoiceModal(found);
    });
  });
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
        <div style="font-size:0.78rem;color:var(--text-muted);">${order.created_at}</div>
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
    renderQuickCatalog(e.target.value);
  });

  document.getElementById('btn-clear-cart').addEventListener('click', () => {
    if (MockDB.getCart().length === 0) return;
    if (confirm('¿Deseas vaciar todos los productos del carrito actual?')) {
      MockDB.saveCart([]);
      renderCartPanel();
      showToast('Carrito vaciado.', 'info');
    }
  });

  document.getElementById('btn-confirm-purchase').addEventListener('click', confirmAndGenerateInvoice);

  const modal = document.getElementById('invoice-modal');
  document.getElementById('btn-close-invoice').addEventListener('click', () => modal.classList.remove('open'));
  document.getElementById('btn-print-invoice').addEventListener('click', () => window.print());
}