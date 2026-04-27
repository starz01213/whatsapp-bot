const { Bot, InlineKeyboard, InputFile } = require('grammy');

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// =====================
// ADMIN SETUP
// =====================
const adminIds = (process.env.ADMIN_ID || "")
  .split(",")
  .map(id => id.trim())
  .filter(Boolean);

// =====================
// MESSAGE HANDLER
// =====================
bot.on("message:text", async (ctx) => {
  // Ignore if not from an authorized admin
  if (!adminIds.includes(String(ctx.chat.id))) return;

  process.emit('TELEGRAM_TEXT_INPUT', {
    chatId: ctx.chat.id,
    text: ctx.message.text
  });
});

// =====================
// MENUS
// =====================
const mainMenu = new InlineKeyboard()
  .text("Link WhatsApp", "link_wa")
  .text("Status", "check_status")
  .row()
  .text("Settings", "settings");

const codeOptionMenu = new InlineKeyboard()
  .text("Use 8-Digit Code Instead", "request_pairing_code");

const qrOptionMenu = new InlineKeyboard()
  .text("Try QR Code Instead", "restart_connection");

// =====================
// COMMANDS
// =====================
bot.command("start", async (ctx) => {
  if (!adminIds.includes(String(ctx.chat.id))) return;

  await ctx.reply("WhatsApp Bot Command Center", {
    parse_mode: "Markdown",
    reply_markup: mainMenu
  });
});

// =====================
// CALLBACKS
// =====================

bot.callbackQuery("link_wa", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Initializing WhatsApp connection... Fetching QR Code.");
  process.emit('REQUEST_QR_SCAN', { chatId: ctx.chat.id });
});

bot.callbackQuery("request_pairing_code", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Requesting pairing mode...");

  process.emit('SET_USER_STATE', {
    chatId: ctx.chat.id,
    state: 'AWAITING_PHONE_NUMBER'
  });

  await ctx.reply("Send your WhatsApp number with country code (e.g. 234XXXXXXXXXX)");
});

bot.callbackQuery("restart_connection", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Restarting... Switching back to QR Code scan.");
  process.emit('REQUEST_QR_SCAN', { chatId: ctx.chat.id });
});

bot.callbackQuery("check_status", async (ctx) => {
  await ctx.answerCallbackQuery();
  process.emit('CHECK_WHATSAPP_STATUS', { chatId: ctx.chat.id });
});

// =====================
// EXPORTS
// =====================
module.exports = {
  bot,

  initialize: () => {
    bot.start({
      onStart: (botInfo) => {
        console.log(`Telegram Bot is listening as @${botInfo.username}`);
      },
    });
  },

  sendCode: async (chatId, code) => {
    const target = chatId || adminIds[0];
    if (!target) return console.log("No recipient for code");

    await bot.api.sendMessage(
      target,
      `YOUR WHATSAPP PAIRING CODE:\n\n\`${code}\`\n\nWhatsApp > Linked Devices > Link with phone number.`,
      {
        parse_mode: "Markdown",
        reply_markup: qrOptionMenu
      }
    );
    console.log("Pairing code sent");
  },

  sendQR: async (chatId, imageBuffer) => {
    const target = chatId || adminIds[0];
    if (!target) return console.log("No recipient for QR");

    await bot.api.sendPhoto(target, new InputFile(imageBuffer), {
      caption: "Scan this QR code in WhatsApp\n\n1. Settings > Linked Devices\n2. Link a Device",
      parse_mode: "Markdown",
      reply_markup: codeOptionMenu
    });
    console.log("QR Code sent");
  },

  sendSimpleMessage: async (chatId, text) => {
    const target = chatId || adminIds[0];
    if (target) {
      await bot.api.sendMessage(target, text);
    }
  }
};
