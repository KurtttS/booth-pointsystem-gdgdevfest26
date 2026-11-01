// controllers/BoothController.js - Handles booth portal navigation, auth, and views
import path from 'path';
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
      // 1. Detect whether the entered username belongs to an active admin or staff account in Supabase
      const adminRecord = await Admin.findByUsername(username);
      if (adminRecord && Admin.isActive(adminRecord)) {
        const isStaff = (adminRecord.role || '').toString().trim().toLowerCase() === 'staff';
        const roleError = isStaff
          ? 'Staff accounts cannot log in to the Booth Portal Terminal. Please use a booth account.'
          : 'Admin accounts cannot log in to the Booth Portal Terminal. Please use a booth account.';
        // Do not return 403 Forbidden; keep the user on the login page with the exact message
        return res.render('LoginBooth', {
          currentPage: 'LoginBooth.php',
          error: roleError,
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
          delete req.session.admin_name;

          // Strictly store booth_IDs in the session as requested
          req.session.booth_IDs = boothAuth.booth.id;
          req.session.booth_id = boothAuth.booth.id;
          req.session.boothId = boothAuth.booth.id;
          req.session.booth_ids = [boothAuth.booth.id];
          req.session.boothName = boothAuth.booth.name;
          req.session.boothSponsor = boothAuth.booth.sponsorName || boothAuth.booth.sponsor || '';
          req.session.boothLocation = boothAuth.booth.location || '';
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

      if (adminRecord && !Admin.isActive(adminRecord)) {
        return res.render('LoginBooth', {
          currentPage: 'LoginBooth.php',
          error: 'This account is inactive and cannot log in to the Booth Portal Terminal.',
          message: null,
          username
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
    const eventId = parseInt(req.session.event_id || req.session.eventId || 1, 10);
    const track = req.session.selected_track || (eventId === 2 ? 'professionals' : 'students');
    const sid = req.sessionID || req.query.sid || '';
    const activeEvent = await Event.findById(eventId);

    res.render('EventChoices', {
      currentPage: 'EventChoices.php',
      track,
      eventId,
      currentEventId: eventId,
      currentEventName: activeEvent ? activeEvent.event_name : (eventId === 2 ? 'Professional Dev Day' : 'Student Dev Day'),
      events,
      boothId,
      boothName: req.session.boothName,
      user: req.session.username,
      sid,
      isLoggedIn: true
    });
  }

  /**
   * Select event & track, update active session to reflect newly selected event,
   * completely clearing previous event info, and save to session.
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
    const resolvedEventName = event ? event.event_name : (selectedTrack === 'professionals' ? 'Professional Dev Day' : 'Student Dev Day');

    // 1. Completely remove all previous event data and cached counters from session
    delete req.session.event_id;
    delete req.session.eventId;
    delete req.session.event_ID;
    delete req.session.selected_event_id;
    delete req.session.selected_track;
    delete req.session.eventName;
    delete req.session.active_context;
    delete req.session.eventVenue;
    delete req.session.total_scans;
    delete req.session.points_distributed;
    delete req.session.unique_visitors;

    // 2. Strictly save newly selected event into session
    req.session.event_id = eventId;
    req.session.eventId = eventId;
    req.session.event_ID = eventId;
    req.session.selected_event_id = eventId;
    req.session.selected_track = selectedTrack;
    req.session.eventName = resolvedEventName;
    req.session.active_context = resolvedEventName;
    req.session.eventVenue = event ? (event.venue || '') : '';

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

    // Active session event is authoritative throughout booth interface
    const eventId = parseInt(req.session.event_id || req.session.eventId || req.query.event_id || 1, 10);
    const event = await Event.findById(eventId);
    const eventName = event ? event.event_name : (eventId === 2 ? 'Professional Dev Day' : 'Student Dev Day');

    // Keep session in sync with newly selected event
    req.session.booth_IDs = boothId;
    req.session.booth_id = boothId;
    req.session.boothId = boothId;
    req.session.event_id = eventId;
    req.session.eventId = eventId;
    req.session.event_ID = eventId;
    req.session.eventName = eventName;
    req.session.active_context = eventName;
    req.session.eventVenue = event ? (event.venue || '') : '';

    const track = req.session.selected_track || req.query.track || (eventId === 2 ? 'professionals' : 'students');
    req.session.selected_track = track;
    if (req.session.save) {
      req.session.save(() => {});
    }

    const initialScans = await ScanLog.getRecentScans(boothId, eventId);
    const totalScans = await ScanLog.countByBoothAndEvent(boothId, eventId);

    res.render('scanner', {
      currentPage: 'scanner.php',
      track,
      eventName,
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
   * Destroy session and log out, redirecting to the appropriate login page.
   * Works for both station/booth accounts (LoginBooth) and admin accounts (SuperAdmin).
   */
  static logout(req, res) {
    const rawSid = req.sessionID || req.query?.sid;
    const isHttps = req.secure || req.headers?.['x-forwarded-proto'] === 'https';
    const cookieOpts = isHttps
      ? { path: '/', secure: true, sameSite: 'none' }
      : { path: '/', sameSite: 'lax' };

    const isAdmin = !!(
      req.session && (req.session.isAdmin || req.session.role === 'admin' || req.session.adminUser)
    ) || req.query?.role === 'admin';

    if (req.sessionStore && req.sessionStore.sessions && rawSid) {
      delete req.sessionStore.sessions[rawSid];
    }

    const redirectUrl = isAdmin
      ? '/SuperAdmin.php?message=' + encodeURIComponent('You have been logged out successfully.')
      : '/LoginBooth.php?message=' + encodeURIComponent('You have been logged out successfully.');

    const finalizeLogout = () => {
      res.clearCookie('connect.sid', cookieOpts);
      res.clearCookie('devfest_sid', cookieOpts);
      res.redirect(redirectUrl);
    };

    if (req.session) {
      req.session.destroy((err) => {
        if (err) console.error('[Session] Logout destroy error:', err);
        finalizeLogout();
      });
    } else {
      finalizeLogout();
    }
  }

  /**
   * Display Dashboard view matching Dashboard.php reference design.
   */
  static async showDashboard(req, res) {
    const sid = req.sessionID || req.query.sid || '';
    const sidQuery = sid ? '?sid=' + encodeURIComponent(sid) : '';

    if (!req.session || !req.session.isLoggedIn) {
      return res.redirect('/LoginBooth.php' + sidQuery + (sidQuery ? '&' : '?') + 'error=' + encodeURIComponent('Access denied. Please log in first.'));
    }

    const boothId = req.session.booth_IDs || req.session.booth_id || req.session.boothId || (req.session.isAdmin ? 'BOOTH001' : null);
    let booth = null;
    if (boothId) {
      booth = await Booth.findById(boothId);
    }
    if (!booth && req.session.username) {
      booth = await Booth.findByUsername(req.session.username);
    }
    if (!booth) {
      booth = await Booth.findById('BOOTH001') || Booth.getDefault();
    }

    const rawEventId = req.session.event_id || req.session.eventId || req.query.event_id || 1;
    const eventId = parseInt(rawEventId, 10) || 1;
    const event = await Event.findById(eventId);
    if (event) {
      req.session.event_id = event.id;
      req.session.eventId = event.id;
      req.session.eventName = event.event_name;
      req.session.active_context = event.event_name;
    }

    const adminName = req.session.admin_name || req.session.username || req.session.adminUser || req.session.boothUser || 'Admin';
    const stationName = booth?.name || req.session.boothName || 'Active Station';
    const stationLocation = booth?.location || event?.venue || '';

    // Calculate metrics using existing ScanLog methods
    let totalScans = 0;
    let scansToday = 0;
    let pointsDistributed = 0;
    let totalUniqueVisitors = 0;
    let rewardRate = 100;
    let tierInfo = ScanLog.calculatePointsForScanCount(0);
    let leaderboard = [];

    try {
      totalScans = await ScanLog.countByBoothAndEvent(booth.id, eventId);
      const recentScans = await ScanLog.getRecentScans(booth.id, eventId, 1000);

      // Scans today
      const todayStr = new Date().toDateString();
      scansToday = recentScans.filter(s => {
        try {
          return new Date(s.rawTimestamp || s.timestamp).toDateString() === todayStr;
        } catch (_) {
          return false;
        }
      }).length;

      // Points distributed
      pointsDistributed = recentScans.reduce((sum, s) => sum + (parseInt(s.points, 10) || 0), 0);

      // Unique visitors
      const uniqueAttendees = new Set(recentScans.map(s => s.attendeeDbId || s.attendeeId));
      totalUniqueVisitors = uniqueAttendees.size;

      // Current reward rate
      tierInfo = ScanLog.calculatePointsForScanCount(totalScans);
      rewardRate = tierInfo.points;

      // Leaderboard: top 5 from existing getLeaderboard logic
      const standings = await ScanLog.getLeaderboard(eventId);
      if (standings && standings.length > 0) {
        leaderboard = standings.slice(0, 5).map((s, idx) => ({
          id: s.name ? `${s.name} (${s.id})` : s.id,
          points: s.points,
          active: idx === 0
        }));
      }
    } catch (e) {
      console.error('[Dashboard] Error retrieving stats:', e.message);
    }

    // Sensible defaults if database is fresh / empty
    if (totalScans === 0 && req.session.total_scans) totalScans = req.session.total_scans;
    if (pointsDistributed === 0 && req.session.points_distributed) pointsDistributed = req.session.points_distributed;
    if (totalUniqueVisitors === 0 && req.session.unique_visitors) totalUniqueVisitors = req.session.unique_visitors;

    const tierLabels = {
      '1-10': 'First 1 - 10 (Early Bird)',
      '11-50': 'Visits 11 - 50 (Prime Time)',
      '51-90': 'Visits 51 - 90 (Rush Hour)',
      '91+': 'Visits 91+ (Standard)'
    };

    res.render('Dashboard', {
      currentPage: 'Dashboard.php',
      admin_name: adminName,
      station_name: stationName,
      station_location: stationLocation,
      eventName: event ? event.event_name : (eventId === 2 ? 'Professional Dev Day' : 'Student Dev Day'),
      total_unique_visitors: totalUniqueVisitors,
      current_reward_rate: rewardRate,
      reward_tier_name: tierLabels[tierInfo.category] || 'First 1 - 10 (Early Bird)',
      points_distributed: pointsDistributed,
      total_scans: totalScans,
      scans_today: scansToday,
      points_awarded: pointsDistributed,
      booth_image: req.session.booth_image || req.session.booth_bg || '/IMG/booth-banner.jpg',
      leaderboard,
      sid,
      isLoggedIn: !!(req.session && req.session.isLoggedIn)
    });
  }

  /**
   * Display Station Profile view.
   * Retrieves actual booth details and sponsor from the database for the active station account.
   * Reflects the actual selected event from database records.
   */
  static async showStationProfile(req, res) {
    const sid = req.sessionID || req.query.sid || '';
    const sidQuery = sid ? '?sid=' + encodeURIComponent(sid) : '';

    if (!req.session || !req.session.isLoggedIn) {
      return res.redirect('/LoginBooth.php' + sidQuery + (sidQuery ? '&' : '?') + 'error=' + encodeURIComponent('Access denied. Please log in first.'));
    }

    // Retrieve booth associated with the logged-in station account from database
    const boothId = req.session.booth_IDs || req.session.booth_id || req.session.boothId;
    let booth = null;
    if (boothId) {
      booth = await Booth.findById(boothId);
    }
    if (!booth && req.session.username) {
      booth = await Booth.findByUsername(req.session.username);
      if (booth) {
        req.session.booth_IDs = booth.id;
        req.session.booth_id = booth.id;
        req.session.boothId = booth.id;
        req.session.boothName = booth.name;
      }
    }
    if (!booth && req.session.isAdmin) {
      booth = await Booth.findById('BOOTH001');
    }

    // Retrieve active selected event from database
    const rawEventId = req.session.event_id || req.session.eventId || req.query.event_id || 1;
    const eventId = parseInt(rawEventId, 10) || 1;
    const event = await Event.findById(eventId);
    if (event) {
      req.session.event_id = event.id;
      req.session.eventId = event.id;
      req.session.eventName = event.event_name;
      req.session.active_context = event.event_name;
    }

    const boothName = booth?.name || req.session.boothName || (req.session.isAdmin ? 'Admin Terminal' : '');
    const sponsor = booth?.sponsorName || booth?.sponsor_name || booth?.sponsor || '';
    const venueLocation = booth?.location || (event?.venue || '');
    const selectedEventName = event?.event_name || (eventId === 2 ? 'Professional Dev Day' : 'Student Dev Day');

    res.render('StationProfile', {
      currentPage: 'StationProfile.php',
      booth_name: boothName,
      boothName,
      sponsor,
      sponsorName: sponsor,
      category: sponsor, // Backward compatibility alias
      venue_location: venueLocation,
      venueLocation,
      selected_event: selectedEventName,
      selectedEventName,
      active_context: selectedEventName,
      activeContext: selectedEventName,
      upload_message: req.query.msg || '',
      upload_status: req.query.status || 'success',
      sid,
      isLoggedIn: true
    });
  }

  /**
   * Handle background image upload for Station Profile.
   */
  static async updateStationProfileBg(req, res) {
    const sid = req.sessionID || req.body?.sid || req.query.sid || '';
    const sidParam = sid ? '?sid=' + encodeURIComponent(sid) : '';

    if (!req.file) {
      const errTarget = '/StationProfile.php' + sidParam + (sidParam ? '&' : '?') + 'msg=' + encodeURIComponent('Please upload a valid image file (JPG, PNG, WEBP).') + '&status=error';
      return res.redirect(errTarget);
    }

    const bannerPath = '/IMG/' + req.file.filename;
    req.session.booth_bg = bannerPath;
    req.session.booth_image = bannerPath;

    if (req.session.save) {
      req.session.save(() => {
        const successTarget = '/StationProfile.php' + sidParam + (sidParam ? '&' : '?') + 'msg=' + encodeURIComponent('Background image updated successfully!') + '&status=success';
        res.redirect(successTarget);
      });
    } else {
      const successTarget = '/StationProfile.php' + sidParam + (sidParam ? '&' : '?') + 'msg=' + encodeURIComponent('Background image updated successfully!') + '&status=success';
      res.redirect(successTarget);
    }
  }
}


