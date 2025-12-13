const db = require('../database/db');

/**
 * Customer Analytics Service
 * Tracks and analyzes customer behavior, engagement, and interactions
 */
class AnalyticsService {
  /**
   * Record user interaction
   * @param {string} phoneNumber - User's phone number
   * @param {string} type - Interaction type (message, query, purchase, etc.)
   * @param {object} data - Additional interaction data
   */
  async recordInteraction(phoneNumber, type, data = {}) {
    try {
      const stmt = db.prepare(`
        INSERT INTO user_interactions (phone_number, interaction_type, data, timestamp)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(
        phoneNumber,
        type,
        JSON.stringify(data),
        new Date().toISOString()
      );

      console.log(`Interaction recorded: ${phoneNumber} - ${type}`);
    } catch (error) {
      console.error('Error recording interaction:', error);
    }
  }

  /**
   * Get user engagement score (0-100)
   * Based on interaction frequency, diversity, and recency
   * @param {string} phoneNumber - User's phone number
   * @returns {Promise<number>}
   */
  async getUserEngagementScore(phoneNumber) {
    try {
      // Get user interactions from last 30 days
      const interactions = db.prepare(`
        SELECT interaction_type, timestamp FROM user_interactions
        WHERE phone_number = ? AND timestamp > datetime('now', '-30 days')
        ORDER BY timestamp DESC
      `).all(phoneNumber);

      if (!interactions.length) return 0;

      // Calculate metrics
      const totalInteractions = interactions.length;
      const interactionTypes = new Set(interactions.map((i) => i.interaction_type)).size;
      const recentInteractions = interactions.filter((i) => {
        const daysDiff = (Date.now() - new Date(i.timestamp)) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      }).length;

      // Engagement score formula
      const frequencyScore = Math.min(totalInteractions / 50 * 100, 100);
      const diversityScore = (interactionTypes / 5) * 100;
      const recencyScore = (recentInteractions / Math.max(totalInteractions, 1)) * 100;

      const engagementScore = (frequencyScore * 0.5 + diversityScore * 0.2 + recencyScore * 0.3);

      return Math.round(engagementScore);
    } catch (error) {
      console.error('Error calculating engagement score:', error);
      return 0;
    }
  }

  /**
   * Get customer lifetime value
   * @param {string} phoneNumber - User's phone number
   * @returns {Promise<number>}
   */
  async getCustomerLifetimeValue(phoneNumber) {
    try {
      const result = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_spent
        FROM payment_requests
        WHERE phone_number = ? AND status = 'verified'
      `).get(phoneNumber);

      return result.total_spent || 0;
    } catch (error) {
      console.error('Error calculating CLV:', error);
      return 0;
    }
  }

