# Petsmont Ad Account Monitor

A Vercel serverless function that monitors Meta Ads for irregularities and sends alerts to Telegram.

## 🎯 Features

- **Hourly Monitoring**: Runs every hour via Vercel Cron (EST timezone)
- **Smart Pacing Analysis**: Alerts if spending too fast relative to time of day
- **CPA Monitoring**: Tracks cost per acquisition against $80 target
- **Token Management**: Warns before Meta access tokens expire
- **Telegram Integration**: Sends formatted alerts to your channel
- **Business Hours**: Monitors 8am-11pm EST (configurable)

## 📁 Project Structure

```
petsmont-ad-account-monitor/
├── api/
│   └── cron.js                 # Vercel serverless endpoint
├── lib/
│   ├── config.js               # Environment configuration
│   ├── metaClient.js           # Meta Marketing API client
│   ├── notifier.js             # Telegram notification sender
│   ├── rules.js                # Monitoring rules engine
│   ├── rules-config.js         # Centralized rules configuration
│   └── runner.js               # Main monitoring orchestrator
├── scripts/
│   ├── test-monitoring.js      # Test the monitoring system
│   └── manage-token.js         # Token management utility
├── vercel.json                 # Vercel cron configuration
├── package.json                # Dependencies and scripts
├── env.example                 # Environment variables template
└── README.md                   # This file
```

## 🚀 Quick Start

### 1. Environment Setup

Copy the environment template:
```bash
cp env.example .env
```

Fill in your values in `.env`:
```bash
# Meta / FB
META_ACCESS_TOKEN=your_long_lived_token_here
AD_ACCOUNT_ID=act_37333345

# Telegram
TELEGRAM_BOT_TOKEN=8360025580:AAGEDtuyxQ06g7Dc8JWh282sS74j77FQ5lQ
TELEGRAM_CHAT_ID=-4977913418

# Cron security
CRON_SECRET=your_secure_random_string
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Test Locally

```bash
npm test
```

### 4. Deploy to Vercel

1. Push to GitHub and import to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy to production
4. Monitor the Functions tab for cron execution

## 🔧 Available Scripts

```bash
npm test                    # Test the monitoring system
npm run test:summary        # Test summary report functionality
npm run test:pacing         # Test enhanced pacing rules
npm run token:check TOKEN   # Check token status
npm run token:exchange TOKEN APP_SECRET  # Exchange for long-lived token
npm run dev                 # Run Vercel dev server
```

## 📊 Monitoring Rules

The system monitors for these conditions:

### 1. **Enhanced Pacing Irregularity** ⚡
- **Basic Pacing**: Spending >50% of budget before 25% of business day
- **Hourly Limits**: Exceeding hourly spend thresholds (15% by 9am, 25% by 10am, etc.)
- **Velocity Check**: Spending >2x normal rate per hour
- **Slow Pacing**: Spending <20% of budget by 50% of day
- **Burst Detection**: Rapid spending in short time windows
- **Business Hours**: 8am-11pm EST

### 2. **CPA Above Target** 💰
- **Trigger**: CPA exceeds $80 target (1.5x = $120)
- **Calculation**: Total spend ÷ Total purchases
- **Severity**: Warning

### 3. **Token Expiration** 🚨
- **Trigger**: Token expires within 7 days
- **Action**: Reminds to update token
- **Severity**: Critical

### 4. **Daily Summary Reports** 📊
- **Schedule**: 12:00 PM and 5:00 PM EST daily
- **Content**: Total spend, cost per purchase, top ad sets, pacing info
- **Format**: Rich Telegram message with performance metrics
- **Severity**: Info

## ⚙️ Configuration

All monitoring rules are centralized in `lib/rules-config.js`:

```javascript
export const RULES_CONFIG = {
  TIMEZONE: {
    DAY_START_HOUR: 8,    // 8:00 AM EST
    DAY_END_HOUR: 23,     // 11:00 PM EST
  },
  PACING: {
    SPEND_THRESHOLD_PERCENT: 50,  // 50% of budget
    TIME_THRESHOLD_PERCENT: 25,   // 25% of business day
    VELOCITY_THRESHOLD: 2.0,      // 2x normal spending velocity
    HOURLY_SPEND_LIMITS: {        // Hourly spend limits
      9: 0.15, 10: 0.25, 11: 0.35, 12: 0.45,
      13: 0.55, 14: 0.65, 15: 0.75, 16: 0.85, 17: 0.95
    },
    SLOW_PACING: {
      SLOW_THRESHOLD_PERCENT: 0.2,  // 20% of budget
      SLOW_TIME_THRESHOLD_PERCENT: 0.5  // 50% of day elapsed
    }
  },
  CPA: {
    TARGET_CPA: 80,  // $80 target
    ALERT_MULTIPLIER: 1.5,  // Alert at $120
  },
  SUMMARY: {
    REPORT_HOURS: [12, 17],  // 12pm and 5pm EST
    INCLUDE_SPEND: true,
    INCLUDE_CPA: true,
    INCLUDE_PACING: true,
    INCLUDE_TOP_ADSETS: 3,  // Top 3 ad sets
  }
};
```

## 🔑 Token Management

### Get a Long-Lived Token

1. **Get short-lived token** from [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. **Exchange for long-lived**:
   ```bash
   npm run token:exchange SHORT_TOKEN YOUR_APP_SECRET
   ```
3. **Check token status**:
   ```bash
   npm run token:check YOUR_TOKEN
   ```

### Token Requirements

- **Permissions**: `ads_read`, `ads_management`, `business_management`
- **Type**: Long-lived user access token (60 days)
- **Scope**: Must access ad account `act_37333345`

## 📱 Telegram Setup

1. **Bot Created**: @petsmontadaccountbot
2. **Group**: Petsmont Ad Account Monitor
3. **Chat ID**: `-4977913418`
4. **Status**: ✅ Configured and tested

## 🚨 Alert Examples

### Enhanced Pacing Alerts
```
⚡ Pacing Too Fast (Basic)
Spent 65.2% of budget ($652.00) by 12:00 EST (25% of business day). 
Expected to spend no more than 50% before 25% of day.

