// components/submitLead.js
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ProxyAgent, fetch as undiciFetch } from 'undici';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

/**
 * Настройки Telegram:
 * - TG_BOT_TOKEN  — токен бота (лежит в .env)
 * - TG_CHAT_IDS   — список chat_id через запятую
 *
 * Настройки прокси (т.к. api.telegram.org заблокирован на хостинге):
 * - TG_PROXY_FILE   — путь к файлу со списком прокси (по умолчанию <repo>/proxy.txt)
 * - TG_PROXY_TIMEOUT_MS — таймаут на одну попытку (по умолчанию 6000)
 * - TG_PROXY_ATTEMPTS   — макс. число попыток на один chat_id (по умолчанию 3)
 *
 * Формат строки прокси: host:port:user:pass (HTTP(S) proxy с Basic Auth)
 */

const BOT_TOKEN = process.env.TG_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const CHAT_IDS = (process.env.TG_CHAT_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const FALLBACK_CHAT_IDS = [];

const ATTEMPT_TIMEOUT_MS = Number(process.env.TG_PROXY_TIMEOUT_MS) || 6000;
const MAX_ATTEMPTS = Number(process.env.TG_PROXY_ATTEMPTS) || 3;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROXY_FILE = path.resolve(__dirname, '../../proxy.txt');
const PROXY_FILE = process.env.TG_PROXY_FILE || DEFAULT_PROXY_FILE;

/** Загружает и кеширует список прокси из файла (формат host:port:user:pass) */
let proxyUrlsCache = null;
function loadProxies() {
  if (proxyUrlsCache) return proxyUrlsCache;
  try {
    const raw = fs.readFileSync(PROXY_FILE, 'utf8');
    proxyUrlsCache = raw
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(line => {
        const [host, port, user, pass] = line.split(':');
        if (!host || !port) return null;
        const auth = user && pass
          ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@`
          : '';
        return `http://${auth}${host}:${port}`;
      })
      .filter(Boolean);
  } catch (e) {
    console.error('[submitLead] не удалось прочитать proxy-файл:', PROXY_FILE, e.message);
    proxyUrlsCache = [];
  }
  return proxyUrlsCache;
}

/** Фишер–Йетс: случайный порядок прокси для каждой отправки */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Безопасная экранизация для HTML (parse_mode: HTML) */
function esc(v) {
  if (v == null) return '';
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function fmtPhone(p) {
  if (!p) return '';
  return String(p).replace(/[^\d+()\-\s]/g, '').trim();
}

function fmtMoney(n) {
  if (n == null || n === '') return '';
  const x = Number(n);
  if (Number.isNaN(x)) return String(n);
  return x.toLocaleString('ru-RU') + ' ₽';
}

function fmtMonthly(n) {
  if (n == null || n === '') return '';
  const x = Number(n);
  if (Number.isNaN(x)) return String(n);
  return x.toLocaleString('ru-RU') + ' ₽/мес';
}

/** Формирует HTML-сообщение для Telegram из пришедшей формы */
function buildMessage(payload = {}) {
  const {
    btn, page, pageUrl, name, phone,
    carId, carName, price, status,
    detailUrl,
    downPayment, loanAmount, monthlyPayment, termMonths
  } = payload;

  const lines = [];

  const title = btn ? `📝 <b>${esc(btn)}</b>` : '📝 <b>Новая заявка</b>';
  lines.push(title);

  if (page || pageUrl) {
    const pageLine = page ? `Страница: ${esc(page)}` : 'Страница: —';
    const pageUrlLine = pageUrl ? `\n↪️ <a href="${esc(pageUrl)}">Открыть страницу</a>` : '';
    lines.push(`${pageLine}${pageUrlLine}`);
  }

  if (name || phone) {
    const pp = fmtPhone(phone);
    lines.push(`👤 ${esc(name || 'Без имени')}${pp ? `, ${esc(pp)}` : ''}`);
  }

  if (carId || carName || price != null || status) {
    const header = '🚗 <b>Авто</b>';
    const parts = [];
    if (carId)    parts.push(`ID: ${esc(carId)}`);
    if (carName)  parts.push(`Модель: ${esc(carName)}`);
    if (price!=null)  parts.push(`Цена: ${fmtMoney(price)}`);
    if (status)   parts.push(`Статус: ${esc(status)}`);
    lines.push([header, parts.join(' | ')].filter(Boolean).join('\n'));
    if (detailUrl) lines.push(`🔗 <a href="${esc(detailUrl)}">Открыть карточку</a>`);
  }

  const hasLoan =
    downPayment != null ||
    loanAmount != null ||
    monthlyPayment != null ||
    termMonths != null;

  if (hasLoan) {
    const parts = [];
    if (downPayment != null)   parts.push(`Первоначальный взнос: ${fmtMoney(downPayment)}`);
    if (loanAmount != null)    parts.push(`Сумма кредита: ${fmtMoney(loanAmount)}`);
    if (monthlyPayment != null)parts.push(`Платёж: ${fmtMonthly(monthlyPayment)}`);
    if (termMonths != null)    parts.push(`Срок: ${esc(termMonths)} мес`);
    lines.push(`💳 <b>Кредит</b>\n${parts.join('\n')}`);
  }

  return lines.filter(Boolean).join('\n\n');
}

/** Одна попытка отправки через конкретный прокси с жёстким таймаутом */
async function sendViaProxy(chatId, html, proxyUrl) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: html,
    parse_mode: 'HTML',
    disable_web_page_preview: false,
  };

  const dispatcher = new ProxyAgent({
    uri: proxyUrl,
    requestTls: { timeout: ATTEMPT_TIMEOUT_MS },
    connectTimeout: ATTEMPT_TIMEOUT_MS,
    bodyTimeout: ATTEMPT_TIMEOUT_MS,
    headersTimeout: ATTEMPT_TIMEOUT_MS,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);

  try {
    const resp = await undiciFetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      dispatcher,
      signal: controller.signal,
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.ok === false) {
      throw new Error(`Telegram ${resp.status} ${resp.statusText}: ${JSON.stringify(data)}`);
    }
    return data;
  } finally {
    clearTimeout(timer);
    dispatcher.close().catch(() => {});
  }
}

