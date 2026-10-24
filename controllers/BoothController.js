// controllers/BoothController.js - Handles booth portal navigation, auth, and views
import { Booth } from '../models/Booth.js';
import { Admin } from '../models/Admin.js';
import { Event } from '../models/Event.js';
import { ScanLog } from '../models/ScanLog.js';
import { isSupabaseConfigured } from '../config/supabase.js';

export class BoothController {
  /**
   * Display Booth Portal login page.
   * If user is already logged in, prevent returning to login by redirecting forward.
   */
  static showLogin(req, res) {
    // If arriving with logout message or error, ensure user stays on Booth Portal Terminal
    if (req.query.message || req.query.logged_out) {
      return res.render('LoginBooth', {
        currentPage: 'LoginBooth.php',
        error: req.query.error || null,
        message: req.query.message || 'You have been logged out successfully.'
      });
    }

    if (req.session && req.session.isLoggedIn && (req.session.booth_IDs || req.session.booth_id || req.session.boothId)) {
      const sid = req.sessionID || req.query.sid;
      const sidQuery = sid ? '?sid=' + encodeURIComponent(sid) : '';
      if (req.session.event_id || req.session.eventId) {
        return res.redirect('/scanner.php' + sidQuery);
      }
      return res.redirect('/EventChoices.php' + sidQuery);
    }

    res.render('LoginBooth', {
      currentPage: 'LoginBooth.php',
      error: req.query.error || null,
      message: req.query.message || null
    });
  }

  /**
   * Process login against database for both booth accounts and admin accounts.
   * Saves booth_IDs in session upon login and redirects to event choices.
   */
  static async processLogin(req, res) {
    const username = req.body.username ? req.body.username.trim() : '';
    const password = req.body.password ? req.body.password.trim() : '';

    if (!username || !password) {
      return res.render('LoginBooth', {
        currentPage: 'LoginBooth.php',
        error: 'Please enter both username and password.',
        message: null,
        username
      });
    }

    if (!isSupabaseConfigured()) {
      return res.render('LoginBooth', {
        currentPage: 'LoginBooth.php',
        error: 'Supabase is not configured. Ensure your .env file (not .env.txt or .env.example) contains SUPABASE_URL and SUPABASE_ANON_KEY, then restart Node.',
        message: null,
        username
      });
    }

    try {
      // 1. Detect whether the entered username belongs to an admin account in the existing Supabase database
      const adminExists = await Admin.findByUsername(username);
      if (adminExists) {
        // Do not return 403 Forbidden; keep the user on the login page with the exact message
        return res.render('LoginBooth', {
          currentPage: 'LoginBooth.php',
          error: 'Admin accounts cannot log in to the Booth Portal Terminal. Please use a booth account.',
          message: null,
          username
        });
      }

      // 2. Strictly authenticate Booth Account in Supabase (booth_users table)
      const boothAuth = await Booth.validateLogin(username, password);
      if (boothAuth) {
        return req.session.regenerate((regenErr) => {
          if (regenErr) console.error('[Session] Regenerate error:', regenErr);

          req.session.isLoggedIn = true;
          req.session.role = 'booth';
          req.session.userRole = 'booth';
          req.session.username = boothAuth.user.username;
          req.session.user = boothAuth.user.username;
          req.session.boothUser = boothAuth.user.username;

          // Strictly store booth_IDs in the session as requested
          req.session.booth_IDs = boothAuth.booth.id;
          req.session.booth_id = boothAuth.booth.id;
          req.session.boothId = boothAuth.booth.id;
          req.session.booth_ids = [boothAuth.booth.id];
          req.session.boothName = boothAuth.booth.name;
          req.session.isAdmin = false;
          req.session.event_id = null;
          req.session.eventId = null;
          req.session.selected_event_id = null;
          req.session.selected_track = null;

          const sid = req.sessionID;
          return req.session.save((err) => {
            if (err) console.error('[Session] Error saving booth session:', err);
            const target = '/EventChoices.php' + (sid ? '?sid=' + encodeURIComponent(sid) : '');
            return res.redirect(target);
          });
        });
      }

      // 3. Username belongs to a booth account but password is incorrect: keep existing invalid-credentials message
      return res.render('LoginBooth', {
        currentPage: 'LoginBooth.php',
        error: 'Invalid booth credentials. Please enter a valid booth username and password.',
        message: null,
        username
      });
    } catch (err) {
      console.error('[BoothController.processLogin] error:', err);
      const errMsg = err && err.message ? err.message : 'An internal error occurred during authentication. Please try again.';
      return res.render('LoginBooth', {
        currentPage: 'LoginBooth.php',
        error: errMsg,
        message: null,
        username
      });
    }
  }

