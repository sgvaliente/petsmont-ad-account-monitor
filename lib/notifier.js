import { config } from './config.js';
import { fetch } from 'undici';

const API = `https://api.telegram.org/bot${config.telegramToken}`;

function chunk(arr, size) {
  const out = [];
  for (let i=0; i<arr.length; i+=size) out.push(arr.slice(i, i+size));
  return out;
}

export async function sendAlerts(alerts) {
  console.log(`📱 [NOTIFIER] Starting to send ${alerts.length} alerts`);
  
  if (!alerts.length) {
    console.log('📱 [NOTIFIER] No alerts to send, returning early');
    return;
  }

  // Log Telegram configuration
  console.log(`📱 [NOTIFIER] Telegram Bot Token: ${config.telegramToken ? 'SET' : 'MISSING'}`);
  console.log(`📱 [NOTIFIER] Telegram Chat ID: ${config.telegramChatId}`);
  console.log(`📱 [NOTIFIER] Telegram API URL: ${API}`);

  // Separate summary reports from regular alerts
  const summaryReports = alerts.filter(a => a.isSummary);
  const regularAlerts = alerts.filter(a => !a.isSummary);
  
  console.log(`📱 [NOTIFIER] Summary reports: ${summaryReports.length}, Regular alerts: ${regularAlerts.length}`);

  // Send summary reports individually (they're already formatted)
  for (const summary of summaryReports) {
    console.log(`📱 [NOTIFIER] Sending summary report: ${summary.key}`);
    const url = `${API}/sendMessage`;
    const body = {
      chat_id: config.telegramChatId,
      text: `-\n\n\n${summary.detail}\n\n\n-`,
      parse_mode: 'Markdown'
    };
    
    console.log(`📱 [NOTIFIER] Request URL: ${url}`);
    console.log(`📱 [NOTIFIER] Request body:`, JSON.stringify(body, null, 2));
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      console.log(`📱 [NOTIFIER] Response status: ${res.status}`);
      console.log(`📱 [NOTIFIER] Response headers:`, Object.fromEntries(res.headers.entries()));
      
      if (!res.ok) {
        const t = await res.text();
        console.error('❌ [NOTIFIER] Telegram summary send failed', res.status, t);
      } else {
        const responseData = await res.json();
        console.log('✅ [NOTIFIER] Summary report sent successfully:', responseData);
      }
    } catch (error) {
      console.error('❌ [NOTIFIER] Network error sending summary:', error.message);
    }
    
    // Add delay between messages for better spacing
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Send regular alerts in batches with better spacing
  if (regularAlerts.length > 0) {
    console.log(`📱 [NOTIFIER] Processing ${regularAlerts.length} regular alerts`);
    
    // Get current spend data for context
    const currentTime = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
    const spendAlert = regularAlerts.find(a => a.spendContext);
    const spendContext = spendAlert ? 
      `\n💰 *Current Status:*\n⏰ ${currentTime}\n💵 Spend: $${spendAlert.spendContext.totalSpend.toFixed(2)} (${spendAlert.spendContext.spendPercent.toFixed(1)}% of budget)\n📅 Business Day: ${spendAlert.spendContext.businessDayProgress.toFixed(0)}% complete\n` 
      : '';
    
    const lines = regularAlerts.map(a => {
      const severity = a.severity === 'critical' ? '🚨' : a.severity === 'warning' ? '⚠️' : 'ℹ️';
      return `${severity} *${a.title}*\n   ${a.detail}`;
    });
    const batches = chunk(lines, 4); // Reduced batch size for better readability

    console.log(`📱 [NOTIFIER] Split into ${batches.length} batches`);

    for (let i = 0; i < batches.length; i++) {
      const b = batches[i];
      console.log(`📱 [NOTIFIER] Sending batch ${i + 1}/${batches.length} with ${b.length} alerts`);
      
      const text = `-\n\n\n🚨 *Meta Watchdog Alert*\n${spendContext}\n${b.join('\n\n')}\n\n\n-`;
      const url = `${API}/sendMessage`;
      const body = {
        chat_id: config.telegramChatId,
        text,
        parse_mode: 'Markdown'
      };
      
      console.log(`📱 [NOTIFIER] Batch ${i + 1} request URL: ${url}`);
      console.log(`📱 [NOTIFIER] Batch ${i + 1} message length: ${text.length} characters`);
      
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        console.log(`📱 [NOTIFIER] Batch ${i + 1} response status: ${res.status}`);
        
        if (!res.ok) {
          const t = await res.text();
          console.error(`❌ [NOTIFIER] Batch ${i + 1} send failed:`, res.status, t);
        } else {
          const responseData = await res.json();
          console.log(`✅ [NOTIFIER] Batch ${i + 1} sent successfully:`, responseData);
        }
      } catch (error) {
        console.error(`❌ [NOTIFIER] Batch ${i + 1} network error:`, error.message);
      }
      
      // Add delay between batches for better spacing
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  console.log('📱 [NOTIFIER] Finished sending all alerts');
}
