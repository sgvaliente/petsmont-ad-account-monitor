import 'dotenv/config';
import { fetchTodaysInsights, getTokenInfo, getDailyBudget } from './lib/metaClient.js';
import bizSdk from 'facebook-nodejs-business-sdk';
import { config } from './lib/config.js';

const { AdAccount, FacebookAdsApi } = bizSdk;
FacebookAdsApi.init(config.metaAccessToken);
import { 
  ruleTokenExpiration, 
  rulePacingIrregularity, 
  ruleSpendingBurst,
  ruleCPAAboveTarget,
  ruleDailySummary
} from './lib/rules.js';
import { getBusinessDayProgress, shouldSendSummaryReport } from './lib/rules-config.js';

// Mock the sendAlerts function to log instead of sending to Telegram
const mockSendAlerts = async (alerts) => {
  console.log('\n📱 [MOCK NOTIFIER] Would send the following to Telegram:');
  console.log('=' .repeat(60));
  
  if (!alerts.length) {
    console.log('No alerts to send');
    return;
  }

  // Separate summary reports from regular alerts
  const summaryReports = alerts.filter(a => a.isSummary);
  const regularAlerts = alerts.filter(a => !a.isSummary);

  // Log summary reports
  for (const summary of summaryReports) {
    console.log('\n📊 SUMMARY REPORT:');
    console.log('-'.repeat(40));
    console.log(summary.detail);
    console.log('-'.repeat(40));
  }

  // Log regular alerts
  if (regularAlerts.length > 0) {
    console.log('\n🚨 WATCHDOG ALERTS:');
    console.log('-'.repeat(40));
    
    // Get current spend data for context
    const currentTime = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
    const spendAlert = regularAlerts.find(a => a.spendContext);
    const spendContext = spendAlert ? 
      `💰 Current Status:\n⏰ ${currentTime}\n💵 Spend: $${spendAlert.spendContext.totalSpend.toFixed(2)} (${spendAlert.spendContext.spendPercent.toFixed(1)}% of budget)\n📅 Business Day: ${spendAlert.spendContext.businessDayProgress.toFixed(0)}% complete\n` 
      : '';
    
    if (spendContext) {
      console.log(spendContext);
    }
    
    const lines = regularAlerts.map(a => {
      const severity = a.severity === 'critical' ? '🚨' : a.severity === 'warning' ? '⚠️' : 'ℹ️';
      return `${severity} ${a.title}\n   ${a.detail}`;
    });
    
    console.log(lines.join('\n\n'));
    console.log('-'.repeat(40));
  }
  
  console.log('=' .repeat(60));
  console.log(`📱 [MOCK NOTIFIER] Total alerts that would be sent: ${alerts.length}`);
};

console.log('🧪 [LOCAL TEST] Starting local monitoring test...');
console.log('🧪 [LOCAL TEST] This will run the full monitoring logic but log messages instead of sending to Telegram\n');

try {
  // Run the same logic as runChecks but with mock notifier
  console.log('🔍 [LOCAL TEST] Fetching data...');
  const dayProgress = getBusinessDayProgress();
  const [tokenInfo, todaysInsights, dailyBudget] = await Promise.all([
    getTokenInfo(),
    fetchTodaysInsights(),
    getDailyBudget()
  ]);

  const totalSpend = todaysInsights.reduce((sum, r) => sum + r.spend, 0);
  const spendPercent = dailyBudget > 0 ? (totalSpend / dailyBudget) * 100 : 0;

  // Get account-level spend for comparison
  console.log(`\n📊 [LOCAL TEST] Getting account-level spend for comparison...`);
  const account = new AdAccount(config.adAccountId);
  const now = new Date();
  const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const year = estTime.getFullYear();
  const month = String(estTime.getMonth() + 1).padStart(2, '0');
  const day = String(estTime.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  
  const accountInsights = await account.getInsights(['spend'], {
    time_range: { since: todayStr, until: todayStr },
    level: 'account'
  });
  
  const accountSpend = accountInsights.length > 0 ? Number(accountInsights[0].spend || 0) : 0;

  console.log(`📊 [LOCAL TEST] Data fetched:`);
  console.log(`   - Ad sets: ${todaysInsights.length}`);
  console.log(`   - Ad set total spend: $${totalSpend.toFixed(2)}`);
  console.log(`   - Account total spend: $${accountSpend.toFixed(2)}`);
  console.log(`   - Daily budget: $${dailyBudget.toFixed(2)}`);
  console.log(`   - Spend %: ${spendPercent.toFixed(1)}%`);
  console.log(`   - Business day: ${dayProgress.progressPercent.toFixed(0)}% complete`);
  console.log(`   - Date queried: ${todayStr}`);
  
  // Show detailed breakdown of ad sets
  console.log(`\n📊 [LOCAL TEST] Ad Set Breakdown:`);
  todaysInsights
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10) // Top 10 spenders
    .forEach((adset, index) => {
      console.log(`   ${index + 1}. ${adset.adsetName}: $${adset.spend.toFixed(2)}`);
    });
  
  if (todaysInsights.length > 10) {
    console.log(`   ... and ${todaysInsights.length - 10} more ad sets`);
  }

  // Run all monitoring rules
  console.log('\n🔍 [LOCAL TEST] Running monitoring rules...');
  const tokenAlerts = ruleTokenExpiration(tokenInfo);
  const pacingAlerts = rulePacingIrregularity(todaysInsights, dailyBudget);
  const burstAlerts = ruleSpendingBurst(todaysInsights, dailyBudget);
  const cpaAlerts = ruleCPAAboveTarget(todaysInsights);
  
  console.log(`   - Token alerts: ${tokenAlerts.length}`);
  console.log(`   - Pacing alerts: ${pacingAlerts.length}`);
  console.log(`   - Burst alerts: ${burstAlerts.length}`);
  console.log(`   - CPA alerts: ${cpaAlerts.length}`);
  
  const alerts = [
    ...tokenAlerts,
    ...pacingAlerts,
    ...burstAlerts,
    ...cpaAlerts
  ];

  // Add summary report if it's time
  const summaryCheck = shouldSendSummaryReport();
  if (summaryCheck.shouldSend) {
    console.log(`📊 [LOCAL TEST] Generating ${summaryCheck.reportType} summary report...`);
    const summaryAlerts = ruleDailySummary(todaysInsights, dailyBudget, summaryCheck.reportType);
    alerts.push(...summaryAlerts);
  }

  // Add spend context to alerts that need it
  const alertsWithContext = alerts.map(alert => {
    if (alert.key.includes('spend') || alert.key.includes('pacing') || alert.key.includes('cpa')) {
      return {
        ...alert,
        spendContext: {
          totalSpend,
          spendPercent,
          dailyBudget,
          currentHour: dayProgress.currentHour,
          businessDayProgress: dayProgress.progressPercent
        }
      };
    }
    return alert;
  });

  // Mock send alerts
  await mockSendAlerts(alertsWithContext);
  
  console.log('\n✅ [LOCAL TEST] Monitoring completed successfully!');
  console.log(`📊 [LOCAL TEST] Generated ${alerts.length} total alerts`);
  
} catch (error) {
  console.error('❌ [LOCAL TEST] Error:', error.message);
  console.error('❌ [LOCAL TEST] Stack:', error.stack);
}
