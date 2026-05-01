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
const axios = require('axios'); // npm install axios
const telegram = require('./telegramService');
const { initDb, saveSessionToDb, getSessionFromDb, updateStatusInDb } = require('./db');

// ─────────────────────────────────────────────
// DEBUG LOGGER
// Set DEBUG=true in your .env to enable verbose logs
// ─────────────────────────────────────────────
const DEBUG = process.env.DEBUG === 'true';
const debug = (...args) => {
    if (DEBUG) console.log('[DEBUG]', new Date().toISOString(), ...args);
};
const logInfo  = (...args) => console.log('[INFO] ', new Date().toISOString(), ...args);
const logError = (...args) => console.error('[ERROR]', new Date().toISOString(), ...args);

// ─────────────────────────────────────────────
// BOOT CONFIG
// ─────────────────────────────────────────────
const ADMIN_IDS = (process.env.ADMIN_ID || "").split(",").map(id => id.trim()).filter(Boolean);

const userState      = new Map(); // chatId  → state string (admin flow)
const activeSockets  = new Map(); // sessionId → WASocket
const callbackRegistry = new Map(); // sessionId → callbackUrl (external flow)

// ─────────────────────────────────────────────
// EXPRESS SERVER
// ─────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (_req, res) => res.send('Bot is running'));

