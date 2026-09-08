# Secure Form Submission

A React form with client/server validation and secure Telegram delivery through an Express API locally or a Vercel API function in production.

## Setup

1. Install Node.js 18 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set:
   - `TELEGRAM_BOT_TOKEN`: token from BotFather.
   - `TELEGRAM_CHAT_ID`: target chat ID. Add the bot to the chat first.
4. Run `npm run dev`.
5. Open `http://localhost:5173`.

For a production build, run `npm run build`, then `npm start` with the same environment variables. The token is only read by server code and `.env` is ignored by Git.

## Vercel

Vercel automatically deploys `api/submit-form.js` as the `/api/submit-form` serverless endpoint. Add these environment variables in the Vercel project settings for Production, Preview, and Development:

- `TELEGRAM_BOT_TOKEN`: token from BotFather.
- `TELEGRAM_CHAT_ID`: target chat ID.

Deploy with `vercel --prod` after logging in with `vercel login`. The React frontend calls `/api/submit-form` directly; the Vite proxy is used only during local development.

## Testing

Run `npm test` for the server validation checks. End-to-end Telegram delivery requires valid credentials and a reachable Telegram API; submit a real test form to verify the exact values in the configured chat.
