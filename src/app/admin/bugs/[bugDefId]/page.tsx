// Admin bug edit page — loads NPC definition, renders the edit form.

import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { BugEditClient } from "./BugEditClient"

export default async function BugEditPage({
  params,
}: {
  params: Promise<{ bugDefId: string }>
}) {
  const { bugDefId } = await params
  const supabase = await createClient()

  const { data: bug } = await supabase
    .from("npc_definitions")
    .select("id, name, description, level, stats, xp_reward, uptime")
    .eq("id", bugDefId)
    .single()

  if (!bug) notFound()

  return (
    <BugEditClient
      bug={{
        ...bug,
        stats: (bug.stats as Record<string, number>) ?? null,
      }}
    />
  )
}
