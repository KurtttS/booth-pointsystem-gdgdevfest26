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
    if (!id || !isSupabaseConfigured() || !supabase) return Event.getDefault();
    const num = parseInt(id, 10);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', num)
      .maybeSingle();

    if (error) {
      console.error('[Supabase] Event.findById error:', error.message);
      return Event.getDefault();
    }
    return data || Event.getDefault();
  }

  static getDefault() {
    return {
      id: 1,
      event_name: 'GDG Tech Summit 2026',
      venue: 'University Convention Hall'
    };
  }
}
