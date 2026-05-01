const TelegramBot = require('node-telegram-bot-api');

// ─────────────────────────────────────────────
// DEBUG LOGGER
// ─────────────────────────────────────────────
const DEBUG    = process.env.DEBUG === 'true';
const debug    = (...args) => { if (DEBUG) console.log('[DEBUG][TG]', new Date().toISOString(), ...args); };
const logInfo  = (...args) => console.log('[INFO ][TG]', new Date().toISOString(), ...args);
const logError = (...args) => console.error('[ERROR][TG]', new Date().toISOString(), ...args);

// ─────────────────────────────────────────────
// BOT INIT
// polling: false — we start polling manually inside initialize()
// This prevents the 409 conflict during Render's zero-downtime deploys
// ─────────────────────────────────────────────
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

const adminIds = (process.env.ADMIN_ID || "")
    .split(",")
    .map(id => id.trim())
    .filter(Boolean);

const isAdmin = (chatId) => adminIds.includes(String(chatId));

// ─────────────────────────────────────────────
// KEYBOARDS
// ─────────────────────────────────────────────
const mainMenuKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "🔗 Link WhatsApp" }],
            [{ text: "📶 Status" }, { text: "⚙️ Settings" }]
        ],
        resize_keyboard: true
    }
};

const linkMethodMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "📷 Scan QR Code",     callback_data: "link_qr"   }],
            [{ text: "🔢 Use Pairing Code", callback_data: "link_code" }]
        ]
    }
};

const afterCodeMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "📷 Try QR Code Instead", callback_data: "link_qr" }]
        ]
    }
};

const afterQRMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "🔢 Use Pairing Code Instead", callback_data: "link_code" }]
        ]
    }
};

const settingsMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "🔄 Reconnect Session", callback_data: "settings_reconnect" }],
            [{ text: "🗑️ Unlink WhatsApp",   callback_data: "settings_unlink"    }],
            [{ text: "❌ Close",              callback_data: "settings_close"     }]
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
            `👋 *Welcome to WhatsApp Bot Command Center*\n\nChoose an option below:`,
            { parse_mode: 'Markdown', ...mainMenuKeyboard }
        );
        return;
    }

    if (text === '🔗 Link WhatsApp' || text === 'Link WhatsApp') {
        await bot.sendMessage(chatId, '🔌 Choose your connection method:', linkMethodMenu);
        return;
    }

    if (text === '📶 Status' || text === 'Status') {
        process.emit('CHECK_WHATSAPP_STATUS', { chatId });
        return;
    }

    if (text === '⚙️ Settings' || text === 'Settings') {
        await bot.sendMessage(chatId, '⚙️ *Settings*\n\nWhat would you like to do?', {
            parse_mode: 'Markdown',
            ...settingsMenu
        });
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
    const msgId  = query.message.message_id;
    const data   = query.data;

    debug(`Callback from ${chatId}: "${data}"`);
    await bot.answerCallbackQuery(query.id);

    if (!isAdmin(chatId)) return;

    if (data === 'link_qr') {
        logInfo(`QR scan requested by ${chatId}`);
        await bot.sendMessage(chatId, '⏳ Initializing QR Code… please wait.');
        process.emit('REQUEST_QR_SCAN', { chatId });
        return;
    }

    if (data === 'link_code') {
        logInfo(`Pairing code flow started by ${chatId}`);
        process.emit('SET_USER_STATE', { chatId, state: 'AWAITING_PHONE_NUMBER' });
        await bot.sendMessage(
            chatId,
            '📱 Send your WhatsApp number with country code:\n\n_Example: 234XXXXXXXXXX_',
            { parse_mode: 'Markdown' }
        );
        return;
    }

    if (data === 'settings_reconnect') {
        logInfo(`Manual reconnect requested by ${chatId}`);
        await bot.deleteMessage(chatId, msgId).catch(() => {});
        await bot.sendMessage(chatId, '🔄 Reconnecting… please wait.');
        process.emit('REQUEST_QR_SCAN', { chatId });
        return;
    }

    if (data === 'settings_unlink') {
        logInfo(`Unlink requested by ${chatId}`);
        await bot.deleteMessage(chatId, msgId).catch(() => {});
        process.emit('UNLINK_WHATSAPP', { chatId });
        return;
    }

    if (data === 'settings_close') {
        await bot.deleteMessage(chatId, msgId).catch(() => {});
        return;
    }
});

// ─────────────────────────────────────────────
// POLLING ERROR — silently swallow 409 during
// Render's deploy overlap; log everything else
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

    // Must be awaited in boot()
    // Step 1: deleteWebhook forces Telegram to drop the old instance's session
    // Step 2: 2s grace period for Render to fully kill the old process
    // Step 3: startPolling on a clean slate
    initialize: async () => {
        logInfo('Clearing stale Telegram session…');
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
        debug(`sendCode → ${chatId}: ${code}`);
        try {
            await bot.sendMessage(
                chatId,
                `🔑 *Your Pairing Code:*\n\n\`${code}\`\n\n_Enter this in WhatsApp → Linked Devices → Link with phone number._`,
                { parse_mode: 'Markdown', ...afterCodeMenu }
            );
        } catch (err) {
            logError(`sendCode failed for ${chatId}:`, err.message);
        }
    },

    sendQR: async (chatId, imageBuffer) => {
        debug(`sendQR → ${chatId} (${imageBuffer.length} bytes)`);
        try {
            await bot.sendPhoto(chatId, imageBuffer, {
                caption: '📷 Scan this in *WhatsApp → Linked Devices → Link a Device*',
                parse_mode: 'Markdown',
                ...afterQRMenu
            });
        } catch (err) {
            logError(`sendQR failed for ${chatId}:`, err.message);
        }
    },

    sendSimpleMessage: async (chatId, text) => {
        debug(`sendSimpleMessage → ${chatId}: "${String(text).slice(0, 60)}"`);
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
