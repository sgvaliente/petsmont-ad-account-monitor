/**
 * Status Endpoint
 * Returns current day's spend and CPA information
 */

import { fetchTodaysInsights, getDailyBudget } from '../lib/metaClient.js';
import { config } from '../lib/config.js';
import { getBusinessDayProgress } from '../lib/rules-config.js';

export default async function handler(req, res) {
  try {
    // Security check
    const { secret } = req.query || {};
    if (secret !== config.cronSecret) {
      console.log('❌ Unauthorized status request');
      return res.status(401).json({ error: 'unauthorized' });
    }

    console.log('📊 Fetching current status...');

    // Fetch today's data
    const [todaysInsights, dailyBudget] = await Promise.all([
      fetchTodaysInsights(),
      getDailyBudget()
    ]);

    // Calculate metrics
    const totalSpend = todaysInsights.reduce((sum, r) => sum + r.spend, 0);
    const totalPurchases = todaysInsights.reduce((sum, r) => {
      const purchaseAction = r.actions?.find(a => a.action_type === 'purchase');
      return sum + (Number(purchaseAction?.value) || 0);
    }, 0);
    
    const currentCPA = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
    const spendPercent = dailyBudget > 0 ? (totalSpend / dailyBudget) * 100 : 0;
    
    // Get business day progress
    const dayProgress = getBusinessDayProgress();

    // Build status response
    const status = {
      timestamp: new Date().toISOString(),
      timezone: 'America/New_York',
      businessDay: {
        currentHour: dayProgress.currentHour,
        progressPercent: dayProgress.progressPercent,
        isBusinessHours: dayProgress.isBusinessHours,
        hoursElapsed: dayProgress.hoursElapsed,
        hoursRemaining: dayProgress.hoursRemaining
      },
      spend: {
        total: totalSpend,
        dailyBudget: dailyBudget,
        percentage: spendPercent,
        remaining: dailyBudget - totalSpend
      },
      performance: {
        purchases: totalPurchases,
        cpa: currentCPA,
        targetCpa: 80,
        cpaStatus: currentCPA > 0 ? (currentCPA <= 80 ? 'on_target' : 'above_target') : 'no_purchases'
      },
      adSets: {
        count: todaysInsights.length,
        topSpenders: todaysInsights
          .sort((a, b) => b.spend - a.spend)
          .slice(0, 3)
          .map(adset => ({
            name: adset.adsetName,
            spend: adset.spend,
            ctr: adset.ctr,
            cpc: adset.cpc
          }))
      }
    };

    console.log(`✅ Status fetched - Spend: $${totalSpend.toFixed(2)} (${spendPercent.toFixed(1)}%), CPA: $${currentCPA.toFixed(2)}, Purchases: ${totalPurchases}`);

    return res.status(200).json({
      success: true,
      status,
      summary: {
        spend: `$${totalSpend.toFixed(2)} (${spendPercent.toFixed(1)}% of budget)`,
        cpa: `$${currentCPA.toFixed(2)}`,
        purchases: totalPurchases,
        businessDay: `${dayProgress.progressPercent.toFixed(0)}% complete (${dayProgress.currentHour}:00 EST)`
      }
    });

  } catch (err) {
    console.error('❌ Status check error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'internal',
      message: err.message 
    });
  }
}
