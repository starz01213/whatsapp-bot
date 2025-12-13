# WhatsApp Bot - Complete Guide

A powerful WhatsApp bot system that enables:
- ✅ Send messages to 100+ customers privately
- ✅ Auto-reply with commodity/product information
- ✅ Handle images from users
- ✅ Monthly subscription with auto-renewal
- ✅ Bulk messaging to all users
- ✅ Broadcast updates with auto-renewal tracking
- ✅ Admin dashboard for management
- ✨ **NEW**: Customer analytics & engagement tracking
- ✨ **NEW**: Advanced business reporting
- ✨ **NEW**: Multi-language support (12 languages)

## Features

### 1. **Bulk Messaging** 📧
- Send custom messages to ALL active users at once
- Support for text and images
- Schedule messages for later
- Track delivery status and failures
- Rate limiting to avoid API throttling

### 2. **Auto-Reply System** 🤖
- Intelligent product search using fuzzy matching
- Understanding customer queries
- Automatic commodity price lookup
- Help menu support
- Conversation history tracking

### 3. **Product Management** 📦
- Add/edit/delete commodities
- Store prices, descriptions, and categories
- Upload and manage product images
- Full-text search capability

### 4. **Monthly Subscriptions** 📅
- Automatic 30-day subscription for new users
- Monthly renewal reminders (7 days before expiry)
- Auto-expiry with notifications
- Manual renewal via WhatsApp ("RENEW" command)
- Multiple subscription tiers
- Detailed usage statistics

### 5. **Image Handling** 📸
- Accept images from customers
- Process and store images locally
- Query based on image captions
- Image delivery tracking

### 6. **Update Broadcasting** 📢
- Send app/product updates to all users
- Track delivery and read status

