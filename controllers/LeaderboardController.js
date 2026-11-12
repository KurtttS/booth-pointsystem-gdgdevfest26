import { ScanLog } from '../models/ScanLog.js';
import { Event } from '../models/Event.js';

export class LeaderboardController {
  static async showLeaderboard(req, res) {
    const isLoggedIn = !!(req.session && req.session.isLoggedIn);
    const sid = (isLoggedIn && (req.sessionID || req.query.sid)) ? (req.sessionID || req.query.sid) : '';

    // Allow public access to leaderboard without requiring an active booth login account
    // Explicit query param takes top priority so any visitor can view either event leaderboard
    let eventId = null;
    if (req.query.event_id) {
      eventId = parseInt(req.query.event_id, 10);
    } else if (req.query.track) {
      eventId = (req.query.track === 'professionals' || req.query.track === '2') ? 2 : 1;
    } else if (req.session && (req.session.event_id || req.session.eventId || req.session.selected_event_id)) {
      eventId = parseInt(req.session.event_id || req.session.eventId || req.session.selected_event_id, 10);
    } else {
      eventId = 1;
    }

    try {
      const allEvents = await Event.getAll();
      const currentEvent = await Event.findById(eventId);
      const standings = await ScanLog.getLeaderboard(eventId);
      const eventName = currentEvent ? currentEvent.event_name : (eventId === 2 ? 'Professional Dev Day' : 'Student Dev Day');

      res.render('Leaderboard', {
        currentPage: 'Leaderboard.php',
        selectedEventId: eventId,
        currentEvent,
        allEvents: allEvents || [],
        trackName: eventName,
        top1: standings[0] || null,
        top2: standings[1] || null,
        top3: standings[2] || null,
        ranks4to7: standings.slice(3, 7),
        ranks8to12: standings.slice(7),
        totalAttendees: standings.length,
        isLoggedIn,
        isAdmin: !!(req.session && req.session.isAdmin),
        sid
      });
    } catch (err) {
      console.error('LeaderboardController error:', err);
      res.render('Leaderboard', {
        currentPage: 'Leaderboard.php',
        selectedEventId: eventId,
        currentEvent: null,
        allEvents: [],
        trackName: eventId === 2 ? 'Professional Dev Day' : 'Student Dev Day',
        top1: null,
        top2: null,
        top3: null,
        ranks4to7: [],
        ranks8to12: [],
        totalAttendees: 0,
        isLoggedIn,
        sid
      });
    }
  }

  static async getLeaderboardApi(req, res) {
    try {
      // Prioritize explicit query parameter so live leaderboard polling strictly requests its specific event
      const rawEventId = req.query.event_id || req.session?.event_id || req.session?.eventId || 1;
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

  /**
   * Display Admin Leaderboard view matching AdminLeaderboard.php reference design.
   */
  static async showAdminLeaderboard(req, res) {
    const sid = req.sessionID || req.query.sid || '';
    const rawEventId = req.query.event_id || (req.query.track === 'professionals' ? 2 : (req.query.track === 'students' ? 1 : null)) || req.session?.event_id || req.session?.eventId || 1;
    const eventId = parseInt(rawEventId, 10) || 1;

    try {
      const allEvents = await Event.getAll();
      const currentEvent = await Event.findById(eventId);
      const standings = await ScanLog.getLeaderboard(eventId);
      const eventName = currentEvent ? currentEvent.event_name : (eventId === 2 ? 'Professional Dev Day' : 'Student Dev Day');

      res.render('AdminLeaderboard', {
        currentPage: 'AdminLeaderboard.php',
        selectedEventId: eventId,
        currentEvent,
        allEvents: allEvents || [],
        trackName: eventName,
        top1: standings[0] || null,
        top2: standings[1] || null,
        top3: standings[2] || null,
        ranks4to7: standings.slice(3, 7),
        ranks8to12: standings.slice(7),
        totalAttendees: standings.length,
        isLoggedIn: !!(req.session && req.session.isLoggedIn),
        sid
      });
    } catch (err) {
      console.error('showAdminLeaderboard error:', err);
      res.render('AdminLeaderboard', {
        currentPage: 'AdminLeaderboard.php',
        selectedEventId: 1,
        currentEvent: null,
        trackName: 'Leaderboard',
        top1: null,
        top2: null,
        top3: null,
        ranks4to7: [],
        ranks8to12: [],
        totalAttendees: 0,
        isLoggedIn: !!(req.session && req.session.isLoggedIn),
        sid
      });
    }
  }
}

