const paymentService = require('../services/paymentService');
const whatsappService = require('../services/whatsappService');

/**
 * Payment Handler
 * Manages payment flows and subscriptions
 */
class PaymentHandler {
  
  /**
   * Start free trial for user
   */
  async startTrial(phoneNumber) {
    try {
      const result = await paymentService.startFreeTrial(phoneNumber);

      // Send WhatsApp notification
      const message = `🎉 *Welcome to Our Service!*\n\n` +
        `You've been given a *1-day free trial* to explore all features.\n\n` +
        `⏰ Trial expires: ${new Date(new Date().getTime() + 24*60*60*1000).toLocaleDateString()}\n\n` +
        `After your trial, choose a subscription plan to continue:\n` +
        `• 1 Month: ₦1,500\n` +
        `• 2 Months: ₦3,000\n` +
        `• 6 Months: ₦8,000\n` +
        `• 1 Year: ₦16,000\n\n` +
        `Reply with "PLANS" to see pricing details.`;

      await whatsappService.sendMessage(phoneNumber, message);

      return result;
    } catch (error) {
      console.error('Error starting trial:', error);
      throw error;
    }
  }

  /**
   * Get available plans
   */
  getPlans() {
    return {
      success: true,
      plans: paymentService.getAllPlans(),
      currency: 'NGN',
      symbol: '₦'
    };
  }

  /**
   * Get plan details
   */
  getPlanDetails(planId) {
    const plan = paymentService.getPlan(planId);
    
    if (!plan) {
      throw new Error('Plan not found');
    }

    return {
      success: true,
      plan,
      formatted: {
        name: plan.name,
        price: paymentService.formatPrice(plan.price),
        duration: `${plan.duration} ${plan.durationUnit}${plan.duration > 1 ? 's' : ''}`,
        description: plan.description
      }
    };
  }

  /**
   * Initiate payment for a plan
   */
  async initiatePayment(phoneNumber, planId) {
    try {
      // Check if user already has active subscription
      const subStatus = await paymentService.getSubscriptionStatus(phoneNumber);
      
      if (subStatus.hasSubscription && subStatus.status === 'active') {
        return {
          success: false,
          message: 'You already have an active subscription',
          currentPlan: subStatus.planName,
          daysRemaining: subStatus.daysRemaining
        };
      }

      // Create payment request
      const paymentRequest = await paymentService.createPaymentRequest(phoneNumber, planId);

      // Send payment instructions via WhatsApp
      const plan = paymentService.getPlan(planId);
      const message = `💳 *Payment Instructions*\n\n` +
        `Plan: ${plan.name}\n` +
        `Amount: ₦${plan.price.toLocaleString()}\n\n` +
        `📱 *Transfer to:*\n` +
        `Name: Igboneme Promise\n` +
        `Bank: OPay\n` +
        `Account: 8144821073\n\n` +
        `📝 *Reference:* ${paymentRequest.referenceId}\n\n` +
        `After payment, reply with:\n` +
        `CONFIRM ${paymentRequest.referenceId}\n\n` +
        `Your subscription will be activated immediately after verification.`;

      await whatsappService.sendMessage(phoneNumber, message);

      return {
        success: true,
        message: 'Payment instructions sent to WhatsApp',
        referenceId: paymentRequest.referenceId,
        plan: plan.name,
        amount: paymentService.formatPrice(plan.price)
      };
    } catch (error) {
      console.error('Error initiating payment:', error);
      throw error;
    }
  }

