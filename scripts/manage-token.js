#!/usr/bin/env node

/**
 * Token Management Utility for Petsmont Ad Account Monitor
 * 
 * This script helps manage Meta access tokens:
 * - Check token status
 * - Exchange short-lived for long-lived tokens
 * - Update .env file with new tokens
 * 
 * Usage:
 *   node scripts/manage-token.js check
 *   node scripts/manage-token.js exchange SHORT_LIVED_TOKEN APP_SECRET
 */

import { fetch } from 'undici';
import { writeFileSync } from 'fs';

const SHORT_LIVED_TOKEN = process.argv[3];
const APP_SECRET = process.argv[4];

async function checkTokenStatus(token) {
  try {
    console.log('🔍 Checking token status...');
    
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`;
    const response = await fetch(debugUrl);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Token debug failed: ${data.error.message}`);
    }
    
    const tokenInfo = data.data;
    const expiresAt = tokenInfo.expires_at;
    
    console.log('✅ Token Status:');
    console.log(`   Valid: ${tokenInfo.is_valid ? 'Yes' : 'No'}`);
    console.log(`   App ID: ${tokenInfo.app_id}`);
    console.log(`   User ID: ${tokenInfo.user_id}`);
    console.log(`   Scopes: ${tokenInfo.scopes.join(', ')}`);
    
    if (expiresAt === 0) {
      console.log(`   Expires: Never (long-lived)`);
    } else {
      const expiryDate = new Date(expiresAt * 1000);
      const daysUntilExpiry = Math.ceil((expiresAt - (Date.now() / 1000)) / (24 * 60 * 60));
      console.log(`   Expires: ${expiryDate.toLocaleDateString()} (${daysUntilExpiry} days)`);
    }
    
    return tokenInfo;
    
  } catch (error) {
    console.error('❌ Error checking token:', error.message);
    return null;
  }
}

async function exchangeToken(shortLivedToken, appSecret) {
  try {
    console.log('🔄 Exchanging short-lived token for long-lived token...');
    
    // Get app ID from token first
    const tokenInfo = await checkTokenStatus(shortLivedToken);
    if (!tokenInfo) return null;
    
    const appId = tokenInfo.app_id;
    
    // Exchange for long-lived token
    const exchangeUrl = `https://graph.facebook.com/v16.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
    
    const response = await fetch(exchangeUrl);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Exchange failed: ${data.error.message}`);
    }
    
    const longLivedToken = data.access_token;
    console.log('✅ Token exchange successful!');
    console.log(`🔑 Long-lived token: ${longLivedToken.substring(0, 20)}...`);
    console.log(`⏰ Expires in: ${data.expires_in ? `${Math.floor(data.expires_in / 86400)} days` : 'Never'}`);
    
    // Verify the new token
    await checkTokenStatus(longLivedToken);
    
    return longLivedToken;
    
  } catch (error) {
    console.error('❌ Error exchanging token:', error.message);
    return null;
  }
}

async function updateEnvFile(token) {
  try {
    console.log('\n📝 Updating .env file...');
    
    const envContent = `# Meta / FB
META_ACCESS_TOKEN=${token}
AD_ACCOUNT_ID=act_37333345

# Telegram
TELEGRAM_BOT_TOKEN=8360025580:AAGEDtuyxQ06g7Dc8JWh282sS74j77FQ5lQ
TELEGRAM_CHAT_ID=-4977913418         # Petsmont Ad Account Monitor group

# Cron security
CRON_SECRET=super-long-random-string-petsmont-2024

# Optional rule thresholds (tweak as needed)
SPEND_ALERT_THRESHOLD=250            # USD for period
CTR_DROP_PCT=40                      # % drop vs prior period to alert

# Time window config (UTC)
LOOKBACK_DAYS=1                      # analyze last N days (or use today)
`;

    writeFileSync('.env', envContent);
    console.log('✅ .env file updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating .env file:', error.message);
  }
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'check':
    if (!SHORT_LIVED_TOKEN) {
      console.log('Usage: node scripts/manage-token.js check TOKEN');
      process.exit(1);
    }
    checkTokenStatus(SHORT_LIVED_TOKEN);
    break;
    
  case 'exchange':
    if (!SHORT_LIVED_TOKEN || !APP_SECRET) {
      console.log('Usage: node scripts/manage-token.js exchange SHORT_LIVED_TOKEN APP_SECRET');
      process.exit(1);
    }
    const longLivedToken = await exchangeToken(SHORT_LIVED_TOKEN, APP_SECRET);
    if (longLivedToken) {
      await updateEnvFile(longLivedToken);
    }
    break;
    
  default:
    console.log('Petsmont Token Management Utility');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/manage-token.js check TOKEN');
    console.log('  node scripts/manage-token.js exchange SHORT_LIVED_TOKEN APP_SECRET');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/manage-token.js check EAAB...');
    console.log('  node scripts/manage-token.js exchange EAAB... your_app_secret');
    break;
}
