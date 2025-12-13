const bcrypt = require('bcrypt');
const db = require('../database/db');

class UserService {
  // Password validation constants
  static MIN_PASSWORD_LENGTH = 8;
  static SALT_ROUNDS = 10;

  /**
   * Validate password meets security requirements
   */
  static validatePassword(password) {
    if (!password) {
      return { valid: false, error: 'Password is required' };
    }

    if (password.length < this.MIN_PASSWORD_LENGTH) {
      return {
        valid: false,
        error: `Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long (current: ${password.length})`
      };
    }

    return { valid: true };
  }

  /**
   * Hash password for secure storage
   */
  static async hashPassword(password) {
    try {
      const validation = this.validatePassword(password);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const hash = await bcrypt.hash(password, this.SALT_ROUNDS);
      return hash;
    } catch (error) {
      console.error('Error hashing password:', error);
      throw error;
    }
  }

  /**
   * Compare plain password with hash
   */
  static async verifyPassword(plainPassword, hash) {
    try {
      return await bcrypt.compare(plainPassword, hash);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Create a new admin user
   */
  static async createUser(username, password, fullName = '', email = '') {
    try {
      // Validate password
      const validation = this.validatePassword(password);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Validate username
      if (!username || username.trim().length === 0) {
        return { success: false, error: 'Username is required' };
      }

      if (username.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters' };
      }

      // Check if username already exists
      const existingUser = await db.get(
        'SELECT id FROM admin_users WHERE username = ?',
        [username]
      );

      if (existingUser) {
        return { success: false, error: 'Username already exists' };
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Insert user
      await db.run(
        `INSERT INTO admin_users (username, password_hash, full_name, email)
         VALUES (?, ?, ?, ?)`,
        [username, passwordHash, fullName, email]
      );

      return {
        success: true,
        message: `User '${username}' created successfully`
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Authenticate user with username and password
   */
  static async authenticateUser(username, password) {
    try {
      if (!username || !password) {
        return { success: false, error: 'Username and password required' };
      }

      // Get user from database
      const user = await db.get(
        'SELECT id, username, password_hash, is_active FROM admin_users WHERE username = ?',
        [username]
      );

      if (!user) {
        return { success: false, error: 'Invalid username or password' };
      }

      if (!user.is_active) {
        return { success: false, error: 'User account is inactive' };
      }

      // Verify password
      const passwordMatch = await this.verifyPassword(password, user.password_hash);

      if (!passwordMatch) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Update last login
      await db.run(
        'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username
        }
      };
    } catch (error) {
      console.error('Error authenticating user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Change user password
   */
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      // Validate new password
      const validation = this.validatePassword(newPassword);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Get user
      const user = await db.get(
        'SELECT password_hash FROM admin_users WHERE id = ?',
        [userId]
      );

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify current password
      const passwordMatch = await this.verifyPassword(currentPassword, user.password_hash);

      if (!passwordMatch) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Hash new password
      const newHash = await this.hashPassword(newPassword);

      // Update password
      await db.run(
        'UPDATE admin_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newHash, userId]
      );

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      console.error('Error changing password:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset user password (admin only)
   */
  static async resetPassword(userId, newPassword) {
    try {
      // Validate new password
      const validation = this.validatePassword(newPassword);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Check if user exists
      const user = await db.get(
        'SELECT id FROM admin_users WHERE id = ?',
        [userId]
      );

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Hash new password
      const newHash = await this.hashPassword(newPassword);

      // Update password
      await db.run(
        'UPDATE admin_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newHash, userId]
      );

      return { success: true, message: 'Password reset successfully' };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all users
   */
  static async getAllUsers() {
    try {
      const users = await db.all(
        `SELECT id, username, full_name, email, is_active, last_login, created_at
         FROM admin_users ORDER BY created_at DESC`
      );

      return { success: true, users };
    } catch (error) {
      console.error('Error getting users:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user by username
   */
  static async getUserByUsername(username) {
    try {
      const user = await db.get(
        `SELECT id, username, full_name, email, is_active, last_login, created_at
         FROM admin_users WHERE username = ?`,
        [username]
      );

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      return { success: true, user };
    } catch (error) {
      console.error('Error getting user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Deactivate user
   */
  static async deactivateUser(userId) {
    try {
      const result = await db.run(
        'UPDATE admin_users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
      );

      if (result.changes === 0) {
        return { success: false, error: 'User not found' };
      }

      return { success: true, message: 'User deactivated successfully' };
    } catch (error) {
      console.error('Error deactivating user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Activate user
   */
  static async activateUser(userId) {
    try {
      const result = await db.run(
        'UPDATE admin_users SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
      );

      if (result.changes === 0) {
        return { success: false, error: 'User not found' };
      }

      return { success: true, message: 'User activated successfully' };
    } catch (error) {
      console.error('Error activating user:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = UserService;
