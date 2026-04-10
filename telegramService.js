const { Bot, InlineKeyboard } = require('grammy');

// Connects to your Render keys
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// The Buttons for your "User Page"
const mainMenu = new InlineKeyboard()
  .text("🔗 Link WhatsApp", "link_wa")
  .text("📊 Status", "check_status")
  .row()
  .text("⚙️ Settings", "settings");

// Command: /start
bot.command("start", async (ctx) => {
  await ctx.reply("👋 *WhatsApp Bot Command Center*", {
    parse_mode: "Markdown",
    reply_markup: mainMenu
  });
});

// Command: /link [number]
bot.command("link", async (ctx) => {
  const num = ctx.match;
  if (!num) return ctx.reply("❌ Use: /link 2348144821073");
  
  ctx.reply(`⏳ Requesting 8-digit code for ${num}...`);
  // This sends a signal to your server.js
  process.emit('REQUEST_PAIRING_CODE', num);
});

// ============ 🛠 THE RENDER FIX ============
module.exports = {
  // This is the function the server was looking for!
  initialize: () => {
    bot.start();
    console.log("🤖 Telegram Bot is listening for commands...");
  },

  // This sends the final code to your Telegram chat
  sendCode: async (code) => {
    console.log(`🔑 Your WhatsApp Code is: ${code}`);
    // Note: To send this to your phone, we'll link your ID later.
    // For now, check your Render logs to see the code!
  }
};