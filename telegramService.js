const TelegramBot = require('node-telegram-bot-api');

// Initialize the bot with polling
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// =====================
// ADMIN SETUP
// =====================
const adminIds = (process.env.ADMIN_ID || "")
  .split(",")
  .map(id => id.trim())
  .filter(Boolean);

// =====================
// MENUS
// =====================
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "Link WhatsApp", callback_data: "link_wa" }, { text: "Status", callback_data: "check_status" }],
      [{ text: "Settings", callback_data: "settings" }]
    ]
  }
};

const codeOptionMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "Use 8-Digit Code Instead", callback_data: "request_pairing_code" }]
    ]
  }
};

const qrOptionMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "Try QR Code Instead", callback_data: "restart_connection" }]
    ]
  }
};

// =====================
// MESSAGE HANDLER
// =====================
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Security Check
  if (!adminIds.includes(String(chatId))) return;

  if (text === '/start') {
    bot.sendMessage(chatId, "WhatsApp Bot Command Center", mainMenu);
  } else if (text && !text.startsWith('/')) {
    // Forward text input to Baileys logic in index.js
    process.emit('TELEGRAM_TEXT_INPUT', { chatId, text });
  }
});

// =====================
// CALLBACK QUERY HANDLER
// =====================
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  bot.answerCallbackQuery(query.id);

  if (data === "link_wa") {
    bot.sendMessage(chatId, "Initializing WhatsApp connection... Fetching QR Code.");
    process.emit('REQUEST_QR_SCAN', { chatId });
  } 
  
  else if (data === "request_pairing_code") {
    bot.sendMessage(chatId, "Requesting pairing mode...");
    process.emit('SET_USER_STATE', { chatId, state: 'AWAITING_PHONE_NUMBER' });
    bot.sendMessage(chatId, "Send your WhatsApp number with country code (e.g. 234XXXXXXXXXX)");
  } 
  
  else if (data === "restart_connection") {
    bot.sendMessage(chatId, "Restarting... Switching back to QR Code scan.");
    process.emit('REQUEST_QR_SCAN', { chatId });
  } 
  
  else if (data === "check_status") {
    process.emit('CHECK_WHATSAPP_STATUS', { chatId });
  }
});

// =====================
// EXPORTS
// =====================
module.exports = {
  bot,
  
  initialize: () => {
    console.log("Telegram Bot (node-telegram-bot-api) is listening...");
  },

  sendCode: async (chatId, code) => {
    const target = chatId || adminIds[0];
    if (!target) return;
    await bot.sendMessage(target, `YOUR WHATSAPP PAIRING CODE:\n\n${code}\n\nWhatsApp > Linked Devices > Link with phone number.`, qrOptionMenu);
  },

  sendQR: async (chatId, imageBuffer) => {
    const target = chatId || adminIds[0];
    if (!target) return;
    await bot.sendPhoto(target, imageBuffer, {
      caption: "Scan this QR code in WhatsApp\n\n1. Settings > Linked Devices\n2. Link a Device",
      ...codeOptionMenu
    });
  },

  sendSimpleMessage: async (chatId, text) => {
    const target = chatId || adminIds[0];
    if (target) await bot.sendMessage(target, text);
  }
};
