
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

// User-provided Supabase URL and Anon Key
const supabaseUrl = 'https://batuupifnhbjpxeuwtkw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdHV1cGlmbmhianB4ZXV3dGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDAwNjQsImV4cCI6MjA4NDM3NjA2NH0.yJj0192l5iG4-tGJfvpksqa6myuJAB_TqO_rtADFjVM';

if (!supabaseUrl || !supabaseAnonKey) {
    // This check is kept for robustness, although the values are hardcoded now.
    throw new Error("Supabase URL and Anon Key must be provided.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey) as SupabaseClient<Database> & { auth: any };
