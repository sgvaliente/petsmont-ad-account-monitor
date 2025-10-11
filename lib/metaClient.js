import bizSdk from 'facebook-nodejs-business-sdk';
import { config } from './config.js';
import { fetch } from 'undici';

const { AdAccount, FacebookAdsApi } = bizSdk;
FacebookAdsApi.init(config.metaAccessToken);

export async function fetchAdSetInsights({ since, until }) {
  console.log(`📊 [META] Fetching ad set insights from ${since} to ${until}`);
  console.log(`📊 [META] Ad Account ID: ${config.adAccountId}`);
  console.log(`📊 [META] Access Token: ${config.metaAccessToken ? 'SET' : 'MISSING'}`);
  
  try {
    const account = new AdAccount(config.adAccountId);

    // Customize fields as needed - including actions for CPA calculation
    const fields = ['adset_id','adset_name','spend','impressions','clicks','ctr','cpc','actions'];
    const params = {
      time_range: { since, until },
      level: 'adset',
      time_increment: 1
    };

    console.log(`📊 [META] Request params:`, params);
    console.log(`📊 [META] Request fields:`, fields);

    const insights = await account.getInsights(fields, params);
    console.log(`📊 [META] Raw insights received:`, insights.length, 'records');
    if (insights.length > 0) {
      console.log(`📊 [META] Sample insight:`, insights[0]);
    }
    
    const processedInsights = insights.map(i => ({
      adsetId: i.adset_id,
      adsetName: i.adset_name,
      spend: Number(i.spend || 0),
      impressions: Number(i.impressions || 0),
      clicks: Number(i.clicks || 0),
      ctr: Number(i.ctr || 0),
      cpc: Number(i.cpc || 0),
      actions: i.actions || []
    }));
    
    console.log(`📊 [META] Processed insights:`, processedInsights.length, 'records');
    console.log(`📊 [META] Total spend: $${processedInsights.reduce((sum, r) => sum + r.spend, 0).toFixed(2)}`);
    
    return processedInsights;
  } catch (error) {
    console.error('❌ [META] Error fetching ad set insights:', error.message);
    console.error('❌ [META] Error details:', error);
    throw error;
  }
}

/**
 * Fetch today's ad set insights (EST timezone)
 */
export async function fetchTodaysInsights() {
  const now = new Date();
  
  // Get current EST date
  const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  
  // Format as YYYY-MM-DD in EST (not UTC)
  const year = estTime.getFullYear();
  const month = String(estTime.getMonth() + 1).padStart(2, '0');
  const day = String(estTime.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  
  console.log(`📊 [META] Fetching today's insights for EST date: ${todayStr}`);
  console.log(`📊 [META] Current EST time: ${estTime.toLocaleString()}`);
  
  return await fetchAdSetInsights({ 
    since: todayStr, 
    until: todayStr 
  });
}

/**
 * Fetch today's account-level spend (EST timezone)
 * This gives us the true total spend for the account
 */
export async function fetchTodaysAccountSpend() {
  const now = new Date();
  
  // Get current EST date
  const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  
  // Format as YYYY-MM-DD in EST (not UTC)
  const year = estTime.getFullYear();
  const month = String(estTime.getMonth() + 1).padStart(2, '0');
  const day = String(estTime.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  
  console.log(`📊 [META] Fetching account-level spend for EST date: ${todayStr}`);
  
  try {
    const account = new AdAccount(config.adAccountId);
    const insights = await account.getInsights(['spend'], {
      time_range: { since: todayStr, until: todayStr },
      level: 'account'
    });
    
    const totalSpend = insights.length > 0 ? Number(insights[0].spend || 0) : 0;
    console.log(`📊 [META] Account-level spend: $${totalSpend.toFixed(2)}`);
    
    return totalSpend;
  } catch (error) {
    console.error('❌ [META] Error fetching account spend:', error.message);
    throw error;
  }
}

/**
 * Get token information including expiration
 */
export async function getTokenInfo() {
  try {
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${config.metaAccessToken}&access_token=${config.metaAccessToken}`;
    const response = await fetch(debugUrl);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Token debug failed: ${data.error.message}`);
    }
    
    return {
      is_valid: data.data.is_valid,
      expires_at: data.data.expires_at,
      app_id: data.data.app_id,
      user_id: data.data.user_id,
      scopes: data.data.scopes
    };
  } catch (error) {
    console.error('Error getting token info:', error.message);
    return null;
  }
}

/**
 * Get ad account daily budget (approximate)
 * Note: This is a simplified approach. You might need to adjust based on your account structure
 */
export async function getDailyBudget() {
  try {
    console.log(`📊 [META] Fetching daily budget for account: ${config.adAccountId}`);
    const account = new AdAccount(config.adAccountId);
    
    // Get today's date for filtering
    const now = new Date();
    const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const year = estTime.getFullYear();
    const month = String(estTime.getMonth() + 1).padStart(2, '0');
    const day = String(estTime.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    // Get campaign budgets
    const campaigns = await account.getCampaigns(['daily_budget', 'lifetime_budget', 'status', 'name']);
    
    console.log(`📊 [META] Found ${campaigns.length} campaigns`);
    
    // Get campaigns that had spend today
    console.log(`📊 [META] Getting campaigns with spend today...`);
    const campaignInsights = await account.getInsights(['campaign_id', 'spend'], {
      time_range: { since: todayStr, until: todayStr },
      level: 'campaign'
    });
    
    const campaignsWithSpendToday = new Set();
    for (const insight of campaignInsights) {
      if (Number(insight.spend || 0) > 0) {
        campaignsWithSpendToday.add(insight.campaign_id);
      }
    }
    
    console.log(`📊 [META] Campaigns with spend today: ${campaignsWithSpendToday.size}`);
    
    let totalDailyBudget = 0;
    let includedCampaigns = 0;
    
    for (const campaign of campaigns) {
      const hasSpendToday = campaignsWithSpendToday.has(campaign.id);
      const isActive = campaign.status === 'ACTIVE';
      
      // Include if: active today OR had spend today
      if (isActive || hasSpendToday) {
        includedCampaigns++;
        console.log(`📊 [META] Campaign: ${campaign.name} (${campaign.status}) - ${hasSpendToday ? 'HAD SPEND TODAY' : 'ACTIVE'}`);
        
        if (campaign.daily_budget) {
          const budget = Number(campaign.daily_budget) / 100; // Convert from cents to dollars
          totalDailyBudget += budget;
          console.log(`📊 [META] Daily budget: $${budget}`);
        } else if (campaign.lifetime_budget) {
          // If lifetime budget, estimate daily (this is rough)
          const budget = Number(campaign.lifetime_budget) / 100 / 30; // Convert from cents and assume 30-day campaign
          totalDailyBudget += budget;
          console.log(`📊 [META] Lifetime budget (estimated daily): $${budget}`);
        }
      }
    }
    
    console.log(`📊 [META] Total daily budget: $${totalDailyBudget.toFixed(2)} (from ${includedCampaigns} campaigns with spend today or active)`);
    
    // If no budget found, return a reasonable default
    if (totalDailyBudget === 0) {
      console.log(`📊 [META] No budget found, using default: $200`);
      return 200; // Default $200 daily budget
    }
    
    return totalDailyBudget;
  } catch (error) {
    console.error('❌ [META] Error getting daily budget:', error.message);
    console.error('❌ [META] Error details:', error);
    // Return a default budget if we can't fetch it
    return 200; // Default $200 daily budget
  }
}
