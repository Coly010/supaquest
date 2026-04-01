// Admin bugs list — shows all NPC/bug definitions with edit links.

import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function AdminBugsPage() {
  const supabase = await createClient()

  const { data: bugs } = await supabase
    .from("npc_definitions")
    .select("id, name, level, xp_reward, uptime")
    .order("level")
    .order("name")

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Bugs ({bugs?.length ?? 0})</h1>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
            <th style={{ textAlign: "left", padding: "0.4rem 0.75rem" }}>ID</th>
            <th style={{ textAlign: "left", padding: "0.4rem 0.75rem" }}>Name</th>
            <th style={{ textAlign: "right", padding: "0.4rem 0.75rem" }}>Level</th>
            <th style={{ textAlign: "right", padding: "0.4rem 0.75rem" }}>XP</th>
            <th style={{ textAlign: "right", padding: "0.4rem 0.75rem" }}>Uptime</th>
            <th style={{ padding: "0.4rem 0.75rem" }} />
          </tr>
        </thead>
        <tbody>
          {(bugs ?? []).map((bug) => (
            <tr key={bug.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "0.4rem 0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                {bug.id}
              </td>
              <td style={{ padding: "0.4rem 0.75rem" }}>{bug.name}</td>
              <td style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>{bug.level}</td>
              <td style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>{bug.xp_reward}</td>
              <td style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>{bug.uptime}</td>
              <td style={{ padding: "0.4rem 0.75rem" }}>
                <Link href={`/admin/bugs/${bug.id}`} style={{ color: "var(--blue)" }}>
                  edit →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