  /**
   * Confirm and verify payment
   */
  async confirmPayment(phoneNumber, referenceId) {
    try {
      const paymentReqs = await paymentService.getUserPaymentRequests(phoneNumber);
      const request = paymentReqs.find(p => p.reference_id === referenceId);

      if (!request) {
        throw new Error('Payment request not found');
      }

      // Activate subscription
      const result = await paymentService.verifyAndActivatePayment(
        phoneNumber,
        referenceId,
        request.plan_id
      );

      // Send confirmation
      const message = `✅ *Payment Confirmed!*\n\n` +
        `Thank you for your subscription.\n\n` +
        `Plan: ${result.plan}\n` +
        `Duration: ${result.duration}\n` +
        `Valid until: ${new Date(result.subscriptionEnd).toLocaleDateString()}\n\n` +
        `Your account is now fully active. Enjoy!`;

      await whatsappService.sendMessage(phoneNumber, message);

      return result;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }

  /**
   * Check subscription status
   */
  async checkStatus(phoneNumber) {
    try {
      const status = await paymentService.getSubscriptionStatus(phoneNumber);

      if (!status.hasSubscription) {
        // Check if trial is available
        const trial = await paymentService.hasActiveTrial(phoneNumber);
        if (trial) {
          return {
            ...status,
            trial: {
              active: true,
              endDate: trial.trial_end,
              message: 'Your free trial is still active!'
            }
          };
        }
      }

      return status;
    } catch (error) {
      console.error('Error checking status:', error);
      throw error;
    }
  }

  /**
   * Get payment account details
   */
  getPaymentAccount() {
    return {
      success: true,
      account: paymentService.getPaymentAccount()
    };
  }

  /**
   * Handle WhatsApp payment commands
   */
  async handlePaymentCommand(phoneNumber, messageText) {
    try {
      const text = messageText.trim().toUpperCase();

      // PLANS command - show all plans
      if (text === 'PLANS' || text.startsWith('PLANS')) {
        const plans = paymentService.getAllPlans();
        let response = `💰 *Available Plans*\n\n`;
        
        plans.forEach(plan => {
          if (plan.price === 0) {
            response += `🎁 ${plan.name}\n${plan.description}\n\n`;
          } else {
            response += `💳 ${plan.name}\n${plan.description}\n\n`;
          }
        });

        response += `Reply with:\nBUY [plan_id]\n\nExample: BUY monthly_1`;
        
        await whatsappService.sendMessage(phoneNumber, response);
        return { success: true, message: 'Plans sent' };
      }

      // BUY command - initiate payment
      if (text.startsWith('BUY ')) {
        const planId = text.substring(4).trim().toLowerCase();
        return await this.initiatePayment(phoneNumber, planId);
      }

      // CONFIRM command - verify payment
      if (text.startsWith('CONFIRM ')) {
        const refId = text.substring(8).trim();
        return await this.confirmPayment(phoneNumber, refId);
      }

      // STATUS command - check subscription
      if (text === 'STATUS' || text === 'MYSTATUS') {
        return await this.checkStatus(phoneNumber);
      }

      // TRIAL command - start free trial
      if (text === 'TRIAL' || text === 'STARTTRIAL') {
        const existingTrial = await paymentService.hasActiveTrial(phoneNumber);
        if (existingTrial) {
          throw new Error('You already have an active trial');
        }
        return await this.startTrial(phoneNumber);
      }

      return null;
    } catch (error) {
      console.error('Error handling payment command:', error);
      throw error;
    }
  }

  /**
   * Get statistics
   */
  async getStats() {
    try {
      const stats = await paymentService.getPaymentStats();
      const revenue = await paymentService.getRevenueBreakdown();

      return {
        success: true,
        statistics: stats,
        revenueBreakdown: revenue
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }

  /**
   * Send subscription reminder
   */
  async sendExpirationReminder(phoneNumber) {
    try {
      const status = await paymentService.getSubscriptionStatus(phoneNumber);

      if (!status.hasSubscription || status.daysRemaining > 3) {
        return { success: false, message: 'No expiration reminder needed' };
      }

      const message = `⏰ *Subscription Expiring Soon!*\n\n` +
        `Your subscription to ${status.planName} expires in ${status.daysRemaining} day(s).\n\n` +
        `Reply with: BUY [plan] to renew\n\n` +
        `Available plans:\n` +
        `BUY monthly_1 - ₦1,500\n` +
        `BUY monthly_2 - ₦3,000\n` +
        `BUY monthly_6 - ₦8,000\n` +
        `BUY yearly_1 - ₦16,000`;

      await whatsappService.sendMessage(phoneNumber, message);

      return {
        success: true,
        message: 'Reminder sent',
        daysRemaining: status.daysRemaining
      };
    } catch (error) {
      console.error('Error sending reminder:', error);
      throw error;
    }
  }
}

module.exports = new PaymentHandler();
