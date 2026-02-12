import express from 'express';
import { config } from './config.js';
import { pool, checkDbConnection } from './dbClient.js';

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json({ limit: '50mb' }));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(tag, msg) {
  console.log(`[${new Date().toISOString()}] [${tag}] ${msg}`);
}

function err(tag, msg) {
  console.error(`[${new Date().toISOString()}] [${tag}] ${msg}`);
}

/**
 * Проверка API-ключа
 */
function authMiddleware(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== config.apiKey) {
    log('AUTH', `Отклонён запрос от ${req.ip} — неверный API-ключ`);
    return res.status(401).json({ error: 'Unauthorized: invalid or missing x-api-key' });
  }
  next();
}

// ─── Upsert SQL ──────────────────────────────────────────────────────────────

const UPSERT_SQL = `
  INSERT INTO public.che168_autoparser (
    id, inner_id, url, mark, model, year, first_registration, color,
    price, km_age, engine_type, transmission_type, body_type, address,
    seller_type, is_dealer, section, salon_id, description, displacement,
    power, offer_created, images, option, configuration, raw_json,
    last_change_id, created_at, updated_at
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8,
    $9, $10, $11, $12, $13, $14,
    $15, $16, $17, $18, $19, $20,
    $21, $22, $23, $24, $25, $26,
    $27, NOW(), NOW()
  )
  ON CONFLICT (inner_id) DO UPDATE SET
    id                 = EXCLUDED.id,
    url                = EXCLUDED.url,
    mark               = EXCLUDED.mark,
    model              = EXCLUDED.model,
    year               = EXCLUDED.year,
    first_registration = EXCLUDED.first_registration,
    color              = EXCLUDED.color,
    price              = EXCLUDED.price,
    km_age             = EXCLUDED.km_age,
    engine_type        = EXCLUDED.engine_type,
    transmission_type  = EXCLUDED.transmission_type,
    body_type          = EXCLUDED.body_type,
    address            = EXCLUDED.address,
    seller_type        = EXCLUDED.seller_type,
    is_dealer          = EXCLUDED.is_dealer,
    section            = EXCLUDED.section,
    salon_id           = EXCLUDED.salon_id,
    description        = EXCLUDED.description,
    displacement       = EXCLUDED.displacement,
    power              = EXCLUDED.power,
    offer_created      = EXCLUDED.offer_created,
    images             = EXCLUDED.images,
    option             = EXCLUDED.option,
    configuration      = EXCLUDED.configuration,
    raw_json           = EXCLUDED.raw_json,
    last_change_id     = EXCLUDED.last_change_id,
    updated_at         = NOW()
`;

const DELETE_SQL = `DELETE FROM public.che168_autoparser WHERE inner_id = $1`;

// ─── Обработка одного изменения ──────────────────────────────────────────────

function buildUpsertParams(data) {
  return [
    data.id ?? null,
    data.inner_id,
    data.url ?? null,
    data.mark ?? null,
    data.model ?? null,
    data.year ?? null,
    data.first_registration ?? null,
    data.color ?? null,
    data.price ?? null,
    data.km_age ?? null,
    data.engine_type ?? null,
    data.transmission_type ?? null,
    data.body_type ?? null,
    data.address ?? null,
    data.seller_type ?? null,
    data.is_dealer ?? false,
    data.section ?? null,
    data.salon_id ?? null,
    data.description ?? null,
    data.displacement ?? null,
    data.power ?? null,
    data.offer_created ?? null,
    data.images ? JSON.stringify(data.images) : null,
    data.option ? JSON.stringify(data.option) : null,
    data.configuration ? JSON.stringify(data.configuration) : null,
    data.raw_json ? JSON.stringify(data.raw_json) : null,
    data.change_id ?? data.last_change_id ?? null,
  ];
}

async function applyChange(client, change) {
  const { change_type, inner_id, data } = change;

  if (change_type === 'removed') {
    const result = await client.query(DELETE_SQL, [inner_id]);
    return { action: 'deleted', inner_id, rows: result.rowCount };
  }

  // added / changed → UPSERT
  if (!data || !data.inner_id) {
    throw new Error(`Отсутствует data.inner_id для change_type="${change_type}"`);
  }

  const params = buildUpsertParams(data);
  await client.query(UPSERT_SQL, params);
  return { action: change_type === 'added' ? 'inserted' : 'updated', inner_id: data.inner_id };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * Healthcheck
 */
app.get('/health', async (_req, res) => {
  try {
    await checkDbConnection();
    res.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ ok: false, error: 'DB connection failed' });
  }
});

/**
 * POST /api/che168/changes — приём батча изменений от Сервера A
 */
app.post('/api/che168/changes', authMiddleware, async (req, res) => {
  const { changes, source_change_id, timestamp } = req.body;

  if (!Array.isArray(changes) || changes.length === 0) {
    return res.status(400).json({ error: 'changes must be a non-empty array' });
  }

  log('RECEIVER', `Получен батч: ${changes.length} изменений, source_change_id=${source_change_id}, ts=${timestamp}`);

  const stats = { inserted: 0, updated: 0, deleted: 0, errors: 0 };
  const errors = [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const change of changes) {
      try {
        const result = await applyChange(client, change);

        if (result.action === 'inserted') stats.inserted++;
        else if (result.action === 'updated') stats.updated++;
        else if (result.action === 'deleted') stats.deleted++;
      } catch (e) {
        stats.errors++;
        const errorMsg = `inner_id=${change.inner_id}: ${e.message}`;
        errors.push(errorMsg);
        err('CHANGE', errorMsg);
      }
    }

    // Если есть хотя бы частичный успех — коммитим
    if (stats.inserted + stats.updated + stats.deleted > 0) {
      await client.query('COMMIT');
    } else {
      await client.query('ROLLBACK');
    }
  } catch (e) {
    await client.query('ROLLBACK');
    err('BATCH', `Критическая ошибка батча: ${e.message}`);
    return res.status(500).json({ error: 'Batch processing failed', message: e.message });
  } finally {
    client.release();
  }

  log('RECEIVER', `Результат: +${stats.inserted} upd=${stats.updated} -${stats.deleted} err=${stats.errors}`);

  res.json({
    ok: true,
    stats,
    errors: errors.length > 0 ? errors : undefined,
    source_change_id,
  });
});

// ─── Graceful shutdown ───────────────────────────────────────────────────────

async function shutdown(signal) {
  log('SERVER', `Получен ${signal}, завершение...`);
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(config.port, () => {
  log('SERVER', `che168-receiver запущен на порту ${config.port}`);
  log('SERVER', `Healthcheck: GET http://localhost:${config.port}/health`);
  log('SERVER', `Receiver:    POST http://localhost:${config.port}/api/che168/changes`);
});
