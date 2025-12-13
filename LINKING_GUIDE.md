# WhatsApp Account Linking Bot - Complete Guide

## Overview

The WhatsApp Account Linking Bot enables secure account linking using either:
- **QR Code** - Scan with your device's camera
- **8-Digit PIN** - Manual verification code sent via WhatsApp

This system provides a secure, user-friendly authentication mechanism for linking WhatsApp accounts to your bot service.

## Features

### 🔐 Dual Authentication Method
- **QR Code Scanning**: Generate unique QR codes containing session data and PIN
- **8-Digit PIN**: Alphanumeric PIN sent via WhatsApp for manual entry
- **Session Management**: 5-minute expiration for security
- **Attempt Limiting**: Maximum 3 verification attempts per session

### 📱 User-Friendly Dashboard
- Real-time QR code generation and display
- PIN display and copy-to-clipboard functionality
- Account linking status tracking
- Multiple account linking support
- One-click account unlinking

### 🔄 Account Management
- Link multiple WhatsApp accounts
- View all linked accounts with timestamps
- Unlink accounts when no longer needed
- Account linking history
- Automatic session cleanup

### 📊 Admin Dashboard
- Linking statistics and analytics
- Active sessions overview
- Failed attempt tracking
- User linking trends

## Installation

### 1. Install Dependencies

```bash
npm install
```

The linking feature requires:
- `qrcode` - For generating QR codes
- `twilio` - For sending PINs via WhatsApp
- Other existing dependencies

### 2. Database Setup

The database schema automatically creates the `linking_sessions` table with:
- `sessionId` - Unique session identifier
- `phone` - User's WhatsApp phone number
- `pin` - 8-digit verification PIN
- `qrCode` - QR code data URL
- `linked` - Linking status (0 = pending, 1 = linked)
- `attempts` - Failed verification attempts
- `linkedAt` - Timestamp when account was linked
- `createdAt` - Session creation timestamp

### 3. Environment Configuration

No additional environment variables needed beyond existing setup:
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=whatsapp:+1xxxxxxxxxx
PORT=3000
```

### 4. Start the Server

```bash
npm start
```

Or with auto-reload:
```bash
npm run dev
```

## API Endpoints

All linking endpoints are accessible without authentication (for user-facing operations).

### Generate Linking Session

**Endpoint**: `POST /api/linking/initiate`

**Request**:
```json
{
  "phoneNumber": "+1234567890"
}
```

**Response**:
```json
{
  "success": true,
  "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "pin": "12345678",
  "qrCode": "data:image/png;base64,...",
  "expiresIn": 300000,
  "message": "Session created. Scan QR or enter PIN."
}
```

### Verify and Link Account

**Endpoint**: `POST /api/linking/verify`

**Request**:
```json
{
  "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "pin": "12345678",
  "phoneNumber": "+1234567890"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Account successfully linked to WhatsApp",
  "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "phone": "+1234567890",
  "linkedAt": "2024-01-15T10:30:45.000Z"
}
```

### Get Session Status

**Endpoint**: `GET /api/linking/status/:sessionId`

**Response**:
```json
{
  "success": true,
  "status": "linked",
  "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "phone": "+1234567890",
  "linked": true,
  "attempts": 1,
  "maxAttempts": 3,
  "createdAt": "2024-01-15T10:25:00.000Z",
  "expiresAt": "2024-01-15T10:30:00.000Z"
}
```

### Get QR Code

**Endpoint**: `GET /api/linking/qrcode/:sessionId`

**Response**:
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,...",
  "pin": "12345678",
  "expiresAt": "2024-01-15T10:30:00.000Z"
}
```

### Resend PIN

**Endpoint**: `POST /api/linking/resend-pin`

**Request**:
```json
{
  "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "phoneNumber": "+1234567890"
}
```

**Response**:
```json
{
  "success": true,
  "message": "PIN resent to WhatsApp"
}
```

### Get Linked Accounts

**Endpoint**: `GET /api/linking/accounts/:phoneNumber`

**Response**:
```json
{
  "success": true,
  "phone": "+1234567890",
  "linkedAccounts": [
    {
      "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
      "phone": "+1234567890",
      "linkedAt": "2024-01-15T10:30:45.000Z",
      "createdAt": "2024-01-15T10:25:00.000Z"
    }
  ],
  "totalLinked": 1
}
```

