require('dotenv').config();
const {
    useMultiFileAuthState,
    makeWASocket,
    DisconnectReason,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino   = require('pino');
const QRCode = require('qrcode');
const fs     = require('fs');
const express = require('express');
const axios   = require('axios');
const telegram = require('./telegramService');
const { initDb, saveSessionToDb, getSessionFromDb, updateStatusInDb } = require('./db');

// ─────────────────────────────────────────────
// DEBUG LOGGER
// ─────────────────────────────────────────────
const DEBUG    = process.env.DEBUG === 'true';
const debug    = (...args) => { if (DEBUG) console.log('[DEBUG]', new Date().toISOString(), ...args); };
const logInfo  = (...args) => console.log('[INFO] ', new Date().toISOString(), ...args);
const logError = (...args) => console.error('[ERROR]', new Date().toISOString(), ...args);

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const ADMIN_IDS = (process.env.ADMIN_ID || "").split(",").map(id => id.trim()).filter(Boolean);
const isAdmin   = (chatId) => ADMIN_IDS.includes(String(chatId));

// Automatically uses Render's assigned URL if deployed there, or falls back to custom APP_URL
const APP_URL   = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;

const userState        = new Map(); // chatId    → state string
const activeSockets    = new Map(); // sessionId → WASocket
const callbackRegistry = new Map(); // sessionId → callbackUrl

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function ensureSessionDir(sessionId) {
    const dir = `sessions/${sessionId}`;
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        debug(`Created session dir: ${dir}`);
    }
}

function cleanSessionFolder(sessionId) {
    const path = `sessions/${sessionId}`;
    if (fs.existsSync(path)) {
        fs.rmSync(path, { recursive: true, force: true });
        debug(`Cleaned session folder: ${path}`);
    }
}

// ─────────────────────────────────────────────
// AUTO-PING (KEEP-ALIVE)
// ─────────────────────────────────────────────
function startKeepAlive() {
    if (!APP_URL) {
        debug('No APP_URL or RENDER_EXTERNAL_URL found. Auto-ping disabled.');
        return;
    }
    
    logInfo(`Starting auto-ping to ${APP_URL} every 10 minutes`);
    
    // Ping every 10 minutes (600,000 milliseconds)
    setInterval(async () => {
        try {
            const res = await axios.get(APP_URL);
            debug(`Auto-ping successful: HTTP ${res.status}`);
        } catch (err) {
            logError(`Auto-ping failed:`, err.message);
        }
    }, 10 * 60 * 1000); 
}

// ─────────────────────────────────────────────
// EXPRESS SERVER
// ─────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

app.get('/', (_req, res) => res.send('Bot is running'));

