#!/usr/bin/env node

/**
 * Local script to toggle cron frequency between test (30s) and production (1h)
 * Usage: node scripts/toggle-cron.js [vercel-url]
 */

import { config } from '../lib/config.js';
import { fetch } from 'undici';

const VERCEL_URL = process.argv[2];

if (!VERCEL_URL) {
  console.error('❌ Please provide your Vercel URL');
  console.log('Usage: node scripts/toggle-cron.js https://your-app.vercel.app');
  process.exit(1);
}

async function toggleCron() {
  try {
    console.log('🔄 Toggling cron frequency...');
    console.log(`📡 Hitting: ${VERCEL_URL}/api/toggle-cron`);
    
    const url = `${VERCEL_URL}/api/toggle-cron?secret=${config.cronSecret}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Toggle successful!');
    console.log(`📊 Mode: ${result.mode}`);
    console.log(`⏰ Schedule: ${result.description}`);
    console.log(`🔗 Cron URL: ${result.cronUrl}`);
    console.log(`💬 Message: ${result.message}`);
    
  } catch (error) {
    console.error('❌ Toggle failed:', error.message);
    process.exit(1);
  }
}

toggleCron();