// ── External API: Request Pairing Code ────────
// POST /api/connect/pairing
// Body: { "number": "2348000000000", "callbackUrl": "https://..." }
// Response: { "success": true, "sessionId": "ext_...", "pairingCode": "ABCD-1234" }
app.post('/api/connect/pairing', async (req, res) => {
    const { number, callbackUrl } = req.body;

    debug('POST /api/connect/pairing →', { number, callbackUrl });

    if (!number || !callbackUrl) {
        return res.status(400).json({ success: false, error: 'number and callbackUrl are required' });
    }

    const phoneNumber = number.replace(/[^0-9]/g, '');
    if (phoneNumber.length < 10) {
        return res.status(400).json({ success: false, error: 'Invalid phone number — include country code' });
    }

    const sessionId = `ext_${Date.now()}`;
    callbackRegistry.set(sessionId, callbackUrl);
    logInfo(`Pairing request → sessionId: ${sessionId}, phone: ${phoneNumber}`);

    try {
        const pairingCode = await startExternalSession(sessionId, phoneNumber, 'pairing');
        debug(`Pairing code issued for ${sessionId}: ${pairingCode}`);
        return res.json({ success: true, sessionId, pairingCode });
    } catch (err) {
        logError(`Pairing failed for ${sessionId}:`, err.message);
        callbackRegistry.delete(sessionId);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ── External API: Request QR Code ─────────────
// POST /api/connect/qr
// Body: { "callbackUrl": "https://..." }
// Response: { "success": true, "sessionId": "ext_qr_...", "qr": "data:image/png;base64,..." }
app.post('/api/connect/qr', async (req, res) => {
    const { callbackUrl } = req.body;

    debug('POST /api/connect/qr →', { callbackUrl });

    if (!callbackUrl) {
        return res.status(400).json({ success: false, error: 'callbackUrl is required' });
    }

    const sessionId = `ext_qr_${Date.now()}`;
    callbackRegistry.set(sessionId, callbackUrl);
    logInfo(`QR request → sessionId: ${sessionId}`);

    try {
        const qrDataUrl = await startExternalSession(sessionId, null, 'qr');
        debug(`QR generated for ${sessionId}`);
        return res.json({ success: true, sessionId, qr: qrDataUrl });
    } catch (err) {
        logError(`QR failed for ${sessionId}:`, err.message);
        callbackRegistry.delete(sessionId);
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => logInfo(`Server listening on port ${PORT}`));

// ─────────────────────────────────────────────
// WEBHOOK DELIVERY
// Called after an external session connects.
// Sends { success, sessionId, shortId, number, session_data } to the callbackUrl.
// ─────────────────────────────────────────────
async function fireWebhook(sessionId, payload) {
    const callbackUrl = callbackRegistry.get(sessionId);
    if (!callbackUrl) {
        debug(`fireWebhook: no callbackUrl for ${sessionId} — skipping`);
        return;
    }

    logInfo(`Firing webhook → ${callbackUrl} for sessionId: ${sessionId}`);
    debug('Webhook payload:', JSON.stringify(payload).slice(0, 200) + '...');

    try {
        const response = await axios.post(callbackUrl, payload, {
            timeout: 10_000,
            headers: { 'Content-Type': 'application/json' }
        });
        logInfo(`Webhook delivered for ${sessionId} — HTTP ${response.status}`);
        callbackRegistry.delete(sessionId); // clean up; one-shot delivery
    } catch (err) {
        logError(`Webhook FAILED for ${sessionId}:`, err.message);
        // Keep callbackUrl in registry so a retry could be triggered manually.
        // You can add retry logic here if needed.
    }
}

// ─────────────────────────────────────────────
// EXTERNAL SESSION ENGINE
// Starts a WhatsApp socket for external API callers.
// mode = 'pairing' | 'qr' | 'reconnect'
// Resolves with pairingCode (pairing mode) or qr data URL (qr mode).
// After the socket actually connects, it fires the webhook automatically.
// ─────────────────────────────────────────────
async function startExternalSession(sessionId, phoneNumber, mode) {
    return new Promise(async (resolve, reject) => {
        debug(`startExternalSession → sessionId: ${sessionId}, mode: ${mode}, phone: ${phoneNumber}`);

        const logger = pino({ level: 'silent' });
        const { state, saveCreds } = await useMultiFileAuthState(`sessions/${sessionId}`);

        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
            logger
        });

        activeSockets.set(sessionId, sock);

        // Prevent double-resolve
        let settled = false;
        const settle = (fn, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(responseTimeout);
            fn(value);
        };

        // If nothing happens within 30s, abort
        const responseTimeout = setTimeout(() => {
            logError(`Timeout waiting for ${mode} on session ${sessionId}`);
            sock.ws.close();
            settle(reject, new Error('Timed out — no QR or pairing code received within 30s'));
        }, 30_000);

        // ── Request pairing code after socket stabilises ──
        if (mode === 'pairing' && phoneNumber) {
            setTimeout(async () => {
                try {
                    debug(`Requesting pairing code for ${phoneNumber}`);
                    const code = await sock.requestPairingCode(phoneNumber);
                    const formatted = code.match(/.{1,4}/g)?.join('-') || code;
                    logInfo(`Pairing code for ${sessionId}: ${formatted}`);
                    settle(resolve, formatted);
                } catch (err) {
                    logError(`requestPairingCode failed for ${sessionId}:`, err.message);
                    sock.ws.close();
                    settle(reject, err);
                }
            }, 3_000);
        }

        // ── Persist creds on every update ──
        sock.ev.on('creds.update', async () => {
            await saveCreds();
            debug(`Creds updated for ${sessionId}`);
            const phone = sock.user ? sock.user.id.split(':')[0] : 'pending';
            const credsJson = JSON.stringify(state.creds);
            await saveSessionToDb(sessionId, phone, credsJson);
        });

        // ── Main connection lifecycle ──
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            debug(`[${sessionId}] connection.update →`, { connection, hasQR: !!qr, statusCode: lastDisconnect?.error?.output?.statusCode });

            // Return QR as data URL in the API response
            if (qr && mode === 'qr') {
                try {
                    debug(`Generating QR data URL for ${sessionId}`);
                    const dataUrl = await QRCode.toDataURL(qr, { scale: 8 });
                    settle(resolve, dataUrl);
                } catch (qrErr) {
                    logError(`QR generation failed for ${sessionId}:`, qrErr.message);
                    settle(reject, qrErr);
                }
            }

            if (connection === 'open') {
                const phone    = sock.user.id.split(':')[0];
                const shortId  = sessionId.slice(-4).toUpperCase();
                logInfo(`[${sessionId}] Session OPEN → ${phone}`);

                await updateStatusInDb(sessionId, 'online');

                // Read the raw creds.json from disk for the webhook payload
                const credsPath = `sessions/${sessionId}/creds.json`;
                let sessionData = '';
                if (fs.existsSync(credsPath)) {
                    sessionData = fs.readFileSync(credsPath, 'utf8');
                    debug(`Read creds.json from disk (${sessionData.length} bytes)`);
                } else {
                    sessionData = JSON.stringify(state.creds);
                    debug(`creds.json not on disk — using in-memory creds`);
                }

                await fireWebhook(sessionId, {
                    success:      true,
                    sessionId,
                    shortId,
                    number:       phone,
                    session_data: sessionData
                });
            }

            if (connection === 'close') {
                const statusCode      = lastDisconnect?.error?.output?.statusCode;
                const loggedOut       = statusCode === DisconnectReason.loggedOut;
                const wasRegistered   = state.creds.registered;

                logInfo(`[${sessionId}] Session CLOSED — code: ${statusCode}, registered: ${wasRegistered}, loggedOut: ${loggedOut}`);
                await updateStatusInDb(sessionId, 'offline');

                if (!loggedOut && wasRegistered) {
                    // Registered session dropped — reconnect silently
                    logInfo(`[${sessionId}] Reconnecting registered external session in 5s…`);
                    setTimeout(() => startExternalSession(sessionId, null, 'reconnect'), 5_000);
                } else {
                    // Pairing failed or logged out — clean up completely
                    activeSockets.delete(sessionId);
                    cleanSessionFolder(sessionId);

                    if (!settled) {
                        settle(reject, new Error(`Connection closed before authorization (code: ${statusCode})`));
                    }
                }
            }
        });
    });
}

// ─────────────────────────────────────────────
// ADMIN WHATSAPP ENGINE (Telegram bot flow)
// ─────────────────────────────────────────────
const isAdmin = (chatId) => ADMIN_IDS.includes(String(chatId));

async function startWhatsApp(sessionId, chatId, phoneNumber = null) {
    if (!isAdmin(chatId)) {
        debug(`Blocked non-admin access: ${chatId}`);
        return;
    }

    logInfo(`Admin startWhatsApp → sessionId: ${sessionId}, chatId: ${chatId}, phone: ${phoneNumber || 'QR'}`);

    const logger = pino({ level: 'silent' });
    const savedSession = await getSessionFromDb(sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(`sessions/${sessionId}`);

    if (savedSession && !state.creds?.registered && savedSession.session_data) {
        try {
            state.creds = JSON.parse(savedSession.session_data);
            debug(`Loaded existing session from DB for ${sessionId}`);
        } catch (e) {
            logError(`Failed to parse DB session for ${sessionId}:`, e.message);
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

    if (phoneNumber && !sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                debug(`Admin: requesting pairing code for ${phoneNumber}`);
                const code = await sock.requestPairingCode(phoneNumber);
                const formatted = code.match(/.{1,4}/g)?.join('-') || code;
                logInfo(`Admin pairing code for ${chatId}: ${formatted}`);
                await telegram.sendCode(chatId, formatted);
            } catch (err) {
                logError(`Admin pairing request failed for ${chatId}:`, err.message);
                await telegram.sendSimpleMessage(chatId, '❌ Failed to get pairing code. Check the number format or try again.');
                sock.ws.close();
            }
        }, 3_000);
    }

    sock.ev.on('creds.update', async () => {
        await saveCreds();
        debug(`Admin creds updated for ${sessionId}`);
        const credsJson = JSON.stringify(state.creds);
        const phone = sock.user ? sock.user.id.split(':')[0] : 'pending';
        await saveSessionToDb(sessionId, phone, credsJson);
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        debug(`[ADMIN:${sessionId}] connection.update →`, { connection, hasQR: !!qr });

        if (qr && !phoneNumber) {
            try {
                debug(`Admin: sending QR buffer for ${chatId}`);
                const buffer = await QRCode.toBuffer(qr, { scale: 8 });
                await telegram.sendQR(chatId, buffer);
            } catch (qrErr) {
                logError(`Admin QR generation failed:`, qrErr.message);
            }
        }

        if (connection === 'open') {
            const phone = sock.user.id.split(':')[0];
            logInfo(`[ADMIN:${sessionId}] Open → ${phone}`);
            await updateStatusInDb(sessionId, 'online');
            await telegram.sendSimpleMessage(chatId, `✅ WhatsApp connected: +${phone}`);
        }

        if (connection === 'close') {
            const statusCode    = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            logInfo(`[ADMIN:${sessionId}] Closed → code: ${statusCode}, willReconnect: ${shouldReconnect && state.creds.registered}`);

            await updateStatusInDb(sessionId, 'offline');

            if (shouldReconnect && state.creds.registered) {
                logInfo(`Admin session reconnecting in 5s: ${sessionId}`);
                setTimeout(() => startWhatsApp(sessionId, chatId, null), 5_000);
            } else {
                activeSockets.delete(sessionId);
                cleanSessionFolder(sessionId);

                if (!state.creds.registered) {
                    await telegram.sendSimpleMessage(chatId, '⏱ Pairing timed out or failed. Please try linking again.');
                } else {
                    await telegram.sendSimpleMessage(chatId, '🔌 WhatsApp session logged out. Please link again.');
                }
            }
        }
    });

    return sock;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function cleanSessionFolder(sessionId) {
    const path = `sessions/${sessionId}`;
    if (fs.existsSync(path)) {
        fs.rmSync(path, { recursive: true, force: true });
        debug(`Cleaned session folder: ${path}`);
    }
}

// ─────────────────────────────────────────────
// TELEGRAM SIGNAL LISTENERS (admin flow)
// ─────────────────────────────────────────────
process.on('REQUEST_QR_SCAN', async ({ chatId }) => {
    if (!isAdmin(chatId)) return;
    const sessionId = chatId.toString();
    cleanSessionFolder(sessionId);
    await startWhatsApp(sessionId, chatId);
});

process.on('SET_USER_STATE', ({ chatId, state }) => {
    if (!isAdmin(chatId)) return;
    userState.set(chatId, state);
    debug(`User state set → chatId: ${chatId}, state: ${state}`);
});

process.on('TELEGRAM_TEXT_INPUT', async ({ chatId, text }) => {
    if (!isAdmin(chatId)) return;

    const state = userState.get(chatId);
    debug(`Text input from ${chatId}, userState: ${state}, text: ${text}`);

    if (state === 'AWAITING_PHONE_NUMBER') {
        const phoneNumber = text.replace(/[^0-9]/g, '');
        if (phoneNumber.length >= 10) {
            userState.delete(chatId);
            const sessionId = chatId.toString();
            cleanSessionFolder(sessionId);
            await startWhatsApp(sessionId, chatId, phoneNumber);
        } else {
            await telegram.sendSimpleMessage(chatId, '❌ Invalid format. Send the number with country code, e.g. 234XXXXXXXXXX');
        }
    }
});

process.on('CHECK_WHATSAPP_STATUS', async ({ chatId }) => {
    if (!isAdmin(chatId)) return;

    const sessionId = chatId.toString();
    const sock = activeSockets.get(sessionId);
    debug(`Status check for ${chatId} — socket exists: ${!!sock}, user: ${sock?.user?.id}`);

    if (sock && sock.user) {
        const phone = sock.user.id.split(':')[0];
        await telegram.sendSimpleMessage(chatId, `📶 Status: *Online*\nConnected: +${phone}`);
    } else {
        await telegram.sendSimpleMessage(chatId, '🔴 Status: *Offline*');
    }
});

// ─────────────────────────────────────────────
// SYSTEM BOOT
// ─────────────────────────────────────────────
async function boot() {
    logInfo('Booting system…');
    debug('DEBUG mode is ON');

    if (ADMIN_IDS.length === 0) {
        logError('FATAL: No ADMIN_ID in .env — exiting');
        process.exit(1);
    }

    try {
        await initDb();
        telegram.initialize();
        logInfo(`System ready. Admin IDs: ${ADMIN_IDS.join(', ')}`);
        logInfo(`External API: POST /api/connect/pairing | POST /api/connect/qr`);
    } catch (err) {
        logError('Boot error:', err.message);
    }
}

boot();
