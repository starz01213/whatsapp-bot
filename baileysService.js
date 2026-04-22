const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const QRCode = require('qrcode');
const { sendQR, sendCode } = require('./yourTelegramFile'); // adjust filename

let sock;

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      const qrBuffer = await QRCode.toBuffer(qr);
      await sendQR(qrBuffer); // send to Telegram
    }

    if (connection === 'open') {
      console.log("✅ WhatsApp Connected");
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) startWhatsApp();
    }
  });
}

// 🔥 LISTEN TO YOUR TELEGRAM EVENTS

process.on('REQUEST_QR_SCAN', () => {
  console.log("📸 QR requested from Telegram");
  startWhatsApp();
});

process.on('REQUEST_PAIRING_CODE', async (phone) => {
  try {
    if (!sock) return;

    const code = await sock.requestPairingCode(phone);
    await sendCode(code);
  } catch (err) {
    console.log("❌ Pairing error:", err);
  }
});