require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const telegram = require('./telegramService');
const { initDb, saveSessionToDb, updateStatusInDb } = require('./db');

// Load configurations from .env
const ADMIN_IDS = (process.env.ADMIN_ID || "").split(",").map(id => id.trim());
const APP_URL = process.env.APP_URL; // Your Render URL (e.g., https://my-bot.onrender.com)
const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL; // The server hosting the WhatsApp engine

const userState = new Map();

// --- EXPRESS SERVER & WEBHOOKS ---
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Basic health check
app.get('/', (req, res) => res.send('Telegram Bot Command Center is active'));

// The endpoint where the external API will send the creds.json
app.post('/webhook/session', async (req, res) => {
    const { success, sessionId, shortId, number, session_data } = req.body;
    
    if (!success || !session_data) {
        console.error("Webhook received invalid data:", req.body);
        return res.status(400).json({ error: "Invalid payload" });
    }

    console.log(`[WEBHOOK] Session data received for +${number}`);

    try {
        // Save to PostgreSQL
        await saveSessionToDb(sessionId, number, session_data);
        await updateStatusInDb(sessionId, 'online');

        // Optional: Save to local folder just in case
        const sessionPath = path.join(__dirname, 'sessions', sessionId);
        if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), session_data);

        // Notify Admin on Telegram
        await telegram.sendSimpleMessage(null, `[SUCCESS] New WhatsApp Linked!\n\nNumber: +${number}\nSession ID: \`${sessionId}\``);
        
        res.status(200).json({ success: true, message: "Session saved securely" });
    } catch (err) {
        console.error("[WEBHOOK ERROR]", err);
        res.status(500).json({ error: "Failed to process session data" });
    }
});

app.listen(PORT, () => {
    console.log('Express API & Webhook receiver listening on port ' + PORT);
});

// --- RENDER AUTO-PING (10 MIN) ---
if (APP_URL) {
    setInterval(() => {
        fetch(APP_URL)
            .then(() => console.log(`[Auto-Ping] Pinged ${APP_URL} successfully to keep awake.`))
            .catch(err => console.error(`[Auto-Ping] Failed:`, err.message));
    }, 10 * 60 * 1000); // 10 minutes in milliseconds
} else {
    console.warn("[WARNING] APP_URL is not set in .env. Auto-ping disabled.");
}

// --- TELEGRAM SIGNAL LISTENERS ---
const isAdmin = (chatId) => ADMIN_IDS.includes(String(chatId));

// Request QR Code from External API
process.on('REQUEST_QR_SCAN', async ({ chatId }) => {
    if (!isAdmin(chatId)) return;
    if (!APP_URL || !EXTERNAL_API_URL) return telegram.sendSimpleMessage(chatId, "[ERROR] APP_URL or EXTERNAL_API_URL is missing in .env");

    try {
        const callbackUrl = `${APP_URL}/webhook/session`;
        const response = await fetch(`${EXTERNAL_API_URL}/api/connect/qr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callbackUrl })
        });

        const data = await response.json();
        if (data.success && data.qr) {
            // Convert base64 image string to Buffer for Telegram
            const base64Data = data.qr.replace(/^data:image\/png;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            await telegram.sendQR(chatId, buffer);
        } else {
            await telegram.sendSimpleMessage(chatId, "[ERROR] Failed to generate QR Code from external server.");
        }
    } catch (error) {
        console.error(error);
        await telegram.sendSimpleMessage(chatId, "[ERROR] External API Error: " + error.message);
    }
});

// Set Telegram input context
process.on('SET_USER_STATE', ({ chatId, state }) => {
    if (!isAdmin(chatId)) return;
    userState.set(chatId, state);
});

// Request Pairing Code from External API
process.on('TELEGRAM_TEXT_INPUT', async ({ chatId, text }) => {
    if (!isAdmin(chatId)) return;
    
    const state = userState.get(chatId);
    if (state === 'AWAITING_PHONE_NUMBER') {
        const phoneNumber = text.replace(/[^0-9]/g, '');
        if (phoneNumber.length >= 10) {
            userState.delete(chatId);
            
            if (!APP_URL || !EXTERNAL_API_URL) return telegram.sendSimpleMessage(chatId, "[ERROR] APP_URL or EXTERNAL_API_URL is missing in .env");

            try {
                const callbackUrl = `${APP_URL}/webhook/session`;
                const response = await fetch(`${EXTERNAL_API_URL}/api/connect/pairing`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ number: phoneNumber, callbackUrl })
                });

                const data = await response.json();
                if (data.success && data.pairingCode) {
                    await telegram.sendCode(chatId, data.pairingCode);
                } else {
                    await telegram.sendSimpleMessage(chatId, "[ERROR] Failed to request pairing code from external server.");
                }
            } catch (error) {
                console.error(error);
                await telegram.sendSimpleMessage(chatId, "[ERROR] External API Error: " + error.message);
            }
        } else {
            await telegram.sendSimpleMessage(chatId, "Invalid format. Send number with country code.");
        }
    }
});

// Status check (Now polls local database instead of socket)
process.on('CHECK_WHATSAPP_STATUS', async ({ chatId }) => {
    if (!isAdmin(chatId)) return;
    await telegram.sendSimpleMessage(chatId, "Your bot is acting as an API client. Please check your external server logs or local database for active session counts.");
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
