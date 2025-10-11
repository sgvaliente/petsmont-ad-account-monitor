/**
 * PETSMONT AD ACCOUNT MONITORING RULES
 * 
 * This file contains all the monitoring rules and thresholds for the ad account.
 * Update these values as needed for your monitoring requirements.
 */

export const RULES_CONFIG = {
  // Time Configuration (EST Timezone)
  TIMEZONE: {
    // Business hours in EST (8am to 11pm)
    DAY_START_HOUR: 8,    // 8:00 AM EST
    DAY_END_HOUR: 23,     // 11:00 PM EST
    TOTAL_BUSINESS_HOURS: 15  // 8am to 11pm = 15 hours
  },

  // Enhanced Pacing Rules
  PACING: {
    // Basic pacing thresholds
    SPEND_THRESHOLD_PERCENT: 50,  // 50% of budget
    TIME_THRESHOLD_PERCENT: 25,   // 25% of business day
    
    // Advanced pacing detection
    VELOCITY_THRESHOLD: 2.0,      // 2x normal spending velocity
    ACCELERATION_THRESHOLD: 1.5,   // 1.5x acceleration in spending rate
    
    // Time-based pacing checks
    HOURLY_SPEND_LIMITS: {
      9: 0.15,   // 15% by 9am
      10: 0.25,  // 25% by 10am
      11: 0.35,  // 35% by 11am
      12: 0.45,  // 45% by 12pm
      13: 0.55,  // 55% by 1pm
      14: 0.65,  // 65% by 2pm
      15: 0.75,  // 75% by 3pm
      16: 0.85,  // 85% by 4pm
      17: 0.95,  // 95% by 5pm
    },
    
    // Historical comparison
    HISTORICAL_COMPARISON: {
      ENABLED: true,
      LOOKBACK_DAYS: 7,           // Compare to last 7 days
      DEVIATION_THRESHOLD: 0.3,   // 30% deviation from historical average
    },
    
    // Burst detection
    BURST_DETECTION: {
      ENABLED: true,
      BURST_WINDOW_MINUTES: 30,   // 30-minute window
      BURST_THRESHOLD_PERCENT: 0.1, // 10% of daily budget in 30 min
    },
    
    // Slow pacing detection
    SLOW_PACING: {
      ENABLED: true,
      SLOW_THRESHOLD_PERCENT: 0.2, // 20% of budget
      SLOW_TIME_THRESHOLD_PERCENT: 0.5, // 50% of day elapsed
    }
  },

  // CPA Monitoring
  CPA: {
    TARGET_CPA: 80,  // $80 target cost per acquisition
    ALERT_MULTIPLIER: 1.5,  // Alert if CPA is 1.5x target ($120)
  },

  // Token Monitoring
  TOKEN: {
    // Check token expiration (in days before expiry to alert)
    EXPIRY_WARNING_DAYS: 7,  // Alert if token expires in 7 days
  },

  // Daily Summary Reports
  SUMMARY: {
    // Times to send daily summary reports (EST)
    REPORT_HOURS: [12, 17],  // 12pm and 5pm EST
    // Report types
    INCLUDE_SPEND: true,
    INCLUDE_CPA: true,
    INCLUDE_PACING: true,
    INCLUDE_TOP_ADSETS: 3,  // Number of top ad sets to include
  },

  // Alert Severity Levels
  SEVERITY: {
    CRITICAL: 'critical',  // Token expired, major pacing issues
    WARNING: 'warning',    // Pacing concerns, CPA issues
    INFO: 'info'          // General notifications
  }
};

/**
 * HELPER FUNCTIONS FOR RULE CALCULATIONS
 */

/**
 * Calculate current progress through business day (EST)
 * @returns {Object} {progressPercent, currentHour, isBusinessHours}
 */
export function getBusinessDayProgress() {
  // Get current EST time
  const now = new Date();
  const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  
  const currentHour = estTime.getHours();
  const { DAY_START_HOUR, DAY_END_HOUR, TOTAL_BUSINESS_HOURS } = RULES_CONFIG.TIMEZONE;
  
  // Check if we're in business hours
  const isBusinessHours = currentHour >= DAY_START_HOUR && currentHour <= DAY_END_HOUR;
  
  if (!isBusinessHours) {
    return {
      progressPercent: 0,
      currentHour,
      isBusinessHours: false,
      hoursElapsed: 0,
      hoursRemaining: TOTAL_BUSINESS_HOURS
    };
  }
  
  // Calculate progress through business day
  const hoursElapsed = currentHour - DAY_START_HOUR;
  const progressPercent = (hoursElapsed / TOTAL_BUSINESS_HOURS) * 100;
  const hoursRemaining = TOTAL_BUSINESS_HOURS - hoursElapsed;
  
  return {
    progressPercent: Math.round(progressPercent),
    currentHour,
    isBusinessHours: true,
    hoursElapsed,
    hoursRemaining
  };
}

/**
 * Check if pacing is irregular based on spend vs time (basic check)
 * @param {number} spendPercent - Percentage of budget spent
 * @param {number} timePercent - Percentage of business day elapsed
 * @returns {boolean} true if pacing is irregular
 */
export function isPacingIrregular(spendPercent, timePercent) {
  const { SPEND_THRESHOLD_PERCENT, TIME_THRESHOLD_PERCENT } = RULES_CONFIG.PACING;
  
  // Alert if spending more than threshold before time threshold
  return spendPercent >= SPEND_THRESHOLD_PERCENT && timePercent <= TIME_THRESHOLD_PERCENT;
}

