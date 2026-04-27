require('dotenv').config();
const { 
    useMultiFileAuthState, 
    makeWASocket, 
    DisconnectReason, 
    makeCacheableSignalKeyStore 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');
const express = require('express');
const { Boom } = require('@hapi/boom'); // Added for robust error parsing
const telegram = require('./telegramService');
const { initDb, saveSessionToDb, getSessionFromDb, updateStatusInDb } = require('./db');

const ADMIN_IDS = (process.env.ADMIN_ID || "").split(",").map(id => id.trim());
const userState = new Map();
const activeSockets = new Map();
const connectingSessions = new Set(); // Guard to prevent spammy loops

// --- KEEP-ALIVE ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log('Server on port ' + PORT));

const isAdmin = (chatId) => ADMIN_IDS.includes(String(chatId));

async function startWhatsApp(sessionId, chatId, phoneNumber = null) {
    if (!isAdmin(chatId)) return;
    
    // Guard against multiple simultaneous connection attempts for the same session
    if (connectingSessions.has(sessionId)) return;
    connectingSessions.add(sessionId);

    const logger = pino({ level: 'silent' });
    const { state, saveCreds } = await useMultiFileAuthState(`sessions/${sessionId}`);
    const savedSession = await getSessionFromDb(sessionId);

    if (savedSession && !state.creds && savedSession.session_data) {
        state.creds = JSON.parse(savedSession.session_data);
    }

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        logger,
        markOnlineOnConnect: false
    });

    activeSockets.set(sessionId, sock);

    // --- PAIRING CODE LOGIC (Spam Protected) ---
    if (phoneNumber && !sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                await telegram.sendCode(chatId, code);
            } catch (err) {
                // Only alert if it's a real error, not just a "request in progress"
                if (!err.message.includes('already requested')) {
                    console.error("Pairing Error:", err.message);
                }
            }
        }, 3000); // 3-second delay to let the socket settle
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !phoneNumber) {
            try {
                const buffer = await QRCode.toBuffer(qr);
                await telegram.sendQR(chatId, buffer);
            } catch (e) {}
        }

        if (connection === 'open') {
            connectingSessions.delete(sessionId); // Connection successful, remove guard
            const phone = sock.user.id.split(':')[0];
            await updateStatusInDb(sessionId, 'online');
            await saveSessionToDb(sessionId, phone, JSON.stringify(state.creds));
            await telegram.sendSimpleMessage(chatId, "WhatsApp connection active: " + phone);
        }

        if (connection === 'close') {
            connectingSessions.delete(sessionId); // Connection closed, allow fresh attempt
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            const isLoggedOut = reason === DisconnectReason.loggedOut;

            await updateStatusInDb(sessionId, 'offline');

            if (!isLoggedOut) {
                console.log("Reconnecting session: " + sessionId);
                // Human-like delay before restarting to prevent rapid-fire failures
                setTimeout(() => startWhatsApp(sessionId, chatId, phoneNumber), 5000);
            } else {
                console.log("Logged out: " + sessionId);
                activeSockets.delete(sessionId);
                if (fs.existsSync(`sessions/${sessionId}`)) {
                    fs.rmSync(`sessions/${sessionId}`, { recursive: true, force: true });
                }
                await telegram.sendSimpleMessage(chatId, "Logged out. Please link again.");
            }
        }
    });
}

// --- SIGNAL LISTENERS ---
process.on('REQUEST_QR_SCAN', async ({ chatId }) => {
    await startWhatsApp(chatId.toString(), chatId);
});

process.on('SET_USER_STATE', ({ chatId, state }) => {
    userState.set(chatId, state);
});

process.on('TELEGRAM_TEXT_INPUT', async ({ chatId, text }) => {
    const state = userState.get(chatId);
    if (state === 'AWAITING_PHONE_NUMBER') {
        const num = text.replace(/[^0-9]/g, '');
        if (num.length >= 10) {
            userState.delete(chatId);
            await startWhatsApp(chatId.toString(), chatId, num);
        } else {
            await telegram.sendSimpleMessage(chatId, "Invalid number. Provide country code.");
        }
    }
});

process.on('CHECK_WHATSAPP_STATUS', async ({ chatId }) => {
    const sock = activeSockets.get(chatId.toString());
    if (sock && sock.user) {
        await telegram.sendSimpleMessage(chatId, "Status: Online\nAccount: " + sock.user.id.split(':')[0]);
    } else {
        await telegram.sendSimpleMessage(chatId, "Status: Offline");
    }
});

async function boot() {
    await initDb();
    telegram.initialize();
    console.log("System initialized");
}

boot().catch(console.error);
