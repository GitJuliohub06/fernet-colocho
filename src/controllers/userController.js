const pool = require('../config/db');
const { hashPassword } = require('./authController');

const VALID_ROLES = new Set(['comprador', 'vendedor', 'admin']);

async function getAdminStats(_req, res) {
  try {
    const [prodRes, userRes, orderRes] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM products'),
      pool.query('SELECT COUNT(*)::int AS total FROM users'),
      pool.query('SELECT COUNT(*)::int AS total, COALESCE(SUM(total), 0)::numeric AS revenue FROM orders')
    ]);

    return res.status(200).json({
      total_products: prodRes.rows[0].total,
      total_users: userRes.rows[0].total,
      total_orders: orderRes.rows[0].total,
      total_revenue: Number(orderRes.rows[0].revenue)
    });
  } catch (err) {
    console.error('Error en getAdminStats:', err);
    return res.status(500).json({ error: 'Error al obtener estadísticas administrativas.' });
  }
}

async function getUsers(req, res) {
  try {
    const search = String(req.query.search || '').trim();
    let result;

    if (search) {
      const pattern = `%${search}%`;
      result = await pool.query(
        `SELECT id, full_name, username, email, role, is_active, created_at
         FROM users
         WHERE full_name ILIKE $1 OR username ILIKE $1 OR email ILIKE $1
         ORDER BY id ASC`,
        [pattern]
      );
    } else {
      result = await pool.query(
        `SELECT id, full_name, username, email, role, is_active, created_at
         FROM users
         ORDER BY id ASC`
      );
    }

    return res.status(200).json({ users: result.rows });
  } catch (err) {
    console.error('Error en getUsers:', err);
    return res.status(500).json({ error: 'Error al consultar usuarios.' });
  }
}

async function createUser(req, res) {
  try {
    const fullName = String(req.body.full_name || '').trim();
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const role = String(req.body.role || 'comprador').trim();
    const password = String(req.body.password || '');
    const isActive = req.body.is_active !== undefined ? Boolean(req.body.is_active) : true;

    if (!fullName || !username || !email || !password) {
      return res.status(400).json({ error: 'Nombre, usuario, correo y contraseña son obligatorios.' });
    }

    if (!VALID_ROLES.has(role)) {
      return res.status(400).json({ error: 'Rol inválido. Usa comprador, vendedor o admin.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const exists = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)',
      [username, email]
    );

    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'El usuario o correo electrónico ya está en uso.' });
    }

    const passwordHash = hashPassword(password);
    const created = await pool.query(
      `INSERT INTO users (full_name, username, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, username, email, role, is_active, created_at`,
      [fullName, username, email, passwordHash, role, isActive]
    );

    return res.status(201).json({
      message: `Usuario @${created.rows[0].username} creado con rol ${created.rows[0].role}.`,
      user: created.rows[0]
    });
  } catch (err) {
    console.error('Error en createUser:', err);
    return res.status(500).json({ error: 'Error interno al crear el usuario.' });
  }
}

async function updateUser(req, res) {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'ID de usuario inválido.' });
    }

    const existingRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const existing = existingRes.rows[0];
    const fullName =
      req.body.full_name !== undefined ? String(req.body.full_name).trim() : existing.full_name;
    const username =
      req.body.username !== undefined ? String(req.body.username).trim() : existing.username;
    const email =
      req.body.email !== undefined ? String(req.body.email).trim().toLowerCase() : existing.email;
    const role = req.body.role !== undefined ? String(req.body.role).trim() : existing.role;
    const isActive =
      req.body.is_active !== undefined ? Boolean(req.body.is_active) : existing.is_active;
    const newPassword = req.body.password !== undefined ? String(req.body.password) : '';

    if (!fullName || !username || !email) {
      return res.status(400).json({ error: 'Nombre, usuario y correo no pueden estar vacíos.' });
    }

    if (!VALID_ROLES.has(role)) {
      return res.status(400).json({ error: 'Rol inválido.' });
    }

    if (userId === req.session.user.id && (!isActive || role !== 'admin')) {
      return res.status(400).json({
        error: 'No puedes desactivar ni quitar privilegios de administrador a tu propia cuenta.'
      });
    }

    const conflict = await pool.query(
      'SELECT id FROM users WHERE (LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)) AND id <> $3',
      [username, email, userId]
    );

    if (conflict.rows.length > 0) {
      return res.status(409).json({ error: 'El nombre de usuario o correo ya pertenece a otra cuenta.' });
    }

    let passwordHash = existing.password_hash;
    if (newPassword.trim() !== '') {
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      }
      passwordHash = hashPassword(newPassword);
    }

    const updated = await pool.query(
      `UPDATE users
       SET full_name = $1, username = $2, email = $3, role = $4, is_active = $5, password_hash = $6
       WHERE id = $7
       RETURNING id, full_name, username, email, role, is_active, created_at`,
      [fullName, username, email, role, isActive, passwordHash, userId]
    );

    return res.status(200).json({
      message: `Usuario @${updated.rows[0].username} actualizado correctamente.`,
      user: updated.rows[0]
    });
  } catch (err) {
    console.error('Error en updateUser:', err);
    return res.status(500).json({ error: 'Error interno al actualizar el usuario.' });
  }
}

async function deleteUser(req, res) {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'ID de usuario inválido.' });
    }

    if (userId === req.session.user.id) {
      return res.status(400).json({
        error: 'No puedes eliminar tu propia cuenta administrativa activa.'
      });
    }

    const deleted = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, username',
      [userId]
    );

    if (deleted.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    return res.status(200).json({
      message: `Usuario @${deleted.rows[0].username} eliminado del sistema.`,
      deleted: deleted.rows[0]
    });
  } catch (err) {
    console.error('Error en deleteUser:', err);
    return res.status(500).json({ error: 'Error interno al eliminar el usuario.' });
  }
}

module.exports = {
  getAdminStats,
  getUsers,
  createUser,
  updateUser,
  deleteUser
};