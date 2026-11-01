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
}
