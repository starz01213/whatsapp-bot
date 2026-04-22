const { Bot, InlineKeyboard, InputFile } = require('grammy');

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// =====================
// ADMIN SETUP (FIXED)
// =====================
const adminIds = (process.env.ADMIN_ID || "")
  .split(",")
  .map(id => id.trim())
  .filter(Boolean);

// =====================
// MESSAGE HANDLER (FIXED)
// =====================
bot.on("message", async (ctx) => {
  if (!ctx.message || !ctx.message.text) return;

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
  .text("🔗 Link WhatsApp", "link_wa")
  .text("📊 Status", "check_status")
  .row()
  .text("⚙️ Settings", "settings");

const codeOptionMenu = new InlineKeyboard()
  .text("🔢 Use 8-Digit Code Instead", "request_pairing_code");

const qrOptionMenu = new InlineKeyboard()
  .text("📸 Try QR Code Instead", "restart_connection");

// =====================
// COMMANDS
// =====================
bot.command("start", async (ctx) => {
  await ctx.reply("👋 *WhatsApp Bot Command Center*", {
    parse_mode: "Markdown",
    reply_markup: mainMenu
  });
});

// =====================
// CALLBACKS
// =====================

// LINK WHATSAPP (QR)
bot.callbackQuery("link_wa", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("🔄 Initializing WhatsApp connection... Fetching QR Code.");

  process.emit('REQUEST_QR_SCAN', { chatId: ctx.chat.id });
});

// PAIRING CODE MODE
bot.callbackQuery("request_pairing_code", async (ctx) => {
  await ctx.answerCallbackQuery();

  await ctx.reply("⏳ Requesting pairing mode...");

  process.emit('SET_USER_STATE', {
    chatId: ctx.chat.id,
    state: 'AWAITING_PHONE_NUMBER'
  });

  await ctx.reply("📱 Send your WhatsApp number with country code (e.g. 234XXXXXXXXXX)");
});

// RESTART QR
bot.callbackQuery("restart_connection", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("🔄 Restarting... Switching back to QR Code scan.");

  process.emit('REQUEST_QR_SCAN', { chatId: ctx.chat.id });
});

// =====================
// EXPORTS
// =====================
module.exports = {
  bot,

  initialize: () => {
    bot.start();
    console.log("🤖 Telegram Bot is listening...");
  },

  // =====================
  // SEND PAIRING CODE (FIXED MULTI-ADMIN)
  // =====================
  sendCode: async (code) => {
    if (adminIds.length === 0) return console.log("❌ No ADMIN_ID set");

    for (const adminId of adminIds) {
      await bot.api.sendMessage(
        adminId,
        `🔑 *YOUR WHATSAPP PAIRING CODE:*\n\n\`${code}\`\n\n_WhatsApp > Linked Devices > Link with phone number._`,
        {
          parse_mode: "Markdown",
          reply_markup: qrOptionMenu
        }
      );
    }

    console.log("✅ Pairing code sent");
  },

  // =====================
  // SEND QR (FIXED MULTI-ADMIN)
  // =====================
  sendQR: async (imageBuffer) => {
    if (adminIds.length === 0) return console.log("❌ No ADMIN_ID set");

    for (const adminId of adminIds) {
      await bot.api.sendPhoto(adminId, new InputFile(imageBuffer), {
        caption:
          "📸 *Scan this QR code in WhatsApp*\n\n1. Settings > Linked Devices\n2. Link a Device",
        parse_mode: "Markdown",
        reply_markup: codeOptionMenu
      });
    }

    console.log("✅ QR Code sent");
  }
};