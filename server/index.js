import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const port = Number(process.env.PORT) || 3001;
const processedSubmissions = new Set();

app.use(cors());
app.use(express.json({ limit: '20kb' }));

function validateSubmission(body) {
  const { name, email, phone, subject, message, submissionToken } = body;
  if (!submissionToken || typeof submissionToken !== 'string') return 'Invalid submission token.';
  if (![name, email, phone, subject, message].every((value) => typeof value === 'string' && value.trim())) return 'All fields are required.';
  if (!/^[A-Z][A-Za-z]*(?:[ '-][A-Za-z]+)*$/.test(name.trim())) return 'Name must start with an uppercase letter.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please provide a valid email address.';
  if (!/^\d{10}$/.test(phone.trim())) return 'Phone number must contain exactly 10 digits.';
  return null;
}

function formatMessage({ name, email, phone, subject, message }) {
  const submitted = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC'
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

app.post('/api/submit-form', async (req, res) => {
  const validationError = validateSubmission(req.body);
  if (validationError) return res.status(400).json({ error: validationError });
  const { submissionToken } = req.body;
  if (processedSubmissions.has(submissionToken)) return res.status(409).json({ error: 'This form submission was already processed.' });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return res.status(500).json({ error: 'Submission service is not configured.' });

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: formatMessage(req.body) })
    });
    const telegramResult = await telegramResponse.json();
    if (telegramResponse.status === 401) {
      console.error('Telegram bot authentication failed. Check TELEGRAM_BOT_TOKEN.');
      return res.status(500).json({ error: 'Submission service is not configured.' });
    }
    if (!telegramResponse.ok || !telegramResult.ok) {
      console.error('Telegram delivery failed:', telegramResult.description || telegramResponse.status);
      return res.status(502).json({ error: 'Unable to deliver the form right now. Please try again.' });
    }
    processedSubmissions.add(submissionToken);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Submission request failed:', error.message);
    return res.status(502).json({ error: 'Unable to deliver the form right now. Please try again.' });
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error('API request failed:', error.message);
  const status = error.type === 'entity.parse.failed' ? 400 : 500;
  const message = status === 400 ? 'Invalid request data.' : 'Internal server error.';
  return res.status(status).json({ error: message });
});

app.listen(port, () => console.log(`API listening on port ${port}`));
