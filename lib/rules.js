import { config } from './config.js';
import { 
  RULES_CONFIG, 
  getBusinessDayProgress, 
  isPacingIrregular, 
  isCPAAboveTarget, 
  isTokenExpiringSoon,
  shouldSendSummaryReport,
  checkHourlySpendLimit,
  calculateSpendingVelocity,
  detectSpendingBurst,
  checkSlowPacing
} from './rules-config.js';

/**
 * Check if Meta access token is expiring soon
 */
export function ruleTokenExpiration(tokenInfo) {
  const alerts = [];
  
  if (tokenInfo && isTokenExpiringSoon(tokenInfo.expires_at)) {
    const daysUntilExpiry = Math.ceil((tokenInfo.expires_at - (Date.now() / 1000)) / (24 * 60 * 60));
    
    alerts.push({
      key: 'token_expiring',
      title: '🚨 Token Expiring Soon',
      detail: `Meta access token expires in ${daysUntilExpiry} days. Update token to avoid monitoring interruption.`,
      severity: RULES_CONFIG.SEVERITY.CRITICAL
    });
  }
  
  return alerts;
}

/**
 * Enhanced pacing irregularity detection with multiple checks
 */
export function rulePacingIrregularity(records, dailyBudget) {
  const alerts = [];
  
  if (!records.length || !dailyBudget) return alerts;
  
  // Calculate total spend for today
  const totalSpend = records.reduce((sum, r) => sum + r.spend, 0);
  const spendPercent = (totalSpend / dailyBudget) * 100;
  
  // Get current business day progress
  const dayProgress = getBusinessDayProgress();
  
  if (!dayProgress.isBusinessHours) {
    return alerts; // Don't check pacing outside business hours
  }
  
  // Don't trigger "spending too fast" or "hourly limit exceeded" alerts if spend is less than 35% of budget
  const MIN_SPEND_FOR_PACING_ALERTS = 35;
  
  // 1. Basic pacing check
  if (spendPercent >= MIN_SPEND_FOR_PACING_ALERTS && isPacingIrregular(spendPercent, dayProgress.progressPercent)) {
    alerts.push({
      key: 'pacing_irregular_basic',
      title: '⚡ Spending Too Fast',
      detail: `${spendPercent.toFixed(0)}% of budget spent by ${dayProgress.progressPercent}% of day. Expected max ${RULES_CONFIG.PACING.SPEND_THRESHOLD_PERCENT}% by ${RULES_CONFIG.PACING.TIME_THRESHOLD_PERCENT}% of day.`,
      severity: RULES_CONFIG.SEVERITY.WARNING
    });
  }
  
  // 2. Hourly spend limit check
  const hourlyCheck = checkHourlySpendLimit(spendPercent, dayProgress.currentHour);
  if (spendPercent >= MIN_SPEND_FOR_PACING_ALERTS && hourlyCheck.isExceeded) {
    alerts.push({
      key: 'pacing_hourly_limit',
      title: '🚨 Hourly Limit Exceeded',
      detail: `${hourlyCheck.actual.toFixed(0)}% spent by ${dayProgress.currentHour}:00 EST (limit: ${hourlyCheck.limit.toFixed(0)}%)`,
      severity: RULES_CONFIG.SEVERITY.WARNING
    });
  }
  
  // 3. Spending velocity check
  const velocityCheck = calculateSpendingVelocity(totalSpend, dayProgress.hoursElapsed, dailyBudget);
  if (spendPercent >= MIN_SPEND_FOR_PACING_ALERTS && velocityCheck.ratio > RULES_CONFIG.PACING.VELOCITY_THRESHOLD) {
    alerts.push({
      key: 'pacing_velocity_high',
      title: '🚀 Spending Too Fast',
      detail: `Spending ${velocityCheck.ratio.toFixed(1)}x normal rate ($${velocityCheck.velocity.toFixed(0)}/hour)`,
      severity: RULES_CONFIG.SEVERITY.WARNING
    });
  }
  
  // 4. Slow pacing check
  const slowCheck = checkSlowPacing(spendPercent, dayProgress.progressPercent);
  if (slowCheck.isSlow) {
    alerts.push({
      key: 'pacing_slow',
      title: '🐌 Spending Too Slow',
      detail: `Only ${slowCheck.actualSpend.toFixed(0)}% spent by ${dayProgress.progressPercent}% of day`,
      severity: RULES_CONFIG.SEVERITY.WARNING
    });
  }
  
  return alerts;
}

/**
 * Detect spending bursts (rapid spending in short time windows)
 */
export function ruleSpendingBurst(records, dailyBudget) {
  const alerts = [];
  
  if (!records.length || !dailyBudget) return alerts;
  
  // For now, we'll simulate burst detection with current data
  // In a real implementation, you'd track spend over time windows
  const totalSpend = records.reduce((sum, r) => sum + r.spend, 0);
  const spendPercent = (totalSpend / dailyBudget) * 100;
  
  // Simulate burst detection - if spend is very high early in the day
  // Threshold: alert if spending >40% when day is still early (<20%)
  const dayProgress = getBusinessDayProgress();
  if (dayProgress.isBusinessHours && dayProgress.progressPercent < 20 && spendPercent > 40) {
    alerts.push({
      key: 'spending_burst_detected',
      title: '💥 Spending Burst Detected',
      detail: `Rapid spending detected: ${spendPercent.toFixed(1)}% of budget spent in early hours (${dayProgress.progressPercent}% of day). This may indicate a spending burst that could exhaust budget prematurely.`,
      severity: RULES_CONFIG.SEVERITY.WARNING
    });
  }
  
  return alerts;
}

