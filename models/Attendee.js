// models/Attendee.js - Attendee & Bevy Event Registration entity model querying Supabase
import { supabase, isSupabaseConfigured } from '../config/supabase.js';

/**
 * Robustly extract a ticket number or attendee token candidate from various input formats:
 * - Raw string: "TKT-2026-111", "ORD-2026-001"
 * - JSON: {"ticket_number":"TKT-2026-111"}, {"ticket":"..."}, {"id": 15}
 * - URL: https://devfest.example.com/tickets/TKT-2026-111, https://...?ticket=TKT-2026-111
 * - Prefixed text: "Ticket: TKT-2026-111", "#TKT-2026-111"
 */
export function extractTicketCandidate(raw) {
  if (!raw) return '';
  let str = String(raw).trim();

  // Strip enclosing quotes if present
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }

  // 1. JSON payload check
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const obj = JSON.parse(str);
      const val =
        obj.ticket_number ||
        obj.ticketNumber ||
        obj.ticket ||
        obj.tkt ||
        obj.order_number ||
        obj.orderNumber ||
        obj.order ||
        obj.qr_code_token ||
        obj.qrCodeToken ||
        obj.qr_code ||
        obj.qrCode ||
        obj.token ||
        obj.attendee_id ||
        obj.attendeeId ||
        obj.id ||
        obj.code;
      if (val !== undefined && val !== null) {
        str = String(val).trim();
      }
    } catch {
      // not valid JSON, keep str
    }
  }

  // 2. URL check
  if (str.startsWith('http://') || str.startsWith('https://') || str.includes('://')) {
    try {
      const u = new URL(str);
      const qVal =
        u.searchParams.get('ticket') ||
        u.searchParams.get('ticket_number') ||
        u.searchParams.get('ticketNumber') ||
        u.searchParams.get('tkt') ||
        u.searchParams.get('order') ||
        u.searchParams.get('order_number') ||
        u.searchParams.get('id') ||
        u.searchParams.get('attendee_id') ||
        u.searchParams.get('code') ||
        u.searchParams.get('token');
      if (qVal) {
        str = qVal.trim();
      } else {
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length > 0) {
          str = parts[parts.length - 1].trim();
        }
      }
    } catch {
      // invalid URL structure, keep str
    }
  }

  // 3. Strip prefixes like "Ticket:", "Ticket #", "Order:", "#" without stripping TKT- or ORD-
  let stripped = str.replace(/^(?:ticket|order|attendee)[\s#:]+/i, '').trim();
  stripped = stripped.replace(/^#+/, '').trim();
  if (stripped) {
    str = stripped;
  }

  return str;
}

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
   * Look up event_attendees by Bevy ticket_number, order_number, or candidate ID.
   * Matches case-insensitively, trims whitespace, and matches substring or formatting variants.
   */
  static async findEventRegistrationsByTicket(code) {
    if (!code || !isSupabaseConfigured() || !supabase) return [];
    const clean = String(code).trim();
    const candidate = extractTicketCandidate(clean);

    const searchQueries = Array.from(new Set([clean, candidate].filter(Boolean)));

    for (const q of searchQueries) {
      // 1. Exact / case-insensitive check on ticket_number
      const { data: byTicket, error: ticketErr } = await supabase
        .from('event_attendees')
        .select('*')
        .ilike('ticket_number', q);

      if (!ticketErr && byTicket && byTicket.length > 0) {
        return byTicket;
      }

      // 2. Exact / case-insensitive check on order_number
      const { data: byOrder, error: orderErr } = await supabase
        .from('event_attendees')
        .select('*')
        .ilike('order_number', q);

      if (!orderErr && byOrder && byOrder.length > 0) {
        return byOrder;
      }

      // 3. Fallback with spaces replaced by hyphens or vice versa (e.g., "TKT 2026 111" vs "TKT-2026-111")
      if (q.includes(' ') || q.includes('-')) {
        const hyphenated = q.replace(/\s+/g, '-');
        const spaced = q.replace(/[-_]+/g, ' ');
        const { data: byVariant } = await supabase
          .from('event_attendees')
          .select('*')
          .or(`ticket_number.ilike.${hyphenated},ticket_number.ilike.${spaced},order_number.ilike.${hyphenated}`);
        if (byVariant && byVariant.length > 0) return byVariant;
      }

      // 4. Check purely numeric ID against event_attendees.id or attendee_id
      if (/^\d+$/.test(q)) {
        const num = parseInt(q, 10);
        const { data: byRowId } = await supabase
          .from('event_attendees')
          .select('*')
          .eq('id', num);
        if (byRowId && byRowId.length > 0) return byRowId;

        const { data: byAttId } = await supabase
          .from('event_attendees')
          .select('*')
          .eq('attendee_id', num);
        if (byAttId && byAttId.length > 0) return byAttId;
      }
    }

    // 5. Substring fallback for formatted codes like TKT-2026-111 or ORD-2026-001
    const regexMatch = clean.match(/(?:TKT|ORD)-[A-Za-z0-9-]+/i);
    if (regexMatch) {
      const token = regexMatch[0].trim();
      const { data: fuzzy } = await supabase
        .from('event_attendees')
        .select('*')
        .ilike('ticket_number', `%${token}%`);
      if (fuzzy && fuzzy.length > 0) return fuzzy;
    }

    return [];
  }

  /**
   * Resolve a scanned QR code or manual entry for the booth scan.
   * Strictly enforces:
   * 1. Attendee must exist in registration records (ticket_number, order_number, qr_code_token, email, or ID)
   * 2. Attendee must hold a ticket registered for the booth's active event track (event_attendees)
   *    If registered for another event track, strictly reject with 'wrong_event' (no cross-event registration)
   * 3. Attendee must be checked in at event registration (checkin_status === 1)
   *    Door check-in is strictly handled by the registration team; never auto-check in at booths
   * 4. Never auto-provision attendees or tickets on-the-fly
   */
  static async resolveForEvent({ identifier, name, eventId }) {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env.');
    }

    const boothEventId = parseInt(eventId, 10) || 1;
    const cleanCode = identifier ? String(identifier).trim() : '';
    const cleanName = name ? String(name).trim() : '';
    const candidate = extractTicketCandidate(cleanCode);

    if ((cleanCode && cleanCode.length > 255) || (cleanName && cleanName.length > 100)) {
      return {
        status: 'not_found',
        attendee: null,
        eventAttendee: null,
        boothEventId
      };
    }

    let attendee = null;
    let matchedRegistrations = [];

    // 1. Look up Bevy ticket_number or order_number in event_attendees
    if (cleanCode) {
      matchedRegistrations = await Attendee.findEventRegistrationsByTicket(cleanCode);
      if (matchedRegistrations && matchedRegistrations.length > 0) {
        // Resolve attendee entity from the registration's attendee_id
        for (const reg of matchedRegistrations) {
          const attId = reg.attendee_id ?? reg.attendeeid ?? reg.attendeeId;
          if (attId) {
            attendee = await Attendee.findById(attId);
            if (attendee) break;
          }
        }
      }
    }

    // 2. If attendee not yet found, check attendees table via qr_code_token, email, numeric ID, or name
    const lookupCodes = Array.from(new Set([cleanCode, candidate].filter(Boolean)));
    for (const code of lookupCodes) {
      if (!attendee) {
        attendee = await Attendee.findByIdentifier(code);
      }
      if (!attendee) {
        attendee = await Attendee.findByFullName(code);
      }
    }

    if (!attendee && cleanName) {
      attendee = await Attendee.findByFullName(cleanName);
    }

    // If attendee is found but matchedRegistrations is empty, fetch all registrations for this attendee
    if (attendee && (!matchedRegistrations || matchedRegistrations.length === 0)) {
      const { data: regRows, error: regErr } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('attendee_id', attendee.id);

      if (!regErr && regRows && regRows.length > 0) {
        matchedRegistrations = regRows;
      } else {
        // Case fallback if column is named attendeeid
        const { data: altRows } = await supabase
          .from('event_attendees')
          .select('*')
          .eq('attendeeid', attendee.id);
        if (altRows && altRows.length > 0) {
          matchedRegistrations = altRows;
        }
      }
    }

    // If neither attendee nor any registration was found:
    if (!attendee && (!matchedRegistrations || matchedRegistrations.length === 0)) {
      return {
        status: 'not_found',
        attendee: null,
        eventAttendee: null,
        boothEventId
      };
    }

    // If we have registrations but attendee was not fetched:
    if (!attendee && matchedRegistrations.length > 0) {
      const firstReg = matchedRegistrations[0];
      const attId = firstReg.attendee_id ?? firstReg.attendeeid ?? firstReg.attendeeId;
      if (attId) {
        attendee = await Attendee.findById(attId);
      }
    }

    if (!attendee) {
      return {
        status: 'not_found',
        attendee: null,
        eventAttendee: null,
        boothEventId
      };
    }

    // Normalize all registrations found for this attendee
    const normalizedRegs = matchedRegistrations.map(row => {
      const attId = row.attendee_id ?? row.attendeeid ?? row.attendeeId;
      const evId = parseInt(row.event_id ?? row.eventid ?? row.eventId, 10);
      const ticket = row.ticket_number ?? row.ticketnumber ?? row.ticketNumber ?? '';
      const order = row.order_number ?? row.ordernumber ?? row.orderNumber ?? '';
      const chk = row.checkin_status ?? row.checkinstatus ?? row.checkinStatus;
      const isCheckedIn = Number(chk) === 1 || chk === true || chk === '1';

      return {
        raw: row,
        id: row.id,
        attendeeId: attId,
        eventId: evId,
        ticketNumber: ticket,
        orderNumber: order,
        checkinStatus: chk,
        isCheckedIn
      };
    });

    // 3. Strict Event Matching
    // Check if the attendee has a registration for the booth's active event track
    const matchForBoothEvent = normalizedRegs.find(r => r.eventId === boothEventId);

    if (!matchForBoothEvent) {
      // Find what other event they are registered for (if any)
      const otherEventReg = normalizedRegs.find(r => !Number.isNaN(r.eventId) && r.eventId !== boothEventId);
      if (otherEventReg) {
        return {
          status: 'wrong_event',
          attendee,
          registeredEventId: otherEventReg.eventId,
          boothEventId,
          eventAttendee: otherEventReg.raw
        };
      }

      return {
        status: 'not_registered',
        attendee,
        registeredEventId: null,
        boothEventId,
        eventAttendee: null
      };
    }

    // 4. Strict Door Check-in Verification
    // Door check-in is strictly handled at event registration by another team.
    // Booth scanner must reject if checkin_status !== 1. Do NOT auto-check in!
    if (!matchForBoothEvent.isCheckedIn) {
      return {
        status: 'not_checked_in',
        attendee,
        eventAttendee: matchForBoothEvent.raw,
        boothEventId
      };
    }

    // 5. Success: Valid registration for booth's event track and already checked in at door
    return {
      status: 'ok',
      attendee,
      eventAttendee: matchForBoothEvent.raw,
      boothEventId
    };
  }

  static getFullName(attendee) {
    if (!attendee) return 'Unknown Attendee';
    return `${attendee.first_name || ''} ${attendee.last_name || ''}`.trim() || 'Attendee';
  }
}
