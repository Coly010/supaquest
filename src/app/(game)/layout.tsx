// Game shell layout — wraps all authenticated game routes.
// Checks auth on the server; unauthenticated users are redirected to /.
// Provides top navigation with links to all game sections.

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { GameNav } from "@/components/game/GameNav"

export default async function GameLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // Fetch player profile + resources for nav display
  const [{ data: player }, { data: resources }] = await Promise.all([
    supabase
      .from("players")
      .select("username, display_name, level, is_admin")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("player_resources")
      .select("resource_type, current, maximum")
      .eq("player_id", user.id)
      .in("resource_type", ["focus", "uptime", "credits"]),
  ])

  // If authenticated but no profile yet, redirect to onboarding
  if (!player) {
    redirect("/onboarding")
  }

  const focus = resources?.find((r) => r.resource_type === "focus")
  const uptime = resources?.find((r) => r.resource_type === "uptime")
  const credits = resources?.find((r) => r.resource_type === "credits")

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <GameNav
        displayName={player.display_name}
        level={player.level}
        isAdmin={player.is_admin}
      />
      {/* Resource bar */}
      {(focus || uptime || credits) && (
        <div style={{
          borderBottom: "1px solid var(--border)",
          padding: "0.4rem 1.5rem",
          display: "flex",
          gap: "1.5rem",
          fontSize: "0.8em",
          color: "var(--text-muted)",
          background: "var(--bg-panel)",
        }}>
          {focus && (
            <span>
              Focus:{" "}
              <span style={{ color: focus.current > 0 ? "var(--blue)" : "var(--red)" }}>
                {focus.current}
              </span>
              /{focus.maximum}
              <span style={{ marginLeft: "0.4rem", color: "var(--text-muted)" }}>↺ 10 / 10m</span>
            </span>
          )}
          {uptime && (
            <span>
              Uptime:{" "}
              <span style={{ color: uptime.current > 20 ? "var(--green)" : "var(--red)" }}>
                {uptime.current}
              </span>
              /{uptime.maximum}
            </span>
          )}
          {credits && (
              <span>
                Credits:{" "}
                <span style={{color: "var(--yellow"}}>{credits.current}</span>
              </span>
          )}
        </div>
      )}
      <main style={{ flex: 1, padding: "1.5rem", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        {children}
      </main>
    </div>
  )
}
