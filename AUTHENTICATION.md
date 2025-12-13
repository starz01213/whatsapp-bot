# 🔐 Authentication & Configuration Guide

## Centralized Password Management

Your WhatsApp bot uses a **centralized authentication service** that makes password management simple and secure.

---

## 🔐 Password Requirements

Your WhatsApp bot enforces **strong password security**:

### Minimum Password Length: **8 Characters per User**

All users must use passwords that are **at least 8 characters long**.

```
✅ Valid passwords (8+ characters):
- MyPassword123
- Secure@Bot2025
- WhatsAppBot#789
- 12345678 (minimum)
- VerySecurePass

❌ Invalid passwords (less than 8 characters):
- pass123 (7 chars) ❌
- bot2025 (7 chars) ❌
- 1234567 (7 chars) ❌
```

### Password Validation

When a user attempts to login or set a password, the bot **automatically validates** the length:

```
✅ User enters "MyPassword123" (13 chars) → Login successful
❌ User enters "botpass" (7 chars) → Login fails - "Password must be at least 8 characters"
```

---

## 🔑 How to Set It Up

### Step 1: Edit .env File
```env
ADMIN_PASSWORD=YourSecure8CharPassword123
```

**Important:** Password must be **at least 8 characters long**

### Step 2: Start the Server
The server validates the password:
```
✅ If valid (8+ chars): Server starts normally
❌ If invalid (less than 8 chars): Server exits with error
```

### Step 3: Use in Dashboard
```
Open dashboard.html → Enter your password → Access all features
```

### Step 4: Use in API Calls
```bash
curl -X POST http://localhost:3000/api/commodities \
  -H "Authorization: Bearer YourSecure8CharPassword123" \
  -H "Content-Type: application/json" \
  -d '{"name": "Rice", "price": 15.99}'
```

---

## 🛡️ Public Endpoints (No Password Required)

These endpoints work **without authentication**:

### Public Endpoints
```
✅ GET /health                    # Health check
✅ POST /webhook/incoming-message # Twilio webhook
✅ GET /api/updates               # Get all updates
✅ GET /api/updates/:id/stats     # Get update stats
```

**Why these are public:**
- Health check: Server monitoring
- Webhook: Twilio needs to call without auth
- Updates & stats: Users can view without logging in

---

## 🔒 Protected Endpoints (Password Required)

These endpoints need your **admin password**:

### Admin Endpoints
```
🔒 POST /api/commodities                    # Add product
🔒 GET /api/commodities                     # List products
🔒 GET /api/commodities/search/:term        # Search products
🔒 PUT /api/commodities/:id                 # Update product
🔒 DELETE /api/commodities/:id              # Delete product

🔒 POST /api/bulk-message                   # Send bulk message
🔒 GET /api/bulk-message/:id                # Check status
🔒 GET /api/bulk-messages                   # List messages

🔒 POST /api/broadcast-update               # Send update (needs password)

🔒 GET /api/subscription/:phone             # Get subscription
🔒 POST /api/subscription/:phone/renew      # Renew subscription
🔒 GET /api/subscriptions                   # List subscriptions
🔒 GET /api/subscriptions/stats             # Get stats
🔒 POST /api/subscriptions/check-expiry     # Check expiries
🔒 POST /api/subscriptions/send-reminders   # Send reminders
```

---

## 📖 How Authentication Works

### Bearer Token System
All protected endpoints use **Bearer token authentication**:

```
Authorization: Bearer YOUR_PASSWORD
```

### Example API Call
```bash
# Without authentication (will fail)
curl http://localhost:3000/api/commodities

# Result: {"error":"Unauthorized - Invalid or missing token"}

# With authentication (will succeed)
curl http://localhost:3000/api/commodities \
  -H "Authorization: Bearer your_password"

# Result: {"success":true,"commodities":[...]}
```

### In Dashboard
```
1. Open dashboard.html
2. Browser prompts for password
3. Enter your admin password
4. All features unlocked
```

---

## 🎯 What Changed

### Before
- Password checks scattered throughout code
- Multiple authentication functions
- Hard to manage centrally

### After
- **Single auth service** (`authService.js`)
- **Centralized password** (only in `.env`)
- **Easy to update** (edit once, everywhere updates)
- **Flexible configuration** (public vs protected endpoints)

---

