/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

const env = import.meta.env as Record<
  string,
  string | undefined
>;

const supabaseUrl =
  env['VITE_SUPABASE_URL'];

const supabasePublishableKey =
  env['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl) {
  throw new Error(
    'Missing VITE_SUPABASE_URL. Add your Supabase Project URL to .env.',
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY. Add your Supabase Publishable Key to .env.',
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);