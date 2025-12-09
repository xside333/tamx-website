// components/submitLead.js
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

/**
 * Настройки Telegram:
 * - TG_BOT_TOKEN  — токен бота (лежит в .env)
 * - TG_CHAT_IDS   — список chat_id через запятую
 *   (если переменной нет — можно указать резервный массив ниже)
 */
const BOT_TOKEN = process.env.TG_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const CHAT_IDS = (process.env.TG_CHAT_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Резервный массив (на случай, если TG_CHAT_IDS не задан)
const FALLBACK_CHAT_IDS = []; // например: [123456789, 987654321]

/** Безопасная экранизация для HTML (parse_mode: HTML) */
function esc(v) {
  if (v == null) return '';
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/** Форматирование телефона (минимальная нормализация) */
function fmtPhone(p) {
  if (!p) return '';
  return String(p).replace(/[^\d+()\-\s]/g, '').trim();
}

/** Форматирование денег: 2240102 -> 2 240 102 ₽ */
function fmtMoney(n) {
  if (n == null || n === '') return '';
  const x = Number(n);
  if (Number.isNaN(x)) return String(n);
  return x.toLocaleString('ru-RU') + ' ₽';
}

/** Форматирование ежемесячного платежа */
function fmtMonthly(n) {
  if (n == null || n === '') return '';
  const x = Number(n);
  if (Number.isNaN(x)) return String(n);
  return x.toLocaleString('ru-RU') + ' ₽/мес';
}

/** Формирует HTML-сообщение для Telegram из пришедшей формы */
function buildMessage(payload = {}) {
  // общие поля
  const {
    btn, page, pageUrl, name, phone,
    carId, carName, price, status,
    detailUrl,
    // кредит
    downPayment, loanAmount, monthlyPayment, termMonths
  } = payload;

  const lines = [];

  // Заголовок
  const title = btn ? `📝 <b>${esc(btn)}</b>` : '📝 <b>Новая заявка</b>';
  lines.push(title);

  // Источник
  if (page || pageUrl) {
    const pageLine = page ? `Страница: ${esc(page)}` : 'Страница: —';
    const pageUrlLine = pageUrl ? `\n↪️ <a href="${esc(pageUrl)}">Открыть страницу</a>` : '';
    lines.push(`${pageLine}${pageUrlLine}`);
  }

  // Клиент
  if (name || phone) {
    const pp = fmtPhone(phone);
    lines.push(`👤 ${esc(name || 'Без имени')}${pp ? `, ${esc(pp)}` : ''}`);
  }

  // Авто (если есть)
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

  // Кредит (если есть поля кредита)
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

  // Технический хвост — полезно для отладки формы
  // lines.push(`<code>${esc(JSON.stringify(payload))}</code>`);

  return lines.filter(Boolean).join('\n\n');
}

/** Отправка одного сообщения в Telegram */
async function sendToTelegram(chatId, html) {
  if (!BOT_TOKEN) throw new Error('TG_BOT_TOKEN/TELEGRAM_BOT_TOKEN не задан в .env');
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: html,
    parse_mode: 'HTML',
    disable_web_page_preview: false
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.ok === false) {
    throw new Error(`Telegram error: ${resp.status} ${resp.statusText} / ${JSON.stringify(data)}`);
  }
}

/** Основной обработчик */
export async function submitLead(req, res) {
  try {
    const payload = req.body || {};
    // формируем текст
    const html = buildMessage(payload);

    // получатели
    const targets = CHAT_IDS.length ? CHAT_IDS : FALLBACK_CHAT_IDS;
    if (!targets.length) {
      return res.status(500).json({ error: 'Список получателей пуст (TG_CHAT_IDS/FALLBACK_CHAT_IDS).' });
    }

    // рассылаем всем
    await Promise.all(targets.map(id => sendToTelegram(id, html)));

    res.json({ ok: true, sent: targets.length });
  } catch (err) {
    console.error('[submitLead] error:', err);
    res.status(500).json({ ok: false, error: 'Ошибка при отправке лида.' });
  }
}
