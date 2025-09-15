# 🎯 Mini CRM Platform

A comprehensive Customer Relationship Management platform with AI-powered customer segmentation, personalized campaign delivery, and intelligent insights.

## ✨ Features

### 🔐 Authentication
- **Google OAuth 2.0** integration for secure user authentication
- JWT-based session management
- Protected routes and API endpoints

### 📊 Data Management
- **Customer Management**: Full CRUD operations with bulk import capabilities
- **Order Tracking**: Complete order lifecycle management
- **Real-time Analytics**: Customer insights and performance metrics

### 🎯 Customer Segmentation
- **Dynamic Rule Builder**: Create complex customer segments with AND/OR logic
- **AI-Powered Rules**: Convert natural language descriptions to segment rules
- **Live Preview**: See audience size and sample customers before saving
- **Flexible Conditions**: Support for spending, visit frequency, status, and date-based rules

### 📧 Campaign Management
- **Personalized Messaging**: Dynamic message templates with customer data
- **AI Message Suggestions**: Generate campaign messages based on objectives
- **Delivery Tracking**: Real-time campaign delivery status and analytics
- **Vendor API Integration**: Simulated message delivery with 90% success rate

### 🤖 AI Integration
- **Natural Language Processing**: Convert prompts like "People who haven't shopped in 6 months and spent over ₹5K" into logical rules
- **Message Generation**: AI-powered campaign message suggestions
- **Performance Analysis**: Automated campaign performance summaries
- **Scheduling Optimization**: AI recommendations for optimal send times

### 📈 Analytics & Insights
- **Campaign Performance**: Detailed delivery statistics and success rates
- **Customer Analytics**: Spending patterns and engagement metrics
- **Real-time Updates**: Live campaign status and delivery receipts

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Query** - Data fetching and caching
- **React Hook Form** - Form management
- **Heroicons** - Beautiful SVG icons

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MySQL** - Relational database
- **Passport.js** - Authentication middleware
- **JWT** - Token-based authentication
- **Swagger** - API documentation

### AI & External Services
- **Google Gemini Pro** - Natural language processing
- **Google OAuth 2.0** - User authentication
- **Simulated Vendor API** - Message delivery service

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MySQL 8.0+
- Google Cloud Console account (for OAuth)
- Google Gemini API key (for AI features)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd mini-crm-platform
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install all project dependencies
npm run install-all
```

### 3. Database Setup
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE mini_crm;
exit

# Import schema
mysql -u root -p mini_crm < server/database/schema.sql
```

### 4. Environment Configuration

#### Backend Environment (`server/.env`)
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=mini_crm

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# Session Configuration
SESSION_SECRET=your_session_secret_here

# Google Gemini Configuration
GEMINI_API_KEY=your_gemini_api_key

# Vendor API Configuration
VENDOR_API_URL=http://localhost:5000/api/vendor
VENDOR_API_KEY=your_vendor_api_key

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

#### Frontend Environment (`client/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### 5. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:5000/auth/google/callback`
6. Copy Client ID and Client Secret to environment variables

### 6. Google Gemini Setup
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add the key to your backend environment variables

### 7. Start the Application
```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run server  # Backend only
npm run client  # Frontend only
```

### 8. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs
- **Health Check**: http://localhost:5000/health

## 📚 API Documentation

The API is fully documented with Swagger UI. Access it at `http://localhost:5000/api-docs` when the server is running.

### Key Endpoints

#### Authentication
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - OAuth callback
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

#### Customers
- `GET /api/customers` - List customers (with pagination and filtering)
- `POST /api/customers` - Create customer
- `POST /api/customers/bulk` - Bulk create customers
- `GET /api/customers/:id` - Get customer details
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

#### Orders
- `GET /api/orders` - List orders (with pagination and filtering)
- `POST /api/orders` - Create order
- `POST /api/orders/bulk` - Bulk create orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

#### Segments
- `GET /api/segments` - List segments
- `POST /api/segments` - Create segment
- `POST /api/segments/preview` - Preview segment audience
- `GET /api/segments/:id/customers` - Get customers in segment
- `PUT /api/segments/:id` - Update segment
- `DELETE /api/segments/:id` - Delete segment

#### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create and send campaign
- `GET /api/campaigns/:id` - Get campaign details
- `GET /api/campaigns/:id/messages` - Get campaign messages
- `GET /api/campaigns/:id/stats` - Get campaign statistics
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

#### AI Features
- `POST /api/ai/natural-language-to-rules` - Convert natural language to segment rules
- `POST /api/ai/message-suggestions` - Generate message suggestions
- `POST /api/ai/performance-summary` - Generate performance summary
- `POST /api/ai/scheduling-suggestions` - Get scheduling recommendations
- `GET /api/ai/insights` - Get stored AI insights

#### Vendor API (Simulated)
- `POST /api/vendor/send` - Send message via vendor API
- `POST /api/vendor/delivery-receipt` - Receive delivery receipts
- `GET /api/vendor/status` - Get vendor API status

## 🎯 Usage Examples

### Creating a Customer Segment with AI

1. **Natural Language Input**:
   ```
   People who spent more than ₹10,000 and haven't visited in 30 days
   ```

2. **AI Converts to Rules**:
   ```json
   {
     "operator": "AND",
     "conditions": [
       {"field": "total_spent", "operator": "greater_than", "value": 10000},
       {"field": "last_visit", "operator": "days_ago", "value": 30}
     ]
   }
   ```

3. **Preview Audience**: See how many customers match these criteria
4. **Create Segment**: Save the segment for future campaigns

### Creating a Campaign

1. **Select Segment**: Choose from existing segments
2. **Define Objective**: "Bring back inactive users"
3. **AI Message Suggestions**: Get personalized message templates
4. **Customize Message**: Use placeholders like `{name}`, `{total_spent}`
5. **Send Campaign**: Messages are delivered with real-time tracking

### Campaign Analytics

- **Delivery Status**: Real-time tracking of sent/failed messages
- **Success Rates**: Percentage of successful deliveries
- **Performance Insights**: AI-generated summaries and recommendations
- **Customer Engagement**: Track which segments perform best

## 🔧 Development

### Project Structure
```
mini-crm-platform/
├── client/                 # Next.js frontend
│   ├── app/               # App Router pages
│   ├── components/        # React components
│   └── ...
├── server/                # Node.js backend
│   ├── routes/           # API routes
│   ├── config/           # Configuration files
│   ├── database/         # Database schema
│   └── utils/            # Utility functions
└── package.json          # Root package.json
```

### Available Scripts
```bash
npm run dev          # Start both frontend and backend
npm run server       # Start backend only
npm run client       # Start frontend only
npm run build        # Build frontend for production
npm run start        # Start production server
npm run install-all  # Install all dependencies
```

### Database Schema

The application uses MySQL with the following main tables:
- `users` - User authentication and profile data
- `customers` - Customer information and metrics
- `orders` - Order history and details
- `segments` - Customer segment definitions
- `campaigns` - Campaign information and status
- `communication_log` - Message delivery tracking
- `ai_insights` - Stored AI-generated insights

## 🚀 Deployment

### Production Environment Variables
```env
NODE_ENV=production
DB_HOST=your_production_db_host
DB_USER=your_production_db_user
DB_PASSWORD=your_production_db_password
JWT_SECRET=your_production_jwt_secret
GOOGLE_CLIENT_ID=your_production_google_client_id
GOOGLE_CLIENT_SECRET=your_production_google_client_secret
OPENAI_API_KEY=your_production_openai_api_key
FRONTEND_URL=https://your-domain.com
```

### Build for Production
```bash
# Build frontend
cd client && npm run build

# Start production server
cd server && npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/api-docs`
- Review the code comments for implementation details

## 🎉 Acknowledgments

- Google for providing the Gemini API for natural language processing
- Google for OAuth 2.0 authentication
- The open-source community for the amazing tools and libraries used

---

**Built with ❤️ for modern CRM needs**

# xeno-sde-intern-assignment-2025