## 🔄 Managing Passwords

### Change Your Password (for ALL users)

**Step 1:** Edit `.env` file
```env
ADMIN_PASSWORD=NewStrongPassword123
```

**Step 2:** Restart server
```powershell
npm start
```

**Step 3:** All users use new password everywhere
- Dashboard: Old password stops working, use new one
- API: Update Bearer token to new password
- Everyone affected simultaneously

### Password Rotation Strategy

For security, rotate password periodically:

```
Month 1: ADMIN_PASSWORD=FirstPassword123
Month 2: ADMIN_PASSWORD=SecondPassword456  (notify all users)
Month 3: ADMIN_PASSWORD=ThirdPassword789   (notify all users)
```

**Important:** When you change password:
- ⚠️ All users must switch immediately
- ⚠️ Old password stops working
- ⚠️ API calls with old token will fail
- ⚠️ Dashboard sessions reset

---

## 📝 Password Best Practices

✅ **Do:**
- Use password of **at least 8 characters** (enforced)
- Use strong password (16+ characters recommended for extra security)
- Include uppercase, lowercase, numbers, symbols
- Store securely in `.env` (never in code)
- Change regularly (monthly recommended)
- Never share with unauthorized users
- Use different passwords for dev/prod

❌ **Don't:**
- Use simple passwords like "password123" (even if 8+ chars, it's weak)
- Use passwords less than 8 characters (server will reject)
- Store password in code or git
- Share password in messages
- Use same password across services
- Commit `.env` file to git

---

## 🚀 Deployment Security

### For Production

**Step 1:** Never commit `.env` to git
```
# .gitignore should include:
.env
.env.local
.env.*.local
```

**Step 2:** Set environment variables on server
```bash
# Heroku
heroku config:set ADMIN_PASSWORD=your_password

# AWS/Docker
export ADMIN_PASSWORD=your_password

# Nginx
server {
  env ADMIN_PASSWORD="your_password";
}
```

**Step 3:** Use HTTPS only
```
All API calls must use HTTPS in production
```

**Step 4:** Monitor access
```
Log all API access
Alert on failed authentication attempts
```

---

## 🧪 Testing Authentication

### Test Public Endpoint (No Auth)
```bash
curl http://localhost:3000/health
# Response: {"status":"ok","timestamp":"..."}
```

### Test Protected Endpoint (No Auth - Should Fail)
```bash
curl http://localhost:3000/api/commodities
# Response: {"error":"Unauthorized - Invalid or missing token"}
```

### Test Protected Endpoint (With Auth - Should Work)
```bash
curl http://localhost:3000/api/commodities \
  -H "Authorization: Bearer your_password"
# Response: {"success":true,"commodities":[...]}
```

---

## 📊 Authentication Flow Diagram

```
┌─────────────────────────────────────────────┐
│         Incoming Request                    │
└────────────────┬────────────────────────────┘
                 │
                 ▼
    ┌─────────────────────────────┐
    │  Is endpoint public?         │
    │  (/health, /webhook, etc)    │
    └─────────┬─────────┬──────────┘
              │         │
           YES │         │ NO
              │         │
              ▼         ▼
          ┌──────┐  ┌──────────────────────┐
          │Allow │  │  Check Authorization │
          │      │  │  Header Present?     │
          └──────┘  └──────┬───┬──────────┘
                          │   │
                       YES│   │NO
                          │   │
                          ▼   ▼
                      ┌──────────────┐
                      │ Extract      │
                      │ Token        │
                      └───┬──────────┘
                          │
                          ▼
                    ┌─────────────────┐
                    │ Verify Token    │
                    │ == PASSWORD?    │
                    └───┬───────────┬─┘
                        │           │
                      YES│           │NO
                        │           │
                        ▼           ▼
                    ┌────────┐  ┌──────────┐
                    │ Allow  │  │ Deny 401 │
                    │Request │  │ Unauth   │
                    └────────┘  └──────────┘
```

---

## 🎓 Auth Service Methods

### For Developers

The `AuthService` provides these methods:

```javascript
// Verify a token
authService.verifyAdminToken(token)
// Returns: true/false

// Extract token from Authorization header
authService.extractToken(authHeader)
// Returns: token string or null

// Check if endpoint is public
authService.isPublicEndpoint(path)
// Returns: true/false

// Middleware for Express
authService.adminAuthMiddleware()
// Use: app.use(authService.adminAuthMiddleware())

// Optional auth middleware
authService.optionalAuthMiddleware()
// Use: For endpoints that optionally use auth
```

---

## 📱 WhatsApp Status Image Support

### What's New

Your bot can now **view and process images from WhatsApp Status**!

### How It Works

1. User tags your bot in their status
2. Bot automatically downloads the status image
3. If caption provided, bot responds to query
4. Image stored for future reference

### Example

**User Action:**
```
Shares status with image of rice bags
Tags your bot's number
Adds caption: "Is this the rice you sell?"
```

**Bot Response:**
```
1. Downloads status image
2. Reads caption
3. Responds with product match
4. Stores image with metadata
```

### Image Types Supported

✅ **All standard image formats automatically detected:**
- JPEG/JPG
- PNG
- GIF
- WebP
- BMP
- SVG
- TIFF
- ICO
- PSD
- HEIC/HEIF (Apple formats)
- And any other image/* MIME type

### Video Types Supported

✅ **All standard video formats automatically detected:**
- MP4
- MOV (QuickTime)
- AVI
- MKV (Matroska)
- WebM
- FLV
- WMV
- ASF
- 3GP / 3G2 (Mobile)
- OGV (Ogg Vorbis)
- MPG / MPEG
- M4V
- And any other video/* MIME type

### Audio Types Supported

✅ **All standard audio formats automatically detected:**
- MP3
- WAV
- OGG
- WebM
- And any other audio/* MIME type

---

## 🔄 Universal File Type Detection

Your bot now **automatically supports ALL image and video formats** without needing to update code when new formats appear!

### How It Works

The bot uses **smart MIME type parsing**:

```
1. Receives MIME type from Twilio: "image/webp" or "video/quicktime"
2. Checks standard mapping (JPEG → .jpg, MP4 → .mp4)
3. If unknown, dynamically extracts extension from MIME type
4. Automatically handles vendor-specific types (image/vnd.*, audio/x-*)
5. Falls back to sensible defaults if parsing fails
```

### Dynamic Extension Examples

```
image/webp        → .webp       (recognized)
video/quicktime   → .mov        (recognized)
image/heic        → .heic       (recognized)
video/x-matroska  → .matroska   (auto-extracted)
image/x-canon     → .canon      (auto-extracted)
audio/x-wav       → .wav        (auto-extracted)
```

### Zero-Configuration Support

No matter what image/video format WhatsApp sends in the future:
- ✅ Bot will automatically detect it
- ✅ Correct file extension applied
- ✅ No code changes needed
- ✅ No version updates required

---

## 💾 Image Storage

All images saved in:
```
uploads/
├── 1234567890_1234567890.jpg    (user phone_timestamp format)
├── 1234567890_1234567891.jpg
└── [more images...]
```

---

## 🎊 Summary of Changes

| Feature | Before | After |
|---------|--------|-------|
| **Password locations** | Scattered in code | 1 place (.env) |
| **Auth service** | None | Centralized |
| **Public endpoints** | All protected | Specific ones public |
| **Update access** | Requires auth | Public read, auth write |
| **Status support** | Not supported | Full support |
| **File types** | JPG only | Auto-detect |

---

## 🚀 Next Steps

1. ✅ Update `.env` with secure password
2. ✅ Restart server
3. ✅ Test public endpoints (no auth needed)
4. ✅ Test protected endpoints (with auth)
5. ✅ Users can share status images with your bot
6. ✅ Bot auto-responds to status queries

---

## 📞 Troubleshooting

### "Unauthorized - Invalid or missing token"
**Solution:** Check Authorization header
```bash
curl -H "Authorization: Bearer YOUR_PASSWORD" ...
```

### Password changed but still getting errors
**Solution:** 
1. Restart server: `npm start`
2. Clear browser cache
3. Close and reopen dashboard.html

### Status images not being downloaded
**Solution:**
1. Check uploads/ directory exists
2. Check write permissions
3. Verify Twilio image URL accessible
4. Check Twilio credentials in .env

### Still having issues?
1. Check `.env` file has ADMIN_PASSWORD set
2. Verify password is not empty
3. Run `test-api.js` to test endpoints
4. Check server logs for errors

---

**Your bot now has secure, centralized authentication! 🔐**

---
