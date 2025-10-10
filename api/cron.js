import { runChecks } from '../lib/runner.js';
import { config } from '../lib/config.js';

// Import the toggle state (shared between endpoints)
let currentSchedule = '0 * * * *'; // Default to hourly (production)
let isTestMode = false;

export default async function handler(req, res) {
  try {
    const { secret, schedule } = req.query || {};
    if (secret !== config.cronSecret) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    // Update schedule if provided (from toggle endpoint)
    if (schedule) {
      currentSchedule = schedule;
      isTestMode = schedule.includes('*/30 * * * * *');
      console.log(`📅 Cron schedule updated: ${schedule} (${isTestMode ? 'TEST' : 'PRODUCTION'} mode)`);
    }

    console.log(`🕐 Running cron job (${isTestMode ? 'TEST' : 'PRODUCTION'} mode - ${currentSchedule})`);
    const result = await runChecks();
    
    console.log(`✅ Cron job completed. Alerts: ${result.alerts?.length || 0}`);
    return res.status(200).json({ 
      ok: true, 
      alerts: result.alerts?.length || 0,
      mode: isTestMode ? 'TEST' : 'PRODUCTION',
      schedule: currentSchedule
    });
  } catch (err) {
    console.error('❌ Cron error:', err);
    return res.status(500).json({ ok: false, error: 'internal' });
  }
}

// Export the state for the toggle endpoint to use
export { currentSchedule, isTestMode };
