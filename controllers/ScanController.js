// controllers/ScanController.js - Handles QR code scanning, tier point allocation, and scan logs
import { Attendee } from '../models/Attendee.js';
import { Booth } from '../models/Booth.js';
import { Event } from '../models/Event.js';
import { ScanLog } from '../models/ScanLog.js';
import { isSupabaseConfigured } from '../config/supabase.js';

export class ScanController {
  /**
   * Process a QR code scan or manual entry when an attendee finishes a challenge at a booth.
   * Strictly validates:
   * 1. Attendee exists in registration records (ticket_number, order_number, qr_code_token, email, or ID)
   * 2. Attendee is registered for the booth's currently selected event (event_attendees)
   * 3. Attendee has checked in at event registration (checkin_status === 1)
   * 4. Attendee has not already scanned at this booth for this event
   * 5. Points are strictly determined by automatic visit tier categories (never manual input)
   */
  static async processScan(req, res) {
    try {
      if (!isSupabaseConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'Supabase credentials missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env.'
        });
      }

      if (!req.session || !req.session.isLoggedIn) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized. Please log in with a booth account.'
        });
      }

      const boothId = req.session.booth_IDs || req.session.booth_id || req.session.boothId;
      const rawEventId = req.session.event_id || req.session.eventId || req.body.event_id || req.query.event_id || 1;
      const eventId = parseInt(rawEventId, 10) || 1;
      req.session.event_id = eventId;
      req.session.eventId = eventId;

      if (!boothId) {
        return res.status(403).json({
          success: false,
          message: 'No assigned booth found in active session.'
        });
      }

      const qrCode = req.body.qr_code || req.body.id || req.body.code;
      const attendeeName = req.body.name || req.body.attendee_name;

      if (!qrCode && !attendeeName) {
        return res.status(400).json({
          success: false,
          message: 'No QR code or Attendee ID provided.'
        });
      }

      // Retrieve booth and selected event details from Supabase
      const booth = (await Booth.findById(boothId)) || Booth.getDefault();
      const event = (await Event.findById(eventId)) || Event.getDefault();

      // Strictly resolve attendee against event_attendees & checkin_status = 1 for selected event
      const resolution = await Attendee.resolveForEvent({
        identifier: qrCode ? String(qrCode).trim() : '',
        name: attendeeName ? String(attendeeName).trim() : '',
        eventId: event.id
      });

      if (resolution.status === 'not_found') {
        const displayRef = qrCode ? `"${String(qrCode).trim()}"` : `"${String(attendeeName).trim()}"`;
        return res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: `Attendee or ticket ${displayRef} was not found in registration records.`
        });
      }

      const { attendee, eventAttendee } = resolution;
      const fullName = Attendee.getFullName(attendee);

      if (resolution.status === 'wrong_event') {
        return res.status(403).json({
          success: false,
          code: 'WRONG_EVENT',
          attendeeName: fullName,
          message: `${fullName} is not registered for ${event.event_name}.`
        });
      }

      if (resolution.status === 'not_checked_in') {
        return res.status(403).json({
          success: false,
          code: 'NOT_CHECKED_IN',
          attendeeName: fullName,
          message: `${fullName} has not checked in at registration for ${event.event_name} yet.`
        });
      }

      const displayAttendeeId =
        attendee.qr_code_token ||
        (eventAttendee && eventAttendee.ticket_number) ||
        `ID ${String(attendee.id).padStart(3, '0')}`;

      // Check if Attendee has already finished this challenge (UNIQUE_ATTENDEE_BOOTH_EVENT in Supabase)
      const alreadyScanned = await ScanLog.hasScanned(attendee.id, booth.id, event.id);
      if (alreadyScanned) {
        return res.status(409).json({
          success: false,
          alreadyScanned: true,
          code: 'ALREADY_SCANNED',
          attendeeId: displayAttendeeId,
          attendeeName: fullName,
          message: `${fullName} has already completed the challenge at ${booth.name}!`
        });
      }

      // Count previous completions for this booth & event directly in Supabase
      const existingScanCount = await ScanLog.countByBoothAndEvent(booth.id, event.id);

      // Determine points & tier category strictly by visit order (never manual input):
      // Visits 1 to 10  -> 100 PTS ('1-10')
      // Visits 11 to 50 -> 85 PTS  ('11-50')
      // Visits 51 to 90 -> 65 PTS  ('51-90')
      // Visits 91+      -> 45 PTS  ('91+')
      const tierResult = ScanLog.calculatePointsForScanCount(existingScanCount);

      // Store directly in Supabase scan_logs table
      const createdLog = await ScanLog.create({
        attendeeId: attendee.id,
        boothId: booth.id,
        eventId: event.id,
        points: tierResult.points,
        category: tierResult.category
      });

      const totalScans = existingScanCount + 1;
      const nextTierInfo = ScanLog.calculatePointsForScanCount(totalScans);

      const timeStr = new Date(createdLog.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });

      return res.status(201).json({
        success: true,
        message: `✓ ${fullName} Scanned (+${tierResult.points} PTS)`,
        scan: {
          id: createdLog.id,
          attendeeId: displayAttendeeId,
          attendeeDbId: attendee.id,
          attendeeName: fullName,
          points: tierResult.points,
          category: tierResult.category,
          timestamp: timeStr,
          boothId: booth.id,
          boothName: booth.name
        },
        stats: {
          totalScans,
          currentTierPoints: nextTierInfo.points,
          awardedPoints: tierResult.points,
          currentCategory: nextTierInfo.category,
          nextTierPoints: nextTierInfo.points
        }
      });
    } catch (err) {
      console.error('ScanController error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'An error occurred while recording the scan in Supabase.'
      });
    }
  }

  /**
   * Return recent scans feed for current booth and selected event directly from Supabase.
   */
  static async getFeed(req, res) {
    try {
      if (!req.session || !req.session.isLoggedIn) {
        return res.status(401).json({ success: false, scans: [], totalScans: 0, message: 'Unauthorized' });
      }

      const boothId = req.session.booth_IDs || req.session.booth_id || req.session.boothId;
      if (!boothId) {
        return res.status(403).json({ success: false, scans: [], totalScans: 0, message: 'No assigned booth found' });
      }

      const rawEventId = req.session.event_id || req.session.eventId || req.query.event_id || 1;
      const eventId = parseInt(rawEventId, 10) || 1;
      req.session.event_id = eventId;
      req.session.eventId = eventId;

      const scans = await ScanLog.getRecentScans(boothId, eventId);
      const totalScans = await ScanLog.countByBoothAndEvent(boothId, eventId);
      const activeTier = ScanLog.calculatePointsForScanCount(totalScans);

      res.json({
        success: true,
        boothId,
        eventId,
        scans,
        totalScans,
        activeTierPoints: activeTier.points
      });
    } catch (err) {
      console.error('getFeed error:', err);
      res.status(500).json({ success: false, scans: [], totalScans: 0 });
    }
  }
}
