# ⚡ Quick Reference - 3 New Features

## 📊 Analytics (Real-time insights)

```bash
# Track interaction (auto-called)
POST /api/analytics/interaction
{ "phoneNumber": "+234...", "type": "purchase", "data": {...} }

# User engagement (0-100 score)
GET /api/analytics/user/:phoneNumber

# Real-time dashboard
GET /api/analytics/dashboard

# Retention rate (%)
GET /api/analytics/retention/30

# Conversation stats
GET /api/analytics/conversations
```

**Metrics Tracked**:
- Engagement Score (frequency + diversity + recency)
- Customer Lifetime Value (CLV)
- Retention Rate
- Conversation Quality
- Peak Activity Hours

**DB Table**: `user_interactions`

---

## 📈 Reports (Scheduled & Manual)

```bash
# Revenue analysis
GET /api/reports/revenue/2025-12-01/2025-12-31

# User growth
GET /api/reports/users/2025-12-01/2025-12-31

# Subscription metrics
GET /api/reports/subscriptions/2025-12-01/2025-12-31

# Engagement deep-dive
GET /api/reports/engagement/2025-12-01/2025-12-31

# All-in-one summary
GET /api/reports/summary/2025-12-01/2025-12-31

# List all reports
GET /api/reports/list

# Get specific report
GET /api/reports/revenue-report-2025-12-12.json
```

**Report Types**:
1. Revenue - Income, MRR, transaction trends
2. Users - Growth, cohorts, segments
3. Subscriptions - Plans, churn, conversion
4. Engagement - Interactions, patterns
5. Summary - Executive overview

**Storage**: `/reports/*.json` (auto-saved)

---

## 🌍 Multi-Language (12 languages)

```bash
# List languages
GET /api/i18n/languages

# Translate message
GET /api/i18n/translate/welcome/es

# Get menu
GET /api/i18n/menu

# Save user preference
POST /api/i18n/set-language
{ "phoneNumber": "+234...", "languageCode": "es" }

# Get user's language
GET /api/i18n/user-language/:phoneNumber
```

**Languages**:
- 🇬🇧 English (en)
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)
- 🇩🇪 German (de)
- 🇵🇹 Portuguese (pt)
- 🇮🇹 Italian (it)
- 🇯🇵 Japanese (ja)
- 🇨🇳 Chinese (zh)
- 🇸🇦 Arabic (ar)
- 🇳🇬 Yoruba (yo)
- 🇳🇬 Igbo (ig)
- 🇳🇬 Hausa (ha)

**DB Table**: `user_languages`

---

## 📁 New Files Created

```
src/services/
  ├── smsService.js (500 lines)
  ├── analyticsService.js (600 lines)
  ├── reportingService.js (700 lines)
  └── i18nService.js (800 lines)

Database Tables:
  ├── sms_logs
  ├── sms_bulk_logs
  ├── user_interactions
  └── user_languages

API Endpoints: 35+ new endpoints
```

---

## 🎯 Common Workflows

### Workflow 1: Send Trial Activation SMS
```bash
# 1. Start trial (already exists)
POST /api/payment/trial/start
{ "phoneNumber": "+234..." }

# 2. Send SMS notification
POST /api/sms/send
{
  "phoneNumber": "+234...",
  "message": "Your 1-day free trial activated!",
  "type": "trial_activation"
}

# 3. Record interaction
POST /api/analytics/interaction
{
  "phoneNumber": "+234...",
  "type": "trial_started",
  "data": { "plan": "trial" }
}
```

### Workflow 2: Generate Daily Report
```bash
# 1. Get yesterday's date
# dateFrom = 2025-12-11, dateTo = 2025-12-11

# 2. Generate executive summary
GET /api/reports/summary/2025-12-11/2025-12-11

# 3. File auto-saved to:
# /reports/executive-summary-2025-12-11.json

# 4. Retrieve when needed
GET /api/reports/executive-summary-2025-12-11.json
```

### Workflow 3: Multi-Language Support
```bash
# 1. Detect or prompt for language
GET /api/i18n/menu

# 2. Save user's choice
POST /api/i18n/set-language
{ "phoneNumber": "+234...", "languageCode": "es" }

# 3. Use translation in responses
GET /api/i18n/translate/welcome/es
# Response: "¡Bienvenido a nuestro Bot de WhatsApp! 👋..."

# 4. Format currency correctly
i18nService.formatCurrency(1500, "es")
# Returns: ₦1.500,00
```

---

## 🔐 Authentication

All endpoints except `/api/i18n/*` require:
```bash
-H "Authorization: Bearer YOUR_PASSWORD"
```

Where `YOUR_PASSWORD` is your `ADMIN_PASSWORD` from `.env`

---

## 📊 Sample Dashboard Data

```json
{
  "todayMetrics": {
    "newUsers": 15,
    "activeUsers": 120,
    "totalMessages": 450,
    "totalRevenue": 125000
  },
  "overallMetrics": {
    "totalUsers": 5000,
    "totalRevenue": 2500000,
    "subscriptionStatus": [
      { "status": "active", "count": 3500 },
      { "status": "expired", "count": 1500 }
    ]
  }
}
```

---

## 🚀 Setup Checklist

- [ ] 4 service files created
- [ ] Database tables initialized
- [ ] 35+ API endpoints added
- [ ] SMS credentials in .env
- [ ] Server restarted
- [ ] Endpoints tested
- [ ] Documentation read
- [ ] First interaction recorded
- [ ] First report generated
- [ ] Languages configured

---

## 💬 Translation Keys Available

| Key | Purpose | Supported |
|-----|---------|-----------|
| welcome | Welcome message | All 12 languages |
| menu | Main menu | All 12 languages |
| trial_activated | Trial start | All 12 languages |
| payment_initiated | Payment started | All 12 languages |
| payment_confirmed | Payment verified | All 12 languages |
| error_invalid_input | Invalid input | All 12 languages |
| error_service_unavailable | Service down | All 12 languages |
| help_products | Product help | All 12 languages |

---

## 📞 Support References

- Full documentation: `FOUR_NEW_FEATURES.md`
- SMS: Twilio API (SMS requires configuration)
- Analytics: All events auto-logged to database
- Reports: Saved to `/reports/` directory
- Languages: 12 languages with 8+ keys each

---

**Status**: ✅ All 4 Features Ready  
**Total Lines of Code**: 2,600+  
**New Endpoints**: 35+  
**Languages Supported**: 12  
**Database Tables**: 4  
**Last Updated**: December 12, 2025