// ── POST /api/connect/pairing ─────────────────
app.post('/api/connect/pairing', async (req, res) => {
    const { number, callbackUrl } = req.body;
    debug('POST /api/connect/pairing →', { number, callbackUrl });

    if (!number || !callbackUrl)
        return res.status(400).json({ success: false, error: 'number and callbackUrl are required' });

    const phoneNumber = number.replace(/[^0-9]/g, '');
    if (phoneNumber.length < 10)
        return res.status(400).json({ success: false, error: 'Invalid phone number — include country code' });

    const sessionId = `ext_${Date.now()}`;
    callbackRegistry.set(sessionId, callbackUrl);
    logInfo(`External pairing request → ${sessionId}, phone: ${phoneNumber}`);

    try {
        const pairingCode = await startExternalSession(sessionId, phoneNumber, 'pairing');
        return res.json({ success: true, sessionId, pairingCode });
    } catch (err) {
        logError(`Pairing failed for ${sessionId}:`, err.message);
        callbackRegistry.delete(sessionId);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ── POST /api/connect/qr ──────────────────────
app.post('/api/connect/qr', async (req, res) => {
    const { callbackUrl } = req.body;
    debug('POST /api/connect/qr →', { callbackUrl });

    if (!callbackUrl)
        return res.status(400).json({ success: false, error: 'callbackUrl is required' });

    const sessionId = `ext_qr_${Date.now()}`;
    callbackRegistry.set(sessionId, callbackUrl);
    logInfo(`External QR request → ${sessionId}`);

    try {
        const qrDataUrl = await startExternalSession(sessionId, null, 'qr');
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
// ─────────────────────────────────────────────
async function fireWebhook(sessionId, payload) {
    const callbackUrl = callbackRegistry.get(sessionId);
    if (!callbackUrl) {
        debug(`fireWebhook: no callbackUrl registered for ${sessionId}`);
        return;
    }
    logInfo(`Firing webhook → ${callbackUrl} [${sessionId}]`);
    try {
        const resp = await axios.post(callbackUrl, payload, {
            timeout: 10_000,
            headers: { 'Content-Type': 'application/json' }
        });
        logInfo(`Webhook delivered [${sessionId}] — HTTP ${resp.status}`);
        callbackRegistry.delete(sessionId);
    } catch (err) {
        logError(`Webhook FAILED [${sessionId}]:`, err.message);
    }
}

// ─────────────────────────────────────────────
// EXTERNAL SESSION ENGINE
// ─────────────────────────────────────────────
async function startExternalSession(sessionId, phoneNumber, mode) {
    return new Promise(async (resolve, reject) => {
        debug(`startExternalSession → ${sessionId}, mode: ${mode}`);

        ensureSessionDir(sessionId);

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

        let settled = false;
        const settle = (fn, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(responseTimeout);
            fn(value);
        };

        const responseTimeout = setTimeout(() => {
            logError(`Timeout waiting for ${mode} [${sessionId}]`);
            sock.ws.close();
            settle(reject, new Error('Timed out — no QR or pairing code received within 30s'));
        }, 30_000);

        if (mode === 'pairing' && phoneNumber) {
            setTimeout(async () => {
                try {
                    debug(`Requesting pairing code for ${phoneNumber}`);
                    const code      = await sock.requestPairingCode(phoneNumber);
                    const formatted = code.match(/.{1,4}/g)?.join('-') || code;
                    logInfo(`Pairing code [${sessionId}]: ${formatted}`);
                    settle(resolve, formatted);
                } catch (err) {
                    logError(`requestPairingCode failed [${sessionId}]:`, err.message);
                    sock.ws.close();
                    settle(reject, err);
                }
            }, 3_000);
        }

        sock.ev.on('creds.update', async () => {
            try {
                ensureSessionDir(sessionId);
                await saveCreds();
                debug(`Creds updated [${sessionId}]`);
                const phone     = sock.user ? sock.user.id.split(':')[0] : 'pending';
                const credsJson = JSON.stringify(state.creds);
                await saveSessionToDb(sessionId, phone, credsJson);
            } catch (err) {
                logError(`creds.update write failed [${sessionId}]:`, err.message);
            }
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            debug(`[${sessionId}] connection.update →`, {
                connection,
                hasQR: !!qr,
                code: lastDisconnect?.error?.output?.statusCode
            });

            if (qr && mode === 'qr') {
                try {
                    const dataUrl = await QRCode.toDataURL(qr, { scale: 8 });
                    settle(resolve, dataUrl);
                } catch (qrErr) {
                    logError(`QR generation failed [${sessionId}]:`, qrErr.message);
                    settle(reject, qrErr);
                }
            }

            if (connection === 'open') {
                const phone   = sock.user.id.split(':')[0];
                const shortId = sessionId.slice(-4).toUpperCase();
                logInfo(`[${sessionId}] OPEN → +${phone}`);
                await updateStatusInDb(sessionId, 'online');

                const credsPath = `sessions/${sessionId}/creds.json`;
                const sessionData = fs.existsSync(credsPath)
                    ? fs.readFileSync(credsPath, 'utf8')
                    : JSON.stringify(state.creds);

                await fireWebhook(sessionId, {
                    success:      true,
                    sessionId,
                    shortId,
                    number:       phone,
                    session_data: sessionData
                });
            }

            if (connection === 'close') {
                const statusCode    = lastDisconnect?.error?.output?.statusCode;
                const loggedOut     = statusCode === DisconnectReason.loggedOut;
                const wasRegistered = state.creds.registered;

                logInfo(`[${sessionId}] CLOSE → code: ${statusCode}, registered: ${wasRegistered}`);
                await updateStatusInDb(sessionId, 'offline');

                if (!loggedOut && wasRegistered) {
                    logInfo(`[${sessionId}] Reconnecting in 5s…`);
                    setTimeout(() => startExternalSession(sessionId, null, 'reconnect'), 5_000);
                } else {
                    activeSockets.delete(sessionId);
                    cleanSessionFolder(sessionId);
                    if (!settled) {
                        settle(reject, new Error(`Connection closed before auth (code: ${statusCode})`));
                    }
                }
            }
        });
    });
}

// ─────────────────────────────────────────────
// ADMIN WHATSAPP ENGINE (Telegram bot flow)
// ─────────────────────────────────────────────
async function startWhatsApp(sessionId, chatId, phoneNumber = null) {
    if (!isAdmin(chatId)) {
        debug(`Blocked non-admin: ${chatId}`);
        return;
    }

    logInfo(`startWhatsApp → ${sessionId}, chatId: ${chatId}, phone: ${phoneNumber || 'QR'}`);

    ensureSessionDir(sessionId);

    const logger       = pino({ level: 'silent' });
    const savedSession = await getSessionFromDb(sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(`sessions/${sessionId}`);

    if (savedSession && !state.creds?.registered && savedSession.session_data) {
        try {
            state.creds = JSON.parse(savedSession.session_data);
            debug(`Loaded DB session for ${sessionId}`);
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
                const code      = await sock.requestPairingCode(phoneNumber);
                const formatted = code.match(/.{1,4}/g)?.join('-') || code;
                logInfo(`Admin pairing code [${chatId}]: ${formatted}`);
                await telegram.sendCode(chatId, formatted);
            } catch (err) {
                logError(`Admin pairing code failed [${chatId}]:`, err.message);
                await telegram.sendSimpleMessage(chatId, 'Failed to get pairing code. Check the number format or try again.');
                sock.ws.close();
            }
        }, 3_000);
    }

    sock.ev.on('creds.update', async () => {
        try {
            ensureSessionDir(sessionId);
            await saveCreds();
            debug(`Admin creds updated [${sessionId}]`);
            const phone     = sock.user ? sock.user.id.split(':')[0] : 'pending';
            const credsJson = JSON.stringify(state.creds);
            await saveSessionToDb(sessionId, phone, credsJson);
        } catch (err) {
            logError(`Admin creds.update write failed [${sessionId}]:`, err.message);
        }
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        debug(`[ADMIN:${sessionId}] connection.update →`, {
            connection,
            hasQR: !!qr,
            code: lastDisconnect?.error?.output?.statusCode
        });

        if (qr && !phoneNumber) {
            try {
                const buffer = await QRCode.toBuffer(qr, { scale: 8 });
                await telegram.sendQR(chatId, buffer);
            } catch (qrErr) {
                logError(`Admin QR generation failed:`, qrErr.message);
            }
        }

        if (connection === 'open') {
            const phone = sock.user.id.split(':')[0];
            logInfo(`[ADMIN:${sessionId}] OPEN → +${phone}`);
            await updateStatusInDb(sessionId, 'online');
            await telegram.sendSimpleMessage(chatId, `WhatsApp connected: +${phone}`);
        }

        if (connection === 'close') {
            const statusCode      = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            logInfo(`[ADMIN:${sessionId}] CLOSE → code: ${statusCode}, registered: ${state.creds.registered}`);

            await updateStatusInDb(sessionId, 'offline');

            if (shouldReconnect && state.creds.registered) {
                logInfo(`Admin reconnecting [${sessionId}] in 5s…`);
                setTimeout(() => startWhatsApp(sessionId, chatId, null), 5_000);
            } else {
                activeSockets.delete(sessionId);
                cleanSessionFolder(sessionId);

                if (!state.creds.registered) {
                    await telegram.sendSimpleMessage(chatId, 'Pairing timed out or failed. Please try linking again.');
                } else {
                    await telegram.sendSimpleMessage(chatId, 'Session logged out. Please link again.');
                }
            }
        }
    });

    return sock;
}

// ─────────────────────────────────────────────
// TELEGRAM SIGNAL LISTENERS
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
    debug(`User state set → ${chatId}: ${state}`);
});

process.on('TELEGRAM_TEXT_INPUT', async ({ chatId, text }) => {
    if (!isAdmin(chatId)) return;
    const state = userState.get(chatId);
    debug(`Text input [${chatId}], state: ${state}`);

    if (state === 'AWAITING_PHONE_NUMBER') {
        const phoneNumber = text.replace(/[^0-9]/g, '');
        if (phoneNumber.length >= 10) {
            userState.delete(chatId);
            const sessionId = chatId.toString();
            cleanSessionFolder(sessionId);
            await startWhatsApp(sessionId, chatId, phoneNumber);
        } else {
            await telegram.sendSimpleMessage(chatId, 'Invalid format. Include country code, e.g. 234XXXXXXXXXX');
        }
    }
});

process.on('CHECK_WHATSAPP_STATUS', async ({ chatId }) => {
    if (!isAdmin(chatId)) return;
    const sessionId = chatId.toString();
    const sock      = activeSockets.get(sessionId);
    debug(`Status check [${chatId}] — socket: ${!!sock}, user: ${sock?.user?.id}`);

    if (sock && sock.user) {
        const phone = sock.user.id.split(':')[0];
        await telegram.sendSimpleMessage(chatId, `Status: *Online*\nConnected: +${phone}`);
    } else {
        await telegram.sendSimpleMessage(chatId, 'Status: *Offline*');
    }
});

process.on('UNLINK_WHATSAPP', async ({ chatId }) => {
    if (!isAdmin(chatId)) return;
    const sessionId = chatId.toString();
    const sock      = activeSockets.get(sessionId);

    logInfo(`Unlink requested by ${chatId}`);
    if (sock) {
        try { await sock.logout(); } catch (_) {}
        activeSockets.delete(sessionId);
    }
    cleanSessionFolder(sessionId);
    await updateStatusInDb(sessionId, 'offline');
    await telegram.sendSimpleMessage(chatId, 'WhatsApp unlinked. Use *Link WhatsApp* to connect again.');
});

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────
async function boot() {
    logInfo('Booting…');
    debug('DEBUG mode ON');

    if (ADMIN_IDS.length === 0) {
        logError('FATAL: No ADMIN_ID in .env — exiting');
        process.exit(1);
    }

    if (!fs.existsSync('sessions')) {
        fs.mkdirSync('sessions');
        debug('Created sessions/ directory');
    }

    try {
        await initDb();
        await telegram.initialize(); 
        startKeepAlive(); // Start pinging Render to keep instances awake
        
        logInfo(`Ready. Admins: ${ADMIN_IDS.join(', ')}`);
        logInfo(`External API: POST /api/connect/pairing | POST /api/connect/qr`);
    } catch (err) {
        logError('Boot error:', err.message);
    }
}

boot();
