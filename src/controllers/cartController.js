const pool = require('../config/db');

const TAX_RATE = 0.13;

async function buildCartResponse(userId) {
  const result = await pool.query(
    `SELECT ci.product_id, ci.quantity, p.title, p.price, p.stock, p.platform, p.image_url, p.is_active
     FROM cart_items ci
     INNER JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = $1
     ORDER BY ci.added_at ASC`,
    [userId]
  );

  let subtotal = 0;
  let totalItems = 0;

  const items = result.rows.map((row) => {
    const price = Number(row.price);
    const quantity = Number(row.quantity);
    const lineTotal = Number((price * quantity).toFixed(2));
    subtotal += lineTotal;
    totalItems += quantity;

    return {
      product_id: row.product_id,
      title: row.title,
      price,
      stock: Number(row.stock),
      platform: row.platform,
      image_url: row.image_url,
      is_active: row.is_active,
      quantity,
      line_total: lineTotal
    };
  });

  const roundedSubtotal = Number(subtotal.toFixed(2));
  const tax = Number((roundedSubtotal * TAX_RATE).toFixed(2));
  const total = Number((roundedSubtotal + tax).toFixed(2));

  return {
    items,
    total_items: totalItems,
    subtotal: roundedSubtotal,
    tax,
    total
  };
}

async function getCart(req, res) {
  try {
    const cart = await buildCartResponse(req.session.user.id);
    return res.status(200).json(cart);
  } catch (err) {
    console.error('Error en getCart:', err);
    return res.status(500).json({ error: 'Error al consultar el carrito.' });
  }
}

async function addToCart(req, res) {
  try {
    const userId = req.session.user.id;
    const productId = Number(req.body.product_id);
    const quantity = req.body.quantity !== undefined ? Number(req.body.quantity) : 1;

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: 'ID de producto inválido.' });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'La cantidad debe ser un entero mayor a 0.' });
    }

    const prodRes = await pool.query(
      'SELECT id, title, stock, is_active FROM products WHERE id = $1',
      [productId]
    );

    if (prodRes.rows.length === 0 || !prodRes.rows[0].is_active) {
      return res.status(404).json({ error: 'El producto no existe o no está disponible.' });
    }

    const product = prodRes.rows[0];
    if (product.stock <= 0) {
      return res.status(400).json({ error: 'Producto sin stock disponible.' });
    }

    const existingRes = await pool.query(
      'SELECT quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    const currentQty = existingRes.rows.length > 0 ? Number(existingRes.rows[0].quantity) : 0;
    const newQty = currentQty + quantity;

    if (newQty > product.stock) {
      return res.status(400).json({
        error: `Stock máximo disponible para "${product.title}": ${product.stock} unidades.`
      });
    }

    await pool.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = EXCLUDED.quantity`,
      [userId, productId, newQty]
    );

    const cart = await buildCartResponse(userId);
    return res.status(200).json({
      message: `"${product.title}" agregado al carrito.`,
      cart
    });
  } catch (err) {
    console.error('Error en addToCart:', err);
    return res.status(500).json({ error: 'Error al agregar producto al carrito.' });
  }
}

async function updateCartItem(req, res) {
  try {
    const userId = req.session.user.id;
    const productId = Number(req.params.productId);
    const quantity = Number(req.body.quantity);

    if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity)) {
      return res.status(400).json({ error: 'Parámetros de carrito inválidos.' });
    }

    if (quantity <= 0) {
      await pool.query(
        'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2',
        [userId, productId]
      );
      const cart = await buildCartResponse(userId);
      return res.status(200).json({ message: 'Producto eliminado del carrito.', cart });
    }

    const prodRes = await pool.query(
      'SELECT title, stock, is_active FROM products WHERE id = $1',
      [productId]
    );

    if (prodRes.rows.length === 0 || !prodRes.rows[0].is_active) {
      return res.status(404).json({ error: 'Producto no disponible.' });
    }

    if (quantity > prodRes.rows[0].stock) {
      return res.status(400).json({
        error: `Stock máximo alcanzado (${prodRes.rows[0].stock} unidades).`
      });
    }

    const updated = await pool.query(
      'UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND product_id = $3 RETURNING id',
      [quantity, userId, productId]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'El producto no está en tu carrito.' });
    }

    const cart = await buildCartResponse(userId);
    return res.status(200).json({ message: 'Cantidad actualizada.', cart });
  } catch (err) {
    console.error('Error en updateCartItem:', err);
    return res.status(500).json({ error: 'Error al actualizar el carrito.' });
  }
}

async function removeCartItem(req, res) {
  try {
    const userId = req.session.user.id;
    const productId = Number(req.params.productId);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: 'ID de producto inválido.' });
    }

    await pool.query(
      'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    const cart = await buildCartResponse(userId);
    return res.status(200).json({ message: 'Producto eliminado del carrito.', cart });
  } catch (err) {
    console.error('Error en removeCartItem:', err);
    return res.status(500).json({ error: 'Error al eliminar producto del carrito.' });
  }
}

async function clearCart(req, res) {
  try {
    const userId = req.session.user.id;
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    const cart = await buildCartResponse(userId);
    return res.status(200).json({ message: 'Carrito vaciado.', cart });
  } catch (err) {
    console.error('Error en clearCart:', err);
    return res.status(500).json({ error: 'Error al vaciar el carrito.' });
  }
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
};