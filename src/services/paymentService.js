const db = require('../database/db');

/**
 * Payment Service
 * Handles subscription plans, payment processing, and trial management
 */
class PaymentService {
  constructor() {
    // Your account details - OPay Transfer
    this.paymentAccount = {
      accountNumber: '',
      bankName: 'OPay',
      accountName: 'Igboneme Promise',
      paymentMethod: 'TRANSFER',
      currency: 'NGN'
    };

    // Subscription plans
    this.plans = {
      trial: {
        id: 'trial',
        name: 'Free Trial',
        duration: 1, // 1 day
        durationUnit: 'day',
        price: 0,
        description: '1 day free trial access'
      },
      monthly_1: {
        id: 'monthly_1',
        name: '1 Month Plan',
        duration: 1,
        durationUnit: 'month',
        price: 1500,
        description: '1 month access - ₦1,500'
      },
      monthly_2: {
        id: 'monthly_2',
        name: '2 Months Plan',
        duration: 2,
        durationUnit: 'month',
        price: 3000,
        description: '2 months access - ₦3,000'
      },
      monthly_6: {
        id: 'monthly_6',
        name: '6 Months Plan',
        duration: 6,
        durationUnit: 'month',
        price: 8000,
        description: '6 months access - ₦8,000'
      },
      yearly_1: {
        id: 'yearly_1',
        name: '1 Year Plan',
        duration: 1,
        durationUnit: 'year',
        price: 16000,
        description: '1 year access - ₦16,000'
      }
    };
  }

  /**
   * Get payment account details
   */
  getPaymentAccount() {
    return {
      accountNumber: this.paymentAccount.accountNumber,
      bankName: this.paymentAccount.bankName,
      accountName: this.paymentAccount.accountName,
      paymentMethod: this.paymentAccount.paymentMethod,
      currency: this.paymentAccount.currency,
      transferInstructions: `Transfer to ${this.paymentAccount.accountName} via ${this.paymentAccount.bankName}\nAccount: ${this.paymentAccount.accountNumber}`
    };
  }

  /**
   * Get all subscription plans
   */
  getAllPlans() {
    return Object.values(this.plans);
  }

  /**
   * Get a specific plan
   */
  getPlan(planId) {
    return this.plans[planId] || null;
  }

  /**
   * Start free trial for a user
   */
  async startFreeTrial(phoneNumber) {
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 1); // 1 day trial

