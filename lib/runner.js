import { fetchTodaysInsights, getTokenInfo, getDailyBudget, fetchAdSetInsights, fetchTodaysAccountSpend, fetchTodaysAccountCPA, hasActiveCampaigns } from './metaClient.js';
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
  console.log('🔍 [RUNNER] Starting Petsmont Ad Account monitoring...');
  console.log('🔍 [RUNNER] Environment check:');
  console.log(`🔍 [RUNNER] - META_ACCESS_TOKEN: ${process.env.META_ACCESS_TOKEN ? 'SET' : 'MISSING'}`);
  console.log(`🔍 [RUNNER] - TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? 'SET' : 'MISSING'}`);
  console.log(`🔍 [RUNNER] - TELEGRAM_CHAT_ID: ${process.env.TELEGRAM_CHAT_ID || 'MISSING'}`);
  console.log(`🔍 [RUNNER] - AD_ACCOUNT_ID: ${process.env.AD_ACCOUNT_ID || 'MISSING'}`);
  
  try {
    // Get current business day progress
    const dayProgress = getBusinessDayProgress();
    console.log(`📅 [RUNNER] Business day progress: ${dayProgress.progressPercent}% (${dayProgress.currentHour}:00 EST)`);
    console.log(`📅 [RUNNER] Full day progress object:`, dayProgress);
    
    // Run all checks in parallel
    console.log('🔍 [RUNNER] Fetching data in parallel...');
    const [tokenInfo, todaysInsights, dailyBudget, accountSpend, accountCPA, campaignsActive] = await Promise.all([
      getTokenInfo(),
      fetchTodaysInsights(),
      getDailyBudget(),
      fetchTodaysAccountSpend(),
      fetchTodaysAccountCPA(),
      hasActiveCampaigns()
    ]);
    
    console.log('🔍 [RUNNER] Data fetched successfully:');
    console.log(`🔍 [RUNNER] - Token info:`, tokenInfo);
    console.log(`🔍 [RUNNER] - Today's insights: ${todaysInsights.length} ad sets`);
    console.log(`🔍 [RUNNER] - Daily budget: $${dailyBudget}`);
    console.log(`🔍 [RUNNER] - Account spend: $${accountSpend}`);
    console.log(`🔍 [RUNNER] - Account CPA: $${accountCPA}`);
    console.log(`🔍 [RUNNER] - Campaigns active: ${campaignsActive ? 'YES' : 'NO'}`);
    
    // Use account-level spend instead of summing ad set spend
    const totalSpend = accountSpend;
    const spendPercent = dailyBudget > 0 ? (totalSpend / dailyBudget) * 100 : 0;
    
    console.log(`💵 [RUNNER] Today's spend: $${totalSpend.toFixed(2)} (${spendPercent.toFixed(1)}% of budget)`);
    console.log(`💵 [RUNNER] Detailed spend breakdown:`, todaysInsights.map(r => ({
      adset: r.adsetName,
      spend: r.spend,
      ctr: r.ctr,
      cpc: r.cpc
    })));
    
    // Check if it's time for a summary report
    const summaryCheck = shouldSendSummaryReport();
    console.log(`📊 [RUNNER] Summary check:`, summaryCheck);
    
    // Run all monitoring rules
    console.log('🔍 [RUNNER] Running monitoring rules...');
    const tokenAlerts = ruleTokenExpiration(tokenInfo);
    const pacingAlerts = rulePacingIrregularity(todaysInsights, dailyBudget);
    const burstAlerts = ruleSpendingBurst(todaysInsights, dailyBudget);
    const cpaAlerts = ruleCPAAboveTarget(accountCPA);
    
    console.log(`🔍 [RUNNER] Rule results:`);
    console.log(`🔍 [RUNNER] - Token alerts: ${tokenAlerts.length}`);
    console.log(`🔍 [RUNNER] - Pacing alerts: ${pacingAlerts.length}`);
    console.log(`🔍 [RUNNER] - Burst alerts: ${burstAlerts.length}`);
    console.log(`🔍 [RUNNER] - CPA alerts: ${cpaAlerts.length}`);
    
    const alerts = [
      ...tokenAlerts,
      ...pacingAlerts,
      ...burstAlerts,
      ...cpaAlerts
    ];
    
    // Add summary report if it's time
    if (summaryCheck.shouldSend) {
      console.log(`📊 [RUNNER] Generating ${summaryCheck.reportType} summary report...`);
      const summaryAlerts = ruleDailySummary(todaysInsights, dailyBudget, summaryCheck.reportType, accountSpend, accountCPA);
      console.log(`📊 [RUNNER] Summary alerts generated: ${summaryAlerts.length}`);
      alerts.push(...summaryAlerts);
    }
    
    console.log(`🚨 [RUNNER] Generated ${alerts.length} total alerts`);
    console.log(`🚨 [RUNNER] Alert details:`, alerts.map(a => ({ key: a.key, title: a.title, severity: a.severity })));
    
    // Check if there are any currently active campaigns
    console.log(`🔍 [RUNNER] Active campaigns check: ${campaignsActive ? 'YES' : 'NO'} (based on campaign status)`);
    
    // Send alerts if any AND there are active campaigns
    if (alerts.length > 0 && campaignsActive) {
      console.log('📱 [RUNNER] Sending alerts to Telegram...');
      
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
      
      await sendAlerts(alertsWithContext);
      console.log('📱 [RUNNER] Alerts sent to Telegram successfully');
    } else if (alerts.length > 0 && !campaignsActive) {
      console.log('⏸️ [RUNNER] Alerts generated but no active campaigns - skipping Telegram messages');
    } else {
      console.log('✅ [RUNNER] No alerts - all checks passed');
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
