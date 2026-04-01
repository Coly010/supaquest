// Shop detail — shows items for sale with buy buttons, and player's credits.

import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ShopDetailClient } from "./ShopDetailClient"

interface Props {
  params: Promise<{ shopId: string }>
}

export default async function ShopDetailPage({ params }: Props) {
  const { shopId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [shopRes, inventoryRes, creditsRes] = await Promise.all([
    supabase
      .from("shops")
      .select("*, items:shop_inventory(*, item:item_definitions(*))")
      .eq("id", shopId)
      .single(),
    supabase
      .from("player_inventory")
      .select("id, item_def_id, quantity")
      .eq("player_id", user.id),
    supabase
      .from("player_resources")
      .select("current")
      .eq("player_id", user.id)
      .eq("resource_type", "credits")
      .single(),
  ])

  if (shopRes.error || !shopRes.data) notFound()

  const shop = shopRes.data
  const ownedItemIds = new Set((inventoryRes.data ?? []).map((i) => i.item_def_id))
  const credits = creditsRes.data?.current ?? 0

  return (
    <ShopDetailClient
      shopId={shopId}
      shopName={shop.name}
      shopDescription={shop.description}
      items={shop.items ?? []}
      credits={credits}
      ownedItemIds={Array.from(ownedItemIds)}
    />
  )
}
