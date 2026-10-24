// controllers/LeaderboardController.js - Aggregates points directly from Supabase scan_logs scoped by event
import { ScanLog } from '../models/ScanLog.js';
import { Event } from '../models/Event.js';

export class LeaderboardController {
  static async showLeaderboard(req, res) {
    try {
      const events = await Event.getAll();
      const defaultEventId = events.length > 0 ? events[0].id : 1;

      // Strictly lock to the booth account's event.
      // Users cannot switch events on the leaderboard unless they change/log in to a different booth account.
      let eventId;
      if (req.session && req.session.isLoggedIn && (req.session.event_id || req.session.eventId)) {
        eventId = parseInt(req.session.event_id || req.session.eventId, 10);
      } else {
        const rawEventId = req.query.event_id || defaultEventId;
        eventId = parseInt(rawEventId, 10) || defaultEventId;
      }

      const currentEvent = await Event.findById(eventId);
      const standings = await ScanLog.getLeaderboard(eventId);
      const sid = req.sessionID || req.query.sid || '';
      const isLoggedIn = !!(req.session && req.session.isLoggedIn);

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
      const sid = req.sessionID || req.query.sid || '';
      const isLoggedIn = !!(req.session && req.session.isLoggedIn);
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
        isLoggedIn,
        sid
      });
    }
  }

  static async getLeaderboardApi(req, res) {
    try {
      const events = await Event.getAll();
      const defaultEventId = events.length > 0 ? events[0].id : 1;

      // Strictly lock API to booth account's event if logged in
      let eventId;
      if (req.session && req.session.isLoggedIn && (req.session.event_id || req.session.eventId)) {
        eventId = parseInt(req.session.event_id || req.session.eventId, 10);
      } else {
        const rawEventId = req.query.event_id || defaultEventId;
        eventId = parseInt(rawEventId, 10) || defaultEventId;
      }

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
