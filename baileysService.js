const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');

const telegram = require('./telegramService');

// =====================
// ACTIVE SESSIONS
// =====================
const activeSockets = new Map();
const userState = new Map();

// =====================
// START WHATSAPP SESSION
// =====================
async function startWhatsApp(sessionId, chatId, phoneNumber = null) {
  const logger = pino({ level: 'silent' });

  const { state, saveCreds } = await useMultiFileAuthState(`sessions/${sessionId}`);

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    printQRInTerminal: false,
    logger
  });

  activeSockets.set(sessionId, sock);

  // =====================
  // PAIRING CODE MODE
  // =====================
  if (phoneNumber && !sock.authState.creds.registered) {
    try {
      const code = await sock.requestPairingCode(phoneNumber);
      await telegram.sendCode(code);
    } catch (err) {
      console.log("Pairing error:", err);
      await telegram.sendCode("ERROR");
    }
  }

  // =====================
  // SAVE SESSION
  // =====================
  sock.ev.on('creds.update', saveCreds);

  // =====================
  // CONNECTION HANDLER
  // =====================
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // QR CODE GENERATION
    if (qr && !phoneNumber) {
      try {
        const buffer = await QRCode.toBuffer(qr);
        await telegram.sendQR(buffer);
      } catch (err) {
        console.log("QR Error:", err);
      }
    }

    // CONNECTED
    if (connection === 'open') {
      const phone = sock.user?.id?.split(':')[0];
      console.log("WhatsApp Connected:", phone);
      await telegram.bot.api.sendMessage(chatId, "✅ WhatsApp Connected: " + phone);
    }

    // DISCONNECTED
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log("Disconnected:", statusCode);

      if (shouldReconnect) {
        console.log("Reconnecting...");
        startWhatsApp(sessionId, chatId, phoneNumber);
      } else {
        console.log("Logged out, cleaning session");

        activeSockets.delete(sessionId);
        fs.rmSync(`sessions/${sessionId}`, { recursive: true, force: true });
      }
    }
  });

  return sock;
}

// =====================
// EVENT SYSTEM (FROM TELEGRAM)
// =====================

// START QR MODE
process.on('REQUEST_QR_SCAN', async ({ chatId }) => {
  const sessionId = chatId.toString();
  await startWhatsApp(sessionId, chatId);
});

// SET STATE (for phone input flow)
process.on('SET_USER_STATE', ({ chatId, state }) => {
  userState.set(chatId, state);
});

// HANDLE PHONE NUMBER INPUT
process.on('TELEGRAM_TEXT_INPUT', async ({ chatId, text }) => {
  const state = userState.get(chatId);

  if (state === 'AWAITING_PHONE_NUMBER') {
    const phoneNumber = text.replace(/[^0-9]/g, '');

    if (phoneNumber.length < 10) {
      return telegram.bot.api.sendMessage(chatId, "❌ Invalid number format");
    }

    userState.delete(chatId);

    const sessionId = chatId.toString();
    await startWhatsApp(sessionId, chatId, phoneNumber);
  }
});

// STATUS CHECK
process.on('CHECK_WHATSAPP_STATUS', async ({ chatId }) => {
  const sessionId = chatId.toString();
  const sock = activeSockets.get(sessionId);

  if (sock?.user) {
    const phone = sock.user.id.split(':')[0];
    await telegram.bot.api.sendMessage(chatId, `🟢 Online: ${phone}`);
  } else {
    await telegram.bot.api.sendMessage(chatId, "🔴 Offline");
  }
});

// =====================
// EXPORTS
// =====================
module.exports = {
  startWhatsApp
};