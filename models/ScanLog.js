// models/ScanLog.js - ScanLog model directly operating on Supabase scan_logs table
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { Attendee } from './Attendee.js';
import { Booth } from './Booth.js';

export class ScanLog {
  /**
   * Determine points and tier category based on previous completions and booth type.
   *
   * 1. Sponsor booths:
   *    - First 20 visits: 100 PTS
   *    - Visits 21 to 50: 85 PTS
   *    - Visits 51 to 90: 65 PTS
   *    - Visits 91+:      45 PTS
   *
   * 2. GDG booth:
   *    - Flat 65 PTS all throughout
   *    - Attendees can scan twice
   *
   * 3. Other / Standard booths:
   *    - Visits 1 to 10:  100 PTS
   *    - Visits 11 to 50: 85 PTS
   *    - Visits 51 to 90: 65 PTS
   *    - Visits 91+:      45 PTS
   */
  static calculatePointsForScanCount(existingCount, boothType = 'standard') {
    const type = (boothType || 'standard').toString().toLowerCase();
    const scanNumber = existingCount + 1;

    // GDG Booth: Only gives out 65 pts all throughout
    if (type === 'gdg') {
      return {
        points: 65,
        category: '51-90',
        displayCategory: 'all-visits',
        label: 'GDG Official Rate',
        color: 'Blue',
        tierIndex: 2
      };
    }

    // Sponsor Booths: First 20 get 100 pts, then 85 pts up to visit 50
    if (type === 'sponsor') {
      if (scanNumber <= 20) {
        return {
          points: 100,
          category: '1-10',
          displayCategory: '1-20',
          label: 'Early Bird (Top 20)',
          color: 'Green',
          tierIndex: 0
        };
      } else if (scanNumber <= 50) {
        return {
          points: 85,
          category: '11-50',
          displayCategory: '21-50',
          label: 'Prime Time',
          color: 'Yellow',
          tierIndex: 1
        };
      } else if (scanNumber <= 90) {
        return {
          points: 65,
          category: '51-90',
          displayCategory: '51-90',
          label: 'Rush Hour',
          color: 'Blue',
          tierIndex: 2
        };
      } else {
        return {
          points: 45,
          category: '91+',
          displayCategory: '91+',
          label: 'Standard Visit',
          color: 'Red',
          tierIndex: 3
        };
      }
    }

    // Other / Standard Booths: Original 10, 50, 90 tier thresholds
    if (scanNumber <= 10) {
      return {
        points: 100,
        category: '1-10',
        displayCategory: '1-10',
        label: 'Early Bird',
        color: 'Green',
        tierIndex: 0
      };
    } else if (scanNumber <= 50) {
      return {
        points: 85,
        category: '11-50',
        displayCategory: '11-50',
        label: 'Prime Time',
        color: 'Yellow',
        tierIndex: 1
      };
    } else if (scanNumber <= 90) {
      return {
        points: 65,
        category: '51-90',
        displayCategory: '51-90',
        label: 'Rush Hour',
        color: 'Blue',
        tierIndex: 2
      };
    } else {
      return {
        points: 45,
        category: '91+',
        displayCategory: '91+',
        label: 'Standard Visit',
        color: 'Red',
        tierIndex: 3
      };
    }
  }

  /**
   * Count how many scans have already been recorded for this booth challenge directly in Supabase.
   */
  static async countByBoothAndEvent(boothId, eventId) {
    if (!isSupabaseConfigured() || !supabase) return 0;
    const bId = (boothId || '').trim();
    const eId = parseInt(eventId, 10);

    try {
      const { count, error } = await supabase
        .from('scan_logs')
        .select('*', { count: 'exact', head: true })
        .ilike('boothId', bId)
        .eq('eventId', eId);

      if (!error && typeof count === 'number') {
        return count;
      }

      // Fallback for unquoted lowercase column identifiers
      const retry = await supabase
        .from('scan_logs')
        .select('*', { count: 'exact', head: true })
        .ilike('boothid', bId)
        .eq('eventid', eId);

      return retry.count || 0;
    } catch (e) {
      console.error('[Supabase] countByBoothAndEvent error:', e.message);
      return 0;
    }
  }

