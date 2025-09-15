const express = require('express');
const passport = require('passport');
const Joi = require('joi');
const pool = require('../config/database');

const router = express.Router();

// Middleware to authenticate requests
const authenticate = passport.authenticate('jwt', { session: false });

// Validation schemas
const customerSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(255).required(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
  date_of_birth: Joi.date().optional(),
  registration_date: Joi.date().optional(),
  last_visit: Joi.date().optional(),
  total_spent: Joi.number().min(0).default(0),
  total_orders: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid('active', 'inactive', 'churned').default('active')
});

const bulkCustomerSchema = Joi.object({
  customers: Joi.array().items(customerSchema).min(1).max(1000).required()
});

// GET /api/customers - Get all customers with pagination and filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';

    let query = 'SELECT * FROM customers WHERE 1=1';
    let params = [];

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [customers] = await pool.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM customers WHERE 1=1';
    let countParams = [];

    if (search) {
      countQuery += ' AND (name LIKE ? OR email LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/customers/:id - Get customer by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const [customers] = await pool.execute(
      'SELECT * FROM customers WHERE id = ?',
      [id]
    );

    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ customer: customers[0] });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// POST /api/customers - Create a new customer
router.post('/', authenticate, async (req, res) => {
  try {
    const { error, value } = customerSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO customers (email, name, phone, date_of_birth, registration_date, 
       last_visit, total_spent, total_orders, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        value.email,
        value.name,
        value.phone,
        value.date_of_birth,
        value.registration_date,
        value.last_visit,
        value.total_spent,
        value.total_orders,
        value.status
      ]
    );

    const [newCustomer] = await pool.execute(
      'SELECT * FROM customers WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ 
      message: 'Customer created successfully',
      customer: newCustomer[0]
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Customer with this email already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// POST /api/customers/bulk - Bulk create customers
router.post('/bulk', authenticate, async (req, res) => {
  try {
    const { error, value } = bulkCustomerSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const createdCustomers = [];
      const errors = [];

      for (let i = 0; i < value.customers.length; i++) {
        const customer = value.customers[i];
        
        try {
          const [result] = await connection.execute(
            `INSERT INTO customers (email, name, phone, date_of_birth, registration_date, 
             last_visit, total_spent, total_orders, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              customer.email,
              customer.name,
              customer.phone,
              customer.date_of_birth,
              customer.registration_date,
              customer.last_visit,
              customer.total_spent,
              customer.total_orders,
              customer.status
            ]
          );

          const [newCustomer] = await connection.execute(
            'SELECT * FROM customers WHERE id = ?',
            [result.insertId]
          );

          createdCustomers.push(newCustomer[0]);
        } catch (err) {
          errors.push({
            index: i,
            email: customer.email,
            error: err.code === 'ER_DUP_ENTRY' ? 'Email already exists' : err.message
          });
        }
      }

      await connection.commit();

      res.status(201).json({
        message: 'Bulk customer creation completed',
        created: createdCustomers.length,
        errors: errors.length,
        customers: createdCustomers,
        errorDetails: errors
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in bulk customer creation:', error);
    res.status(500).json({ error: 'Failed to create customers' });
  }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = customerSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    const [result] = await pool.execute(
      `UPDATE customers SET 
       email = ?, name = ?, phone = ?, date_of_birth = ?, 
       registration_date = ?, last_visit = ?, total_spent = ?, 
       total_orders = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        value.email,
        value.name,
        value.phone,
        value.date_of_birth,
        value.registration_date,
        value.last_visit,
        value.total_spent,
        value.total_orders,
        value.status,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const [updatedCustomer] = await pool.execute(
      'SELECT * FROM customers WHERE id = ?',
      [id]
    );

    res.json({ 
      message: 'Customer updated successfully',
      customer: updatedCustomer[0]
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Customer with this email already exists' });
    }
    
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM customers WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

module.exports = router;
