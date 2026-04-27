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
const telegram = require('./telegramService');
const { initDb, saveSessionToDb, getSessionFromDb, updateStatusInDb } = require('./db');

// Load Admin IDs from .env
const ADMIN_IDS = (process.env.ADMIN_ID || "").split(",").map(id => id.trim());

const userState = new Map();
const activeSockets = new Map();

// --- KEEP-ALIVE SERVER FOR RENDER ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log('Keep-alive server listening on port ' + PORT));

// --- AUTHENTICATION SHIELD ---
const isAdmin = (chatId) => {
    return ADMIN_IDS.includes(String(chatId));
};

// --- WHATSAPP CONNECTION ENGINE ---
async function startWhatsApp(sessionId, chatId, phoneNumber = null) {
    if (!isAdmin(chatId)) return;

    const logger = pino({ level: 'silent' });
    const savedSession = await getSessionFromDb(sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(`sessions/${sessionId}`);

    if (savedSession && !state.creds && savedSession.session_data) {
        try {
            state.creds = JSON.parse(savedSession.session_data);
        } catch (e) {
            console.error("Failed to parse session data from DB");
        }
    }

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        logger
    });

    activeSockets.set(sessionId, sock);

    // ANTI-SPAM FIX 1: Wait 3 seconds before requesting code to ensure socket is ready
    if (phoneNumber && !sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                const formattedCode = code.match(/.{1,4}/g)?.join('-') || code;
                await telegram.sendCode(chatId, formattedCode);
            } catch (err) {
                await telegram.sendSimpleMessage(chatId, "Failed to request pairing code. Check number format or try again later.");
                // Terminate connection manually so it hits the cleanup block below
                sock.ws.close();
            }
        }, 3000);
    }

    sock.ev.on('creds.update', async () => {
        await saveCreds();
        const credsJson = JSON.stringify(state.creds);
        const phone = sock.user ? sock.user.id.split(':')[0] : 'pending';
        await saveSessionToDb(sessionId, phone, credsJson);
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Send QR buffer only if no phone number was provided
        if (qr && !phoneNumber) {
            try {
                console.log("QR Received, generating buffer...");
                const buffer = await QRCode.toBuffer(qr, { scale: 8 });
                await telegram.sendQR(chatId, buffer);
            } catch (qrErr) {
                console.error("QR Buffer Error:", qrErr.message);
            }
        }

        if (connection === 'open') {
            const phone = sock.user.id.split(':')[0];
            await updateStatusInDb(sessionId, 'online');
            await telegram.sendSimpleMessage(chatId, "WhatsApp connection active: " + phone);
            console.log("Connection opened for " + phone);
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect.error)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            await updateStatusInDb(sessionId, 'offline');
            
            // ANTI-SPAM FIX 2: Only auto-reconnect if the account was previously registered.
            if (shouldReconnect && state.creds.registered) {
                console.log("Reconnecting registered session: " + sessionId);
                setTimeout(() => startWhatsApp(sessionId, chatId, null), 5000);
            } else {
                console.log("Session terminated or failed pairing. Stopping loop.");
                activeSockets.delete(sessionId);
                
                // Wipe the broken session folder so the loop completely dies
                if (fs.existsSync(`sessions/${sessionId}`)) {
                    fs.rmSync(`sessions/${sessionId}`, { recursive: true, force: true });
                }
                
                if (!state.creds.registered) {
                    await telegram.sendSimpleMessage(chatId, "Connection closed. The pairing process timed out or failed. Please try linking again.");
                } else {
                    await telegram.sendSimpleMessage(chatId, "WhatsApp session logged out. Please link again.");
                }
            }
        }
    });

    return sock;
}

// --- TELEGRAM SIGNAL LISTENERS ---
process.on('REQUEST_QR_SCAN', async ({ chatId }) => {
    if (!isAdmin(chatId)) return;
    
    // Wipe old session data before starting a fresh QR request
    const sessionId = chatId.toString();
    if (fs.existsSync(`sessions/${sessionId}`)) {
        fs.rmSync(`sessions/${sessionId}`, { recursive: true, force: true });
    }
    
    await startWhatsApp(sessionId, chatId);
});

process.on('SET_USER_STATE', ({ chatId, state }) => {
    if (!isAdmin(chatId)) return;
    userState.set(chatId, state);
});

process.on('TELEGRAM_TEXT_INPUT', async ({ chatId, text }) => {
    if (!isAdmin(chatId)) return;
    
    const state = userState.get(chatId);
    if (state === 'AWAITING_PHONE_NUMBER') {
        const phoneNumber = text.replace(/[^0-9]/g, '');
        if (phoneNumber.length >= 10) {
            userState.delete(chatId);
            const sessionId = chatId.toString();
            
            // Wipe old session data before starting a fresh pairing code request
            if (fs.existsSync(`sessions/${sessionId}`)) {
                fs.rmSync(`sessions/${sessionId}`, { recursive: true, force: true });
            }
            
            await startWhatsApp(sessionId, chatId, phoneNumber);
        } else {
            await telegram.sendSimpleMessage(chatId, "Invalid format. Send number with country code.");
        }
    }
});

process.on('CHECK_WHATSAPP_STATUS', async ({ chatId }) => {
    if (!isAdmin(chatId)) return;
    
    const sessionId = chatId.toString();
    const sock = activeSockets.get(sessionId);
    
    if (sock && sock.user) {
        const phone = sock.user.id.split(':')[0];
        await telegram.sendSimpleMessage(chatId, "Status: Online\nConnected Account: " + phone);
    } else {
        await telegram.sendSimpleMessage(chatId, "Status: Offline");
    }
});

// --- SYSTEM INITIALIZATION ---
async function boot() {
    if (ADMIN_IDS.length === 0 || ADMIN_IDS[0] === "") {
        console.error("FATAL ERROR: No ADMIN_ID provided in .env");
        process.exit(1);
    }

    try {
        await initDb();
        telegram.initialize();
        console.log("System Ready. Authorized IDs: " + ADMIN_IDS.join(", "));
    } catch (err) {
        console.error("Boot Error:", err.message);
    }
}

boot();
