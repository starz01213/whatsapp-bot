const db = require('../database/db');
const fs = require('fs').promises;
const path = require('path');

/**
 * Advanced Reporting Service
 * Generates comprehensive reports and analytics dashboards
 */
class ReportingService {
  constructor() {
    this.reportsDir = path.join(__dirname, '../../reports');
    this.ensureReportsDirectory();
  }

  /**
   * Ensure reports directory exists
   * @private
   */
  async ensureReportsDirectory() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating reports directory:', error);
    }
  }

  /**
   * Generate revenue report
   * @param {string} dateFrom - Start date (YYYY-MM-DD)
   * @param {string} dateTo - End date (YYYY-MM-DD)
   * @returns {Promise<object>}
   */
  async generateRevenueReport(dateFrom, dateTo) {
    try {
      const report = {
        title: 'Revenue Report',
        dateRange: { from: dateFrom, to: dateTo },
        timestamp: new Date(),
        data: {},
      };

      // Total revenue
      const totalRevenue = db.prepare(`
        SELECT 
          COALESCE(SUM(amount), 0) as total,
          COUNT(*) as transactions
        FROM payment_requests
        WHERE status = 'verified' 
        AND DATE(created_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo);

      report.data.totalRevenue = totalRevenue.total;
      report.data.totalTransactions = totalRevenue.transactions;

      // Revenue by plan
      const revenueByPlan = db.prepare(`
        SELECT 
          us.plan_id,
          COALESCE(SUM(pr.amount), 0) as revenue,
          COUNT(DISTINCT pr.phone_number) as customers
        FROM payment_requests pr
        LEFT JOIN user_subscriptions us ON pr.phone_number = us.phone_number
        WHERE pr.status = 'verified'
        AND DATE(pr.created_at) BETWEEN ? AND ?
        GROUP BY us.plan_id
      `).all(dateFrom, dateTo);

      report.data.revenueByPlan = revenueByPlan;

      // Daily revenue trend
      const dailyRevenue = db.prepare(`
        SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(amount), 0) as revenue,
          COUNT(*) as transactions
        FROM payment_requests
        WHERE status = 'verified'
        AND DATE(created_at) BETWEEN ? AND ?
        GROUP BY DATE(created_at)
        ORDER BY date
      `).all(dateFrom, dateTo);

      report.data.dailyTrend = dailyRevenue;

      // Average transaction value
      report.data.averageTransactionValue =
        report.data.totalTransactions > 0
          ? (report.data.totalRevenue / report.data.totalTransactions).toFixed(2)
          : 0;

      // Save report
      await this.saveReport('revenue', report);

      return report;
    } catch (error) {
      console.error('Error generating revenue report:', error);
      return null;
    }
  }

  /**
   * Generate user report
   * @param {string} dateFrom - Start date (YYYY-MM-DD)
   * @param {string} dateTo - End date (YYYY-MM-DD)
   * @returns {Promise<object>}
   */
  async generateUserReport(dateFrom, dateTo) {
    try {
      const report = {
        title: 'User Report',
        dateRange: { from: dateFrom, to: dateTo },
        timestamp: new Date(),
        data: {},
      };

      // New users
      const newUsers = db.prepare(`
        SELECT COUNT(*) as count FROM users
        WHERE DATE(created_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo);

      report.data.newUsers = newUsers.count;

      // Active users
      const activeUsers = db.prepare(`
        SELECT COUNT(DISTINCT phone_number) as count FROM user_interactions
        WHERE DATE(timestamp) BETWEEN ? AND ?
      `).all(dateFrom, dateTo);

      report.data.activeUsers = activeUsers[0]?.count || 0;

      // User growth by day
      const userGrowth = db.prepare(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_users,
          (SELECT COUNT(*) FROM users WHERE DATE(created_at) <= DATE(created_at)) as cumulative
        FROM users
        WHERE DATE(created_at) BETWEEN ? AND ?
        GROUP BY DATE(created_at)
        ORDER BY date
      `).all(dateFrom, dateTo);

      report.data.growthTrend = userGrowth;

      // User status breakdown
      const userStatus = db.prepare(`
        SELECT 
          status,
          COUNT(*) as count
        FROM users
        GROUP BY status
      `).all();

      report.data.statusBreakdown = userStatus;

      // User segmentation by engagement
      const engagementSegments = db.prepare(`
        SELECT 
          CASE 
            WHEN interaction_count >= 50 THEN 'Very High'
            WHEN interaction_count >= 20 THEN 'High'
            WHEN interaction_count >= 5 THEN 'Medium'
            ELSE 'Low'
          END as engagement_level,
          COUNT(*) as user_count
        FROM (
          SELECT COUNT(*) as interaction_count FROM user_interactions
          GROUP BY phone_number
        )
        GROUP BY engagement_level
      `).all();

      report.data.engagementSegments = engagementSegments;

      // Save report
      await this.saveReport('user', report);

      return report;
    } catch (error) {
      console.error('Error generating user report:', error);
      return null;
    }
  }

  /**
   * Generate subscription report
   * @param {string} dateFrom - Start date (YYYY-MM-DD)
   * @param {string} dateTo - End date (YYYY-MM-DD)
   * @returns {Promise<object>}
   */
  async generateSubscriptionReport(dateFrom, dateTo) {
    try {
      const report = {
        title: 'Subscription Report',
        dateRange: { from: dateFrom, to: dateTo },
        timestamp: new Date(),
        data: {},
      };

      // Current subscriptions by plan
      const subscriptionsByPlan = db.prepare(`
        SELECT 
          plan_id,
          status,
          COUNT(*) as count
        FROM user_subscriptions
        WHERE DATE(created_at) <= ? AND (DATE(expires_at) >= ? OR status = 'active')
        GROUP BY plan_id, status
      `).all(dateTo, dateFrom);

      report.data.subscriptionsByPlan = subscriptionsByPlan;

      // Trial to paid conversion
      const trialConversion = db.prepare(`
        SELECT 
          COUNT(DISTINCT phone_number) as trial_users,
          (SELECT COUNT(DISTINCT phone_number) FROM user_subscriptions 
           WHERE plan_id != 'trial' AND status = 'active'
           AND DATE(created_at) BETWEEN ? AND ?) as converted_users
        FROM user_subscriptions
        WHERE plan_id = 'trial'
        AND DATE(created_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo, dateFrom, dateTo);

      report.data.trialConversion = {
        trialUsers: trialConversion.trial_users,
        convertedUsers: trialConversion.converted_users,
        conversionRate:
          trialConversion.trial_users > 0
            ? ((trialConversion.converted_users / trialConversion.trial_users) * 100).toFixed(2)
            : 0,
      };

      // Churn rate
      const churnedUsers = db.prepare(`
        SELECT COUNT(*) as count FROM user_subscriptions
        WHERE status = 'expired'
        AND DATE(expires_at) BETWEEN ? AND ?
      `).get(dateFrom, dateTo);

      const activeSubscriptions = db.prepare(`
        SELECT COUNT(*) as count FROM user_subscriptions
        WHERE status = 'active'
      `).get();

      report.data.churnRate =
        activeSubscriptions.count > 0
          ? ((churnedUsers.count / activeSubscriptions.count) * 100).toFixed(2)
          : 0;

      // Monthly recurring revenue (MRR)
      const mrr = db.prepare(`
        SELECT COALESCE(SUM(
          CASE 
            WHEN plan_id = 'monthly_1' THEN 1500
            WHEN plan_id = 'monthly_2' THEN 3000
            WHEN plan_id = 'monthly_6' THEN 8000
            WHEN plan_id = 'yearly_1' THEN 16000
            ELSE 0
          END
        ), 0) as mrr
        FROM user_subscriptions
        WHERE status = 'active'
        AND plan_id != 'trial'
      `).get();

      report.data.monthlyRecurringRevenue = mrr.mrr;

      // Save report
      await this.saveReport('subscription', report);

      return report;
    } catch (error) {
      console.error('Error generating subscription report:', error);
      return null;
    }
  }

  /**
   * Generate engagement report
   * @param {string} dateFrom - Start date (YYYY-MM-DD)
   * @param {string} dateTo - End date (YYYY-MM-DD)
   * @returns {Promise<object>}
   */
  async generateEngagementReport(dateFrom, dateTo) {
    try {
      const report = {
        title: 'Engagement Report',
        dateRange: { from: dateFrom, to: dateTo },
        timestamp: new Date(),
        data: {},
      };

      // Total interactions
      const totalInteractions = db.prepare(`
        SELECT 
          COUNT(*) as count,
          COUNT(DISTINCT phone_number) as unique_users
        FROM user_interactions
        WHERE DATE(timestamp) BETWEEN ? AND ?
      `).get(dateFrom, dateTo);

      report.data.totalInteractions = totalInteractions.count;
      report.data.uniqueUsers = totalInteractions.unique_users;

      // Interactions by type
      const interactionsByType = db.prepare(`
        SELECT 
          interaction_type,
          COUNT(*) as count,
          COUNT(DISTINCT phone_number) as unique_users
        FROM user_interactions
        WHERE DATE(timestamp) BETWEEN ? AND ?
        GROUP BY interaction_type
        ORDER BY count DESC
      `).all(dateFrom, dateTo);

      report.data.interactionsByType = interactionsByType;

      // Average interactions per user
      report.data.averageInteractionsPerUser =
        totalInteractions.unique_users > 0
          ? (totalInteractions.count / totalInteractions.unique_users).toFixed(2)
          : 0;

      // Peak activity hours
      const peakHours = db.prepare(`
        SELECT 
          CAST(strftime('%H', timestamp) AS INTEGER) as hour,
          COUNT(*) as interactions
        FROM user_interactions
        WHERE DATE(timestamp) BETWEEN ? AND ?
        GROUP BY CAST(strftime('%H', timestamp) AS INTEGER)
        ORDER BY interactions DESC
        LIMIT 5
      `).all(dateFrom, dateTo);

      report.data.peakActivityHours = peakHours;

      // Save report
      await this.saveReport('engagement', report);

      return report;
    } catch (error) {
      console.error('Error generating engagement report:', error);
      return null;
    }
  }

  /**
   * Generate comprehensive executive summary
   * @param {string} dateFrom - Start date (YYYY-MM-DD)
   * @param {string} dateTo - End date (YYYY-MM-DD)
   * @returns {Promise<object>}
   */
  async generateExecutiveSummary(dateFrom, dateTo) {
    try {
      const summary = {
        title: 'Executive Summary',
        dateRange: { from: dateFrom, to: dateTo },
        timestamp: new Date(),
        data: {},
      };

      // Get all sub-reports
      const revenue = await this.generateRevenueReport(dateFrom, dateTo);
      const users = await this.generateUserReport(dateFrom, dateTo);
      const subscriptions = await this.generateSubscriptionReport(dateFrom, dateTo);
      const engagement = await this.generateEngagementReport(dateFrom, dateTo);

      // Compile executive summary
      summary.data = {
        revenue: revenue.data,
        users: users.data,
        subscriptions: subscriptions.data,
        engagement: engagement.data,
        keyMetrics: {
          totalRevenue: revenue.data.totalRevenue,
          newUsers: users.data.newUsers,
          activeUsers: users.data.activeUsers,
          totalInteractions: engagement.data.totalInteractions,
          mrr: subscriptions.data.monthlyRecurringRevenue,
          churnRate: subscriptions.data.churnRate,
        },
      };

      // Save summary
      await this.saveReport('executive-summary', summary);

      return summary;
    } catch (error) {
      console.error('Error generating executive summary:', error);
      return null;
    }
  }

  /**
   * Save report to file
   * @private
   */
  async saveReport(type, report) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `${type}-report-${timestamp}.json`;
      const filepath = path.join(this.reportsDir, filename);

      await fs.writeFile(filepath, JSON.stringify(report, null, 2));

      console.log(`Report saved: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('Error saving report:', error);
      return null;
    }
  }

  /**
   * Get all reports
   * @returns {Promise<Array>}
   */
  async getAllReports() {
    try {
      const files = await fs.readdir(this.reportsDir);
      return files.filter((f) => f.endsWith('.json'));
    } catch (error) {
      console.error('Error reading reports:', error);
      return [];
    }
  }

  /**
   * Get report by filename
   * @param {string} filename - Report filename
   * @returns {Promise<object>}
   */
  async getReport(filename) {
    try {
      const filepath = path.join(this.reportsDir, filename);
      const content = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error reading report:', error);
      return null;
    }
  }

  /**
   * Generate PDF report (requires pdfkit or similar)
   * @param {object} report - Report object
   * @returns {Promise<Buffer>}
   */
  async generatePDFReport(report) {
    try {
      // This would require a PDF library like pdfkit
      console.log('PDF generation requires pdfkit library');
      console.log('Install with: npm install pdfkit');
      return null;
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    }
  }

  /**
   * Schedule automatic report generation
   * @param {string} frequency - 'daily', 'weekly', 'monthly'
   * @param {Function} callback - Callback function
   */
  scheduleReportGeneration(frequency, callback) {
    const now = new Date();
    const dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = now.toISOString().split('T')[0];

    let interval;

    switch (frequency) {
      case 'daily':
        interval = 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        interval = 7 * 24 * 60 * 60 * 1000;
        break;
      case 'monthly':
        interval = 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        interval = 24 * 60 * 60 * 1000;
    }

    setInterval(async () => {
      console.log(`Generating ${frequency} reports...`);
      const summary = await this.generateExecutiveSummary(dateFrom, dateTo);
      if (callback) callback(summary);
    }, interval);

    console.log(`Report generation scheduled: ${frequency}`);
  }
}

module.exports = new ReportingService();
