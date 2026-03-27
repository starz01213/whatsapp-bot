const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || './data/bot.db';

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`✓ Created data directory: ${dataDir}`);
}

class Database {
  constructor() {
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) reject(err);
        else {
          console.log('Connected to SQLite database');
          this.initializeTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async initializeTables() {
    const createTablesSQL = `
      -- Admin/User accounts for dashboard access
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT,
        full_name TEXT,
        is_active INTEGER DEFAULT 1,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Users/Customers table
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT UNIQUE NOT NULL,
        name TEXT,
        subscription_status TEXT DEFAULT 'active',
        subscription_start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        subscription_end_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Commodities/Products table
      CREATE TABLE IF NOT EXISTS commodities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        image_path TEXT,
        category TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Customer-Product mapping (for personalized info)
      CREATE TABLE IF NOT EXISTS user_commodities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        commodity_id INTEGER NOT NULL,
        custom_price REAL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(commodity_id) REFERENCES commodities(id)
      );

      -- Conversation history
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_phone TEXT NOT NULL,
        user_message TEXT,
        bot_response TEXT,
        message_type TEXT DEFAULT 'text',
        image_path TEXT,
        processed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Bulk messaging jobs
      CREATE TABLE IF NOT EXISTS bulk_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_text TEXT NOT NULL,
        image_path TEXT,
        total_recipients INTEGER,
        sent_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        scheduled_for DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      );

      -- Bulk message recipients tracking
      CREATE TABLE IF NOT EXISTS bulk_message_recipients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bulk_message_id INTEGER NOT NULL,
        user_phone TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        sent_at DATETIME,
        FOREIGN KEY(bulk_message_id) REFERENCES bulk_messages(id)
      );

      -- Updates/Announcements
      CREATE TABLE IF NOT EXISTS updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        image_path TEXT,
        version TEXT,
        status TEXT DEFAULT 'draft',
        published_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Update delivery tracking
      CREATE TABLE IF NOT EXISTS update_delivery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        update_id INTEGER NOT NULL,
        user_phone TEXT NOT NULL,
        delivered_at DATETIME,
        read_at DATETIME,
        FOREIGN KEY(update_id) REFERENCES updates(id)
      );

      -- Admin settings & subscriptions
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_phone TEXT UNIQUE NOT NULL,
        subscription_tier TEXT DEFAULT 'basic',
        monthly_cost REAL DEFAULT 0,
        next_renewal_date DATETIME,
        auto_renew INTEGER DEFAULT 1,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Audit logs
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        performed_by TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- WhatsApp Account Linking Sessions
      CREATE TABLE IF NOT EXISTS linking_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sessionId TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        pin TEXT NOT NULL,
        qrCode TEXT,
        linked INTEGER DEFAULT 0,
        attempts INTEGER DEFAULT 0,
        linkedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- User Subscriptions and Payments
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        trial_started DATETIME,
        trial_end DATETIME,
        subscription_start DATETIME,
        subscription_end DATETIME,
        payment_status TEXT DEFAULT 'pending',
        payment_reference TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Payment Requests
      CREATE TABLE IF NOT EXISTS payment_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        plan_name TEXT NOT NULL,
        amount INTEGER NOT NULL,
        reference_id TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        verified_at DATETIME
      );

      -- Payment Account Configuration
      CREATE TABLE IF NOT EXISTS payment_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_number TEXT NOT NULL,
        bank_name TEXT NOT NULL,
        account_name TEXT NOT NULL,
        payment_method TEXT DEFAULT 'TRANSFER',
        currency TEXT DEFAULT 'NGN',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- User Interactions (for analytics)
      CREATE TABLE IF NOT EXISTS user_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL,
        interaction_type TEXT NOT NULL,
        data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- User Languages (for i18n)
      CREATE TABLE IF NOT EXISTS user_languages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL,
        language_code TEXT DEFAULT 'en',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_linking_sessions_id ON linking_sessions(sessionId);
      CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(user_phone);
      CREATE INDEX IF NOT EXISTS idx_bulk_messages_status ON bulk_messages(status);
      CREATE INDEX IF NOT EXISTS idx_commodities_active ON commodities(is_active);
      CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
      CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
      CREATE INDEX IF NOT EXISTS idx_linking_sessions_id ON linking_sessions(sessionId);
      CREATE INDEX IF NOT EXISTS idx_linking_sessions_phone ON linking_sessions(phone);
      CREATE INDEX IF NOT EXISTS idx_linking_sessions_linked ON linking_sessions(linked);
      CREATE INDEX IF NOT EXISTS idx_user_subscriptions_phone ON user_subscriptions(phone_number);
      CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
      CREATE INDEX IF NOT EXISTS idx_payment_requests_phone ON payment_requests(phone_number);
      CREATE INDEX IF NOT EXISTS idx_payment_requests_ref ON payment_requests(reference_id);
      CREATE INDEX IF NOT EXISTS idx_user_interactions_phone ON user_interactions(phone_number);
      CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);
      CREATE INDEX IF NOT EXISTS idx_user_languages_phone ON user_languages(phone_number);
    `;

    return new Promise((resolve, reject) => {
      this.db.exec(createTablesSQL, (err) => {
        if (err) reject(err);
        else {
          console.log('Database tables initialized');
          resolve();
        }
      });
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  // Synchronous prepare method for better service compatibility
  prepare(sql) {
    const self = this;
    return {
      run: (...params) => {
        return new Promise((resolve, reject) => {
          self.db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
          });
        });
      },
      get: (...params) => {
        return new Promise((resolve, reject) => {
          self.db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      },
      all: (...params) => {
        return new Promise((resolve, reject) => {
          self.db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        });
      }
    };
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else {
          console.log('Database connection closed');
          resolve();
        }
      });
    });
  }
}

module.exports = new Database();
