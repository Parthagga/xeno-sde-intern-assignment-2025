const express = require('express');
const passport = require('passport');
const Joi = require('joi');
const pool = require('../config/database');
const { buildSegmentQuery } = require('../utils/segmentUtils');

const router = express.Router();

// Middleware to authenticate requests
const authenticate = passport.authenticate('jwt', { session: false });

// Validation schemas
const campaignSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(1000).optional(),
  segment_id: Joi.number().integer().required(),
  message_template: Joi.string().min(10).required(),
  scheduled_at: Joi.date().optional()
});

// Helper function to send campaign messages
async function sendCampaignMessages(campaignId, segmentId, messageTemplate) {
  try {
    // Get segment rules
    const [segments] = await pool.execute(
      'SELECT rules FROM segments WHERE id = ?',
      [segmentId]
    );

    if (segments.length === 0) {
      throw new Error('Segment not found');
    }

    const rules = JSON.parse(segments[0].rules);
    const { query: whereClause, params } = buildSegmentQuery(rules);

    // Get customers in segment
    const customersQuery = `SELECT * FROM customers WHERE ${whereClause}`;
    const [customers] = await pool.execute(customersQuery, params);

    // Create communication log entries
    const communicationLogs = [];
    
    for (const customer of customers) {
      // Personalize message
      const personalizedMessage = messageTemplate
        .replace(/\{name\}/g, customer.name)
        .replace(/\{email\}/g, customer.email)
        .replace(/\{total_spent\}/g, customer.total_spent);

      // Insert communication log entry
      const [logResult] = await pool.execute(
        `INSERT INTO communication_log (campaign_id, customer_id, message_content, status) 
         VALUES (?, ?, ?, 'pending')`,
        [campaignId, customer.id, personalizedMessage]
      );

      communicationLogs.push({
        id: logResult.insertId,
        customer_id: customer.id,
        message_content: personalizedMessage
      });
    }

    // Send messages via vendor API (simulated)
    for (const log of communicationLogs) {
      try {
        // Simulate vendor API call
        const success = Math.random() > 0.1; // 90% success rate
        
        if (success) {
          await pool.execute(
            `UPDATE communication_log SET 
             status = 'sent', 
             sent_at = CURRENT_TIMESTAMP,
             vendor_message_id = ?
             WHERE id = ?`,
            [`msg_${Date.now()}_${log.customer_id}`, log.id]
          );
        } else {
          await pool.execute(
            `UPDATE communication_log SET 
             status = 'failed', 
             failure_reason = 'Vendor API error'
             WHERE id = ?`,
            [log.id]
          );
        }
      } catch (error) {
        await pool.execute(
          `UPDATE communication_log SET 
           status = 'failed', 
           failure_reason = ?
           WHERE id = ?`,
          [error.message, log.id]
        );
      }
    }

    // Update campaign status
    await pool.execute(
      'UPDATE campaigns SET status = "sent", sent_at = CURRENT_TIMESTAMP WHERE id = ?',
      [campaignId]
    );

    return {
      totalSent: communicationLogs.length,
      success: true
    };
  } catch (error) {
    // Update campaign status to failed
    await pool.execute(
      'UPDATE campaigns SET status = "failed" WHERE id = ?',
      [campaignId]
    );
    
    throw error;
  }
}

