// controllers/AdminController.js - Handles Super Admin authentication, overview dashboard, attendees, booths, and analytics
import { Admin } from '../models/Admin.js';
import { Attendee } from '../models/Attendee.js';
import { Booth } from '../models/Booth.js';
import { Event } from '../models/Event.js';
import { ScanLog } from '../models/ScanLog.js';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import bcrypt from 'bcryptjs';

export class AdminController {
  /**
   * Main router for SuperAdmin terminal & views.
   * Renders Login screen if unauthenticated, or the selected SuperAdmin page when authenticated.
   */
  static async showAdmin(req, res) {
    const isLoggedIn = !!(req.session && req.session.isLoggedIn && req.session.isAdmin);
    const sid = req.sessionID || req.query.sid || '';
    const message = req.query.message || req.query.msg || req.query.error || '';
    const messageSuccess = !!(req.query.message || req.query.msg);

    // If not authenticated, render login form matching DevFest login card
    if (!isLoggedIn) {
      return res.render('SuperAdmin', {
        currentPage: 'SuperAdmin.php',
        activeTab: 'login',
        isLoggedIn: false,
        isAdmin: false,
        message,
        messageSuccess,
        adminUser: '',
        displayName: '',
        scanCount: 0,
        sid
      });
    }

    const activeTab = req.query.tab || 'overview';
    const displayName = req.session.admin_name || req.session.adminUser || req.session.username || 'Administrator';
    const adminUser = req.session.adminUser || req.session.username || 'superadmin';

    try {
      // 1. OVERVIEW TAB (Screenshot 1: image_f8b34ecf.png)
      if (activeTab === 'overview') {
        const events = await Event.getAll();
        const selectedEventId = req.query.event_id ? parseInt(req.query.event_id, 10) : null;

        // Fetch all booths and attendees
        const booths = await Booth.getAll();
        const attendees = await Attendee.getAll();

        // Fetch all scan logs to calculate real statistics
        let logsQuery = supabase.from('scan_logs').select('*');
        if (selectedEventId) {
          logsQuery = logsQuery.eq('eventId', selectedEventId);
        }
        let { data: logs, error: logsErr } = await logsQuery;
        if (logsErr && !logs) {
          // fallback for lowercase column names
          const retry = await supabase.from('scan_logs').select('*');
          logs = retry.data || [];
        }
        logs = logs || [];

        // Count attendees/scans per booth for Bar Chart
        const boothAttendanceMap = new Map();
        booths.forEach(b => boothAttendanceMap.set(b.id, 0));
        logs.forEach(l => {
          const bId = (l.boothId ?? l.boothid ?? '').toString();
          boothAttendanceMap.set(bId, (boothAttendanceMap.get(bId) || 0) + 1);
        });

        const attendeesPerBooth = booths.map(b => ({
          id: b.id,
          name: b.name,
          count: boothAttendanceMap.get(b.id) || 0
        }));

        // Compute total points rewarded per booth for Donut Chart
        const boothPointsMap = new Map();
        booths.forEach(b => boothPointsMap.set(b.id, 0));
        logs.forEach(l => {
          const bId = (l.boothId ?? l.boothid ?? '').toString();
          const pts = parseInt(l.points ?? 0, 10);
          boothPointsMap.set(bId, (boothPointsMap.get(bId) || 0) + pts);
        });

        const boothsRewardedPoints = booths
          .map(b => ({
            id: b.id,
            name: b.name,
            points: boothPointsMap.get(b.id) || 0
          }))
          .filter(b => b.points > 0)
          .sort((a, b) => b.points - a.points);

        // Fetch Most Recent Scans for "Most Recent Scans" panel
        const recentScans = await ScanLog.getAllDetailedLogs({
          eventId: selectedEventId,
          limit: 30
        });

        return res.render('SuperAdmin', {
          currentPage: 'SuperAdmin.php',
          activeTab: 'overview',
          isLoggedIn: true,
          isAdmin: true,
          adminUser,
          displayName,
          events: events || [],
          booths: booths || [],
          attendees: attendees || [],
          selectedEventId,
          attendeesPerBooth,
          boothsRewardedPoints,
          recentScans: recentScans || [],
          attendeesInformation: recentScans || [], // backward compatibility alias
          message,
          messageSuccess,
          sid
        });
      }


      // 2. ATTENDEES TAB (Screenshot 2: image_3ccf88ea.png)
      if (activeTab === 'attendees') {
        const events = await Event.getAll();
        const selectedEventId = req.query.event_id ? parseInt(req.query.event_id, 10) : null;
        const searchQuery = (req.query.search || '').trim().toLowerCase();

        // Query attendees
        const { data: attendees, error: attErr } = await supabase
          .from('attendees')
          .select('*')
          .order('id', { ascending: true });

        // Query event_attendees
        const { data: regRows } = await supabase
          .from('event_attendees')
          .select('id, attendee_id, event_id, ticket_number, order_number, checkin_status');

        const eventMap = new Map((events || []).map(e => [e.id, e.event_name]));
        const regMap = new Map();
        (regRows || []).forEach(r => {
          regMap.set(r.attendee_id, r);
        });

        // Map attendees to table format
        let attendeeList = (attendees || []).map(att => {
          const reg = regMap.get(att.id);
          const eventId = reg ? reg.event_id : 1;
          const eventName = eventMap.get(eventId) || (eventId === 2 ? 'Professional Dev Day' : 'Student Dev Day');
          const address = att.company || att.address || 'Bacolod City';
          const email = att.email || `${(att.first_name || 'attendee').toLowerCase()}.${(att.last_name || '').toLowerCase()}@devfestbacolod.org`.replace(/\.\@/, '@');
          const displayId = att.qr_code_token || (reg ? reg.ticket_number : `QR-Attendee-${String(att.id).padStart(3, '0')}`);
          const fullName = Attendee.getFullName(att);

          return {
            id: att.id,
            qrId: displayId,
            fullName,
            firstName: att.first_name || '',
            lastName: att.last_name || '',
            email,
            address,
            eventId,
            eventName
          };
        });

        // Filter by event if selected
        if (selectedEventId) {
          attendeeList = attendeeList.filter(a => a.eventId === selectedEventId);
        }

        // Filter by search query
        if (searchQuery) {
          attendeeList = attendeeList.filter(a =>
            a.qrId.toLowerCase().includes(searchQuery) ||
            a.fullName.toLowerCase().includes(searchQuery) ||
            a.email.toLowerCase().includes(searchQuery) ||
            a.address.toLowerCase().includes(searchQuery) ||
            a.eventName.toLowerCase().includes(searchQuery)
          );
        }

        return res.render('SuperAdmin', {
          currentPage: 'SuperAdmin.php',
          activeTab: 'attendees',
          isLoggedIn: true,
          isAdmin: true,
          adminUser,
          displayName,
          events: events || [],
          selectedEventId,
          searchQuery,
          attendees: attendeeList,
          message,
          messageSuccess,
          sid
        });
      }

      // 3. BOOTH MANAGEMENT / DETAIL TAB (Screenshot 3 & Screenshot 4)
      if (activeTab === 'booths') {
        const events = await Event.getAll();
        const rawBooths = await Booth.getAll();
        const attendees = await Attendee.getAll();
        const selectedBoothId = req.query.booth_id || 'all';

        // Fetch booth_users so each booth row displays its actual login username
        const { data: boothUsers } = await supabase.from('booth_users').select('id, username, booth_id');
        const userMap = new Map();
        (boothUsers || []).forEach(u => {
          if (u.booth_id) userMap.set(u.booth_id.toString().toLowerCase(), u.username);
        });

        // Count scans and points per booth
        const { data: allScanLogs } = await supabase.from('scan_logs').select('boothId, boothid, points');
        const boothScanCountMap = new Map();
        const boothPointsCountMap = new Map();
        (allScanLogs || []).forEach(l => {
          const bId = (l.boothId ?? l.boothid ?? '').toString().toLowerCase();
          boothScanCountMap.set(bId, (boothScanCountMap.get(bId) || 0) + 1);
          boothPointsCountMap.set(bId, (boothPointsCountMap.get(bId) || 0) + (parseInt(l.points ?? 0, 10)));
        });

        let booths = (rawBooths || []).map(b => {
          const bKey = b.id.toString().toLowerCase();
          return {
            ...b,
            loginUsername: userMap.get(bKey) || b.id.toString().toLowerCase(),
            scanCount: boothScanCountMap.get(bKey) || 0,
            totalPoints: boothPointsCountMap.get(bKey) || 0
          };
        });

        const boothFilterType = (req.query.type || 'all').toLowerCase();
        const boothSortBy = req.query.sort || 'name_asc';
        const boothSearch = (req.query.search || '').trim().toLowerCase();

        // Server-side filtering
        if (boothFilterType !== 'all') {
          booths = booths.filter(b => (b.booth_type || 'standard').toLowerCase() === boothFilterType);
        }
        if (boothSearch) {
          booths = booths.filter(b =>
            (b.name || '').toLowerCase().includes(boothSearch) ||
            (b.loginUsername || '').toLowerCase().includes(boothSearch) ||
            (b.location || '').toLowerCase().includes(boothSearch) ||
            (b.sponsorName || b.sponsor || '').toLowerCase().includes(boothSearch)
          );
        }

        // Server-side sorting
        if (boothSortBy === 'name_asc') {
          booths.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else if (boothSortBy === 'name_desc') {
          booths.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        } else if (boothSortBy === 'username') {
          booths.sort((a, b) => (a.loginUsername || '').localeCompare(b.loginUsername || ''));
        } else if (boothSortBy === 'scans_desc') {
          booths.sort((a, b) => (b.scanCount || 0) - (a.scanCount || 0));
        }

        // Screenshot 3: ALL BOOTHS TABLE VIEW
        if (selectedBoothId === 'all') {
          return res.render('SuperAdmin', {
            currentPage: 'SuperAdmin.php',
            activeTab: 'booths',
            selectedBoothId: 'all',
            isLoggedIn: true,
            isAdmin: true,
            adminUser,
            displayName,
            events: events || [],
            booths: booths || [],
            attendees: attendees || [],
            rawBooths: rawBooths || [],
            boothFilterType,
            boothSortBy,
            boothSearch,
            message,
            messageSuccess,
            sid
          });
        }


        // Screenshot 4: BOOTH DETAIL / ANALYTICS VIEW
        const currentBooth = booths.find(b => b.id.toString() === selectedBoothId.toString()) || booths[0];

        if (!currentBooth) {
          return res.redirect(`/SuperAdmin.php?tab=booths&sid=${encodeURIComponent(sid)}`);
        }

        // Fetch scan logs for this booth
        let { data: boothLogs } = await supabase
          .from('scan_logs')
          .select('*')
          .ilike('boothId', currentBooth.id);

        if (!boothLogs || boothLogs.length === 0) {
          const retry = await supabase
            .from('scan_logs')
            .select('*')
            .ilike('boothid', currentBooth.id);
          boothLogs = retry.data || [];
        }
        boothLogs = boothLogs || [];

        // Distinct visitor IDs
        const uniqueAttendeeIds = Array.from(
          new Set(boothLogs.map(l => parseInt(l.attendeeId ?? l.attendeeid, 10)).filter(n => !Number.isNaN(n) && n > 0))
        );

        // Fetch visitor attendee names
        let visitors = [];
        if (uniqueAttendeeIds.length > 0) {
          const { data: attRecords } = await supabase
            .from('attendees')
            .select('id, first_name, last_name, qr_code_token')
            .in('id', uniqueAttendeeIds);

          visitors = (attRecords || []).map(att => ({
            userId: att.qr_code_token || `Attendee${String(att.id).padStart(3, '0')}`,
            username: Attendee.getFullName(att)
          }));
        }

        const totalScans = boothLogs.length;
        const totalUniqueVisitors = uniqueAttendeeIds.length;
        const pointsDistributed = boothLogs.reduce((sum, l) => sum + (parseInt(l.points ?? 0, 10)), 0);

        // Reward rate tier for current scan count
        const rewardTier = ScanLog.calculatePointsForScanCount(totalScans, currentBooth.booth_type);

        // Scans recorded today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const scansToday = boothLogs.filter(l => {
          const ts = l.timestamp || l.createdAt || l.created_at;
          return ts && new Date(ts) >= todayStart;
        }).length;

        return res.render('SuperAdmin', {
          currentPage: 'SuperAdmin.php',
          activeTab: 'booths',
          selectedBoothId: currentBooth.id,
          currentBooth,
          events: events || [],
          booths: booths || [],
          attendees: attendees || [],
          visitors,
          totalUniqueVisitors,
          rewardTier,
          pointsDistributed,
          totalScans,
          scansToday,
          pointsAwarded: pointsDistributed,
          isLoggedIn: true,
          isAdmin: true,
          adminUser,
          displayName,
          message,
          messageSuccess,
          sid
        });
      }

        // 4. POINTS MANAGEMENT TAB (CRUD Points, search, filter, who points belong to)
        if (activeTab === 'points') {
          const events = await Event.getAll();
          const booths = await Booth.getAll();
          const attendees = await Attendee.getAll();
          const selectedEventId = req.query.event_id ? parseInt(req.query.event_id, 10) : null;
          const selectedBoothId = req.query.booth_id || 'all';
          const searchQuery = (req.query.search || '').trim().toLowerCase();
          const pointsFilter = req.query.filter_points || 'all';

          let allPoints = await ScanLog.getAllDetailedLogs({
            eventId: selectedEventId,
            boothId: selectedBoothId
          });

          // Metrics
          const totalPointsDistributed = allPoints.reduce((acc, p) => acc + (p.points || 0), 0);
          const totalScansCount = allPoints.length;
          const avgPoints = totalScansCount > 0 ? Math.round(totalPointsDistributed / totalScansCount) : 0;
          const uniqueAttendeeIds = new Set(allPoints.map(p => p.attendeeDbId));
          const uniqueAttendeesCount = uniqueAttendeeIds.size;

          // Filter by search query
          if (searchQuery) {
            allPoints = allPoints.filter(p =>
              (p.attendeeName || '').toLowerCase().includes(searchQuery) ||
              (p.qrCodeToken || '').toLowerCase().includes(searchQuery) ||
              (p.attendeeEmail || '').toLowerCase().includes(searchQuery) ||
              (p.boothName || '').toLowerCase().includes(searchQuery) ||
              (p.eventName || '').toLowerCase().includes(searchQuery) ||
              (p.id || '').toLowerCase().includes(searchQuery)
            );
          }

          // Filter by points amount if specified
          if (pointsFilter !== 'all') {
            const targetPoints = parseInt(pointsFilter, 10);
            if (!Number.isNaN(targetPoints)) {
              allPoints = allPoints.filter(p => p.points === targetPoints);
            }
          }

          return res.render('SuperAdmin', {
            currentPage: 'SuperAdmin.php',
            activeTab: 'points',
            isLoggedIn: true,
            isAdmin: true,
            adminUser,
            displayName,
            events: events || [],
            booths: booths || [],
            attendees: attendees || [],
            selectedEventId,
            selectedBoothId,
            pointsFilter,
            searchQuery,
            pointsList: allPoints,
            totalPointsDistributed,
            totalScansCount,
            avgPoints,
            uniqueAttendeesCount,
            message,
            messageSuccess,
            sid
          });
        }

        // 5. EVENTS MANAGEMENT TAB
        if (activeTab === 'events') {
          const events = await Event.getAll();
          const booths = await Booth.getAll();
          const { data: attendeesCountData } = await supabase.from('event_attendees').select('event_id, attendee_id');
          const { data: scanLogsData } = await supabase.from('scan_logs').select('eventId, eventid, points');

          const attendeeCountsByEvent = new Map();
          (attendeesCountData || []).forEach(r => {
            attendeeCountsByEvent.set(r.event_id, (attendeeCountsByEvent.get(r.event_id) || 0) + 1);
          });

          const scanCountsByEvent = new Map();
          const pointsByEvent = new Map();
          (scanLogsData || []).forEach(s => {
            const eId = parseInt(s.eventId ?? s.eventid ?? 1, 10);
            scanCountsByEvent.set(eId, (scanCountsByEvent.get(eId) || 0) + 1);
            pointsByEvent.set(eId, (pointsByEvent.get(eId) || 0) + (parseInt(s.points || 0, 10)));
          });

          const eventsWithStats = (events || []).map(ev => ({
            ...ev,
            attendeeCount: attendeeCountsByEvent.get(ev.id) || 0,
            scanCount: scanCountsByEvent.get(ev.id) || 0,
            totalPoints: pointsByEvent.get(ev.id) || 0
          }));

          return res.render('SuperAdmin', {
            currentPage: 'SuperAdmin.php',
            activeTab: 'events',
            isLoggedIn: true,
            isAdmin: true,
            adminUser,
            displayName,
            events: eventsWithStats,
            booths: booths || [],
            attendees: (await Attendee.getAll()) || [],
            message,
            messageSuccess,
            sid
          });
        }

        // Default fallback: redirect to overview
        return res.redirect(`/SuperAdmin.php?tab=overview&sid=${encodeURIComponent(sid)}`);

    } catch (err) {
      console.error('[AdminController.showAdmin] Error loading SuperAdmin page:', err);
      return res.render('SuperAdmin', {
        currentPage: 'SuperAdmin.php',
        activeTab: 'overview',
        isLoggedIn: true,
        isAdmin: true,
        adminUser,
        displayName,
        events: [],
        booths: [],
        attendees: [],
        recentScans: [],
        attendeesPerBooth: [],
        boothsRewardedPoints: [],
        attendeesInformation: [],
        message: 'Error loading dashboard data. Please refresh.',
        messageSuccess: false,
        sid
      });
    }
  }

  /**
   * SuperAdmin Login Authentication
   */
  static async processLogin(req, res) {
    const sid = req.sessionID || req.query.sid || '';
    const username = (req.body.username || '').trim();
    const password = (req.body.password || '').trim();

    if (!username || !password) {
      return res.render('SuperAdmin', {
        currentPage: 'SuperAdmin.php',
        activeTab: 'login',
        message: 'Please enter both administrator username and password.',
        messageSuccess: false,
        isLoggedIn: false,
        isAdmin: false,
        adminUser: '',
        displayName: '',
        scanCount: 0,
        sid
      });
    }

    try {
      const authResult = await Admin.authenticate(username, password);

      if (authResult.status === 'ok' && authResult.admin) {
        const admin = authResult.admin;
        const displayName = admin.display_name && admin.display_name.trim()
          ? admin.display_name.trim()
          : admin.username;

        req.session.isLoggedIn = true;
        req.session.isAdmin = true;
        req.session.role = 'admin';
        req.session.adminUser = admin.username;
        req.session.admin_name = displayName;
        req.session.username = admin.username;
        req.session.user = displayName;

        return req.session.save((err) => {
          if (err) console.error('[AdminController.processLogin] Session save error:', err);
          // Redirect immediately to Super Admin dashboard overview
          return res.redirect(`/SuperAdmin.php?tab=overview${sid ? '&sid=' + encodeURIComponent(sid) : ''}`);
        });
      } else {
        const denialMessage = authResult.message || 'Invalid administrator credentials. Access denied.';
        return res.render('SuperAdmin', {
          currentPage: 'SuperAdmin.php',
          activeTab: 'login',
          message: denialMessage,
          messageSuccess: false,
          isLoggedIn: false,
          isAdmin: false,
          adminUser: '',
          displayName: '',
          scanCount: 0,
          sid
        });
      }
    } catch (err) {
      console.error('[AdminController.processLogin] Unexpected error:', err);
      return res.render('SuperAdmin', {
        currentPage: 'SuperAdmin.php',
        activeTab: 'login',
        message: 'A system error occurred during authentication. Please try again.',
        messageSuccess: false,
        isLoggedIn: false,
        isAdmin: false,
        adminUser: '',
        displayName: '',
        scanCount: 0,
        sid
      });
    }
  }

  /**
   * Add new Attendee into Supabase attendees and event_attendees tables
   */
  static async addAttendee(req, res) {
    const sid = req.sessionID || req.query.sid || '';
    if (!req.session?.isAdmin) {
      return res.redirect('/SuperAdmin.php?error=Unauthorized');
    }

    try {
      const { attendeeId, firstName, lastName, address, eventId } = req.body;
      const cleanFirst = (firstName || '').trim();
      const cleanLast = (lastName || '').trim();
      const cleanAddress = (address || '').trim() || 'Bacolod City';
      const parsedEventId = parseInt(eventId, 10) || 1;

      if (!cleanFirst) {
        return res.redirect(`/SuperAdmin.php?tab=attendees&error=${encodeURIComponent('First name is required.')}&sid=${encodeURIComponent(sid)}`);
      }

      // Generate unique email and QR token if not explicitly provided
      const slug = `${cleanFirst.toLowerCase().replace(/[^a-z0-9]/g, '')}.${(cleanLast || 'attendee').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const uniqueSuffix = Date.now().toString().slice(-4);
      const email = `${slug}.${uniqueSuffix}@devfestbacolod.org`;
      const qrToken = (attendeeId && attendeeId.trim()) ? attendeeId.trim() : `QR-Attendee-${uniqueSuffix}`;

      // 1. Insert into attendees table
      const { data: newAttendee, error: attError } = await supabase
        .from('attendees')
        .insert({
          first_name: cleanFirst,
          last_name: cleanLast || '',
          email,
          company: cleanAddress,
          role: 'Attendee',
          qr_code_token: qrToken
        })
        .select()
        .single();

      if (attError || !newAttendee) {
        console.error('[AdminController.addAttendee] Supabase error:', attError?.message);
        return res.redirect(`/SuperAdmin.php?tab=attendees&error=${encodeURIComponent('Failed to create attendee: ' + (attError?.message || 'Database error'))}&sid=${encodeURIComponent(sid)}`);
      }

      // 2. Register in event_attendees table with checkin_status = 1
      const ticketNum = `TKT-2026-${String(newAttendee.id).padStart(3, '0')}`;
      const orderNum = `ORD-2026-${String(newAttendee.id).padStart(3, '0')}`;

      await supabase
        .from('event_attendees')
        .insert({
          attendee_id: newAttendee.id,
          event_id: parsedEventId,
          order_number: orderNum,
          ticket_number: ticketNum,
          ticket_title: 'General Admission',
          ticket_venue: 'DevFest Venue',
          checkin_status: 1,
          checked_in_at: new Date().toISOString()
        });

      return res.redirect(`/SuperAdmin.php?tab=attendees&message=${encodeURIComponent('Attendee created successfully!')}&sid=${encodeURIComponent(sid)}`);
    } catch (e) {
      console.error('[AdminController.addAttendee] Error:', e);
      return res.redirect(`/SuperAdmin.php?tab=attendees&error=${encodeURIComponent('An unexpected error occurred.')}&sid=${encodeURIComponent(sid)}`);
    }
  }

  /**
   * Edit existing Attendee in Supabase
   */
  static async editAttendee(req, res) {
    const sid = req.sessionID || req.query.sid || '';
    if (!req.session?.isAdmin) {
      return res.redirect('/SuperAdmin.php?error=Unauthorized');
    }

    try {
      const { id, attendeeId, firstName, lastName, email, address, eventId } = req.body;
      const numId = parseInt(id, 10);
      if (!numId) {
        return res.redirect(`/SuperAdmin.php?tab=attendees&error=${encodeURIComponent('Invalid Attendee ID.')}&sid=${encodeURIComponent(sid)}`);
      }

      const cleanFirst = (firstName || '').trim();
      const cleanLast = (lastName || '').trim();
      const cleanEmail = (email || '').trim();
      const cleanAddress = (address || '').trim() || 'Bacolod City';
      const cleanQr = (attendeeId || '').trim();
      const parsedEventId = parseInt(eventId, 10) || 1;

      const updatePayload = {
        first_name: cleanFirst,
        last_name: cleanLast,
        company: cleanAddress,
        qr_code_token: cleanQr
      };
      if (cleanEmail) {
        updatePayload.email = cleanEmail;
      }

      // Update attendee
      const { error: attError } = await supabase
        .from('attendees')
        .update(updatePayload)
        .eq('id', numId);

      if (attError) {
        return res.redirect(`/SuperAdmin.php?tab=attendees&error=${encodeURIComponent(attError.message)}&sid=${encodeURIComponent(sid)}`);
      }

      // Update event registration if needed
      if (parsedEventId) {
        const { data: existingReg } = await supabase
          .from('event_attendees')
          .select('id')
          .eq('attendee_id', numId)
          .maybeSingle();

        if (existingReg) {
          await supabase
            .from('event_attendees')
            .update({ event_id: parsedEventId })
            .eq('id', existingReg.id);
        } else {
          await supabase
            .from('event_attendees')
            .insert({
              attendee_id: numId,
              event_id: parsedEventId,
              order_number: `ORD-2026-${String(numId).padStart(3, '0')}`,
              ticket_number: `TKT-2026-${String(numId).padStart(3, '0')}`,
              checkin_status: 1,
              checked_in_at: new Date().toISOString()
            });
        }
      }

      return res.redirect(`/SuperAdmin.php?tab=attendees&message=${encodeURIComponent('Attendee updated successfully!')}&sid=${encodeURIComponent(sid)}`);
    } catch (e) {
      console.error('[AdminController.editAttendee] Error:', e);
      return res.redirect(`/SuperAdmin.php?tab=attendees&error=${encodeURIComponent('Failed to update attendee.')}&sid=${encodeURIComponent(sid)}`);
    }
  }

  /**
   * Delete Attendee from Supabase
   */
  static async deleteAttendee(req, res) {
    const sid = req.sessionID || req.query.sid || '';
    if (!req.session?.isAdmin) {
      return res.redirect('/SuperAdmin.php?error=Unauthorized');
    }

    try {
      const numId = parseInt(req.body.id || req.query.id, 10);
      if (!numId) {
        return res.redirect(`/SuperAdmin.php?tab=attendees&error=Invalid+ID&sid=${encodeURIComponent(sid)}`);
      }

      // Delete scan logs first
      await supabase.from('scan_logs').delete().or(`attendeeId.eq.${numId},attendeeid.eq.${numId}`);

      // Delete event_attendees
      await supabase.from('event_attendees').delete().eq('attendee_id', numId);

      // Delete attendee
      const { error } = await supabase.from('attendees').delete().eq('id', numId);
      if (error) {
        return res.redirect(`/SuperAdmin.php?tab=attendees&error=${encodeURIComponent(error.message)}&sid=${encodeURIComponent(sid)}`);
      }

      return res.redirect(`/SuperAdmin.php?tab=attendees&message=${encodeURIComponent('Attendee deleted successfully.')}&sid=${encodeURIComponent(sid)}`);
    } catch (e) {
      console.error('[AdminController.deleteAttendee] Error:', e);
      return res.redirect(`/SuperAdmin.php?tab=attendees&error=Failed+to+delete+attendee&sid=${encodeURIComponent(sid)}`);
    }
  }

  /**
   * Add new Booth into Supabase booths table
   */
  static async addBooth(req, res) {
    const sid = req.sessionID || req.query.sid || '';
    if (!req.session?.isAdmin) {
      return res.redirect('/SuperAdmin.php?error=Unauthorized');
    }

    try {
      const { username, boothId, boothName, location, description, sponsorName, boothType } = req.body;
      const cleanUsername = (username || boothId || '').trim();
      const cleanId = cleanUsername;
      const cleanName = (boothName || '').trim();
      const cleanLocation = (location || '').trim();
      const cleanDesc = (description || '').trim();
      const cleanSponsor = (sponsorName || '').trim();
      const cleanType = ['standard', 'sponsor', 'gdg'].includes(boothType) ? boothType : 'standard';

      if (!cleanUsername || !cleanName) {
        return res.redirect(`/SuperAdmin.php?tab=booths&error=${encodeURIComponent('Booth Username and Name are required.')}&sid=${encodeURIComponent(sid)}`);
      }

      const { data, error } = await supabase
        .from('booths')
        .insert({
          id: cleanId,
          name: cleanName,
          location: cleanLocation || 'Activity Area',
          description: cleanDesc || cleanName,
          sponsorName: cleanSponsor || cleanName,
          booth_type: cleanType
        })
        .select()
        .single();

      if (error) {
        return res.redirect(`/SuperAdmin.php?tab=booths&error=${encodeURIComponent('Failed to add booth: ' + error.message)}&sid=${encodeURIComponent(sid)}`);
      }

      // Add default login in booth_users so the booth can log in if needed
      try {
        const defaultHash = bcrypt.hashSync('booth123', 10);
        await supabase
          .from('booth_users')
          .insert({
            username: cleanId.toLowerCase(),
            password_hash: defaultHash,
            booth_id: cleanId
          });
      } catch (_) {}

      return res.redirect(`/SuperAdmin.php?tab=booths&message=${encodeURIComponent('Booth added successfully!')}&sid=${encodeURIComponent(sid)}`);
    } catch (e) {
      console.error('[AdminController.addBooth] Error:', e);
      return res.redirect(`/SuperAdmin.php?tab=booths&error=Failed+to+add+booth&sid=${encodeURIComponent(sid)}`);
    }
  }

  /**
   * Edit existing Booth in Supabase
   */
  static async editBooth(req, res) {
    const sid = req.sessionID || req.query.sid || '';
    if (!req.session?.isAdmin) {
      return res.redirect('/SuperAdmin.php?error=Unauthorized');
    }

    try {
      const { id, boothName, location, description, sponsorName, boothType } = req.body;
      const cleanId = (id || '').trim();
      const cleanName = (boothName || '').trim();
      const cleanLocation = (location || '').trim();
      const cleanDesc = (description || '').trim();
      const cleanSponsor = (sponsorName || '').trim();
      const cleanType = ['standard', 'sponsor', 'gdg'].includes(boothType) ? boothType : 'standard';

      if (!cleanId || !cleanName) {
        return res.redirect(`/SuperAdmin.php?tab=booths&error=${encodeURIComponent('Booth ID and Name are required.')}&sid=${encodeURIComponent(sid)}`);
      }

      const { error } = await supabase
        .from('booths')
        .update({
          name: cleanName,
          location: cleanLocation,
          description: cleanDesc,
          sponsorName: cleanSponsor,
          booth_type: cleanType
        })
        .eq('id', cleanId);

      if (error) {
        return res.redirect(`/SuperAdmin.php?tab=booths&error=${encodeURIComponent(error.message)}&sid=${encodeURIComponent(sid)}`);
      }

      return res.redirect(`/SuperAdmin.php?tab=booths&message=${encodeURIComponent('Booth updated successfully!')}&sid=${encodeURIComponent(sid)}`);
    } catch (e) {
      console.error('[AdminController.editBooth] Error:', e);
      return res.redirect(`/SuperAdmin.php?tab=booths&error=Failed+to+update+booth&sid=${encodeURIComponent(sid)}`);
    }
  }

  /**
   * Delete Booth from Supabase
   */
  static async deleteBooth(req, res) {
    const sid = req.sessionID || req.query.sid || '';
    if (!req.session?.isAdmin) {
      return res.redirect('/SuperAdmin.php?error=Unauthorized');
    }

    try {
      const cleanId = (req.body.id || req.query.id || '').trim();
      if (!cleanId) {
        return res.redirect(`/SuperAdmin.php?tab=booths&error=Invalid+Booth+ID&sid=${encodeURIComponent(sid)}`);
      }

      // Delete scan logs for this booth
      await supabase.from('scan_logs').delete().or(`boothId.eq.${cleanId},boothid.eq.${cleanId}`);

      // Delete booth_users
      await supabase.from('booth_users').delete().eq('booth_id', cleanId);

      // Delete booth
      const { error } = await supabase.from('booths').delete().eq('id', cleanId);
      if (error) {
        return res.redirect(`/SuperAdmin.php?tab=booths&error=${encodeURIComponent(error.message)}&sid=${encodeURIComponent(sid)}`);
      }

      return res.redirect(`/SuperAdmin.php?tab=booths&message=${encodeURIComponent('Booth deleted successfully.')}&sid=${encodeURIComponent(sid)}`);
    } catch (e) {
      console.error('[AdminController.deleteBooth] Error:', e);
      return res.redirect(`/SuperAdmin.php?tab=booths&error=Failed+to+delete+booth&sid=${encodeURIComponent(sid)}`);
    }
  }

  /**
   * Securely update admin password
   */
  static async changePassword(req, res) {
    const sid = req.sessionID || req.query.sid || '';
    const isAdmin = !!(req.session && req.session.isLoggedIn && req.session.isAdmin);

    if (!isAdmin) {
      return res.redirect('/SuperAdmin.php?error=' + encodeURIComponent('Unauthorized. Please log in first.'));
    }

    const username = req.session.adminUser || req.session.username;
    const currentPassword = (req.body.currentPassword || '').trim();
    const newPassword = (req.body.newPassword || '').trim();
    const confirmPassword = (req.body.confirmPassword || '').trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.redirect(`/SuperAdmin.php?tab=overview&error=${encodeURIComponent('All password fields are required.')}&sid=${encodeURIComponent(sid)}`);
    }

    if (newPassword !== confirmPassword) {
      return res.redirect(`/SuperAdmin.php?tab=overview&error=${encodeURIComponent('New password and confirmation do not match.')}&sid=${encodeURIComponent(sid)}`);
    }

    if (newPassword.length < 6) {
      return res.redirect(`/SuperAdmin.php?tab=overview&error=${encodeURIComponent('New password must be at least 6 characters long.')}&sid=${encodeURIComponent(sid)}`);
    }

    const verifyAuth = await Admin.authenticate(username, currentPassword);
    if (verifyAuth.status !== 'ok') {
      return res.redirect(`/SuperAdmin.php?tab=overview&error=${encodeURIComponent('Current password verification failed.')}&sid=${encodeURIComponent(sid)}`);
    }

    const updateResult = await Admin.updatePassword(username, newPassword);
    return res.redirect(`/SuperAdmin.php?tab=overview&message=${encodeURIComponent(updateResult.message)}&sid=${encodeURIComponent(sid)}`);
  }

  /**
   * Add new points record manually (Award points to an attendee)
   */
  static async addPoints(req, res) {
    const sid = req.sessionID || req.query.sid || '';
    if (!req.session?.isAdmin) {
      return res.redirect('/SuperAdmin.php?error=Unauthorized');
    }

    try {
      const { attendeeId, boothId, eventId, points, category } = req.body;
      const parsedAttId = parseInt(attendeeId, 10);
      const cleanBoothId = (boothId || '').trim();
      const parsedEventId = parseInt(eventId, 10) || 1;
      const parsedPoints = parseInt(points, 10) || 100;
      const cleanCat = category || '1-10';

      if (!parsedAttId || !cleanBoothId) {
        return res.redirect(`/SuperAdmin.php?tab=points&error=${encodeURIComponent('Attendee and Booth are required.')}&sid=${encodeURIComponent(sid)}`);
      }

      await ScanLog.create({
        attendeeId: parsedAttId,
        boothId: cleanBoothId,
        eventId: parsedEventId,
        points: parsedPoints,
        category: cleanCat
      });

      return res.redirect(`/SuperAdmin.php?tab=points&message=${encodeURIComponent(`Successfully awarded ${parsedPoints} points!`)}&sid=${encodeURIComponent(sid)}`);
    } catch (e) {
      console.error('[AdminController.addPoints] Error:', e);
      return res.redirect(`/SuperAdmin.php?tab=points&error=${encodeURIComponent('Failed to award points: ' + (e.message || 'Error'))}&sid=${encodeURIComponent(sid)}`);
    }
  }

  /**
   * Edit existing points record
   */
  static async editPoints(req, res) {
    const sid = req.sessionID || req.query.sid || '';
    if (!req.session?.isAdmin) {
      return res.redirect('/SuperAdmin.php?error=Unauthorized');
    }

    try {
      const { id, attendeeId, boothId, eventId, points, category } = req.body;
      const cleanId = (id || '').trim();
      if (!cleanId) {
        return res.redirect(`/SuperAdmin.php?tab=points&error=Invalid+Points+ID&sid=${encodeURIComponent(sid)}`);
      }

      const parsedAttId = attendeeId ? parseInt(attendeeId, 10) : undefined;
      const cleanBoothId = boothId ? boothId.trim() : undefined;
      const parsedEventId = eventId ? parseInt(eventId, 10) : undefined;
      const parsedPoints = points !== undefined ? parseInt(points, 10) : undefined;

      await ScanLog.update(cleanId, {
        attendeeId: parsedAttId,
        boothId: cleanBoothId,
        eventId: parsedEventId,
        points: parsedPoints,
        category
      });

      return res.redirect(`/SuperAdmin.php?tab=points&message=${encodeURIComponent('Points record updated successfully!')}&sid=${encodeURIComponent(sid)}`);
    } catch (e) {
      console.error('[AdminController.editPoints] Error:', e);
      return res.redirect(`/SuperAdmin.php?tab=points&error=${encodeURIComponent('Failed to update points: ' + (e.message || 'Error'))}&sid=${encodeURIComponent(sid)}`);
    }
  }

  /**
   * Delete existing points record
   */
  static async deletePoints(req, res) {
    const sid = req.sessionID || req.query.sid || '';
    if (!req.session?.isAdmin) {
      return res.redirect('/SuperAdmin.php?error=Unauthorized');
    }

    try {
      const cleanId = (req.body.id || req.query.id || '').trim();
      if (!cleanId) {
        return res.redirect(`/SuperAdmin.php?tab=points&error=Invalid+ID&sid=${encodeURIComponent(sid)}`);
      }

      await ScanLog.delete(cleanId);
      return res.redirect(`/SuperAdmin.php?tab=points&message=${encodeURIComponent('Points record deleted successfully.')}&sid=${encodeURIComponent(sid)}`);
    } catch (e) {
      console.error('[AdminController.deletePoints] Error:', e);
      return res.redirect(`/SuperAdmin.php?tab=points&error=${encodeURIComponent('Failed to delete points: ' + (e.message || 'Error'))}&sid=${encodeURIComponent(sid)}`);
    }
  }

  /**
   * Add new Event
   */
  static async addEvent(req, res) {
    const sid = req.sessionID || req.query.sid || '';
    if (!req.session?.isAdmin) {
      return res.redirect('/SuperAdmin.php?error=Unauthorized');
    }

    try {
      const { event_name, venue, event_date } = req.body;
      const cleanName = (event_name || '').trim();
      const cleanVenue = (venue || '').trim() || 'Bacolod City';

      if (!cleanName) {
        return res.redirect(`/SuperAdmin.php?tab=events&error=${encodeURIComponent('Event name is required.')}&sid=${encodeURIComponent(sid)}`);
      }

      await Event.create({
        event_name: cleanName,
        venue: cleanVenue,
        event_date: event_date || null
      });

      return res.redirect(`/SuperAdmin.php?tab=events&message=${encodeURIComponent('Event added successfully!')}&sid=${encodeURIComponent(sid)}`);
    } catch (e) {
      console.error('[AdminController.addEvent] Error:', e);
      return res.redirect(`/SuperAdmin.php?tab=events&error=${encodeURIComponent('Failed to add event: ' + (e.message || 'Error'))}&sid=${encodeURIComponent(sid)}`);
    }
  }

  /**
   * Edit existing Event
   */
  static async editEvent(req, res) {
    const sid = req.sessionID || req.query.sid || '';
    if (!req.session?.isAdmin) {
      return res.redirect('/SuperAdmin.php?error=Unauthorized');
    }

    try {
      const { id, event_name, venue, event_date } = req.body;
      const numId = parseInt(id, 10);
      const cleanName = (event_name || '').trim();
      const cleanVenue = (venue || '').trim();

      if (!numId || !cleanName) {
        return res.redirect(`/SuperAdmin.php?tab=events&error=${encodeURIComponent('Event ID and Name are required.')}&sid=${encodeURIComponent(sid)}`);
      }

      await Event.update(numId, {
        event_name: cleanName,
        venue: cleanVenue,
        event_date: event_date || null
      });

      return res.redirect(`/SuperAdmin.php?tab=events&message=${encodeURIComponent('Event updated successfully!')}&sid=${encodeURIComponent(sid)}`);
    } catch (e) {
      console.error('[AdminController.editEvent] Error:', e);
      return res.redirect(`/SuperAdmin.php?tab=events&error=${encodeURIComponent('Failed to update event: ' + (e.message || 'Error'))}&sid=${encodeURIComponent(sid)}`);
    }
  }

  /**
   * Delete existing Event
   */
  static async deleteEvent(req, res) {
    const sid = req.sessionID || req.query.sid || '';
    if (!req.session?.isAdmin) {
      return res.redirect('/SuperAdmin.php?error=Unauthorized');
    }

    try {
      const numId = parseInt(req.body.id || req.query.id, 10);
      if (!numId) {
        return res.redirect(`/SuperAdmin.php?tab=events&error=Invalid+Event+ID&sid=${encodeURIComponent(sid)}`);
      }

      await Event.delete(numId);
      return res.redirect(`/SuperAdmin.php?tab=events&message=${encodeURIComponent('Event deleted successfully.')}&sid=${encodeURIComponent(sid)}`);
    } catch (e) {
      console.error('[AdminController.deleteEvent] Error:', e);
      return res.redirect(`/SuperAdmin.php?tab=events&error=${encodeURIComponent('Failed to delete event: ' + (e.message || 'Error'))}&sid=${encodeURIComponent(sid)}`);
    }
  }
}




