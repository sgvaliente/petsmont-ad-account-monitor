#!/usr/bin/env node

/**
 * Test script for Petsmont Ad Account Monitor
 * 
 * This script tests the monitoring system locally before deployment.
 * Run with: node scripts/test-monitoring.js
 */

import { runChecks } from '../lib/runner.js';
import { getBusinessDayProgress } from '../lib/rules-config.js';

async function testMonitoring() {
  try {
    console.log('🧪 Testing Petsmont Ad Account Monitor...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Show current business day progress
    const dayProgress = getBusinessDayProgress();
    console.log('📅 Current Status:');
    console.log(`   Time: ${dayProgress.currentHour}:00 EST`);
    console.log(`   Business Day Progress: ${dayProgress.progressPercent}%`);
    console.log(`   Hours Elapsed: ${dayProgress.hoursElapsed}`);
    console.log(`   Hours Remaining: ${dayProgress.hoursRemaining}`);
    console.log(`   In Business Hours: ${dayProgress.isBusinessHours ? 'Yes' : 'No'}`);
    console.log('');
    
    // Run the monitoring checks
    const result = await runChecks();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 MONITORING RESULTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (result.error) {
      console.log('❌ Error occurred:', result.error);
      return;
    }
    
    const { alerts, summary } = result;
    
    console.log(`💰 Today's Spend: $${summary.totalSpend.toFixed(2)}`);
    console.log(`📊 Spend % of Budget: ${summary.spendPercent.toFixed(1)}%`);
    console.log(`💵 Daily Budget: $${summary.dailyBudget.toFixed(2)}`);
    console.log(`📈 Ad Sets: ${summary.adSetsCount}`);
    console.log(`🔑 Token Valid: ${summary.tokenValid ? 'Yes' : 'No'}`);
    
    if (summary.tokenExpiresAt > 0) {
      const expiryDate = new Date(summary.tokenExpiresAt * 1000);
      console.log(`⏰ Token Expires: ${expiryDate.toLocaleDateString()}`);
    } else {
      console.log(`⏰ Token Expires: Never (long-lived)`);
    }
    
    console.log('');
    console.log(`🚨 Alerts Generated: ${alerts.length}`);
    
    if (alerts.length > 0) {
      console.log('');
      console.log('📱 ALERTS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      alerts.forEach((alert, index) => {
        console.log(`${index + 1}. ${alert.title}`);
        console.log(`   Severity: ${alert.severity.toUpperCase()}`);
        console.log(`   Details: ${alert.detail}`);
        console.log('');
      });
    } else {
      console.log('✅ No alerts - all checks passed!');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 Monitoring test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testMonitoring();
