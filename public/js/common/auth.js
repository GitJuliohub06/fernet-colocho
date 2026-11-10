import { MockDB } from './common/mock-data.js';
import { renderNavbar, renderFooter, showToast } from './common/navbar.js';

document.addEventListener('DOMContentLoaded', () => {
  const isLoginPage = Boolean(document.getElementById('login-form'));
  renderNavbar(isLoginPage ? 'login' : 'register');
  renderFooter();

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
  const sqlPreview = document.getElementById('sql-live-preview');

  function updateSqlPreview() {
    if (!sqlPreview) return;
    const u = identifierInput.value;
    const p = passwordInput.value;
    sqlPreview.textContent = `SELECT id, full_name, username, email, role\nFROM users\nWHERE (username = '${u}' OR email = '${u}')\n  AND password_hash = '${p}';`;
  }

  identifierInput.addEventListener('input', updateSqlPreview);
  passwordInput.addEventListener('input', updateSqlPreview);

  document.querySelectorAll('[data-fill-role]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.fillRole;
      const user = MockDB.getUsers().find((u) => u.role === role);
      if (user) {
        identifierInput.value = user.username;
        passwordInput.value = user.password_plain;
        updateSqlPreview();
        showToast(`Credenciales de ${role.toUpperCase()} cargadas.`, 'info');
      }
    });
  });

  document.getElementById('btn-inject-payload')?.addEventListener('click', () => {
    identifierInput.value = "admin' OR '1'='1' --";
    passwordInput.value = 'cualquier_cosa';
    updateSqlPreview();
    showToast('Payload SQL Injection cargado en el campo Usuario.', 'info');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawUser = identifierInput.value.trim();
    const rawPass = passwordInput.value.trim();

    if (!rawUser || !rawPass) {
      showAlert('auth-alert', 'Por favor completa tanto el usuario como la contraseña.');
      return;
    }

    const users = MockDB.getUsers();

    // Simulación fiel del comportamiento vulnerable SQLi para demostración antes de conectar PostgreSQL
    if (rawUser.includes("' OR '1'='1") || rawUser.includes("' OR 1=1")) {
      const targetAdmin = users.find((u) => u.role === 'admin') || users[0];
      MockDB.setSession(targetAdmin);
      showAlert('auth-alert', '¡Explotación SQL Injection exitosa! Accediendo como Administrador...', 'success');
      setTimeout(() => redirectByRole(targetAdmin.role), 700);
      return;
    }

    const found = users.find(
      (u) =>
        u.is_active &&
        (u.username.toLowerCase() === rawUser.toLowerCase() ||
          u.email.toLowerCase() === rawUser.toLowerCase()) &&
        u.password_plain === rawPass
    );

    if (!found) {
      showAlert('auth-alert', 'Credenciales inválidas o cuenta desactivada. Verifica tus datos.');
      return;
    }

    MockDB.setSession(found);
    showAlert('auth-alert', `Bienvenido, ${found.full_name}. Redirigiendo a tu panel...`, 'success');
    setTimeout(() => redirectByRole(found.role), 600);
  });
}

function initRegisterView() {
  const form = document.getElementById('register-form');

  form.addEventListener('submit', (e) => {
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

    const users = MockDB.getUsers();
    const exists = users.some(
      (u) =>
        u.username.toLowerCase() === username.toLowerCase() ||
        u.email.toLowerCase() === email.toLowerCase()
    );

    if (exists) {
      showAlert('register-alert', 'El nombre de usuario o correo electrónico ya está registrado.');
      return;
    }

    const newUser = {
      id: users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1,
      full_name: fullName,
      username,
      email,
      password_plain: password,
      role: 'comprador', // Regla estricta: el registro público jamás crea admins
      is_active: true,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    users.push(newUser);
    MockDB.saveUsers(users);
    MockDB.setSession(newUser);

    showAlert('register-alert', '¡Cuenta creada con éxito! Redirigiendo a la zona de comprador...', 'success');
    setTimeout(() => {
      window.location.href = './buyer.html';
    }, 750);
  });
}