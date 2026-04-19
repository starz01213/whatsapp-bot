const { 
    useMultiFileAuthState, 
    makeWASocket, 
    DisconnectReason, 
    makeCacheableSignalKeyStore 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');
const telegram = require('./telegramService');
const { initDb, saveSessionToDb, getSessionFromDb, updateStatusInDb } = require('./db');

// Load Admin IDs from .env (format: ADMIN_ID=123,456)
const ADMIN_IDS = (process.env.ADMIN_ID || "").split(",").map(id => id.trim());

const userState = new Map();
const activeSockets = new Map();

// --- AUTHENTICATION SHIELD ---

const isAdmin = (chatId) => {
    return ADMIN_IDS.includes(String(chatId));
};

// --- WHATSAPP CONNECTION ENGINE ---

/**
 * Starts a WhatsApp session.
 * @param {string} sessionId Unique ID for the session (based on Telegram Chat ID)
 * @param {number} chatId The Telegram ID of the admin
 * @param {string|null} phoneNumber Optional phone number for pairing code mode
 */
async function startWhatsApp(sessionId, chatId, phoneNumber = null) {
    if (!isAdmin(chatId)) return;

    const logger = pino({ level: 'silent' });
    
    // Check database for existing credentials
    const savedSession = await getSessionFromDb(sessionId);
    
    const { state, saveCreds } = await useMultiFileAuthState(`sessions/${sessionId}`);

    // Restore credentials from DB if local files are missing
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

    // Request Pairing Code if a phone number was provided
    if (phoneNumber && !sock.authState.creds.registered) {
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            await telegram.sendCode(chatId, code);
        } catch (err) {
            await telegram.sendSimpleMessage(chatId, "Failed to request pairing code. Check number format.");
        }
    }

    // Save credentials to Database on update
    sock.ev.on('creds.update', async () => {
        await saveCreds();
        const credsJson = JSON.stringify(state.creds);
        const phone = sock.user ? sock.user.id.split(':')[0] : 'pending';
        
        // Use sessionId to ensure Admin A and Admin B don't overwrite each other
        await saveSessionToDb(sessionId, phone, credsJson);
        console.log("Database sync successful for session: " + sessionId);
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Handle QR Generation
        if (qr && !phoneNumber) {
            try {
                const buffer = await QRCode.toBuffer(qr);
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
            
            if (shouldReconnect) {
                console.log("Reconnecting session: " + sessionId);
                startWhatsApp(sessionId, chatId, phoneNumber);
            } else {
                console.log("Session terminated: User logged out.");
                activeSockets.delete(sessionId);
                // Optional: Clean up local folder on logout
                fs.rmSync(`sessions/${sessionId}`, { recursive: true, force: true });
            }
        }
    });

    return sock;
}

// --- TELEGRAM SIGNAL LISTENERS ---

// Triggered by 'Link WhatsApp' button
process.on('REQUEST_QR_SCAN', async ({ chatId }) => {
    if (!isAdmin(chatId)) return;
    const sessionId = chatId.toString();
    await startWhatsApp(sessionId, chatId);
});

// Sets context for text input
process.on('SET_USER_STATE', ({ chatId, state }) => {
    if (!isAdmin(chatId)) return;
    userState.set(chatId, state);
});

// Handles phone number input for pairing codes
process.on('TELEGRAM_TEXT_INPUT', async ({ chatId, text }) => {
    if (!isAdmin(chatId)) return;
    
    const state = userState.get(chatId);
    if (state === 'AWAITING_PHONE_NUMBER') {
        const phoneNumber = text.replace(/[^0-9]/g, '');
        if (phoneNumber.length >= 10) {
            userState.delete(chatId);
            const sessionId = chatId.toString();
            await startWhatsApp(sessionId, chatId, phoneNumber);
        } else {
            await telegram.sendSimpleMessage(chatId, "Invalid format. Send number with country code.");
        }
    }
});

// Handles 'Status' button
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
