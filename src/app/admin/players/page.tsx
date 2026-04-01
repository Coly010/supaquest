// Admin players page — lists all players, enables admin grant/revoke and resource adjustments.

import { createClient } from "@/lib/supabase/server"
import { PlayersClient } from "./PlayersClient"

export default async function AdminPlayersPage() {
  const supabase = await createClient()

  const { data: players } = await supabase
    .from("players")
    .select(
      "id, username, display_name, level, is_admin, player_resources(resource_type, current, maximum)"
    )
    .order("level", { ascending: false })

  return <PlayersClient players={(players ?? []) as Parameters<typeof PlayersClient>[0]["players"]} />
}
