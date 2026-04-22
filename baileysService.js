const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');

const telegram = require('./telegramService');

let activeSock = null;

// =========================
// START WHATSAPP SESSION
// =========================
async function startWhatsApp(sessionId, chatId, phoneNumber = null) {
  console.log("Starting WhatsApp session...");

  const logger = pino({ level: 'silent' });

  // Get latest Baileys version (IMPORTANT FIX for QR/488 issues)
  const { version } = await fetchLatestBaileysVersion();

  const { state, saveCreds } = await useMultiFileAuthState(
    `sessions/${sessionId}`
  );

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger
  });

  activeSock = sock;

  // =========================
  // AUTH SAVE
  // =========================
  sock.ev.on('creds.update', saveCreds);

  // =========================
  // CONNECTION EVENTS
  // =========================
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    console.log("Connection:", connection);

    // =========================
    // QR GENERATION
    // =========================
    if (qr && !phoneNumber) {
      console.log("QR GENERATED");

      try {
        const buffer = await QRCode.toBuffer(qr);
        await telegram.sendQR(buffer);
      } catch (err) {
        console.log("QR ERROR:", err.message);
      }
    }

    // =========================
    // CONNECTED
    // =========================
    if (connection === 'open') {
      console.log("WhatsApp Connected");

      await telegram.bot.api.sendMessage(
        chatId,
        "✅ WhatsApp Connected Successfully"
      );
    }

    // =========================
    // DISCONNECTED
    // =========================
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;

      console.log("Disconnected:", statusCode);

      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut;

      // ❌ FIX: avoid infinite crash loop on 488
      if (statusCode === 488) {
        console.log("⚠️ Session timeout (488). Restarting clean session...");
        fs.rmSync(`sessions/${sessionId}`, {
          recursive: true,
          force: true
        });
      }

      if (shouldReconnect) {
        console.log("Reconnecting...");
        startWhatsApp(sessionId, chatId, phoneNumber);
      } else {
        console.log("Logged out permanently. Clearing session.");
        fs.rmSync(`sessions/${sessionId}`, {
          recursive: true,
          force: true
        });
      }
    }
  });

  // =========================
  // PAIRING CODE MODE
  // =========================
  if (phoneNumber) {
    try {
      const code = await sock.requestPairingCode(phoneNumber);
      await telegram.sendCode(code);
    } catch (err) {
      console.log("Pairing error:", err.message);
    }
  }

  return sock;
}

// =========================
// TELEGRAM EVENTS
// =========================

// START QR FLOW
process.on('REQUEST_QR_SCAN', async ({ chatId }) => {
  const sessionId = chatId.toString();

  await startWhatsApp(sessionId, chatId);
});

// PHONE INPUT FLOW
process.on('TELEGRAM_TEXT_INPUT', async ({ chatId, text }) => {
  const sessionId = chatId.toString();

  const phone = text.replace(/[^0-9]/g, '');

  if (phone.length < 10) {
    return telegram.bot.api.sendMessage(
      chatId,
      "❌ Invalid number format"
    );
  }

  await startWhatsApp(sessionId, chatId, phone);
});

// STATUS CHECK
process.on('CHECK_WHATSAPP_STATUS', async ({ chatId }) => {
  if (activeSock?.user) {
    const phone = activeSock.user.id.split(':')[0];

    await telegram.bot.api.sendMessage(
      chatId,
      `🟢 Online: ${phone}`
    );
  } else {
    await telegram.bot.api.sendMessage(
      chatId,
      "🔴 Offline"
    );
  }
});

// =========================
module.exports = {
  startWhatsApp
};