### 7. **Customer Analytics** 📊 *NEW!*
- Real-time engagement scoring (0-100)
- Customer lifetime value tracking
- Retention rate analysis
- Conversation quality metrics
- User cohort analysis
- See: [FOUR_NEW_FEATURES.md](./FOUR_NEW_FEATURES.md#feature-1-customer-analytics)

### 9. **Advanced Reporting** 📈 *NEW!*
- Revenue analysis & trends
- User growth reports
- Subscription performance metrics
- Engagement deep-dives
- Executive summaries
- Auto-saved reports with timestamps
- See: [FOUR_NEW_FEATURES.md](./FOUR_NEW_FEATURES.md#feature-3-advanced-reporting)

### 10. **Multi-Language Support** 🌍 *NEW!*
- Support for 12 languages (English, Spanish, French, German, Portuguese, Italian, Japanese, Chinese, Arabic, Yoruba, Igbo, Hausa)
- User language preference storage
- Automatic locale-aware formatting
- Time-appropriate greetings
- Regional dialect support
- See: [FOUR_NEW_FEATURES.md](./FOUR_NEW_FEATURES.md#feature-4-multi-language-support)
- Version management
- Update history

### 7. **User Management** 👥
- Track active users
- Store conversation history
- Monitor subscription status
- Audit logs

## Installation

### Prerequisites
- Node.js (v14+)
- SQLite3
- Twilio Account with WhatsApp Business API enabled

### Setup Steps

1. **Clone or create the project:**
```bash
cd whatsapp_bot
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure Twilio:**
   - Create a Twilio account at https://www.twilio.com
   - Enable WhatsApp integration
   - Get your Account SID, Auth Token, and WhatsApp Phone Number

4. **Update .env file:**
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=whatsapp:+14155552671
ADMIN_PASSWORD=your_secure_password
NODE_ENV=development
PORT=3000
```

5. **Initialize database with sample data:**
```bash
npm run setup
```

6. **Start the server:**
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Documentation

### Authentication
All admin endpoints require a Bearer token:
```
Authorization: Bearer YOUR_ADMIN_PASSWORD
```

### Commodity Management

**Add a commodity:**
```bash
POST /api/commodities
Content-Type: application/json
Authorization: Bearer YOUR_PASSWORD

{
  "name": "Rice",
  "price": 15.99,
  "description": "Premium long-grain rice",
  "category": "Grains"
}
```

**Get all commodities:**
```bash
GET /api/commodities
Authorization: Bearer YOUR_PASSWORD
```

**Search commodities:**
```bash
GET /api/commodities/search/rice
Authorization: Bearer YOUR_PASSWORD
```

**Update commodity:**
```bash
PUT /api/commodities/1
Authorization: Bearer YOUR_PASSWORD

{
  "price": 16.99,
  "description": "Updated description"
}
```

**Delete commodity:**
```bash
DELETE /api/commodities/1
Authorization: Bearer YOUR_PASSWORD
```

### Bulk Messaging

**Send bulk message:**
```bash
POST /api/bulk-message
Authorization: Bearer YOUR_PASSWORD

{
  "message": "Hello everyone! Check our new products.",
  "imageUrl": "https://example.com/image.jpg",
  "scheduledFor": null
}
```

**Get bulk message status:**
```bash
GET /api/bulk-message/1
Authorization: Bearer YOUR_PASSWORD
```

**Get all bulk messages:**
```bash
GET /api/bulk-messages
Authorization: Bearer YOUR_PASSWORD
```

### Update Broadcasting

**Broadcast an update:**
```bash
POST /api/broadcast-update
Authorization: Bearer YOUR_PASSWORD

{
  "title": "New Product Available",
  "description": "We now offer premium wheat flour!",
  "imageUrl": "https://example.com/wheat.jpg",
  "version": "1.1.0"
}
```

**Get all updates:**
```bash
GET /api/updates
Authorization: Bearer YOUR_PASSWORD
```

**Get update delivery stats:**
```bash
GET /api/updates/1/stats
Authorization: Bearer YOUR_PASSWORD
```

### Subscription Management

**Get subscription details:**
```bash
GET /api/subscription/+1234567890
Authorization: Bearer YOUR_PASSWORD
```

**Renew subscription:**
```bash
POST /api/subscription/+1234567890/renew
Authorization: Bearer YOUR_PASSWORD

{
  "daysToAdd": 30
}
```

**Get all active subscriptions:**
```bash
GET /api/subscriptions
Authorization: Bearer YOUR_PASSWORD
```

**Get subscription statistics:**
```bash
GET /api/subscriptions/stats
Authorization: Bearer YOUR_PASSWORD
```

**Check for expired subscriptions:**
```bash
POST /api/subscriptions/check-expiry
Authorization: Bearer YOUR_PASSWORD
```

**Send renewal reminders:**
```bash
POST /api/subscriptions/send-reminders
Authorization: Bearer YOUR_PASSWORD
```

## User Commands (WhatsApp)

Users can interact with the bot using:

| Command | Description | Example |
|---------|-------------|---------|
| `list` | Show all products | list |
| `price of [product]` | Get product price | price of rice |
| `about [product]` | Get product details | about wheat |
| `RENEW` | Renew subscription | RENEW |
| `help` | Get help menu | help |
| Send image | Get help | [Send any image] |

## Database Schema

### Users Table
Stores customer information and subscription status

### Commodities Table
Stores product information, prices, and descriptions

### Messages Table
Conversation history between users and bot

### Bulk Messages Table
Tracks bulk messaging campaigns

### Subscriptions Table
Manages monthly subscriptions and renewals

### Updates Table
Stores product/app updates for broadcasting

See `src/database/db.js` for complete schema

## Deployment

### Using Ngrok (for development)
```bash
ngrok http 3000
```
Use the ngrok URL to configure Twilio webhook.

### Using a VPS
1. Deploy to a server (AWS, DigitalOcean, Heroku, etc.)
2. Configure Twilio webhook to your server URL
3. Use a reverse proxy like Nginx
4. Set up SSL/TLS certificates

### Example Nginx Configuration
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Twilio Configuration

1. Go to https://console.twilio.com
2. Navigate to Messaging > Settings > WhatsApp Sandbox
3. Set webhook URL: `https://your-domain.com/webhook/incoming-message`
4. Method: POST
5. Save

## Troubleshooting

### No messages received
- Check Twilio credentials in .env
- Verify webhook URL is accessible
- Check firewall/proxy settings

### Subscriptions not expiring
- Run: `POST /api/subscriptions/check-expiry`
- Check database connection

### Images not saving
- Ensure `uploads/` directory exists and is writable
- Check `MAX_FILE_SIZE` in .env
- Verify Twilio image URL accessibility

### High API costs
- Adjust rate limiting in `whatsappService.js`
- Monitor `bulk_messages` table for large campaigns
- Use scheduled messages to optimize timing

## Environment Variables

```
TWILIO_ACCOUNT_SID      - Twilio Account ID
TWILIO_AUTH_TOKEN       - Twilio Auth Token
TWILIO_PHONE_NUMBER     - WhatsApp Bot Phone Number
PORT                    - Server port (default: 3000)
NODE_ENV                - Environment (development/production)
DB_PATH                 - Database file path
ADMIN_PASSWORD          - API authentication token
ADMIN_PHONE             - Admin WhatsApp number
MAX_FILE_SIZE           - Max upload file size (bytes)
UPLOAD_DIR              - Image upload directory
```

## Performance Tips

1. **Rate Limiting**: Bulk messages have 100ms delay between sends
2. **Database Indexing**: Keys are automatically indexed
3. **Caching**: Consider caching commodity list in production
4. **Monitoring**: Set up logs and monitoring for production
5. **Backup**: Regular database backups recommended

## Security

- Store passwords securely in environment variables
- Use HTTPS in production
- Validate all user inputs
- Implement rate limiting for public endpoints
- Regular security audits
- Keep dependencies updated

## Support & Contribution

For issues or contributions, please submit via GitHub.

## License

ISC
