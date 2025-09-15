const express = require('express');
const passport = require('passport');
const Joi = require('joi');
const pool = require('../config/database');

const router = express.Router();

// Middleware to authenticate requests
const authenticate = passport.authenticate('jwt', { session: false });

// Validation schemas
const segmentSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(1000).optional(),
  rules: Joi.object().required()
});

// Helper function to build SQL query from rules
function buildSegmentQuery(rules) {
  let whereClause = '';
  let params = [];

  function processRule(rule, isFirst = true) {
    if (rule.operator === 'AND' || rule.operator === 'OR') {
      const conditions = rule.conditions.map((condition, index) => 
        processRule(condition, index === 0)
      ).filter(Boolean);
      
      if (conditions.length > 0) {
        return `(${conditions.join(` ${rule.operator} `)})`;
      }
      return '';
    }

    // Handle individual conditions
    const { field, operator, value } = rule;
    
    if (!field || !operator || value === undefined) {
      return '';
    }

    let condition = '';
    
    switch (field) {
      case 'total_spent':
        switch (operator) {
          case 'greater_than':
            condition = 'total_spent > ?';
            params.push(parseFloat(value));
            break;
          case 'less_than':
            condition = 'total_spent < ?';
            params.push(parseFloat(value));
            break;
          case 'equals':
            condition = 'total_spent = ?';
            params.push(parseFloat(value));
            break;
          case 'between':
            condition = 'total_spent BETWEEN ? AND ?';
            params.push(parseFloat(value.min), parseFloat(value.max));
            break;
        }
        break;
        
      case 'total_orders':
        switch (operator) {
          case 'greater_than':
            condition = 'total_orders > ?';
            params.push(parseInt(value));
            break;
          case 'less_than':
            condition = 'total_orders < ?';
            params.push(parseInt(value));
            break;
          case 'equals':
            condition = 'total_orders = ?';
            params.push(parseInt(value));
            break;
        }
        break;
        
      case 'last_visit':
        switch (operator) {
          case 'days_ago':
            condition = 'last_visit < DATE_SUB(NOW(), INTERVAL ? DAY)';
            params.push(parseInt(value));
            break;
          case 'within_days':
            condition = 'last_visit >= DATE_SUB(NOW(), INTERVAL ? DAY)';
            params.push(parseInt(value));
            break;
          case 'is_null':
            condition = 'last_visit IS NULL';
            break;
        }
        break;
        
      case 'status':
        switch (operator) {
          case 'equals':
            condition = 'status = ?';
            params.push(value);
            break;
          case 'not_equals':
            condition = 'status != ?';
            params.push(value);
            break;
        }
        break;
        
      case 'registration_date':
        switch (operator) {
          case 'after':
            condition = 'registration_date > ?';
            params.push(value);
            break;
          case 'before':
            condition = 'registration_date < ?';
            params.push(value);
            break;
          case 'between':
            condition = 'registration_date BETWEEN ? AND ?';
            params.push(value.start, value.end);
            break;
        }
        break;
    }

    return condition;
  }

  whereClause = processRule(rules);
  
  return {
    query: whereClause,
    params: params
  };
}

// GET /api/segments - Get all segments
router.get('/', authenticate, async (req, res) => {
  try {
    const [segments] = await pool.execute(
      `SELECT s.*, u.name as created_by_name 
       FROM segments s 
       JOIN users u ON s.created_by = u.id 
       ORDER BY s.created_at DESC`
    );

    res.json({ segments });
  } catch (error) {
    console.error('Error fetching segments:', error);
    res.status(500).json({ error: 'Failed to fetch segments' });
  }
});

// GET /api/segments/:id - Get segment by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const [segments] = await pool.execute(
      `SELECT s.*, u.name as created_by_name 
       FROM segments s 
       JOIN users u ON s.created_by = u.id 
       WHERE s.id = ?`,
      [id]
    );

    if (segments.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    res.json({ segment: segments[0] });
  } catch (error) {
    console.error('Error fetching segment:', error);
    res.status(500).json({ error: 'Failed to fetch segment' });
  }
});

