// Environments list — shows all areas with level recommendations and a link to enter.

import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function EnvironmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const [{ data: areas }, playerRes] = await Promise.all([
    supabase.from("npc_areas").select("*"),
    supabase.from("players").select("level").eq("id", user.id).single(),
  ])

  const playerLevel = playerRes.data?.level ?? 1

  return (
    <div>
      <h1 style={{ color: "var(--green)", marginTop: 0 }}>&gt; Environments</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
        Choose an environment to hunt bugs. Higher-tier environments carry greater risk and reward.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {(areas ?? []).map((area) => {
          const [minLv, maxLv] = area.level_range as number[]
          const isRecommended = playerLevel >= minLv && playerLevel <= maxLv + 5
          const isTooHard = playerLevel < minLv

          return (
            <Link key={area.id} href={`/environments/${area.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                background: "var(--bg-panel)",
                border: `1px solid ${isRecommended ? "var(--green)" : "var(--border)"}`,
                borderRadius: "6px",
                padding: "1.25rem",
                cursor: "pointer",
              }}>
                <h2 style={{ margin: "0 0 0.5rem", color: "var(--green)", fontSize: "1em" }}>
                  &gt; {area.name}
                </h2>
                <p style={{ margin: "0 0 0.75rem", color: "var(--text-muted)", fontSize: "0.875em" }}>
                  {area.description}
                </p>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <span style={{ color: isTooHard ? "var(--red)" : "var(--text-muted)", fontSize: "0.8em" }}>
                    Lv {minLv}–{maxLv}
                  </span>
                  {isRecommended && (
                    <span style={{ color: "var(--green)", fontSize: "0.75em" }}>recommended</span>
                  )}
                  {isTooHard && (
                    <span style={{ color: "var(--red)", fontSize: "0.75em" }}>⚠ high risk</span>
                  )}
                  <span style={{ color: "var(--blue)", fontSize: "0.8em", marginLeft: "auto" }}>
                    ./enter →
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
