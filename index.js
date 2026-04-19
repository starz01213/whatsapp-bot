const { 
    useMultiFileAuthState, 
    makeWASocket, 
    DisconnectReason, 
    makeCacheableSignalKeyStore 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const telegram = require('./telegramService');
const { initDb, saveSessionToDb, getSessionFromDb, updateStatusInDb } = require('./db');

const userState = new Map();
const activeSockets = new Map();

// --- WHATSAPP CONNECTION ENGINE ---

async function startWhatsApp(sessionId, chatId, phoneNumber = null) {
    const logger = pino({ level: 'silent' });
    
    // 1. Load existing session from DB
    const savedSession = await getSessionFromDb(sessionId);
    
    const { state, saveCreds } = await useMultiFileAuthState(`sessions/${sessionId}`);

    // If folder is empty but DB has data, restore it
    if (savedSession && !state.creds && savedSession.session_data) {
        state.creds = JSON.parse(savedSession.session_data);
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

    // 2. Handle Pairing Code Request
    if (phoneNumber && !sock.authState.creds.registered) {
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            await telegram.sendCode(chatId, code);
        } catch (err) {
            await telegram.sendSimpleMessage(chatId, "Failed to request pairing code");
        }
    }

    // 3. Save Credentials to Database
    sock.ev.on('creds.update', async () => {
        await saveCreds();
        const credsJson = JSON.stringify(state.creds);
        const phone = sock.user ? sock.user.id.split(':')[0] : 'pending';
        await saveSessionToDb(sessionId, phone, credsJson);
        console.log("Session saved to database for " + sessionId);
    });

    // 4. Connection Updates
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !phoneNumber) {
            const buffer = await QRCode.toBuffer(qr);
            await telegram.sendQR(chatId, buffer);
        }

        if (connection === 'open') {
            const phone = sock.user.id.split(':')[0];
            await updateStatusInDb(sessionId, 'online');
            await telegram.sendSimpleMessage(chatId, "WhatsApp connection active for " + phone);
            console.log("Connected: " + phone);
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            await updateStatusInDb(sessionId, 'offline');
            
            if (shouldReconnect) {
                startWhatsApp(sessionId, chatId, phoneNumber);
            } else {
                console.log("Connection closed. User logged out.");
                activeSockets.delete(sessionId);
            }
        }
    });

    return sock;
}

// --- TELEGRAM SIGNAL LISTENERS ---

process.on('REQUEST_QR_SCAN', async ({ chatId }) => {
    const sessionId = chatId.toString();
    await startWhatsApp(sessionId, chatId);
});

process.on('SET_USER_STATE', ({ chatId, state }) => {
    userState.set(chatId, state);
});

process.on('TELEGRAM_TEXT_INPUT', async ({ chatId, text }) => {
    const state = userState.get(chatId);
    
    if (state === 'AWAITING_PHONE_NUMBER') {
        const phoneNumber = text.replace(/[^0-9]/g, '');
        if (phoneNumber.length >= 10) {
            userState.delete(chatId);
            const sessionId = chatId.toString();
            await startWhatsApp(sessionId, chatId, phoneNumber);
        } else {
            await telegram.sendSimpleMessage(chatId, "Invalid number format. Please send again with country code.");
        }
    }
});

process.on('CHECK_WHATSAPP_STATUS', async ({ chatId }) => {
    const sessionId = chatId.toString();
    const sock = activeSockets.get(sessionId);
    
    if (sock && sock.user) {
        await telegram.sendSimpleMessage(chatId, "Status: Online\nConnected as: " + sock.user.id.split(':')[0]);
    } else {
        await telegram.sendSimpleMessage(chatId, "Status: Offline");
    }
});

// --- BOOT ---

async function boot() {
    await initDb();
    telegram.initialize();
    console.log("System initialized without emojis");
}

boot();
