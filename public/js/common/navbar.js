/**
 * FERNET&COLOCHO — BARRA DE NAVEGACIÓN, SESIÓN REAL Y TOASTS
 */

import { apiRequest } from './api.js';

let cartListenerBound = false;

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

  const textSpan = document.createElement('span');
  textSpan.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.color = 'inherit';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontWeight = '700';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => toast.remove());

  toast.append(textSpan, closeBtn);
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 3800);
}

export async function renderNavbar(activePage = 'index') {
  const navHost = document.getElementById('app-navbar');
  if (!navHost) return null;

  let session = null;
  let cartCount = 0;

  try {
    const authRes = await apiRequest('/api/auth/me');
    session = authRes.user || null;
  } catch (err) {
    console.error('Error al consultar sesión en navbar:', err);
  }

  if (session) {
    try {
      const cartRes = await apiRequest('/api/cart');
      cartCount = Number(cartRes.total_items || 0);
    } catch (_err) {
      cartCount = 0;
    }
  }

  let roleLinkHtml = '';
  if (session) {
    if (session.role === 'comprador') {
      roleLinkHtml = `<a href="./buyer.html" class="fc-nav-link role-link ${activePage === 'buyer' ? 'active' : ''}">🛒 Zona Comprador</a>`;
    } else if (session.role === 'vendedor') {
      roleLinkHtml = `<a href="./seller.html" class="fc-nav-link role-link ${activePage === 'seller' ? 'active' : ''}">📦 Panel Vendedor</a>`;
    } else if (session.role === 'admin') {
      roleLinkHtml = `
        <a href="./seller.html" class="fc-nav-link ${activePage === 'seller' ? 'active' : ''}">Panel Vendedor</a>
        <a href="./admin.html" class="fc-nav-link role-link ${activePage === 'admin' ? 'active' : ''}">🛡️ Panel Admin</a>
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
      <a href="./login.html" class="btn btn-outline btn-sm ${activePage === 'login' ? 'active' : ''}">Iniciar Sesión</a>
      <a href="./register.html" class="btn btn-primary btn-sm ${activePage === 'register' ? 'active' : ''}">Crear Cuenta</a>
    `;

  navHost.innerHTML = `
    <header class="fc-navbar">
      <div class="container fc-navbar-inner">
        <a href="./index.html" class="fc-brand">
          <div class="fc-brand-logo">F&C</div>
          <div>FERNET<span class="amp">&</span>COLOCHO</div>
        </a>

        <nav class="fc-nav-links">
          <a href="./index.html" class="fc-nav-link ${activePage === 'index' ? 'active' : ''}">Tienda</a>
          <a href="./buyer.html" class="fc-nav-link ${activePage === 'buyer' ? 'active' : ''}">Facturación</a>
          ${roleLinkHtml}
        </nav>

        <div class="fc-nav-actions">
          <a href="./buyer.html" class="fc-cart-btn" title="Ir al carrito y facturación">
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
    logoutBtn.addEventListener('click', async () => {
      try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
        showToast('Sesión cerrada correctamente.', 'info');
        setTimeout(() => {
          window.location.href = './index.html';
        }, 400);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  if (!cartListenerBound) {
    cartListenerBound = true;
    window.addEventListener('fc:cart-updated', async (e) => {
      const badge = document.getElementById('nav-cart-badge');
      if (!badge) return;

      if (e.detail && typeof e.detail.totalItems === 'number') {
        badge.textContent = e.detail.totalItems;
        return;
      }

      try {
        const updatedCart = await apiRequest('/api/cart');
        badge.textContent = Number(updatedCart.total_items || 0);
      } catch (_err) {
        badge.textContent = '0';
      }
    });
  }

  return session;
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
              <li><a href="./index.html">Catálogo y Ofertas</a></li>
              <li><a href="./login.html">Iniciar Sesión</a></li>
              <li><a href="./register.html">Registro de Compradores</a></li>
              <li><a href="./buyer.html">Mi Carrito y Facturas</a></li>
            </ul>
          </div>
          <div>
            <strong style="color:var(--text-main);display:block;margin-bottom:0.5rem;">Entorno de Laboratorio</strong>
            <p>Proyecto académico Full Stack — Debian Server 13, Nginx, Node.js, Express y PostgreSQL.</p>
          </div>
        </div>
        <div class="fc-footer-bottom">
          <span>© 2026 Fernet&Colocho Store. Todos los derechos reservados.</span>
          <span>Equipo: Samuel · Colocho · Andrea · Julio · Jeremy</span>
        </div>
      </div>
    </footer>
  `;
}