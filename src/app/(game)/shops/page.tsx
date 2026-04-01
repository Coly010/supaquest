// Shops list — shows all 3 shops with links to each.

import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

export default async function ShopsPage() {
  const supabase = await createClient()

  const { data: shops } = await supabase.from("shops").select("*")

  return (
    <div>
      <h1 style={{ color: "var(--green)", marginTop: 0 }}>&gt; Shops</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
        Spend your Credits on tools, consumables, and infrastructure.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {(shops ?? []).map((shop) => (
          <Link key={shop.id} href={`/shops/${shop.id}`} style={{ textDecoration: "none" }}>
            <div style={{
              background: "var(--bg-panel)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "1.25rem",
              cursor: "pointer",
              transition: "border-color 0.15s",
            }}>
              <h2 style={{ margin: "0 0 0.5rem", color: "var(--green)", fontSize: "1em" }}>
                &gt; {shop.name}
              </h2>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.875em" }}>
                {shop.description}
              </p>
              <p style={{ margin: "0.75rem 0 0", color: "var(--blue)", fontSize: "0.8em" }}>
                ./enter →
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
