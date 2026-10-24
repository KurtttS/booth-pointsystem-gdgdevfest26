// models/ScanLog.js - ScanLog model directly operating on Supabase scan_logs table
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { Attendee } from './Attendee.js';
import { Booth } from './Booth.js';

export class ScanLog {
  /**
   * Determine points and tier category based on previous completions.
   * 1st to 10th:   100 PTS ('1-10')
   * 11th to 50th:  85 PTS  ('11-50')
   * 51st to 90th:  65 PTS  ('51-90')
   * 91st+:         45 PTS  ('91+')
   */
  static calculatePointsForScanCount(existingCount) {
    const scanNumber = existingCount + 1;
    if (scanNumber <= 10) {
      return { points: 100, category: '1-10', tierIndex: 0 };
    } else if (scanNumber <= 50) {
      return { points: 85, category: '11-50', tierIndex: 1 };
    } else if (scanNumber <= 90) {
      return { points: 65, category: '51-90', tierIndex: 2 };
    } else {
      return { points: 45, category: '91+', tierIndex: 3 };
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
   * Check if an attendee has already scanned at this booth for this event directly in Supabase
   * (Enforces UNIQUE_ATTENDEE_BOOTH_EVENT constraint).
   */
  static async hasScanned(attendeeId, boothId, eventId) {
    if (!isSupabaseConfigured() || !supabase) return false;
    const aId = parseInt(attendeeId, 10);
    const bId = (boothId || '').trim();
    const eId = parseInt(eventId, 10);

    try {
      const { data, error } = await supabase
        .from('scan_logs')
        .select('id')
        .eq('attendeeId', aId)
        .ilike('boothId', bId)
        .eq('eventId', eId)
        .maybeSingle();

      if (!error && data) return true;

      // Fallback for unquoted lowercase column identifiers
      const retry = await supabase
        .from('scan_logs')
        .select('id')
        .eq('attendeeid', aId)
        .ilike('boothid', bId)
        .eq('eventid', eId)
        .maybeSingle();

      return !!retry.data;
    } catch (e) {
      console.error('[Supabase] hasScanned check error:', e.message);
      return false;
    }
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
        .select('attendee_id, ticket_number, ticket_title')
        .eq('event_id', eId);

      if (regErr) {
        console.error('[Supabase] getLeaderboard event_attendees error:', regErr.message);
      }

      const regAttendeeIds = new Set((regRows || []).map(r => r.attendee_id));
      const ticketMap = new Map((regRows || []).map(r => [r.attendee_id, r.ticket_number]));

      // 2. Fetch scan logs strictly for this eventId
      let query = supabase.from('scan_logs').select('*').eq('eventId', eId).limit(5000);
      let { data: logs, error } = await query;
      if (error || !logs) {
        // Fallback for unquoted lowercase column identifiers
        const retry = await supabase.from('scan_logs').select('*').eq('eventid', eId).limit(5000);
        logs = retry.data || [];
      }

      // 3. Aggregate points earned strictly in this event (total from each booth scanned)
      // and track the timestamp when each attendee reached their latest score for tiebreaking
      const totals = new Map();
      const latestScanTimestamps = new Map();

      (logs || []).forEach(log => {
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

      // 4. Eligible attendees: ALL attendees who have scanned in any booth for this event
      // GUARANTEED to be included, plus all registered attendees for this event
      const targetAttendeeIds = Array.from(new Set([
        ...totals.keys(),
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

      // 6. Fill in missing tickets for attendees who scanned
      const missingTicketAttendeeIds = targetAttendeeIds.filter(id => !ticketMap.has(id));
      if (missingTicketAttendeeIds.length > 0) {
        const { data: extraTickets } = await supabase
          .from('event_attendees')
          .select('attendee_id, ticket_number')
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
}
