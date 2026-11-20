const pool = require('../config/db');

function parseBoolean(value, defaultValue = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'off', 'no'].includes(normalized)) return false;
  }
  return defaultValue;
}

async function getCategories(_req, res) {
  try {
    const result = await pool.query(
      'SELECT id, name, slug, description FROM categories ORDER BY id ASC'
    );
    return res.status(200).json({ categories: result.rows });
  } catch (err) {
    console.error('Error en getCategories:', err);
    return res.status(500).json({ error: 'Error al obtener categorías.' });
  }
}

async function getProducts(req, res) {
  try {
    const {
      search = '',
      category = 'all',
      platform = 'all',
      onlyOffers = 'false',
      sort = 'featured',
      mine = 'false',
      includeInactive = 'false'
    } = req.query;

    const sessionUser = req.session ? req.session.user : null;
    const conditions = [];
    const values = [];

    const canSeeInactive =
      sessionUser && (sessionUser.role === 'admin' || sessionUser.role === 'vendedor');

    if (!parseBoolean(includeInactive, false) || !canSeeInactive) {
      conditions.push('p.is_active = TRUE');
    }

    if (parseBoolean(mine, false)) {
      if (!sessionUser || (sessionUser.role !== 'vendedor' && sessionUser.role !== 'admin')) {
        return res.status(403).json({ error: 'No autorizado para filtrar inventario propio.' });
      }
      values.push(sessionUser.id);
      conditions.push(`p.seller_id = $${values.length}`);
    }

    if (category && category !== 'all') {
      const categoryId = Number(category);
      if (!Number.isInteger(categoryId)) {
        return res.status(400).json({ error: 'ID de categoría inválido.' });
      }
      values.push(categoryId);
      conditions.push(`p.category_id = $${values.length}`);
    }

    if (platform && platform !== 'all') {
      values.push(`%${String(platform).trim()}%`);
      conditions.push(`p.platform ILIKE $${values.length}`);
    }

    if (parseBoolean(onlyOffers, false)) {
      conditions.push('p.old_price IS NOT NULL AND p.old_price > p.price');
    }

    if (String(search).trim()) {
      values.push(`%${String(search).trim()}%`);
      const idx = values.length;
      conditions.push(
        `(p.title ILIKE $${idx} OR p.description ILIKE $${idx} OR p.platform ILIKE $${idx} OR c.name ILIKE $${idx})`
      );
    }

    let orderBy = 'p.is_featured DESC, p.id DESC';
    if (sort === 'price-asc') orderBy = 'p.price ASC, p.id DESC';
    else if (sort === 'price-desc') orderBy = 'p.price DESC, p.id DESC';
    else if (sort === 'title-asc') orderBy = 'p.title ASC';

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT p.id, p.title, p.description, p.price, p.old_price, p.stock,
             p.platform, p.category_id, c.name AS category_name,
             p.seller_id, u.username AS seller_username,
             p.is_featured, p.is_active, p.image_url, p.created_at
      FROM products p
      INNER JOIN categories c ON c.id = p.category_id
      LEFT JOIN users u ON u.id = p.seller_id
      ${whereClause}
      ORDER BY ${orderBy}
    `;

    const result = await pool.query(sql, values);
    const products = result.rows.map((row) => ({
      ...row,
      price: Number(row.price),
      old_price: row.old_price !== null ? Number(row.old_price) : null,
      stock: Number(row.stock)
    }));

    return res.status(200).json({ products });
  } catch (err) {
    console.error('Error en getProducts:', err);
    return res.status(500).json({ error: 'Error al consultar los productos.' });
  }
}

async function getProductById(req, res) {
  try {
    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: 'ID de producto inválido.' });
    }

    const result = await pool.query(
      `SELECT p.id, p.title, p.description, p.price, p.old_price, p.stock,
              p.platform, p.category_id, c.name AS category_name,
              p.seller_id, p.is_featured, p.is_active, p.image_url, p.created_at
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const row = result.rows[0];
    return res.status(200).json({
      product: {
        ...row,
        price: Number(row.price),
        old_price: row.old_price !== null ? Number(row.old_price) : null,
        stock: Number(row.stock)
      }
    });
  } catch (err) {
    console.error('Error en getProductById:', err);
    return res.status(500).json({ error: 'Error al obtener el producto.' });
  }
}

