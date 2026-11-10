/**
 * FERNET&COLOCHO — BARRA DE NAVEGACIÓN, CAMBIADOR DE ROL DEMO Y TOASTS
 * Se inyecta automáticamente en cualquier página que tenga <div id="app-navbar"></div>
 */

import { MockDB } from './mock-data.js';

export function showToast(message, type = 'info') {
  let container = document.getElementById('fc-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'fc-toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `fc-toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button style="background:none;border:none;color:inherit;cursor:pointer;font-weight:700;">✕</button>
  `;

  toast.querySelector('button').addEventListener('click', () => toast.remove());
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 3800);
}

export function renderNavbar(activePage = 'index') {
  const navHost = document.getElementById('app-navbar');
  if (!navHost) return;

  const session = MockDB.getSession();
  const cart = MockDB.getCart();
  const cartCount = cart.reduce((acc, item) => acc + Number(item.quantity), 0);

  let roleLinkHtml = '';
  if (session) {
    if (session.role === 'comprador') {
      roleLinkHtml = `<a href="/buyer.html" class="fc-nav-link role-link ${activePage === 'buyer' ? 'active' : ''}">🛒 Zona Comprador</a>`;
    } else if (session.role === 'vendedor') {
      roleLinkHtml = `<a href="/seller.html" class="fc-nav-link role-link ${activePage === 'seller' ? 'active' : ''}">📦 Panel Vendedor</a>`;
    } else if (session.role === 'admin') {
      roleLinkHtml = `
        <a href="/seller.html" class="fc-nav-link ${activePage === 'seller' ? 'active' : ''}">Panel Vendedor</a>
        <a href="/admin.html" class="fc-nav-link role-link ${activePage === 'admin' ? 'active' : ''}">🛡️ Panel Admin</a>
      `;
    }
  }

  const userActionsHtml = session
    ? `
      <div class="fc-user-pill">
        <span>👤 ${session.username}</span>
        <span class="fc-role-badge ${session.role}">${session.role}</span>
      </div>
      <button id="btn-logout-nav" class="btn btn-outline btn-sm">Salir</button>
    `
    : `
      <a href="/login.html" class="btn btn-outline btn-sm ${activePage === 'login' ? 'active' : ''}">Iniciar Sesión</a>
      <a href="/register.html" class="btn btn-primary btn-sm ${activePage === 'register' ? 'active' : ''}">Crear Cuenta</a>
    `;

  navHost.innerHTML = `
    <header class="fc-navbar">
      <div class="container fc-navbar-inner">
        <a href="/index.html" class="fc-brand">
          <div class="fc-brand-logo">F&C</div>
          <div>FERNET<span class="amp">&</span>COLOCHO</div>
        </a>

        <nav class="fc-nav-links">
          <a href="/index.html" class="fc-nav-link ${activePage === 'index' ? 'active' : ''}">Tienda</a>
          <a href="/buyer.html" class="fc-nav-link ${activePage === 'buyer' ? 'active' : ''}">Facturación</a>
          ${roleLinkHtml}
        </nav>

        <div class="fc-nav-actions">
          <div class="fc-role-switcher" title="Selector rápido de rol para demostración de Frontend">
            <span>Modo Demo:</span>
            <select id="demo-role-select">
              <option value="guest" ${!session ? 'selected' : ''}>Público (Sin sesión)</option>
              <option value="comprador" ${session?.role === 'comprador' ? 'selected' : ''}>Rol: Comprador</option>
              <option value="vendedor" ${session?.role === 'vendedor' ? 'selected' : ''}>Rol: Vendedor</option>
              <option value="admin" ${session?.role === 'admin' ? 'selected' : ''}>Rol: Administrador</option>
            </select>
          </div>

          <a href="/buyer.html" class="fc-cart-btn" title="Ir al carrito y facturación">
            <span>🛒</span>
            <span id="nav-cart-badge" class="fc-cart-count">${cartCount}</span>
          </a>

          ${userActionsHtml}
        </div>
      </div>
    </header>
  `;

  const logoutBtn = document.getElementById('btn-logout-nav');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      MockDB.setSession(null);
      showToast('Sesión cerrada correctamente.', 'info');
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 400);
    });
  }

  const demoSelect = document.getElementById('demo-role-select');
  if (demoSelect) {
    demoSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      const users = MockDB.getUsers();
      if (val === 'guest') {
        MockDB.setSession(null);
        window.location.href = '/index.html';
      } else {
        const found = users.find((u) => u.role === val);
        if (found) {
          MockDB.setSession(found);
          if (val === 'comprador') window.location.href = '/buyer.html';
          if (val === 'vendedor') window.location.href = '/seller.html';
          if (val === 'admin') window.location.href = '/admin.html';
        }
      }
    });
  }

  window.addEventListener('fc:cart-updated', () => {
    const badge = document.getElementById('nav-cart-badge');
    if (badge) {
      const updated = MockDB.getCart().reduce((a, b) => a + Number(b.quantity), 0);
      badge.textContent = updated;
    }
  });
}

export function renderFooter() {
  const footerHost = document.getElementById('app-footer');
  if (!footerHost) return;

  footerHost.innerHTML = `
    <footer class="fc-footer">
      <div class="container">
        <div class="fc-footer-grid">
          <div>
            <div class="fc-brand" style="margin-bottom:0.6rem;">
              <div class="fc-brand-logo" style="width:32px;height:32px;font-size:0.9rem;">F&C</div>
              <div>FERNET<span class="amp">&</span>COLOCHO</div>
            </div>
            <p>Tu tienda digital de videojuegos para PC y consolas con entrega inmediata de licencias y facturación instantánea.</p>
          </div>
          <div>
            <strong style="color:var(--text-main);display:block;margin-bottom:0.5rem;">Navegación Rápida</strong>
            <ul style="display:flex;flex-direction:column;gap:0.35rem;">
              <li><a href="/index.html">Catálogo y Ofertas</a></li>
              <li><a href="/login.html">Iniciar Sesión</a></li>
              <li><a href="/register.html">Registro de Compradores</a></li>
              <li><a href="/buyer.html">Mi Carrito y Facturas</a></li>
            </ul>
          </div>
          <div>
            <strong style="color:var(--text-main);display:block;margin-bottom:0.5rem;">Entorno de Laboratorio</strong>
            <p>Proyecto académico Full Stack — Debian Server, Apache, Node.js, Express y PostgreSQL en Docker.</p>
            <button id="btn-reset-demo-db" class="btn btn-outline btn-sm" style="margin-top:0.6rem;">🔄 Restaurar Datos Demo</button>
          </div>
        </div>
        <div class="fc-footer-bottom">
          <span>© 2026 Fernet&Colocho Store. Todos los derechos reservados.</span>
          <span>Equipo: Samuel · Colocho · Andrea · Julio · Jeremy</span>
        </div>
      </div>
    </footer>
  `;

  const resetBtn = document.getElementById('btn-reset-demo-db');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('¿Restaurar los 15 videojuegos y usuarios de fábrica en el navegador?')) {
        MockDB.resetAll();
        window.location.reload();
      }
    });
  }
}