import { config } from './config.js';
import { fetch } from 'undici';

const API = `https://api.telegram.org/bot${config.telegramToken}`;

function chunk(arr, size) {
  const out = [];
  for (let i=0; i<arr.length; i+=size) out.push(arr.slice(i, i+size));
  return out;
}

export async function sendAlerts(alerts) {
  if (!alerts.length) return;

  // Separate summary reports from regular alerts
  const summaryReports = alerts.filter(a => a.isSummary);
  const regularAlerts = alerts.filter(a => !a.isSummary);

  // Send summary reports individually (they're already formatted)
  for (const summary of summaryReports) {
    const url = `${API}/sendMessage`;
    const body = {
      chat_id: config.telegramChatId,
      text: `-\n\n\n${summary.detail}\n\n\n-`,
      parse_mode: 'Markdown'
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const t = await res.text();
      console.error('Telegram summary send failed', res.status, t);
    }
    
    // Add delay between messages for better spacing
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Send regular alerts in batches with better spacing
  if (regularAlerts.length > 0) {
    const lines = regularAlerts.map(a => `• *${a.title}*\n  ${a.detail}`);
    const batches = chunk(lines, 5); // Reduced batch size for better readability

    for (const b of batches) {
      const text = `-\n\n\n⚠️ Meta Watchdog Alerts\n\n${b.join('\n\n')}\n\n\n-`;
      const url = `${API}/sendMessage`;
      const body = {
        chat_id: config.telegramChatId,
        text,
        parse_mode: 'Markdown'
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const t = await res.text();
        console.error('Telegram alert send failed', res.status, t);
      }
      
      // Add delay between batches for better spacing
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
}
