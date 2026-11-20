const pool = require('../config/db');

async function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: 'Autenticación requerida. Inicia sesión para continuar.'
    });
  }

  try {
    const result = await pool.query(
      'SELECT id, full_name, username, email, role, is_active FROM users WHERE id = $1',
      [req.session.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      req.session.destroy(() => {});
      return res.status(401).json({
        error: 'Tu sesión expiró o tu cuenta fue desactivada.'
      });
    }

    req.session.user = {
      id: result.rows[0].id,
      full_name: result.rows[0].full_name,
      username: result.rows[0].username,
      email: result.rows[0].email,
      role: result.rows[0].role
    };

    next();
  } catch (err) {
    console.error('Error verificando sesión:', err);
    return res.status(500).json({ error: 'Error interno al verificar la sesión.' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Autenticación requerida.' });
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere rol: ${allowedRoles.join(' o ')}.`
      });
    }

    next();

  };

}


module.exports = { requireAuth, requireRole };