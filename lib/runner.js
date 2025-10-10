import { fetchTodaysInsights, getTokenInfo, getDailyBudget, fetchAdSetInsights } from './metaClient.js';
import { 
  ruleTokenExpiration, 
  rulePacingIrregularity, 
  ruleSpendingBurst,
  ruleCPAAboveTarget,
  ruleHighSpend, 
  ruleCtrDrop,
  ruleDailySummary
} from './rules.js';
import { sendAlerts } from './notifier.js';
import { config } from './config.js';
import { getBusinessDayProgress, shouldSendSummaryReport } from './rules-config.js';

/**
 * Main monitoring function - runs all checks for today's performance
 */
export async function runChecks() {
  console.log('🔍 Starting Petsmont Ad Account monitoring...');
  
  try {
    // Get current business day progress
    const dayProgress = getBusinessDayProgress();
    console.log(`📅 Business day progress: ${dayProgress.progressPercent}% (${dayProgress.currentHour}:00 EST)`);
    
    // Run all checks in parallel
    const [tokenInfo, todaysInsights, dailyBudget] = await Promise.all([
      getTokenInfo(),
      fetchTodaysInsights(),
      getDailyBudget()
    ]);
    
    console.log(`📊 Fetched ${todaysInsights.length} ad sets for today`);
    console.log(`💰 Daily budget: $${dailyBudget.toFixed(2)}`);
    
    // Calculate today's totals
    const totalSpend = todaysInsights.reduce((sum, r) => sum + r.spend, 0);
    const spendPercent = dailyBudget > 0 ? (totalSpend / dailyBudget) * 100 : 0;
    
    console.log(`💵 Today's spend: $${totalSpend.toFixed(2)} (${spendPercent.toFixed(1)}% of budget)`);
    
    // Check if it's time for a summary report
    const summaryCheck = shouldSendSummaryReport();
    
    // Run all monitoring rules
    const alerts = [
      ...ruleTokenExpiration(tokenInfo),
      ...rulePacingIrregularity(todaysInsights, dailyBudget),
      ...ruleSpendingBurst(todaysInsights, dailyBudget),
      ...ruleCPAAboveTarget(todaysInsights)
    ];
    
    // Add summary report if it's time
    if (summaryCheck.shouldSend) {
      console.log(`📊 Generating ${summaryCheck.reportType} summary report...`);
      const summaryAlerts = ruleDailySummary(todaysInsights, dailyBudget, summaryCheck.reportType);
      alerts.push(...summaryAlerts);
    }
    
    console.log(`🚨 Generated ${alerts.length} alerts`);
    
    // Send alerts if any
    if (alerts.length > 0) {
      await sendAlerts(alerts);
      console.log('📱 Alerts sent to Telegram');
    } else {
      console.log('✅ No alerts - all checks passed');
    }
    
    return {
      alerts,
      summary: {
        totalSpend,
        spendPercent,
        dailyBudget,
        adSetsCount: todaysInsights.length,
        businessDayProgress: dayProgress.progressPercent,
        tokenValid: tokenInfo?.is_valid || false,
        tokenExpiresAt: tokenInfo?.expires_at || 0
      }
    };
    
  } catch (error) {
    console.error('❌ Monitoring error:', error.message);
    
    // Send error alert to Telegram
    const errorAlert = [{
      key: 'monitoring_error',
      title: '🚨 Monitoring System Error',
      detail: `Failed to run monitoring checks: ${error.message}`,
      severity: 'critical'
    }];
    
    await sendAlerts(errorAlert);
    
    return {
      alerts: errorAlert,
      error: error.message
    };
  }
}

/**
 * Legacy function for backward compatibility
 */
export async function runLegacyChecks() {
  const now = new Date();
  const sinceCur = new Date(now);
  sinceCur.setUTCDate(sinceCur.getUTCDate() - config.lookbackDays);
  const untilCur = now;

  // Prior period of same length (for CTR drop)
  const sincePrev = new Date(sinceCur);
  sincePrev.setUTCDate(sincePrev.getUTCDate() - config.lookbackDays);
  const untilPrev = new Date(sinceCur);
  untilPrev.setUTCDate(untilPrev.getUTCDate() - 1);

  const [current, prior] = await Promise.all([
    fetchAdSetInsights({ since: ymd(sinceCur), until: ymd(untilCur) }),
    fetchAdSetInsights({ since: ymd(sincePrev), until: ymd(untilPrev) })
  ]);

  const priorMap = new Map(prior.map(p => [p.adsetId, p]));

  const alerts = [
    ...ruleHighSpend(current),
    ...ruleCtrDrop(current, priorMap)
  ];

  await sendAlerts(alerts);
  return alerts;
}

function ymd(d) {
  return d.toISOString().slice(0,10);
}
