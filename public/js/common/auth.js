import { apiRequest } from './api.js';
import { renderNavbar, renderFooter } from './navbar.js';

document.addEventListener('DOMContentLoaded', async () => {
  const isLoginPage = Boolean(document.getElementById('login-form'));
  const session = await renderNavbar(isLoginPage ? 'login' : 'register');
  renderFooter();

  if (session) {
    redirectByRole(session.role);
    return;
  }

  if (isLoginPage) {
    initLoginView();
  } else {
    initRegisterView();
  }
});

function redirectByRole(role) {
  if (role === 'admin') {
    window.location.href = './admin.html';
  } else if (role === 'vendedor') {
    window.location.href = './seller.html';
  } else {
    window.location.href = './buyer.html';
  }
}

function showAlert(elementId, message, type = 'error') {
  const box = document.getElementById(elementId);
  if (!box) return;
  box.textContent = message;
  box.className = `auth-alert ${type}`;
  box.style.display = 'block';
}

function initLoginView() {
  const form = document.getElementById('login-form');
  const identifierInput = document.getElementById('login-identifier');
  const passwordInput = document.getElementById('login-password');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = identifierInput.value.trim();
    const password = passwordInput.value;

    if (!identifier || !password) {
      showAlert('auth-alert', 'Por favor completa tanto el usuario como la contraseña.');
      return;
    }

    submitBtn.disabled = true;
    try {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { identifier, password }
      });

      showAlert('auth-alert', `${res.message} Redirigiendo a tu panel...`, 'success');
      setTimeout(() => redirectByRole(res.user.role), 500);
    } catch (err) {
      showAlert('auth-alert', err.message, 'error');
      submitBtn.disabled = false;
    }
  });
}

function initRegisterView() {
  const form = document.getElementById('register-form');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('reg-fullname').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;

    if (!fullName || !username || !email || !password) {
      showAlert('register-alert', 'Todos los campos son obligatorios.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert('register-alert', 'Introduce un correo electrónico con formato válido.');
      return;
    }

    if (password.length < 6) {
      showAlert('register-alert', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirm) {
      showAlert('register-alert', 'Las contraseñas introducidas no coinciden.');
      return;
    }

    submitBtn.disabled = true;
    try {
      await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          full_name: fullName,
          username,
          email,
          password
        }
      });

      showAlert('register-alert', '¡Cuenta creada con éxito! Redirigiendo a la zona de comprador...', 'success');
      setTimeout(() => {
        window.location.href = './buyer.html';
      }, 650);
    } catch (err) {
      showAlert('register-alert', err.message, 'error');
      submitBtn.disabled = false;
    }
  });
}