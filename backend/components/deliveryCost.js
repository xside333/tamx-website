// backend/components/getDeliveryCost.js
import fs from 'fs';
import path from 'path';

export function deliveryCost(req, res) {
  try {
    // ../database/parser-api/deliveryCost/deliveryCost.json (относительно папки backend)
    const filePath = path.resolve(
      process.cwd(),
      '..',
      'database',
      'parser-api',
      'deliveryCost',
      'deliveryCost.json'
    );

    const raw = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(raw);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.status(200).json(json);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'deliveryCost.json not found' });
    }
    console.error('❌ Ошибка при отправке deliveryCost:', err);
    res.status(500).json({ error: 'Ошибка сервера при получении deliveryCost.' });
  }
}
