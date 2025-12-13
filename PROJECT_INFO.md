# WhatsApp Bot - Complete System Documentation

## 🎯 Project Overview

Your WhatsApp bot is a complete business automation system that enables:
- ✅ Sending messages to 100+ customers directly
- ✅ Intelligent auto-replies for product queries
- ✅ Monthly subscription management with auto-renewal
- ✅ Image handling and processing
- ✅ Bulk messaging campaigns
- ✅ Update broadcasting to all users
- ✅ Admin dashboard for management

---

## 📁 Project Structure

```
whatsapp_bot/
├── src/
│   ├── server.js                 # Main Express server & API routes
│   ├── database/
│   │   ├── db.js                 # SQLite database connection & initialization
│   │   └── services.js           # User & Commodity database services
│   ├── handlers/
│   │   ├── messageHandler.js     # Process incoming messages & images
│   │   └── bulkMessagingHandler.js # Bulk messaging & update broadcasting
│   ├── services/
│   │   ├── whatsappService.js    # Twilio WhatsApp API integration
│   │   ├── responseGenerator.js  # AI-powered response system
│   │   └── subscriptionService.js # Subscription management
│   └── utils/
├── data/
│   └── bot.db                    # SQLite database (auto-created)
├── uploads/
│   └── [user images]             # Stored customer images
├── scripts/
│   └── setup.js                  # Database initialization with sample data
├── package.json                  # Node.js dependencies
├── .env                          # Configuration (YOU MUST EDIT)
├── .env.example                  # Example configuration
├── README.md                     # Full documentation
├── QUICKSTART.md                 # Quick setup guide
├── dashboard.html                # Admin web interface
├── test-api.js                   # API testing script
└── PROJECT_INFO.md               # This file
```

---

## 🔧 Key Components

### 1. **Twilio WhatsApp Integration** (`src/services/whatsappService.js`)
- Send messages to individual users
- Send bulk messages with rate limiting
- Handle image transmission
- Phone number validation

**Key Methods:**
- `sendMessage(phoneNumber, text)` - Send single message
- `sendMessageWithImage(phoneNumber, text, imageUrl)` - Send with image
- `sendBulkMessages(recipients, text, imageUrl)` - Send to many users

### 2. **Message Handler** (`src/handlers/messageHandler.js`)
- Receives incoming messages from Twilio webhook
- Processes text and image messages
- Handles subscription renewal requests
- Manages image downloads and storage

**Key Methods:**
- `handleIncomingMessage(body)` - Main webhook handler
- `handleImageMessage(phone, caption, imageUrl)` - Process images
- `handleAutoReply(phone, message)` - Generate responses

### 3. **Auto-Reply System** (`src/services/responseGenerator.js`)
- Intelligent commodity search using fuzzy matching
- Price lookups
- Product details retrieval
- Help menu system

**Key Methods:**
- `processMessage(message, userPhone)` - Main message processor
- `handlePriceQuery(message)` - Extract and return prices
- `findCommodityInMessage(message, commodities)` - Smart search

### 4. **Bulk Messaging** (`src/handlers/bulkMessagingHandler.js`)
- Send identical messages to all active users
- Track delivery success/failure
- Support scheduled sending
- Recipients management

**Key Methods:**
- `sendBulkMessage(text, imageUrl, scheduledFor)` - Create and send campaign
- `getBulkMessageStatus(messageId)` - Check campaign status
- `getBulkMessageRecipients(messageId)` - Get delivery details

### 5. **Subscription Management** (`src/services/subscriptionService.js`)
- Monthly subscription tracking
- Automatic expiry notifications
- Renewal reminders (7 days before expiry)
- Subscription statistics

**Key Methods:**
- `renewSubscription(phone, daysToAdd)` - Extend subscription
- `checkAndExpireSubscriptions()` - Auto-expiry check
- `sendRenewalReminders()` - Send reminder messages
- `getSubscriptionStats()` - Get usage statistics

### 6. **Database** (`src/database/db.js`)
- SQLite3 database with 10+ tables
- Automatic table creation
- User, commodity, message, and subscription tracking

**Tables:**
- `users` - Customer information & subscription status
- `commodities` - Products with prices & descriptions
- `messages` - Conversation history
- `bulk_messages` - Campaign tracking
- `subscriptions` - Monthly subscription data
- `updates` - Product/app updates
- `update_delivery` - Update tracking

### 7. **Express Server** (`src/server.js`)
- REST API endpoints for all operations
- Twilio webhook integration
- Periodic tasks (expiry checks, reminders)
- Bearer token authentication

---

## 📡 API Endpoints

### Authentication
All endpoints (except `/health` and `/webhook/incoming-message`) require:
```
Authorization: Bearer YOUR_ADMIN_PASSWORD
```

