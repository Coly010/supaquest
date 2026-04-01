// Dashboard — player overview: stats, resources, recent activity.

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const [playerRes, statsRes, skillsRes, resourcesRes] = await Promise.all([
    supabase.from("players").select("*").eq("id", user.id).single(),
    supabase.from("player_stats").select("*").eq("player_id", user.id).single(),
    supabase.from("player_skills").select("*").eq("player_id", user.id),
    supabase.from("player_resources").select("*").eq("player_id", user.id),
  ])

  const player = playerRes.data
  const stats = statsRes.data
  const skills = skillsRes.data ?? []
  const resources = resourcesRes.data ?? []

  if (!player || !stats) return <p>Loading...</p>

  const focus = resources.find((r) => r.resource_type === "focus")
  const uptime = resources.find((r) => r.resource_type === "uptime")
  const credits = resources.find((r) => r.resource_type === "credits")

  return (
    <div>
      <h1 style={{ color: "var(--green)", marginTop: 0 }}>
        &gt; {player.display_name}
        <span style={{ color: "var(--text-muted)", fontSize: "0.75em" }}>
          {" "}[Seniority {player.level}]
        </span>
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {/* Resources */}
        <Panel title="Resources">
          <StatRow label="Focus" value={`${focus?.current ?? 0} / ${focus?.maximum ?? 100}`} color="var(--blue)" />
          <StatRow label="Uptime" value={`${uptime?.current ?? 0} / ${uptime?.maximum ?? 100}`} color="var(--green)" />
          <StatRow label="Credits" value={String(credits?.current ?? 0)} color="var(--yellow)" />
        </Panel>

        {/* Stats */}
        <Panel title="Attributes">
          <StatRow label="Logic" value={String(stats.logic)} color="var(--orange)" />
          <StatRow label="Resilience" value={String(stats.resilience)} color="var(--blue)" />
          <StatRow label="Throughput" value={String(stats.throughput)} color="var(--green)" />
          <StatRow label="Serendipity" value={String(stats.serendipity)} color="var(--purple)" />
          <StatRow label="Max Uptime" value={String(stats.max_uptime)} color="var(--text-muted)" />
        </Panel>

        {/* Skills */}
        <Panel title="Disciplines">
          {skills.map((skill) => (
            <div key={skill.skill_id} style={{ marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ textTransform: "capitalize", color: "var(--text)" }}>
                  {skill.skill_id.replace("_", " ")}
                </span>
                <span style={{ color: "var(--text-muted)" }}>Lv {skill.level}</span>
              </div>
              <XpBar current={skill.xp} max={skill.xp_to_next} />
            </div>
          ))}
        </Panel>

        {/* XP */}
        <Panel title="Experience">
          <StatRow label="Seniority" value={`Level ${player.level}`} color="var(--green)" />
          <XpBar current={player.xp} max={player.xp_to_next} />
          <p style={{ color: "var(--text-muted)", margin: "0.5rem 0 0" }}>
            {player.xp_to_next - player.xp} XP to next level
          </p>
        </Panel>
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--bg-panel)",
      border: "1px solid var(--border)",
      borderRadius: "6px",
      padding: "1rem",
    }}>
      <h3 style={{ margin: "0 0 0.75rem", color: "var(--text-muted)", fontSize: "0.8em", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  )
}

function XpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.min(100, Math.round((current / max) * 100))
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "3px", height: "6px", marginTop: "4px" }}>
      <div style={{ background: "var(--green-dim)", width: `${pct}%`, height: "100%", borderRadius: "3px" }} />
    </div>
  )
}
