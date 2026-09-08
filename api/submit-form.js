import Busboy from 'busboy';

export const config = { api: { bodyParser: false } };

const maxFileSize = 10 * 1024 * 1024;
const allowedExtensions = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx']);
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
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata'
  }).format(new Date()) + ' IST';
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
  return res.status(status).json(payload);
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    if (!req.headers['content-type']?.startsWith('multipart/form-data')) {
      reject(Object.assign(new Error('Invalid request content type.'), { statusCode: 400 }));
      return;
    }

    const fields = {};
    let document;
    let fileError;
    const parser = Busboy({ headers: req.headers, limits: { fileSize: maxFileSize, files: 1 } });

    parser.on('field', (name, value) => { fields[name] = value; });
    parser.on('file', (name, stream, info) => {
      if (name !== 'document') {
        stream.resume();
        return;
      }
      const extension = info.filename.split('.').pop().toLowerCase();
      const chunks = [];
      let size = 0;
      stream.on('data', (chunk) => { size += chunk.length; chunks.push(chunk); });
      stream.on('limit', () => { fileError = 'Document size must be 10MB or less.'; });
      stream.on('end', () => {
        if (!allowedExtensions.has(extension)) fileError = 'Please upload a PDF, DOC, DOCX, XLS, or XLSX file.';
        if (!fileError) document = { buffer: Buffer.concat(chunks), filename: info.filename, mimeType: info.mimeType || 'application/octet-stream', size };
      });
    });
    parser.on('error', reject);
    parser.on('finish', () => fileError ? reject(Object.assign(new Error(fileError), { statusCode: 400 })) : resolve({ fields, document }));
    req.pipe(parser);
  });
}

async function sendToTelegram(token, chatId, body, document) {
  const text = formatMessage(body);
  if (!document) {
    return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
  }

  const telegramForm = new FormData();
  telegramForm.append('chat_id', chatId);
  telegramForm.append('caption', text);
  telegramForm.append('document', new Blob([document.buffer], { type: document.mimeType }), document.filename);
  return fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: telegramForm });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });

  try {
    const { fields, document } = await parseMultipart(req);
    const validationError = validateSubmission(fields);
    if (validationError) return sendJson(res, 400, { error: validationError });
    const { submissionToken } = fields;
    if (processedSubmissions.has(submissionToken)) return sendJson(res, 409, { error: 'This form submission was already processed.' });

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId || token === 'your_bot_token' || chatId === 'your_chat_id') return sendJson(res, 500, { error: 'Submission service is not configured.' });

    const telegramResponse = await sendToTelegram(token, chatId, fields, document);
    const telegramResult = await telegramResponse.json();
    if (telegramResponse.status === 401) return sendJson(res, 500, { error: 'Submission service is not configured.' });
    if (!telegramResponse.ok || !telegramResult.ok) {
      console.error('Telegram delivery failed:', telegramResult.description || telegramResponse.status);
      return sendJson(res, 502, { error: 'Unable to deliver the form right now. Please try again.' });
    }

    processedSubmissions.add(submissionToken);
    return sendJson(res, 200, { success: true });
  } catch (error) {
    console.error('Submission API failed:', error.message);
    return sendJson(res, error.statusCode || 502, { error: error.statusCode === 400 ? error.message : 'Unable to deliver the form right now. Please try again.' });
  }
}
