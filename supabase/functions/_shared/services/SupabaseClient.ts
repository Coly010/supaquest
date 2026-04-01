import { Context, Effect, Layer } from "npm:effect@3"
import { createClient } from "jsr:@supabase/supabase-js@2"

export class SupabaseClient extends Context.Tag("SupabaseClient")<
  SupabaseClient,
  ReturnType<typeof createClient>
>() {}

export const SupabaseClientLive = Layer.effect(
  SupabaseClient,
  Effect.sync(() =>
    createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  )
)
