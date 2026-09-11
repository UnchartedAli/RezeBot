import 'dotenv/config';

const token = process.env.BOT_TOKEN;
const baseUrl = process.env.BASE_URL?.replace(/\/$/, '');
const secret = process.env.WEBHOOK_SECRET;
if (!token || !baseUrl) throw new Error('BOT_TOKEN and BASE_URL are required');

const url = `${baseUrl}/api/telegram/webhook`;
const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    url,
    secret_token: secret,
    allowed_updates: ['message', 'callback_query', 'chat_member', 'chat_join_request', 'message_reaction'],
  }),
});
const body = await response.json();
if (!body.ok) throw new Error(JSON.stringify(body));
console.log(`Webhook configured: ${url}`);
