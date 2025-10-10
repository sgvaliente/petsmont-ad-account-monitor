import { runChecks } from '../lib/runner.js';
import { config } from '../lib/config.js';

export default async function handler(req, res) {
  try {
    const { secret } = req.query || {};
    if (secret !== config.cronSecret) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const alerts = await runChecks();
    return res.status(200).json({ ok: true, alerts: alerts.length });
  } catch (err) {
    console.error('Cron error:', err);
    return res.status(500).json({ ok: false, error: 'internal' });
  }
}
