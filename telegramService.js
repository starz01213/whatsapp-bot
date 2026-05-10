const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────
// DEBUG LOGGER
// ─────────────────────────────────────────────
const DEBUG    = process.env.DEBUG === 'true';
const debug    = (...args) => { if (DEBUG) console.log('[DEBUG][TG]', new Date().toISOString(), ...args); };
const logInfo  = (...args) => console.log('[INFO ][TG]', new Date().toISOString(), ...args);
const logError = (...args) => console.error('[ERROR][TG]', new Date().toISOString(), ...args);

// ─────────────────────────────────────────────
// BOT INIT
// ─────────────────────────────────────────────
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const adminIds = (process.env.ADMIN_ID || "")
    .split(",")
    .map(id => id.trim())
    .filter(Boolean);

const isAdmin = (chatId) => adminIds.includes(String(chatId));

// Local state tracking to prevent sending download URLs to WhatsApp
const localStates = {};

// ─────────────────────────────────────────────
// KEYBOARDS
// ─────────────────────────────────────────────
const mainMenuKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "Link WhatsApp" }],
            [{ text: "Download Media" }]
        ],
        resize_keyboard: true
    }
};

const linkMethodMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "Scan QR Code",     callback_data: "link_qr"   }],
            [{ text: "Use Pairing Code", callback_data: "link_code" }]
        ]
    }
};

const afterCodeMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "Try QR Code Instead", callback_data: "link_qr" }]
        ]
    }
};

const afterQRMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "Use Pairing Code Instead", callback_data: "link_code" }]
        ]
    }
};

// ─────────────────────────────────────────────
// MESSAGE HANDLER
// ─────────────────────────────────────────────
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text   = msg.text || '';

    debug(`Message from ${chatId}: "${text}"`);

    if (!isAdmin(chatId)) {
        debug(`Ignored — not admin: ${chatId}`);
        return;
    }

    if (text === '/start') {
        logInfo(`/start from ${chatId}`);
        await bot.sendMessage(
            chatId,
            `*Welcome to WhatsApp Bot Command Center*\n\nChoose an option below:`,
            { parse_mode: 'Markdown', ...mainMenuKeyboard }
        );
        return;
    }

    if (text === 'Link WhatsApp') {
        await bot.sendMessage(chatId, 'Choose your connection method:', linkMethodMenu);
        return;
    }

    if (text === 'Download Media') {
        localStates[chatId] = 'AWAITING_DOWNLOAD_URL';
        await bot.sendMessage(chatId, 'Send the URL of the media you want to download:');
        return;
    }

    // --- DOWNLOAD MEDIA INTERCEPTOR ---
    if (localStates[chatId] === 'AWAITING_DOWNLOAD_URL') {
        localStates[chatId] = null; // Clear state immediately
        
        // Smart URL Extractor: Finds the link even if there is text around it
        const urlMatch = text.match(/(https?:\/\/[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?)/i);

        if (!urlMatch) {
            await bot.sendMessage(chatId, '[ERROR] Could not detect a valid link. Please click Download Media to try again.');
            return;
        }

        let targetUrl = urlMatch[0];
        
        // Auto-fix links that are missing the https:// prefix (e.g. www.tiktok.com)
        if (!targetUrl.startsWith('http')) {
            targetUrl = 'https://' + targetUrl;
        }

        const loadMsg = await bot.sendMessage(chatId, '[SYSTEM] Downloading...');

        try {
            const apiUrl = process.env.DOWNLOAD_API_URL || 'https://YOUR_API_APP_HERE.herokuapp.com';
            const requestUrl = `${apiUrl}/api/download?url=${encodeURIComponent(targetUrl)}`;

            const response = await axios({
                method: 'GET',
                url: requestUrl,
                responseType: 'stream'
            });

            // Handle TikTok JSON Image Arrays
            if (response.headers['content-type'].includes('application/json')) {
                let jsonData = '';
                response.data.on('data', chunk => jsonData += chunk);
                response.data.on('end', async () => {
                    try {
                        const parsed = JSON.parse(jsonData);
                        if (parsed.type === "images") {
                            await bot.editMessageText('[SYSTEM] Carousel detected. Sending images...', { chat_id: chatId, message_id: loadMsg.message_id });
                            
                            let mediaGroup = [];
                            for (let i = 0; i < parsed.urls.length; i++) {
                                mediaGroup.push({ type: 'photo', media: parsed.urls[i] });
                                
                                if (mediaGroup.length === 10 || i === parsed.urls.length - 1) {
                                    await bot.sendMediaGroup(chatId, mediaGroup);
                                    mediaGroup = [];
                                }
                            }
                            await bot.deleteMessage(chatId, loadMsg.message_id).catch(()=>{});
                        }
                    } catch (err) {
                        bot.editMessageText(`[ERROR] Failed to parse image data: ${err.message}`, { chat_id: chatId, message_id: loadMsg.message_id });
                    }
                });
                return;
            }

            // Handle Video Streams
            const tempPath = path.join(__dirname, `dl_temp_${Date.now()}.mp4`);
            const writer = fs.createWriteStream(tempPath);
            
            response.data.pipe(writer);

            writer.on('finish', async () => {
                await bot.editMessageText('[SYSTEM] Download complete. Uploading to Telegram...', { chat_id: chatId, message_id: loadMsg.message_id });
                await bot.sendVideo(chatId, tempPath);
                await bot.deleteMessage(chatId, loadMsg.message_id).catch(()=>{});
                
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); 
            });

            writer.on('error', (err) => {
                bot.editMessageText(`[ERROR] File write failed: ${err.message}`, { chat_id: chatId, message_id: loadMsg.message_id });
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            });

        } catch (error) {
            bot.editMessageText(`[ERROR] Service unreachable or failed: ${error.message}`, { chat_id: chatId, message_id: loadMsg.message_id });
        }
        return;
    }

    if (text && !text.startsWith('/')) {
        debug(`Forwarding text input from ${chatId}`);
        process.emit('TELEGRAM_TEXT_INPUT', { chatId, text });
    }
});

