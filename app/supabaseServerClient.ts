import { createClient } from '@supabase/supabase-js';

// Prefer server-side secrets; fall back to NEXT_PUBLIC_* during dev if needed
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";

// Use service role on the server to bypass RLS for trusted operations
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const selectedKey = supabaseServiceKey || supabaseAnonKey;

if (!supabaseUrl) {
  // Keep a concise log once to help diagnose env issues in dev
  console.error('SUPABASE_URL is not set. Please set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in .env.local');
}

export const supabaseServer = createClient(supabaseUrl, selectedKey); 