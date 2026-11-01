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
   * Returns { status: 'ok' | 'inactive' | 'forbidden_role' | 'invalid_credentials', admin }.
   */
  static async authenticate(username, password) {
    if (!username || !password || !isSupabaseConfigured() || !supabase) {
      return { status: 'invalid_credentials', admin: null };
    }
    const cleanUser = username.trim().toLowerCase();

    const admin = await Admin.findByUsername(cleanUser);
    if (!admin) {
      return { status: 'invalid_credentials', admin: null };
    }

    const hash = admin.password_hash || '';
    if (!hash) {
      return { status: 'invalid_credentials', admin: null };
    }

    let isMatch = false;
    try {
      const normalizedHash = hash.replace(/^\$2y\$/, '$2a$');
      isMatch = bcrypt.compareSync(password, normalizedHash);
    } catch (e) {
      console.error('[Admin.authenticate] Bcrypt error:', e.message);
      isMatch = false;
    }

    if (!isMatch) {
      return { status: 'invalid_credentials', admin: null };
    }

    if (!Admin.isActive(admin)) {
      return { status: 'inactive', admin };
    }

    if (!Admin.hasSuperAdminRole(admin)) {
      return { status: 'forbidden_role', admin };
    }

    return { status: 'ok', admin };
  }

  /**
   * Validate admin credentials against admins table in Supabase.
   * Returns active admin record (role === 'admin' & is_active === 1) on success, or null on failure.
   */
  static async validateLogin(username, password) {
    const result = await Admin.authenticate(username, password);
    return result.status === 'ok' ? result.admin : null;
  }
}


