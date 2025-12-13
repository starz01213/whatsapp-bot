# WhatsApp Bot - Installation & Setup Guide

## Complete Step-by-Step Installation

### Prerequisites
- Windows/Mac/Linux
- Node.js v14+ ([Download](https://nodejs.org/))
- npm (comes with Node.js)
- Twilio Account ([Sign up free](https://www.twilio.com/console))

### Step 1: Get Twilio Credentials (5 minutes)

1. Go to [https://www.twilio.com/console](https://www.twilio.com/console)
2. Sign up or log in to your account
3. Look at your dashboard - you'll see:
   - **Account SID** - Copy this
   - **Auth Token** - Copy this
4. Go to **Messaging > Settings > WhatsApp Sandbox** section
5. You'll see your WhatsApp phone number - Copy it
   - Format: `whatsapp:+14155552671` (example)

**Save these temporarily - you'll need them in Step 3.**

### Step 2: Navigate to Project Directory

Open Command Prompt or PowerShell:

```powershell
cd c:\Users\hp\Documents\whatsapp_bot
```

### Step 3: Create .env Configuration File

**Option A: Manual Editing**

1. Open `.env.example` in a text editor
2. Copy and paste its contents
3. Create a new file called `.env`
4. Paste the contents and edit:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=whatsapp:+14155552671
ADMIN_PASSWORD=create_a_strong_password_here
NODE_ENV=development
PORT=3000
```

**Important:** Replace the values with your actual Twilio credentials!

**Option B: Command Line**

```powershell
Copy-Item .env.example .env
notepad .env
# Edit the file with your credentials
```

### Step 4: Install Dependencies

In the same command prompt:

```powershell
npm install
```

This will download and install all required packages. It may take 2-3 minutes.

**Expected output:** Should show "added XXX packages"

### Step 5: Initialize Database

Still in command prompt:

```powershell
npm run setup
```

**This will:**
- Create SQLite database
- Create all necessary tables
- Add sample products (rice, wheat, corn oil, etc.)

**Expected output:**
```
🔧 Setting up WhatsApp Bot database...
📦 Adding sample commodities...
  ✓ Added Rice
  ✓ Added Wheat
  ...
✅ Database setup completed successfully!
```

### Step 6: Start the Server

```powershell
npm start
```

**Expected output:**
```
✓ Database connected
✓ WhatsApp Bot Server running on port 3000
Webhook URL: http://localhost:3000/webhook/incoming-message
Health Check: http://localhost:3000/health
✓ Server started at ...
```

**Keep this terminal open while the server runs.**

### Step 7: Verify Server is Running

Open a new Command Prompt and test:

```powershell
curl http://localhost:3000/health
```

You should get a response like:
```json
{"status":"ok","timestamp":"2024-..."}
```

### Step 8: Configure Twilio Webhook

1. Go to [Twilio Console](https://www.twilio.com/console)
2. Navigate to **Messaging > Settings > WhatsApp Sandbox**
3. Find the "WHEN A MESSAGE COMES IN" section
4. Set the URL to:
   - **For local testing:** Use ngrok (see below)
   - **For production:** Use your server URL
5. Method: **POST**
6. Click Save

### Step 9: Test with Ngrok (Local Testing)

To test locally without exposing your computer:

1. Download [Ngrok](https://ngrok.com/download)
2. Extract it somewhere
3. In a new Command Prompt:

```powershell
cd C:\path\to\ngrok
.\ngrok.exe http 3000
```

4. Copy the URL it shows (e.g., `https://abc123.ngrok.io`)
5. In Twilio settings, set webhook to:
   ```
   https://abc123.ngrok.io/webhook/incoming-message
   ```

### Step 10: Test the Bot

1. Open WhatsApp on your phone
2. Send a message to your bot's phone number (the one from Twilio)
3. Send the message: `list`
4. Bot should respond with list of products!

**If you don't get a response:**
- Check server logs in command prompt
- Verify Twilio credentials in .env
- Make sure webhook URL is correct and accessible
- Check that ngrok is still running

### Step 11: Use Admin Dashboard

1. Open `dashboard.html` in your browser:
   ```
   c:\Users\hp\Documents\whatsapp_bot\dashboard.html
   ```

2. When prompted, enter your admin password (from .env `ADMIN_PASSWORD`)

3. Now you can:
   - Add new products
   - Send bulk messages
   - Broadcast updates
   - Check subscription stats
   - Manage commodities

### Step 12: Test API Endpoints

In a new Command Prompt:

```powershell
node test-api.js
```

This will test all API endpoints and show you which ones are working.

---

## Common Setup Issues & Solutions

### Issue: "npm: command not found"
**Solution:** Node.js not installed
- Download and install from https://nodejs.org/
- Restart Command Prompt after installation

### Issue: "Cannot find module 'express'"
**Solution:** Dependencies not installed
```powershell
npm install
```

### Issue: "Database locked" or "ENOENT: no such file"
**Solution:** Run database setup again
```powershell
npm run setup
```

### Issue: Port 3000 already in use
**Solution:** Change PORT in .env file
```env
PORT=3001
```

### Issue: Webhook not receiving messages
**Solution:**
1. Check ngrok is running: `ngrok http 3000`
2. Copy the URL ngrok provides
3. Update Twilio webhook with exact URL
4. Message should be received within 30 seconds

### Issue: "Authentication failed" in dashboard
**Solution:** Password is wrong
- Check ADMIN_PASSWORD in your .env file
- Use that exact password in dashboard

### Issue: Bulk messages not sending
**Solution:**
1. Verify Twilio account is funded/active
2. Check /api/subscriptions/stats endpoint
3. Make sure you have active users
4. Check server logs for errors

---

## Development vs Production

### Development Setup (What you did above)
- Local testing with ngrok
- Development database
- Debug logging enabled
- Not for real users

### Production Setup
```env
NODE_ENV=production
```

For production:
1. Use a real domain/SSL
2. Set up proper logging
3. Configure database backups
4. Use process manager (PM2)
5. Set up monitoring

```bash
npm install -g pm2
pm2 start src/server.js
pm2 save
```

---

## First Time Commands to Try

Send these via WhatsApp to test your bot:

| Message | Expected Response |
|---------|------------------|
| `list` | Shows all products |
| `price of rice` | Shows rice price |
| `about wheat` | Shows wheat details |
| `help` | Shows help menu |
| `RENEW` | Renews subscription |

---

## Next Steps

1. **Customize Products:**
   - Use dashboard to add your actual products
   - Update prices and descriptions

2. **Add More Users:**
   - Users automatically register when they message
   - Their subscriptions auto-renew

3. **Send Bulk Messages:**
   - Use dashboard > Bulk Messaging
   - Or use API: `POST /api/bulk-message`

4. **Broadcast Updates:**
   - Use dashboard > Updates
   - Or use API: `POST /api/broadcast-update`

5. **Monitor Subscriptions:**
   - Check dashboard > Subscriptions
   - View active and expired users

6. **Deploy to Production:**
   - Follow production setup guide
   - Use Heroku, AWS, or your own server

---

## File Organization Reminder

```
whatsapp_bot/
├── .env              ← EDIT THIS with your credentials
├── package.json      ← Dependencies list
├── src/
│   ├── server.js     ← Main server
│   └── database/     ← Database files
├── dashboard.html    ← Open in browser for admin
├── README.md         ← Full documentation
└── data/
    └── bot.db        ← Database (auto-created)
```

---

## Support Resources

- **Error Messages:** Check server logs in command prompt
- **Twilio Issues:** Check Twilio Console > Logs
- **Database Issues:** Check `data/bot.db` file exists
- **API Issues:** Run `node test-api.js` to diagnose

---

## You're Ready!

Your WhatsApp bot is now set up and running locally. 

**Summary of what you've done:**
✅ Downloaded and installed Node.js
✅ Got Twilio credentials
✅ Created .env configuration
✅ Installed npm packages
✅ Set up database with sample products
✅ Started the server
✅ Configured Twilio webhook
✅ Tested with ngrok
✅ Verified the bot responds

**You can now:**
- Send messages to users via WhatsApp
- Receive and auto-reply to customer queries
- Manage products and prices
- Send bulk messages to all users
- Track subscriptions and renewals
- Use the admin dashboard to manage everything

**For production deployment:** See README.md for deployment options (Heroku, AWS, etc.)

---

## Quick Reference Commands

```powershell
# Install dependencies
npm install

# Setup database
npm run setup

# Start server
npm start

# Run for development (auto-reload)
npm run dev

# Test all API endpoints
node test-api.js
```

---

**Enjoy your WhatsApp Bot! 🚀**