### Unlink Account

**Endpoint**: `POST /api/linking/unlink`

**Request**:
```json
{
  "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "phoneNumber": "+1234567890"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Account unlinked successfully"
}
```

### Get Linking Statistics (Admin)

**Endpoint**: `GET /api/linking/stats`

**Auth**: Bearer token required

**Response**:
```json
{
  "success": true,
  "stats": {
    "totalSessions": 150,
    "linkedAccounts": 145,
    "pendingSessions": 3,
    "failedAttempts": 2
  }
}
```

## Web Dashboard

### Accessing the Dashboard

Open `linking-dashboard.html` in your browser:
```
file:///path/to/whatsapp_bot/linking-dashboard.html
```

Or access via server (if configured to serve static files):
```
http://localhost:3000/linking-dashboard.html
```

### Dashboard Features

1. **QR Code Section**
   - Displays generated QR code
   - Instructions for scanning
   - Real-time updates

2. **PIN Entry Section**
   - Phone number input with formatting
   - Generate button for creating session
   - PIN display with copy-to-clipboard
   - Manual PIN entry for verification
   - Resend PIN option

3. **Account Management**
   - View all linked accounts
   - Account linking history
   - Unlink option for each account

4. **Status Messages**
   - Real-time feedback (success, error, info)
   - Attempt counter
   - Session expiration warnings

## WhatsApp Commands

Users can also link accounts via WhatsApp messages:

| Command | Description | Example |
|---------|-------------|---------|
| `LINK` | Initiate linking process | LINK |
| `UNLINK [sessionId]` | Unlink specific account | UNLINK a1b2c3d4e5f6 |
| `LINKED` or `SHOW LINKED` | View linked accounts | LINKED |

## Security Features

### Session Management
- **Expiration**: Sessions expire after 5 minutes
- **Attempt Limiting**: Maximum 3 failed attempts per session
- **Automatic Cleanup**: Expired sessions are deleted every 10 minutes

### PIN Security
- **8-Digit Alphanumeric**: Secure PIN format
- **One-Time Use**: PIN is validated only once per session
- **WhatsApp Delivery**: PIN sent only via authenticated WhatsApp channel
- **Encrypted Storage**: PINs stored securely in database

### QR Code Security
- **Session-Specific**: Each QR code contains unique session data
- **Time-Limited**: QR codes expire with the session
- **Tamper Detection**: PIN verification prevents unauthorized linking

## Architecture

### Components

```
linking-service.js       - Core linking logic
├─ generateLinkingSession()    - Create QR + PIN
├─ verifyLink()               - Validate PIN/QR
├─ getSessionStatus()         - Check session state
├─ getUserLinkedAccounts()    - Retrieve linked accounts
├─ unlinkAccount()            - Remove linked account
└─ cleanupExpiredSessions()   - Maintenance task

linkingHandler.js        - Request handling
├─ initiateLinking()          - Start process
├─ completeLinking()          - Finish verification
├─ getLinkingStatus()         - Get current state
├─ getLinkedAccounts()        - List user accounts
└─ handleLinkingMessage()     - Process WhatsApp messages

database/db.js           - Schema
└─ linking_sessions table     - Session storage
```

### Data Flow

```
1. User initiates linking
   ↓
2. Session created with unique ID
   ↓
3. QR code generated from session data
   ↓
4. PIN generated (8 digits)
   ↓
5. PIN sent to user via WhatsApp
   ↓
6. User scans QR OR enters PIN
   ↓
7. Verification against stored PIN
   ↓
8. On success: Mark session as linked
   ↓
9. Send confirmation via WhatsApp
```

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid phone number format | Wrong phone format | Use +[country_code][number] |
| Session not found | Session expired | Generate a new QR code |
| Maximum attempts exceeded | 3 failed PIN attempts | Request new session |
| Invalid verification | Wrong PIN entered | Check WhatsApp message for correct PIN |
| Pin does not match session | Different session ID | Ensure you're using the correct session |

## Performance Optimization