/** Отправка сообщения одному chatId с ротацией прокси и ограниченным числом попыток */
async function sendToTelegram(chatId, html) {
  if (!BOT_TOKEN) throw new Error('TG_BOT_TOKEN/TELEGRAM_BOT_TOKEN не задан в .env');

  const proxies = loadProxies();
  if (!proxies.length) {
    throw new Error(`Список прокси пуст (${PROXY_FILE})`);
  }

  const order = shuffle(proxies);
  const tries = Math.min(MAX_ATTEMPTS, order.length);
  const errors = [];

  for (let i = 0; i < tries; i++) {
    const proxyUrl = order[i];
    try {
      await sendViaProxy(chatId, html, proxyUrl);
      return { ok: true, chatId, attempts: i + 1 };
    } catch (err) {
      const safeProxy = proxyUrl.replace(/\/\/[^@]+@/, '//***@');
      const msg = err?.message || String(err);
      errors.push(`${safeProxy} → ${msg}`);
      console.warn(`[submitLead] chat=${chatId} попытка ${i + 1}/${tries} провалилась через ${safeProxy}: ${msg}`);
    }
  }

  const error = new Error(`Не удалось отправить в Telegram после ${tries} попыток`);
  error.details = errors;
  throw error;
}

/** Основной обработчик */
export async function submitLead(req, res) {
  try {
    const payload = req.body || {};
    const html = buildMessage(payload);

    const targets = CHAT_IDS.length ? CHAT_IDS : FALLBACK_CHAT_IDS;
    if (!targets.length) {
      return res.status(500).json({ ok: false, error: 'Список получателей пуст (TG_CHAT_IDS/FALLBACK_CHAT_IDS).' });
    }

    const results = await Promise.allSettled(
      targets.map(id => sendToTelegram(id, html))
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results
      .map((r, i) => (r.status === 'rejected'
        ? { chatId: targets[i], error: r.reason?.message || String(r.reason), details: r.reason?.details }
        : null))
      .filter(Boolean);

    if (failed.length) {
      console.error('[submitLead] не доставлено для:', failed);
    }

    // Если не доставлено ни одному — это ошибка для клиента.
    if (sent === 0) {
      return res.status(502).json({
        ok: false,
        error: 'Не удалось отправить заявку в Telegram. Попробуйте позже.',
        sent,
        failed: failed.length,
      });
    }

    // Частичный успех — считаем ok, чтобы форма закрылась на фронте.
    return res.json({
      ok: true,
      sent,
      failed: failed.length,
      total: targets.length,
    });
  } catch (err) {
    console.error('[submitLead] фатальная ошибка:', err);
    return res.status(500).json({ ok: false, error: 'Ошибка при отправке лида.' });
  }
}
