// models/Event.js - Event entity model directly querying Supabase
import { supabase, isSupabaseConfigured } from '../config/supabase.js';

export class Event {
  static async getAll() {
    if (!isSupabaseConfigured() || !supabase) return [];
    const { data, error } = await supabase.from('events').select('*').order('id', { ascending: true });
    if (error) {
      console.error('[Supabase] Event.getAll error:', error.message);
      return [];
    }
    return data || [];
  }

  static async findById(id) {
    const num = parseInt(id, 10) || 1;
    if (!isSupabaseConfigured() || !supabase) return Event.getDefault(num);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', num)
      .maybeSingle();

    if (error) {
      console.error('[Supabase] Event.findById error:', error.message);
      return Event.getDefault(num);
    }
    return data || Event.getDefault(num);
  }

  static getDefault(id = 1) {
    if (parseInt(id, 10) === 2) {
      return {
        id: 2,
        event_name: 'Professional Dev Day',
        venue: 'Bacolod City College'
      };
    }
    return {
      id: 1,
      event_name: 'Student Dev Day',
      venue: 'Bacolod City College'
    };
  }

  static async create({ event_name, venue, event_date }) {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured.');
    }
    const payload = {
      event_name: (event_name || '').trim(),
      venue: (venue || '').trim() || 'Bacolod City',
      event_date: event_date || null
    };
    const { data, error } = await supabase
      .from('events')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Event.create error:', error.message);
      throw error;
    }
    return data;
  }

  static async update(id, { event_name, venue, event_date }) {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured.');
    }
    const numId = parseInt(id, 10);
    const payload = {};
    if (event_name !== undefined) payload.event_name = (event_name || '').trim();
    if (venue !== undefined) payload.venue = (venue || '').trim();
    if (event_date !== undefined) payload.event_date = event_date || null;

    const { data, error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', numId)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Event.update error:', error.message);
      throw error;
    }
    return data;
  }

  static async delete(id) {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured.');
    }
    const numId = parseInt(id, 10);

    // Clean up dependent records first
    await supabase.from('scan_logs').delete().or(`eventId.eq.${numId},eventid.eq.${numId}`);
    await supabase.from('event_attendees').delete().eq('event_id', numId);

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', numId);

    if (error) {
      console.error('[Supabase] Event.delete error:', error.message);
      throw error;
    }
    return true;
  }
}

