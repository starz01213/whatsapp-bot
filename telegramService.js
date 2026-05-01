const TelegramBot = require('node-telegram-bot-api');

// ─────────────────────────────────────────────
// DEBUG LOGGER (mirrors index.js)
// ─────────────────────────────────────────────
const DEBUG    = process.env.DEBUG === 'true';
const debug    = (...args) => { if (DEBUG) console.log('[DEBUG][TG]', new Date().toISOString(), ...args); };
const logInfo  = (...args) => console.log('[INFO ][TG]', new Date().toISOString(), ...args);
const logError = (...args) => console.error('[ERROR][TG]', new Date().toISOString(), ...args);

// ─────────────────────────────────────────────
// BOT INIT
// ─────────────────────────────────────────────
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const adminIds = (process.env.ADMIN_ID || "")
    .split(",")
    .map(id => id.trim())
    .filter(Boolean);

const isAdmin = (chatId) => adminIds.includes(String(chatId));

// ─────────────────────────────────────────────
// KEYBOARDS
// ─────────────────────────────────────────────

// Persistent bottom keyboard
const mainMenuKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "🔗 Link WhatsApp" }],
            [{ text: "📶 Status" }, { text: "⚙️ Settings" }]
        ],
        resize_keyboard: true
    }
};

// Inline: choose link method
const linkMethodMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "📷 Scan QR Code",     callback_data: "link_qr"   }],
            [{ text: "🔢 Use Pairing Code", callback_data: "link_code" }]
        ]
    }
};

// Inline: shown after sending pairing code (offer QR fallback)
const afterCodeMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "📷 Try QR Code Instead", callback_data: "link_qr" }]
        ]
    }
};

// Inline: shown after sending QR (offer pairing code fallback)
const afterQRMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "🔢 Use Pairing Code Instead", callback_data: "link_code" }]
        ]
    }
};

// Inline: settings panel
const settingsMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "🔄 Reconnect Session",  callback_data: "settings_reconnect" }],
            [{ text: "🗑️ Unlink WhatsApp",    callback_data: "settings_unlink"    }],
            [{ text: "❌ Close",               callback_data: "settings_close"     }]
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
        debug(`Link WhatsApp tapped by ${chatId}`);
        await bot.sendMessage(chatId, '🔌 Choose your connection method:', linkMethodMenu);
        return;
    }

    if (text === '📶 Status' || text === 'Status') {
        debug(`Status check requested by ${chatId}`);
        process.emit('CHECK_WHATSAPP_STATUS', { chatId });
        return;
    }

    if (text === '⚙️ Settings' || text === 'Settings') {
        debug(`Settings opened by ${chatId}`);
        await bot.sendMessage(chatId, '⚙️ *Settings*\n\nWhat would you like to do?', {
            parse_mode: 'Markdown',
            ...settingsMenu
        });
        return;
    }

    // Fall-through: pass to index.js for state-driven input (e.g. phone number)
    if (text && !text.startsWith('/')) {
        debug(`Forwarding text input from ${chatId} to TELEGRAM_TEXT_INPUT`);
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

    if (!isAdmin(chatId)) {
        debug(`Ignored callback — not admin: ${chatId}`);
        return;
    }

    // ── Link flow ──────────────────────────────
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

    // ── Settings flow ──────────────────────────
    if (data === 'settings_reconnect') {
        logInfo(`Manual reconnect requested by ${chatId}`);
        // Delete settings message to keep chat clean
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
        debug(`Settings closed by ${chatId}`);
        await bot.deleteMessage(chatId, msgId).catch(() => {});
        return;
    }

    logError(`Unknown callback_data: "${data}" from ${chatId}`);
});

// ─────────────────────────────────────────────
// POLLING ERROR HANDLER
// Prevents the bot from crashing on network blips
// ─────────────────────────────────────────────
bot.on('polling_error', (err) => {
    logError('Polling error:', err.message);
});

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
module.exports = {
    bot,

    initialize: () => {
        logInfo(`Telegram bot polling — authorized admins: ${adminIds.join(', ')}`);
    },

    // Send the pairing code with a QR fallback button
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

    // Send the QR image with a pairing code fallback button
    sendQR: async (chatId, imageBuffer) => {
        debug(`sendQR → ${chatId} (buffer size: ${imageBuffer.length})`);
        try {
            await bot.sendPhoto(chatId, imageBuffer, {
                caption: '📷 Scan this QR code in *WhatsApp → Linked Devices → Link a Device*',
                parse_mode: 'Markdown',
                ...afterQRMenu
            });
        } catch (err) {
            logError(`sendQR failed for ${chatId}:`, err.message);
        }
    },

    // General message with Markdown support
    sendSimpleMessage: async (chatId, text) => {
        debug(`sendSimpleMessage → ${chatId}: "${text.slice(0, 60)}…"`);
        try {
            await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        } catch (err) {
            // Fallback: send without Markdown if parse fails (e.g. unescaped special chars)
            logError(`sendSimpleMessage parse error for ${chatId} — retrying plain:`, err.message);
            try {
                await bot.sendMessage(chatId, text);
            } catch (fallbackErr) {
                logError(`sendSimpleMessage totally failed for ${chatId}:`, fallbackErr.message);
            }
        }
    }
};
