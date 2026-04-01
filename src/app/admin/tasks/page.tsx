// Admin tasks list — shows all task definitions with edit links.

import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function AdminTasksPage() {
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from("task_definitions")
    .select("id, name, skill_id, level_required, focus_cost, success_rate")
    .order("skill_id")
    .order("level_required")

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Tasks ({tasks?.length ?? 0})</h1>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
            <th style={{ textAlign: "left", padding: "0.4rem 0.75rem" }}>ID</th>
            <th style={{ textAlign: "left", padding: "0.4rem 0.75rem" }}>Name</th>
            <th style={{ textAlign: "left", padding: "0.4rem 0.75rem" }}>Skill</th>
            <th style={{ textAlign: "right", padding: "0.4rem 0.75rem" }}>Level</th>
            <th style={{ textAlign: "right", padding: "0.4rem 0.75rem" }}>Focus</th>
            <th style={{ textAlign: "right", padding: "0.4rem 0.75rem" }}>Success %</th>
            <th style={{ padding: "0.4rem 0.75rem" }} />
          </tr>
        </thead>
        <tbody>
          {(tasks ?? []).map((task) => (
            <tr key={task.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "0.4rem 0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                {task.id}
              </td>
              <td style={{ padding: "0.4rem 0.75rem" }}>{task.name}</td>
              <td style={{ padding: "0.4rem 0.75rem", color: "var(--text-muted)" }}>{task.skill_id}</td>
              <td style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>{task.level_required}</td>
              <td style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>{task.focus_cost}</td>
              <td style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>
                {Math.round(task.success_rate * 100)}%
              </td>
              <td style={{ padding: "0.4rem 0.75rem" }}>
                <Link href={`/admin/tasks/${task.id}`} style={{ color: "var(--blue)" }}>
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