async function createProduct(req, res) {
  try {
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    const platform = String(req.body.platform || '').trim();
    const categoryId = Number(req.body.category_id);
    const price = Number(req.body.price);
    const oldPriceRaw = req.body.old_price;
    const oldPrice =
      oldPriceRaw === undefined || oldPriceRaw === null || String(oldPriceRaw).trim() === ''
        ? null
        : Number(oldPriceRaw);
    const stock = Number(req.body.stock);
    const isFeatured = parseBoolean(req.body.is_featured, false);
    const isActive = parseBoolean(req.body.is_active, true);

    const imageUrl = req.file
      ? `/uploads/games/${req.file.filename}`
      : String(req.body.image_url || '').trim();

    if (!title || !description || !platform || !imageUrl) {
      return res.status(400).json({
        error: 'Título, descripción, plataforma e imagen son obligatorios.'
      });
    }

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({ error: 'Debes seleccionar una categoría válida.' });
    }

    if (Number.isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'El precio actual debe ser mayor que 0.' });
    }

    if (oldPrice !== null && (Number.isNaN(oldPrice) || oldPrice < 0)) {
      return res.status(400).json({ error: 'El precio anterior no puede ser negativo.' });
    }

    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ error: 'El stock debe ser un entero mayor o igual a 0.' });
    }

    const catCheck = await pool.query('SELECT name FROM categories WHERE id = $1', [categoryId]);
    if (catCheck.rows.length === 0) {
      return res.status(400).json({ error: 'La categoría seleccionada no existe.' });
    }

    const sellerId = req.session.user.id;
    const insertResult = await pool.query(
      `INSERT INTO products
        (title, description, price, old_price, stock, platform, category_id, seller_id, is_featured, is_active, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [title, description, price, oldPrice, stock, platform, categoryId, sellerId, isFeatured, isActive, imageUrl]
    );

    const created = insertResult.rows[0];
    return res.status(201).json({
      message: `Videojuego "${created.title}" publicado correctamente.`,
      product: {
        ...created,
        category_name: catCheck.rows[0].name,
        price: Number(created.price),
        old_price: created.old_price !== null ? Number(created.old_price) : null,
        stock: Number(created.stock)
      }
    });
  } catch (err) {
    console.error('Error en createProduct:', err);
    return res.status(500).json({ error: 'Error interno al crear el producto.' });
  }
}

async function updateProduct(req, res) {
  try {
    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: 'ID de producto inválido.' });
    }

    const existingRes = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const existing = existingRes.rows[0];
    if (
      req.session.user.role === 'vendedor' &&
      Number(existing.seller_id) !== Number(req.session.user.id)
    ) {
      return res.status(403).json({
        error: 'Solo puedes editar productos que tú hayas publicado.'
      });
    }

    const title = req.body.title !== undefined ? String(req.body.title).trim() : existing.title;
    const description =
      req.body.description !== undefined ? String(req.body.description).trim() : existing.description;
    const platform =
      req.body.platform !== undefined ? String(req.body.platform).trim() : existing.platform;
    const categoryId =
      req.body.category_id !== undefined ? Number(req.body.category_id) : existing.category_id;
    const price = req.body.price !== undefined ? Number(req.body.price) : Number(existing.price);

    let oldPrice = existing.old_price !== null ? Number(existing.old_price) : null;
    if (req.body.old_price !== undefined) {
      oldPrice =
        req.body.old_price === null || String(req.body.old_price).trim() === ''
          ? null
          : Number(req.body.old_price);
    }

    const stock = req.body.stock !== undefined ? Number(req.body.stock) : Number(existing.stock);
    const isFeatured =
      req.body.is_featured !== undefined
        ? parseBoolean(req.body.is_featured, existing.is_featured)
        : existing.is_featured;
    const isActive =
      req.body.is_active !== undefined
        ? parseBoolean(req.body.is_active, existing.is_active)
        : existing.is_active;

    const imageUrl = req.file
      ? `/uploads/games/${req.file.filename}`
      : req.body.image_url !== undefined
        ? String(req.body.image_url).trim()
        : existing.image_url;

    if (!title || !description || !platform || !imageUrl) {
      return res.status(400).json({ error: 'Campos obligatorios incompletos.' });
    }

    if (Number.isNaN(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ error: 'Precio o stock inválido.' });
    }

    const updateRes = await pool.query(
      `UPDATE products
       SET title = $1, description = $2, price = $3, old_price = $4, stock = $5,
           platform = $6, category_id = $7, is_featured = $8, is_active = $9, image_url = $10
       WHERE id = $11
       RETURNING *`,
      [title, description, price, oldPrice, stock, platform, categoryId, isFeatured, isActive, imageUrl, productId]
    );

    const catRes = await pool.query('SELECT name FROM categories WHERE id = $1', [categoryId]);
    const updated = updateRes.rows[0];

    return res.status(200).json({
      message: `Producto "${updated.title}" actualizado correctamente.`,
      product: {
        ...updated,
        category_name: catRes.rows[0] ? catRes.rows[0].name : 'General',
        price: Number(updated.price),
        old_price: updated.old_price !== null ? Number(updated.old_price) : null,
        stock: Number(updated.stock)
      }
    });
  } catch (err) {
    console.error('Error en updateProduct:', err);
    return res.status(500).json({ error: 'Error interno al actualizar el producto.' });
  }
}

async function adjustStock(req, res) {
  try {
    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: 'ID de producto inválido.' });
    }

    const existingRes = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const existing = existingRes.rows[0];
    if (
      req.session.user.role === 'vendedor' &&
      Number(existing.seller_id) !== Number(req.session.user.id)
    ) {
      return res.status(403).json({
        error: 'Solo puedes modificar el stock de tus propios productos.'
      });
    }

    let newStock;
    if (req.body.delta !== undefined) {
      const delta = Number(req.body.delta);
      if (!Number.isInteger(delta)) {
        return res.status(400).json({ error: 'El ajuste delta debe ser un número entero.' });
      }
      newStock = Math.max(0, Number(existing.stock) + delta);
    } else if (req.body.stock !== undefined) {
      const explicitStock = Number(req.body.stock);
      if (!Number.isInteger(explicitStock) || explicitStock < 0) {
        return res.status(400).json({ error: 'El stock debe ser un entero mayor o igual a 0.' });
      }
      newStock = explicitStock;
    } else {
      return res.status(400).json({ error: 'Debes enviar delta o stock.' });
    }

    const updated = await pool.query(
      'UPDATE products SET stock = $1 WHERE id = $2 RETURNING id, title, stock',
      [newStock, productId]
    );

    return res.status(200).json({
      message: `Stock de "${updated.rows[0].title}" actualizado a ${updated.rows[0].stock} unidades.`,
      product: updated.rows[0]
    });
  } catch (err) {
    console.error('Error en adjustStock:', err);
    return res.status(500).json({ error: 'Error interno al ajustar el stock.' });
  }
}

async function deleteProduct(req, res) {
  try {
    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: 'ID de producto inválido.' });
    }

    const deleted = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING id, title',
      [productId]
    );

    if (deleted.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    return res.status(200).json({
      message: `Producto "${deleted.rows[0].title}" eliminado permanentemente.`,
      deleted: deleted.rows[0]
    });
  } catch (err) {
    console.error('Error en deleteProduct:', err);
    return res.status(500).json({ error: 'Error interno al eliminar el producto.' });
  }
}

module.exports = {
  getCategories,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  adjustStock,
  deleteProduct
};