### Commodity Management
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/commodities` | Add new product |
| GET | `/api/commodities` | Get all products |
| GET | `/api/commodities/search/:term` | Search products |
| PUT | `/api/commodities/:id` | Update product |
| DELETE | `/api/commodities/:id` | Delete product |

### Bulk Messaging
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/bulk-message` | Send message to all users |
| GET | `/api/bulk-message/:id` | Get message status |
| GET | `/api/bulk-messages` | Get all campaigns |

### Updates & Broadcasting
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/broadcast-update` | Send update to all users |
| GET | `/api/updates` | Get all updates |
| GET | `/api/updates/:id/stats` | Get delivery statistics |

### Subscriptions
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/subscription/:phone` | Get user subscription |
| POST | `/api/subscription/:phone/renew` | Renew subscription |
| GET | `/api/subscriptions` | Get all subscriptions |
| GET | `/api/subscriptions/stats` | Get statistics |
| POST | `/api/subscriptions/check-expiry` | Check & expire |
| POST | `/api/subscriptions/send-reminders` | Send reminders |

### Other
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| POST | `/webhook/incoming-message` | Twilio webhook |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v14+ installed
- npm package manager
- Twilio account with WhatsApp enabled
- Internet connection

### Installation Steps

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   - Copy `.env.example` to `.env`
   - Edit `.env` with your Twilio credentials:
     ```
     TWILIO_ACCOUNT_SID=AC...
     TWILIO_AUTH_TOKEN=...
     TWILIO_PHONE_NUMBER=whatsapp:+...
     ADMIN_PASSWORD=strong_password_here
     ```

3. **Initialize Database:**
   ```bash
   npm run setup
   ```
   This creates the database and adds sample commodities.

4. **Start Server:**
   ```bash
   npm start
   ```
   Server runs on `http://localhost:3000`

5. **Configure Twilio Webhook:**
   - Go to Twilio Console > WhatsApp Settings
   - Set webhook URL: `https://your-domain.com/webhook/incoming-message`
   - Method: POST

6. **Test:**
   - Send "list" to your bot's WhatsApp number
   - You should get a list of available products

---

## 👤 User Commands

Users interact with the bot via WhatsApp using simple commands:

| Command | Example | Result |
|---------|---------|--------|
| `list` | list | Shows all products with prices |
| `price of [item]` | price of rice | Shows price of that item |
| `about [item]` | about wheat | Shows product details |
| `RENEW` | RENEW | Extends subscription by 30 days |
| `help` | help | Shows help menu |
| Send image | [any image] | Bot acknowledges and helps |

---

## 💼 Admin Operations

### Via Dashboard (Easy)
1. Open `dashboard.html` in browser
2. Enter admin password
3. Use tabs to manage:
   - Products
   - Bulk messaging
   - Updates
   - Subscriptions

### Via API (Advanced)
Use curl or Postman with Bearer token authentication.

Example: Send bulk message
```bash
curl -X POST http://localhost:3000/api/bulk-message \
  -H "Authorization: Bearer your_password" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello everyone! New products available.",
    "imageUrl": null
  }'
```

---

## 🔄 Subscription & Renewal System

### How It Works
1. **New User Signup:**
   - Automatically gets 30-day subscription
   - Subscription ends 30 days from now

2. **Expiry Detection:**
   - Server checks hourly for expired subscriptions
   - Expired users get notification

3. **Renewal Reminders:**
   - Users get reminder 7 days before expiry
   - User can reply "RENEW" to extend

4. **Admin Renewal:**
   - Admin can manually renew via API
   - `/api/subscription/:phone/renew`

5. **Statistics:**
   - Track active/expired subscriptions
   - Monitor subscription tiers
   - Get usage metrics

---

## 📊 Database Schema Overview

### Users Table
```sql
id (PK)
phone_number (UNIQUE)
name
subscription_status (active/expired)
subscription_start_date
subscription_end_date
created_at
```

### Commodities Table
```sql
id (PK)
name
description
price
currency
image_path
category
is_active (1/0 for soft delete)
```

### Bulk Messages Table
```sql
id (PK)
message_text
image_path
total_recipients
sent_count
failed_count
status (pending/in_progress/completed)
scheduled_for
created_at
completed_at
```

### Subscriptions Table
```sql
id (PK)
user_phone (UNIQUE)
subscription_tier (basic/premium/etc)
monthly_cost
next_renewal_date
auto_renew (1/0)
active (1/0)
```

---

## 🛡️ Security Best Practices

1. **Environment Variables:**
   - Never commit `.env` to git
   - Use strong passwords (16+ characters)
   - Rotate credentials regularly

2. **API Authentication:**
   - All endpoints require Bearer token
   - Use HTTPS in production
   - Implement rate limiting

3. **Database:**
   - Regular backups
   - Restrict file permissions
   - Use indexes for performance

