#!/usr/bin/env node

/**
 * Local script to check current spend and CPA status
 * Usage: node scripts/check-status.js [vercel-url]
 */

import { config } from '../lib/config.js';
import { fetch } from 'undici';

const VERCEL_URL = process.argv[2];

if (!VERCEL_URL) {
  console.error('❌ Please provide your Vercel URL');
  console.log('Usage: node scripts/check-status.js https://your-app.vercel.app');
  process.exit(1);
}

async function checkStatus() {
  try {
    console.log('📊 Checking current status...');
    console.log(`📡 Hitting: ${VERCEL_URL}/api/status`);
    
    const url = `${VERCEL_URL}/api/status?secret=${config.cronSecret}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Status check failed');
    }
    
    const { status, summary } = result;
    
    console.log('\n🎯 CURRENT STATUS');
    console.log('================');
    console.log(`⏰ Time: ${status.businessDay.currentHour}:00 EST (${status.businessDay.progressPercent.toFixed(0)}% of business day)`);
    console.log(`💰 Spend: ${summary.spend}`);
    console.log(`🎯 CPA: ${summary.cpa}`);
    console.log(`🛒 Purchases: ${summary.purchases}`);
    console.log(`📅 Business Day: ${summary.businessDay}`);
    
    console.log('\n📊 DETAILED BREAKDOWN');
    console.log('=====================');
    console.log(`Total Spend: $${status.spend.total.toFixed(2)}`);
    console.log(`Daily Budget: $${status.spend.dailyBudget.toFixed(2)}`);
    console.log(`Spend %: ${status.spend.percentage.toFixed(1)}%`);
    console.log(`Remaining Budget: $${status.spend.remaining.toFixed(2)}`);
    console.log(`Current CPA: $${status.performance.cpa.toFixed(2)}`);
    console.log(`Target CPA: $${status.performance.targetCpa}`);
    console.log(`CPA Status: ${status.performance.cpaStatus}`);
    console.log(`Active Ad Sets: ${status.adSets.count}`);
    
    if (status.adSets.topSpenders.length > 0) {
      console.log('\n🏆 TOP SPENDERS');
      console.log('===============');
      status.adSets.topSpenders.forEach((adset, index) => {
        console.log(`${index + 1}. ${adset.name}`);
        console.log(`   Spend: $${adset.spend.toFixed(2)} | CTR: ${adset.ctr.toFixed(2)}% | CPC: $${adset.cpc.toFixed(2)}`);
      });
    }
    
    console.log('\n✅ Status check completed successfully!');
    
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
    process.exit(1);
  }
}

checkStatus();
