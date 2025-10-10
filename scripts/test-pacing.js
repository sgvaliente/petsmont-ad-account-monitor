#!/usr/bin/env node

/**
 * Test script for Enhanced Pacing Rules
 * 
 * This script tests the enhanced pacing detection functionality
 * with various scenarios to demonstrate the different alert types.
 */

import { runChecks } from '../lib/runner.js';
import { 
  getBusinessDayProgress, 
  checkHourlySpendLimit,
  calculateSpendingVelocity,
  checkSlowPacing,
  RULES_CONFIG
} from '../lib/rules-config.js';

async function testEnhancedPacing() {
  try {
    console.log('🧪 Testing Enhanced Pacing Rules...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Show current status
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
    
    if (result.error) {
      console.log('❌ Error occurred:', result.error);
      return;
    }
    
    const { alerts, summary } = result;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ENHANCED PACING TEST RESULTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log(`💰 Today's Spend: $${summary.totalSpend.toFixed(2)}`);
    console.log(`📊 Spend % of Budget: ${summary.spendPercent.toFixed(1)}%`);
    console.log(`💵 Daily Budget: $${summary.dailyBudget.toFixed(2)}`);
    console.log(`📈 Ad Sets: ${summary.adSetsCount}`);
    console.log('');
    
    // Test individual pacing functions
    console.log('🔍 PACING ANALYSIS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 1. Hourly spend limit check
    const hourlyCheck = checkHourlySpendLimit(summary.spendPercent, dayProgress.currentHour);
    console.log(`📊 Hourly Spend Limit Check:`);
    console.log(`   Current Hour: ${dayProgress.currentHour}:00 EST`);
    console.log(`   Limit for this hour: ${hourlyCheck.limit.toFixed(1)}%`);
    console.log(`   Actual spend: ${hourlyCheck.actual.toFixed(1)}%`);
    console.log(`   Exceeded: ${hourlyCheck.isExceeded ? '❌ YES' : '✅ No'}`);
    console.log('');
    
    // 2. Spending velocity check
    const velocityCheck = calculateSpendingVelocity(summary.totalSpend, dayProgress.hoursElapsed, summary.dailyBudget);
    console.log(`🚀 Spending Velocity Analysis:`);
    console.log(`   Current velocity: $${velocityCheck.velocity.toFixed(2)}/hour`);
    console.log(`   Expected velocity: $${velocityCheck.expectedVelocity.toFixed(2)}/hour`);
    console.log(`   Velocity ratio: ${velocityCheck.ratio.toFixed(2)}x`);
    console.log(`   Threshold: ${RULES_CONFIG.PACING.VELOCITY_THRESHOLD}x`);
    console.log(`   Too high: ${velocityCheck.ratio > RULES_CONFIG.PACING.VELOCITY_THRESHOLD ? '❌ YES' : '✅ No'}`);
    console.log('');
    
    // 3. Slow pacing check
    const slowCheck = checkSlowPacing(summary.spendPercent, dayProgress.progressPercent);
    console.log(`🐌 Slow Pacing Check:`);
    console.log(`   Day progress: ${dayProgress.progressPercent}%`);
    console.log(`   Spend progress: ${slowCheck.actualSpend.toFixed(1)}%`);
    console.log(`   Expected minimum: ${RULES_CONFIG.PACING.SLOW_PACING.SLOW_THRESHOLD_PERCENT * 100}%`);
    console.log(`   Too slow: ${slowCheck.isSlow ? '❌ YES' : '✅ No'}`);
    console.log('');
    
    // 4. Show all alerts
    console.log(`🚨 Total Alerts Generated: ${alerts.length}`);
    
    if (alerts.length > 0) {
      console.log('');
      console.log('📱 ALERTS BREAKDOWN:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Group alerts by type
      const pacingAlerts = alerts.filter(a => a.key.includes('pacing') || a.key.includes('burst'));
      const cpaAlerts = alerts.filter(a => a.key.includes('cpa'));
      const tokenAlerts = alerts.filter(a => a.key.includes('token'));
      const summaryAlerts = alerts.filter(a => a.isSummary);
      
      if (pacingAlerts.length > 0) {
        console.log('⚡ PACING ALERTS:');
        pacingAlerts.forEach((alert, index) => {
          console.log(`   ${index + 1}. ${alert.title}`);
          console.log(`      Severity: ${alert.severity.toUpperCase()}`);
          console.log(`      Details: ${alert.detail}`);
          console.log('');
        });
      }
      
      if (cpaAlerts.length > 0) {
        console.log('💰 CPA ALERTS:');
        cpaAlerts.forEach((alert, index) => {
          console.log(`   ${index + 1}. ${alert.title}`);
          console.log(`      Severity: ${alert.severity.toUpperCase()}`);
          console.log(`      Details: ${alert.detail}`);
          console.log('');
        });
      }
      
      if (tokenAlerts.length > 0) {
        console.log('🔑 TOKEN ALERTS:');
        tokenAlerts.forEach((alert, index) => {
          console.log(`   ${index + 1}. ${alert.title}`);
          console.log(`      Severity: ${alert.severity.toUpperCase()}`);
          console.log(`      Details: ${alert.detail}`);
          console.log('');
        });
      }
      
      if (summaryAlerts.length > 0) {
        console.log('📊 SUMMARY REPORTS:');
        summaryAlerts.forEach((alert, index) => {
          console.log(`   ${index + 1}. ${alert.title}`);
          console.log(`      Type: ${alert.severity.toUpperCase()}`);
          console.log(`      Content: ${alert.detail.substring(0, 100)}...`);
          console.log('');
        });
      }
    } else {
      console.log('✅ No alerts - all pacing checks passed!');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 Enhanced pacing test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testEnhancedPacing();
