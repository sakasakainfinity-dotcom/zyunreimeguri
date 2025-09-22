import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase.types';

function ensureEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function createSupabaseRouteHandlerClient(): SupabaseClient<Database> {
  const supabaseUrl = ensureEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = ensureEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return createRouteHandlerClient<Database>({ cookies }, { supabaseUrl, supabaseKey: anonKey });
}

export function createSupabaseServiceRoleClient(): SupabaseClient<Database> {
  const supabaseUrl = ensureEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = ensureEnv('SUPABASE_SERVICE_ROLE', process.env.SUPABASE_SERVICE_ROLE);
  return createClient<Database>(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
