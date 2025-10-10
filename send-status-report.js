import { sendAlerts } from './lib/notifier.js';

// Create a status report alert
const statusReport = [{
  key: 'status_report',
  title: '📊 Status Report',
  detail: `📊 *Status Report*
⏰ 16:00 EST

💰 *Total Spend:* $2,726.44
🎯 *Cost Per Purchase:* $194.75
🛒 *Purchases:* 14
📅 *Business Day:* 53% complete (16:00 EST)

📝 *Notes:*
⚠️ CPA is 243% above target ($80)
✅ Spending on track
📊 25 active ad sets`,
  severity: 'info',
  isSummary: true
}];

console.log('📱 Sending status report to Telegram...');
await sendAlerts(statusReport);
console.log('✅ Status report sent!');
