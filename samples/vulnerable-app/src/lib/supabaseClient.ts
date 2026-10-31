import { createClient } from "@supabase/supabase-js";

// Browser Supabase client used across the app.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE!;

export const supabase = createClient(supabaseUrl, supabaseKey);
