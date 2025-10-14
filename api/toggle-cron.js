/**
 * Toggle Cron Frequency Endpoint
 * Allows switching between test (30s) and production (1h) schedules
 */

import { config } from '../lib/config.js';

// In-memory storage for current schedule (resets on each deployment)
let currentSchedule = '*/30 * * * *'; // Default to every 30 minutes (production)
let isTestMode = false;

export default async function handler(req, res) {
  try {
    // Security check
    const { secret } = req.query || {};
    if (secret !== config.cronSecret) {
      console.log('❌ Unauthorized toggle-cron request');
      return res.status(401).json({ error: 'unauthorized' });
    }

    // Toggle the schedule
    if (isTestMode) {
      // Switch to production (every 30 minutes)
      currentSchedule = '*/30 * * * *';
      isTestMode = false;
      console.log('🔄 Switched to PRODUCTION mode: Every 30 minutes');
    } else {
      // Switch to test (30 seconds)
      currentSchedule = '*/30 * * * * *';
      isTestMode = true;
      console.log('🔄 Switched to TEST mode: Every 30 seconds');
    }

    const mode = isTestMode ? 'TEST' : 'PRODUCTION';
    const schedule = isTestMode ? 'Every 30 seconds' : 'Every 30 minutes';
    
    console.log(`✅ Cron schedule updated to ${mode} mode (${schedule})`);
    console.log(`📅 Current schedule: ${currentSchedule}`);

    // Trigger the cron endpoint to update its schedule
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const cronUrl = `${baseUrl}/api/cron?secret=${config.cronSecret}&schedule=${encodeURIComponent(currentSchedule)}`;
    
    try {
      const response = await fetch(cronUrl);
      if (response.ok) {
        console.log('✅ Cron endpoint updated successfully');
      } else {
        console.log('⚠️ Cron endpoint update failed, but toggle completed');
      }
    } catch (error) {
      console.log('⚠️ Could not update cron endpoint:', error.message);
    }

    return res.status(200).json({
      success: true,
      mode,
      schedule: currentSchedule,
      description: schedule,
      message: `Cron switched to ${mode} mode: ${schedule}`,
      cronUrl: cronUrl
    });

  } catch (err) {
    console.error('❌ Toggle cron error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'internal',
      message: err.message 
    });
  }
}