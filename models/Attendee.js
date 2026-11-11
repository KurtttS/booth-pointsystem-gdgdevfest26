// models/Attendee.js - Attendee & Bevy Event Registration entity model querying Supabase
import { supabase, isSupabaseConfigured } from '../config/supabase.js';

export class Attendee {
  static async getAll() {
    if (!isSupabaseConfigured() || !supabase) return [];
    const { data, error } = await supabase.from('attendees').select('*');
    if (error) {
      console.error('[Supabase] Attendee.getAll error:', error.message);
      return [];
    }
    return data || [];
  }

  static async findById(id) {
    if (!id || !isSupabaseConfigured() || !supabase) return null;
    const numId = parseInt(id, 10);
    if (Number.isNaN(numId)) return null;

    const { data, error } = await supabase
      .from('attendees')
      .select('*')
      .eq('id', numId)
      .maybeSingle();

    if (error) {
      console.error('[Supabase] Attendee.findById error:', error.message);
      return null;
    }
    return data;
  }

  static async findByQrToken(token) {
    if (!token || !isSupabaseConfigured() || !supabase) return null;
    const cleanToken = token.trim();

    const { data, error } = await supabase
      .from('attendees')
      .select('*')
      .ilike('qr_code_token', cleanToken)
      .maybeSingle();

    if (error) {
      console.error('[Supabase] Attendee.findByQrToken error:', error.message);
      return null;
    }
    return data;
  }

  static async findByEmail(email) {
    if (!email || !isSupabaseConfigured() || !supabase) return null;
    const cleanEmail = email.trim();

    const { data, error } = await supabase
      .from('attendees')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (error) {
      console.error('[Supabase] Attendee.findByEmail error:', error.message);
      return null;
    }
    return data;
  }

