# WhatsApp Linking Bot - Quick Reference

## 🚀 Getting Started (5 minutes)

```bash
# 1. Install packages
npm install

# 2. Run setup helper
node setup-linking.js

# 3. Start server
npm start

# 4. Test linking
node test-linking.js

# 5. Open dashboard
open linking-dashboard.html
```

## 📱 User Flow

```
User Initiates Linking
        ↓
Generate QR Code + PIN
        ↓
Display in Dashboard
        ↓
User Scans QR OR Enters PIN
        ↓
System Verifies PIN
        ↓
Account Linked ✅
        ↓
Success Message Sent via WhatsApp
```

## 🔗 API Endpoints

### Public Endpoints (No Auth)

| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/api/linking/initiate` | `{phoneNumber}` |
| POST | `/api/linking/verify` | `{sessionId, pin, phoneNumber}` |
| POST | `/api/linking/resend-pin` | `{sessionId, phoneNumber}` |
| GET | `/api/linking/status/:sessionId` | — |
| GET | `/api/linking/qrcode/:sessionId` | — |
| GET | `/api/linking/accounts/:phoneNumber` | — |
| POST | `/api/linking/unlink` | `{sessionId, phoneNumber}` |

### Admin Endpoint (Auth Required)

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/linking/stats` | Bearer token |

## 💬 WhatsApp Commands

```
LINK                    Generate QR + PIN
UNLINK [sessionId]      Remove linked account
LINKED                  Show all linked accounts
SHOW LINKED             Show all linked accounts
```

## 📊 Response Examples

### Generate Session
```json
{
  "success": true,
  "sessionId": "abc123...",
  "pin": "12345678",
  "qrCode": "data:image/png;base64,...",
  "expiresIn": 300000
}
```

### Verify Link
```json
{
  "success": true,
  "message": "Account successfully linked",
  "sessionId": "abc123...",
  "phone": "+1234567890",
  "linkedAt": "2024-01-15T10:30:00Z"
}
```

### Get Status
```json
{
  "success": true,
  "status": "linked",
  "phone": "+1234567890",
  "linked": true,
  "attempts": 1,
  "maxAttempts": 3
}
```

## 🗄️ Database Schema

```sql
CREATE TABLE linking_sessions (
  id INTEGER PRIMARY KEY,
  sessionId TEXT UNIQUE,
  phone TEXT,
  pin TEXT,
  qrCode TEXT,
  linked INTEGER,
  attempts INTEGER,
  linkedAt DATETIME,
  createdAt DATETIME
);

-- Indexes
CREATE INDEX idx_linking_sessions_id ON linking_sessions(sessionId);
CREATE INDEX idx_linking_sessions_phone ON linking_sessions(phone);
CREATE INDEX idx_linking_sessions_linked ON linking_sessions(linked);
```

## 🔒 Security Details

| Feature | Details |
|---------|---------|
| PIN Format | 8 random digits |
| Session TTL | 5 minutes (300,000ms) |
| Max Attempts | 3 per session |
| Verification | One-time per session |
| Storage | Encrypted in database |
| WhatsApp Delivery | Authenticated channel |

## 🧪 Testing Commands

```bash
# Full test suite
npm run test-linking

# Setup verification
npm run setup-linking

# Quick health check
curl http://localhost:3000/health

# Generate session
curl -X POST http://localhost:3000/api/linking/initiate \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+1234567890"}'

# Check status
curl http://localhost:3000/api/linking/status/[SESSION_ID]
```

## 📁 File Structure

```
whatsapp_bot/
├── src/
│   ├── services/
│   │   └── linkingService.js       ← Core logic
│   ├── handlers/
│   │   └── linkingHandler.js       ← Request handling
│   ├── database/
│   │   └── db.js                   ← Schema (updated)
│   └── server.js                   ← Endpoints (updated)
├── linking-dashboard.html           ← Web UI
├── LINKING_GUIDE.md                 ← Full docs
├── LINKING_FEATURE.md               ← Feature summary
├── setup-linking.js                 ← Setup helper
├── test-linking.js                  ← Test suite
└── package.json                     ← Scripts added
```

## ⚙️ Configuration

No special config needed! Uses existing `.env`:

```env
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=whatsapp:+1xxxxxxxxxx
PORT=3000
```

## 🐛 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| QR not showing | Restart server, clear cache |
| PIN not received | Check Twilio credentials |
| Session expired | Generate new session (5min limit) |
| Database error | Run `npm run setup` |
| Connection refused | Make sure `npm start` is running |

## 📞 Support Resources

- **Full Documentation**: See `LINKING_GUIDE.md`
- **Feature Overview**: See `LINKING_FEATURE.md`
- **Source Code**: `src/services/linkingService.js`
- **Tests**: Run `npm run test-linking`

## 🎯 Key Numbers

- **Session Timeout**: 5 minutes (300,000ms)
- **PIN Length**: 8 digits
- **Max Attempts**: 3 per session
- **QR Code Size**: ~250x250 pixels
- **Cleanup Interval**: 10 minutes
- **Total New Files**: 5
- **New Database Tables**: 1
- **New API Endpoints**: 7 public + 1 admin

## ✨ Features at a Glance

✅ QR Code Generation  
✅ 8-Digit PIN System  
✅ Web Dashboard  
✅ Account Management  
✅ Session Tracking  
✅ WhatsApp Integration  
✅ Admin Statistics  
✅ Automatic Cleanup  
✅ Error Handling  
✅ Mobile Responsive  

## 🎓 Learning Resources

1. **Quickest Start**
   - Follow "Getting Started (5 minutes)" above
   - Open dashboard
   - Try generating QR

2. **Understand API**
   - Review API Endpoints section
   - Test with provided cURL commands
   - Run `npm run test-linking`

3. **Deep Dive**
   - Read `LINKING_GUIDE.md`
   - Study `linkingService.js`
   - Check `linking-dashboard.html` source

## 🚀 Next Steps

1. ✅ Run `npm run setup-linking`
2. ✅ Start server with `npm start`
3. ✅ Test with `npm run test-linking`
4. ✅ Open `linking-dashboard.html`
5. ✅ Try linking your first account
6. ✅ Check WhatsApp for PIN
7. ✅ Verify account linked
8. ✅ View linked accounts list
9. ✅ Read full `LINKING_GUIDE.md`
10. ✅ Deploy to production

## 💡 Pro Tips

- Copy PIN with one-click button on dashboard
- Phone format: +[country][number] (e.g., +1 USA)
- Sessions auto-expire after 5 minutes
- Failed attempts tracked (3 max)
- Multiple accounts can be linked
- Admin stats available via `/api/linking/stats`
- Database auto-cleans every 10 minutes
- Works on mobile browsers too!

## 📞 Support Checklist

Before contacting support:
- [ ] Ran `npm run setup-linking`
- [ ] Ran `npm run test-linking`
- [ ] Server is running (`npm start`)
- [ ] Checked `.env` configuration
- [ ] Reviewed error messages
- [ ] Checked browser console
- [ ] Verified phone number format
- [ ] Reviewed `LINKING_GUIDE.md`

---

**Last Updated**: November 2024  
**Status**: Production Ready ✅  
**Questions?** See `LINKING_GUIDE.md` for complete documentation
