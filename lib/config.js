import 'dotenv/config';

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const config = {
  metaAccessToken: must('META_ACCESS_TOKEN'),
  adAccountId: must('AD_ACCOUNT_ID'),
  telegramToken: must('TELEGRAM_BOT_TOKEN'),
  telegramChatId: must('TELEGRAM_CHAT_ID'),
  cronSecret: must('CRON_SECRET'),
  // thresholds
  spendAlertThreshold: Number(process.env.SPEND_ALERT_THRESHOLD || 250),
  ctrDropPct: Number(process.env.CTR_DROP_PCT || 40),
  lookbackDays: Number(process.env.LOOKBACK_DAYS || 1)
};
