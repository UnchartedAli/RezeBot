import { BotContext } from '../types';
import { LoggerProvider } from '../../core/logging';
import { ChatRepository } from '../../db/repositories';

const log = LoggerProvider.get('StartCommand');

const chatRepository = new ChatRepository();

export async function handleStart(ctx: BotContext): Promise<void> {
  const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
  const user = ctx.state.user as { first_name?: string } | undefined;

  try {
    if (isGroup) {
      const chat = await chatRepository.getById(ctx.chat!.id);
      if (!chat) {
        await ctx.reply('🤖 خوش آمدید! من ربات مدیریت گروه هوشمند ریز بات هستم.\n\n' +
          '⚙️ برای تنظیمات، از منوی زیر استفاده کنید:');
        return;
      }

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📖 راهنما', callback_data: 'help' },
            { text: '⚙️ تنظیمات', callback_data: 'settings:main' },
          ],
          [
            { text: '🛡️ امنیت', callback_data: 'security:main' },
            { text: '🤖 هوش مصنوعی', callback_data: 'ai:main' },
          ],
          [
            { text: '📊 آمار', callback_data: 'analytics:main' },
            { text: '🎮 بازی', callback_data: 'games:main' },
          ],
        ],
      };

      await ctx.reply(
        `سلام ${user?.first_name ?? 'دوست عزیز'}! 🌹\n\n` +
        'من ربات هوشمند ریز بات هستم. ' +
        'از منوی زیر برای مدیریت گروه استفاده کنید.',
        { reply_markup: keyboard, parse_mode: 'Markdown' }
      );
    } else {
      const keyboard = {
        inline_keyboard: [
          [
            { text: '📚 راهنما کامل', callback_data: 'help' },
            { text: '⚙️ تنظیمات', callback_data: 'settings:main' },
          ],
          [
            { text: '🌐 وب پنل', url: `${process.env.BASE_URL}/web` },
            { text: '📱 مینی اپ', url: `${process.env.BASE_URL}/mini-app` },
          ],
        ],
      };

      await ctx.reply(
        '🎉 به ریز بات خوش آمدید!\n\n' +
        '🤖 ربات هوشمند مدیریت گروه با پشتیبانی از زبان فارسی\n' +
        '✨ امکانات:\n' +
        '  • مدیریت حرفه‌ای گروه (بن، کیک، ساکت، هشدار)\n' +
        '  • محافظت از هوش مصنوعی (آنتی‌اسپم، آنتی‌رید)\n' +
        '  • پردازش زبان طبیعی فارسی\n' +
        '  • ترجمه و خلاصه‌سازی هوش مصنوعی\n' +
        '  • اقتصاد دیجیتال و بازی\n\n' +
        'از منوی زیر برای شروع استفاده کنید.',
        { reply_markup: keyboard }
      );
    }
  } catch (error) {
    log.error('Failed to handle /start', { error: String(error) });
    await ctx.reply('❌ خطا در پردازش درخواست شما.');
  }
}

export async function handleHelp(ctx: BotContext): Promise<void> {
  const helpText = `
📚 *راهنمای ریز بات*

*دستورات مدیریت:*
• /start - شروع کار با ربات
• /help - نمایش این راهنما
• /ban @user - بن کردن کاربر
• /kick @user - اخراج کاربر
• /mute @user [duration] - ساکت کردن کاربر
• /warn @user [reason] - هشدار دادن کاربر
• /delete [count] - حذف پیام‌ها
• /lock - قفل کردن گروه
• /unlock - باز کردن قفل گروه

*امنیت:*
• /quarantine @user - قرنطینه کردن
• /unquarantine @user - خارج کردن از قرنطینه
• /report [reason] - گزارش کاربر
• /guardian - وضعیت موتور نگهبان

*هوش مصنوعی:*
• /translate [text] - ترجمه متن
• /summarize - خلاصه‌سازی گفتگو
• /intent [text] - تجزیه نیت

*اقتصاد:*
• /balance - موجودی شما
• /daily - دریافت روزانه
• /leaderboard - رده‌بندی

*بازی:*
• /trivia - بازی سؤال و آینده
• /guess - بازی حدس عدد

*سایر:*
• /settings - تنظیمات گروه
• /faq - سؤالات مکرر
• /tickets - سیستم تیکت
• /giveaway - ایجاد گیروی

شما می‌توانید با ارسال متن فارسی (مثل: "ساکت کن @user") نیز فرمان بدهید.
  `;

  await ctx.reply(helpText, { parse_mode: 'Markdown' });
}