  static async findByExplicitIdPattern(query) {
    if (!query || !isSupabaseConfigured() || !supabase) return null;
    const clean = query.trim();

    // Only parse numeric ID when input is purely digits ("1") or explicitly prefixed ("Attendee001", "ID-001")
    // Never strip digits out of ticket numbers like "TKT-2026-001" or "ORD-2026-001"
    let numId = null;
    if (/^\d+$/.test(clean)) {
      numId = parseInt(clean, 10);
    } else {
      const prefixed = clean.match(/^(?:attendee|att|id)[\s#_-]*0*(\d+)$/i);
      if (prefixed && prefixed[1]) {
        numId = parseInt(prefixed[1], 10);
      }
    }

    if (numId && numId > 0) {
      return await Attendee.findById(numId);
    }
    return null;
  }

  static async findByIdentifier(query) {
    if (!query || !isSupabaseConfigured() || !supabase) return null;
    const clean = query.trim();

    // 1. Exact match on QR token
    let match = await Attendee.findByQrToken(clean);
    if (match) return match;

    // 2. Exact match on email
    match = await Attendee.findByEmail(clean);
    if (match) return match;

    // 3. Explicit numeric ID ("1", "Attendee001")
    match = await Attendee.findByExplicitIdPattern(clean);
    if (match) return match;

    return null;
  }

  static async findByFullName(nameQuery) {
    if (!nameQuery || !isSupabaseConfigured() || !supabase) return null;
    const clean = nameQuery.trim();
    if (!clean) return null;

    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      const first = parts[0];
      const last = parts.slice(1).join(' ');
      const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .ilike('first_name', first)
        .ilike('last_name', last)
        .limit(1)
        .maybeSingle();

      if (!error && data) return data;
    }

    return null;
  }

  /**
   * Look up event_attendees by Bevy ticket_number or order_number.
   * Returns matching rows (scoped or unscoped) so caller can distinguish wrong_event vs not_found.
   */
  static async findEventRegistrationsByTicket(code) {
    if (!code || !isSupabaseConfigured() || !supabase) return [];
    const clean = code.trim();

    const { data: byTicket, error: ticketErr } = await supabase
      .from('event_attendees')
      .select('*')
      .ilike('ticket_number', clean);

    if (!ticketErr && byTicket && byTicket.length > 0) {
      return byTicket;
    }

    const { data: byOrder, error: orderErr } = await supabase
      .from('event_attendees')
      .select('*')
      .ilike('order_number', clean);

    if (!orderErr && byOrder && byOrder.length > 0) {
      return byOrder;
    }

    return [];
  }

  /**
   * Resolve a scanned QR code or manual input strictly against the booth's event.
   * If an attendee is registered for Professional Dev Day, scanning at a Student Dev Day booth
   * will NOT insert or route to Professional Dev Day leaderboard; it will reject with WRONG_EVENT.
   * Same goes with Professional Dev Day booth scanning Student Dev Day attendees.
   *
   * Possible return statuses:
   * - 'ok': Attendee exists, registered for this booth's event, and checked in
   * - 'not_checked_in': Attendee is registered for this booth's event, but checkin_status !== 1
   * - 'wrong_event': Attendee is registered for a different event (e.g. Professional instead of Student)
   * - 'not_found': No matching ticket or attendee found in registration records
   */
  static async resolveForEvent({ identifier, name, eventId }) {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env.');
    }

    const boothEventId = parseInt(eventId, 10) || 1;
    const cleanCode = identifier ? identifier.trim() : '';
    const cleanName = name ? name.trim() : '';

    if ((cleanCode && cleanCode.length > 64) || (cleanName && cleanName.length > 100)) {
      return {
        status: 'not_found',
        attendee: null,
        eventAttendee: null,
        boothEventId
      };
    }

    let attendee = null;
    let eventAttendee = null;

    // 1. Check Bevy ticket_number / order_number in event_attendees first
    if (cleanCode) {
      const ticketMatches = await Attendee.findEventRegistrationsByTicket(cleanCode);
      if (ticketMatches.length > 0) {
        // Look for match strictly for the booth's current event
        const matchForBoothEvent = ticketMatches.find(
          row => parseInt(row.event_id, 10) === boothEventId
        );

        if (matchForBoothEvent) {
          eventAttendee = matchForBoothEvent;
          attendee = await Attendee.findById(matchForBoothEvent.attendee_id);
        } else {
          // Ticket belongs to a different event (e.g. Professional Dev Day instead of Student Dev Day)
          // Reject with wrong_event so it does NOT insert or leak across leaderboards
          const otherAttendee = await Attendee.findById(ticketMatches[0].attendee_id);
          return {
            status: 'wrong_event',
            attendee: otherAttendee,
            eventAttendee: null,
            registeredEventId: parseInt(ticketMatches[0].event_id, 10),
            boothEventId
          };
        }
      }
    }

    // 2. If not matched via ticket/order number, look up attendee by qr_code_token, email, ID, or exact full name
    if (!attendee && cleanCode) {
      attendee = await Attendee.findByIdentifier(cleanCode);
      if (!attendee) {
        attendee = await Attendee.findByFullName(cleanCode);
      }
    }

    if (!attendee && cleanName) {
      attendee = await Attendee.findByFullName(cleanName);
    }

    if (!attendee) {
      return {
        status: 'not_found',
        attendee: null,
        eventAttendee: null,
        boothEventId
      };
    }

    // 3. Strictly verify attendee registration in event_attendees for the booth's event
    if (!eventAttendee) {
      const { data: regRows, error: regErr } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('attendee_id', attendee.id);

      if (regErr) {
        console.error('[Supabase] Attendee.resolveForEvent registration check error:', regErr.message);
      }

      if (regRows && regRows.length > 0) {
        const matchForBooth = regRows.find(r => parseInt(r.event_id, 10) === boothEventId);
        if (matchForBooth) {
          eventAttendee = matchForBooth;
        } else {
          // Attendee is registered for a different event: reject so it does not insert into the other leaderboard
          return {
            status: 'wrong_event',
            attendee,
            eventAttendee: null,
            registeredEventId: parseInt(regRows[0].event_id, 10),
            boothEventId
          };
        }
      } else {
        return {
          status: 'not_found',
          attendee,
          eventAttendee: null,
          boothEventId
        };
      }
    }

    // 4. Strictly enforce door check-in status (checkin_status === 1) for the booth's event
    const isCheckedIn =
      Number(eventAttendee.checkin_status) === 1 || eventAttendee.checkin_status === true;

    if (!isCheckedIn) {
      return {
        status: 'not_checked_in',
        attendee,
        eventAttendee,
        boothEventId
      };
    }

    return {
      status: 'ok',
      attendee,
      eventAttendee,
      targetEventId: boothEventId
    };
  }

  static getFullName(attendee) {
    if (!attendee) return 'Unknown Attendee';
    return `${attendee.first_name || ''} ${attendee.last_name || ''}`.trim() || 'Attendee';
  }
}