  /**
   * Display Event / Track choices.
   * Requires active login session.
   */
  static async showChoices(req, res) {
    const boothId = req.session.booth_IDs || req.session.booth_id || req.session.boothId || (req.session.isAdmin ? 'BOOTH001' : null);
    if (!req.session.isLoggedIn || !boothId) {
      return res.redirect('/LoginBooth.php?error=' + encodeURIComponent('Access denied. Please log in first.'));
    }

    const events = await Event.getAll();
    const track = req.session.selected_track || 'students';
    const eventId = req.session.event_id || req.session.eventId || 1;
    const sid = req.sessionID || req.query.sid || '';

    res.render('EventChoices', {
      currentPage: 'EventChoices.php',
      track,
      eventId,
      events,
      boothId,
      boothName: req.session.boothName,
      user: req.session.username,
      sid,
      isLoggedIn: true
    });
  }

  /**
   * Select event & track, log event_id into session and save.
   */
  static async selectTrack(req, res) {
    const boothId = req.session.booth_IDs || req.session.booth_id || req.session.boothId || (req.session.isAdmin ? 'BOOTH001' : null);
    if (!req.session.isLoggedIn || !boothId) {
      return res.redirect('/LoginBooth.php?error=' + encodeURIComponent('Access denied. Please log in first.'));
    }

    const rawEventId = req.body.event_id || req.body.eventId || (req.body.track === 'professionals' ? 2 : 1);
    const eventId = parseInt(rawEventId, 10) || 1;
    const selectedTrack = req.body.track ? req.body.track.trim() : (eventId === 2 ? 'professionals' : 'students');

    const event = await Event.findById(eventId);

    // Strictly save event_id into session as requested
    req.session.event_id = eventId;
    req.session.eventId = eventId;
    req.session.event_ID = eventId;
    req.session.selected_event_id = eventId;
    req.session.selected_track = selectedTrack;
    req.session.eventName = event ? event.event_name : `Event ${eventId}`;

    const sid = req.body.sid || req.query.sid || req.sessionID || '';
    req.session.save((err) => {
      if (err) console.error('[Session] Error saving event selection:', err);
      const target = '/scanner.php?track=' + encodeURIComponent(selectedTrack) + '&event_id=' + eventId + (sid ? '&sid=' + encodeURIComponent(sid) : '');
      res.redirect(target);
    });
  }

  /**
   * Display Scanner terminal.
   * Verifies both login and event selection.
   */
  static async showScanner(req, res) {
    const boothId = req.session.booth_IDs || req.session.booth_id || req.session.boothId || (req.session.isAdmin ? 'BOOTH001' : null);
    if (!req.session.isLoggedIn || !boothId) {
      return res.redirect('/LoginBooth.php?error=' + encodeURIComponent('Access denied. Please log in first.'));
    }

    const sid = req.sessionID || req.query.sid || '';
    const sidQuery = sid ? '?sid=' + encodeURIComponent(sid) : '';

    // If event has not been selected yet, route to EventChoices
    if (!req.session.event_id && !req.session.eventId) {
      return res.redirect('/EventChoices.php' + sidQuery);
    }

    const eventId = parseInt(req.query.event_id || req.session.event_id || req.session.eventId || 1, 10);

    // Keep session in sync
    req.session.booth_IDs = boothId;
    req.session.booth_id = boothId;
    req.session.boothId = boothId;
    req.session.event_id = eventId;
    req.session.eventId = eventId;
    req.session.event_ID = eventId;

    const track = req.query.track || req.session.selected_track || (eventId === 2 ? 'professionals' : 'students');
    req.session.selected_track = track;
    if (req.session.save) {
      req.session.save(() => {});
    }

    const initialScans = await ScanLog.getRecentScans(boothId, eventId);
    const totalScans = await ScanLog.countByBoothAndEvent(boothId, eventId);

    res.render('scanner', {
      currentPage: 'scanner.php',
      track,
      boothId,
      booth_IDs: boothId,
      boothName: req.session.boothName || boothId,
      eventId,
      event_id: eventId,
      initialScans,
      totalScans,
      sid,
      isLoggedIn: true
    });
  }

  /**
   * Destroy session and log out, redirecting to Booth Portal Terminal.
   */
  static logout(req, res) {
    const rawSid = req.sessionID || req.query.sid;
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const cookieOpts = isHttps
      ? { path: '/', secure: true, sameSite: 'none' }
      : { path: '/', sameSite: 'lax' };

    if (req.sessionStore && req.sessionStore.sessions && rawSid) {
      delete req.sessionStore.sessions[rawSid];
    }
    if (req.session) {
      req.session.destroy((err) => {
        if (err) console.error('[Session] Logout destroy error:', err);
        res.clearCookie('connect.sid', cookieOpts);
        res.clearCookie('devfest_sid', cookieOpts);
        res.redirect('/LoginBooth.php?message=' + encodeURIComponent('You have been logged out successfully.'));
      });
    } else {
      res.clearCookie('connect.sid', cookieOpts);
      res.clearCookie('devfest_sid', cookieOpts);
      res.redirect('/LoginBooth.php?message=' + encodeURIComponent('You have been logged out successfully.'));
    }
  }
}

