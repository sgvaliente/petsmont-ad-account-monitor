/**
 * Dynamic Cron Configuration System
 * Allows switching between test (30s) and production (1h) schedules
 */

import { config } from './config.js';

// Default schedules
export const CRON_SCHEDULES = {
  TEST: '*/30 * * * * *',      // Every 30 seconds (for testing)
  PRODUCTION: '0 * * * *'      // Every hour (production)
};

// Current schedule state (stored in environment variable)
export function getCurrentSchedule() {
  return process.env.CRON_SCHEDULE || CRON_SCHEDULES.TEST;
}

export function isTestMode() {
  return getCurrentSchedule() === CRON_SCHEDULES.TEST;
}

export function isProductionMode() {
  return getCurrentSchedule() === CRON_SCHEDULES.PRODUCTION;
}

/**
 * Generate the cron path with current schedule
 */
export function getCronPath() {
  const schedule = getCurrentSchedule();
  return `/api/cron?secret=${config.cronSecret}&schedule=${encodeURIComponent(schedule)}`;
}

/**
 * Get human-readable schedule description
 */
export function getScheduleDescription() {
  const schedule = getCurrentSchedule();
  if (schedule === CRON_SCHEDULES.TEST) {
    return 'Test mode: Every 30 seconds';
  } else if (schedule === CRON_SCHEDULES.PRODUCTION) {
    return 'Production mode: Every hour';
  }
  return `Custom: ${schedule}`;
}
