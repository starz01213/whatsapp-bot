# Payment System - Complete Documentation

## 🎯 Overview

Your WhatsApp Bot now includes a complete payment and subscription management system with:
- **1-Day Free Trial** - No payment required
- **4 Subscription Plans** - Flexible pricing
- **OPay Transfer** - Simple bank transfer payment
- **WhatsApp Integration** - Seamless notifications

## 💳 Payment Account Details

**Account Information:**
- **Account Number**: 8144821073
- **Bank**: OPay
- **Account Name**: Igboneme Promise
- **Payment Method**: Transfer Only
- **Currency**: Nigerian Naira (NGN)

## 📋 Subscription Plans

### Free Trial
- **Duration**: 1 Day
- **Price**: ₦0 (Free)
- **Description**: Full access for 1 day
- **Plan ID**: `trial`

### Plan 1: One Month
- **Duration**: 1 Month
- **Price**: ₦1,500
- **Plan ID**: `monthly_1`

### Plan 2: Two Months
- **Duration**: 2 Months
- **Price**: ₦3,000
- **Savings**: Save ₦500
- **Plan ID**: `monthly_2`

### Plan 3: Six Months
- **Duration**: 6 Months
- **Price**: ₦8,000
- **Savings**: Save ₦1,000
- **Plan ID**: `monthly_6`

### Plan 4: One Year
- **Duration**: 1 Year
- **Price**: ₦16,000
- **Savings**: Save ₦2,000
- **Best Value**: Recommended
- **Plan ID**: `yearly_1`

## 🚀 Usage Flow

### For End Users

```
1. User Initiates → TRIAL command
         ↓
2. System → Starts 1-day trial
         ↓
3. Send → Welcome message via WhatsApp
         ↓
4. After Trial Expires → User needs subscription
         ↓
5. User → PLANS command
         ↓
6. System → Shows all available plans
         ↓
7. User → BUY [plan_id]
         ↓
8. System → Sends payment instructions
         ↓
9. User → Transfers money to account
         ↓
10. User → CONFIRM [reference_id]
         ↓
11. System → Activates subscription
         ↓
12. Send → Confirmation via WhatsApp
```

### WhatsApp Commands

```
TRIAL              Start 1-day free trial
PLANS              View available plans
BUY [plan_id]      Purchase a plan
CONFIRM [ref_id]   Confirm payment
STATUS             Check subscription status
MYSTATUS           Check subscription status
```

## 📡 API Endpoints

### Public Endpoints

#### 1. Start Free Trial
```http
POST /api/payment/trial/start
Content-Type: application/json

{
  "phoneNumber": "+234XXXXXXXXXX"
}
```

**Response:**
```json
{
  "success": true,
  "phoneNumber": "+234...",
  "plan": "Free Trial",
  "duration": "1 day",
  "trialEnd": "2024-01-15T10:30:00.000Z",
  "message": "Free trial started! Access for 1 day."
}
```

#### 2. Get All Plans
```http
GET /api/payment/plans
```

**Response:**
```json
{
  "success": true,
  "plans": [
    {
      "id": "trial",
      "name": "Free Trial",
      "duration": 1,
      "durationUnit": "day",
      "price": 0,
      "description": "1 day free trial access"
    },
    {
      "id": "monthly_1",
      "name": "1 Month Plan",
      "duration": 1,
      "durationUnit": "month",
      "price": 1500,
      "description": "1 month access - ₦1,500"
    }
  ],
  "currency": "NGN",
  "symbol": "₦"
}
```

#### 3. Get Specific Plan
```http
GET /api/payment/plan/:planId

Example: GET /api/payment/plan/monthly_1
```

#### 4. Initiate Payment
```http
POST /api/payment/initiate
Content-Type: application/json

{
  "phoneNumber": "+234XXXXXXXXXX",
  "planId": "monthly_1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment instructions sent to WhatsApp",
  "referenceId": "PAY-+234...-1705330200000",
  "plan": "1 Month Plan",
  "amount": "₦1,500"
}
```

#### 5. Confirm Payment
```http
POST /api/payment/confirm
Content-Type: application/json

{
  "phoneNumber": "+234XXXXXXXXXX",
  "referenceId": "PAY-+234...-1705330200000"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified and subscription activated",
  "phoneNumber": "+234...",
  "plan": "1 Month Plan",
  "duration": "1 month(s)",
  "subscriptionEnd": "2024-02-15T10:30:00.000Z",
  "status": "active"
}
```

