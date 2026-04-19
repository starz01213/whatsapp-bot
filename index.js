const { Bot, InlineKeyboard, InputFile } = require('grammy');

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// --- MENU DEFINITIONS ---

const mainMenu = new InlineKeyboard()
  .text("Link WhatsApp", "link_wa")
  .text("Status", "check_status")
  .row()
  .text("Settings", "settings");

const codeOptionMenu = new InlineKeyboard()
  .text("Use 8-Digit Code Instead", "request_pairing_code");

const qrOptionMenu = new InlineKeyboard()
  .text("Try QR Code Instead", "restart_connection");

// --- COMMANDS ---

bot.command("start", async (ctx) => {
  await ctx.reply("WhatsApp Bot Command Center", {
    reply_markup: mainMenu
  });
});

// --- CALLBACK LISTENERS ---

bot.callbackQuery("link_wa", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Initializing WhatsApp connection... Fetching QR Code.");
  // Signals index.js to start session
  process.emit('REQUEST_QR_SCAN', { chatId: ctx.chat.id }); 
});

bot.callbackQuery("request_pairing_code", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Please enter the phone number with country code (e.g. 23481...) to receive a pairing code:");
  
  // Set a temporary state for the next message listener
  process.emit('SET_USER_STATE', { chatId: ctx.chat.id, state: 'AWAITING_PHONE_NUMBER' });
});

bot.callbackQuery("restart_connection", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Restarting... Switching back to QR Code scan.");
  process.emit('REQUEST_QR_SCAN', { chatId: ctx.chat.id });
});

bot.callbackQuery("check_status", async (ctx) => {
  await ctx.answerCallbackQuery();
  process.emit('CHECK_WHATSAPP_STATUS', { chatId: ctx.chat.id });
});

// --- MESSAGE LISTENER FOR PHONE NUMBERS ---

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  
  // This event will be caught in index.js to trigger Baileys requestPairingCode
  process.emit('TELEGRAM_TEXT_INPUT', { 
    chatId: ctx.chat.id, 
    text: text 
  });
});

// --- EXPORTED FUNCTIONS ---

module.exports = {
  bot: bot,

  initialize: () => {
    bot.start();
    console.log("Telegram Bot is listening...");
  },
  
  sendCode: async (chatId, code) => {
    const target = chatId || process.env.TELEGRAM_ADMIN_ID;
    if (target) {
      await bot.api.sendMessage(target, `YOUR WHATSAPP PAIRING CODE:\n\n${code}\n\nCopy this and paste it into:\nWhatsApp > Linked Devices > Link with phone number.`, {
        reply_markup: qrOptionMenu
      });
      console.log("Pairing code sent to Telegram.");
    }
  },

  sendQR: async (chatId, imageBuffer) => {
    const target = chatId || process.env.TELEGRAM_ADMIN_ID;
    if (target) {
      await bot.api.sendPhoto(target, new InputFile(imageBuffer), {
        caption: "Scan this QR code in WhatsApp\n\n1. Settings > Linked Devices\n2. Link a Device\n\nIf you cannot scan, click the button below to get a code.",
        reply_markup: codeOptionMenu
      });
      console.log("QR Code sent to Telegram.");
    }
  },

  sendSimpleMessage: async (chatId, text) => {
    const target = chatId || process.env.TELEGRAM_ADMIN_ID;
    await bot.api.sendMessage(target, text);
  }
};
