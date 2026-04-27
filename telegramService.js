const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const adminIds = (process.env.ADMIN_ID || "")
  .split(",")
  .map(id => id.trim())
  .filter(Boolean);

// --- KEYBOARDS ---

// Persistent Reply Keyboard at the bottom
const welcomeKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: "Link WhatsApp" }],
      [{ text: "Status" }, { text: "Settings" }]
    ],
    resize_keyboard: true
  }
};

// Inline buttons that appear after clicking Link WhatsApp
const linkOptions = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "Scan QR Code", callback_data: "link_qr" }],
      [{ text: "Use Pairing Code", callback_data: "link_code" }]
    ]
  }
};

const codeOptionMenu = {
  reply_markup: {
    inline_keyboard: [[{ text: "Use 8-Digit Code Instead", callback_data: "link_code" }]]
  }
};

const qrOptionMenu = {
  reply_markup: {
    inline_keyboard: [[{ text: "Try QR Code Instead", callback_data: "link_qr" }]]
  }
};

// --- LISTENERS ---

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!adminIds.includes(String(chatId))) return;

  if (text === '/start') {
    bot.sendMessage(chatId, "Welcome to WhatsApp Bot Command Center", welcomeKeyboard);
  } 
  
  else if (text === "Link WhatsApp") {
    bot.sendMessage(chatId, "Choose your connection method:", linkOptions);
  }

  else if (text === "Status") {
    process.emit('CHECK_WHATSAPP_STATUS', { chatId });
  }

  else if (text && !text.startsWith('/') && text !== "Link WhatsApp") {
    process.emit('TELEGRAM_TEXT_INPUT', { chatId, text });
  }
});

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  bot.answerCallbackQuery(query.id);

  if (data === "link_qr") {
    bot.sendMessage(chatId, "Initializing QR Code... Please wait.");
    process.emit('REQUEST_QR_SCAN', { chatId });
  } 
  
  else if (data === "link_code") {
    process.emit('SET_USER_STATE', { chatId, state: 'AWAITING_PHONE_NUMBER' });
    bot.sendMessage(chatId, "Send your WhatsApp number with country code (e.g. 234XXXXXXXXXX)");
  }
});

module.exports = {
  bot,
  initialize: () => { console.log("Telegram Bot listening..."); },

  sendCode: async (chatId, code) => {
    await bot.sendMessage(chatId, `YOUR PAIRING CODE:\n\n\`${code}\`\n\nEnter this on your phone.`, qrOptionMenu);
  },

  sendQR: async (chatId, imageBuffer) => {
    // Ensure we are sending the buffer correctly
    await bot.sendPhoto(chatId, imageBuffer, {
      caption: "Scan this QR code in WhatsApp settings",
      ...codeOptionMenu
    });
  },

  sendSimpleMessage: async (chatId, text) => {
    await bot.sendMessage(chatId, text);
  }
};