### Rate Limiting
- PIN generation: No limit
- Verification attempts: 3 per session
- Session cleanup: Every 10 minutes

### Database Optimization
- Indexed `sessionId`, `phone`, and `linked` fields
- Automatic session expiration
- Periodic cleanup of expired records

### QR Code Generation
- Client-side rendering (no server load)
- PNG compression for smaller size
- Cached for 5 minutes per session

## Maintenance

### Periodic Tasks

The system automatically runs these maintenance tasks:

1. **Session Cleanup** (Every 10 minutes)
   - Removes expired linking sessions
   - Frees up database space

2. **Subscription Check** (Every hour)
   - Validates subscription status
   - Sends renewal reminders

3. **Renewal Reminders** (Every 12 hours)
   - Notifies users of upcoming renewals

### Manual Operations

#### Clean up old sessions:
```javascript
await linkingService.cleanupExpiredSessions();
```

#### Get linking stats:
```javascript
GET /api/linking/stats
Authorization: Bearer YOUR_ADMIN_PASSWORD
```

#### Check specific session:
```javascript
GET /api/linking/status/[sessionId]
```

## Troubleshooting

### QR Code not displaying
- Check browser console for errors
- Verify server is running
- Clear browser cache
- Try different browser

### PIN not received
- Check Twilio configuration
- Verify phone number format
- Check WhatsApp Business API status
- Review Twilio logs

### Session expired too quickly
- Increase `sessionTimeout` in linkingService.js (default 5 minutes)
- Check server time synchronization

### Database errors
- Verify database file exists
- Check file permissions
- Run `npm run setup` to reinitialize

## Best Practices

1. **Phone Number Format**
   - Always include country code
   - Remove all special characters except +
   - Example: +1 (USA), +44 (UK), +91 (India)

2. **Security**
   - Always use HTTPS in production
   - Keep session timeout reasonable (5 minutes)
   - Limit verification attempts (default 3)
   - Monitor failed linking attempts

3. **User Experience**
   - Provide clear instructions
   - Show session expiration countdown
   - Offer PIN resend option
   - Confirm successful linking

4. **Admin Management**
   - Monitor linking statistics
   - Review failed attempts
   - Clean up old sessions
   - Track user engagement

## Integration Examples

### Node.js Backend

```javascript
const linkingService = require('./services/linkingService');

// Generate linking session
const session = await linkingService.generateLinkingSession('+1234567890');
console.log('PIN:', session.pin);
console.log('QR Code:', session.qrCode);

// Verify link
const result = await linkingService.verifyLink(
  sessionId,
  pin,
  '+1234567890'
);
console.log('Linked:', result.success);
```

### JavaScript Frontend

```javascript
// Fetch API for linking
async function linkAccount(phone) {
  const response = await fetch('/api/linking/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: phone })
  });
  return await response.json();
}

// Verify PIN
async function verifyPin(sessionId, pin, phone) {
  const response = await fetch('/api/linking/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, pin, phoneNumber: phone })
  });
  return await response.json();
}
```

### cURL Examples

```bash
# Generate session
curl -X POST http://localhost:3000/api/linking/initiate \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+1234567890"}'

# Verify link
curl -X POST http://localhost:3000/api/linking/verify \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId":"abc123...",
    "pin":"12345678",
    "phoneNumber":"+1234567890"
  }'

# Get status
curl http://localhost:3000/api/linking/status/abc123...

# Get linked accounts
curl http://localhost:3000/api/linking/accounts/%2B1234567890
```

## Deployment Checklist

- [ ] Update `.env` with correct Twilio credentials
- [ ] Set strong `ADMIN_PASSWORD`
- [ ] Configure HTTPS/SSL certificate
- [ ] Update Twilio webhook URL to production domain
- [ ] Test all endpoints with real WhatsApp account
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy for database
- [ ] Test phone number validation for target regions
- [ ] Set up uptime monitoring
- [ ] Document custom configurations

## Support & Troubleshooting

For issues:
1. Check error message in status display
2. Review browser console for JavaScript errors
3. Check server logs for API errors
4. Verify Twilio configuration
5. Test API endpoints with cURL or Postman

## License

ISC

---

**Last Updated**: November 2024
**Version**: 1.0.0