#### 6. Check Subscription Status
```http
GET /api/payment/status/:phoneNumber

Example: GET /api/payment/status/%2B234XXXXXXXXXX
```

**Response:**
```json
{
  "hasSubscription": true,
  "status": "active",
  "phoneNumber": "+234...",
  "plan": "monthly_1",
  "planName": "1 Month Plan",
  "paymentStatus": "paid",
  "subscriptionStart": "2024-01-15T10:30:00.000Z",
  "subscriptionEnd": "2024-02-15T10:30:00.000Z",
  "daysRemaining": 20,
  "message": "Active until Mon Feb 15 2024"
}
```

#### 7. Get Payment Account
```http
GET /api/payment/account
```

**Response:**
```json
{
  "success": true,
  "account": {
    "accountNumber": "8144821073",
    "bankName": "OPay",
    "accountName": "Igboneme Promise",
    "paymentMethod": "TRANSFER",
    "currency": "NGN",
    "transferInstructions": "Transfer to Igboneme Promise via OPay\nAccount: 8144821073"
  }
}
```

### Admin Endpoints (Requires Authentication)

#### 8. Get Payment Statistics
```http
GET /api/payment/stats
Authorization: Bearer YOUR_ADMIN_PASSWORD
```

**Response:**
```json
{
  "success": true,
  "statistics": {
    "totalUsers": 150,
    "activeSubscriptions": 145,
    "paidSubscriptions": 120,
    "activePaidUsers": 115
  },
  "revenueBreakdown": [
    {
      "plan_name": "1 Month Plan",
      "count": 50,
      "totalAmount": 75000
    }
  ]
}
```

#### 9. Send Expiration Reminder
```http
POST /api/payment/reminder
Authorization: Bearer YOUR_ADMIN_PASSWORD
Content-Type: application/json

{
  "phoneNumber": "+234XXXXXXXXXX"
}
```

## 🗄️ Database Schema

### user_subscriptions Table
```sql
CREATE TABLE user_subscriptions (
  id INTEGER PRIMARY KEY,
  phone_number TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT,                    -- 'active', 'expired'
  trial_started DATETIME,
  trial_end DATETIME,
  subscription_start DATETIME,
  subscription_end DATETIME,
  payment_status TEXT,            -- 'pending', 'paid', 'free'
  payment_reference TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```

### payment_requests Table
```sql
CREATE TABLE payment_requests (
  id INTEGER PRIMARY KEY,
  phone_number TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reference_id TEXT UNIQUE,
  status TEXT,                    -- 'pending', 'verified'
  created_at DATETIME,
  verified_at DATETIME
);
```

### payment_accounts Table
```sql
CREATE TABLE payment_accounts (
  id INTEGER PRIMARY KEY,
  account_number TEXT,
  bank_name TEXT,
  account_name TEXT,
  payment_method TEXT,            -- 'TRANSFER'
  currency TEXT,                  -- 'NGN'
  is_active INTEGER,
  created_at DATETIME
);
```

## 🎨 Dashboard Features

Access the payment dashboard at: `payment-dashboard.html`

### Dashboard Sections

1. **Free Trial Section**
   - Start free 1-day trial
   - Phone number input
   - Status display

2. **Subscription Status**
   - Check current subscription
   - View plan details
   - Days remaining display

3. **Payment Account**
   - Display your account details
   - Copy to clipboard button
   - Transfer instructions

4. **Plan Selection**
   - Browse all available plans
   - View pricing and duration
   - Select and purchase

5. **Payment Confirmation**
   - Enter reference ID
   - Confirm payment
   - Get activation status

6. **How It Works**
   - Step-by-step instructions
   - Clear payment process
   - User guidance

## 📱 WhatsApp Integration

### Automated Messages Sent

**Trial Started:**
```
🎉 Welcome to Our Service!

You've been given a 1-day free trial to explore all features.

⏰ Trial expires: [Date]

After your trial, choose a subscription plan to continue:
• 1 Month: ₦1,500
• 2 Months: ₦3,000
• 6 Months: ₦8,000
• 1 Year: ₦16,000

Reply with "PLANS" to see pricing details.
```

