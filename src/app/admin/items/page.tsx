// Admin items list — shows all item definitions with edit links.

import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function AdminItemsPage() {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from("item_definitions")
    .select("id, name, item_type, slot, level_required, base_value, stackable")
    .order("level_required")
    .order("name")

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>Items ({items?.length ?? 0})</h1>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
            <th style={{ textAlign: "left", padding: "0.4rem 0.75rem" }}>ID</th>
            <th style={{ textAlign: "left", padding: "0.4rem 0.75rem" }}>Name</th>
            <th style={{ textAlign: "left", padding: "0.4rem 0.75rem" }}>Type</th>
            <th style={{ textAlign: "left", padding: "0.4rem 0.75rem" }}>Slot</th>
            <th style={{ textAlign: "right", padding: "0.4rem 0.75rem" }}>Level</th>
            <th style={{ textAlign: "right", padding: "0.4rem 0.75rem" }}>Value</th>
            <th style={{ padding: "0.4rem 0.75rem" }} />
          </tr>
        </thead>
        <tbody>
          {(items ?? []).map((item) => (
            <tr
              key={item.id}
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <td style={{ padding: "0.4rem 0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                {item.id}
              </td>
              <td style={{ padding: "0.4rem 0.75rem" }}>{item.name}</td>
              <td style={{ padding: "0.4rem 0.75rem", color: "var(--text-muted)" }}>{item.item_type}</td>
              <td style={{ padding: "0.4rem 0.75rem", color: "var(--text-muted)" }}>{item.slot ?? "—"}</td>
              <td style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>{item.level_required}</td>
              <td style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>{item.base_value}</td>
              <td style={{ padding: "0.4rem 0.75rem" }}>
                <Link href={`/admin/items/${item.id}`} style={{ color: "var(--blue)" }}>
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
