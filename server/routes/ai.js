const express = require('express');
const passport = require('passport');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../config/database');

const router = express.Router();

// Middleware to authenticate requests
const authenticate = passport.authenticate('jwt', { session: false });

// Initialize Google Generative AI (Gemini)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// POST /api/ai/natural-language-to-rules - Convert natural language to segment rules
router.post('/natural-language-to-rules', authenticate, async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const systemPrompt = `You are an expert at converting natural language descriptions into structured segment rules for a CRM system.

Available fields and operators:
- total_spent: greater_than, less_than, equals, between
- total_orders: greater_than, less_than, equals
- last_visit: days_ago, within_days, is_null
- status: equals, not_equals (values: active, inactive, churned)
- registration_date: after, before, between

You can combine conditions using AND/OR operators.

Return ONLY a valid JSON object with this structure:
{
  "operator": "AND" | "OR",
  "conditions": [
    {
      "field": "field_name",
      "operator": "operator_name", 
      "value": "value_or_object"
    }
  ]
}

For single conditions, return:
{
  "field": "field_name",
  "operator": "operator_name",
  "value": "value_or_object"
}

Examples:
- "People who spent more than 10000" → {"field": "total_spent", "operator": "greater_than", "value": 10000}
- "Active customers who haven't visited in 30 days" → {"operator": "AND", "conditions": [{"field": "status", "operator": "equals", "value": "active"}, {"field": "last_visit", "operator": "days_ago", "value": 30}]}
- "High spenders or frequent buyers" → {"operator": "OR", "conditions": [{"field": "total_spent", "operator": "greater_than", "value": 15000}, {"field": "total_orders", "operator": "greater_than", "value": 10}]}`;

    const fullPrompt = `${systemPrompt}\n\nUser Request: ${prompt}`;
    
    const result = await model.generateContent(fullPrompt);
    const response = result.response.text().trim();
    
    try {
      const rules = JSON.parse(response);
      res.json({ 
        success: true, 
        rules,
        originalPrompt: prompt
      });
    } catch (parseError) {
      res.status(400).json({ 
        error: 'Failed to parse AI response as valid JSON',
        aiResponse: response
      });
    }
  } catch (error) {
    console.error('AI natural language processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process natural language prompt',
      details: error.message
    });
  }
});

// POST /api/ai/message-suggestions - Generate message suggestions
router.post('/message-suggestions', authenticate, async (req, res) => {
  try {
    const { campaignObjective, segmentDescription, tone = 'friendly' } = req.body;

    if (!campaignObjective) {
      return res.status(400).json({ error: 'Campaign objective is required' });
    }

    const systemPrompt = `You are a marketing copywriter specializing in personalized customer messages for CRM campaigns.

Generate 3 different message templates for the given campaign objective and segment description.

Each message should:
- Be personalized using {name} placeholder
- Be engaging and relevant to the segment
- Match the specified tone
- Include a clear call-to-action
- Be 1-2 sentences long

Return ONLY a valid JSON array with this structure:
[
  {
    "title": "Brief title for this message",
    "template": "Message template with {name} placeholder",
    "reasoning": "Why this message works for this segment"
  }
]`;

    const userPrompt = `Campaign Objective: ${campaignObjective}
Segment Description: ${segmentDescription || 'General customer segment'}
Tone: ${tone}

Generate 3 message templates.`;

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    
    const result = await model.generateContent(fullPrompt);
    const response = result.response.text().trim();
    
    try {
      const suggestions = JSON.parse(response);
      res.json({ 
        success: true, 
        suggestions,
        campaignObjective,
        segmentDescription,
        tone
      });
    } catch (parseError) {
      res.status(400).json({ 
        error: 'Failed to parse AI response as valid JSON',
        aiResponse: response
      });
    }
  } catch (error) {
    console.error('AI message suggestions error:', error);
    res.status(500).json({ 
      error: 'Failed to generate message suggestions',
      details: error.message
    });
  }
});