/**
 * Check if spending exceeds hourly limits
 * @param {number} spendPercent - Percentage of budget spent
 * @param {number} currentHour - Current hour (EST)
 * @returns {Object} {isExceeded, limit, actual}
 */
export function checkHourlySpendLimit(spendPercent, currentHour) {
  const { HOURLY_SPEND_LIMITS } = RULES_CONFIG.PACING;
  
  // Find the appropriate limit for current hour
  let limit = 1.0; // Default to 100% for end of day
  for (const [hour, hourLimit] of Object.entries(HOURLY_SPEND_LIMITS)) {
    if (currentHour <= parseInt(hour)) {
      limit = hourLimit;
      break;
    }
  }
  
  return {
    isExceeded: spendPercent > (limit * 100),
    limit: limit * 100,
    actual: spendPercent
  };
}

/**
 * Calculate spending velocity (spend per hour)
 * @param {number} totalSpend - Total spend so far
 * @param {number} hoursElapsed - Hours elapsed in business day
 * @param {number} dailyBudget - Daily budget
 * @returns {Object} {velocity, expectedVelocity, ratio}
 */
export function calculateSpendingVelocity(totalSpend, hoursElapsed, dailyBudget) {
  if (hoursElapsed <= 0) {
    return { velocity: 0, expectedVelocity: 0, ratio: 0 };
  }
  
  const velocity = totalSpend / hoursElapsed;
  const expectedVelocity = dailyBudget / RULES_CONFIG.TIMEZONE.TOTAL_BUSINESS_HOURS;
  const ratio = expectedVelocity > 0 ? velocity / expectedVelocity : 0;
  
  return { velocity, expectedVelocity, ratio };
}

/**
 * Check for spending bursts (rapid spending in short time)
 * @param {Array} recentSpendData - Array of spend data points with timestamps
 * @param {number} dailyBudget - Daily budget
 * @returns {Object} {isBurst, burstAmount, windowMinutes}
 */
export function detectSpendingBurst(recentSpendData, dailyBudget) {
  const { BURST_DETECTION } = RULES_CONFIG.PACING;
  
  if (!BURST_DETECTION.ENABLED || !recentSpendData.length) {
    return { isBurst: false, burstAmount: 0, windowMinutes: 0 };
  }
  
  const now = new Date();
  const windowMs = BURST_DETECTION.BURST_WINDOW_MINUTES * 60 * 1000;
  const windowStart = new Date(now.getTime() - windowMs);
  
  // Calculate spend in the burst window
  const burstSpend = recentSpendData
    .filter(data => new Date(data.timestamp) >= windowStart)
    .reduce((sum, data) => sum + data.spend, 0);
  
  const burstPercent = (burstSpend / dailyBudget) * 100;
  const isBurst = burstPercent >= (BURST_DETECTION.BURST_THRESHOLD_PERCENT * 100);
  
  return {
    isBurst,
    burstAmount: burstSpend,
    burstPercent,
    windowMinutes: BURST_DETECTION.BURST_WINDOW_MINUTES
  };
}

/**
 * Check for slow pacing (under-spending)
 * @param {number} spendPercent - Percentage of budget spent
 * @param {number} timePercent - Percentage of business day elapsed
 * @returns {Object} {isSlow, expectedSpend, actualSpend}
 */
export function checkSlowPacing(spendPercent, timePercent) {
  const { SLOW_PACING } = RULES_CONFIG.PACING;
  
  if (!SLOW_PACING.ENABLED) {
    return { isSlow: false, expectedSpend: 0, actualSpend: 0 };
  }
  
  const isSlow = spendPercent <= SLOW_PACING.SLOW_THRESHOLD_PERCENT * 100 && 
                 timePercent >= SLOW_PACING.SLOW_TIME_THRESHOLD_PERCENT * 100;
  
  return {
    isSlow,
    expectedSpend: timePercent,
    actualSpend: spendPercent
  };
}

/**
 * Check if CPA is above target
 * @param {number} currentCPA - Current cost per acquisition
 * @returns {boolean} true if CPA is above alert threshold
 */
export function isCPAAboveTarget(currentCPA) {
  const { TARGET_CPA, ALERT_MULTIPLIER } = RULES_CONFIG.CPA;
  return currentCPA >= (TARGET_CPA * ALERT_MULTIPLIER);
}

/**
 * Check if token is expiring soon
 * @param {number} expiresAt - Token expiration timestamp
 * @returns {boolean} true if token expires soon
 */
export function isTokenExpiringSoon(expiresAt) {
  if (expiresAt === 0) return false; // Never expires
  
  const now = Date.now() / 1000; // Current time in seconds
  const daysUntilExpiry = (expiresAt - now) / (24 * 60 * 60);
  
  return daysUntilExpiry <= RULES_CONFIG.TOKEN.EXPIRY_WARNING_DAYS;
}

/**
 * Check if it's time for a daily summary report
 * @returns {Object} {shouldSend, reportType, currentHour}
 */
export function shouldSendSummaryReport() {
  const dayProgress = getBusinessDayProgress();
  const { REPORT_HOURS } = RULES_CONFIG.SUMMARY;
  
  // Check if current hour matches any report hour
  const shouldSend = REPORT_HOURS.includes(dayProgress.currentHour);
  
  let reportType = '';
  if (dayProgress.currentHour === 12) {
    reportType = 'Midday';
  } else if (dayProgress.currentHour === 17) {
    reportType = 'Evening';
  }
  
  return {
    shouldSend,
    reportType,
    currentHour: dayProgress.currentHour
  };
}
