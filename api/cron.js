import { runChecks } from '../lib/runner.js';
import { config } from '../lib/config.js';

// Import the toggle state (shared between endpoints)
let currentSchedule = '0 * * * *'; // Default to hourly (production)
let isTestMode = false;

export default async function handler(req, res) {
  console.log('🕐 [CRON] Cron endpoint called');
  console.log('🕐 [CRON] Request method:', req.method);
  console.log('🕐 [CRON] Request query:', req.query);
  console.log('🕐 [CRON] Request headers:', req.headers);
  
  try {
    const { secret, schedule } = req.query || {};
    console.log(`🕐 [CRON] Secret provided: ${secret ? 'YES' : 'NO'}`);
    console.log(`🕐 [CRON] Expected secret: ${config.cronSecret ? 'SET' : 'MISSING'}`);
    
    if (secret !== config.cronSecret) {
      console.log('❌ [CRON] Unauthorized request - secret mismatch');
      return res.status(401).json({ error: 'unauthorized' });
    }

    console.log('✅ [CRON] Secret validated successfully');

    // Update schedule if provided (from toggle endpoint)
    if (schedule) {
      currentSchedule = schedule;
      isTestMode = schedule.includes('*/30 * * * * *');
      console.log(`📅 [CRON] Schedule updated: ${schedule} (${isTestMode ? 'TEST' : 'PRODUCTION'} mode)`);
    }

    console.log(`🕐 [CRON] Running cron job (${isTestMode ? 'TEST' : 'PRODUCTION'} mode - ${currentSchedule})`);
    console.log(`🕐 [CRON] Environment check:`);
    console.log(`🕐 [CRON] - NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`🕐 [CRON] - VERCEL: ${process.env.VERCEL || 'undefined'}`);
    console.log(`🕐 [CRON] - VERCEL_URL: ${process.env.VERCEL_URL || 'undefined'}`);
    
    const result = await runChecks();
    
    console.log(`✅ [CRON] Cron job completed successfully`);
    console.log(`✅ [CRON] Result:`, result);
    console.log(`✅ [CRON] Alerts generated: ${result.alerts?.length || 0}`);
    
    // Get EST timestamp
    const estTime = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
    
    return res.status(200).json({ 
      ok: true, 
      alerts: result.alerts?.length || 0,
      mode: isTestMode ? 'TEST' : 'PRODUCTION',
      schedule: currentSchedule,
      timestamp: estTime,
      timezone: "America/New_York"
    });
  } catch (err) {
    console.error('❌ [CRON] Cron error:', err);
    console.error('❌ [CRON] Error stack:', err.stack);
    // Get EST timestamp for error response
    const estTime = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
    
    return res.status(500).json({ 
      ok: false, 
      error: 'internal',
      message: err.message,
      timestamp: estTime,
      timezone: "America/New_York"
    });
  }
}

// Export the state for the toggle endpoint to use
export { currentSchedule, isTestMode };
