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
  await ctx.reply("🔄 Initializing WhatsApp connection... Please wait for the QR code.");
  process.emit('REQUEST_QR_SCAN'); // Tell the server to get a QR code
});

module.exports = {
  initialize: () => {
    bot.start();
    console.log("🤖 Telegram Bot is listening...");
  },
  
  // This is the new function to send the QR image
  sendQR: async (imageBuffer) => {
    // Note: We need to know who to send it to. 
    // For now, it will log the event. 
    // Ensure you have your TELEGRAM_ADMIN_ID set in Render!
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