🚨 Hourly Spend Limit Exceeded
Spent 35.2% of budget by 10:00 EST, exceeding the 25.0% limit for this hour. 
Current spend: $352.00.

🚀 Spending Velocity Too High
Current spending velocity is 2.8x normal rate. 
Spending $45.20/hour vs expected $16.10/hour.

🐌 Pacing Too Slow
Only spent 15.2% of budget by 50% of business day. 
Expected to spend at least 20% by now. Current spend: $152.00.

💥 Spending Burst Detected
Rapid spending detected: 30.5% of budget spent in early hours (15% of day). 
This may indicate a spending burst that could exhaust budget prematurely.
```

### CPA Alert
```
💰 CPA Above Target
Current CPA: $194.38 (Target: $80). 14 purchases, $2721.35 spend.
```

### Token Alert
```
🚨 Token Expiring Soon
Meta access token expires in 3 days. Update token to avoid monitoring interruption.
```

### Daily Summary Report
```
📊 Midday Summary Report
⏰ 12:00 EST

💰 Total Spend: $1,250.50
🎯 Cost Per Purchase: $95.42
🛒 Total Purchases: 13
👁️ Impressions: 45,230
🖱️ Clicks: 1,890
📊 Overall CTR: 4.18%

⏱️ Business Day Progress: 25%
🕐 Hours Elapsed: 4
⏳ Hours Remaining: 11

🏆 Top 3 Ad Sets:
1. WINNERS
   💵 $450.20 | 🎯 $75.03 CPA | 📊 3.45% CTR
2. GP | 064 | Static | 05.27.25
   💵 $320.15 | 🎯 $89.50 CPA | 📊 4.12% CTR
3. GP | 074 | Video | 05.30.25
   💵 $280.10 | 🎯 $95.20 CPA | 📊 3.89% CTR

📈 Status: ✅ CPA on target
```

## 🔄 Cron Schedule

- **Frequency**: Every hour (`0 * * * *`)
- **Timezone**: UTC (converted to EST in code)
- **Endpoint**: `/api/cron?secret=YOUR_SECRET`
- **Environment**: Production only

## 🛠️ Development

### Local Testing
```bash
npm test                    # Full monitoring test
npm run dev                 # Vercel dev server
curl "localhost:3000/api/cron?secret=YOUR_SECRET"  # Manual trigger
```

### Adding New Rules

1. **Add rule function** in `lib/rules.js`:
   ```javascript
   export function ruleCustomCheck(data) {
     // Your logic here
     return alerts;
   }
   ```

2. **Import and use** in `lib/runner.js`:
   ```javascript
   import { ruleCustomCheck } from './rules.js';
   // Add to alerts array
   ```

3. **Update configuration** in `lib/rules-config.js` if needed

## 🔒 Security

- **API Protection**: Secret-based authentication
- **Token Security**: Long-lived tokens, rotation reminders
- **Environment**: Never commit secrets to version control
- **Monitoring**: Vercel function logs for debugging

## 🐛 Troubleshooting

### Common Issues

1. **Token Expired**: Use `npm run token:exchange` to get new token
2. **No Alerts**: Check business hours (8am-11pm EST)
3. **API Errors**: Verify token permissions include `ads_read`
4. **Telegram Issues**: Confirm bot is in group and has send permissions

### Debug Steps

1. **Test locally**: `npm test`
2. **Check logs**: Vercel Functions tab
3. **Verify tokens**: `npm run token:check`
4. **Manual trigger**: `curl` the endpoint

## 📈 Current Status

- **Ad Account**: act_37333345
- **Daily Budget**: ~$1000 (estimated)
- **Current CPA**: $194.38 (⚠️ Above $80 target)
- **Token**: Valid until 12/9/2025
- **Monitoring**: Active and sending alerts