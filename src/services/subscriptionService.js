const db = require('../database/db');
const moment = require('moment');
const { UserService } = require('../database/services');
const whatsappService = require('./whatsappService');

class SubscriptionService {
  /**
   * Create subscription for a user
   */
  async createSubscription(phoneNumber, tier = 'basic', monthlyCost = 0, autoRenew = true) {
    try {
      const nextRenewal = moment().add(30, 'days').toISOString();

      const result = await db.run(
        `INSERT INTO subscriptions (user_phone, subscription_tier, monthly_cost, next_renewal_date, auto_renew, active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [phoneNumber, tier, monthlyCost, nextRenewal, autoRenew ? 1 : 0, 1]
      );

      return result;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(phoneNumber) {
    return db.get(
      `SELECT * FROM subscriptions WHERE user_phone = ?`,
      [phoneNumber]
    );
  }

  /**
   * Renew subscription
   */
  async renewSubscription(phoneNumber, daysToAdd = 30) {
    try {
      const subscription = await this.getSubscription(phoneNumber);

      if (!subscription) {
        return { success: false, message: 'Subscription not found' };
      }

      const newRenewalDate = moment().add(daysToAdd, 'days').toISOString();

      await db.run(
        `UPDATE subscriptions SET next_renewal_date = ?, active = 1, updated_at = CURRENT_TIMESTAMP
         WHERE user_phone = ?`,
        [newRenewalDate, phoneNumber]
      );

      // Also update user subscription status
      await UserService.renewSubscription(phoneNumber, daysToAdd);

      return {
        success: true,
        message: 'Subscription renewed successfully',
        newRenewalDate,
      };
    } catch (error) {
      console.error('Error renewing subscription:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check and expire subscriptions
   */
  async checkAndExpireSubscriptions() {
    try {
      const expiredSubscriptions = await db.all(
        `SELECT * FROM subscriptions 
         WHERE active = 1 AND next_renewal_date < datetime('now')`
      );

      for (const sub of expiredSubscriptions) {
        await db.run(
          `UPDATE subscriptions SET active = 0 WHERE user_phone = ?`,
          [sub.user_phone]
        );

        // Update user status
        await db.run(
          `UPDATE users SET subscription_status = 'expired' WHERE phone_number = ?`,
          [sub.user_phone]
        );

        // Notify user
        await whatsappService.sendMessage(
          sub.user_phone,
          '⚠️ *Subscription Expired*\n\n' +
          'Your subscription has expired. Please renew to continue using the bot.\n\n' +
          'Reply "RENEW" to extend your subscription.'
        );
      }

      return {
        success: true,
        expiredCount: expiredSubscriptions.length,
      };
    } catch (error) {
      console.error('Error checking subscriptions:', error);
      throw error;
    }
  }

  /**
   * Send renewal reminders (7 days before expiration)
   */
  async sendRenewalReminders() {
    try {
      const reminderDate = moment().add(7, 'days');

      const upcomingExpiry = await db.all(
        `SELECT * FROM subscriptions 
         WHERE active = 1 
         AND next_renewal_date > datetime('now')
         AND next_renewal_date <= datetime('${reminderDate.toISOString()}')
         AND DATE(next_renewal_date) > DATE('now')`
      );

      for (const sub of upcomingExpiry) {
        const daysLeft = moment(sub.next_renewal_date).diff(moment(), 'days');

        await whatsappService.sendMessage(
          sub.user_phone,
          `📢 *Subscription Renewal Reminder*\n\n` +
          `Your subscription expires in ${daysLeft} days (${moment(sub.next_renewal_date).format('MMMM DD, YYYY')}).\n\n` +
          `Reply "RENEW" to extend your subscription and avoid service interruption.`
        );
      }

      return {
        success: true,
        remindersCount: upcomingExpiry.length,
      };
    } catch (error) {
      console.error('Error sending renewal reminders:', error);
      throw error;
    }
  }

  /**
   * Get all active subscriptions
   */
  async getAllActiveSubscriptions() {
    return db.all(
      `SELECT * FROM subscriptions WHERE active = 1`
    );
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats() {
    const total = await db.get(
      `SELECT COUNT(*) as count FROM subscriptions`
    );

    const active = await db.get(
      `SELECT COUNT(*) as count FROM subscriptions WHERE active = 1`
    );

    const expired = await db.get(
      `SELECT COUNT(*) as count FROM subscriptions WHERE active = 0`
    );

    const byTier = await db.all(
      `SELECT subscription_tier, COUNT(*) as count FROM subscriptions GROUP BY subscription_tier`
    );

    return {
      total: total?.count || 0,
      active: active?.count || 0,
      expired: expired?.count || 0,
      byTier,
    };
  }

  /**
   * Upgrade subscription tier
   */
  async upgradeSubscriptionTier(phoneNumber, newTier, newMonthlyCost = 0) {
    try {
      await db.run(
        `UPDATE subscriptions SET subscription_tier = ?, monthly_cost = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_phone = ?`,
        [newTier, newMonthlyCost, phoneNumber]
      );

      await whatsappService.sendMessage(
        phoneNumber,
        `✅ *Subscription Upgraded*\n\n` +
        `Your subscription has been upgraded to the *${newTier}* tier.\n` +
        `Thank you for your support!`
      );

      return { success: true, message: 'Subscription upgraded successfully' };
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SubscriptionService();
