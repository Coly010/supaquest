// Admin overview — shows entity counts as a quick status dashboard.

import { createClient } from "@/lib/supabase/server"

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  const [itemsRes, bugsRes, tasksRes, playersRes] = await Promise.all([
    supabase.from("item_definitions").select("id", { count: "exact", head: true }),
    supabase.from("npc_definitions").select("id", { count: "exact", head: true }),
    supabase.from("task_definitions").select("id", { count: "exact", head: true }),
    supabase.from("players").select("id", { count: "exact", head: true }),
  ])

  const stats = [
    { label: "Items", count: itemsRes.count ?? 0, href: "/admin/items" },
    { label: "Bugs", count: bugsRes.count ?? 0, href: "/admin/bugs" },
    { label: "Tasks", count: tasksRes.count ?? 0, href: "/admin/tasks" },
    { label: "Players", count: playersRes.count ?? 0, href: "/admin/players" },
  ]

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Admin Overview</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1rem",
        }}
      >
        {stats.map(({ label, count, href }) => (
          <a
            key={label}
            href={href}
            style={{
              display: "block",
              padding: "1rem",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              textDecoration: "none",
              color: "inherit",
              background: "var(--bg-panel)",
            }}
          >
            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--yellow)" }}>
              {count}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.85em" }}>{label}</div>
          </a>
        ))}
      </div>
    </div>
  )
}
