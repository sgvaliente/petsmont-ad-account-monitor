#!/usr/bin/env node

/**
 * Test script for Daily Summary Reports
 * 
 * This script tests the summary report functionality by simulating
 * different times of day to trigger summary reports.
 */

import { runChecks } from '../lib/runner.js';
import { shouldSendSummaryReport, getBusinessDayProgress } from '../lib/rules-config.js';

async function testSummaryReports() {
  try {
    console.log('🧪 Testing Daily Summary Reports...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Show current status
    const dayProgress = getBusinessDayProgress();
    const summaryCheck = shouldSendSummaryReport();
    
    console.log('📅 Current Status:');
    console.log(`   Time: ${dayProgress.currentHour}:00 EST`);
    console.log(`   Business Day Progress: ${dayProgress.progressPercent}%`);
    console.log(`   Should Send Summary: ${summaryCheck.shouldSend ? 'Yes' : 'No'}`);
    console.log(`   Report Type: ${summaryCheck.reportType || 'None'}`);
    console.log('');
    
    if (summaryCheck.shouldSend) {
      console.log('🎯 Current time matches summary report schedule!');
      console.log('Running full monitoring with summary report...');
      console.log('');
      
      const result = await runChecks();
      
      if (result.error) {
        console.log('❌ Error occurred:', result.error);
        return;
      }
      
      const { alerts, summary } = result;
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 SUMMARY REPORT RESULTS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      console.log(`💰 Today's Spend: $${summary.totalSpend.toFixed(2)}`);
      console.log(`📊 Spend % of Budget: ${summary.spendPercent.toFixed(1)}%`);
      console.log(`💵 Daily Budget: $${summary.dailyBudget.toFixed(2)}`);
      console.log(`📈 Ad Sets: ${summary.adSetsCount}`);
      
      console.log('');
      console.log(`📱 Total Messages Sent: ${alerts.length}`);
      
      // Show summary reports separately
      const summaryReports = alerts.filter(a => a.isSummary);
      const regularAlerts = alerts.filter(a => !a.isSummary);
      
      if (summaryReports.length > 0) {
        console.log('');
        console.log('📊 SUMMARY REPORTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        summaryReports.forEach((report, index) => {
          console.log(`${index + 1}. ${report.title}`);
          console.log(`   Type: ${report.severity.toUpperCase()}`);
          console.log(`   Content: ${report.detail.substring(0, 100)}...`);
          console.log('');
        });
      }
      
      if (regularAlerts.length > 0) {
        console.log('');
        console.log('🚨 REGULAR ALERTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        regularAlerts.forEach((alert, index) => {
          console.log(`${index + 1}. ${alert.title}`);
          console.log(`   Severity: ${alert.severity.toUpperCase()}`);
          console.log(`   Details: ${alert.detail}`);
          console.log('');
        });
      }
      
    } else {
      console.log('⏰ Current time does not match summary report schedule');
      console.log('Summary reports are sent at: 12:00 PM and 5:00 PM EST');
      console.log('');
      console.log('To test summary reports, you can:');
      console.log('1. Wait until 12:00 PM or 5:00 PM EST');
      console.log('2. Temporarily modify the REPORT_HOURS in rules-config.js');
      console.log('3. Run the monitoring system at those times');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 Summary report test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testSummaryReports();
