// Admin shell layout — wraps all /admin routes.
// Server component: reads is_admin and redirects non-admins to /dashboard.
// Renders a minimal admin subnav above the page content.

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

const NAV_LINKS = [
  { href: "/admin", label: "overview" },
  { href: "/admin/items", label: "items" },
  { href: "/admin/bugs", label: "bugs" },
  { href: "/admin/tasks", label: "tasks" },
  { href: "/admin/players", label: "players" },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/")

  const { data: player } = await supabase
    .from("players")
    .select("is_admin")
    .eq("id", user.id)
    .single()

  if (!player?.is_admin) redirect("/dashboard")

  return (
    <div style={{ minHeight: "100vh" }}>
      <nav
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "0.5rem 1.5rem",
          display: "flex",
          gap: "1.5rem",
          alignItems: "center",
          background: "var(--bg-panel)",
          fontSize: "0.85em",
        }}
      >
        <span style={{ color: "var(--yellow)", fontWeight: "bold" }}>[ADMIN]</span>
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            style={{ color: "var(--text-muted)" }}
          >
            ./{label}
          </Link>
        ))}
        <Link href="/dashboard" style={{ marginLeft: "auto", color: "var(--text-muted)" }}>
          ← game
        </Link>
      </nav>
      <main style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        {children}
      </main>
    </div>
  )
}
