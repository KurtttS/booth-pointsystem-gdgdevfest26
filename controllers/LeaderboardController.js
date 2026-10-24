// controllers/LeaderboardController.js - Aggregates points directly from Supabase scan_logs scoped by event
import { ScanLog } from '../models/ScanLog.js';
import { Event } from '../models/Event.js';

export class LeaderboardController {
  static async showLeaderboard(req, res) {
    const sid = req.sessionID || req.query.sid || '';
    const sidQuery = sid ? '?sid=' + encodeURIComponent(sid) : '';

    // Guard 1: When on login page (not logged in), cannot go to leaderboard
    if (!req.session || !req.session.isLoggedIn) {
      return res.redirect('/LoginBooth.php' + sidQuery);
    }

    // Guard 2: When on track selection page (event not chosen yet), check session or query
    const sessionEventId = req.session.event_id || req.session.eventId || req.session.selected_event_id || req.query.event_id;
    if (!sessionEventId) {
      return res.redirect('/EventChoices.php' + sidQuery);
    }

    // Keep session event in sync if passed via query
    if (!req.session.event_id && sessionEventId) {
      req.session.event_id = parseInt(sessionEventId, 10);
    }

    try {
      const eventId = parseInt(sessionEventId, 10);
      const currentEvent = await Event.findById(eventId);
      const standings = await ScanLog.getLeaderboard(eventId);
      const isLoggedIn = true;

      res.render('Leaderboard', {
        currentPage: 'Leaderboard.php',
        selectedEventId: eventId,
        currentEvent,
        trackName: currentEvent ? currentEvent.event_name : `Event ${eventId}`,
        top1: standings[0] || null,
        top2: standings[1] || null,
        top3: standings[2] || null,
        ranks4to7: standings.slice(3, 7),
        ranks8to12: standings.slice(7),
        totalAttendees: standings.length,
        isLoggedIn,
        sid
      });
    } catch (err) {
      console.error('LeaderboardController error:', err);
      res.render('Leaderboard', {
        currentPage: 'Leaderboard.php',
        selectedEventId: 1,
        currentEvent: null,
        trackName: 'Leaderboard',
        top1: null,
        top2: null,
        top3: null,
        ranks4to7: [],
        ranks8to12: [],
        totalAttendees: 0,
        isLoggedIn: true,
        sid
      });
    }
  }

  static async getLeaderboardApi(req, res) {
    try {
      // Prioritize active session event
      const rawEventId = req.session?.event_id || req.session?.eventId || req.query.event_id || 1;
      const eventId = parseInt(rawEventId, 10) || 1;

      const currentEvent = await Event.findById(eventId);
      const standings = await ScanLog.getLeaderboard(eventId);
      res.json({
        success: true,
        event: currentEvent,
        eventId,
        standings
      });
    } catch (err) {
      console.error('getLeaderboardApi error:', err);
      res.status(500).json({ success: false, standings: [] });
    }
  }
}