/**
 * Check if CPA is above target threshold
 * Only sends alert if spend is >= 50% of budget
 */
export function ruleCPAAboveTarget(accountCPA, spendPercent = 0) {
  const alerts = [];
  
  if (!accountCPA || accountCPA <= 0) return alerts;
  
  // Only send CPA alert if spend is at least 50% of budget
  if (spendPercent < 50) {
    return alerts;
  }
  
  if (isCPAAboveTarget(accountCPA)) {
    alerts.push({
      key: 'cpa_above_target',
      title: '💰 CPA Above Target',
      detail: `$${accountCPA.toFixed(0)} CPA (target: $${RULES_CONFIG.CPA.TARGET_CPA}) - ${((accountCPA / RULES_CONFIG.CPA.TARGET_CPA - 1) * 100).toFixed(0)}% above target`,
      severity: RULES_CONFIG.SEVERITY.WARNING
    });
  }
  
  return alerts;
}

/**
 * Legacy rules (kept for backward compatibility)
 */
export function ruleHighSpend(records) {
  return records
    .filter(r => r.spend >= config.spendAlertThreshold)
    .map(r => ({
      key: `high_spend:${r.adsetId}`,
      title: `High spend: ${r.adsetName}`,
      detail: `Spend ${r.spend.toFixed(2)} ≥ threshold ${config.spendAlertThreshold}`,
      severity: 'warn'
    }));
}

export function ruleCtrDrop(current, priorMap) {
  const alerts = [];
  for (const c of current) {
    const prev = priorMap.get(c.adsetId);
    if (!prev || !prev.ctr) continue;
    const drop = prev.ctr > 0 ? ((prev.ctr - c.ctr) / prev.ctr) * 100 : 0;
    if (drop >= config.ctrDropPct) {
      alerts.push({
        key: `ctr_drop:${c.adsetId}`,
        title: `CTR ↓ ${drop.toFixed(0)}%: ${c.adsetName}`,
        detail: `Prev CTR ${prev.ctr.toFixed(2)}% → Now ${c.ctr.toFixed(2)}%`,
        severity: 'info'
      });
    }
  }
  return alerts;
}

/**
 * Generate daily summary report
 */
export function ruleDailySummary(records, dailyBudget, reportType, accountSpend, accountCPA) {
  const alerts = [];
  
  if (!records.length) return alerts;
  
  const { INCLUDE_SPEND, INCLUDE_CPA, INCLUDE_PACING, INCLUDE_TOP_ADSETS } = RULES_CONFIG.SUMMARY;
  
  // Calculate totals
  const totalSpend = accountSpend; // Use account-level spend
  const totalImpressions = records.reduce((sum, r) => sum + r.impressions, 0);
  const totalClicks = records.reduce((sum, r) => sum + r.clicks, 0);
  
  // Use account-level CPA
  const currentCPA = accountCPA || 0;
  const overallCTR = totalClicks > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  
  // Get business day progress
  const dayProgress = getBusinessDayProgress();
  const spendPercent = dailyBudget > 0 ? (totalSpend / dailyBudget) * 100 : 0;
  
  // Get top performing ad sets
  const topAdSets = records
    .filter(r => r.spend > 0)
    .sort((a, b) => b.spend - a.spend)
    .slice(0, INCLUDE_TOP_ADSETS);
  
  // Build simple, focused summary message
  let summaryText = `📊 *${reportType} Summary*\n`;
  summaryText += `⏰ ${dayProgress.currentHour}:00 EST\n\n`;
  
  // Essential metrics only
  summaryText += `💰 *Total Spend:* $${totalSpend.toFixed(2)}\n`;
  summaryText += `🎯 *Cost Per Purchase:* $${currentCPA.toFixed(2)}\n\n`;
  
  // Status notes
  summaryText += `📝 *Notes:*\n`;
  
  // CPA status
  if (currentCPA > 0 && currentCPA <= RULES_CONFIG.CPA.TARGET_CPA) {
    summaryText += `✅ CPA is on target ($80)\n`;
  } else if (currentCPA > RULES_CONFIG.CPA.TARGET_CPA) {
    summaryText += `⚠️ CPA is ${((currentCPA / RULES_CONFIG.CPA.TARGET_CPA - 1) * 100).toFixed(0)}% above target ($80)\n`;
  } else {
    summaryText += `📊 No purchases yet\n`;
  }
  
  // Pacing status
  if (dailyBudget > 0) {
    if (spendPercent > 80) {
      summaryText += `🚨 Budget nearly exhausted (${spendPercent.toFixed(0)}% spent)\n`;
    } else if (spendPercent > 50 && dayProgress.progressPercent < 50) {
      summaryText += `⚡ Spending ahead of schedule (${spendPercent.toFixed(0)}% spent by ${dayProgress.progressPercent}% of day)\n`;
    } else if (spendPercent < 20 && dayProgress.progressPercent > 50) {
      summaryText += `🐌 Spending behind schedule (${spendPercent.toFixed(0)}% spent by ${dayProgress.progressPercent}% of day)\n`;
    } else {
      summaryText += `✅ Spending on track\n`;
    }
  }
  
  alerts.push({
    key: `daily_summary_${reportType.toLowerCase()}`,
    title: `📊 ${reportType} Summary Report`,
    detail: summaryText,
    severity: RULES_CONFIG.SEVERITY.INFO,
    isSummary: true  // Special flag for summary reports
  });
  
  return alerts;
}