// POST /api/segments - Create a new segment
router.post('/', authenticate, async (req, res) => {
  try {
    const { error, value } = segmentSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    // Build query to get audience size
    const { query: whereClause, params } = buildSegmentQuery(value.rules);
    
    if (!whereClause) {
      return res.status(400).json({ error: 'Invalid segment rules' });
    }

    const countQuery = `SELECT COUNT(*) as count FROM customers WHERE ${whereClause}`;
    const [countResult] = await pool.execute(countQuery, params);
    const audienceSize = countResult[0].count;

    // Create segment
    const [result] = await pool.execute(
      'INSERT INTO segments (name, description, rules, audience_size, created_by) VALUES (?, ?, ?, ?, ?)',
      [
        value.name,
        value.description,
        JSON.stringify(value.rules),
        audienceSize,
        req.user.id
      ]
    );

    const [newSegment] = await pool.execute(
      `SELECT s.*, u.name as created_by_name 
       FROM segments s 
       JOIN users u ON s.created_by = u.id 
       WHERE s.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ 
      message: 'Segment created successfully',
      segment: newSegment[0]
    });
  } catch (error) {
    console.error('Error creating segment:', error);
    res.status(500).json({ error: 'Failed to create segment' });
  }
});

// POST /api/segments/preview - Preview segment audience
router.post('/preview', authenticate, async (req, res) => {
  try {
    const { rules } = req.body;
    
    if (!rules) {
      return res.status(400).json({ error: 'Rules are required' });
    }

    // Build query to get audience
    const { query: whereClause, params } = buildSegmentQuery(rules);
    
    if (!whereClause) {
      return res.status(400).json({ error: 'Invalid segment rules' });
    }

    // Get count
    const countQuery = `SELECT COUNT(*) as count FROM customers WHERE ${whereClause}`;
    const [countResult] = await pool.execute(countQuery, params);
    const audienceSize = countResult[0].count;

    // Get sample customers (first 10)
    const sampleQuery = `SELECT id, name, email, total_spent, total_orders, status, last_visit FROM customers WHERE ${whereClause} LIMIT 10`;
    const [sampleCustomers] = await pool.execute(sampleQuery, params);

    res.json({
      audienceSize,
      sampleCustomers
    });
  } catch (error) {
    console.error('Error previewing segment:', error);
    res.status(500).json({ error: 'Failed to preview segment' });
  }
});

// GET /api/segments/:id/customers - Get customers in segment
router.get('/:id/customers', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Get segment rules
    const [segments] = await pool.execute(
      'SELECT rules FROM segments WHERE id = ?',
      [id]
    );

    if (segments.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const rules = JSON.parse(segments[0].rules);
    const { query: whereClause, params } = buildSegmentQuery(rules);

    // Get customers
    const customersQuery = `SELECT * FROM customers WHERE ${whereClause} LIMIT ? OFFSET ?`;
    const [customers] = await pool.execute(customersQuery, [...params, limit, offset]);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM customers WHERE ${whereClause}`;
    const [countResult] = await pool.execute(countQuery, params);
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
    console.error('Error fetching segment customers:', error);
    res.status(500).json({ error: 'Failed to fetch segment customers' });
  }
});

// PUT /api/segments/:id - Update segment
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = segmentSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    // Build query to get new audience size
    const { query: whereClause, params } = buildSegmentQuery(value.rules);
    
    if (!whereClause) {
      return res.status(400).json({ error: 'Invalid segment rules' });
    }

    const countQuery = `SELECT COUNT(*) as count FROM customers WHERE ${whereClause}`;
    const [countResult] = await pool.execute(countQuery, params);
    const audienceSize = countResult[0].count;

    const [result] = await pool.execute(
      'UPDATE segments SET name = ?, description = ?, rules = ?, audience_size = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [
        value.name,
        value.description,
        JSON.stringify(value.rules),
        audienceSize,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const [updatedSegment] = await pool.execute(
      `SELECT s.*, u.name as created_by_name 
       FROM segments s 
       JOIN users u ON s.created_by = u.id 
       WHERE s.id = ?`,
      [id]
    );

    res.json({ 
      message: 'Segment updated successfully',
      segment: updatedSegment[0]
    });
  } catch (error) {
    console.error('Error updating segment:', error);
    res.status(500).json({ error: 'Failed to update segment' });
  }
});

// DELETE /api/segments/:id - Delete segment
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM segments WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    res.json({ message: 'Segment deleted successfully' });
  } catch (error) {
    console.error('Error deleting segment:', error);
    res.status(500).json({ error: 'Failed to delete segment' });
  }
});

module.exports = router;
