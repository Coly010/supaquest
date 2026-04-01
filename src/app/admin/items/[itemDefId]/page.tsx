// Admin item edit page — loads item definition, renders the edit form.

import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ItemEditClient } from "./ItemEditClient"

export default async function ItemEditPage({
  params,
}: {
  params: Promise<{ itemDefId: string }>
}) {
  const { itemDefId } = await params
  const supabase = await createClient()

  const { data: item } = await supabase
    .from("item_definitions")
    .select("id, name, description, item_type, level_required, base_value, gem_slot_count, base_stats")
    .eq("id", itemDefId)
    .single()

  if (!item) notFound()

  return (
    <ItemEditClient
      item={{
        ...item,
        description: item.description ?? null,
        base_stats: (item.base_stats as Record<string, number>) ?? null,
      }}
    />
  )
}
