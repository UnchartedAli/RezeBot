import { webhookCallback } from 'grammy';
import { createBot } from '../../src/bot/botFactory';
import { getConfig } from '../../src/core/config';

const bot = createBot();
const config = getConfig();
const callback = webhookCallback(bot, 'http');

export default async function handler(req: any, res: any): Promise<void> {
  if (config.WEBHOOK_SECRET && req.headers['x-telegram-bot-api-secret-token'] !== config.WEBHOOK_SECRET) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  return callback(req, res);
}
