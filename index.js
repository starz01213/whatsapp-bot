require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const telegram = require('./telegramService');
const { initDb, saveSessionToDb, updateStatusInDb } = require('./db');

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

// APP_URL is THIS bot's URL (used to tell the external server where to send the webhook)
const APP_URL = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;

// EXTERNAL_API_URL is the URL of your main Baileys server
const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL; 

const userState = new Map(); // chatId → state string

// ─────────────────────────────────────────────
// AUTO-PING (KEEP-ALIVE)
// ─────────────────────────────────────────────
function startKeepAlive() {
    if (!APP_URL) return;
    logInfo(`Starting auto-ping to ${APP_URL} every 10 minutes`);
    setInterval(async () => {
        try { await axios.get(APP_URL); } catch (err) {}
    }, 10 * 60 * 1000); 
}

// ─────────────────────────────────────────────
// EXPRESS SERVER & WEBHOOK RECEIVER
// ─────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

app.get('/', (_req, res) => res.send('Telegram Controller Bot is running'));

// This is where the external Baileys server sends the session once it connects
app.post('/api/webhook', async (req, res) => {
    const { success, sessionId, number, session_data } = req.body;
    const chatId = req.query.chatId; // We pass the admin's chat ID in the query string!

    debug('Received Webhook ->', { success, sessionId, number, chatId });

    if (success && session_data) {
        logInfo(`External server successfully linked +${number}`);
        
        try {
            // Save the session data to THIS bot's database
            await saveSessionToDb(sessionId, number, session_data);
            await updateStatusInDb(sessionId, 'online');

            // Tell the specific admin who requested it that it worked!
            if (chatId) {
                await telegram.sendSimpleMessage(chatId, `✅ WhatsApp successfully connected via External Service: +${number}`);
            }
        } catch (err) {
            logError('Error saving webhook session data:', err.message);
        }
    }

    // Always respond 200 OK so the external server knows we got it
    res.status(200).json({ received: true });
});

app.listen(PORT, () => logInfo(`Server listening on port ${PORT}`));

// ─────────────────────────────────────────────
// TELEGRAM SIGNAL LISTENERS
// ─────────────────────────────────────────────

process.on('REQUEST_QR_SCAN', async ({ chatId }) => {
    if (!isAdmin(chatId)) return;
    if (!EXTERNAL_API_URL) return telegram.sendSimpleMessage(chatId, '❌ EXTERNAL_API_URL not set in .env');

    try {
        await telegram.sendSimpleMessage(chatId, '⏳ Requesting QR Code from external server...');

        // Tell the external server to send the result to our webhook, and include the chatId
        const webhookUrl = `${APP_URL}/api/webhook?chatId=${chatId}`;
        
        const response = await axios.post(`${EXTERNAL_API_URL}/api/connect/qr`, {
            callbackUrl: webhookUrl
        });

        if (response.data.success && response.data.qr) {
            // Convert the Base64 QR string to a Buffer for Telegram
            const base64Data = response.data.qr.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            await telegram.sendQR(chatId, buffer);
        } else {
            await telegram.sendSimpleMessage(chatId, '❌ Failed to generate QR on external server.');
        }
    } catch (err) {
        logError('QR Request Error:', err.message);
        await telegram.sendSimpleMessage(chatId, `❌ External server error: ${err.message}`);
    }
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
            if (!EXTERNAL_API_URL) return telegram.sendSimpleMessage(chatId, '❌ EXTERNAL_API_URL not set.');

            try {
                await telegram.sendSimpleMessage(chatId, `⏳ Requesting pairing code for +${phoneNumber}...`);

                const webhookUrl = `${APP_URL}/api/webhook?chatId=${chatId}`;
                
                const response = await axios.post(`${EXTERNAL_API_URL}/api/connect/pairing`, {
                    number: phoneNumber,
                    callbackUrl: webhookUrl
                });

                if (response.data.success && response.data.pairingCode) {
                    await telegram.sendSimpleMessage(chatId, `🔑 Pairing Code: *${response.data.pairingCode}*\n\nEnter this on your WhatsApp to link.`);
                } else {
                    await telegram.sendSimpleMessage(chatId, '❌ Failed to generate pairing code on external server.');
                }
            } catch (err) {
                logError('Pairing Request Error:', err.message);
                await telegram.sendSimpleMessage(chatId, `❌ External server error: ${err.message}`);
            }

        } else {
            await telegram.sendSimpleMessage(chatId, '❌ Invalid format. Include country code, e.g. 234XXXXXXXXXX');
        }
    }
});

process.on('CHECK_WHATSAPP_STATUS', async ({ chatId }) => {
    if (!isAdmin(chatId)) return;
    // For this lightweight bot, checking status just means checking if it exists in the local DB
    await telegram.sendSimpleMessage(chatId, 'ℹ️ Status check disabled on lightweight client. Check database for active sessions.');
});

process.on('UNLINK_WHATSAPP', async ({ chatId }) => {
    if (!isAdmin(chatId)) return;
    // Optional: If your external API has a /disconnect route, call it here. 
    // Otherwise, just delete local DB state.
    await updateStatusInDb(chatId.toString(), 'offline');
    await telegram.sendSimpleMessage(chatId, '🗑️ Local session marked as offline.');
});

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────
async function boot() {
    logInfo('Booting Lightweight Telegram Controller...');
    
    if (ADMIN_IDS.length === 0) {
        logError('FATAL: No ADMIN_ID in .env - exiting');
        process.exit(1);
    }

    if (!APP_URL || !EXTERNAL_API_URL) {
        logError('WARNING: APP_URL or EXTERNAL_API_URL is missing in .env. Links will fail.');
    }

    try {
        await initDb();
        await telegram.initialize(); 
        startKeepAlive(); 
        
        logInfo(`Ready. Admins: ${ADMIN_IDS.join(', ')}`);
        logInfo(`Listening for Webhooks at: POST /api/webhook`);
    } catch (err) {
        logError('Boot error:', err.message);
    }
}

boot();