  /**
   * Get user activity summary
   * @param {string} phoneNumber - User's phone number
   * @returns {Promise<object>}
   */
  async getUserActivitySummary(phoneNumber) {
    try {
      const totalInteractions = db.prepare(`
        SELECT COUNT(*) as count FROM user_interactions
        WHERE phone_number = ?
      `).get(phoneNumber);

      const lastActive = db.prepare(`
        SELECT timestamp FROM user_interactions
        WHERE phone_number = ?
        ORDER BY timestamp DESC LIMIT 1
      `).get(phoneNumber);

      const interactionBreakdown = db.prepare(`
        SELECT interaction_type, COUNT(*) as count
        FROM user_interactions
        WHERE phone_number = ?
        GROUP BY interaction_type
      `).all(phoneNumber);

      const engagement = await this.getUserEngagementScore(phoneNumber);
      const clv = await this.getCustomerLifetimeValue(phoneNumber);

      return {
        phoneNumber,
        totalInteractions: totalInteractions.count,
        lastActive: lastActive?.timestamp || null,
        engagementScore: engagement,
        customerLifetimeValue: clv,
        interactionBreakdown: interactionBreakdown,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error getting activity summary:', error);
      return {};
    }
  }

  /**
   * Get cohort analysis (group users by signup date)
   * @param {string} cohortType - 'daily', 'weekly', 'monthly'
   * @returns {Promise<Array>}
   */
  async getCohortAnalysis(cohortType = 'monthly') {
    try {
      let dateFormat;
      switch (cohortType) {
        case 'daily':
          dateFormat = '%Y-%m-%d';
          break;
        case 'weekly':
          dateFormat = '%Y-W%W';
          break;
        case 'monthly':
          dateFormat = '%Y-%m';
          break;
        default:
          dateFormat = '%Y-%m';
      }

      const cohorts = db.prepare(`
        SELECT 
          strftime('${dateFormat}', created_at) as cohort,
          COUNT(*) as users,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users,
          AVG(CASE WHEN lifetime_value > 0 THEN 1 ELSE 0 END) * 100 as conversion_rate
        FROM users
        GROUP BY strftime('${dateFormat}', created_at)
        ORDER BY cohort DESC
      `).all();

      return cohorts;
    } catch (error) {
      console.error('Error getting cohort analysis:', error);
      return [];
    }
  }

  /**
   * Get top performing interactions
   * @param {number} limit - Number of interactions to return
   * @returns {Promise<Array>}
   */
  async getTopInteractions(limit = 10) {
    try {
      const topInteractions = db.prepare(`
        SELECT 
          interaction_type,
          COUNT(*) as frequency,
          COUNT(DISTINCT phone_number) as unique_users
        FROM user_interactions
        GROUP BY interaction_type
        ORDER BY frequency DESC
        LIMIT ?
      `).all(limit);

      return topInteractions;
    } catch (error) {
      console.error('Error getting top interactions:', error);
      return [];
    }
  }

  /**
   * Get user retention metrics
   * @param {number} daysPeriod - Period in days (7, 30, 90, etc.)
   * @returns {Promise<object>}
   */
  async getRetentionMetrics(daysPeriod = 30) {
    try {
      const newUsers = db.prepare(`
        SELECT COUNT(*) as count FROM users
        WHERE created_at > datetime('now', '-${daysPeriod} days')
      `).get();

      const activeUsers = db.prepare(`
        SELECT COUNT(DISTINCT phone_number) as count FROM user_interactions
        WHERE timestamp > datetime('now', '-${daysPeriod} days')
      `).get();

      const returningUsers = db.prepare(`
        SELECT COUNT(DISTINCT phone_number) as count FROM user_interactions
        WHERE timestamp > datetime('now', '-${daysPeriod} days')
        AND phone_number IN (
          SELECT DISTINCT phone_number FROM user_interactions
          WHERE timestamp > datetime('now', '-${daysPeriod * 2} days')
          AND timestamp < datetime('now', '-${daysPeriod} days')
        )
      `).get();

      const retentionRate =
        newUsers.count > 0
          ? ((returningUsers.count / newUsers.count) * 100).toFixed(2)
          : 0;

      return {
        period: `${daysPeriod} days`,
        newUsers: newUsers.count,
        activeUsers: activeUsers.count,
        returningUsers: returningUsers.count,
        retentionRate: parseFloat(retentionRate),
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error getting retention metrics:', error);
      return {};
    }
  }

  /**
   * Get conversation metrics
   * @returns {Promise<object>}
   */
  async getConversationMetrics() {
    try {
      const totalConversations = db.prepare(`
        SELECT COUNT(*) as count FROM messages
      `).get();

      const averageResponseTime = db.prepare(`
        SELECT AVG(response_time) as avg_time FROM messages
        WHERE response_time IS NOT NULL
      `).get();

      const messageSentiment = db.prepare(`
        SELECT 
          sentiment,
          COUNT(*) as count
        FROM messages
        WHERE sentiment IS NOT NULL
        GROUP BY sentiment
      `).all();

      const querySuccessRate = db.prepare(`
        SELECT 
          SUM(CASE WHEN resolved = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
        FROM messages
        WHERE resolved IS NOT NULL
      `).get();

      return {
        totalConversations: totalConversations.count,
        averageResponseTime: averageResponseTime.avg_time || 0,
        sentiment: messageSentiment,
        querySuccessRate: querySuccessRate.success_rate || 0,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error getting conversation metrics:', error);
      return {};
    }
  }

  /**
   * Get real-time dashboard metrics
   * @returns {Promise<object>}
   */
  async getDashboardMetrics() {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      const metrics = {
        todayMetrics: {
          newUsers: db.prepare(`
            SELECT COUNT(*) as count FROM users
            WHERE DATE(created_at) = ?
          `).get(today).count,

          activeUsers: db.prepare(`
            SELECT COUNT(DISTINCT phone_number) as count FROM user_interactions
            WHERE DATE(timestamp) = ?
          `).get(today).count,

          totalMessages: db.prepare(`
            SELECT COUNT(*) as count FROM messages
            WHERE DATE(timestamp) = ?
          `).get(today).count,

          totalRevenue: db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total FROM payment_requests
            WHERE status = 'verified' AND DATE(created_at) = ?
          `).get(today).total,
        },

        overallMetrics: {
          totalUsers: db.prepare(`SELECT COUNT(*) as count FROM users`).get().count,

          totalRevenue: db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total FROM payment_requests
            WHERE status = 'verified'
          `).get().total,

          subscriptionStatus: db.prepare(`
            SELECT 
              status,
              COUNT(*) as count
            FROM user_subscriptions
            GROUP BY status
          `).all(),
        },

        timestamp: now,
      };

      return metrics;
    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      return {};
    }
  }

  /**
   * Export analytics data
   * @param {string} format - 'json' or 'csv'
   * @param {object} options - Export options (dateRange, fields, etc.)
   * @returns {Promise<string>}
   */
  async exportAnalytics(format = 'json', options = {}) {
    try {
      const data = {
        dashboardMetrics: await this.getDashboardMetrics(),
        conversationMetrics: await this.getConversationMetrics(),
        retentionMetrics: await this.getRetentionMetrics(30),
        topInteractions: await this.getTopInteractions(5),
        exportedAt: new Date(),
      };

      if (format === 'csv') {
        return this.convertToCSV(data);
      }

      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting analytics:', error);
      return null;
    }
  }

  /**
   * Convert data to CSV format
   * @private
   */
  convertToCSV(data) {
    let csv = 'Analytics Export\n';
    csv += `Exported: ${data.exportedAt}\n\n`;

    // Dashboard metrics
    csv += 'Dashboard Metrics\n';
    csv += 'Metric,Value\n';
    csv += `Today - New Users,${data.dashboardMetrics.todayMetrics.newUsers}\n`;
    csv += `Today - Active Users,${data.dashboardMetrics.todayMetrics.activeUsers}\n`;
    csv += `Today - Total Messages,${data.dashboardMetrics.todayMetrics.totalMessages}\n`;
    csv += `Total Users,${data.dashboardMetrics.overallMetrics.totalUsers}\n`;
    csv += `Total Revenue,${data.dashboardMetrics.overallMetrics.totalRevenue}\n\n`;

    return csv;
  }
}

module.exports = new AnalyticsService();
