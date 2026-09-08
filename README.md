# Secure Form Submission

A React form with client/server validation and secure Telegram delivery through an Express API.

## Setup

1. Install Node.js 18 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set:
   - `TELEGRAM_BOT_TOKEN`: token from BotFather.
   - `TELEGRAM_CHAT_ID`: target chat ID. Add the bot to the chat first.
4. Run `npm run dev`.
5. Open `http://localhost:5173`.

For a production build, run `npm run build`, then `npm start` with the same environment variables. The token is only read by `server/index.js` and `.env` is ignored by Git.

## Testing

Run `npm test` for the server validation checks. End-to-end Telegram delivery requires valid credentials and a reachable Telegram API; submit a real test form to verify the exact values in the configured chat.
