// Supabase service-role client for use inside Edge Functions.
// Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY which Supabase injects automatically.
// Never expose this to the client — it bypasses RLS.

import { createClient } from "jsr:@supabase/supabase-js@2"

export const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
