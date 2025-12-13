const db = require('./db');
const moment = require('moment');

class UserService {
  async getOrCreateUser(phoneNumber, name = null) {
    const existingUser = await db.get(
      'SELECT * FROM users WHERE phone_number = ?',
      [phoneNumber]
    );

    if (existingUser) {
      // Check if subscription expired
      if (existingUser.subscription_end_date) {
        const isExpired = moment().isAfter(existingUser.subscription_end_date);
        if (isExpired) {
          await db.run(
            'UPDATE users SET subscription_status = ? WHERE id = ?',
            ['expired', existingUser.id]
          );
          return { ...existingUser, subscription_status: 'expired' };
        }
      }
      return existingUser;
    }

    // Create new user with 30-day subscription
    const startDate = moment();
    const endDate = moment().add(30, 'days');

    await db.run(
      `INSERT INTO users (phone_number, name, subscription_start_date, subscription_end_date, subscription_status)
       VALUES (?, ?, ?, ?, ?)`,
      [phoneNumber, name || 'New User', startDate.toISOString(), endDate.toISOString(), 'active']
    );

    return this.getOrCreateUser(phoneNumber, name);
  }

  async isSubscriptionActive(phoneNumber) {
    const user = await db.get(
      'SELECT * FROM users WHERE phone_number = ?',
      [phoneNumber]
    );

    if (!user) return false;

    if (user.subscription_end_date) {
      return moment().isBefore(user.subscription_end_date);
    }

    return user.subscription_status === 'active';
  }

  async renewSubscription(phoneNumber, daysToAdd = 30) {
    const user = await db.get(
      'SELECT * FROM users WHERE phone_number = ?',
      [phoneNumber]
    );

    if (!user) return false;

    const newEndDate = moment().add(daysToAdd, 'days');

    await db.run(
      'UPDATE users SET subscription_end_date = ?, subscription_status = ? WHERE phone_number = ?',
      [newEndDate.toISOString(), 'active', phoneNumber]
    );

    return true;
  }

  async getAllActiveUsers() {
    return db.all(
      `SELECT * FROM users WHERE subscription_status = 'active' 
       AND (subscription_end_date IS NULL OR subscription_end_date > datetime('now'))`
    );
  }

  async updateUserLastSeen(phoneNumber) {
    await db.run(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE phone_number = ?',
      [phoneNumber]
    );
  }
}

class CommodityService {
  async addCommodity(name, price, description = '', category = '', imagePath = null) {
    const result = await db.run(
      `INSERT INTO commodities (name, price, description, category, image_path)
       VALUES (?, ?, ?, ?, ?)`,
      [name, price, description, category, imagePath]
    );

    return this.getCommodityById(result.lastID);
  }

  async getCommodityById(id) {
    return db.get('SELECT * FROM commodities WHERE id = ?', [id]);
  }

  async searchCommodities(searchTerm) {
    return db.all(
      `SELECT * FROM commodities 
       WHERE is_active = 1 AND (
         name LIKE ? OR 
         description LIKE ? OR 
         category LIKE ?
       )`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
    );
  }

  async getAllCommodities() {
    return db.all('SELECT * FROM commodities WHERE is_active = 1');
  }

  async updateCommodity(id, updates) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    values.push(id);
    values.push(new Date().toISOString());

    await db.run(
      `UPDATE commodities SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`,
      [...values.slice(0, -1), values[values.length - 2], id]
    );

    return this.getCommodityById(id);
  }

  async deleteCommodity(id) {
    await db.run('UPDATE commodities SET is_active = 0 WHERE id = ?', [id]);
    return true;
  }
}

module.exports = {
  UserService: new UserService(),
  CommodityService: new CommodityService(),
};
