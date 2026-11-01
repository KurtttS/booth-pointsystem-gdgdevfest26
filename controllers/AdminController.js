// controllers/AdminController.js - Handles superadmin authentication and portal
import { Admin } from '../models/Admin.js';
import { supabase } from '../config/supabase.js';

export class AdminController {
  static showAdmin(req, res) {
    res.render('SuperAdmin', {
      currentPage: 'SuperAdmin.php',
      message: '',
      messageSuccess: false,
      isLoggedIn: !!(req.session && req.session.isLoggedIn),
      sid: req.sessionID || req.query.sid || ''
    });
  }

  static async processLogin(req, res) {
    const { username, password } = req.body;
    const authResult = await Admin.authenticate(username, password);

    if (authResult.status === 'ok' && authResult.admin) {
      const admin = authResult.admin;
      const displayName = admin.display_name && admin.display_name.trim()
        ? admin.display_name.trim()
        : admin.username;
      const welcomeLabel = admin.display_name && admin.display_name.trim()
        ? `${admin.display_name.trim()} (${admin.username})`
        : admin.username;

      req.session.isLoggedIn = true;
      req.session.isAdmin = true;
      req.session.role = 'admin';
      req.session.adminUser = admin.username;
      req.session.admin_name = displayName;
      req.session.username = admin.username;
      req.session.user = displayName;
      req.session.booth_IDs = 'BOOTH001';
      req.session.booth_id = 'BOOTH001';
      req.session.boothId = 'BOOTH001';

      let count = 0;
      try {
        const { count: c } = await supabase
          .from('scan_logs')
          .select('*', { count: 'exact', head: true });
        count = c || 0;
      } catch (e) {
        // ignore count error
      }

      const sid = req.sessionID || req.query.sid || '';
      req.session.save(() => {
        res.render('SuperAdmin', {
          currentPage: 'SuperAdmin.php',
          message: `Welcome Administrator (${welcomeLabel}). Access Granted. Total Scan Logs Recorded: ${count}.`,
          messageSuccess: true,
          isLoggedIn: true,
          sid
        });
      });
    } else {
      let denialMessage = 'Invalid administrator credentials. Access denied.';
      if (authResult.status === 'inactive') {
        denialMessage = 'This administrator account is currently inactive. Access denied.';
      } else if (authResult.status === 'forbidden_role') {
        denialMessage = 'Access denied. Only administrator accounts can access the SuperAdmin Terminal.';
      }

      res.render('SuperAdmin', {
        currentPage: 'SuperAdmin.php',
        message: denialMessage,
        messageSuccess: false,
        isLoggedIn: !!(req.session && req.session.isLoggedIn),
        sid: req.sessionID || req.query.sid || ''
      });
    }
  }
}

