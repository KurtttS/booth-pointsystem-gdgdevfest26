// config/supabase.js - Direct Supabase Client with live .env reload & Windows resilience
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import dns from 'dns';
import fs from 'fs';

// Fix common Windows / ISP Node.js "TypeError: fetch failed" caused by broken IPv6 DNS resolution to *.supabase.co
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

function loadEnvWithWindowsFallback() {
  dotenv.config();
  if (!process.env.SUPABASE_URL && fs.existsSync('.env.txt')) {
    console.warn('[Supabase] Found .env.txt instead of .env (Windows hidden file extension). Loading .env.txt...');
    dotenv.config({ path: '.env.txt' });
  }
}

loadEnvWithWindowsFallback();

export let supabase = null;
let verifiedOnce = false;

function initSupabaseIfNeeded() {
  if (supabase) return true;

  loadEnvWithWindowsFallback();
  const rawUrl = (process.env.SUPABASE_URL || '').trim().replace(/^['"]|['"]$/g, '').replace(/\/+$/, '');
  const rawKey = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/^['"]|['"]$/g, '');
  const supabaseUrl = rawUrl;
  const supabaseKey = rawKey;

  const valid = !!(
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseUrl.includes('your-project')
  );

  if (valid) {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    console.log(`[Supabase] Client initialized for: ${supabaseUrl}`);

    if (!verifiedOnce) {
      verifiedOnce = true;
      supabase
        .from('booth_users')
        .select('id', { count: 'exact', head: true })
        .then(({ count, error }) => {
          if (error) {
            console.error(`[Supabase] Live connection FAILED: ${error.message}`);
          } else {
            console.log(`[Supabase] Verified live DB connection (${count ?? 0} booth_users found)`);
          }
        })
        .catch((err) => {
          console.error(`[Supabase] Network/DNS error reaching Supabase: ${err.message}`);
        });
    }
    return true;
  }

  return false;
}

export const isSupabaseConfigured = () => {
  return initSupabaseIfNeeded();
};

if (!initSupabaseIfNeeded()) {
  console.log('[Supabase] Waiting for SUPABASE_URL and SUPABASE_ANON_KEY in .env');
}
