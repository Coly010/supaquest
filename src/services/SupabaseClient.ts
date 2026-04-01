// Supabase client as an Effect Layer.
// Edge Functions inject a service-role client; Next.js server components inject an SSR client.
// The service layer depends on this tag — never imports a concrete client directly.

import { Context, Effect, Layer } from "effect"
import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient as SupabaseClientType } from "@supabase/supabase-js"
import type { Database } from "../lib/supabase/types"

export type SupabaseClientService = SupabaseClientType<Database>

export class SupabaseClient extends Context.Tag("SupabaseClient")<
  SupabaseClient,
  SupabaseClientService
>() {}

// Live Layer for use inside Edge Functions (Deno).
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment.
// Import this only in Edge Function files — it uses the service role key.
export const makeSupabaseClientLive = (
  url: string,
  serviceRoleKey: string
): Layer.Layer<SupabaseClient> => {
  return Layer.effect(
    SupabaseClient,
    Effect.sync(() => {
      return createClient<Database>(url, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    })
  )
}
