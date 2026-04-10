const { Bot, InlineKeyboard, InputFile } = require('grammy');

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

const mainMenu = new InlineKeyboard()
  .text("🔗 Link WhatsApp", "link_wa")
  .text("📊 Status", "check_status")
  .row()
  .text("⚙️ Settings", "settings");

bot.command("start", async (ctx) => {
  await ctx.reply("👋 *WhatsApp Bot Command Center*", {
    parse_mode: "Markdown",
    reply_markup: mainMenu
  });
});

// Listener for the "Link" button
bot.callbackQuery("link_wa", async (ctx) => {
  await ctx.reply("🔄 Initializing WhatsApp connection... Please wait.");
  // This triggers the pairing process we set up in server.js/baileysService
  process.emit('REQUEST_QR_SCAN'); 
});

module.exports = {
  initialize: () => {
    bot.start();
    console.log("🤖 Telegram Bot is listening...");
  },
  
  // NEW: Function to send the 8-digit text code
  sendCode: async (code) => {
    const adminId = process.env.TELEGRAM_ADMIN_ID;
    if (adminId) {
      await bot.api.sendMessage(adminId, `🔑 *YOUR WHATSAPP PAIRING CODE:*\n\n\`${code}\`\n\n_Copy this and paste it into WhatsApp > Linked Devices > Link with phone number instead._`, {
        parse_mode: "Markdown"
      });
      console.log("✅ Pairing code sent to Telegram admin.");
    } else {
      console.log("❌ Cannot send code: TELEGRAM_ADMIN_ID is not set in Render.");
    }
  },

  // Function to send the QR image (if you decide to scan)
  sendQR: async (imageBuffer) => {
    const adminId = process.env.TELEGRAM_ADMIN_ID;
    if (adminId) {
      await bot.api.sendPhoto(adminId, new InputFile(imageBuffer), {
        caption: "📸 *Scan this QR code in WhatsApp*\n\n1. Settings > Linked Devices\n2. Link a Device",
        parse_mode: "Markdown"
      });
    } else {
      console.log("❌ Cannot send QR: TELEGRAM_ADMIN_ID is not set in Render.");
    }
  }
};