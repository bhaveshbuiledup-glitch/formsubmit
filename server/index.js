import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import submitFormHandler from '../api/submit-form.js';

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: '20kb' }));
app.post('/api/submit-form', submitFormHandler);

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