**Payment Instructions:**
```
💳 Payment Instructions

Plan: [Plan Name]
Amount: ₦[Amount]

📱 Transfer to:
Name: Igboneme Promise
Bank: OPay
Account: 8144821073

📝 Reference: [Reference ID]

After payment, reply with:
CONFIRM [Reference ID]

Your subscription will be activated immediately after verification.
```

**Payment Confirmed:**
```
✅ Payment Confirmed!

Thank you for your subscription.

Plan: [Plan Name]
Duration: [Duration]
Valid until: [Date]

Your account is now fully active. Enjoy!
```

## 🔐 Security Features

- **Phone Number Validation**: Format checking
- **Unique Reference IDs**: Transaction tracking
- **One-Time Verification**: Payment confirmed once
- **Status Tracking**: Monitor all transactions
- **Admin Authentication**: Protected admin endpoints
- **Database Indexes**: Fast lookups

## 📊 Financial Breakdown

### Monthly Revenue Projections

Assuming 100 users with different plans:

| Plan | Users | Unit Price | Revenue |
|------|-------|-----------|---------|
| 1 Month | 30 | ₦1,500 | ₦45,000 |
| 2 Months | 25 | ₦3,000 | ₦75,000 |
| 6 Months | 25 | ₦8,000 | ₦200,000 |
| 1 Year | 20 | ₦16,000 | ₦320,000 |
| **Total** | **100** | **-** | **₦640,000** |

## 🚀 Getting Started

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Server
```bash
npm start
```

### Step 3: Open Dashboard
```bash
open payment-dashboard.html
```

### Step 4: Test Payment Flow
1. Click "Start Trial"
2. Enter your phone number
3. Select a plan
4. Click "Buy Selected Plan"
5. Check your WhatsApp
6. Enter reference ID
7. Click "Confirm Payment"

## 📝 Configuration

All payment details are embedded in `paymentService.js`:

```javascript
this.paymentAccount = {
  accountNumber: '8144821073',
  bankName: 'OPay',
  accountName: 'Igboneme Promise',
  paymentMethod: 'TRANSFER',
  currency: 'NGN'
};

this.plans = {
  trial: { ... },
  monthly_1: { ... },
  monthly_2: { ... },
  monthly_6: { ... },
  yearly_1: { ... }
};
```

To modify:
1. Edit `src/services/paymentService.js`
2. Update `paymentAccount` object
3. Modify `plans` object
4. Restart server

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Trial not starting | Check phone number format |
| Payment not received | Verify reference ID is correct |
| Subscription not active | Confirm payment with reference ID |
| WhatsApp not receiving | Check Twilio credentials |
| Dashboard not loading | Ensure server is running |

## 💡 Best Practices

1. **Phone Numbers**
   - Always use +234 format for Nigeria
   - Remove country code 0 if present
   - Validate before processing

2. **Payment Workflow**
   - Verify all transfers manually
   - Confirm before activating
   - Keep audit trail

3. **Customer Service**
   - Send reminders before expiry
   - Provide clear instructions
   - Quick support response

4. **Security**
   - Never share account details
   - Verify reference IDs
   - Monitor for fraud
   - Keep records updated

## 📞 Support & Maintenance

### Monitoring
- Check payment stats daily
- Monitor failed payments
- Track subscription status
- Review revenue breakdown

### Maintenance
- Backup database regularly
- Archive old transactions
- Update payment methods
- Review pricing periodically

### Updates
- Modify plans in `paymentService.js`
- Update WhatsApp messages
- Adjust pricing as needed
- Add new payment methods

## 📈 Analytics

Access analytics via:
```bash
GET /api/payment/stats
Authorization: Bearer YOUR_ADMIN_PASSWORD
```

Track:
- Total active users
- Revenue per plan
- Subscription growth
- Trial to paid conversion

## ✅ Implementation Checklist

- [ ] Server running (`npm start`)
- [ ] Database initialized
- [ ] Payment endpoints working
- [ ] Dashboard loads
- [ ] Trial starts successfully
- [ ] Payment flow tested
- [ ] Confirmation working
- [ ] WhatsApp messages sent
- [ ] Status checks working
- [ ] Admin stats accessible

---

**Last Updated**: November 2024  
**Version**: 1.0.0  
**Status**: Production Ready ✅
