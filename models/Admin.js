// models/Admin.js - Admin entity model directly querying Supabase
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import bcrypt from 'bcryptjs';

export class Admin {
  static async getAll() {
    if (!isSupabaseConfigured() || !supabase) return [];
    const { data, error } = await supabase.from('admins').select('*');
    if (error) {
      console.error('[Supabase] Admin.getAll error:', error.message);
      return [];
    }
    return data || [];
  }

  static async findByUsername(username) {
    if (!username || !isSupabaseConfigured() || !supabase) return null;
    const cleanUser = username.trim().toLowerCase();
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .ilike('username', cleanUser)
      .maybeSingle();

    if (error) {
      console.error('[Supabase] Admin.findByUsername error:', error.message);
      return null;
    }
    return data;
  }

  static isActive(admin) {
    if (!admin) return false;
    if (admin.is_active === undefined || admin.is_active === null) return true;
    return Number(admin.is_active) === 1 || admin.is_active === true;
  }

  static hasSuperAdminRole(admin) {
    if (!admin) return false;
    const role = (admin.role || 'admin').toString().trim().toLowerCase();
    return role === 'admin';
  }

  /**
   * Authenticate credentials against admins table in Supabase, enforcing
   * both active status (is_active === 1) and SuperAdmin role (role === 'admin').
   * Returns { status, message, admin }.
   */
  static async authenticate(username, password) {
    if (!username || !username.trim()) {
      return { status: 'missing_username', message: 'Please enter your administrator username.', admin: null };
    }
    if (!password || !password.trim()) {
      return { status: 'missing_password', message: 'Please enter your administrator password.', admin: null };
    }
    if (!isSupabaseConfigured() || !supabase) {
      return { status: 'db_not_configured', message: 'Database service is currently not configured.', admin: null };
    }

    const cleanUser = username.trim().toLowerCase();

    let admin = null;
    try {
      admin = await Admin.findByUsername(cleanUser);
    } catch (err) {
      console.error('[Admin.authenticate] Database lookup failed:', err);
      return { status: 'db_error', message: 'Database query failed. Please try again.', admin: null };
    }

    if (!admin) {
      return { status: 'invalid_credentials', message: 'Invalid administrator credentials. Please check your username and password.', admin: null };
    }

    const storedHash = (admin.password_hash || '').trim();
    if (!storedHash) {
      return { status: 'invalid_credentials', message: 'Account has no password configured. Please contact the system administrator.', admin: null };
    }

    let isMatch = false;
    let needsRehash = false;

    // Check if storedHash is a valid bcrypt hash
    if (/^\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/.test(storedHash)) {
      try {
        const normalizedHash = storedHash.replace(/^\$2y\$/, '$2a$');
        isMatch = bcrypt.compareSync(password, normalizedHash);
      } catch (e) {
        console.error('[Admin.authenticate] Bcrypt verification error:', e.message);
        isMatch = false;
      }
    } else {
      // Legacy plaintext password stored in database: compare directly and upgrade to bcrypt
      if (storedHash === password) {
        isMatch = true;
        needsRehash = true;
      }
    }

    if (!isMatch) {
      return { status: 'invalid_credentials', message: 'Invalid administrator credentials. Please check your username and password.', admin: null };
    }

    // Auto-migrate legacy plaintext passwords to secure bcrypt hashes
    if (needsRehash) {
      try {
        const newHash = bcrypt.hashSync(password, 10);
        await supabase
          .from('admins')
          .update({ password_hash: newHash, updated_at: new Date().toISOString() })
          .eq('id', admin.id);
        admin.password_hash = newHash;
        console.log(`[Admin.authenticate] Auto-upgraded password for admin '${admin.username}' to bcrypt hash.`);
      } catch (rehashErr) {
        console.warn('[Admin.authenticate] Auto-rehash notice:', rehashErr.message);
      }
    }

    if (!Admin.isActive(admin)) {
      return { status: 'inactive', message: 'This administrator account is currently inactive. Access denied.', admin };
    }

    if (!Admin.hasSuperAdminRole(admin)) {
      return { status: 'forbidden_role', message: 'Access denied. Only administrator accounts can access the SuperAdmin Terminal.', admin };
    }

    return { status: 'ok', message: 'Authentication successful.', admin };
  }

  /**
   * Validate admin credentials against admins table in Supabase.
   * Returns active admin record on success, or null on failure.
   */
  static async validateLogin(username, password) {
    const result = await Admin.authenticate(username, password);
    return result.status === 'ok' ? result.admin : null;
  }

  /**
   * Safely update an administrator's password in Supabase with bcrypt hashing.
   */
  static async updatePassword(username, newPassword) {
    if (!username || !newPassword) {
      return { success: false, message: 'Username and new password are required.' };
    }
    if (newPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, message: 'Database connection is not configured.' };
    }

    const cleanUser = username.trim().toLowerCase();
    const admin = await Admin.findByUsername(cleanUser);
    if (!admin) {
      return { success: false, message: 'Administrator account not found.' };
    }

    try {
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      const { error } = await supabase
        .from('admins')
        .update({
          password_hash: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', admin.id);

      if (error) {
        console.error('[Admin.updatePassword] Supabase update error:', error.message);
        return { success: false, message: `Failed to update password: ${error.message}` };
      }

      return { success: true, message: `Password for admin '${admin.username}' has been updated and securely hashed with bcrypt.` };
    } catch (err) {
      console.error('[Admin.updatePassword] Error:', err);
      return { success: false, message: `An unexpected error occurred: ${err.message}` };
    }
  }
}