// POST /api/ai/performance-summary - Generate campaign performance summary
router.post('/performance-summary', authenticate, async (req, res) => {
  try {
    const { campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    // Get campaign details and stats
    const [campaigns] = await pool.execute(
      `SELECT c.*, s.name as segment_name, s.audience_size
       FROM campaigns c 
       JOIN segments s ON c.segment_id = s.id 
       WHERE c.id = ?`,
      [campaignId]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const [stats] = await pool.execute(
      `SELECT 
       COUNT(*) as total_messages,
       SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_messages,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_messages,
       SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_messages
       FROM communication_log 
       WHERE campaign_id = ?`,
      [campaignId]
    );

    const campaign = campaigns[0];
    const campaignStats = stats[0];

    const systemPrompt = `You are a marketing analyst who creates insightful performance summaries for CRM campaigns.

Analyze the campaign data and create a comprehensive summary that includes:
1. Overall performance assessment
2. Key metrics and insights
3. Success factors or areas for improvement
4. Recommendations for future campaigns

Be specific, data-driven, and actionable in your analysis.`;

    const userPrompt = `Campaign: ${campaign.name}
Description: ${campaign.description || 'No description'}
Segment: ${campaign.segment_name}
Target Audience Size: ${campaign.audience_size}
Message Template: ${campaign.message_template}

Performance Stats:
- Total Messages: ${campaignStats.total_messages}
- Sent: ${campaignStats.sent_messages}
- Delivered: ${campaignStats.delivered_messages}
- Failed: ${campaignStats.failed_messages}
- Success Rate: ${campaignStats.total_messages > 0 ? ((campaignStats.sent_messages / campaignStats.total_messages) * 100).toFixed(1) : 0}%
- Delivery Rate: ${campaignStats.sent_messages > 0 ? ((campaignStats.delivered_messages / campaignStats.sent_messages) * 100).toFixed(1) : 0}%

Generate a performance summary.`;

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    
    const result = await model.generateContent(fullPrompt);
    const summary = result.response.text().trim();

    // Store the AI insight
    await pool.execute(
      `INSERT INTO ai_insights (type, campaign_id, content) 
       VALUES ('performance_summary', ?, ?)`,
      [campaignId, JSON.stringify({ summary, generated_at: new Date().toISOString() })]
    );

    res.json({ 
      success: true, 
      summary,
      campaignId,
      stats: campaignStats
    });
  } catch (error) {
    console.error('AI performance summary error:', error);
    res.status(500).json({ 
      error: 'Failed to generate performance summary',
      details: error.message
    });
  }
});

// POST /api/ai/scheduling-suggestions - Get optimal scheduling suggestions
router.post('/scheduling-suggestions', authenticate, async (req, res) => {
  try {
    const { segmentId } = req.body;

    if (!segmentId) {
      return res.status(400).json({ error: 'Segment ID is required' });
    }

    // Get segment details and customer data
    const [segments] = await pool.execute(
      'SELECT * FROM segments WHERE id = ?',
      [segmentId]
    );

    if (segments.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const segment = segments[0];
    const rules = JSON.parse(segment.rules);

    // Get customer activity patterns
    const [activityStats] = await pool.execute(
      `SELECT 
       HOUR(last_visit) as hour,
       DAYOFWEEK(last_visit) as day_of_week,
       COUNT(*) as activity_count
       FROM customers 
       WHERE last_visit IS NOT NULL 
       AND last_visit >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY HOUR(last_visit), DAYOFWEEK(last_visit)
       ORDER BY activity_count DESC
       LIMIT 10`
    );

    const systemPrompt = `You are a marketing automation expert who provides optimal scheduling recommendations for CRM campaigns.

Based on customer activity patterns and segment characteristics, suggest the best times to send campaigns.

Consider factors like:
- Peak activity hours
- Day of week patterns
- Segment characteristics (high-value, inactive, etc.)
- Industry best practices

Return ONLY a valid JSON object with this structure:
{
  "recommendations": [
    {
      "time": "HH:MM format",
      "day": "day name or 'any'",
      "reasoning": "Why this time is optimal",
      "confidence": "high/medium/low"
    }
  ],
  "general_insights": "Overall insights about timing for this segment"
}`;

    const userPrompt = `Segment: ${segment.name}
Description: ${segment.description || 'No description'}
Audience Size: ${segment.audience_size}
Rules: ${JSON.stringify(rules)}

Recent Activity Patterns (last 30 days):
${activityStats.map(stat => 
  `Hour ${stat.hour}, Day ${stat.day_of_week}: ${stat.activity_count} activities`
).join('\n')}

Provide scheduling recommendations.`;

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    
    const result = await model.generateContent(fullPrompt);
    const response = result.response.text().trim();
    
    try {
      const suggestions = JSON.parse(response);
      
      // Store the AI insight
      await pool.execute(
        `INSERT INTO ai_insights (type, segment_id, content) 
         VALUES ('scheduling_suggestion', ?, ?)`,
        [segmentId, JSON.stringify({ suggestions, generated_at: new Date().toISOString() })]
      );

      res.json({ 
        success: true, 
        suggestions,
        segmentId
      });
    } catch (parseError) {
      res.status(400).json({ 
        error: 'Failed to parse AI response as valid JSON',
        aiResponse: response
      });
    }
  } catch (error) {
    console.error('AI scheduling suggestions error:', error);
    res.status(500).json({ 
      error: 'Failed to generate scheduling suggestions',
      details: error.message
    });
  }
});

// GET /api/ai/insights - Get stored AI insights
router.get('/insights', authenticate, async (req, res) => {
  try {
    const { type, campaignId, segmentId } = req.query;

    let query = 'SELECT * FROM ai_insights WHERE 1=1';
    let params = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (campaignId) {
      query += ' AND campaign_id = ?';
      params.push(campaignId);
    }

    if (segmentId) {
      query += ' AND segment_id = ?';
      params.push(segmentId);
    }

    query += ' ORDER BY created_at DESC';

    const [insights] = await pool.execute(query, params);

    res.json({ insights });
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    res.status(500).json({ error: 'Failed to fetch AI insights' });
  }
});

module.exports = router;
