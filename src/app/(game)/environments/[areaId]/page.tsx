// Environment detail — shows area info, which bugs lurk here, and the Attack Bug button.

import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CombatClient } from "./CombatClient"

interface Props {
  params: Promise<{ areaId: string }>
}

export default async function EnvironmentPage({ params }: Props) {
  const { areaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const [areaRes, spawnsRes, resourcesRes] = await Promise.all([
    supabase.from("npc_areas").select("*").eq("id", areaId).single(),
    supabase
      .from("npc_area_spawns")
      .select("spawn_weight, npc:npc_definitions(id, name, description, level)")
      .eq("area_id", areaId),
    supabase
      .from("player_resources")
      .select("resource_type, current")
      .eq("player_id", user.id)
      .in("resource_type", ["uptime"]),
  ])

  if (!areaRes.data) notFound()

  const area = areaRes.data
  const spawns = spawnsRes.data ?? []
  const uptimeResource = resourcesRes.data?.find((r) => r.resource_type === "uptime")
  const currentUptime = uptimeResource?.current ?? 0

  return (
    <div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.875em", marginTop: 0, marginBottom: "0.5rem" }}>
        &lt; <a href="/environments" style={{ color: "var(--blue)", textDecoration: "none" }}>environments</a>
      </p>
      <h1 style={{ color: "var(--green)", marginTop: 0 }}>&gt; {area.name}</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>{area.description}</p>

      {/* Bug roster */}
      {spawns.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ color: "var(--text-muted)", fontSize: "0.75em", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 0.5rem" }}>
            Known Bugs
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {spawns.map((spawn) => {
              const npc = spawn.npc as { id: string; name: string; description: string; level: number } | null
              if (!npc) return null
              return (
                <div key={npc.id} style={{
                  background: "var(--bg-panel)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  padding: "0.6rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}>
                  <span style={{ color: "var(--red)", minWidth: "12px" }}>⬤</span>
                  <div>
                    <span style={{ color: "var(--text)" }}>{npc.name}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.8em", marginLeft: "0.5rem" }}>
                      Lv {npc.level}
                    </span>
                    <p style={{ margin: "0.1rem 0 0", color: "var(--text-muted)", fontSize: "0.78em" }}>
                      {npc.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <CombatClient areaId={areaId} areaName={area.name} initialUptime={currentUptime} />
    </div>
  )
}
