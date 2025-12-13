const linkingService = require('../services/linkingService');
const whatsappService = require('../services/whatsappService');
const db = require('../database/db');

/**
 * Get session from database (internal helper)
 */
async function getSession(sessionId) {
  return new Promise((resolve, reject) => {
    db.db.get(
      `SELECT * FROM linking_sessions WHERE sessionId = ?`,
      [sessionId],
      (err, row) => {
        if (err) reject(err);
        resolve(row || null);
      }
    );
  });
}

/**
 * WhatsApp Account Linking Handler
 * Manages the complete linking workflow
 */
class LinkingHandler {
  
  /**
   * Initiate linking process
   * Sends QR code and PIN via WhatsApp
   */
  async initiateLinking(phoneNumber) {
    try {
      // Generate linking session
      const session = await linkingService.generateLinkingSession(phoneNumber);

      if (!session.success) {
        throw new Error('Failed to generate linking session');
      }

      // Send PIN via WhatsApp
      const pinMessage = `🔐 *WhatsApp Account Linking*\n\n` +
        `Your verification PIN is: *${session.pin}*\n\n` +
        `This PIN will expire in 5 minutes.\n\n` +
        `Use this PIN to link your account or scan the QR code provided in the dashboard.`;

      await whatsappService.sendMessage(phoneNumber, pinMessage);

      return {
        success: true,
        sessionId: session.sessionId,
        message: 'Linking session initiated. Check WhatsApp for PIN.',
        expiresIn: session.expiresIn
      };
    } catch (error) {
      console.error('Error initiating linking:', error);
      throw error;
    }
  }

  /**
   * Verify and complete account linking
   * Accepts either QR code data or PIN
   */
  async completeLinking(sessionId, verificationCode, phoneNumber) {
    try {
      // Verify the link
      const result = await linkingService.verifyLink(sessionId, verificationCode, phoneNumber);

      if (!result.success) {
        throw new Error('Verification failed');
      }

      // Send success message to WhatsApp
      const successMessage = `✅ *Account Successfully Linked!*\n\n` +
        `Your WhatsApp account is now linked and ready to use.\n\n` +
        `Session ID: \`${sessionId}\`\n` +
        `Linked at: ${result.linkedAt}\n\n` +
        `You can now use all bot features!`;

      await whatsappService.sendMessage(phoneNumber, successMessage);

      return result;
    } catch (error) {
      console.error('Error completing linking:', error);
      throw error;
    }
  }

  /**
   * Get status of linking process
   */
  async getLinkingStatus(sessionId) {
    try {
      return await linkingService.getSessionStatus(sessionId);
    } catch (error) {
      console.error('Error getting linking status:', error);
      throw error;
    }
  }

  /**
   * Get list of linked accounts for a user
   */
  async getLinkedAccounts(phoneNumber) {
    try {
      const accounts = await linkingService.getUserLinkedAccounts(phoneNumber);
      
      return {
        success: true,
        phone: phoneNumber,
        linkedAccounts: accounts,
        totalLinked: accounts.length
      };
    } catch (error) {
      console.error('Error getting linked accounts:', error);
      throw error;
    }
  }

  /**
   * Unlink an account
   */
  async unlinkAccount(sessionId, phoneNumber) {
    try {
      await linkingService.unlinkAccount(sessionId, phoneNumber);

      // Send notification
      const message = `✔️ Your WhatsApp account has been unlinked successfully.`;
      await whatsappService.sendMessage(phoneNumber, message);

      return {
        success: true,
        message: 'Account unlinked successfully'
      };
    } catch (error) {
      console.error('Error unlinking account:', error);
      throw error;
    }
  }

  /**
   * Resend PIN for existing session
   */
  async resendPin(sessionId, phoneNumber) {
    try {
      const session = await getSession(sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      if (session.phone !== phoneNumber) {
        throw new Error('Phone number does not match session');
      }

      // Resend PIN via WhatsApp
      const message = `🔐 *Your Verification PIN*\n\n` +
        `PIN: *${session.pin}*\n\n` +
        `Session ID: \`${sessionId}\`\n` +
        `Expires in: 5 minutes`;

      await whatsappService.sendMessage(phoneNumber, message);

      return {
        success: true,
        message: 'PIN resent to WhatsApp'
      };
    } catch (error) {
      console.error('Error resending PIN:', error);
      throw error;
    }
  }

  /**
   * Get QR code for dashboard display
   */
  async getQrCode(sessionId) {
    try {
      return await linkingService.getQrCode(sessionId);
    } catch (error) {
      console.error('Error getting QR code:', error);
      throw error;
    }
  }

  /**
   * Handle WhatsApp message for linking
   * User can send PIN or other linking commands
   */
  async handleLinkingMessage(phoneNumber, messageText) {
    try {
      const text = messageText.trim().toUpperCase();

      // Check if it's a linking command
      if (text.startsWith('LINK')) {
        // Initiate new linking session
        return await this.initiateLinking(phoneNumber);
      }

      if (text === 'UNLINK' || text.startsWith('UNLINK ')) {
        // Unlink account
        const sessionId = text.split(' ')[1];
        if (sessionId) {
          return await this.unlinkAccount(sessionId, phoneNumber);
        } else {
          throw new Error('Please provide session ID to unlink');
        }
      }

      if (text === 'LINKED' || text === 'SHOW LINKED') {
        // Show linked accounts
        return await this.getLinkedAccounts(phoneNumber);
      }

      return null;
    } catch (error) {
      console.error('Error handling linking message:', error);
      throw error;
    }
  }

  /**
   * Get linking statistics for admin dashboard
   */
  async getLinkingStats() {
    try {
      return new Promise((resolve, reject) => {
        db.db.all(
          `SELECT 
            COUNT(*) as totalSessions,
            SUM(CASE WHEN linked = 1 THEN 1 ELSE 0 END) as linkedAccounts,
            SUM(CASE WHEN linked = 0 AND datetime(createdAt) > datetime('now', '-5 minutes') THEN 1 ELSE 0 END) as pendingSessions,
            SUM(CASE WHEN attempts >= 3 THEN 1 ELSE 0 END) as failedAttempts
           FROM linking_sessions`,
          [],
          (err, rows) => {
            if (err) reject(err);
            
            const stats = rows[0] || {
              totalSessions: 0,
              linkedAccounts: 0,
              pendingSessions: 0,
              failedAttempts: 0
            };

            resolve({
              success: true,
              stats
            });
          }
        );
      });
    } catch (error) {
      console.error('Error getting linking stats:', error);
      throw error;
    }
  }
}

module.exports = new LinkingHandler();
