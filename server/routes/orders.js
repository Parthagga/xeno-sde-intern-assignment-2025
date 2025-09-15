const express = require('express');
const passport = require('passport');
const Joi = require('joi');
const pool = require('../config/database');

const router = express.Router();

// Middleware to authenticate requests
const authenticate = passport.authenticate('jwt', { session: false });

// Validation schemas
const orderSchema = Joi.object({
  customer_id: Joi.number().integer().required(),
  order_date: Joi.date().optional(),
  total_amount: Joi.number().min(0).required(),
  status: Joi.string().valid('pending', 'completed', 'cancelled', 'refunded').default('pending'),
  items_count: Joi.number().integer().min(0).default(0)
});

const bulkOrderSchema = Joi.object({
  orders: Joi.array().items(orderSchema).min(1).max(1000).required()
});

// GET /api/orders - Get all orders with pagination and filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const customer_id = req.query.customer_id;
    const status = req.query.status;
    const start_date = req.query.start_date;
    const end_date = req.query.end_date;

    let query = `
      SELECT o.*, c.name as customer_name, c.email as customer_email 
      FROM orders o 
      JOIN customers c ON o.customer_id = c.id 
      WHERE 1=1
    `;
    let params = [];

    if (customer_id) {
      query += ' AND o.customer_id = ?';
      params.push(customer_id);
    }

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    if (start_date) {
      query += ' AND o.order_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND o.order_date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY o.order_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [orders] = await pool.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM orders o WHERE 1=1';
    let countParams = [];

    if (customer_id) {
      countQuery += ' AND o.customer_id = ?';
      countParams.push(customer_id);
    }

    if (status) {
      countQuery += ' AND o.status = ?';
      countParams.push(status);
    }

    if (start_date) {
      countQuery += ' AND o.order_date >= ?';
      countParams.push(start_date);
    }

    if (end_date) {
      countQuery += ' AND o.order_date <= ?';
      countParams.push(end_date);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id - Get order by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const [orders] = await pool.execute(
      `SELECT o.*, c.name as customer_name, c.email as customer_email 
       FROM orders o 
       JOIN customers c ON o.customer_id = c.id 
       WHERE o.id = ?`,
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: orders[0] });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST /api/orders - Create a new order
router.post('/', authenticate, async (req, res) => {
  try {
    const { error, value } = orderSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    // Verify customer exists
    const [customers] = await pool.execute(
      'SELECT id FROM customers WHERE id = ?',
      [value.customer_id]
    );

    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const [result] = await pool.execute(
      `INSERT INTO orders (customer_id, order_date, total_amount, status, items_count) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        value.customer_id,
        value.order_date || new Date(),
        value.total_amount,
        value.status,
        value.items_count
      ]
    );

    // Update customer's total spent and order count
    await pool.execute(
      `UPDATE customers SET 
       total_spent = total_spent + ?, 
       total_orders = total_orders + 1,
       last_visit = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [value.total_amount, value.customer_id]
    );

    const [newOrder] = await pool.execute(
      `SELECT o.*, c.name as customer_name, c.email as customer_email 
       FROM orders o 
       JOIN customers c ON o.customer_id = c.id 
       WHERE o.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ 
      message: 'Order created successfully',
      order: newOrder[0]
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// POST /api/orders/bulk - Bulk create orders
router.post('/bulk', authenticate, async (req, res) => {
  try {
    const { error, value } = bulkOrderSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const createdOrders = [];
      const errors = [];

      for (let i = 0; i < value.orders.length; i++) {
        const order = value.orders[i];
        
        try {
          // Verify customer exists
          const [customers] = await connection.execute(
            'SELECT id FROM customers WHERE id = ?',
            [order.customer_id]
          );

          if (customers.length === 0) {
            errors.push({
              index: i,
              customer_id: order.customer_id,
              error: 'Customer not found'
            });
            continue;
          }

          const [result] = await connection.execute(
            `INSERT INTO orders (customer_id, order_date, total_amount, status, items_count) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              order.customer_id,
              order.order_date || new Date(),
              order.total_amount,
              order.status,
              order.items_count
            ]
          );

          // Update customer's total spent and order count
          await connection.execute(
            `UPDATE customers SET 
             total_spent = total_spent + ?, 
             total_orders = total_orders + 1,
             last_visit = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [order.total_amount, order.customer_id]
          );

          const [newOrder] = await connection.execute(
            `SELECT o.*, c.name as customer_name, c.email as customer_email 
             FROM orders o 
             JOIN customers c ON o.customer_id = c.id 
             WHERE o.id = ?`,
            [result.insertId]
          );

          createdOrders.push(newOrder[0]);
        } catch (err) {
          errors.push({
            index: i,
            customer_id: order.customer_id,
            error: err.message
          });
        }
      }

      await connection.commit();

      res.status(201).json({
        message: 'Bulk order creation completed',
        created: createdOrders.length,
        errors: errors.length,
        orders: createdOrders,
        errorDetails: errors
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in bulk order creation:', error);
    res.status(500).json({ error: 'Failed to create orders' });
  }
});

// PUT /api/orders/:id - Update order
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = orderSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    // Get current order to calculate difference
    const [currentOrders] = await pool.execute(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );

    if (currentOrders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const currentOrder = currentOrders[0];

    const [result] = await pool.execute(
      `UPDATE orders SET 
       customer_id = ?, order_date = ?, total_amount = ?, 
       status = ?, items_count = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        value.customer_id,
        value.order_date,
        value.total_amount,
        value.status,
        value.items_count,
        id
      ]
    );

    // Update customer's total spent if amount changed
    if (currentOrder.total_amount !== value.total_amount) {
      const difference = value.total_amount - currentOrder.total_amount;
      await pool.execute(
        `UPDATE customers SET 
         total_spent = total_spent + ?, 
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [difference, value.customer_id]
      );
    }

    const [updatedOrder] = await pool.execute(
      `SELECT o.*, c.name as customer_name, c.email as customer_email 
       FROM orders o 
       JOIN customers c ON o.customer_id = c.id 
       WHERE o.id = ?`,
      [id]
    );

    res.json({ 
      message: 'Order updated successfully',
      order: updatedOrder[0]
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// DELETE /api/orders/:id - Delete order
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Get order details before deletion
    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    const [result] = await pool.execute(
      'DELETE FROM orders WHERE id = ?',
      [id]
    );

    // Update customer's total spent and order count
    await pool.execute(
      `UPDATE customers SET 
       total_spent = total_spent - ?, 
       total_orders = total_orders - 1,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [order.total_amount, order.customer_id]
    );

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

module.exports = router;
