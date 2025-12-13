# Quick Start Guide

## 5-Minute Setup

### Step 1: Get Twilio Credentials
1. Visit https://www.twilio.com/console
2. Sign up or log in
3. Go to **Messaging > Settings > WhatsApp Sandbox**
4. Copy your:
   - Account SID
   - Auth Token
   - WhatsApp Phone Number

### Step 2: Install & Configure
```bash
# Install dependencies
npm install

# Edit .env file with your Twilio credentials
# TWILIO_ACCOUNT_SID=ACxxxxxxxxx
# TWILIO_AUTH_TOKEN=axxxxxxxx
# TWILIO_PHONE_NUMBER=whatsapp:+14155552671
# ADMIN_PASSWORD=your_secure_password
```

### Step 3: Initialize Database
```bash
npm run setup
```

### Step 4: Start Server
```bash
npm start
```

### Step 5: Configure Webhook
1. Go to Twilio Console > WhatsApp Settings
2. Set webhook URL to: `https://your-domain.com/webhook/incoming-message`
3. Method: POST

### Step 6: Test
Send "list" to your bot's WhatsApp number and you should get a response!

## Access Admin Dashboard
Open `dashboard.html` in your browser and enter your admin password.

## Common Commands for Users

| Command | Example |
|---------|---------|
| View products | `list` |
| Check price | `price of rice` |
| Product info | `about wheat` |
| Renew subscription | `RENEW` |
| Get help | `help` |

## API Quick Reference

### Send Bulk Message
```bash
curl -X POST http://localhost:3000/api/bulk-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PASSWORD" \
  -d '{
    "message": "Hello! Check our new products.",
    "imageUrl": null
  }'
```

### Add Product
```bash
curl -X POST http://localhost:3000/api/commodities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PASSWORD" \
  -d '{
    "name": "Rice",
    "price": 15.99,
    "description": "Premium rice",
    "category": "Grains"
  }'
```

### Broadcast Update
```bash
curl -X POST http://localhost:3000/api/broadcast-update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PASSWORD" \
  -d '{
    "title": "New Update",
    "description": "Check out our new products!",
    "version": "1.1.0"
  }'
```

## Deployment Options

### Option 1: Using Ngrok (Development)
```bash
# Terminal 1
npm start

# Terminal 2
ngrok http 3000
# Copy ngrok URL to Twilio webhook
```

### Option 2: AWS EC2
```bash
# SSH into your instance
ssh -i key.pem ec2-user@your-instance

# Clone and setup
git clone your-repo
cd whatsapp_bot
npm install
npm run setup

# Start with PM2
npm install -g pm2
pm2 start src/server.js
pm2 save
```

### Option 3: Heroku
```bash
heroku create your-bot-name
git push heroku main
heroku config:set TWILIO_ACCOUNT_SID=xxxx
heroku config:set TWILIO_AUTH_TOKEN=xxxx
```

### Option 4: Docker
```dockerfile
FROM node:16
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t whatsapp-bot .
docker run -p 3000:3000 \
  -e TWILIO_ACCOUNT_SID=xxxx \
  -e TWILIO_AUTH_TOKEN=xxxx \
  whatsapp-bot
```

## Features Overview

### ✅ Bulk Messaging
- Send to 100+ users instantly
- Schedule messages for later
- Track delivery status

### ✅ Auto-Reply
- Smart product search
- Price lookup
- Conversation history

### ✅ Monthly Subscriptions
- Auto 30-day activation
- Renewal reminders
- Auto-expiry system

### ✅ Image Support
- Accept images from users
- Process with captions
- Store locally

### ✅ Updates Broadcasting
- Send app updates to all users
- Track delivery
- Version management

### ✅ Admin Dashboard
- Manage products
- View analytics
- Send messages
- Control subscriptions

## Troubleshooting

### Webhook not receiving messages?
1. Check Twilio webhook URL is accessible
2. Verify POST method is selected
3. Check server logs for errors
4. Make sure firewall allows port 3000

### Subscriptions not working?
1. Run: `npm run setup` again
2. Check database file exists: `./data/bot.db`
3. Verify timestamps in database

### Messages sent but no response?
1. Check TWILIO credentials in .env
2. Verify WhatsApp account is verified
3. Check bot phone number format

### Performance issues?
1. Increase rate limiting in `whatsappService.js`
2. Use database indexes
3. Consider message queue (Redis)

## Production Checklist

- [ ] Use HTTPS/SSL certificate
- [ ] Set NODE_ENV=production
- [ ] Change ADMIN_PASSWORD
- [ ] Set up database backups
- [ ] Configure monitoring/logging
- [ ] Set rate limiting
- [ ] Use environment variables for secrets
- [ ] Test all features thoroughly
- [ ] Set up error logging
- [ ] Plan for scaling

## Next Steps

1. **Customize commodities** - Add your actual products
2. **Set up auto-renewal** - Configure payment integration
3. **Add authentication** - Protect admin endpoints
4. **Enable logging** - Track all activities
5. **Set up monitoring** - Monitor uptime and errors

## Support

For issues or questions:
- Check README.md for detailed docs
- Review error logs in server console
- Test API endpoints with curl or Postman
- Verify Twilio credentials and webhook setup
