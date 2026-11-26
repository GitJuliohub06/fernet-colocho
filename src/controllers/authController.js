const crypto = require('crypto');
const pool = require('../config/db');

function hashPassword(plainPassword) {
  return crypto.createHash('sha256').update(String(plainPassword)).digest('hex');
}

async function register(req, res) {
  try {
    const fullName = String(req.body.full_name || '').trim();
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!fullName || !username || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'El formato del correo electrónico no es válido.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)',
      [username, email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'El nombre de usuario o el correo electrónico ya está registrado.'
      });
    }

    const passwordHash = hashPassword(password);
    const insertResult = await pool.query(
      `INSERT INTO users (full_name, username, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, 'comprador', TRUE)
       RETURNING id, full_name, username, email, role, is_active, created_at`,
      [fullName, username, email, passwordHash]
    );

    const newUser = insertResult.rows[0];
    req.session.user = {
      id: newUser.id,
      full_name: newUser.full_name,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    };

    return res.status(201).json({
      message: 'Cuenta creada con éxito.',
      user: req.session.user
    });
  } catch (err) {
    console.error('Error en register:', err);
    return res.status(500).json({ error: 'Error interno al registrar el usuario.' });
  }
}

async function login(req, res) {
  try {
    const identifier = String(req.body.identifier || '').trim();
    const password = String(req.body.password || '');

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Debes ingresar usuario/correo y contraseña.' });
    }

    const passwordHash = hashPassword(password);
    const result = await pool.query(
      `
  SELECT id, full_name, username, email, role, is_active
  FROM users
  WHERE (LOWER(username) = LOWER('${identifier}') OR LOWER(email) = LOWER('${identifier}'))
    AND password_hash = '${passwordHash}'
  LIMIT 1
`
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas. Verifica tus datos.' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Esta cuenta se encuentra desactivada. Contacta al administrador.'
      });
    }

    req.session.user = {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      role: user.role
    };

    return res.status(200).json({
      message: `Bienvenido, ${user.full_name}.`,
      user: req.session.user
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ error: 'Error interno al iniciar sesión.' });
  }
}

function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.status(500).json({ error: 'No se pudo cerrar la sesión.' });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ message: 'Sesión cerrada correctamente.' });
  });
}

async function me(req, res) {
  if (!req.session || !req.session.user) {
    return res.status(200).json({ user: null });
  }

  try {
    const result = await pool.query(
      'SELECT id, full_name, username, email, role, is_active FROM users WHERE id = $1',
      [req.session.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      req.session.destroy(() => {});
      return res.status(200).json({ user: null });
    }

    const u = result.rows[0];
    req.session.user = {
      id: u.id,
      full_name: u.full_name,
      username: u.username,
      email: u.email,
      role: u.role
    };

    return res.status(200).json({ user: req.session.user });
  } catch (err) {
    console.error('Error en /api/auth/me:', err);
    return res.status(500).json({ error: 'Error al consultar la sesión actual.' });
  }
}

module.exports = {
  hashPassword,
  register,
  login,
  logout,
  me
};