  /**
   * Count how many times an attendee has scanned at a specific booth for a specific event.
   */
  static async getAttendeeScanCount(attendeeId, boothId, eventId) {
    if (!isSupabaseConfigured() || !supabase) return 0;
    const aId = parseInt(attendeeId, 10);
    const bId = (boothId || '').trim();
    const eId = parseInt(eventId, 10);

    try {
      const { count, error } = await supabase
        .from('scan_logs')
        .select('id', { count: 'exact', head: true })
        .eq('attendeeId', aId)
        .ilike('boothId', bId)
        .eq('eventId', eId);

      if (!error && typeof count === 'number') {
        return count;
      }

      // Fallback for unquoted lowercase column identifiers
      const retry = await supabase
        .from('scan_logs')
        .select('id', { count: 'exact', head: true })
        .eq('attendeeid', aId)
        .ilike('boothid', bId)
        .eq('eventid', eId);

      return retry.count || 0;
    } catch (e) {
      console.error('[Supabase] getAttendeeScanCount error:', e.message);
      return 0;
    }
  }

  /**
   * Alias for getAttendeeScanCount.
   */
  static async countByAttendeeBoothAndEvent(attendeeId, boothId, eventId) {
    return await ScanLog.getAttendeeScanCount(attendeeId, boothId, eventId);
  }

  /**
   * Check if an attendee has already reached their scan limit for this booth.
   * Defaults to 1 scan limit for Sponsor/Other, and 2 for GDG booths.
   */
  static async hasScanned(attendeeId, boothId, eventId, maxAllowed = 1) {
    const count = await ScanLog.getAttendeeScanCount(attendeeId, boothId, eventId);
    return count >= maxAllowed;
  }

  /**
   * Record a new scan log directly in Supabase scan_logs table.
   */
  static async create({ attendeeId, boothId, eventId, points, category }) {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env.');
    }

