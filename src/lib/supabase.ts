import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  'https://mudqtzopkxzvolafjaed.supabase.co';

const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11ZHF0em9wa3h6dm9sYWZqYWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4Njk1NjIsImV4cCI6MjEwNjQ0NTU2Mn0.7uLFmteV27VxNQj3thAQCIF1WSyp2Ne1Ryr3fEdmhfY';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
