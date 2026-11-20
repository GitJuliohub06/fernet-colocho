const pool = require('../config/db');

const TAX_RATE = 0.13;

async function createOrder(req, res) {
  const user = req.session.user;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const cartRes = await client.query(
      `SELECT ci.product_id, ci.quantity, p.title, p.price, p.stock, p.is_active
       FROM cart_items ci
       INNER JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1
       ORDER BY ci.product_id ASC
       FOR UPDATE OF p`,
      [user.id]
    );

    if (cartRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Agrega al menos un videojuego al carrito antes de facturar.'
      });
    }

    let subtotal = 0;
    const preparedItems = [];

    for (const row of cartRes.rows) {
      if (!row.is_active) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `El producto "${row.title}" ya no está disponible en la tienda.`
        });
      }

      if (Number(row.stock) < Number(row.quantity)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Stock insuficiente para "${row.title}". Disponible: ${row.stock}.`
        });
      }

      const unitPrice = Number(row.price);
      const quantity = Number(row.quantity);
      const lineTotal = Number((unitPrice * quantity).toFixed(2));
      subtotal += lineTotal;

      preparedItems.push({
        product_id: row.product_id,
        product_title: row.title,
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal
      });
    }

    const roundedSubtotal = Number(subtotal.toFixed(2));
    const tax = Number((roundedSubtotal * TAX_RATE).toFixed(2));
    const total = Number((roundedSubtotal + tax).toFixed(2));
    const tempInvoice = `TEMP-${Date.now()}-${user.id}`;

    const orderInsert = await client.query(
      `INSERT INTO orders (invoice_number, buyer_id, buyer_name, buyer_email, subtotal, tax, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [tempInvoice, user.id, user.full_name, user.email, roundedSubtotal, tax, total]
    );

    const orderId = orderInsert.rows[0].id;
    const year = new Date().getFullYear();
    const invoiceNumber = `FC-${year}-${String(orderId).padStart(4, '0')}`;

    await client.query(
      'UPDATE orders SET invoice_number = $1 WHERE id = $2',
      [invoiceNumber, orderId]
    );

    for (const item of preparedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_title, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, item.product_id, item.product_title, item.quantity, item.unit_price, item.line_total]
      );

      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query('DELETE FROM cart_items WHERE user_id = $1', [user.id]);
    await client.query('COMMIT');

    return res.status(201).json({
      message: `¡Compra confirmada! Factura ${invoiceNumber} emitida.`,
      order: {
        id: orderId,
        invoice_number: invoiceNumber,
        buyer_id: user.id,
        buyer_name: user.full_name,
        buyer_email: user.email,
        subtotal: roundedSubtotal,
        tax,
        total,
        created_at: orderInsert.rows[0].created_at,
        items: preparedItems
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en createOrder:', err);
    return res.status(500).json({ error: 'Error interno al procesar la compra.' });
  } finally {
    client.release();
  }
}

async function getOrders(req, res) {
  try {
    const user = req.session.user;
    const showAll = req.query.all === 'true' && user.role === 'admin';

    const ordersRes = showAll
      ? await pool.query('SELECT * FROM orders ORDER BY id DESC')
      : await pool.query('SELECT * FROM orders WHERE buyer_id = $1 ORDER BY id DESC', [user.id]);

    if (ordersRes.rows.length === 0) {
      return res.status(200).json({ orders: [] });
    }

    const orderIds = ordersRes.rows.map((o) => o.id);
    const itemsRes = await pool.query(
      'SELECT * FROM order_items WHERE order_id = ANY($1::int[]) ORDER BY id ASC',
      [orderIds]
    );

    const itemsByOrder = new Map();
    for (const item of itemsRes.rows) {
      if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
      itemsByOrder.get(item.order_id).push({
        product_id: item.product_id,
        product_title: item.product_title,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        line_total: Number(item.line_total)
      });
    }

    const orders = ordersRes.rows.map((o) => ({
      id: o.id,
      invoice_number: o.invoice_number,
      buyer_id: o.buyer_id,
      buyer_name: o.buyer_name,
      buyer_email: o.buyer_email,
      subtotal: Number(o.subtotal),
      tax: Number(o.tax),
      total: Number(o.total),
      created_at: o.created_at,
      items: itemsByOrder.get(o.id) || []
    }));

    return res.status(200).json({ orders });
  } catch (err) {
    console.error('Error en getOrders:', err);
    return res.status(500).json({ error: 'Error al consultar el historial de facturas.' });
  }
}

async function getOrderById(req, res) {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: 'ID de factura inválido.' });
    }

    const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada.' });
    }

    const order = orderRes.rows[0];
    const user = req.session.user;

    if (user.role !== 'admin' && Number(order.buyer_id) !== Number(user.id)) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta factura.' });
    }

    const itemsRes = await pool.query(
      'SELECT product_id, product_title, quantity, unit_price, line_total FROM order_items WHERE order_id = $1 ORDER BY id ASC',
      [orderId]
    );

    return res.status(200).json({
      order: {
        id: order.id,
        invoice_number: order.invoice_number,
        buyer_id: order.buyer_id,
        buyer_name: order.buyer_name,
        buyer_email: order.buyer_email,
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        total: Number(order.total),
        created_at: order.created_at,
        items: itemsRes.rows.map((i) => ({
          product_id: i.product_id,
          product_title: i.product_title,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          line_total: Number(i.line_total)
        }))
      }
    });
  } catch (err) {
    console.error('Error en getOrderById:', err);
    return res.status(500).json({ error: 'Error al consultar la factura.' });
  }
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById
};