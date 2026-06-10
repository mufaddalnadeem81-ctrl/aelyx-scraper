import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://slthzpkqrwaslslzvkly.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsdGh6cGtxcndhc2xzbHp2a2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTM2OTUsImV4cCI6MjA5NjEyOTY5NX0.niP1m8r7pnOVxA9gKqP16SBTUq297SpEVauqc4hbbNU';

export const supabase = createClient(
  supabaseUrl.trim(),
  supabaseAnonKey.trim()
);