// ─────────────────────────────────────────────
// CALLBACK QUERY HANDLER
// ─────────────────────────────────────────────
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data   = query.data;

    debug(`Callback from ${chatId}: "${data}"`);
    await bot.answerCallbackQuery(query.id);

    if (!isAdmin(chatId)) return;

    if (data === 'link_qr') {
        logInfo(`QR scan requested by ${chatId}`);
        await bot.sendMessage(chatId, 'Initializing QR Code... please wait.');
        process.emit('REQUEST_QR_SCAN', { chatId });
        return;
    }

    if (data === 'link_code') {
        logInfo(`Pairing code flow started by ${chatId}`);
        process.emit('SET_USER_STATE', { chatId, state: 'AWAITING_PHONE_NUMBER' });
        await bot.sendMessage(
            chatId,
            'Send your WhatsApp number with country code:\n\n_Example: 234XXXXXXXXXX_',
            { parse_mode: 'Markdown' }
        );
        return;
    }
});

// ─────────────────────────────────────────────
// POLLING ERROR
// ─────────────────────────────────────────────
bot.on('polling_error', (err) => {
    if (err.message.includes('409')) {
        debug('Polling 409 — old instance still shutting down, self-resolves shortly');
    } else {
        logError('Polling error:', err.message);
    }
});

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
module.exports = {
    bot,
    initialize: async () => {
        logInfo('Clearing stale Telegram session...');
        try {
            await bot.deleteWebhook({ drop_pending_updates: true });
            logInfo('Webhook cleared, pending updates dropped');
        } catch (err) {
            logError('deleteWebhook error:', err.message);
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            await bot.startPolling({ restart: false });
            logInfo(`Polling active — admins: ${adminIds.join(', ')}`);
        } catch (err) {
            logError('startPolling error:', err.message);
        }
    },

        sendCode: async (chatId, code) => {
        debug(`sendCode -> ${chatId}: ${code}`);
        try {
            await bot.sendMessage(
                chatId,
                `Pairing Code Generated\n\nCode: *${code}*\n\nTap the button below to copy the code, then open WhatsApp to link.`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            // This button natively copies the text when tapped
                            [{ text: `Copy Code: ${code}`, copy_text: { text: code } }],
                            [{ text: "Try QR Code Instead", callback_data: "link_qr" }]
                        ]
                    }
                }
            );
        } catch (err) {
            logError(`sendCode failed for ${chatId}:`, err.message);
        }
    },


    sendQR: async (chatId, imageBuffer) => {
        debug(`sendQR -> ${chatId} (${imageBuffer.length} bytes)`);
        try {
            await bot.sendPhoto(chatId, imageBuffer, {
                caption: 'Scan this in *WhatsApp -> Linked Devices -> Link a Device*',
                parse_mode: 'Markdown',
                ...afterQRMenu
            });
        } catch (err) {
            logError(`sendQR failed for ${chatId}:`, err.message);
        }
    },

    sendSimpleMessage: async (chatId, text) => {
        debug(`sendSimpleMessage -> ${chatId}: "${String(text).slice(0, 60)}"`);
        try {
            await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        } catch (err) {
            logError(`Markdown send failed for ${chatId}, retrying plain`);
            try {
                await bot.sendMessage(chatId, text);
            } catch (e) {
                logError(`sendSimpleMessage totally failed for ${chatId}:`, e.message);
            }
        }
    }
};
