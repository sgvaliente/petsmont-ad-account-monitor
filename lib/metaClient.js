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
  const today = new Date();
  
  // Convert to Eastern Time (handles both EST and EDT automatically)
  const estTime = new Date(today.toLocaleString("en-US", {timeZone: "America/New_York"}));
  
  const todayStr = estTime.toISOString().slice(0, 10);
  
  return await fetchAdSetInsights({ 
    since: todayStr, 
    until: todayStr 
  });
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
    const account = new AdAccount(config.adAccountId);
    
    // Try to get campaign budgets to estimate daily budget
    // This is a simplified approach - you might need to adjust based on your setup
    const campaigns = await account.getCampaigns(['daily_budget', 'lifetime_budget', 'status']);
    
    let totalDailyBudget = 0;
    
    for (const campaign of campaigns) {
      if (campaign.status === 'ACTIVE') {
        if (campaign.daily_budget) {
          totalDailyBudget += Number(campaign.daily_budget);
        } else if (campaign.lifetime_budget) {
          // If lifetime budget, estimate daily (this is rough)
          totalDailyBudget += Number(campaign.lifetime_budget) / 30; // Assume 30-day campaign
        }
      }
    }
    
    return totalDailyBudget;
  } catch (error) {
    console.error('Error getting daily budget:', error.message);
    // Return a default budget if we can't fetch it
    return 1000; // Default $1000 daily budget
  }
}