      return new Promise((resolve, reject) => {
        db.db.run(
          `INSERT OR REPLACE INTO user_subscriptions 
           (phone_number, plan_id, status, trial_started, trial_end, subscription_start, subscription_end, payment_status, created_at)
           VALUES (?, ?, ?, datetime('now'), ?, datetime('now'), ?, ?, datetime('now'))`,
          [phoneNumber, 'trial', 'active', endDate.toISOString(), endDate.toISOString(), 'free'],
          function(err) {
            if (err) reject(err);
            resolve({
              success: true,
              phoneNumber,
              plan: 'Free Trial',
              duration: '1 day',
              trialEnd: endDate.toISOString(),
              message: 'Free trial started! Access for 1 day.'
            });
          }
        );
      });
    } catch (error) {
      console.error('Error starting free trial:', error);
      throw error;
    }
  }

  /**
   * Check if user has active trial
   */
  async hasActiveTrial(phoneNumber) {
    try {
      return new Promise((resolve, reject) => {
        db.db.get(
          `SELECT * FROM user_subscriptions 
           WHERE phone_number = ? AND plan_id = 'trial' AND status = 'active'
           AND datetime(trial_end) > datetime('now')`,
          [phoneNumber],
          (err, row) => {
            if (err) reject(err);
            resolve(row || null);
          }
        );
      });
    } catch (error) {
      console.error('Error checking trial:', error);
      throw error;
    }
  }

  /**
   * Create payment request
   */
  async createPaymentRequest(phoneNumber, planId, referenceId = null) {
    try {
      const plan = this.getPlan(planId);
      if (!plan) {
        throw new Error('Invalid plan ID');
      }

      const ref = referenceId || `PAY-${phoneNumber}-${Date.now()}`;

      return new Promise((resolve, reject) => {
        db.db.run(
          `INSERT INTO payment_requests 
           (phone_number, plan_id, plan_name, amount, reference_id, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
          [phoneNumber, planId, plan.name, plan.price, ref, 'pending'],
          function(err) {
            if (err) reject(err);
            resolve({
              success: true,
              referenceId: ref,
              plan: plan.name,
              amount: plan.price,
              currency: this.paymentAccount.currency,
              paymentAccount: this.paymentAccount,
              instructions: `Send ₦${plan.price} to:\nName: ${this.paymentAccount.accountName}\nBank: ${this.paymentAccount.bankName}\nAccount: ${this.paymentAccount.accountNumber}\n\nReference: ${ref}`
            });
          }
        );
      });
    } catch (error) {
      console.error('Error creating payment request:', error);
      throw error;
    }
  }

  /**
   * Verify payment and activate subscription
   */
  async verifyAndActivatePayment(phoneNumber, referenceId, planId) {
    try {
      const plan = this.getPlan(planId);
      if (!plan) {
        throw new Error('Invalid plan ID');
      }

      const startDate = new Date();
      const endDate = new Date();

      // Calculate end date based on plan duration
      if (plan.durationUnit === 'day') {
        endDate.setDate(endDate.getDate() + plan.duration);
      } else if (plan.durationUnit === 'month') {
        endDate.setMonth(endDate.getMonth() + plan.duration);
      } else if (plan.durationUnit === 'year') {
        endDate.setFullYear(endDate.getFullYear() + plan.duration);
      }

      return new Promise((resolve, reject) => {
        db.db.run(
          `UPDATE payment_requests SET status = 'verified' WHERE reference_id = ?`,
          [referenceId],
          function(err) {
            if (err) reject(err);

            db.db.run(
              `INSERT OR REPLACE INTO user_subscriptions 
               (phone_number, plan_id, status, subscription_start, subscription_end, payment_status, payment_reference, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
              [phoneNumber, planId, 'active', startDate.toISOString(), endDate.toISOString(), 'paid', referenceId],
              function(err) {
                if (err) reject(err);
                resolve({
                  success: true,
                  message: 'Payment verified and subscription activated',
                  phoneNumber,
                  plan: plan.name,
                  duration: `${plan.duration} ${plan.durationUnit}(s)`,
                  subscriptionEnd: endDate.toISOString(),
                  status: 'active'
                });
              }
            );
          }
        );
      });
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }

  /**
   * Check user's subscription status
   */
  async getSubscriptionStatus(phoneNumber) {
    try {
      return new Promise((resolve, reject) => {
        db.db.get(
          `SELECT * FROM user_subscriptions 
           WHERE phone_number = ? 
           ORDER BY created_at DESC LIMIT 1`,
          [phoneNumber],
          (err, row) => {
            if (err) reject(err);

            if (!row) {
              resolve({
                hasSubscription: false,
                status: 'none',
                message: 'No active subscription'
              });
              return;
            }

            const now = new Date();
            const endDate = new Date(row.subscription_end);
            const isActive = endDate > now;

            resolve({
              hasSubscription: isActive,
              status: isActive ? 'active' : 'expired',
              phoneNumber: row.phone_number,
              plan: row.plan_id,
              planName: this.getPlan(row.plan_id)?.name || 'Unknown',
              paymentStatus: row.payment_status,
              subscriptionStart: row.subscription_start,
              subscriptionEnd: row.subscription_end,
              daysRemaining: isActive ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0,
              message: isActive ? `Active until ${endDate.toDateString()}` : 'Subscription expired'
            });
          }
        );
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      throw error;
    }
  }

  /**
   * Get payment requests for a user
   */
  async getUserPaymentRequests(phoneNumber) {
    try {
      return new Promise((resolve, reject) => {
        db.db.all(
          `SELECT * FROM payment_requests 
           WHERE phone_number = ? 
           ORDER BY created_at DESC LIMIT 10`,
          [phoneNumber],
          (err, rows) => {
            if (err) reject(err);
            resolve(rows || []);
          }
        );
      });
    } catch (error) {
      console.error('Error getting payment requests:', error);
      throw error;
    }
  }

  /**
   * Calculate amount needed for plan
   */
  getPlanPrice(planId) {
    const plan = this.getPlan(planId);
    return plan ? plan.price : 0;
  }

  /**
   * Check if trial period has expired and convert to paid plan needed
   */
  async checkTrialStatus(phoneNumber) {
    try {
      const trialSub = await this.hasActiveTrial(phoneNumber);

      if (!trialSub) {
        return {
          trialActive: false,
          needsPayment: true,
          message: 'Trial period expired. Please select a subscription plan to continue.'
        };
      }

      return {
        trialActive: true,
        needsPayment: false,
        message: 'Trial period still active'
      };
    } catch (error) {
      console.error('Error checking trial status:', error);
      throw error;
    }
  }

  /**
   * Get statistics for admin
   */
  async getPaymentStats() {
    try {
      return new Promise((resolve, reject) => {
        db.db.get(
          `SELECT 
            COUNT(*) as totalUsers,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeSubscriptions,
            SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paidSubscriptions,
            SUM(CASE WHEN status = 'active' AND payment_status = 'paid' THEN 1 ELSE 0 END) as activePaidUsers
           FROM user_subscriptions`,
          [],
          (err, row) => {
            if (err) reject(err);
            resolve(row || { totalUsers: 0, activeSubscriptions: 0, paidSubscriptions: 0, activePaidUsers: 0 });
          }
        );
      });
    } catch (error) {
      console.error('Error getting payment stats:', error);
      throw error;
    }
  }

  /**
   * Get revenue breakdown
   */
  async getRevenueBreakdown() {
    try {
      return new Promise((resolve, reject) => {
        db.db.all(
          `SELECT 
            plan_name,
            COUNT(*) as count,
            SUM(amount) as totalAmount
           FROM payment_requests 
           WHERE status = 'verified'
           GROUP BY plan_name`,
          [],
          (err, rows) => {
            if (err) reject(err);
            resolve(rows || []);
          }
        );
      });
    } catch (error) {
      console.error('Error getting revenue breakdown:', error);
      throw error;
    }
  }

  /**
   * Format price with currency
   */
  formatPrice(amount) {
    return `₦${amount.toLocaleString('en-NG')}`;
  }

  /**
   * Get plan comparison
   */
  getPlanComparison() {
    return {
      plans: Object.values(this.plans),
      currency: 'NGN',
      symbol: '₦',
      bestValue: 'yearly_1',
      paymentAccount: this.paymentAccount
    };
  }
}

module.exports = new PaymentService();