// GET /api/campaigns - Get all campaigns
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [campaigns] = await pool.execute(
      `SELECT c.*, s.name as segment_name, s.audience_size, u.name as created_by_name,
       (SELECT COUNT(*) FROM communication_log WHERE campaign_id = c.id) as total_messages,
       (SELECT COUNT(*) FROM communication_log WHERE campaign_id = c.id AND status = 'sent') as sent_messages,
       (SELECT COUNT(*) FROM communication_log WHERE campaign_id = c.id AND status = 'failed') as failed_messages
       FROM campaigns c 
       JOIN segments s ON c.segment_id = s.id 
       JOIN users u ON c.created_by = u.id 
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Get total count
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM campaigns'
    );
    const total = countResult[0].total;

    res.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// GET /api/campaigns/:id - Get campaign by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const [campaigns] = await pool.execute(
      `SELECT c.*, s.name as segment_name, s.audience_size, u.name as created_by_name,
       (SELECT COUNT(*) FROM communication_log WHERE campaign_id = c.id) as total_messages,
       (SELECT COUNT(*) FROM communication_log WHERE campaign_id = c.id AND status = 'sent') as sent_messages,
       (SELECT COUNT(*) FROM communication_log WHERE campaign_id = c.id AND status = 'failed') as failed_messages
       FROM campaigns c 
       JOIN segments s ON c.segment_id = s.id 
       JOIN users u ON c.created_by = u.id 
       WHERE c.id = ?`,
      [id]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ campaign: campaigns[0] });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// POST /api/campaigns - Create and send a new campaign
router.post('/', authenticate, async (req, res) => {
  try {
    const { error, value } = campaignSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    // Verify segment exists
    const [segments] = await pool.execute(
      'SELECT id, audience_size FROM segments WHERE id = ?',
      [value.segment_id]
    );

    if (segments.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const segment = segments[0];

    // Create campaign
    const [result] = await pool.execute(
      `INSERT INTO campaigns (name, description, segment_id, message_template, status, scheduled_at, created_by) 
       VALUES (?, ?, ?, ?, 'sending', ?, ?)`,
      [
        value.name,
        value.description,
        value.segment_id,
        value.message_template,
        value.scheduled_at,
        req.user.id
      ]
    );

    const campaignId = result.insertId;

    // Send campaign messages asynchronously
    sendCampaignMessages(campaignId, value.segment_id, value.message_template)
      .then((result) => {
        console.log(`Campaign ${campaignId} sent successfully:`, result);
      })
      .catch((error) => {
        console.error(`Campaign ${campaignId} failed:`, error);
      });

    const [newCampaign] = await pool.execute(
      `SELECT c.*, s.name as segment_name, s.audience_size, u.name as created_by_name
       FROM campaigns c 
       JOIN segments s ON c.segment_id = s.id 
       JOIN users u ON c.created_by = u.id 
       WHERE c.id = ?`,
      [campaignId]
    );

    res.status(201).json({ 
      message: 'Campaign created and sending initiated',
      campaign: newCampaign[0]
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// GET /api/campaigns/:id/messages - Get campaign messages
router.get('/:id/messages', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [messages] = await pool.execute(
      `SELECT cl.*, c.name as customer_name, c.email as customer_email 
       FROM communication_log cl 
       JOIN customers c ON cl.customer_id = c.id 
       WHERE cl.campaign_id = ? 
       ORDER BY cl.created_at DESC
       LIMIT ? OFFSET ?`,
      [id, limit, offset]
    );

    // Get total count
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM communication_log WHERE campaign_id = ?',
      [id]
    );
    const total = countResult[0].total;

    res.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching campaign messages:', error);
    res.status(500).json({ error: 'Failed to fetch campaign messages' });
  }
});

// GET /api/campaigns/:id/stats - Get campaign statistics
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const [stats] = await pool.execute(
      `SELECT 
       COUNT(*) as total_messages,
       SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_messages,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_messages,
       SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_messages,
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_messages
       FROM communication_log 
       WHERE campaign_id = ?`,
      [id]
    );

    const [campaign] = await pool.execute(
      'SELECT name, sent_at FROM campaigns WHERE id = ?',
      [id]
    );

    res.json({
      campaign: campaign[0],
      stats: stats[0]
    });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({ error: 'Failed to fetch campaign statistics' });
  }
});

// PUT /api/campaigns/:id - Update campaign
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = campaignSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    const [result] = await pool.execute(
      `UPDATE campaigns SET 
       name = ?, description = ?, segment_id = ?, message_template = ?, 
       scheduled_at = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'draft'`,
      [
        value.name,
        value.description,
        value.segment_id,
        value.message_template,
        value.scheduled_at,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Campaign not found or cannot be updated' });
    }

    const [updatedCampaign] = await pool.execute(
      `SELECT c.*, s.name as segment_name, s.audience_size, u.name as created_by_name
       FROM campaigns c 
       JOIN segments s ON c.segment_id = s.id 
       JOIN users u ON c.created_by = u.id 
       WHERE c.id = ?`,
      [id]
    );

    res.json({ 
      message: 'Campaign updated successfully',
      campaign: updatedCampaign[0]
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// DELETE /api/campaigns/:id - Delete campaign
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM campaigns WHERE id = ? AND status = "draft"',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Campaign not found or cannot be deleted' });
    }

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

module.exports = router;