4. **Twilio:**
   - Keep credentials secret
   - Monitor API usage
   - Enable webhook signature verification

5. **Input Validation:**
   - Validate phone numbers
   - Sanitize messages
   - Check file uploads

---

## 🐛 Troubleshooting

### Server Won't Start
```
Error: ENOENT: no such file or directory
Solution: Create data/ directory or run npm run setup
```

### No Messages Received
```
Problem: Webhook not getting called
Solution:
1. Check Twilio webhook URL is accessible
2. Verify ngrok/domain is running
3. Check firewall port 3000
4. Look at server logs
```

### Database Locked
```
Problem: Cannot write to database
Solution:
1. Check file permissions
2. Close other connections
3. Delete bot.db and reinitialize
```

### Subscriptions Not Expiring
```
Problem: Users not getting expiry notifications
Solution:
1. Run: POST /api/subscriptions/check-expiry
2. Check timestamps in database
3. Verify server is running
```

### Images Not Saving
```
Problem: Images not uploading
Solution:
1. Check uploads/ directory exists
2. Verify directory is writable
3. Check MAX_FILE_SIZE in .env
4. Look at server logs
```

---

## 📈 Performance Tips

1. **Rate Limiting:**
   - Bulk messages have 100ms delay
   - Prevents Twilio rate limiting
   - Adjust in `whatsappService.js` if needed

2. **Database:**
   - Indexes on frequently queried columns
   - Use database backups regularly
   - Monitor database file size

3. **Caching:**
   - Cache commodity list (optional)
   - Reduce database queries
   - Use Redis for sessions (advanced)

4. **Monitoring:**
   - Set up logging
   - Monitor API response times
   - Track error rates

---

## 🚢 Deployment Options

### Development (Ngrok)
```bash
npm start              # Terminal 1
ngrok http 3000       # Terminal 2
```

### Production (Heroku)
```bash
git push heroku main
heroku config:set TWILIO_ACCOUNT_SID=...
```

### Production (AWS EC2)
```bash
pm2 start src/server.js
pm2 save
pm2 startup
```

### Production (Docker)
```bash
docker build -t whatsapp-bot .
docker run -p 3000:3000 \
  -e TWILIO_ACCOUNT_SID=... \
  whatsapp-bot
```

---

## 📚 Important Files

| File | Purpose |
|------|---------|
| `src/server.js` | Main server & API routes |
| `src/database/db.js` | Database schema & connection |
| `src/services/whatsappService.js` | Twilio integration |
| `src/services/responseGenerator.js` | Auto-reply logic |
| `src/handlers/messageHandler.js` | Incoming message processing |
| `src/handlers/bulkMessagingHandler.js` | Bulk operations |
| `.env` | Configuration (EDIT THIS!) |
| `dashboard.html` | Admin interface |
| `README.md` | Full documentation |
| `QUICKSTART.md` | Quick setup guide |

---

## ✅ Features Checklist

- [x] Send individual messages to users
- [x] Send bulk messages to 100+ users
- [x] Receive and process incoming messages
- [x] Handle image uploads from users
- [x] Auto-reply with commodity information
- [x] Intelligent product search
- [x] Price lookup system
- [x] Monthly subscriptions
- [x] Automatic renewal reminders
- [x] Expiry detection & notifications
- [x] Broadcast updates to all users
- [x] Update delivery tracking
- [x] Admin dashboard
- [x] REST API for all operations
- [x] Database persistence
- [x] Error handling & logging
- [x] Rate limiting for bulk messages

---

## 📞 Support & Maintenance

### Regular Maintenance Tasks
- [ ] Weekly: Check server logs
- [ ] Weekly: Monitor Twilio usage
- [ ] Monthly: Database backup
- [ ] Monthly: Check expired subscriptions
- [ ] Quarterly: Security audit
- [ ] Quarterly: Update dependencies

### Monitoring
- Check `/health` endpoint regularly
- Monitor database size
- Track API response times
- Watch error logs

### Scaling
- Add caching layer (Redis)
- Use message queue (RabbitMQ)
- Load balance multiple servers
- Use CDN for images

---

## 🎓 Learning Resources

- [Twilio WhatsApp API](https://www.twilio.com/whatsapp)
- [Express.js Documentation](https://expressjs.com/)
- [SQLite3 Guide](https://www.sqlite.org/cli.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

## 📝 License

ISC - See LICENSE file for details

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Author:** Your Name

---

## 🎉 You're All Set!

Your WhatsApp bot is fully configured and ready to use. 

**Next Steps:**
1. Edit `.env` with your Twilio credentials
2. Run `npm install && npm run setup`
3. Run `npm start`
4. Configure Twilio webhook
5. Test with "list" command
6. Use dashboard.html for admin operations

**Happy botting! 🚀**
