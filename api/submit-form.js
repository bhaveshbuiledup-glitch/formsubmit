const processedSubmissions = globalThis.__processedFormSubmissions || new Set();
globalThis.__processedFormSubmissions = processedSubmissions;

function validateSubmission(body) {
  const { name, email, phone, subject, message, submissionToken } = body;
  if (!submissionToken || typeof submissionToken !== 'string') return 'Invalid submission token.';
  if (![name, email, phone, subject, message].every((value) => typeof value === 'string' && value.trim())) return 'All fields are required.';
  if (!/^[A-Z][A-Za-z]*(?:[ '-][A-Za-z]+)*$/.test(name.trim())) return 'Name must start with an uppercase letter.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please provide a valid email address.';
  if (!/^\d{10}$/.test(phone.trim())) return 'Phone number must contain exactly 10 digits.';
  return null;
}

function formatMessage({ name, email, phone, subject, message }) {
  const submitted = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC'
  }).format(new Date()) + ' UTC';

  return [
    '📩 NEW FORM SUBMISSION', '',
    `👤 Name: ${name.trim()}`,
    `📧 Email: ${email.trim()}`,
    `📱 Phone: ${phone.trim()}`,
    `💼 Subject: ${subject.trim()}`, '',
    '📝 Message:', message.trim(), '',
    `🕒 Submitted: ${submitted}`
  ].join('\n');
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  try {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    } catch {
      return sendJson(res, 400, { error: 'Invalid request data.' });
    }
    const validationError = validateSubmission(body);
    if (validationError) return sendJson(res, 400, { error: validationError });

    const { submissionToken } = body;
    if (processedSubmissions.has(submissionToken)) {
      return sendJson(res, 409, { error: 'This form submission was already processed.' });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId || token === 'your_bot_token' || chatId === 'your_chat_id') {
      return sendJson(res, 500, { error: 'Submission service is not configured.' });
    }

    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: formatMessage(body) })
    });
    const telegramResult = await telegramResponse.json();

    if (telegramResponse.status === 401) {
      console.error('Telegram bot authentication failed.');
      return sendJson(res, 500, { error: 'Submission service is not configured.' });
    }
    if (!telegramResponse.ok || !telegramResult.ok) {
      console.error('Telegram delivery failed:', telegramResult.description || telegramResponse.status);
      return sendJson(res, 502, { error: 'Unable to deliver the form right now. Please try again.' });
    }

    processedSubmissions.add(submissionToken);
    return sendJson(res, 200, { success: true });
  } catch (error) {
    console.error('Submission API failed:', error.message);
    return sendJson(res, 502, { error: 'Unable to deliver the form right now. Please try again.' });
  }
}