    const id = `SCAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const payload = {
      id,
      attendeeId: parseInt(attendeeId, 10),
      boothId: (boothId || '').trim(),
      eventId: parseInt(eventId, 10),
      timestamp: new Date().toISOString(),
      points: parseInt(points, 10),
      category
    };

    let { data, error } = await supabase
      .from('scan_logs')
      .insert(payload)
      .select()
      .single();

    if (error) {
      // Retry with lowercase column names if columns were created unquoted in Postgres
      const retry = await supabase
        .from('scan_logs')
        .insert({
          id,
          attendeeid: parseInt(attendeeId, 10),
          boothid: (boothId || '').trim(),
          eventid: parseInt(eventId, 10),
          timestamp: new Date().toISOString(),
          points: parseInt(points, 10),
          category
        })
        .select()
        .single();

      if (retry.error) {
        console.error('[Supabase] ScanLog.create error:', retry.error.message);
        throw new Error(`Failed to save scan in Supabase: ${retry.error.message}`);
      }
      data = retry.data;
    }

    return data || payload;
  }

  /**
   * Retrieve recent scans for a booth directly from Supabase, joined with attendee details.
   */
  static async getRecentScans(boothId, eventId, limit = 500) {
    if (!isSupabaseConfigured() || !supabase) return [];
    const bId = (boothId || '').trim();
    const eId = eventId ? parseInt(eventId, 10) : null;

    let query = supabase
      .from('scan_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (bId) {
      query = query.ilike('boothId', bId);
    }
    if (eId) {
      query = query.eq('eventId', eId);
    }

    let { data: logs, error } = await query;

    if (error) {
      let retryQuery = supabase
        .from('scan_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (bId) retryQuery = retryQuery.ilike('boothid', bId);
      if (eId) retryQuery = retryQuery.eq('eventid', eId);

      const retry = await retryQuery;
      if (retry.error || !retry.data) {
        console.error('[Supabase] getRecentScans error:', retry.error?.message || error.message);
        return [];
      }
      logs = retry.data;
    }

    if (!logs || logs.length === 0) return [];

    // Batch-fetch attendee records & Bevy ticket numbers in 2 queries instead of 2*N queries
    const uniqueAttendeeIds = Array.from(
      new Set(logs.map(l => parseInt(l.attendeeId ?? l.attendeeid, 10)).filter(n => !Number.isNaN(n)))
    );

    const attendeeMap = new Map();
    const ticketMap = new Map();

    if (uniqueAttendeeIds.length > 0) {
      const { data: attRows } = await supabase
        .from('attendees')
        .select('*')
        .in('id', uniqueAttendeeIds);

      (attRows || []).forEach(att => attendeeMap.set(att.id, att));

      let regQuery = supabase
        .from('event_attendees')
        .select('attendee_id, event_id, ticket_number')
        .in('attendee_id', uniqueAttendeeIds);

      if (eId) {
        regQuery = regQuery.eq('event_id', eId);
      }

      const { data: regRows } = await regQuery;
      (regRows || []).forEach(reg => {
        if (reg.ticket_number) {
          ticketMap.set(`${reg.attendee_id}:${reg.event_id}`, reg.ticket_number);
        }
      });
    }

    const booth = bId ? await Booth.findById(bId) : null;

    return logs.map(log => {
      const attId = parseInt(log.attendeeId ?? log.attendeeid, 10);
      const bIdVal = log.boothId ?? log.boothid;
      const evIdVal = parseInt(log.eventId ?? log.eventid, 10);

      const attendee = attendeeMap.get(attId) || null;
      const ticketNum = ticketMap.get(`${attId}:${evIdVal}`) || null;

      const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });

      const displayId = attendee
        ? attendee.qr_code_token || ticketNum || `ID ${String(attendee.id).padStart(3, '0')}`
        : ticketNum || `ID-${attId}`;

      return {
        id: log.id,
        attendeeId: displayId,
        attendeeDbId: attId,
        attendeeName: attendee ? Attendee.getFullName(attendee) : 'Unknown Attendee',
        boothId: bIdVal,
        boothName: booth ? booth.name : bIdVal,
        eventId: evIdVal,
        points: log.points,
        category: log.category,
        timestamp: timeStr,
        rawTimestamp: log.timestamp
      };
    });
  }

  /**
   * Aggregate total points across all booths directly from Supabase for the leaderboard,
   * scoped strictly to the specified event. Only includes attendees registered for this event
   * or scanned in this event, with points earned in this event only.
   */
  static async getLeaderboard(eventId = null) {
    if (!isSupabaseConfigured() || !supabase) return [];
    const eId = eventId ? parseInt(eventId, 10) : 1;

    try {
      // 1. Fetch registered attendees for this specific event from event_attendees
      const { data: regRows, error: regErr } = await supabase
        .from('event_attendees')
        .select('attendee_id, ticket_number, ticket_title, checkin_status, event_id')
        .eq('event_id', eId);

      if (regErr) {
        console.error('[Supabase] getLeaderboard event_attendees error:', regErr.message);
      }

      // Attendees verified to belong strictly to this event
      const allowedAttendeeIds = new Set(
        (regRows || [])
          .filter(r => parseInt(r.event_id, 10) === eId)
          .map(r => r.attendee_id)
      );

      // Only include checked-in registrants (checkin_status === 1) in baseline 0-PTS standings
      const regAttendeeIds = new Set(
        (regRows || [])
          .filter(r => parseInt(r.event_id, 10) === eId && (Number(r.checkin_status) === 1 || r.checkin_status === true))
          .map(r => r.attendee_id)
      );
      const ticketMap = new Map((regRows || []).filter(r => parseInt(r.event_id, 10) === eId).map(r => [r.attendee_id, r.ticket_number]));

      // 2. Fetch scan logs strictly for this eventId
      let query = supabase.from('scan_logs').select('*').eq('eventId', eId).limit(5000);
      let { data: logs, error } = await query;
      if (error || !logs || logs.length === 0) {
        // Fallback for unquoted lowercase column identifiers
        const retry = await supabase.from('scan_logs').select('*').eq('eventid', eId).limit(5000);
        if (retry.data && retry.data.length > 0) {
          logs = retry.data;
        } else {
          logs = logs || [];
        }
      }

      // Strict Event Isolation: guarantee that only scans for this exact event are processed
      // and only attendees registered for this event are counted
      const eventScopedLogs = (logs || []).filter(log => {
        const evId = parseInt(log.eventId ?? log.eventid ?? log.event_id, 10);
        const aId = parseInt(log.attendeeId ?? log.attendeeid ?? log.attendee_id, 10);
        return evId === eId && (allowedAttendeeIds.size === 0 || allowedAttendeeIds.has(aId));
      });

      // 3. Aggregate points earned strictly in this event (total from each booth scanned)
      // and track the timestamp when each attendee reached their latest score for tiebreaking
      const totals = new Map();
      const latestScanTimestamps = new Map();

      eventScopedLogs.forEach(log => {
        const aId = parseInt(log.attendeeId ?? log.attendeeid ?? log.attendee_id, 10);
        const pts = parseInt(log.points ?? log.point ?? 0, 10);
        const rawTime = log.timestamp || log.created_at;
        const parsedTime = rawTime ? new Date(rawTime).getTime() : 0;

        if (!Number.isNaN(aId) && aId > 0) {
          totals.set(aId, (totals.get(aId) || 0) + pts);
          if (parsedTime > 0) {
            const currentLatest = latestScanTimestamps.get(aId) || 0;
            if (parsedTime > currentLatest) {
              latestScanTimestamps.set(aId, parsedTime);
            }
          }
        }
      });

      // 4. Eligible attendees: strictly attendees registered for this event
      const targetAttendeeIds = Array.from(new Set([
        ...Array.from(totals.keys()).filter(id => allowedAttendeeIds.size === 0 || allowedAttendeeIds.has(id)),
        ...regAttendeeIds
      ]));

      if (targetAttendeeIds.length === 0) {
        return [];
      }

      // 5. Fetch attendee profile info from attendees table in Supabase
      const { data: attendees, error: attErr } = await supabase
        .from('attendees')
        .select('*')
        .in('id', targetAttendeeIds);

      if (attErr) {
        console.error('[Supabase] getLeaderboard attendees error:', attErr.message);
      }

      // 6. Fill in missing tickets strictly for this event
      const missingTicketAttendeeIds = targetAttendeeIds.filter(id => !ticketMap.has(id));
      if (missingTicketAttendeeIds.length > 0) {
        const { data: extraTickets } = await supabase
          .from('event_attendees')
          .select('attendee_id, ticket_number, event_id')
          .eq('event_id', eId)
          .in('attendee_id', missingTicketAttendeeIds);

        (extraTickets || []).forEach(t => {
          if (t.ticket_number && !ticketMap.has(t.attendee_id)) {
            ticketMap.set(t.attendee_id, t.ticket_number);
          }
        });
      }

      const attendeeMap = new Map((attendees || []).map(a => [a.id, a]));

      const list = targetAttendeeIds.map(attId => {
        const attendee = attendeeMap.get(attId);
        const points = totals.get(attId) || 0;
        const displayId = attendee
          ? (attendee.qr_code_token || ticketMap.get(attId) || `ID ${String(attId).padStart(3, '0')}`)
          : (ticketMap.get(attId) || `ID ${attId}`);
        const fullName = attendee ? Attendee.getFullName(attendee) : `Attendee ${attId}`;
        const role = attendee?.role || (ticketMap.get(attId) ? 'Registered' : 'Attendee');
        const latestTime = latestScanTimestamps.get(attId) || null;

        return {
          id: displayId,
          rawId: attId,
          name: fullName,
          points,
          role,
          latestScanTimestamp: latestTime,
          latestScanTime: latestTime ? new Date(latestTime).toISOString() : null
        };
      });

      // Sort by points descending.
      // Tiebreaker 1: Who achieved their points earlier (earlier timestamp = ranked higher)
      // Tiebreaker 2: Fallback to ID ascending if timestamps are identical or both have 0 points
      list.sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }

        const timeA = a.latestScanTimestamp || Infinity;
        const timeB = b.latestScanTimestamp || Infinity;

        if (timeA !== timeB) {
          return timeA - timeB; // smaller timestamp = earlier time = higher rank
        }

        return a.rawId - b.rawId;
      });

      return list.map((item, index) => ({
        ...item,
        rank: index + 1
      }));
    } catch (e) {
      console.error('[Supabase] ScanLog.getLeaderboard unexpected error:', e.message);
      return [];
    }
  }

  /**
   * Update an existing points/scan log record
   */
  static async update(id, { attendeeId, boothId, eventId, points, category }) {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured.');
    }
    const cleanId = (id || '').trim();
    if (!cleanId) throw new Error('Scan log ID is required.');

    const updatePayload = {};
    if (attendeeId !== undefined) {
      updatePayload.attendeeId = parseInt(attendeeId, 10);
      updatePayload.attendeeid = parseInt(attendeeId, 10);
    }
    if (boothId !== undefined) {
      updatePayload.boothId = (boothId || '').trim();
      updatePayload.boothid = (boothId || '').trim();
    }
    if (eventId !== undefined) {
      updatePayload.eventId = parseInt(eventId, 10);
      updatePayload.eventid = parseInt(eventId, 10);
    }
    if (points !== undefined) {
      updatePayload.points = parseInt(points, 10);
    }
    if (category !== undefined) {
      updatePayload.category = category;
    }

    // Try standard camelCase columns first
    const camelPayload = {
      ...(attendeeId !== undefined ? { attendeeId: parseInt(attendeeId, 10) } : {}),
      ...(boothId !== undefined ? { boothId: (boothId || '').trim() } : {}),
      ...(eventId !== undefined ? { eventId: parseInt(eventId, 10) } : {}),
      ...(points !== undefined ? { points: parseInt(points, 10) } : {}),
      ...(category !== undefined ? { category } : {})
    };

    let { data, error } = await supabase
      .from('scan_logs')
      .update(camelPayload)
      .eq('id', cleanId)
      .select()
      .single();

    if (error) {
      // Fallback to lowercase column names
      const lowerPayload = {
        ...(attendeeId !== undefined ? { attendeeid: parseInt(attendeeId, 10) } : {}),
        ...(boothId !== undefined ? { boothid: (boothId || '').trim() } : {}),
        ...(eventId !== undefined ? { eventid: parseInt(eventId, 10) } : {}),
        ...(points !== undefined ? { points: parseInt(points, 10) } : {}),
        ...(category !== undefined ? { category } : {})
      };

      const retry = await supabase
        .from('scan_logs')
        .update(lowerPayload)
        .eq('id', cleanId)
        .select()
        .single();

      if (retry.error) {
        console.error('[Supabase] ScanLog.update error:', retry.error.message);
        throw retry.error;
      }
      data = retry.data;
    }
    return data;
  }

  /**
   * Delete a scan log / points record
   */
  static async delete(id) {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured.');
    }
    const cleanId = (id || '').trim();
    if (!cleanId) throw new Error('Scan log ID is required.');

    const { error } = await supabase
      .from('scan_logs')
      .delete()
      .eq('id', cleanId);

    if (error) {
      console.error('[Supabase] ScanLog.delete error:', error.message);
      throw error;
    }
    return true;
  }

  /**
   * Get all scan logs enriched with attendee, booth, and event details
   * specifically formatted for Points Table & Recent Scans
   */
  static async getAllDetailedLogs({ eventId = null, boothId = null, limit = 2000 } = {}) {
    if (!isSupabaseConfigured() || !supabase) return [];

    let query = supabase
      .from('scan_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (eventId) {
      query = query.or(`eventId.eq.${eventId},eventid.eq.${eventId}`);
    }
    if (boothId && boothId !== 'all') {
      query = query.or(`boothId.ilike.${boothId},boothid.ilike.${boothId}`);
    }

    let { data: logs, error } = await query;
    if (error || !logs) {
      const retry = await supabase
        .from('scan_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
      logs = retry.data || [];
    }
    logs = logs || [];

    // Pre-fetch all attendees, booths, and events to enrich logs without N+1 queries
    const [attendees, booths, events] = await Promise.all([
      Attendee.getAll(),
      Booth.getAll(),
      supabase.from('events').select('*').then(res => res.data || [])
    ]);

    const attendeeMap = new Map();
    (attendees || []).forEach(a => attendeeMap.set(a.id, a));

    const boothMap = new Map();
    (booths || []).forEach(b => boothMap.set(b.id.toString().toLowerCase(), b));

    const eventMap = new Map();
    (events || []).forEach(e => eventMap.set(e.id, e.event_name));

    return logs.map(log => {
      const aId = parseInt(log.attendeeId ?? log.attendeeid ?? 0, 10);
      const bId = (log.boothId ?? log.boothid ?? '').toString();
      const eId = parseInt(log.eventId ?? log.eventid ?? 1, 10);

      const attendee = attendeeMap.get(aId);
      const booth = boothMap.get(bId.toLowerCase());
      const eventName = eventMap.get(eId) || (eId === 2 ? 'Professional Dev Day' : 'Student Dev Day');

      const rawTime = log.timestamp || log.created_at || log.createdAt;
      const dateObj = rawTime ? new Date(rawTime) : new Date();

      const timeFormatted = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateFormatted = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

      // Calculate time ago (e.g. 2m ago, 1h ago)
      const diffMs = Date.now() - dateObj.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      let timeAgo = 'Just now';
      if (diffMins > 0 && diffMins < 60) {
        timeAgo = `${diffMins}m ago`;
      } else if (diffHours >= 1 && diffHours < 24) {
        timeAgo = `${diffHours}h ago`;
      } else if (diffHours >= 24) {
        timeAgo = `${Math.floor(diffHours / 24)}d ago`;
      }

      const attendeeName = attendee ? Attendee.getFullName(attendee) : `Attendee #${aId}`;
      const qrCodeToken = attendee?.qr_code_token || `QR-${String(aId).padStart(3, '0')}`;
      const attendeeEmail = attendee?.email || '';

      return {
        id: log.id,
        attendeeDbId: aId,
        attendeeName,
        qrCodeToken,
        attendeeEmail,
        attendeeCompany: attendee?.company || 'Bacolod City',
        boothId: bId,
        boothName: booth ? booth.name : bId,
        boothType: booth ? (booth.booth_type || 'standard') : 'standard',
        eventId: eId,
        eventName,
        points: parseInt(log.points ?? 0, 10),
        category: log.category || '1-10',
        timestamp: rawTime,
        timeFormatted,
        dateFormatted,
        timeAgo
      };
    });
  }
}

