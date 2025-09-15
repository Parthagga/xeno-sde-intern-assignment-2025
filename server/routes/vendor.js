const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// Simulated vendor API for sending messages
router.post('/send', async (req, res) => {
  try {
    const { message_id, customer_id, message_content, callback_url } = req.body;

    if (!message_id || !customer_id || !message_content) {
      return res.status(400).json({ 
        error: 'Missing required fields: message_id, customer_id, message_content' 
      });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Simulate 90% success rate
    const success = Math.random() > 0.1;
    
    if (success) {
      // Simulate successful delivery
      const deliveryData = {
        message_id,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        vendor_message_id: `vendor_${Date.now()}_${customer_id}`
      };

      // Send delivery receipt to callback URL
      if (callback_url) {
        try {
          const axios = require('axios');
          await axios.post(callback_url, deliveryData, {
            timeout: 5000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'VendorAPI/1.0'
            }
          });
        } catch (callbackError) {
          console.error('Failed to send delivery receipt:', callbackError.message);
        }
      }

      res.json({
        success: true,
        message_id,
        status: 'sent',
        vendor_message_id: deliveryData.vendor_message_id,
        estimated_delivery: new Date(Date.now() + 30000).toISOString() // 30 seconds
      });
    } else {
      // Simulate failure
      const failureReasons = [
        'Invalid phone number',
        'Customer opted out',
        'Network timeout',
        'Rate limit exceeded',
        'Invalid message format'
      ];
      
      const failureReason = failureReasons[Math.floor(Math.random() * failureReasons.length)];
      
      const failureData = {
        message_id,
        status: 'failed',
        failed_at: new Date().toISOString(),
        failure_reason: failureReason
      };

      // Send failure receipt to callback URL
      if (callback_url) {
        try {
          const axios = require('axios');
          await axios.post(callback_url, failureData, {
            timeout: 5000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'VendorAPI/1.0'
            }
          });
        } catch (callbackError) {
          console.error('Failed to send failure receipt:', callbackError.message);
        }
      }

      res.status(400).json({
        success: false,
        message_id,
        status: 'failed',
        failure_reason: failureReason
      });
    }
  } catch (error) {
    console.error('Vendor API error:', error);
    res.status(500).json({ 
      error: 'Internal vendor API error',
      message_id: req.body.message_id
    });
  }
});

// Delivery receipt endpoint (called by vendor API)
router.post('/delivery-receipt', async (req, res) => {
  try {
    const { message_id, status, delivered_at, failed_at, failure_reason, vendor_message_id } = req.body;

    if (!message_id || !status) {
      return res.status(400).json({ 
        error: 'Missing required fields: message_id, status' 
      });
    }

    // Find the communication log entry
    const [logs] = await pool.execute(
      'SELECT * FROM communication_log WHERE id = ?',
      [message_id]
    );

    if (logs.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const log = logs[0];

    // Update the communication log based on status
    if (status === 'delivered') {
      await pool.execute(
        `UPDATE communication_log SET 
         status = 'delivered', 
         delivered_at = ?, 
         vendor_message_id = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [delivered_at || new Date(), vendor_message_id, message_id]
      );
    } else if (status === 'failed') {
      await pool.execute(
        `UPDATE communication_log SET 
         status = 'failed', 
         failure_reason = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [failure_reason || 'Unknown error', message_id]
      );
    }

    // Update campaign status if all messages are processed
    const [campaignStats] = await pool.execute(
      `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN status IN ('sent', 'delivered', 'failed') THEN 1 ELSE 0 END) as processed
       FROM communication_log 
       WHERE campaign_id = ?`,
      [log.campaign_id]
    );

    const stats = campaignStats[0];
    if (stats.processed === stats.total && stats.total > 0) {
      // All messages processed, update campaign status
      await pool.execute(
        'UPDATE campaigns SET status = "sent", sent_at = CURRENT_TIMESTAMP WHERE id = ?',
        [log.campaign_id]
      );
    }

    res.json({ 
      success: true, 
      message: 'Delivery receipt processed successfully' 
    });
  } catch (error) {
    console.error('Delivery receipt error:', error);
    res.status(500).json({ error: 'Failed to process delivery receipt' });
  }
});

// Get vendor API status
router.get('/status', (req, res) => {
  res.json({
    status: 'operational',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
