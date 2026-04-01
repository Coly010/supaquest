// Inventory page — shows player items with equip/unequip/sell actions and gem socketing.

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { InventoryClient } from "./InventoryClient"

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const [inventoryRes, playerRes, resourcesRes] = await Promise.all([
    supabase
      .from("player_inventory")
      .select("*, item:item_definitions(*)")
      .eq("player_id", user.id)
      .order("acquired_at"),
    supabase
      .from("players")
      .select("level")
      .eq("id", user.id)
      .single(),
    supabase
      .from("player_resources")
      .select("resource_type, current")
      .eq("player_id", user.id),
  ])

  const inventory = inventoryRes.data ?? []
  const playerLevel = playerRes.data?.level ?? 1
  const credits = resourcesRes.data?.find((r) => r.resource_type === "credits")?.current ?? 0

  return (
    <InventoryClient
      initialInventory={inventory}
      playerLevel={playerLevel}
      initialCredits={credits}
    />
  )
}
