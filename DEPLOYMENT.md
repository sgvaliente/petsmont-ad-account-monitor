# Deployment Guide

This guide walks you through deploying the Petsmont Ad Account Monitor to Vercel.

## 🚀 Prerequisites

- [Vercel account](https://vercel.com)
- [GitHub account](https://github.com)
- Meta access token with `ads_read` permission
- Telegram bot token and chat ID

## 📋 Step-by-Step Deployment

### 1. Prepare Your Repository

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Petsmont Ad Account Monitor"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/petsmont-ad-account-monitor.git
   git push -u origin main
   ```

### 2. Deploy to Vercel

1. **Import Project**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Select the repository

2. **Configure Project**:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (default)
   - **Build Command**: Leave empty (no build step)
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

### 3. Set Environment Variables

In Vercel Project Settings → Environment Variables, add:

```bash
# Meta / FB
META_ACCESS_TOKEN=your_long_lived_token_here
AD_ACCOUNT_ID=act_37333345

# Telegram
TELEGRAM_BOT_TOKEN=8360025580:AAGEDtuyxQ06g7Dc8JWh282sS74j77FQ5lQ
TELEGRAM_CHAT_ID=-4977913418

# Cron security
CRON_SECRET=your_secure_random_string_here

# Optional (defaults provided)
SPEND_ALERT_THRESHOLD=250
CTR_DROP_PCT=40
LOOKBACK_DAYS=1
```

### 4. Update Cron Configuration

1. **Edit `vercel.json`**:
   ```json
   {
     "crons": [
       { 
         "path": "/api/cron?secret=YOUR_ACTUAL_SECRET_HERE", 
         "schedule": "0 * * * *" 
       }
     ]
   }
   ```

2. **Replace `YOUR_ACTUAL_SECRET_HERE`** with the same value you set for `CRON_SECRET`

### 5. Deploy

1. **Deploy to Production**:
   - Click "Deploy" in Vercel
   - Wait for deployment to complete
   - Note your deployment URL (e.g., `https://your-app.vercel.app`)

### 6. Verify Deployment

1. **Check Cron Job**:
   - Go to Vercel Dashboard → Your Project → Functions
   - Look for the Cron tab
   - Verify your cron job is scheduled

2. **Test Endpoint**:
   ```bash
   curl "https://your-app.vercel.app/api/cron?secret=YOUR_SECRET"
   ```

3. **Monitor Logs**:
   - Go to Vercel Dashboard → Your Project → Functions
   - Click on the cron function to see logs
   - Wait for the next hourly run

## 🔧 Post-Deployment Configuration

### Update Cron Secret

If you need to change the cron secret:

1. **Update Environment Variable** in Vercel
2. **Update `vercel.json`** with new secret
3. **Redeploy** the project

### Monitor Token Expiration

The system will alert you 7 days before your Meta token expires. To update:

1. **Get new token** using the token management script
2. **Update `META_ACCESS_TOKEN`** in Vercel environment variables
3. **Redeploy** (environment variables are updated automatically)

## 🚨 Troubleshooting

### Common Issues

1. **Cron Not Running**:
   - Check Vercel plan limits (free plan has restrictions)
   - Verify `vercel.json` syntax
   - Ensure secret matches in both places

2. **Function Timeout**:
   - Check Vercel function logs
   - Optimize API calls if needed
   - Consider upgrading plan for longer timeouts

3. **Environment Variables Not Working**:
   - Ensure variables are set for "Production" environment
   - Redeploy after adding variables
   - Check variable names match exactly

4. **API Errors**:
   - Verify Meta token permissions
   - Check token expiration
   - Review function logs for specific errors

### Debug Commands

```bash
# Test locally
npm test

# Check token status
npm run token:check YOUR_TOKEN

# Manual endpoint test
curl "https://your-app.vercel.app/api/cron?secret=YOUR_SECRET"
```

## 📊 Monitoring Your Deployment

### Vercel Dashboard

- **Functions Tab**: View cron execution logs
- **Analytics Tab**: Monitor function performance
- **Settings Tab**: Manage environment variables

### Telegram Alerts

The system will send alerts to your Telegram group for:
- Pacing irregularities
- CPA above target
- Token expiration warnings
- System errors

### Logs

Check Vercel function logs for:
- API call results
- Alert generation
- Error messages
- Performance metrics

## 🔄 Maintenance

### Regular Tasks

1. **Token Rotation** (every 60 days):
   ```bash
   npm run token:exchange NEW_SHORT_TOKEN APP_SECRET
   ```

2. **Monitor Alerts**: Check Telegram group regularly

3. **Review Performance**: Check Vercel analytics monthly

### Updates

To update the monitoring system:

1. **Make changes** to your local code
2. **Test locally**: `npm test`
3. **Push to GitHub**: `git push`
4. **Vercel auto-deploys** from GitHub

## 📈 Scaling

### Upgrade Vercel Plan

If you need more frequent cron jobs or longer timeouts:

1. **Pro Plan**: $20/month
   - Unlimited cron jobs
   - Longer function timeouts
   - Better performance

2. **Enterprise Plan**: Custom pricing
   - Advanced features
   - Priority support

### External Schedulers

For more frequent monitoring:

1. **Keep Vercel endpoint** deployed
2. **Use external scheduler** (cron-job.org, GitHub Actions)
3. **Call your endpoint** with the secret parameter

Example GitHub Actions:
```yaml
name: Monitor Ads
on:
  schedule:
    - cron: "*/30 * * * *"  # Every 30 minutes
jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - run: curl -sS "https://your-app.vercel.app/api/cron?secret=${{ secrets.CRON_SECRET }}"
```

## ✅ Deployment Checklist

- [ ] Repository pushed to GitHub
- [ ] Vercel project created and imported
- [ ] Environment variables set in Vercel
- [ ] `vercel.json` updated with correct secret
- [ ] Project deployed to production
- [ ] Cron job visible in Vercel Functions tab
- [ ] Endpoint test successful
- [ ] First cron run completed
- [ ] Telegram alerts working
- [ ] Monitoring logs accessible

Your Petsmont Ad Account Monitor is now live and monitoring your campaigns! 🎉
