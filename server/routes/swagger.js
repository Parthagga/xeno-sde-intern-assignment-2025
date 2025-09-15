const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const router = express.Router();

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mini CRM Platform API',
      version: '1.0.0',
      description: 'A comprehensive CRM platform with customer segmentation, campaign delivery, and AI insights',
      contact: {
        name: 'API Support',
        email: 'support@minicrm.com'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://your-production-url.com' 
          : 'http://localhost:5000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        googleOAuth: {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: '/api/auth/google',
              tokenUrl: '/api/auth/google/callback',
              scopes: {
                profile: 'Access user profile information',
                email: 'Access user email address'
              }
            }
          }
        }
      },
      schemas: {
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            email: { type: 'string', format: 'email', example: 'customer@example.com' },
            name: { type: 'string', example: 'John Doe' },
            phone: { type: 'string', example: '+91-9876543210' },
            date_of_birth: { type: 'string', format: 'date', example: '1990-05-15' },
            registration_date: { type: 'string', format: 'date-time' },
            last_visit: { type: 'string', format: 'date-time' },
            total_spent: { type: 'number', format: 'decimal', example: 15000.00 },
            total_orders: { type: 'integer', example: 8 },
            status: { type: 'string', enum: ['active', 'inactive', 'churned'], example: 'active' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            customer_id: { type: 'integer', example: 1 },
            order_date: { type: 'string', format: 'date-time' },
            total_amount: { type: 'number', format: 'decimal', example: 2500.00 },
            status: { type: 'string', enum: ['pending', 'completed', 'cancelled', 'refunded'], example: 'completed' },
            items_count: { type: 'integer', example: 3 }
          }
        },
        Segment: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'High Value Customers' },
            description: { type: 'string', example: 'Customers who have spent more than ₹10,000' },
            rules: { type: 'object', example: { field: 'total_spent', operator: 'greater_than', value: 10000 } },
            audience_size: { type: 'integer', example: 150 },
            created_by: { type: 'integer', example: 1 }
          }
        },
        Campaign: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Welcome Back Campaign' },
            description: { type: 'string', example: 'Re-engage inactive customers' },
            segment_id: { type: 'integer', example: 1 },
            message_template: { type: 'string', example: 'Hi {name}, we miss you! Here\'s 10% off your next order.' },
            status: { type: 'string', enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'], example: 'sent' },
            scheduled_at: { type: 'string', format: 'date-time' },
            sent_at: { type: 'string', format: 'date-time' },
            created_by: { type: 'integer', example: 1 }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string', example: 'Error message' },
                details: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    },
    security: [
      { bearerAuth: [] },
      { googleOAuth: [] }
    ]
  },
  apis: ['./routes/*.js'] // Path to the API files
};

const specs = swaggerJsdoc(options);

// Custom CSS for Swagger UI
const customCss = `
  .swagger-ui .topbar { display: none; }
  .swagger-ui .info .title { color: #3b82f6; }
  .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; }
`;

const swaggerOptions = {
  customCss,
  customSiteTitle: 'Mini CRM Platform API Documentation',
  customfavIcon: '/favicon.ico'
};

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(specs, swaggerOptions));

module.exports = router;
